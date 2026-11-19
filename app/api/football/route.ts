import { NextRequest, NextResponse } from "next/server";
import { leagueInfo, seasonOf } from "@/lib/leagues";
import { officialCrest, channel } from "@/lib/branding";
import { proyeccionMatches, proyeccionStandings } from "@/lib/proyeccion";
import { womenArgMatches, womenArgStandings } from "@/lib/women-arg";
import type { Game, Standing, Player, SportsData } from "@/lib/types";

export const dynamic = "force-dynamic";

// ESPN public site data (unofficial/undocumented, no API key). Never imply official affiliation.
// Fixed league map: no user-controlled upstream URL, and no fictional fallback scores.
const ESPN: Record<string, string | null> = {
  todos: null,
  arg: "arg.1",
  copa:"arg.copa",
  supercopa:"arg.supercopa",
  "supercopa-int":null,
  trofeo:null,
  proyeccion:null,
  "federal-a":null,
  "trofeo-proyeccion":null,
  "primera-b":"arg.3",
  "primera-c":"arg.4",
  nacional: "arg.2",
  premier: "eng.1",
  laliga: "esp.1",
  seriea: "ita.1",
  bundesliga: "ger.1",
  ligue1: "fra.1",
  champions: "uefa.champions",
  "arg-fem": null,
  "eng-fem": "eng.w.1",
  "esp-fem": "esp.w.1",
  "ita-fem": null,
  "ger-fem": null,
  "fra-fem": "fra.w.1",
  "nws-fem": "usa.nwsl",
  "uefa-fem": "uefa.wchampions",
  "selecciones": null
};
const root = "https://site.api.espn.com";
type JsonRecord = Record<string, any>;
const num = (x: unknown): number | null => {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x.trim() && Number.isFinite(Number(x))) return Number(x);
  return null;
};
const logo = (t: any): string | null => {
  const url = t?.logo || t?.logos?.find((i: any) => (i?.rel || []).includes("default"))?.href || t?.logos?.[0]?.href;
  return typeof url === "string" && /^https:\/\//.test(url) ? url : null;
};
const stat = (entry: any, names: string[]): number | null => {
  const row = (entry?.stats || []).find((x: any) => names.includes(x.name));
  return num(row?.value ?? row?.displayValue);
};
async function espn(path: string, revalidate: number, fresh=false): Promise<JsonRecord> {
  const response = await fetch(root + path, {
    headers: { Accept: "application/json" },
    ...(fresh ? {cache: "no-store" as const} : {next: {revalidate}}),
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("ESPN no respondió correctamente (HTTP " + response.status + ")");
  return (await response.json()) as JsonRecord;
}
function matchStatus(x: any): { status: string; elapsed: number | null } {
  const t = x?.status?.type || {};
  const name = String(t.name || "").toUpperCase();
  const detail = String(t.shortDetail || t.detail || "").toUpperCase();
  const state = String(t.state || "").toLowerCase();
  const clock = String(x?.status?.displayClock || "");
  // ESPN status.clock is seconds. Prefer the displayClock's minute count.
  const minute = num(clock.match(/^\d+/)?.[0]);
  if (name.includes("HALF") || detail === "HT") return { status: "HT", elapsed: minute };
  if (name.includes("PENALT") || detail.includes("PEN")) return { status: state === "post" ? "PEN" : "P", elapsed: minute };
  if (name.includes("POSTPON") || detail.includes("PPD")) return { status: "PST", elapsed: null };
  if (name.includes("CANCEL")) return { status: "CANC", elapsed: null };
  if (state === "post" || t.completed === true) return { status: "FT", elapsed: null };
  if (state === "in") return { status: num(x?.status?.period) === 1 ? "1H" : "2H", elapsed: minute };
  return { status: "NS", elapsed: null };
}
function games(json: JsonRecord, leagueName: string): Game[] {
  const found: Game[] = [];
  for (const event of json.events || []) {
    const c = event.competitions?.[0];
    const home = c?.competitors?.find((x: any) => x.homeAway === "home");
    const away = c?.competitors?.find((x: any) => x.homeAway === "away");
    const id = num(event.id);
    if (!c || !home?.team?.displayName || !away?.team?.displayName || id === null) continue;
    const state = matchStatus(c);
    const clock=String(c?.status?.displayClock||event?.status?.displayClock||"").trim();
    const seconds=num(c?.status?.clock??event?.status?.clock);
    const minutesMatch=clock.match(/^(\d{1,3})'/);
    const withSeconds=seconds!==null&&seconds>=0&&minutesMatch&&Math.abs(Math.floor(seconds/60)-Number(minutesMatch[1]))<=1;
    const precise=withSeconds?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,"0")}`:null;
    const localCast=(c?.geoBroadcasts||[]).filter((b:any)=>String(b?.region||"").toLowerCase()==="ar").map((b:any)=>String(b?.media?.shortName||"")).filter(Boolean);
    const broadcasts=[...new Set(localCast)].map(n=>channel(String(n))).filter((x):x is NonNullable<ReturnType<typeof channel>>=>!!x);
    const started = state.status !== "NS" && state.status !== "PST" && state.status !== "CANC";
    found.push({
      id,
      date: String(event.date || c.date || ""),
      league: String(json.leagues?.[0]?.name || leagueName),
      leagueLogo: logo(json.leagues?.[0]) || null,
      round: String(event.season?.slug || json.leagues?.[0]?.season?.type?.abbreviation || "").replace(/-/g, " ") || null,
      venue: c.venue?.fullName || null,
      referee: c.officials?.find((x: any) => /referee/i.test(x?.position?.name || x?.position?.displayName || ""))?.displayName || null,
      home: String(home.team.displayName),
      away: String(away.team.displayName),
      homeLogo: officialCrest(String(home.team.displayName),logo(home.team)),
      awayLogo: officialCrest(String(away.team.displayName),logo(away.team)),
      homeScore: started ? num(home.score?.displayValue ?? home.score) : null,
      awayScore: started ? num(away.score?.displayValue ?? away.score) : null,
      status: state.status,
      elapsed: state.elapsed,
      clock: state.status==="1H"||state.status==="2H"||state.status==="LIVE"?(clock.includes("+")?clock:clock.includes(":")?clock:precise||clock||null):null,
      broadcasts,
      sourceName:"ESPN",sourceUrl:"https://www.espn.com.ar/futbol/"
    });
  }
  return found.sort((a, b) => a.date.localeCompare(b.date));
}
function table(json: JsonRecord): Standing[] {
  const children = Array.isArray(json.children) ? json.children : [json];
  const result: Standing[] = [];
  for (const group of children) {
    const entries: any[] = group?.standings?.entries || [];
    const groupName = children.length > 1 ? String(group?.name || "") : "";
    for (let i = 0; i < entries.length; i++) {
      const row = entries[i];
      if (!row?.team?.displayName) continue;
      result.push({
        rank: stat(row, ["rank", "playoffSeed"]) ?? num(row?.rank) ?? i + 1,
        team: String(row.team.displayName),
        logo: officialCrest(String(row.team.displayName),logo(row.team)),
        played: stat(row, ["gamesPlayed"]) ?? 0,
        won: stat(row, ["wins"]) ?? 0,
        drawn: stat(row, ["ties", "draws"]) ?? 0,
        lost: stat(row, ["losses"]) ?? 0,
        gd: stat(row, ["pointDifferential", "goalDifference", "goalsDifferential"]) ?? 0,
        points: stat(row, ["points"]) ?? 0,
        ...(groupName ? { group: groupName } : {})
      });
    }
  }
  return result.sort((a, b) => (a.group || "").localeCompare(b.group || "") || a.rank - b.rank);
}
function leaders(json: JsonRecord, type: "goalsLeaders" | "assistsLeaders"): Player[] {
  const ranking = (json.stats || []).find((x: any) => x.name === type);
  return (ranking?.leaders || []).slice(0, 3).flatMap((x: any) => {
    const name = x.athlete?.displayName;
    const value = num(x.value);
    if (!name || value === null) return [];
    return [{ name: String(name), team: String(x.athlete?.team?.displayName || ""), value }];
  });
}


/** Top 20 FIFA masculino oficial al 07-10-2026. Próxima actualización: 18-11-2026.
 * Referencias: https://inside.fifa.com/fifa-rankings/world-ranking/men y
 * https://betimate.com/en/fifa-ranking (tabla histórica al 7/10).
 * No confundir con ranking FIFA en vivo. Cuando haya otra actualización, revisar esta lista.
 */
const FIFA_TOP20_DATE = "2026-10-07";
const TOP20_COUNTRIES: string[][] = [
 ["spain","espana"],["argentina"],["france","francia"],["england","inglaterra"],
 ["portugal"],["brazil","brasil"],["morocco","marruecos"],["belgium","belgica"],
 ["netherlands","paises bajos","holland","holanda"],["mexico"],["colombia"],
 ["switzerland","suiza"],["germany","alemania"],["croatia","croacia"],["italy","italia"],
 ["united states","usa","estados unidos","usmnt"],["japan","japon"],["senegal"],
 ["norway","noruega"],["uruguay"]
];
const countrySlug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z ]/g,"").trim().replace(/ +/g," ");
const relevantNationalTeam = (name: string): boolean => TOP20_COUNTRIES.some(aliases=>aliases.includes(countrySlug(name)));
async function nationalGames(date: string, name: string, fresh=false): Promise<SportsData> {
 const slugs = ["fifa.friendly","uefa.nations","fifa.world","fifa.worldq.uefa","fifa.worldq.conmebol","fifa.worldq.concacaf"];
 const requests = await Promise.allSettled(slugs.map(slug=>espn("/apis/site/v2/sports/soccer/"+slug+"/scoreboard?dates="+date.replace(/-/g,"")+"&limit=150",45,fresh)));
 const matches: Game[] = [];
 let successes=0;
 for(const result of requests){
  if(result.status!=="fulfilled") continue;
  successes++;
  for(const match of games(result.value,name)){
   if(relevantNationalTeam(match.home)||relevantNationalTeam(match.away))matches.push(match);
  }
 }
 if(successes===0)throw new Error("No respondió ninguna competición de selecciones");
 const unique=[...new Map(matches.map(m=>[m.id,m])).values()].sort((a,b)=>a.date.localeCompare(b.date));
 return {connected:true,updatedAt:new Date().toISOString(),league:name,matches:unique};
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const fresh=q.has("refresh");
  const code = q.get("league") || "arg";
  const info = leagueInfo(code);
  const date = q.get("date") || new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  const mode = q.get("mode") === "standings" ? "standings" : "matches";
  const now = new Date().toISOString();
  if (!Object.prototype.hasOwnProperty.call(ESPN, code) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + "T12:00:00Z"))) {
    return NextResponse.json({ connected: false, updatedAt: now, error: "Competición o fecha inválida." }, { status: 400 });
  }
  if (code === "arg-fem") return NextResponse.json(mode === "standings" ? await womenArgStandings() : await womenArgMatches(date), {headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=60"}});
  if(code==="proyeccion")return NextResponse.json(mode==="standings"?await proyeccionStandings():await proyeccionMatches(date),{headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=120"}});
  if(code==="federal-a")return NextResponse.json({
   connected:true,league:info.name,updatedAt:now,matches:[],standings:[],scorers:[],assisters:[],
   message:"Torneo Federal A 2026: Campeonato y Reválida, con fases eliminatorias. Consultá los resultados oficiales; la fuente gratuita actual no publica un marcador minuto a minuto verificado.",
   sourceName:"Asociación del Fútbol Argentino",sourceUrl:"https://www.afa.com.ar/es/posts/torneo-federal-a-definidos-los-cruces-de-los-cuartos-de-final"
  });
  if(code==="trofeo-proyeccion")return NextResponse.json({
   connected:true,league:info.name,updatedAt:now,matches:[],standings:[],scorers:[],assisters:[],
   message:"Trofeo de Campeones de Proyección 2026: final programada por la LPF el 15 de diciembre. Equipos a confirmar tras los torneos.",
   sourceName:"Liga Profesional de Fútbol",sourceUrl:"https://www.ligaprofesional.ar/proyeccion-clausura-2026/"
  });
  if(code==="trofeo"||code==="supercopa-int")return NextResponse.json({
   connected:true,league:info.name,updatedAt:now,matches:[],standings:[],scorers:[],assisters:[],
   message:code==="trofeo"?"Trofeo de Campeones 2026: final programada el 19 de diciembre en el estadio Mario Alberto Kempes, Córdoba. Equipos a confirmar.":"Supercopa Internacional 2026: final disputada el 26 de septiembre. Rosario Central ganó a Estudiantes por 3–1.",
   sourceName:"Liga Profesional de Fútbol",sourceUrl:"https://www.ligaprofesional.ar/"
  });
  if(code==="todos"){
    if(mode==="standings")return NextResponse.json({connected:true,updatedAt:now,league:"TODOS",standings:[],message:"Elegí una liga para consultar su tabla particular."});
    const gender=q.get("gender")==="Femenino"?"Femenino":"Masculino";
    const list=gender==="Femenino"?["arg-fem","eng-fem","esp-fem","fra-fem","nws-fem","uefa-fem"]:
      ["arg","nacional","copa","supercopa","primera-b","primera-c","premier","laliga","seriea","bundesliga","ligue1","champions","selecciones","proyeccion"];
    const rows=await Promise.allSettled(list.map(async code=>{
      if(code==="arg-fem")return (await womenArgMatches(date)).matches||[];
      if(code==="proyeccion")return (await proyeccionMatches(date)).matches||[];
      if(code==="selecciones")return (await nationalGames(date,"Selecciones",fresh)).matches||[];
      const slug=ESPN[code];if(!slug)return [];
      const data=await espn("/apis/site/v2/sports/soccer/"+slug+"/scoreboard?dates="+date.replace(/-/g,"")+"&limit=100",20,fresh);
      return games(data,leagueInfo(code).name);
    }));
    const matches=rows.flatMap((r)=>r.status==="fulfilled"?r.value:[]);
    matches.sort((a,b)=>a.date.localeCompare(b.date));
    return NextResponse.json({connected:rows.some(r=>r.status==="fulfilled"),league:"TODOS",updatedAt:now,matches,
      message:"Todos los partidos informados por las fuentes conectadas. Algunas competencias no entregan datos en tiempo real."},
      {headers:{"Cache-Control":"public, s-maxage=20, stale-while-revalidate=20"}});
  }
  if (code === "selecciones") {
    if(mode === "standings") return NextResponse.json({connected:true,league:info.name,updatedAt:now,standings:[],scorers:[],assisters:[],error:"Las selecciones se presentan con partidos destacados del top 20 FIFA. Ranking masculino al 7/10/2026."});
    try {
      const matches = await nationalGames(date,info.name,fresh);
      return NextResponse.json(matches,{headers:{"Cache-Control":"public, s-maxage=20, stale-while-revalidate=20"}});
    } catch {
      return NextResponse.json({connected:false,league:info.name,updatedAt:now,error:"La fuente gratuita de selecciones no respondió. No mostramos resultados ficticios."});
    }
  }
  const slug = ESPN[code];
  if (!slug) {
    return NextResponse.json({ connected: false, league: info.name, updatedAt: now,
      error: "Esta competición todavía no tiene cobertura verificada en la fuente gratuita. No mostramos resultados sin confirmar." });
  }
  try {
    const season = seasonOf(code, date);
    const prefix = "/apis/site/v2/sports/soccer/" + slug;
    if (mode === "standings") {
      const [s, l] = await Promise.allSettled([
        espn("/apis/v2/sports/soccer/" + slug + "/standings?season=" + season, 1800),
        espn(prefix + "/statistics?season=" + season, 1800)
      ]);
      if (s.status === "rejected" && l.status === "rejected") throw new Error("No se pudieron consultar las estadísticas de esta competición.");
      const data: SportsData = {
        connected: true, updatedAt: now, league: info.name,
        standings: s.status === "fulfilled" ? table(s.value) : [],
        scorers: l.status === "fulfilled" ? leaders(l.value, "goalsLeaders") : [],
        assisters: l.status === "fulfilled" ? leaders(l.value, "assistsLeaders") : [],
        error: s.status === "rejected" ? "Tabla no disponible en esta competición." : undefined
      };
      return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300" } });
    }
    const j = await espn(prefix + "/scoreboard?dates=" + date.replace(/-/g, "") + "&limit=100", 20,fresh);
    return NextResponse.json({
      connected: true, updatedAt: now, league: info.name, matches: games(j, info.name)
    } satisfies SportsData, { headers: { "Cache-Control": "public, s-maxage=45, stale-while-revalidate=45" } });
  } catch (error) {
    console.warn("ESPN sports source unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({
      connected: false, updatedAt: now, league: info.name, error: "No se pudieron obtener datos de esta competición desde ESPN. Volvé a intentar más tarde."
    }, { headers: { "Cache-Control": "public, s-maxage=30" } });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { leagueInfo, seasonOf } from "@/lib/leagues";
import type { Game, Standing, Player, SportsData } from "@/lib/types";

export const dynamic = "force-dynamic";

// ESPN public site data (unofficial/undocumented, no API key). Never imply official affiliation.
// Fixed league map: no user-controlled upstream URL, and no fictional fallback scores.
const ESPN: Record<string, string | null> = {
  arg: "arg.1",
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
  "uefa-fem": "uefa.wchampions"
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
async function espn(path: string, revalidate: number): Promise<JsonRecord> {
  const response = await fetch(root + path, {
    headers: { Accept: "application/json" },
    next: { revalidate },
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
    const started = state.status !== "NS" && state.status !== "PST" && state.status !== "CANC";
    found.push({
      id,
      date: String(event.date || c.date || ""),
      league: String(json.leagues?.[0]?.name || leagueName),
      round: String(event.season?.slug || json.leagues?.[0]?.season?.type?.abbreviation || "").replace(/-/g, " ") || null,
      venue: c.venue?.fullName || null,
      referee: c.officials?.find((x: any) => /referee/i.test(x?.position?.name || x?.position?.displayName || ""))?.displayName || null,
      home: String(home.team.displayName),
      away: String(away.team.displayName),
      homeLogo: logo(home.team),
      awayLogo: logo(away.team),
      homeScore: started ? num(home.score?.displayValue ?? home.score) : null,
      awayScore: started ? num(away.score?.displayValue ?? away.score) : null,
      status: state.status,
      elapsed: state.elapsed
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
        logo: logo(row.team),
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
  return result;
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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const code = q.get("league") || "arg";
  const info = leagueInfo(code);
  const date = q.get("date") || new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Cordoba" });
  const mode = q.get("mode") === "standings" ? "standings" : "matches";
  const now = new Date().toISOString();
  if (!Object.prototype.hasOwnProperty.call(ESPN, code) || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + "T12:00:00Z"))) {
    return NextResponse.json({ connected: false, updatedAt: now, error: "Competición o fecha inválida." }, { status: 400 });
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
    const j = await espn(prefix + "/scoreboard?dates=" + date.replace(/-/g, "") + "&limit=100", 45);
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

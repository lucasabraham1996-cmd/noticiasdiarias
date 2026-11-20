import {NextRequest,NextResponse} from "next/server";
import {officialCrest} from "@/lib/branding";
import {proyeccionMatches} from "@/lib/proyeccion";
import {federalAAllGames,copaFinal,otherCupFinals} from "@/lib/argentina-extra";
import {womenArgMatches} from "@/lib/women-arg";
import type {Game} from "@/lib/types";

export const dynamic="force-dynamic";
const timezone="America/Argentina/Cordoba";
const root="https://site.web.api.espn.com";
type Source={slug:string;name:string};
const sources:Source[]=[
 {slug:"arg.1",name:"Primera División"},
 {slug:"arg.2",name:"Primera Nacional"},
 {slug:"arg.copa",name:"Copa Argentina"},
 {slug:"arg.3",name:"Primera B Metropolitana"},
 {slug:"arg.4",name:"Primera C"},
 {slug:"arg.supercopa",name:"Supercopa Argentina"}
];
function localDate(date:Date){return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(date)}
function monthKey(date:Date){return date.toISOString().slice(0,7).replace("-","")}
function addMonth(date:Date,offset:number){return new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+offset,1,12))}
function logo(team:any):string|null{
 const all=[team?.logo,...(Array.isArray(team?.logos)?team.logos.map((l:any)=>l.href):[])];
 const url=all.find(v=>typeof v==="string"&&v.startsWith("https://"))||null;
 if(url)return url;
 const id=Number(team?.id);
 return Number.isInteger(id)&&id>0?"https://a.espncdn.com/i/teamlogos/soccer/500/"+id+".png":null;
}
function parseScore(x:any):number|null{
 const value=x?.displayValue??x;
 return value!==null&&value!==undefined&&String(value).trim()!==""&&Number.isFinite(Number(value))?Number(value):null;
}
function parseEvents(data:any,source:Source):Game[]{
 const league=data?.leagues?.[0];
 const logoLeague=logo(league);
 const output:Game[]=[];
 for(const e of data?.events||[]){
  const c=e?.competitions?.[0];
  const home=c?.competitors?.find((v:any)=>v.homeAway==="home");
  const away=c?.competitors?.find((v:any)=>v.homeAway==="away");
  if(!home?.team?.displayName||!away?.team?.displayName||!Number.isFinite(Number(e?.id)))continue;
  const status=c?.status?.type||e?.status?.type||{};
  const state=String(status?.state||"").toLowerCase();
  const completed=state==="post"||status.completed===true;
  const live=state==="in";
  const isHalf=/HALF/i.test(String(status?.name||""));
  const id=Number(e.id);
  const date=String(e.date||c.date||"");
  if(!date||!Number.isFinite(Date.parse(date)))continue;
  const clock=String(c?.status?.displayClock||e?.status?.displayClock||"").trim();
  const elapsed=live&&Number.isFinite(Number(clock.match(/^\d+/)?.[0]))?Number(clock.match(/^\d+/)?.[0]):null;
  const homeName=String(home.team.displayName),awayName=String(away.team.displayName);
  output.push({id,date,league:source.name,leagueLogo:logoLeague,category:"masculino",
   round:e.season?.slug?String(e.season.slug).replaceAll("-"," "):null,
   venue:c?.venue?.fullName||null,referee:null,home:homeName,away:awayName,
   homeLogo:officialCrest(homeName,logo(home.team)),awayLogo:officialCrest(awayName,logo(away.team)),
   homeScore:completed||live?parseScore(home.score):null,
   awayScore:completed||live?parseScore(away.score):null,
   status:completed?"FT":live?(isHalf?"HT":Number(c?.status?.period)===1?"1H":"2H"):"NS",
   elapsed,clock:live?clock||null:null,
   sourceName:"ESPN",sourceUrl:"https://www.espn.com.ar/futbol/"});
 }
 return output;
}
async function monthly(source:Source,month:string,fresh:boolean):Promise<Game[]>{
 const path="/apis/site/v2/sports/soccer/"+source.slug+"/scoreboard?dates="+month+"&limit=250";
 const urls=[root+path,"https://site.api.espn.com"+path];
 let lastError="Fuente no disponible";
 for(const url of urls){
  try{
   const response=await fetch(url,{
    ...(fresh?{cache:"no-store" as const}:{next:{revalidate:120}}),
    headers:{Accept:"application/json"},signal:AbortSignal.timeout(8500)
   });
   if(!response.ok){lastError="ESPN HTTP "+response.status;continue}
   return parseEvents(await response.json(),source);
  }catch(error){lastError=error instanceof Error?error.message:"Error de consulta"}
 }
 throw new Error(lastError);
}
const isLive=(game:Game)=>["1H","2H","HT","ET","BT","P","LIVE","INT"].includes(game.status);
const isFinished=(game:Game)=>["FT","AET","PEN"].includes(game.status);
export async function GET(req:NextRequest){
 const fresh=req.nextUrl.searchParams.has("refresh");
 const now=new Date();
 const today=localDate(now);
 const base=new Date(today+"T12:00:00Z");
 const month=monthKey(base),nextMonth=monthKey(addMonth(base,1));
 const jobs=[
  ...sources.map(source=>monthly(source,month,fresh)),
  ...sources.slice(0,2).map(source=>monthly(source,nextMonth,fresh)),
  womenArgMatches(today).then(d=>d.matches||[]),
  proyeccionMatches(today).then(d=>d.matches||[])
 ];
 const results=await Promise.allSettled(jobs);
 let matches=[...results.flatMap(result=>result.status==="fulfilled"?result.value:[]),...federalAAllGames(),copaFinal,...Object.values(otherCupFinals)];
 let connected=results.some(result=>result.status==="fulfilled");
 if(!matches.length){
  const previous=await Promise.allSettled(sources.slice(0,2).map(source=>monthly(source,monthKey(addMonth(base,-1)),fresh)));
  matches=previous.flatMap(result=>result.status==="fulfilled"?result.value:[]);
  connected=connected||previous.some(result=>result.status==="fulfilled");
 }
 const unique=[...new Map(matches.map(game=>[game.id+"|"+game.league,game])).values()];
 const current=now.getTime(),start=Date.parse(today+"T00:00:00-03:00");
 const lives=unique.filter(isLive).sort((a,b)=>a.date.localeCompare(b.date));
 const todayDone=unique.filter(game=>isFinished(game)&&Date.parse(game.date)>=start).sort((a,b)=>b.date.localeCompare(a.date));
 const future=unique.filter(game=>game.status==="NS"&&Date.parse(game.date)>=current-15*60000).sort((a,b)=>a.date.localeCompare(b.date));
 const oldDone=unique.filter(game=>isFinished(game)&&Date.parse(game.date)<start).sort((a,b)=>b.date.localeCompare(a.date));
 const combined=[...new Map([...lives,...todayDone,...future,...oldDone].map(game=>[game.id+"|"+game.league,game])).values()];
 return NextResponse.json({connected,updatedAt:now.toISOString(),league:"Fútbol argentino",matches:combined.slice(0,12),
  message:"En vivo, partidos del día, próximos y últimos resultados verificados de competiciones argentinas."},
  {headers:{"Cache-Control":"public, s-maxage=60, stale-while-revalidate=90"}});
}

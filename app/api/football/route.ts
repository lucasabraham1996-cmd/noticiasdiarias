import {NextRequest,NextResponse} from "next/server";
import {leagueInfo,leagueId,seasonOf} from "@/lib/leagues";
import type {Game,Standing,Player,SportsData} from "@/lib/types";
export const dynamic="force-dynamic";
const endpoint="https://v3.football.api-sports.io";
async function api(path:string,age:number){
 const key=process.env.API_FOOTBALL_KEY;if(!key)throw new Error("Configurar API_FOOTBALL_KEY");
 const r=await fetch(endpoint+"/"+path,{headers:{"x-apisports-key":key},next:{revalidate:age}});
 if(!r.ok)throw new Error("Proveedor deportivo HTTP "+r.status);
 const j=await r.json();if(j.errors&&Object.keys(j.errors).length){
 console.warn("API_FOOTBALL_UPSTREAM_ERRORS",Object.entries(j.errors).map(([field,value])=>({field,reason:String(value).replace(/[a-f0-9]{24,}/ig,"[oculto]").slice(0,180)})));
 const detail=JSON.stringify(j.errors).toLowerCase();
 const message=/subscription|plan|season|coverage|not available/.test(detail)
  ?"El plan de API-Football no permite consultar esta temporada o liga."
  :/requests|quota|rate.limit|too many|limit/.test(detail)
  ?"Se alcanzó el límite de solicitudes permitido por API-Football."
  :/token|api.key|unauthoriz|invalid|access.denied|key/.test(detail)
  ?"API-Football rechazó la clave o la autorización."
  :"API-Football devolvió un error. Revisá el plan y las competiciones habilitadas.";
 throw new Error(message);
}
 return (j.response||[]) as any[];
}
export async function GET(req:NextRequest){
 const sp=req.nextUrl.searchParams;
 const code=sp.get("league")||"arg";const info=leagueInfo(code);
 const date=sp.get("date")||new Date().toLocaleDateString("en-CA",{timeZone:"America/Argentina/Cordoba"});
 const mode=sp.get("mode")==="standings"?"standings":"matches";
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return NextResponse.json({error:"Fecha inválida"},{status:400});
 const now=new Date().toISOString();
 if(!process.env.API_FOOTBALL_KEY)return NextResponse.json({connected:false,error:"Resultados y estadísticas se activarán al configurar la API deportiva. No mostramos marcadores inventados.",updatedAt:now});
 try{
 let id=leagueId(code);
 if(!id) return NextResponse.json({connected:false,error:"Para "+info.name+" hay que verificar el ID y cobertura del torneo femenino en la API.",updatedAt:now});
 const prefix="league="+id+"&season="+seasonOf(code,date);
 if(mode==="standings"){
   const [s,g,a]=await Promise.allSettled([api("standings?"+prefix,1800),api("players/topscorers?"+prefix,3600),api("players/topassists?"+prefix,3600)]);
   const groups:any[][]=s.status==="fulfilled"?(s.value[0]?.league?.standings||[]):[];
   const standings:Standing[]=groups.flatMap((group:any[],i:number)=>group.map((x:any)=>({rank:x.rank,team:x.team?.name||"",logo:x.team?.logo||null,played:x.all?.played||0,won:x.all?.win||0,drawn:x.all?.draw||0,lost:x.all?.lose||0,gd:x.goalsDiff||0,points:x.points||0,group:groups.length>1?x.group||"Zona "+(i+1):undefined})));
   const players=(rows:any[],field:"goals"|"assists"):Player[]=>(rows||[]).slice(0,3).map((x:any)=>({name:x.player?.name||"",team:x.statistics?.[0]?.team?.name||"",value:x.statistics?.[0]?.goals?.[field]??null}));
   const data:SportsData={connected:true,updatedAt:now,league:info.name,standings,scorers:g.status==="fulfilled"?players(g.value,"goals"):[],assisters:a.status==="fulfilled"?players(a.value,"assists"):[],error:s.status==="rejected"?"Tabla no disponible para este torneo":undefined};
   return NextResponse.json(data);
 }
 const rows=await api("fixtures?"+prefix+"&date="+date+"&timezone=America%2FArgentina%2FCordoba",45);
 const matches:Game[]=rows.map((x:any)=>({id:x.fixture?.id,date:x.fixture?.date||"",league:x.league?.name||info.name,round:x.league?.round||null,venue:x.fixture?.venue?.name||null,referee:x.fixture?.referee||null,home:x.teams?.home?.name||"",away:x.teams?.away?.name||"",homeLogo:x.teams?.home?.logo||null,awayLogo:x.teams?.away?.logo||null,homeScore:x.goals?.home??null,awayScore:x.goals?.away??null,status:x.fixture?.status?.short||"NS",elapsed:x.fixture?.status?.elapsed??null}));
 const data:SportsData={connected:true,updatedAt:now,league:info.name,matches:matches.sort((a,b)=>a.date.localeCompare(b.date))};
 return NextResponse.json(data,{"headers":{"Cache-Control":"public, s-maxage=45, stale-while-revalidate=60"}});
 }catch(e){return NextResponse.json({connected:false,updatedAt:now,error:e instanceof Error?e.message:"Servicio temporalmente indisponible"})}
}

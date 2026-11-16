import {NextRequest,NextResponse} from "next/server";
import type {Game} from "@/lib/types";
export const dynamic="force-dynamic";
type Round={name:string;matches:Game[]};
const provider="https://site.api.espn.com/apis/site/v2/sports/soccer/";
const logos:Record<string,number>={
 "Vélez":21,"Belgrano":4,"Defensa y Justicia":8950,"Barracas Central":10060,
 "Argentinos Juniors":3,"Independiente":11,"Rosario Central":17,"Gimnasia (Mendoza)":11972,
 "River Plate":16,"Lanús":12,"Instituto":2975,"Huracán":10,"Gimnasia (La Plata)":9,
 "Newell's Old Boys":14,"Boca Juniors":5,"Independiente Rivadavia":9744
};
const octavos:[string,string,string,string][]=[
 ["2026-11-20","20:00","Vélez","Belgrano"],
 ["2026-11-21","15:00","Defensa y Justicia","Barracas Central"],
 ["2026-11-21","17:00","Argentinos Juniors","Independiente"],
 ["2026-11-22","16:00","Rosario Central","Gimnasia (Mendoza)"],
 ["2026-11-22","19:00","River Plate","Lanús"],
 ["2026-11-22","22:00","Instituto","Huracán"],
 ["2026-11-23","17:00","Gimnasia (La Plata)","Newell's Old Boys"],
 ["2026-11-25","21:00","Boca Juniors","Independiente Rivadavia"]
];
const official="https://www.ligaprofesional.ar/notas/primera/2026/11/11/agenda-de-los-octavos-de-final-2/";
const slug=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const alias=(s:string):string=>{
 let v=slug(s);
 if(v.includes("gimnasia")&&v.includes("mendoza"))return "gimnasia mendoza";
 if(v.includes("gimnasia")&&(v.includes("plata")||v==="gimnasia"))return "gimnasia plata";
 if(v.includes("belgrano"))return "belgrano";
 if(v.includes("instituto"))return "instituto";
 if(v.includes("velez"))return "velez";
 if(v.includes("independiente rivadavia"))return "independiente rivadavia";
 if(v==="independiente")return "independiente";
 if(v.includes("newell"))return "newells";
 if(v.includes("river"))return "river";
 if(v.includes("boca"))return "boca";
 return v;
};
function game(row:[string,string,string,string],i:number):Game{
 const [date,time,home,away]=row;
 return {id:800000+i,date:new Date(date+"T"+time+":00-03:00").toISOString(),league:"Torneo Clausura 2026",round:"Octavos de final",
 venue:null,referee:null,home,away,homeLogo:logos[home]?"https://a.espncdn.com/i/teamlogos/soccer/500/"+logos[home]+".png":null,awayLogo:logos[away]?"https://a.espncdn.com/i/teamlogos/soccer/500/"+logos[away]+".png":null,homeScore:null,awayScore:null,status:"NS",elapsed:null};
}
async function espn(date:string,league:string):Promise<Game[]>{
 const r=await fetch(provider+league+"/scoreboard?dates="+date.replace(/-/g,"")+"&limit=100",{next:{revalidate:120},signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error("ESPN HTTP "+r.status);
 const data=await r.json() as any;
 const games:Game[]=[];
 for(const event of data.events||[]){
  const comp=event.competitions?.[0];const home=comp?.competitors?.find((x:any)=>x.homeAway==="home");const away=comp?.competitors?.find((x:any)=>x.homeAway==="away");
  if(!home?.team?.displayName||!away?.team?.displayName||!event.id)continue;
  const state=comp?.status?.type?.state||event.status?.type?.state;
  const progress=state==="in";
  const finish=state==="post"||comp?.status?.type?.completed===true;
  const c=(v:any)=>v==null||String(v).trim()===""||!Number.isFinite(Number(v))?null:Number(v);
  const getLogo=(t:any)=>typeof t?.logo==="string"&&t.logo.startsWith("https://")?t.logo:null;
  const clock=String(comp?.status?.displayClock||"");
  games.push({
   id:Number(event.id),date:String(event.date||""),league:String(data.leagues?.[0]?.name||"Liga Argentina"),
   round:String(event.season?.slug||data.leagues?.[0]?.season?.type?.name||"").replace(/-/g," ")||null,
   venue:comp?.venue?.fullName||null,referee:null,home:home.team.displayName,away:away.team.displayName,
   homeLogo:getLogo(home.team),awayLogo:getLogo(away.team),
   homeScore:progress||finish?c(home.score?.displayValue??home.score):null,
   awayScore:progress||finish?c(away.score?.displayValue??away.score):null,
   status:finish?"FT":progress?"LIVE":"NS",elapsed:progress?c(clock.match(/^\d+/)?.[0]):null
  });
 }
 return games;
}
function dayDiff(date:string,now:Date){return Math.abs(Date.parse(date+"T12:00:00Z")-now.getTime())/86400000}
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get("league")||"arg";
 if(code!=="arg"&&code!=="nacional")return NextResponse.json({error:"Liga inválida"},{status:400});
 const now=new Date();
 if(code==="arg"){
  const initial=octavos.map(game);
  const days=[...new Set(octavos.map(x=>x[0]))].filter(date=>dayDiff(date,now)<15 && Date.parse(date+"T00:00:00-03:00")<=Date.now()+86400000);
  const scores=await Promise.allSettled(days.map(day=>espn(day,"arg.1")));
  for(const res of scores){if(res.status!=="fulfilled")continue;
   for(const match of res.value){
    const local=initial.find(g=>alias(g.home)===alias(match.home)&&alias(g.away)===alias(match.away));
    if(local){local.homeScore=match.homeScore;local.awayScore=match.awayScore;local.status=match.status;local.elapsed=match.elapsed;local.venue=match.venue||local.venue;}
   }
  }
  const extraDays=["2026-11-28","2026-11-29","2026-12-05","2026-12-06","2026-12-12"].filter(day=>dayDiff(day,now)<8);
  const extra=await Promise.allSettled(extraDays.map(day=>espn(day,"arg.1")));
  const late:Game[]=[];for(const p of extra)if(p.status==="fulfilled")late.push(...p.value.filter(x=>/quarter|semi|final|cuartos|semifinal/i.test(x.round||"")));
  const rounds:Round[]=[{name:"Octavos de final",matches:initial},{name:"Cuartos de final",matches:late.filter(m=>/quarter|cuartos/i.test(m.round||""))},{name:"Semifinales",matches:late.filter(m=>/semi/i.test(m.round||""))},{name:"Final",matches:late.filter(m=>/final/i.test(m.round||"")&&!/semi|quarter/i.test(m.round||""))}];
  return NextResponse.json({connected:true,league:"Torneo Clausura · Primera División",rounds,source:official,sourceName:"Liga Profesional de Fútbol",updatedAt:now.toISOString(),message:"Cruces de octavos confirmados por la Liga Profesional; etapas posteriores a definir. Marcadores proceden de ESPN cuando están disponibles."},{headers:{"Cache-Control":"public, s-maxage=180, stale-while-revalidate=180"}});
 }
 const days=["2026-11-14","2026-11-15","2026-11-21","2026-11-22","2026-11-28","2026-11-29","2026-12-05","2026-12-06"].filter(day=>dayDiff(day,now)<15);
 const records=await Promise.allSettled(days.map(day=>espn(day,"arg.2")));
 const games=[...new Map(records.flatMap(x=>x.status==="fulfilled"?x.value:[]).map(x=>[x.id,x])).values()];
 const byRound=new Map<string,Game[]>();
 for(const g of games){const name=/quarter|cuarto/i.test(g.round||"")?"Cuartos de final":/semi/i.test(g.round||"")?"Semifinales":/final/i.test(g.round||"")?"Final":"Torneo Reducido";byRound.set(name,[...(byRound.get(name)||[]),g])}
 const rounds:Round[]=[...byRound.entries()].map(([name,matches])=>({name,matches:matches.sort((a,b)=>a.date.localeCompare(b.date))}));
 return NextResponse.json({connected:records.some(x=>x.status==="fulfilled"),league:"Primera Nacional · Torneo Reducido",rounds,source:"https://www.espn.com.ar/futbol/liga/_/nombre/arg.2",sourceName:"ESPN",updatedAt:now.toISOString(),message:"Se muestran los encuentros que el proveedor publica para estas fechas. No se completan cruces futuros sin confirmar."},{headers:{"Cache-Control":"public, s-maxage=180, stale-while-revalidate=180"}});
}

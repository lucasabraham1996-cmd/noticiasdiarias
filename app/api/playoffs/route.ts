import {NextRequest,NextResponse} from "next/server";
import type {Game} from "@/lib/types";
import {fixture,copaFinal,federalAAllGames} from "@/lib/argentina-extra";
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
 if(!["arg","nacional","copa","federal-a","proyeccion"].includes(code))return NextResponse.json({error:"Liga inválida"},{status:400});
 const now=new Date();
 if(code==="copa"){
  const months=["202608","202609","202610","202611","202612"];
  const batches=await Promise.allSettled(months.map(m=>espn(m,"arg.copa")));
  const matches=[...new Map(batches.flatMap(p=>p.status==="fulfilled"?p.value:[]).map(m=>[m.id,m])).values()];
  const pick=(test:RegExp)=>matches.filter(m=>test.test(m.round||"")).sort((a,b)=>a.date.localeCompare(b.date));
  const f=pick(/^final/i);
  const rounds:Round[]=[
   {name:"16avos de final",matches:pick(/round of 32|rd of 32|round.of.32/i)},
   {name:"Octavos de final",matches:pick(/round of 16|rd of 16|octavos/i)},
   {name:"Cuartos de final",matches:pick(/quarter|cuartos/i)},
   {name:"Semifinales",matches:pick(/semi/i)},
   {name:"Final · 2 de diciembre",matches:f.length?f:[copaFinal]}
  ];
  return NextResponse.json({connected:true,league:"Copa Argentina 2026",rounds,
   source:"https://www.afa.com.ar/es/posts/la-agenda-de-la-afa",sourceName:"AFA / ESPN",
   message:"Llaves por ronda del torneo 2026: resultados de ESPN y final confirmada por AFA para el 2 de diciembre. Los horarios sin confirmar se indican expresamente.",
   updatedAt:now.toISOString()},{headers:{"Cache-Control":"public, s-maxage=240, stale-while-revalidate=240"}});
 }
 if(code==="federal-a"){
  const semifinal=federalAAllGames().filter(x=>x.round?.includes("Semifinal"));
  const historical:Game[]=[
   fixture(871001,"2026-10-23",null,"Juventud Antoniana","Sol de América de Formosa","Federal A · Reválida 2026","Octavos · ida","FT",3,0),
   fixture(871002,"2026-10-31",null,"Sol de América de Formosa","Juventud Antoniana","Federal A · Reválida 2026","Octavos · vuelta","FT",0,3),
   fixture(871003,"2026-10-25",null,"Sportivo Las Parejas","Alvarado","Federal A · Reválida 2026","Octavos · ida","FT",0,1),
   fixture(871004,"2026-11-01",null,"Alvarado","Sportivo Las Parejas","Federal A · Reválida 2026","Octavos · vuelta","FT",1,2),
   fixture(871005,"2026-10-25",null,"Sarmiento de La Banda","Atenas de Río Cuarto","Federal A · Reválida 2026","Octavos · ida","FT",3,0),
   fixture(871006,"2026-11-01",null,"Atenas de Río Cuarto","Sarmiento de La Banda","Federal A · Reválida 2026","Octavos · vuelta","FT",4,2),
   fixture(871007,"2026-11-08",null,"Juventud Antoniana","Cipolletti","Federal A · Reválida 2026","Cuartos · ida","FT",0,1),
   fixture(871008,"2026-11-15",null,"Cipolletti","Juventud Antoniana","Federal A · Reválida 2026","Cuartos · vuelta","FT",3,0),
   fixture(871009,"2026-11-08",null,"Sarmiento de La Banda","Alvarado","Federal A · Reválida 2026","Cuartos · ida","FT",1,0),
   fixture(871010,"2026-11-15",null,"Alvarado","Sarmiento de La Banda","Federal A · Reválida 2026","Cuartos · vuelta","FT",0,0),
   fixture(871011,"2026-11-07",null,"Douglas Haig","Gimnasia de Chivilcoy","Federal A · Reválida 2026","Cuartos · ida","FT",1,0),
   fixture(871012,"2026-11-15",null,"Gimnasia de Chivilcoy","Douglas Haig","Federal A · Reválida 2026","Cuartos · vuelta","FT",2,2),
   fixture(871013,"2026-11-12",null,"Kimberley","Olimpo","Federal A · Reválida 2026","Cuartos · ida","FT",1,1),
   fixture(871014,"2026-11-17",null,"Olimpo","Kimberley","Federal A · Reválida 2026","Cuartos · vuelta","FT",1,1),
  ];
  const rounds:Round[]=[
   {name:"Octavos de final · Reválida",matches:historical.filter(m=>m.round?.startsWith("Octavos"))},
   {name:"Cuartos de final · Reválida",matches:historical.filter(m=>m.round?.startsWith("Cuartos"))},
   {name:"Semifinales · Reválida",matches:semifinal},
   {name:"Final · segundo ascenso",matches:[]},
   {name:"Final · primer ascenso",matches:federalAAllGames().filter(m=>m.round?.includes("Final"))}
  ];
  return NextResponse.json({connected:true,league:"Torneo Federal A 2026",rounds,
   source:"https://www.afa.com.ar/es/posts/la-agenda-de-la-afa",sourceName:"AFA / Tessirve",
   message:"Reválida por el segundo ascenso: resultados de octavos y cuartos publicados por fuentes deportivas; semifinales de ida del 22 de noviembre confirmadas por AFA. Vuelta y final pendientes de programación.",
   updatedAt:now.toISOString()},{headers:{"Cache-Control":"public, s-maxage=240, stale-while-revalidate=240"}});
 }
 if(code==="proyeccion"){
  const q=[
   fixture(872001,"2026-11-25",null,"Talleres (Córdoba)","Estudiantes de La Plata","Proyección · Reserva 2026","Cuartos de final"),
   fixture(872002,"2026-11-25",null,"Lanús","River Plate","Proyección · Reserva 2026","Cuartos de final"),
   fixture(872003,"2026-11-25",null,"Independiente","Gimnasia de Mendoza","Proyección · Reserva 2026","Cuartos de final"),
   fixture(872004,"2026-11-25",null,"Vélez","Boca Juniors","Proyección · Reserva 2026","Cuartos de final")
  ].map(g=>({...g,date:"",timeTBD:true,category:"reserva" as const}));
  const rounds:Round[]=[{name:"Cuartos de final",matches:q},{name:"Semifinales",matches:[]},{name:"Final",matches:[]}];
  return NextResponse.json({connected:true,league:"Torneo Proyección · Clausura 2026",rounds,
   source:"https://promediosinfo.com/liga/reserva.html",sourceName:"Promedios Info",
   message:"Cuartos confirmados según clasificación de las zonas A y B. Fechas y horarios pendientes de confirmación; los cruces de semifinal y final se publicarán cuando se definan.",
   updatedAt:now.toISOString()},{headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=300"}});
 }
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
 const order=["Torneo Reducido","Cuartos de final","Semifinales","Final"];const rounds:Round[]=[...byRound.entries()].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0])).map(([name,matches])=>({name,matches:matches.sort((a,b)=>a.date.localeCompare(b.date))}));
 return NextResponse.json({connected:records.some(x=>x.status==="fulfilled"),league:"Primera Nacional · Torneo Reducido",rounds,source:"https://www.espn.com.ar/futbol/liga/_/nombre/arg.2",sourceName:"ESPN",updatedAt:now.toISOString(),message:"Se muestran los encuentros que el proveedor publica para estas fechas. No se completan cruces futuros sin confirmar."},{headers:{"Cache-Control":"public, s-maxage=180, stale-while-revalidate=180"}});
}

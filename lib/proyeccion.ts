import type {Game,SportsData} from "@/lib/types";
import {channel,officialCrest} from "@/lib/branding";
// Programación de la Fecha 18 del Torneo Proyección Clausura 2026,
// fuente oficial Liga Profesional, actualizada al 13/11/2026.
const source="https://www.ligaprofesional.ar/notas/proyeccion/2026/11/13/agenda-de-la-18/";
type Fixture=[string,string,string,string,string,string];
const fixtures:Fixture[]=[
 ["2026-11-17","17:00","Unión","Instituto","Zona A","Estadio 15 de Abril"],
 ["2026-11-17","15:00","Gimnasia La Plata","Atlético Tucumán","Zona A","Estancia Chica"],
 ["2026-11-17","15:00","Independiente Rivadavia","Platense","Zona B","Ciudad Deportiva"],
 ["2026-11-17","15:00","San Lorenzo","Tigre","Zona A","Auxiliar"],
 ["2026-11-17","15:00","Estudiantes de Río Cuarto","Colón","Zona B","Ciudad Deportiva"],
 ["2026-11-17","15:00","Defensa y Justicia","Huracán","Zona B","Campeones del Mundo"],
 ["2026-11-17","17:00","San Martín de San Juan","Quilmes","Zona B","Hilario Sánchez"],
 ["2026-11-18","15:00","Deportivo Riestra","Atlético de Rafaela","Zona B","Speed Camp"],
 ["2026-11-18","15:00","Central Córdoba","Estudiantes de La Plata","Zona B","Alfredo Terrera"],
 ["2026-11-18","15:00","Newell's Old Boys","Ferro","Zona B","Predio"],
 ["2026-11-18","15:00","Vélez","Rosario Central","Zona A","Villa Olímpica"],
 ["2026-11-18","15:00","Lanús","Boca Juniors","Zona B","Estadio Ciudad de Lanús"],
 ["2026-11-18","15:00","Belgrano","Independiente","Zona B","Predio"],
 ["2026-11-19","15:00","Aldosivi","Godoy Cruz","Zona A","Predio"],
 ["2026-11-19","15:00","Argentinos Juniors","Gimnasia de Mendoza","Zona A","CEFFA"],
 ["2026-11-19","15:00","River Plate","Banfield","Zona A","River Camp"],
 ["2026-11-19","15:00","Sarmiento","Barracas Central","Zona A","Eva Perón"],
 ["2026-11-19","15:00","Racing Club","Talleres (Córdoba)","Zona A","Presidente Perón"]
];
const teamIds:Record<string,number>={
 "Unión":20,"Instituto":2975,"Gimnasia La Plata":9,"Atlético Tucumán":9785,
 "Independiente Rivadavia":9744,"Platense":7764,"San Lorenzo":18,"Tigre":7767,
 "Estudiantes de Río Cuarto":19685,"Colón":7,"Defensa y Justicia":8950,
 "Huracán":10,"San Martín de San Juan":11944,"Quilmes":10167,"Deportivo Riestra":17702,
 "Atlético de Rafaela":9794,"Central Córdoba":11989,"Estudiantes de La Plata":8,
 "Newell's Old Boys":14,"Ferro":9743,"Vélez":21,"Rosario Central":17,
 "Lanús":12,"Boca Juniors":5,"Belgrano":4,"Independiente":11,
 "Aldosivi":9739,"Godoy Cruz":9737,"Argentinos Juniors":3,"Gimnasia de Mendoza":11972,
 "River Plate":16,"Banfield":235,"Sarmiento":10158,"Barracas Central":10060,
 "Racing Club":15,"Talleres (Córdoba)":19
};
function logo(team:string):string|null{
 const id=teamIds[team];return officialCrest(team,id?"https://a.espncdn.com/i/teamlogos/soccer/500/"+id+".png":null);
}
const games:Game[]=fixtures.map((x,i)=>{
 const [day,time,home,away,round,venue]=x;
 return {id:900000+i,league:"Torneo Proyección · Clausura 2026",category:"reserva",round:"Fecha 18 · "+round,
 date:new Date(day+"T"+time+":00-03:00").toISOString(),venue,referee:null,home,away,
 homeLogo:logo(home),awayLogo:logo(away),homeScore:null,awayScore:null,status:"NS",elapsed:null,
 broadcasts:[channel("LPF Play")!],sourceName:"Liga Profesional de Fútbol",sourceUrl:source};
});

const statsSource="https://promediosinfo.com/liga/reserva.html";
const plain=(s:string)=>s.replace(/<[^>]*>/g,"").replace(/&amp;/gi,"&").replace(/&nbsp;/gi," ").replace(/\s+/g," ").trim();
const key=(s:string)=>plain(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"").replace(/juniorsjuniors/g,"juniors").replace(/sarsfield/g,"").replace(/carriloeste/g,"").replace(/^(clubatletico|ca)/g,"");
async function reserveHtml():Promise<string>{
 const r=await fetch(statsSource,{next:{revalidate:300},headers:{"Accept":"text/html","User-Agent":"Mozilla/5.0"},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw new Error("Reserva HTTP "+r.status);
 return r.text();
}
function fromSource(html:string):Game[]{
 const out:Game[]=[];
 let currentDay="";
 const rows=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 for(const [_,row] of rows){
  const cells=[...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x=>plain(x[1]));
  if(cells.length===1){
   const d=cells[0].toLowerCase().match(/(17|18|19)\s+de\s+noviembre/);
   if(d)currentDay="2026-11-"+d[1];
   continue;
  }
  if(cells.length<8||!currentDay||!/final|suspend|por jugar|en juego/i.test(cells[0]))continue;
  const home=cells[2],away=cells[7],hs=Number(cells[4]),as=Number(cells[5]);
  if(!home||!away||!Number.isFinite(hs)||!Number.isFinite(as))continue;
  const sourceGame=games.find(g=>g.date.startsWith(currentDay) && (
    key(g.home)===key(home)||key(g.away)===key(away) ||
    key(g.home).startsWith(key(home))||key(home).startsWith(key(g.home)) ||
    key(g.away).startsWith(key(away))||key(away).startsWith(key(g.away))
  ));
  if(sourceGame)out.push({...sourceGame,homeScore:hs,awayScore:as,status:/final/i.test(cells[0])?"FT":"NS",
    sourceName:"Promedios Info",sourceUrl:statsSource});
 }
 return out;
}
export async function proyeccionMatches(date:string):Promise<SportsData>{
 const updatedAt=new Date().toISOString();
 const scheduled=games.filter(g=>g.date.slice(0,10)===date);
 try{
  const sourced=fromSource(await reserveHtml()),byId=new Map(sourced.map(g=>[g.id,g]));
  const matches=scheduled.map(g=>byId.get(g.id)||g);
  return {connected:true,updatedAt,league:"Torneo Proyección · Clausura 2026",matches,
   sourceName:"Liga Profesional / Promedios Info",sourceUrl:statsSource,
   message:scheduled.length?"Fixture oficial; resultados actualizados desde fuente especializada cuando están disponibles.":"Consultá Playoffs para los cuartos confirmados y Estadísticas para ambas zonas."};
 }catch{
  return {connected:true,updatedAt,league:"Torneo Proyección · Clausura 2026",matches:scheduled,
   message:"Fixture confirmado por LPF; los marcadores aún no pudieron verificarse.",sourceUrl:source,sourceName:"Liga Profesional de Fútbol"};
 }
}
export async function proyeccionStandings():Promise<SportsData>{
 const updatedAt=new Date().toISOString();
 try{
  const html=await reserveHtml(),standings:import("@/lib/types").Standing[]=[];
  const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  for(const [,part] of tables){
   const group=plain(part.match(/<th[^>]*>(Clausura[^<]*Zona\s*[AB])<\/th>/i)?.[1]||"");
   if(!group)continue;
   const body=part.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]||part;
   for(const [,row] of body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>plain(x[1]));
    if(cells.length<10||!Number.isInteger(Number(cells[0]))||!cells[1])continue;
    const n=(i:number)=>Number(cells[i]);
    if([0,2,3,4,5,9].some(i=>!Number.isFinite(n(i))))continue;
    standings.push({rank:n(0),team:cells[1],logo:logo(cells[1]),played:n(3),won:n(4),drawn:n(5),lost:n(6),gd:n(9),points:n(2),group});
   }
  }
  if(standings.length<30)throw Error("Tabla incompleta");
  return {connected:true,updatedAt,league:"Torneo Proyección · Clausura 2026",standings,scorers:[],assisters:[],
   sourceName:"Promedios Info",sourceUrl:statsSource,message:"Zona A y B. Los cuatro mejores de cada grupo avanzan a cuartos."};
 }catch{
  return {connected:true,updatedAt,league:"Torneo Proyección · Clausura 2026",standings:[],scorers:[],assisters:[],
   error:"La fuente de Reserva no publicó una tabla legible. Los cruces confirmados están en Playoffs.",
   sourceName:"Liga Profesional",sourceUrl:"https://www.ligaprofesional.ar/proyeccion-clausura-2026/"};
 }
}

import type {Game,Standing,SportsData} from "@/lib/types";
import {officialCrest,channel} from "@/lib/branding";

const sourceUrl="https://www.calcio24.com/national/Argentina/Women-Primera-Division-A/2026/";
const officialAfa="https://www.afa.com.ar/es/posts/futbol-femenino-cronograma-de-la-fecha-14-de-primera-division";
const logoIds:Record<string,number>={
 "boca juniors":5,"ferro carril oeste":9743,"river plate":16,"belgrano cba":4,"banfield":235,
 "talleres cba":19,"san lorenzo":18,"union santa fe":20,"racing club":15,
 "independiente":11,"newells old boys":14,"ca huracan":10,"huracan":10,
 "gimnasia la plata":9,"ca lanus":12
};
function clean(s:string):string{return s.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/\s+/g," ").trim()}
function norm(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\(w\)|\bca\b/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function crest(name:string):string|null{
 let k=norm(name);
 if(k.includes("boca"))k="boca juniors";
 else if(k.includes("ferro"))k="ferro carril oeste";
 else if(k.includes("gimnasia"))k="gimnasia la plata";
 else if(k.includes("newell"))k="newells old boys";
 else if(k==="racing")k="racing club";
 else if(k==="river")k="river plate";
 else if(k.includes("talleres"))k="talleres cba";
 else if(k.includes("belgrano"))k="belgrano cba";
 else if(k.includes("huracan"))k="huracan";
 else if(k.includes("lanus"))k="ca lanus";
 else if(k.includes("union"))k="union santa fe";
 const id=logoIds[k]||null;
 return officialCrest(name,id?"https://a.espncdn.com/i/teamlogos/soccer/500/"+id+".png":null);
}
function normalizeName(s:string):string{
 return s.replace(/ \(W\)/g,"").replace(/^CA /,"").replace(" Cba"," (Córdoba)").replace("Union","Unión").replace("Lanus","Lanús");
}
function localIso(day:string,time:string):string|null{
 const match=day.match(/^(\d{2})\.(\d{2})\.(20\d{2})$/);
 if(!match||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
 // Calcio24 muestra hora de Europa central (CET). Convertimos a UTC antes de mostrar hora Córdoba.
 const [hh,mm]=time.split(":").map(Number);
 const europeSummer=Number(match[2])>=4 && Number(match[2])<=10;
 const tz=europeSummer?"+02:00":"+01:00";
 const t=new Date(match[3]+"-"+match[2]+"-"+match[1]+"T"+time+":00"+tz);
 return Number.isFinite(t.getTime())?t.toISOString():null;
}
function idFor(d:string,home:string,away:string){
 let h=2166136261;for(const ch of d+":"+home+":"+away){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}
 return Math.abs(h);
}
function rows(html:string):Game[]{
 const groups=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
 let date="";
 const games:Game[]=[];
 const now=Date.now();
 for(const [full,row] of groups){
  const cells=[...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(x=>clean(x[1]));
  if(!cells.length)continue;
  const d=cells.find(x=>/^\d{2}\.\d{2}\.20\d{2}$/.test(x));
  if(d&&cells.length<=2){date=d;continue}
  const ix=cells.findIndex(x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x));
  if(ix<0||!date||cells.length<ix+5)continue;
  const home=cells[ix+2],result=cells[ix+3],away=cells[ix+4];
  const dateISO=localIso(date,cells[ix]);
  if(!home||!away||!dateISO)continue;
  const score=result.match(/^(\d{1,2})\s*[-:]\s*(\d{1,2})$/);
  const diff=now-Date.parse(dateISO);
  const status=score?(diff>=2.25*3600_000?"FT":diff>=0?"LIVE":"NS"):"NS";
  games.push({
   id:idFor(dateISO,home,away),date:dateISO,league:"Primera División femenina · Argentina",category:"femenino",
   round:cells[ix+1]?.replace(/^WD\d+\s*/,"").trim()||"Torneo Clausura",
   venue:null,referee:null,
   broadcasts:/^2026-11-(16|17)$/.test(dateISO.slice(0,10))?[channel("LPF Play")!]:[],
   home:normalizeName(home),away:normalizeName(away),
   homeLogo:crest(home),awayLogo:crest(away),
   homeScore:score?Number(score[1]):null,awayScore:score?Number(score[2]):null,
   status,elapsed:null
  });
 }
 return [...new Map(games.map(x=>[x.id,x])).values()];
}
// Calendario contrastado con AFA el 11/11/2026. Sólo es respaldo, nunca se lo presenta como marcador en vivo.
const fallback=[["2026-11-15","17:30","San Luis FC","San Lorenzo"],["2026-11-16","11:00","Boca Juniors","Ferro Carril Oeste"],
 ["2026-11-16","15:00","SAT","River Plate"],["2026-11-16","15:00","Huracán","Gimnasia La Plata"],
 ["2026-11-16","15:00","Unión (Santa Fe)","Racing Club"],["2026-11-16","15:00","Lanús","Talleres (Córdoba)"],
 ["2026-11-16","17:00","Belgrano (Córdoba)","Banfield"],["2026-11-17","14:00","Independiente","Newell's Old Boys"],
 ["2026-11-19","16:00","Ferro Carril Oeste","River Plate"],["2026-11-23","10:00","River Plate","Talleres (Córdoba)"]].map(row=>{
 const date=row[0]+"T"+row[1]+":00-03:00";
 return {id:idFor(date,row[2],row[3]),date:new Date(date).toISOString(),league:"Primera División femenina · Argentina",category:"femenino",round:"Fecha 14 · Clausura",venue:null,referee:null,broadcasts:[channel("LPF Play")!],home:row[2],away:row[3],homeLogo:crest(row[2]),awayLogo:crest(row[3]),homeScore:null,awayScore:null,status:"NS",elapsed:null} satisfies Game;
});
async function scrape():Promise<Game[]>{
 const r=await fetch(sourceUrl,{next:{revalidate:90},headers:{"Accept":"text/html","User-Agent":"Mozilla/5.0 (compatible; NoticiasDiarias/1.0)"},signal:AbortSignal.timeout(9000)});
 if(!r.ok)throw Error("Fuente femenina HTTP "+r.status);
 const html=await r.text();
 const found=rows(html);
 if(found.length<2)throw Error("Datos femeninos no legibles de la fuente");
 return found;
}
export async function womenArgMatches(date:string):Promise<SportsData>{
 const updatedAt=new Date().toISOString();
 try{
  const games=await scrape();
  return {connected:true,updatedAt,league:"Primera A femenina · Argentina",matches:games.filter(x=>new Date(x.date).toLocaleDateString("en-CA",{timeZone:"America/Argentina/Cordoba"})===date).sort((a,b)=>a.date.localeCompare(b.date))};
 }catch(e){
  const matches=fallback.filter(x=>new Date(x.date).toLocaleDateString("en-CA",{timeZone:"America/Argentina/Cordoba"})===date);
  return {connected:matches.length>0,updatedAt,league:"Primera A femenina · Argentina",matches,error:matches.length?"Calendario verificado por AFA. El proveedor de resultados no está disponible en este momento: no hay marcadores en directo.":"No fue posible verificar resultados de Primera A femenina en esta fecha. Consultá las fuentes oficiales."};
 }
}
export async function womenArgStandings():Promise<SportsData>{
 const updatedAt=new Date().toISOString();
 const source="https://elfemenino.com.ar/primeradivision/";
 try{
  const response=await fetch(source,{next:{revalidate:900},headers:{"Accept":"text/html","User-Agent":"Mozilla/5.0 (compatible; NoticiasDiarias/1.0)"},signal:AbortSignal.timeout(9000)});
  if(!response.ok)throw Error("Tabla femenina HTTP "+response.status);
  const html=await response.text();
  const anchor=html.search(/TABLA DE POSICIONES CLAUSURA 2026|Clausura 2026/i);
  if(anchor<0)throw Error("No hay Clausura 2026");
  const tableHtml=html.slice(anchor).match(/<table\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if(!tableHtml)throw Error("No se encontró la tabla");
  const standings:Standing[]=[];
  const rowsHtml=[...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const names:Record<string,string>={
   "Boca":"Boca Juniors","Talleres CBA":"Talleres (Córdoba)","Racing":"Racing Club",
   "River":"River Plate","Ferro":"Ferro Carril Oeste","Belgrano":"Belgrano (Córdoba)",
   "Gimnasia":"Gimnasia La Plata","Unión":"Unión (Santa Fe)","SAT":"S.A.T."
  };
  for(const row of rowsHtml){
   const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>clean(x[1]));
   if(cells.length<10)continue;
   const v=cells.map((x,i)=>i===1?NaN:Number(x.replace("+","")));
   if(!Number.isInteger(v[0])||v[0]<1||v[0]>30||!cells[1])continue;
   const team=names[cells[1]]||cells[1];
   standings.push({rank:v[0],team,logo:crest(team),played:v[2],won:v[3],drawn:v[4],lost:v[5],gd:v[8],points:v[9]});
  }
  if(standings.length<12)throw Error("Tabla incompleta");
  return {connected:true,updatedAt,league:"Primera A femenina · Torneo Clausura 2026",standings:standings.sort((a,b)=>a.rank-b.rank),scorers:[],assisters:[],error:"Tabla publicada por El Femenino; la actualización de posiciones puede demorarse respecto de los partidos en vivo."};
 }catch{
  return {connected:true,updatedAt,league:"Primera A femenina · Torneo Clausura 2026",standings:[],scorers:[],assisters:[],error:"La fuente de posiciones femeninas no respondió. Partidos y resultados disponibles en la pestaña Partidos."};
 }
}

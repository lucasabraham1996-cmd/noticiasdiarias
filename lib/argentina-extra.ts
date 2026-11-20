import {officialCrest} from "@/lib/branding";
import type {Game,Standing,SportsData} from "@/lib/types";

// Sources: AFA (agenda oficial), DataPotrero (tablas históricas y actuales).
const AFA="https://www.afa.com.ar/es/posts/la-agenda-de-la-afa";
const TABLE="https://datopotrero.com/federal-a/2026/";
const baseLeague="Torneo Federal A · Reválida 2026";
const ids:Record<string,number>={"Cipolletti":null as unknown as number,"Olimpo":null as unknown as number};
const logos:Record<string,number>={"Boca Juniors":5,"Platense":7764,"Estudiantes de La Plata":8,"Independiente Rivadavia":9744,"Rosario Central":17,"Banfield":235};
function crest(team:string):string|null{return officialCrest(team,logos[team]?"https://a.espncdn.com/i/teamlogos/soccer/500/"+logos[team]+".png":null)}
function simple(s:string):string{return s.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&nbsp;|&#160;/g," ").replace(/\s+/g," ").trim()}
export function fixture(id:number, day:string, time:string|null, home:string, away:string, league:string, round:string, status="NS", homeScore:number|null=null,awayScore:number|null=null, sourceUrl=AFA):Game{
 const date=new Date(day+"T"+(time||"12:00")+":00-03:00").toISOString();
 return {id,date,league,round,category:"masculino",home,away,homeLogo:crest(home),awayLogo:crest(away),homeScore,awayScore,status,elapsed:null,venue:null,referee:null,sourceName:sourceUrl===AFA?"AFA":"Fuente deportiva",sourceUrl,...(time?{}:{timeTBD:true})};
}
// Programación de AFA del 20/11/2026: sólo fechas y horarios confirmados.
const federalFixtures:Game[]=[
 fixture(870001,"2026-11-22","17:00","Douglas Haig","Olimpo",baseLeague,"Reválida · Semifinal · ida"),
 fixture(870002,"2026-11-22","19:30","Sarmiento de La Banda","Cipolletti",baseLeague,"Reválida · Semifinal · ida")
];
const federalHistory:Game[]=[
 fixture(870003,"2026-10-25","15:00","Cipolletti","San Martín de Formosa","Torneo Federal A 2026","Final · primer ascenso","FT",0,2,"https://deportv.gob.ar/futbol/san-martin-formosa-cipolletti-nacional-federal-ascenso-nid%3A18300")
];
export function federalAAllGames(){return [...federalHistory,...federalFixtures]}
export async function federalAMatches(day:string):Promise<SportsData>{
 const matches=federalAAllGames().filter(g=>g.date.slice(0,10)===day);
 const visible=matches.length?matches:federalFixtures.filter(g=>Date.parse(g.date)>Date.now()-7200000);
 return {connected:true,updatedAt:new Date().toISOString(),league:"Torneo Federal A",matches:visible.length?visible:federalHistory,
 message:matches.length? "Partidos confirmados por AFA; resultados únicamente si están verificados.":"Próximos cruces confirmados o última final, con su fecha real. Las otras instancias están en Playoffs.",
 sourceName:"Asociación del Fútbol Argentino",sourceUrl:AFA};
}
export async function federalAStandings():Promise<SportsData>{
 const updatedAt=new Date().toISOString();
 try{
  const r=await fetch(TABLE,{next:{revalidate:3600},signal:AbortSignal.timeout(11000),headers:{"User-Agent":"Mozilla/5.0","Accept":"text/html"}});
  if(!r.ok)throw new Error("HTTP "+r.status);
  const html=await r.text(), standings:Standing[]=[];
  const sections=[...html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<table[^>]*>([\s\S]*?)<\/table>/gi)];
  for(const [,title,part] of sections){
   const group=simple(title);
   if(!/(primera fase|segunda fase|fase campeonato|rev[aá]lida)/i.test(group))continue;
   const trs=[...part.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
   for(const [,tr] of trs){
    const cells=[...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>simple(x[1]));
    if(cells.length<10||!Number.isInteger(Number(cells[0]))||!cells[1])continue;
    const n=(i:number)=>Number(cells[i]);if([0,2,3,4,5,8,9].some(i=>!Number.isFinite(n(i))))continue;
    standings.push({rank:n(0),team:cells[1],logo:crest(cells[1]),played:n(2),won:n(3),drawn:n(4),lost:n(5),gd:n(8),points:n(9),group});
   }
  }
  if(standings.length<25)throw new Error("Tabla incompleta");
  return {connected:true,updatedAt,league:"Torneo Federal A 2026 · todas las fases",standings,scorers:[],assisters:[],sourceName:"DataPotrero",sourceUrl:TABLE,
   message:"Tablas separadas por fase y zona (no mezclar fases en una tabla única). Fuente estadística externa, con actualización no necesariamente en vivo."};
 }catch{
  return {connected:true,updatedAt,league:"Federal A",standings:[],scorers:[],assisters:[],error:"No respondió la fuente estadística del Federal A.",sourceName:"DataPotrero",sourceUrl:TABLE};
 }
}
export const otherCupFinals:Record<string,Game>={
 supercopa:fixture(880001,"2026-11-12","20:00","Estudiantes de La Plata","Independiente Rivadavia","Supercopa Argentina 2026","Final","AET",3,2,"https://www.afa.com.ar/es/posts/estudiantes-de-la-plata-se-consagro-campeon-de-la-supercopa-argentina-tras-vencer-a-independiente-rivadavia"),
 "supercopa-int":fixture(880002,"2026-09-26","16:00","Estudiantes de La Plata","Rosario Central","Supercopa Internacional 2026","Final","FT",1,3,"https://www.afa.com.ar/es/posts/supercopa-internacional-rosario-central-se-impuso-3-1-a-estudiantes-en-la-definicion-por-el-titulo")
};
export function otherCupMatches(code:string,day:string):SportsData{
 const g=otherCupFinals[code],now=new Date().toISOString();
 if(!g)return {connected:false,updatedAt:now,error:"Competición no configurada"};
 return {connected:true,updatedAt:now,league:g.league,matches:[g],sourceName:"AFA",sourceUrl:g.sourceUrl,
 message:day===g.date.slice(0,10)?"Resultado de la final oficial.":"Última final oficial de esta competencia. La fecha indicada es la fecha real del partido, no la fecha seleccionada."};
}
export const copaFinal=fixture(880003,"2026-12-02",null,"Boca Juniors","Platense","Copa Argentina 2026","Final · 2 de diciembre · horario a confirmar","NS",null,null,"https://www.afa.com.ar/es/posts/la-agenda-de-la-afa");
export function trofeoMessage():SportsData{return {connected:true,updatedAt:new Date().toISOString(),league:"Trofeo de Campeones 2026",matches:[],sourceName:"Liga Profesional",sourceUrl:"https://www.lpf.org.ar/?p=85471",message:"Final confirmada para el 19 de diciembre en el Mario Alberto Kempes, Córdoba. Los equipos se incorporarán cuando queden oficialmente definidos."}}

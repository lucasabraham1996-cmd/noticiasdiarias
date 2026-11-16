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
 return {id:900000+i,league:"Torneo Proyección · Clausura 2026",round:"Fecha 18 · "+round,
 date:new Date(day+"T"+time+":00-03:00").toISOString(),venue,referee:null,home,away,
 homeLogo:logo(home),awayLogo:logo(away),homeScore:null,awayScore:null,status:"NS",elapsed:null,
 broadcasts:[channel("LPF Play")!],sourceName:"Liga Profesional de Fútbol",sourceUrl:source};
});
export async function proyeccionMatches(date:string):Promise<SportsData>{
 return {connected:true,updatedAt:new Date().toISOString(),league:"Torneo Proyección · Clausura 2026",
 matches:games.filter(g=>new Date(g.date).toLocaleDateString("en-CA",{timeZone:"America/Argentina/Cordoba"})===date),
 message:"Fecha 18 confirmada por la LPF. Los resultados y minutos solo se mostrarán cuando exista una fuente en directo verificable.",
 sourceUrl:source,sourceName:"Liga Profesional de Fútbol"};
}
export async function proyeccionStandings():Promise<SportsData>{
 return {connected:true,updatedAt:new Date().toISOString(),league:"Torneo Proyección · Clausura 2026",
 standings:[],scorers:[],assisters:[],message:"Clasifican los primeros cuatro de cada zona a cuartos de final. La tabla oficial se puede consultar en la web de la Liga Profesional.",
 sourceName:"Liga Profesional de Fútbol",sourceUrl:"https://www.ligaprofesional.ar/proyeccion-clausura-2026/"};
}

export type League = {code:string;name:string;country:string;group:"Argentina"|"Europa"|"Femenino"|"Internacional"|"Selecciones"|"Todos";id:number|null;season:"calendar"|"europe"};
export const LEAGUES:League[]=[
{code:"todos",name:"TODOS",country:"Mundo",group:"Todos",id:null,season:"calendar"},
{code:"arg",name:"Primera División",country:"Argentina",group:"Argentina",id:128,season:"calendar"},
{code:"copa",name:"Copa Argentina",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"supercopa",name:"Supercopa Argentina",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"supercopa-int",name:"Supercopa Internacional",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"trofeo",name:"Trofeo de Campeones",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"proyeccion",name:"Torneo Proyección · Reserva",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"federal-a",name:"Torneo Federal A",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"trofeo-proyeccion",name:"Trofeo de Campeones · Proyección",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"primera-b",name:"Primera B Metropolitana",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"primera-c",name:"Primera C",country:"Argentina",group:"Argentina",id:null,season:"calendar"},
{code:"nacional",name:"Primera Nacional",country:"Argentina",group:"Argentina",id:129,season:"calendar"},
{code:"premier",name:"Premier League",country:"Inglaterra",group:"Europa",id:39,season:"europe"},
{code:"laliga",name:"LaLiga",country:"España",group:"Europa",id:140,season:"europe"},
{code:"seriea",name:"Serie A",country:"Italia",group:"Europa",id:135,season:"europe"},
{code:"bundesliga",name:"Bundesliga",country:"Alemania",group:"Europa",id:78,season:"europe"},
{code:"ligue1",name:"Ligue 1",country:"Francia",group:"Europa",id:61,season:"europe"},
{code:"champions",name:"Champions League",country:"Europa",group:"Internacional",id:2,season:"europe"},
{code:"selecciones",name:"Selecciones · Top 20 FIFA",country:"Mundo",group:"Selecciones",id:null,season:"calendar"},
{code:"arg-fem",name:"Primera A femenina",country:"Argentina",group:"Femenino",id:null,season:"calendar"},
{code:"eng-fem",name:"Women's Super League",country:"Inglaterra",group:"Femenino",id:null,season:"europe"},
{code:"esp-fem",name:"Liga F",country:"España",group:"Femenino",id:null,season:"europe"},
{code:"ita-fem",name:"Serie A femenina",country:"Italia",group:"Femenino",id:null,season:"europe"},
{code:"ger-fem",name:"Frauen-Bundesliga",country:"Alemania",group:"Femenino",id:null,season:"europe"},
{code:"fra-fem",name:"Première Ligue",country:"Francia",group:"Femenino",id:null,season:"europe"},
{code:"nws-fem",name:"NWSL (Estados Unidos)",country:"Estados Unidos",group:"Femenino",id:null,season:"calendar"},
{code:"uefa-fem",name:"Champions femenina",country:"Europa",group:"Femenino",id:null,season:"europe"}];
export function leagueInfo(code:string){return LEAGUES.find(l=>l.code===code)||LEAGUES[0]}
export function leagueId(code:string):number|null {let overrides:Record<string,number>={};try{overrides=JSON.parse(process.env.FOOTBALL_LEAGUE_IDS||"{}")}catch{};return overrides[code]||leagueInfo(code).id}
export function seasonOf(code:string,date:string){const d=new Date(date+"T12:00:00Z");const y=d.getUTCFullYear();return leagueInfo(code).season==="calendar"?y:(d.getUTCMonth()<6?y-1:y)}

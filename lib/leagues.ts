export type League = {code:string;name:string;country:string;group:"Argentina"|"Europa"|"Femenino"|"Internacional";id:number|null;season:"calendar"|"europe"};
export const LEAGUES:League[]=[
{code:"arg",name:"Primera División",country:"Argentina",group:"Argentina",id:128,season:"calendar"},
{code:"nacional",name:"Primera Nacional",country:"Argentina",group:"Argentina",id:129,season:"calendar"},
{code:"premier",name:"Premier League",country:"Inglaterra",group:"Europa",id:39,season:"europe"},
{code:"laliga",name:"LaLiga",country:"España",group:"Europa",id:140,season:"europe"},
{code:"seriea",name:"Serie A",country:"Italia",group:"Europa",id:135,season:"europe"},
{code:"bundesliga",name:"Bundesliga",country:"Alemania",group:"Europa",id:78,season:"europe"},
{code:"ligue1",name:"Ligue 1",country:"Francia",group:"Europa",id:61,season:"europe"},
{code:"champions",name:"Champions League",country:"Europa",group:"Internacional",id:2,season:"europe"},
{code:"arg-fem",name:"Primera A femenina",country:"Argentina",group:"Femenino",id:null,season:"calendar"},
{code:"eng-fem",name:"Women's Super League",country:"Inglaterra",group:"Femenino",id:null,season:"europe"},
{code:"esp-fem",name:"Liga F",country:"España",group:"Femenino",id:null,season:"europe"},
{code:"ita-fem",name:"Serie A femenina",country:"Italia",group:"Femenino",id:null,season:"europe"},
{code:"ger-fem",name:"Frauen-Bundesliga",country:"Alemania",group:"Femenino",id:null,season:"europe"},
{code:"fra-fem",name:"Première Ligue",country:"Francia",group:"Femenino",id:null,season:"europe"}];
export function leagueInfo(code:string){return LEAGUES.find(l=>l.code===code)||LEAGUES[0]}
export function leagueId(code:string):number|null {let overrides:Record<string,number>={};try{overrides=JSON.parse(process.env.FOOTBALL_LEAGUE_IDS||"{}")}catch{};return overrides[code]||leagueInfo(code).id}
export function seasonOf(code:string,date:string){const d=new Date(date+"T12:00:00Z");const y=d.getUTCFullYear();return leagueInfo(code).season==="calendar"?y:(d.getUTCMonth()<6?y-1:y)}

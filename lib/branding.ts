// Fuentes oficiales de identidad: Talleres de Córdoba, sitio institucional (2026).
export const TALLERES_OFFICIAL_CREST="https://www.clubtalleres.com.ar/wp-content/uploads/2025/03/escudo-2-estrellas-x2-251x300.png";
const channelSites:Record<string,string>={
 "LPF Play":"https://www.lpfplay.com/",
 "ESPN":"https://www.espn.com.ar/",
 "ESPN Premium":"https://www.espn.com.ar/",
 "TNT Sports":"https://tntsports.com.ar/",
 "TyC Sports":"https://www.tycsports.com/",
 "DSports":"https://www.directvgo.com/",
 "TV Pública":"https://www.tvpublica.com.ar/"
};
export function channel(name:string,region="ar") {
 const site=channelSites[name];
 if(!site)return null;
 return {name,region,url:site,logo:"https://www.google.com/s2/favicons?domain="+new URL(site).hostname+"&sz=64"};
}
const knownTeamIds:Record<string,number>={
 "boca juniors":5,"river plate":16,"racing club":15,"independiente":11,
 "san lorenzo":18,"velez":21,"belgrano":4,"instituto":2975,"union":20,
 "rosario central":17,"newell's old boys":14,"estudiantes de la plata":8,
 "estudiantes de rio cuarto":19685,"colon":7,"lanus":12,"banfield":235,
 "huracan":10,"argentinos juniors":3,"defensa y justicia":8950,"tigre":7767,
 "platense":7764,"atletico tucuman":9785,"central cordoba":11989,
 "gimnasia la plata":9,"gimnasia de mendoza":11972,"independiente rivadavia":9744,
 "deportivo riestra":17702,"barracas central":10060,"sarmiento":10158,
 "godoy cruz":9737,"aldosivi":9739,"ferro":9743,"ferro carril oeste":9743,
 "quilmes":10167,"atletico de rafaela":9794,"san martin de san juan":11944
};
export function officialCrest(team:string,provided:string|null):string|null{
 const value=team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 if(/talleres/.test(value)&&!/remedios|berrotaran|perico/i.test(value))return TALLERES_OFFICIAL_CREST;
 if(provided&&/^https:\/\//.test(provided))return provided;
 const key=value.replace(/\s*\((cordoba|santa fe)\)/g,"").replace(/[^a-z0-9' ]/g," ").replace(/\s+/g," ").trim();
 const id=knownTeamIds[key];
 return id?"https://a.espncdn.com/i/teamlogos/soccer/500/"+id+".png":null;
}

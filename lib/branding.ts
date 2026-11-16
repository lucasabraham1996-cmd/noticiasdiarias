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
export function officialCrest(team:string,provided:string|null):string|null{
 const value=team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 if(/talleres/.test(value)&&!/remedios|berrotaran|perico/i.test(value))return TALLERES_OFFICIAL_CREST;
 return provided;
}

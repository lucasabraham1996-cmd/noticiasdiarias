import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
type Found={id:number;url:string};
const leagueGroups=[
 ["arg.1","arg.2","arg.copa","arg.3","arg.4","arg.supercopa"],
 ["eng.1","esp.1","ita.1","ger.1","fra.1","uefa.champions"],
 ["eng.w.1","esp.w.1","fra.w.1","usa.nwsl","uefa.wchampions"]
];
function clean(name:string){
 const a=name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/&/g," y ").replace(/['’]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
 return a.replace(/\b(women|femenino|femenina|reserva)\b/g,"").replace(/\s+/g," ").trim();
}
const aliases:Record<string,string>={
 "talleres cordoba":"talleres","talleres de cordoba":"talleres",
 "belgrano cordoba":"belgrano","union santa fe":"union",
 "newells old boys":"newells old boys",
 "ferro carril oeste":"ferro","ferro":"ferro",
 "gimnasia la plata":"gimnasia la plata","gimnasia de mendoza":"gimnasia mendoza",
 "racing":"racing club","river":"river plate","boca":"boca juniors"
};
function key(s:string){const normalized=clean(s);return aliases[normalized]||normalized}
async function clubList(slug:string):Promise<any[]>{
 const path="/apis/site/v2/sports/soccer/"+slug+"/teams";
 for(const root of ["https://site.web.api.espn.com","https://site.api.espn.com"]){
  try{
   const response=await fetch(root+path,{next:{revalidate:21600},headers:{Accept:"application/json"},signal:AbortSignal.timeout(6000)});
   if(!response.ok)continue;
   const data=await response.json();
   return data?.sports?.[0]?.leagues?.[0]?.teams||[];
  }catch{continue}
 }
 return [];
}
function extract(team:any):Found|null{
 const logo=team?.logo||team?.logos?.find((x:any)=>(x?.rel||[]).includes("default"))?.href||team?.logos?.[0]?.href;
 const id=Number(team?.id);
 const url=typeof logo==="string"&&logo.startsWith("https://")?logo:Number.isInteger(id)&&id>0?"https://a.espncdn.com/i/teamlogos/soccer/500/"+id+".png":null;
 if(!url)return null;
 try{const u=new URL(url);if(u.protocol!=="https:"||u.hostname!=="a.espncdn.com"||!/^\/i\/teamlogos\/soccer\/(500|200|100)(-dark)?\/[a-z0-9-]+\.(png|webp)$/i.test(u.pathname))return null;}catch{return null}
 return {id,url};
}
async function lookup(name:string):Promise<Found|null>{
 const wanted=key(name);
 for(const group of leagueGroups){
  const records=await Promise.all(group.map(slug=>clubList(slug)));
  for(const teams of records)for(const entry of teams){
   const team=entry?.team||entry;
   const names=[team?.displayName,team?.name,team?.shortDisplayName,team?.location].filter((x):x is string=>typeof x==="string");
   if(names.some(candidate=>key(candidate)===wanted)){
    const found=extract(team);
    if(found)return found;
   }
  }
 }
 return null;
}
export async function GET(req:NextRequest){
 const name=(req.nextUrl.searchParams.get("name")||"").trim();
 if(!name||name.length>100)return new NextResponse(null,{status:400});
 const found=await lookup(name);
 if(!found)return new NextResponse(null,{status:404,headers:{"Cache-Control":"public, max-age=600, s-maxage=1800"}});
 try{
  const response=await fetch(found.url,{next:{revalidate:86400},headers:{Accept:"image/png,image/webp"},signal:AbortSignal.timeout(6500)});
  const type=response.headers.get("content-type")||"";
  if(!response.ok||!response.body||!/^image\/(png|webp)/i.test(type))return new NextResponse(null,{status:404});
  return new NextResponse(response.body,{headers:{"Content-Type":type,"Cache-Control":"public, max-age=3600, s-maxage=21600, stale-while-revalidate=3600","X-Content-Type-Options":"nosniff"}});
 }catch{return new NextResponse(null,{status:502})}
}

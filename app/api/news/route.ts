import {NextResponse} from "next/server";
import Parser from "rss-parser";
import type {Article,Category} from "@/lib/types";
export const revalidate=300;
const feeds:{source:string;url:string;category:Category}[]=[
{source:"La Voz",url:"https://www.lavoz.com.ar/arc/outboundfeeds/rss/",category:"Córdoba"},
{source:"Infobae",url:"https://www.infobae.com/arc/outboundfeeds/rss/",category:"Argentina"},
{source:"La Nación",url:"https://www.lanacion.com.ar/arc/outboundfeeds/rss/",category:"Argentina"},
{source:"Olé",url:"https://www.ole.com.ar/rss/ultimas-noticias/",category:"Deportes"},
{source:"Google Noticias · Córdoba",url:"https://news.google.com/rss/search?q=C%C3%B3rdoba+Argentina+when%3A1d&hl=es-419&gl=AR&ceid=AR:es-419",category:"Córdoba"},
{source:"Google Noticias · Fútbol",url:"https://news.google.com/rss/search?q=f%C3%BAtbol+argentino+when%3A1d&hl=es-419&gl=AR&ceid=AR:es-419",category:"Deportes"}];
const parser=new Parser({timeout:7500,customFields:{item:[["media:content","mediaContent"],["media:thumbnail","mediaThumb"]]}});
const strip=(s:string)=>s.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
function classify(s:string,fallback:Category):Category{
 if(/fútbol|futbol|liga|talleres|belgrano|instituto|boca|river|deport|gol |racing de córdoba/i.test(s))return "Deportes";
 if(/robo|crimen|polic|fiscal|detenid|asesinat|violencia|justicia/i.test(s))return "Policiales";
 if(/inflaci|dólar|dolar|salario|anses|econom|empresa|empleo/i.test(s))return "Economía";
 if(/elecci|llaryora|milei|de loredo|juez|bornoroni|congreso|diputad|senado|intenden/i.test(s))return "Política";
 if(/actor|cantante|música|televisi|famos|concierto|premio|cine/i.test(s))return "Espectáculos";
 if(/ucrania|rusia|china|trump|europa|brasil|internacion|estados unidos/i.test(s))return "Mundo";
 return fallback;
}
function imageUrl(item:any):string|null{
 const m=item.mediaContent||item.mediaThumb;const node=Array.isArray(m)?m[0]:m;const url=(typeof node==="object"?(node?.$?.url||node?.url):node)||item.enclosure?.url;
 return typeof url==="string"&&/^https:\/\//.test(url)?url:null;
}
export async function GET(){
 const results=await Promise.allSettled(feeds.map(async f=>{
  const result=await parser.parseURL(f.url);
  return (result.items||[]).slice(0,25).map((n:any):Article=>({id:String(n.guid||n.link||n.title||"").slice(0,350),title:strip(String(n.title||"")),summary:strip(String(n.contentSnippet||n.summary||n.content||"")).slice(0,285),url:String(n.link||""),source:f.source,category:classify(String(n.title||""),f.category),publishedAt:n.isoDate||n.pubDate||"1970-01-01T00:00:00Z",image:imageUrl(n)})).filter(n=>n.title.length>12&&/^https?:\/\//.test(n.url));
 }));
 const errors:string[]=[];const merged:Article[]=[];
 results.forEach((r,i)=>{if(r.status==="fulfilled")merged.push(...r.value);else errors.push("No respondió "+feeds[i].source)});
 const sorted=[...new Map(merged.map(n=>[n.title.toLocaleLowerCase("es"),n])).values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 return NextResponse.json({items:sorted.slice(0,90),errors,updatedAt:new Date().toISOString()},{"headers":{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=300"}});
}

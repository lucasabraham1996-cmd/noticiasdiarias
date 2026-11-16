import {NextResponse} from "next/server";
import Parser from "rss-parser";
import type {Article,Category} from "@/lib/types";
export const revalidate=300;

type Feed={source:string;url:string;category:Category;scope:"local"|"national";lcf?:boolean};
const feeds:Feed[]=[
 {source:"Cba24n",url:"https://www.cba24n.com.ar/rss",category:"Córdoba",scope:"local"},
 {source:"Hoy Día Córdoba",url:"https://hoydia.com.ar/feed/",category:"Córdoba",scope:"local"},
 {source:"Fútbol de Córdoba",url:"https://futboldecordoba.com.ar/feed/",category:"Deportes",scope:"local",lcf:true},
 {source:"Fútbol de Córdoba",url:"https://futboldecordoba.com.ar/category/primera-a/feed/",category:"Deportes",scope:"local",lcf:true},
 {source:"Fútbol de Córdoba",url:"https://futboldecordoba.com.ar/category/primera-b/feed/",category:"Deportes",scope:"local",lcf:true},
 {source:"Fútbol de Córdoba",url:"https://futboldecordoba.com.ar/category/femenino/feed/",category:"Deportes",scope:"local",lcf:true},
 {source:"La Nación",url:"https://www.lanacion.com.ar/arc/outboundfeeds/rss/",category:"Argentina",scope:"national"},
 {source:"Infobae",url:"https://www.infobae.com/arc/outboundfeeds/rss/",category:"Argentina",scope:"national"},
 {source:"Olé",url:"https://www.ole.com.ar/rss/ultimas-noticias/",category:"Deportes",scope:"national"}
];
const parser=new Parser({
 timeout:8500,headers:{"User-Agent":"NoticiasDiarias/1.0 (+https://noticiasdiarias-theta.vercel.app)"},
 customFields:{item:[["media:content","mediaContent"],["media:thumbnail","mediaThumb"],["content:encoded","fullContent"],["source","rssSource"]]}
});
const decode=(s:string)=>s.replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const strip=(s:string)=>decode(s.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi," ").replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();
const excerpt=(raw:string,max:number):string=>{
 const text=strip(raw);
 if(text.length<=max)return text;
 const part=text.slice(0,max+1);
 const end=Math.max(part.lastIndexOf(". "),part.lastIndexOf("! "),part.lastIndexOf("? "));
 return (end>max*.55?part.slice(0,end+1):part.slice(0,max).replace(/\s+\S*$/,""))+"…";
};
const argentinaTopic=/milei|presidente|congreso|diputad|senado|anses|jubilad|inflaci|d[oó]lar|blue|econom[ií]a|mercado|inseguridad|elecci[oó]n|gobierno nacional|argentina|selecci[oó]n|boca|river|afa|copa argentina|talleres|belgrano|instituto|racing|pol[ií]tica nacional|justicia federal|juez federal/i;
const cordobaTopic=/c[oó]rdoba|llaryora|passerini|r[ií]o cuarto|villa mar[ií]a|alta gracia|carlos paz|calamuchita|punilla|barrio|liga cordobesa|futbol de cordoba|talleres|belgrano|instituto|racing de c[oó]rdoba|nueva c[oó]rdoba|unc\b|universidad nacional de c[oó]rdoba/i;
const lcfTopic=/liga cordobesa|primera [ab]\b|ascenso|clausura|all boys|rosedal|reservas?|inferiores?|femenino|fecha \d|torneo|clasificaci[oó]n|campe[oó]n|club|lcf/i;
const strongNational=/milei|caputo|bullrich|villarruel|kicillof|macri|congreso argentino|c[aá]mara de diputados|senado argentino|gobierno argentino|gobierno nacional|inflaci[oó]n argentina|d[oó]lar|anses|jubilad|salari|copa argentina|boca|river|afa|selecci[oó]n argentina|f[uú]tbol argentino|paritarias|elecciones nacionales|banco central|bcra|reforma laboral|justicia federal argentina|talleres|belgrano|instituto/i;
function classify(s:string,fallback:Category,local:boolean):Category{
 if(/liga cordobesa|primera [ab]\b|all boys ros[e]?dal|f[uú]tbol femenino|selecci[oó]n|f[uú]tbol|talleres|belgrano|instituto|boca|river|gol |deport|racing de c[oó]rdoba/i.test(s))return "Deportes";
 if(/detenid|robo|crimen|polic[ií]a|fiscal[ií]a|asesinat|crimen|violencia|allanamiento|justicia penal/i.test(s))return "Policiales";
 if(/inflaci|d[oó]lar|salario|anses|econom[ií]a|empleo|industria|impuestos|pobreza/i.test(s))return "Economía";
 if(/elecci|llaryora|milei|de loredo|bornoroni|congreso|diputad|senado|intenden|passerini|gobernador|legislatura/i.test(s))return "Política";
 if(/cantante|m[uú]sica|televisi[oó]n|famos|concierto|premio|cine|espect[aá]culo/i.test(s))return "Espectáculos";
 if(!local&&/ucrania|rusia|china|trump|europa|brasil|internacional|estados unidos|guerra/i.test(s))return "Mundo";
 return fallback;
}
function imageUrl(item:any):string|null{
 const m=item.mediaContent||item.mediaThumb;
 const node=Array.isArray(m)?m[0]:m;
 const found=(typeof node==="object"?(node?.$?.url||node?.url):node)||item.enclosure?.url||null;
 return typeof found==="string" && /^https:\/\//.test(found)?found:null;
}
function origin(n:any,feed:Feed):{name:string,domain:string}{
 if(!feed.source.startsWith("Google Noticias"))return {name:feed.source,domain:new URL(feed.url).hostname};
 const x=n.rssSource;
 const name=typeof x==="string"?x:typeof x?.[0]==="string"?x[0]:x?.name||"Medio citado";
 const address=x?.$?.url||x?.url||"";
 let domain="news.google.com";try{if(address)domain=new URL(address).hostname;}catch{}
 return {name:String(name).slice(0,70),domain};
}
const norm=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
export async function GET(){
 const response=await Promise.allSettled(feeds.map(async f=>{
  const result=await parser.parseURL(f.url);
  const articles:Article[]=[];
  for(const n of (result.items||[]).slice(0,f.lcf?12:27) as any[]){
   const title=strip(String(n.title||"")).slice(0,260);
   const url=String(n.link||"");
   if(title.length<15||!/^https:\/\//.test(url))continue;
   if(f.source.startsWith("Google Noticias")&&!cordobaTopic.test(title))continue;
   if(f.scope==="national"&&!strongNational.test(title))continue;
   const isLcf=!!f.lcf && (lcfTopic.test(title)||/futboldecordoba.com.ar\/(.*)/.test(url));
   const raw=String(n.contentSnippet||n.summary||n.content||n.fullContent||"");
   const detailed=String(n.content||n.fullContent||raw);
   const lead=excerpt(raw,470);
   const fuller=excerpt(detailed,620);
   const info=origin(n,f);
   articles.push({
    id:String(n.guid||url).slice(0,450),title,summary:lead && norm(lead)!==norm(title)?lead:"",body:fuller && norm(fuller)!==norm(title)?fuller:lead,
    url,source:info.name,sourceDomain:info.domain,category:classify(title+" "+lead,f.category,f.scope==="local"),
    scope:f.scope,isLcf,publishedAt:n.isoDate||n.pubDate||"1970-01-01T00:00:00Z",image:imageUrl(n)
   });
  }
  return articles;
 }));
 const errors:string[]=[];const merged:Article[]=[];
 response.forEach((r,i)=>{if(r.status==="fulfilled")merged.push(...r.value);else errors.push("No respondió "+feeds[i].source)});
 const unique=[...new Map(merged.sort((a,b)=>(a.isLcf?0:1)-(b.isLcf?0:1)).map(x=>[norm(x.title),x])).values()];
 const sort=(a:Article,b:Article)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt);
 const recent=unique.filter(x=>Date.now()-Date.parse(x.publishedAt)<4*86400_000&&Date.parse(x.publishedAt)<Date.now()+86400_000);
 const local=recent.filter(x=>x.scope==="local").sort(sort).slice(0,70);
 const national=recent.filter(x=>x.scope!=="local").sort(sort).slice(0,20);
 const lcfWeight=(a:Article)=>/ascenso|campe[oó]n|final|suspend|primera [ab]|liga cordobesa|torneo|reprogram|clasificaci[oó]n|fecha [0-9]/i.test(a.title)?5:0;
 const lcf=local.filter(x=>x.isLcf).sort((a,b)=>lcfWeight(b)-lcfWeight(a)||Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,12);
 const items=[...local,...national].sort(sort);
 return NextResponse.json({items,localCount:local.length,nationalCount:national.length,lcf:lcf[0]||null,errors,updatedAt:new Date().toISOString()},{
  headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=300"}
 });
}

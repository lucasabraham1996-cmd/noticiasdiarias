import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
const whitelist=["cba24n.com.ar","hoydia.com.ar","futboldecordoba.com.ar","infobae.com","lanacion.com.ar","ole.com.ar"];
const normalize=(s:string)=>s.normalize("NFKC").replace(/[\s\u00a0]+/g," ").trim();
const entities=(s:string)=>s.replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#39;|&apos;/gi,"'").replace(/&#(\d+);/g,(_,x)=>String.fromCharCode(Number(x)));
function text(html:string):string{return normalize(entities(html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ")))}
function oneSentence(s:string,max=220):string{
 const m=s.match(/^.{45,270}?[.!?](?=\s|$)/);
 const v=m?m[0]:s.slice(0,max);
 return v.length<=max?v:v.slice(0,max).replace(/\s+\S*$/,"")+"…";
}
function reliableParagraphs(body:string):string[]{
 const container=body.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||body;
 let ps=[...container.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>text(m[1]));
 ps=ps.filter(s=>s.length>=65&&s.length<=2200&&!/suscrib|seguinos|seguinos en|newsletter|reg[ií]strate|terminos y condiciones|pol[ií]tica de privacidad|iniciar sesi[oó]n|compartir en/i.test(s.slice(0,120)));
 return [...new Set(ps)].slice(0,40);
}

async function viaReader(link:string,title:string):Promise<string[]>{
 const url="https://r.jina.ai/"+link;
 const r=await fetch(url,{next:{revalidate:600},headers:{"Accept":"text/plain","X-Timeout":"14"},signal:AbortSignal.timeout(12500)});
 if(!r.ok)throw Error("Reader no disponible");
 let markdown=(await r.text()).slice(0,70000);
 const section=markdown.indexOf("Markdown Content:");
 if(section>=0)markdown=markdown.slice(section+"Markdown Content:".length);
 const target=title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").slice(0,40);
 const headings=[...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)];
 for(const h of headings){
  const norm=h[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"");
  if(target.length>12&&norm.includes(target.slice(0,Math.min(30,target.length)))){markdown=markdown.slice((h.index||0)+h[0].length);break}
 }
 const end=markdown.search(/^(?:Comentarios\s*\(|Más Leídas|Te puede interesar|ÚLTIMAS NOTICIAS|Notas relacionadas)/im);
 if(end>=0)markdown=markdown.slice(0,end);
 const rows=markdown.split(/\n{1,2}/g).map(x=>x.replace(/!\[[^\]]*\]\([^)]+\)/g," ").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/\\([_*#])/g,"$1").replace(/^[*#>-]+\s*/g,"").replace(/\*\*/g,"").trim())
 .filter(x=>x.length>=74&&x.length<=2400&&!/fotograf[ií]a:|foto:|publicidad|suscribite|suscr[ií]bete|principales noticias|opiniones|pron[oó]stico extendido|final url/i.test(x.slice(0,95))&&!/https?:\/\//i.test(x.slice(0,80)));
 return [...new Set(rows)].slice(0,8);
}
export async function GET(req:NextRequest){
 const raw=req.nextUrl.searchParams.get("url")||"";
 const title=(req.nextUrl.searchParams.get("title")||"").slice(0,230);
 let parsed:URL;try{parsed=new URL(raw)}catch{return NextResponse.json({questions:[],error:"Enlace inválido"},{status:400})}
 const host=parsed.hostname.toLowerCase().replace(/^www\./,"");
 if(parsed.protocol!=="https:"||parsed.port||parsed.username||parsed.password||!whitelist.some(h=>host===h||host.endsWith("."+h)))
 return NextResponse.json({questions:[],error:"Medio no habilitado"},{status:400});
 let ps:string[]=[];
 let fallbackSource="Medio original";
 try{
  const r=await fetch(parsed.toString(),{redirect:"error",next:{revalidate:900},headers:{"User-Agent":"Mozilla/5.0 (compatible; NoticiasDiarias/1.0)","Accept":"text/html"},signal:AbortSignal.timeout(4500)});
  if(r.ok&&(r.headers.get("content-type")||"").includes("text/html")){
   const html=(await r.text()).slice(0,1300000);
   ps=reliableParagraphs(html);
  }
 }catch{}
 if(ps.length<2){
  try{ps=await viaReader(parsed.toString(),title);fallbackSource="Texto del medio procesado por Jina Reader"}catch{}
 }
 if(ps.length<2)return NextResponse.json({questions:[],message:"No se pudo acceder a más información contrastable de esta noticia. Mantenemos el resumen original sin inventar detalles."});
 const chosen=[ps[0],ps[1]];
 const later=ps.slice(2).find(x=>/pr[oó]xim|continuar|espera|investigaci[oó]n|previsto|convoc|confirm|decisi[oó]n|agend|anunci|prepar|seguir|medidas|fecha/i.test(x))||ps[2];
 if(later)chosen.push(later);
 const labels=["¿Qué pasó?","¿Qué detalles se conocen?","¿Cuál es la situación y qué más se informó?"];
 const questions=chosen.map((x,i)=>({question:labels[i],answer:oneSentence(x,230)}));
 return NextResponse.json({questions,source:fallbackSource,updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=900"}});
}

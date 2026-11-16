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
export async function GET(req:NextRequest){
 const raw=req.nextUrl.searchParams.get("url")||"";
 let parsed:URL;try{parsed=new URL(raw)}catch{return NextResponse.json({questions:[],error:"Enlace inválido"},{status:400})}
 const host=parsed.hostname.toLowerCase().replace(/^www\./,"");
 if(parsed.protocol!=="https:"||parsed.port||parsed.username||parsed.password||!whitelist.some(h=>host===h||host.endsWith("."+h)))
 return NextResponse.json({questions:[],error:"Medio no habilitado"},{status:400});
 try{
  const r=await fetch(parsed.toString(),{redirect:"error",next:{revalidate:900},headers:{"User-Agent":"Mozilla/5.0 (compatible; NoticiasDiarias/1.0)","Accept":"text/html"},signal:AbortSignal.timeout(8500)});
  if(!r.ok||!(r.headers.get("content-type")||"").includes("text/html"))throw Error("Fuente no disponible");
  const html=(await r.text()).slice(0,1300000);
  const ps=reliableParagraphs(html);
  if(ps.length<2)return NextResponse.json({questions:[],source:"Medio original",message:"La fuente solo publicó una descripción breve y no fue posible extraer más información comprobable."});
  const chosen=[ps[0],ps[1]];
  // Extra context: choose a separate later paragraph, preferably one about subsequent actions.
  const later=ps.slice(2).find(x=>/pr[oó]xim|continuar|espera|investigaci[oó]n|previsto|convoc|confirm|decisi[oó]n|agend|anunci|prepar|seguir|medidas|fecha/i.test(x))||ps[2];
  if(later)chosen.push(later);
  const labels=["¿Qué pasó?","¿Qué detalles se conocen?","¿Cuál es la situación y qué más se informó?"];
  const questions=chosen.map((s,i)=>({question:labels[i],answer:oneSentence(s,240)}));
  return NextResponse.json({questions,source:"Medio original",updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=900"}});
 }catch{return NextResponse.json({questions:[],message:"Este medio no permite obtener más detalles verificables en este momento."},{headers:{"Cache-Control":"public, s-maxage=120"}})}
}

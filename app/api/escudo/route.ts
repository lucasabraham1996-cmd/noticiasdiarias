import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const raw=req.nextUrl.searchParams.get("src");
 if(!raw)return new NextResponse(null,{status:400});
 let src:URL;try{src=new URL(raw)}catch{return new NextResponse(null,{status:400})}
 const espn=src.hostname==="a.espncdn.com"&&/^\/i\/teamlogos\/soccer\/(500|200|100)\/\d+\.(png|webp)$/i.test(src.pathname);const talleres=src.hostname==="www.clubtalleres.com.ar"&&src.pathname==="/wp-content/uploads/2025/03/escudo-2-estrellas-x2-251x300.png";if(src.protocol!=="https:"||!(espn||talleres)||src.search)return new NextResponse(null,{status:403});
 try{
  const r=await fetch(src.toString(),{next:{revalidate:604800},headers:{Accept:"image/png,image/webp"},signal:AbortSignal.timeout(6000)});
  if(!r.ok||!r.body||!/image\/(png|webp)/i.test(r.headers.get("content-type")||""))return new NextResponse(null,{status:404});
  return new NextResponse(r.body,{headers:{"Content-Type":r.headers.get("content-type")||"image/png","Cache-Control":"public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400","X-Content-Type-Options":"nosniff"}});
 }catch{return new NextResponse(null,{status:502})}
}

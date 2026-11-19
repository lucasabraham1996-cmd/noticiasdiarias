import {NextRequest,NextResponse} from "next/server";
import bundled from "@/content/editions.json";
export const dynamic="force-dynamic";
export async function GET(req:NextRequest){
 const fresh=req.nextUrl.searchParams.has("refresh");
 const repo=process.env.EDITORIAL_GITHUB_REPO||"lucasabraham1996-cmd/noticiasdiarias";
 if(/^[\w.-]+\/[\w.-]+$/.test(repo)){
  try{const r=await fetch("https://raw.githubusercontent.com/"+repo+"/main/content/editions.json",fresh?{cache:"no-store"}:{next:{revalidate:60}});if(r.ok){const j=await r.json();if(Array.isArray(j.editions))return NextResponse.json(j,{headers:{"Cache-Control":fresh?"no-store":"public, s-maxage=60"}})}}catch{}
 }
 return NextResponse.json(bundled);
}

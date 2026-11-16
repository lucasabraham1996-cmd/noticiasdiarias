import {NextResponse} from "next/server";
import bundled from "@/content/editions.json";
export const revalidate=60;
export async function GET(){
 const repo=process.env.EDITORIAL_GITHUB_REPO||"lucasabraham1996-cmd/noticiasdiarias";
 if(/^[\w.-]+\/[\w.-]+$/.test(repo)){
  try{const r=await fetch("https://raw.githubusercontent.com/"+repo+"/main/content/editions.json",{next:{revalidate:60}});if(r.ok){const j=await r.json();if(Array.isArray(j.editions))return NextResponse.json(j)}}catch{}
 }
 return NextResponse.json(bundled);
}

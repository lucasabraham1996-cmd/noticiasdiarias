import {NextResponse} from "next/server";
import type {WeatherDay,WeatherHour,WeatherData} from "@/lib/types";
export const revalidate=600;
const hail=(code:number):"possible"|"not-quantified"=>code===96||code===99?"possible":"not-quantified";
export async function GET(){
 try{
 const p=new URLSearchParams({latitude:"-31.4201",longitude:"-64.1888",timezone:"America/Argentina/Cordoba",forecast_days:"7",current:"temperature_2m,wind_speed_10m,weather_code",hourly:"temperature_2m,precipitation_probability,precipitation,weather_code",daily:"temperature_2m_min,temperature_2m_max,precipitation_probability_max,precipitation_sum,weather_code"});
 const r=await fetch("https://api.open-meteo.com/v1/forecast?"+p,{next:{revalidate:600}});if(!r.ok)throw new Error("Open-Meteo respondió "+r.status);
 const d=await r.json();
 const days:WeatherDay[]=d.daily.time.map((date:string,i:number)=>({date,min:d.daily.temperature_2m_min[i],max:d.daily.temperature_2m_max[i],rainChance:d.daily.precipitation_probability_max?.[i]??null,rainMm:d.daily.precipitation_sum?.[i]??null,code:d.daily.weather_code?.[i]??0,hail:hail(d.daily.weather_code?.[i]??0)}));
 const hours:WeatherHour[]=d.hourly.time.map((time:string,i:number)=>({time,temp:d.hourly.temperature_2m[i],rainChance:d.hourly.precipitation_probability?.[i]??null,rainMm:d.hourly.precipitation?.[i]??null,code:d.hourly.weather_code?.[i]??0,hail:hail(d.hourly.weather_code?.[i]??0)}));
 const result:WeatherData={current:{temp:d.current.temperature_2m,time:d.current.time,wind:d.current.wind_speed_10m??null,code:d.current.weather_code??0},days,hours,updatedAt:new Date().toISOString(),source:"Open-Meteo · Córdoba Capital"};
 return NextResponse.json(result,{"headers":{"Cache-Control":"public, s-maxage=600, stale-while-revalidate=600"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Pronóstico no disponible"},{status:503})}
}

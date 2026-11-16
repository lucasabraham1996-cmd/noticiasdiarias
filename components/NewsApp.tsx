"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {Activity,ArrowRight,ArrowUpRight,CalendarDays,ChevronRight,Cloud,CloudLightning,CloudRain,CloudSun,Compass,ExternalLink,Globe,Info,Landmark,MapPin,Menu,Newspaper,RefreshCw,Search,ShieldAlert,Sun,Trophy,WifiOff,X} from "lucide-react";
import {LEAGUES} from "@/lib/leagues";
import type {Article,Category,Edition,Game,SportsData,WeatherData,WeatherHour} from "@/lib/types";
const tabs=["Portada","Córdoba","Argentina","Política","Policiales","Economía","Deportes","Mundo","Espectáculos","El tiempo"] as const;
type Tab=typeof tabs[number];
const tz="America/Argentina/Cordoba";
function localDate(date=new Date()){const parts=new Intl.DateTimeFormat("es-AR",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);const p=(s:string)=>parts.find(x=>x.type===s)?.value||"";return p("year")+"-"+p("month")+"-"+p("day")}
function shiftDay(n:number){const d=new Date(localDate()+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dateText(s:string){try{return new Intl.DateTimeFormat("es-AR",{timeZone:tz,day:"numeric",month:"short"}).format(new Date(s))}catch{return s}}
function timeText(s:string){try{if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s))return s.slice(11);return new Intl.DateTimeFormat("es-AR",{timeZone:tz,hour:"2-digit",minute:"2-digit"}).format(new Date(s))}catch{return "—"}}
function dateLong(){return new Intl.DateTimeFormat("es-AR",{timeZone:tz,weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date())}
function iconWeather(code:number){if([95,96,99].includes(code))return <CloudLightning/>;if(code>=51&&code<=82)return <CloudRain/>;if(code===0||code===1)return <Sun/>;if(code===2)return <CloudSun/>;return <Cloud/>}
function condition(code:number){if([95,96,99].includes(code))return "Tormentas";if(code>=51&&code<=82)return "Lluvias";if(code<2)return "Despejado";if(code===2)return "Parcialmente nublado";return "Nublado"}
function safe(s?:string|null){return typeof s==="string"&&/^https:\/\//.test(s)?s:null}

function SourceBrand({item}:{item:Article}){
 const domain=/^[a-z0-9.-]+$/i.test(item.sourceDomain||"")?item.sourceDomain||"":"";
 const icon=domain?"https://www.google.com/s2/favicons?domain="+encodeURIComponent(domain)+"&sz=64":null;
 const [failed,setFailed]=useState(false);
 return <span className="source-brand">{icon&&!failed?<img src={icon} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<span className="source-initial">{item.source.slice(0,1).toUpperCase()}</span>}<b>{item.source}</b></span>;
}
function NewsCard({item,onRead}:{item:Article;onRead:(item:Article)=>void}){
 const [img,setImg]=useState(Boolean(safe(item.image)));
 return <article className={"article"+(!img?" article-no-photo":"")}>
  {img&&safe(item.image)?<button type="button" className="article-image" onClick={()=>onRead(item)} aria-label={"Leer noticia: "+item.title}><img src={item.image!} alt="" loading="lazy" onError={()=>setImg(false)}/></button>:null}
  <div className="article-copy">
   <div className="article-meta"><b>{item.isLcf?"LIGA CORDOBESA":item.category}</b><span>{dateText(item.publishedAt)}</span></div>
   <button type="button" className="article-title" onClick={()=>onRead(item)}>{item.title}</button>
   <p>{item.summary||"Abrí esta tarjeta para leer la información disponible y su fuente."}</p>
   <div className="article-source"><SourceBrand item={item}/><button type="button" className="read-inline" onClick={()=>onRead(item)}>LEER <ArrowRight size={16}/></button></div>
  </div>
 </article>;
}
function ArticleReader({item,onClose}:{item:Article;onClose:()=>void}){
 const [facts,setFacts]=useState<{question:string;answer:string}[]>([]);
 const [detailsLoading,setDetailsLoading]=useState(true);
 const [detailNote,setDetailNote]=useState("");
 useEffect(()=>{
  let alive=true;setFacts([]);setDetailsLoading(true);setDetailNote("");
  fetch("/api/news/detail?url="+encodeURIComponent(item.url),{cache:"no-store"}).then(r=>r.json()).then(j=>{
   if(!alive)return;setFacts(Array.isArray(j.questions)?j.questions:[]);setDetailNote(j.message||"");
  }).catch(()=>{if(alive)setDetailNote("No hay más detalles confirmados disponibles desde esta fuente.")}).finally(()=>{if(alive)setDetailsLoading(false)});
  return ()=>{alive=false};
 },[item.url]);
 useEffect(()=>{
  const previous=document.body.style.overflow;
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};
  document.body.style.overflow="hidden";
  window.addEventListener("keydown",onKey);
  return ()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",onKey)};
 },[onClose]);
 const raw=(item.body&&item.body.length>(item.summary||"").length?item.body:item.summary||item.body||"").trim();
 const sentences=raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(x=>x.trim()).filter(Boolean)||[];
 const paragraphs:string[]=[];
 for(const sentence of sentences){
  const last=paragraphs.length-1;
  if(last>=0&&paragraphs[last].length+sentence.length<260)paragraphs[last]+=" "+sentence;
  else paragraphs.push(sentence);
 }
 return <div className="reader-overlay" role="presentation" onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}}>
  <section className="reader-dialog" role="dialog" aria-modal="true" aria-label={item.title}>
   <div className="reader-bar"><span>NOTICIAS DIARIAS · LECTURA</span><button type="button" onClick={onClose} aria-label="Cerrar noticia"><X size={23}/></button></div>
   {safe(item.image)&&<img className="reader-photo" src={item.image!} alt="" onError={e=>e.currentTarget.style.display="none"}/>}
   <div className="reader-body">
    <div className="reader-cats"><span>{item.isLcf?"LIGA CORDOBESA":item.category}</span><time>{dateText(item.publishedAt)}</time></div>
    <h1>{item.title}</h1>
    <div className="reader-by"><SourceBrand item={item}/><span>Información del medio citado</span></div>
    <div className="reader-article">
     {paragraphs.length?paragraphs.map((p,i)=><p key={i}>{p}</p>):<p>La fuente no proporcionó un resumen verificable adicional al titular.</p>}
    </div>
    <section className="reader-facts"><h2>Lo que necesitás saber</h2>
    {detailsLoading?<div className="reader-loading"><RefreshCw className="spin" size={17}/> Buscando detalles verificados del medio...</div>:
    facts.length?facts.map((f,i)=><div className="reader-qa" key={i}><h3>{f.question}</h3><p>{f.answer}</p></div>):
    <p className="reader-no-detail">{detailNote||"La fuente no aporta más información comprobable que el resumen mostrado."}</p>}
    </section>
    <div className="reader-disclosure">Resumen y preguntas elaboradas únicamente con información disponible en la fuente indicada. No se completan datos que el medio no haya publicado.</div>
    <div className="reader-actions"><button type="button" onClick={onClose}>Volver a noticias</button><a href={item.url} target="_blank" rel="noopener noreferrer">Fuente original <ArrowUpRight size={17}/></a></div>
   </div>
  </section>
 </div>;
}
function Crest({url,name,compact=false}:{url:string|null;name:string;compact?:boolean}){
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>setAttempt(0),[url]);
 const talleres=/^talleres(?: \(c[oó]rdoba\)| cba)?$/i.test(name.trim())||/talleres de c[oó]rdoba/i.test(name);
 const official=talleres?"https://www.clubtalleres.com.ar/wp-content/uploads/2025/03/escudo-2-estrellas-x2-251x300.png":url;
 const valid=safe(official);
 const proxy=valid&&["a.espncdn.com","www.clubtalleres.com.ar"].includes(new URL(valid).hostname)?"/api/escudo?src="+encodeURIComponent(valid):valid;
 const shown=attempt===0?proxy:attempt===1?valid:null;
 const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
 return <span className={"crest-wrap"+(compact?" crest-small":"")} title={"Escudo de "+name}>
  {shown?<img src={shown} alt={"Escudo "+name} referrerPolicy="no-referrer" onError={()=>setAttempt(v=>v+1)} loading="lazy"/>:<span className="crest-monogram" title="Escudo oficial no disponible">{initials||"—"}</span>}
 </span>;
}
function WeatherCard({data,compact=false}:{data:WeatherData|null;compact?:boolean}){if(!data)return <section className="weather-panel"><CloudSun size={34}/><h3>El tiempo en Córdoba</h3><p>Consultando el pronóstico meteorológico...</p></section>;
 const day=data.days[0];const bands=[{name:"Mañana",start:6,end:12},{name:"Tarde",start:12,end:19},{name:"Noche",start:19,end:24}];
 return <section className="weather-panel"><div className="weather-tag"><span className="live-dot"/> CÓRDOBA CAPITAL <span>· {timeText(data.current.time)}</span></div>
 <div className="weather-now"><div><div className="temp-number">{Math.round(data.current.temp)}<span>°</span></div><strong>{condition(data.current.code)}</strong><small>Mín. {Math.round(day.min)}° · Máx. {Math.round(day.max)}°</small></div><div className="weather-illustration">{iconWeather(data.current.code)}</div></div>
 <div className="risk-grid"><div><CloudRain size={20}/><small>Probabilidad de lluvia</small><strong>{day.rainChance==null?"Sin dato":day.rainChance+"%"}</strong></div><div><ShieldAlert size={20}/><small>Riesgo de granizo</small><strong>{day.hail==="possible"?"Posible":"Sin % específico"}</strong></div></div>
 <div className="weather-note">Probabilidad de lluvia y granizo son indicadores distintos. <a href="https://www.smn.gob.ar/alertas" target="_blank" rel="noreferrer">Ver alertas oficiales del SMN ↗</a></div>
 {!compact&&<><div className="band-grid">{bands.map(b=>{const hrs=data.hours.filter(h=>h.time.startsWith(day.date)&&+h.time.slice(11,13)>=b.start&&+h.time.slice(11,13)<b.end);const temp=hrs.length?Math.round(hrs.reduce((s,h)=>s+h.temp,0)/hrs.length):null;const rain=hrs.length?Math.max(...hrs.map(x=>x.rainChance??0)):null;return <div className="band" key={b.name}>{iconWeather(hrs[Math.floor(hrs.length/2)]?.code??day.code)}<b>{b.name}</b><strong>{temp==null?"—":temp+"°"}</strong><small>{rain==null?"Sin dato":rain+"% lluvia"}</small></div>})}</div><div className="subhead">PRÓXIMOS SIETE DÍAS</div><div className="week-grid">{data.days.map(d=><div className="forecast-day" key={d.date}><small>{new Intl.DateTimeFormat("es-AR",{weekday:"short",timeZone:"UTC"}).format(new Date(d.date+"T12:00:00Z"))}</small>{iconWeather(d.code)}<b>{Math.round(d.max)}° <span>{Math.round(d.min)}°</span></b><small>{d.rainChance??"—"}% lluvia</small></div>)}</div></>}
 </section>}
const displayTeam=(s:string)=>{
 const names:Record<string,string>={"Germany":"Alemania","Netherlands":"Países Bajos","Switzerland":"Suiza","Scotland":"Escocia","Spain":"España","England":"Inglaterra","France":"Francia","Belgium":"Bélgica","Italy":"Italia","Brazil":"Brasil","Croatia":"Croacia","Japan":"Japón","Norway":"Noruega","Morocco":"Marruecos","United States":"Estados Unidos","Mexico":"México","Türkiye":"Turquía","Czechia":"Chequia","Denmark":"Dinamarca","Portugal":"Portugal","Uruguay":"Uruguay"};
 return names[s]||s;
};

function BroadcastInfo({game,compact=false}:{game:Game;compact?:boolean}){
 const casts=game.broadcasts||[];
 return <div className={"broadcast-info"+(compact?" broadcast-compact":"")}>
  {casts.length?<><span className="broadcast-label">DÓNDE VER · ARGENTINA</span>{casts.map(ch=><a className="broadcast-channel" key={ch.name} href={ch.url} target="_blank" rel="noopener noreferrer" title={"Ver información de "+ch.name}><img src={ch.logo} alt="" loading="lazy" onError={e=>e.currentTarget.style.display="none"}/><b>{ch.name}</b><ArrowUpRight size={12}/></a>)}</>:
  <span className="broadcast-unconfirmed">TV / streaming: por confirmar en Argentina</span>}
 </div>;
}
function ClockInfo({m}:{m:Game}){
 const live=["1H","2H","HT","ET","BT","P","LIVE","INT"].includes(m.status);
 if(!live)return <>{["FT","AET","PEN"].includes(m.status)?"FINAL":m.status==="NS"?timeText(m.date):m.status}</>;
 const clock=(m.clock||"").trim();
 // Never synthesize a timer. If provider doesn't send seconds, report verified minute only.
 const display=/^\d{1,3}:\d{2}$/.test(clock)?clock:/^\d{1,3}'(?:\+\d+')?$/.test(clock)?clock:m.elapsed!=null?m.elapsed+"'":null;
 return <>{display?display+" · ":""}EN VIVO</>;
}
function Score({m}:{m:Game}){const live=["1H","2H","HT","ET","BT","P","LIVE","INT"].includes(m.status);const done=["FT","AET","PEN"].includes(m.status);return <article className="match">
 <div className="match-top"><span>{m.round||m.league}</span><span className={live?"live-label":""}><ClockInfo m={m}/></span></div>
 <div className="match-center"><div className="team"><Crest url={m.homeLogo} name={m.home}/><strong>{displayTeam(m.home)}</strong></div><div className="score"><strong>{m.homeScore==null?"VS":m.homeScore+" – "+(m.awayScore??"–")}</strong><small>{live?"En juego":done?"Finalizado":timeText(m.date)}</small></div><div className="team"><Crest url={m.awayLogo} name={m.away}/><strong>{displayTeam(m.away)}</strong></div></div>
 {(m.venue||m.referee)&&<div className="match-foot">{m.venue}{m.referee?" · Árbitro: "+m.referee:""}</div>}
 <BroadcastInfo game={m}/>
 </article>}
type BracketData={connected:boolean;league?:string;rounds:{name:string;matches:Game[]}[];source:string;sourceName:string;message?:string};
function PlayoffPanel({data,league}:{data:BracketData|null;league:string}){
 if(!data)return <div className="empty"><RefreshCw className="spin"/> Consultando cruces oficiales...</div>;
 if(!data.connected)return <div className="empty">{data.message||"No pudimos recuperar los cruces."}</div>;
 return <div className="playoff-root">
  <div className="playoff-heading"><div><span>FASE ELIMINATORIA · {league==="arg"?"TORNEO CLAUSURA 2026":"TORNEO REDUCIDO 2026"}</span><h2>Camino a la final</h2></div><a href={data.source} target="_blank" rel="noopener noreferrer">Fuente: {data.sourceName} <ArrowUpRight size={15}/></a></div>
  <p className="playoff-intro">{data.message}</p>
  <div className="playoff-stages">{data.rounds?.map(round=><section className="playoff-stage" key={round.name}><div className="playoff-round-title"><Trophy size={17}/><h3>{round.name}</h3><span>{round.matches.length?round.matches.length+" cruces":"Pendiente"}</span></div>{round.matches.length?<div className="playoff-games">{round.matches.map(match=><div className="playoff-game" key={match.id}><div className="playoff-game-top"><span>{new Intl.DateTimeFormat("es-AR",{timeZone:tz,day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}).format(new Date(match.date))}</span><span>{match.status==="FT"?"FINAL":["LIVE","1H","2H","HT"].includes(match.status)?"EN VIVO":"PROGRAMADO"}</span></div><div className="playoff-clubs"><div><Crest url={match.homeLogo} name={match.home} compact/><span>{displayTeam(match.home)}</span><b>{match.homeScore??"–"}</b></div><div><Crest url={match.awayLogo} name={match.away} compact/><span>{displayTeam(match.away)}</span><b>{match.awayScore??"–"}</b></div></div></div>)}</div>:<div className="playoff-pending">Cruces a definir según los resultados de la fase anterior.</div>}</section>)}</div>
 </div>;
}


function qualifier(league:string,team:{rank:number;group?:string},total:number):{name:string;type:string}|null{
 if(league==="arg"&&team.rank<=8)return {name:"Clasifica a octavos",type:"qualified"};
 if(league==="nacional"&&team.rank===1)return {name:"Líder de zona",type:"leader"};
 if(league==="proyeccion"&&team.rank<=4)return {name:"Clasifica a cuartos",type:"qualified"};
 if(league==="arg-fem"&&team.rank===1)return {name:"Líder",type:"leader"};
 if(["premier","laliga","seriea","bundesliga"].includes(league)&&team.rank<=4)return {name:"Clasificación europea",type:"qualified"};
 if(["premier","laliga","seriea"].includes(league)&&total>=18&&team.rank>total-3)return {name:"Zona de descenso",type:"danger"};
 return null;
}
function Sports({lcf,femaleLocal,onRead}:{lcf:Article|null;femaleLocal:Article|null;onRead:(item:Article)=>void}){const [gender,setGender]=useState<"Masculino"|"Femenino">("Masculino"),[league,setLeague]=useState("todos"),[mode,setMode]=useState<"matches"|"standings"|"playoffs">("matches"),[offset,setOffset]=useState(0);
 const [result,setResult]=useState<SportsData|null>(null),[bracket,setBracket]=useState<BracketData|null>(null),[busy,setBusy]=useState(false);
 const leagues=LEAGUES.filter(l=>l.code==="todos"||(gender==="Femenino"?l.group==="Femenino":l.group!=="Femenino"));
 const load=useCallback(async()=>{setBusy(true);try{
 if(mode==="playoffs"){const r=await fetch("/api/playoffs?league="+encodeURIComponent(league),{cache:"no-store"});const j=await r.json();setBracket(j);return}
 const q=new URLSearchParams({league,date:shiftDay(offset),mode,gender});
 const r=await fetch("/api/football?"+q,{cache:"no-store"});const j=await r.json();setResult(j)
 }catch{if(mode==="playoffs")setBracket({connected:false,rounds:[],message:"No fue posible consultar los playoffs.",source:"",sourceName:""});else setResult({connected:false,updatedAt:new Date().toISOString(),error:"No fue posible consultar resultados en este momento."})}finally{setBusy(false)}},[league,offset,mode,gender]);
 useEffect(()=>{void load();const t=setInterval(()=>void load(),20000);return()=>clearInterval(t)},[load]);
 return <section><div className="section-head"><span className="eyebrow"><Activity size={16}/> CENTRO DEPORTIVO</span><h1>Todos los partidos. <em>Un solo lugar.</em></h1><p>Argentina, Europa y fútbol femenino, con estadísticas y fuentes deportivas conectadas.</p></div>
 <div className="gender-switch"><button className={gender==="Masculino"?"chosen":""} onClick={()=>{setGender("Masculino");setLeague("todos");setMode("matches")}}>Masculino</button><button className={gender==="Femenino"?"chosen":""} onClick={()=>{setGender("Femenino");setLeague("todos");setMode("matches")}}>Femenino</button></div>
 <div className="league-menu">{leagues.map(l=><button key={l.code} className={l.code===league?"selected":""} onClick={()=>{setLeague(l.code);if(l.code==="selecciones"||l.code==="todos"||mode==="playoffs"&&l.code!=="arg"&&l.code!=="nacional")setMode("matches")}}>{l.name}</button>)}</div>
 {league==="selecciones"&&<div className="ranking-note"><Globe size={19}/> Solo partidos donde participa al menos una selección del top 20 FIFA masculino, según el ranking oficial del 7 de octubre de 2026. <a href="https://inside.fifa.com/fifa-rankings/world-ranking/men" target="_blank" rel="noopener noreferrer">Ranking oficial ↗</a></div>}
 <div className="sports-toolbar"><div className="mode-buttons"><button className={mode==="matches"?"chosen":""} onClick={()=>setMode("matches")}>Partidos</button><button className={mode==="standings"?"chosen":""} disabled={league==="selecciones"||league==="todos"||league==="trofeo"||league==="supercopa-int"} onClick={()=>setMode("standings")}>Estadísticas</button>{gender==="Masculino"&&(league==="arg"||league==="nacional")&&<button className={mode==="playoffs"?"chosen":""} onClick={()=>setMode("playoffs")}>Playoffs</button>}</div><button className="refresh" onClick={()=>void load()}><RefreshCw size={16} className={busy?"spin":""}/> Actualizar</button></div>
 {mode==="matches"&&<div className="date-strip">{[-2,-1,0,1,2,3,4].map(n=><button key={n} className={n===offset?"selected":""} onClick={()=>setOffset(n)}><small>{n===0?"HOY":new Intl.DateTimeFormat("es-AR",{weekday:"short",timeZone:"UTC"}).format(new Date(shiftDay(n)+"T12:00:00Z"))}</small><b>{shiftDay(n).slice(8)}</b></button>)}</div>}
 {mode!=="playoffs"&&!result&&<div className="empty"><RefreshCw className="spin"/> Buscando partidos reales...</div>}
 {mode!=="playoffs"&&result&&!result.connected&&<div className="empty"><WifiOff size={34}/><h3>Datos de la competición no disponibles</h3><p>{result.error}</p><small>La app nunca completa la grilla con resultados ficticios.</small></div>}
 {result?.connected&&mode==="matches"&&<><div className="content-caption">{result.matches?.length||0} partidos · {shiftDay(offset)} · {result.league}</div>{result.message&&<p className="fixture-note">{result.message}</p>}<div className="match-grid">{result.matches?.length?result.matches.map(m=><Score key={m.id+"-"+m.league} m={m}/>):<div className="empty">No hay partidos confirmados en esta competición para esa fecha.{result.sourceUrl&&<a target="_blank" rel="noopener noreferrer" href={result.sourceUrl}>Consultar calendario oficial ↗</a>}</div>}</div></>}
 {mode==="playoffs"&&<PlayoffPanel data={bracket} league={league}/>}
 {result?.connected&&mode==="standings"&&<><div className="table-panel"><h3>Tabla de posiciones · {result.league}</h3><div className="qualification-legend"><span className="legend-qualified">Clasificación / copas</span><span className="legend-leader">Líder de tabla</span><span className="legend-danger">Zona de descenso (donde corresponde)</span></div>{result.standings?.length?<><div className="table-scroll"><table><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>DG</th><th>Pts</th></tr></thead><tbody>{result.standings.map((s,i)=><tr key={s.team+i} className={qualifier(league,s,result.standings?.length||0)?.type||""}><td><span className="table-position">{s.rank}</span></td><td className="standing-team"><Crest url={s.logo} name={s.team} compact/>{s.team}{s.group&&<small>{s.group}</small>}</td><td>{s.played}</td><td>{s.won}</td><td>{s.drawn}</td><td>{s.lost}</td><td>{s.gd}</td><td><strong>{s.points}</strong></td></tr>)}</tbody></table></div><div className="standings-mobile">{result.standings.map((s,i)=><div className={"standing-mobile-card "+(qualifier(league,s,result.standings?.length||0)?.type||"")} key={s.team+i}><div className="mobile-standing-top"><span className="mobile-standing-rank">{s.rank}</span><Crest url={s.logo} name={s.team} compact/><div className="mobile-standing-name"><strong>{s.team}</strong>{s.group&&<small>{s.group.replace("Group","Zona")}</small>}{qualifier(league,s,result.standings?.length||0)&&<small className="qualifier-inline">{qualifier(league,s,result.standings?.length||0)?.name}</small>}</div><span className="mobile-standing-points"><strong>{s.points}</strong><small>PTS</small></span></div><div className="mobile-standing-stats">{[{label:"PJ",value:s.played},{label:"G",value:s.won},{label:"E",value:s.drawn},{label:"P",value:s.lost},{label:"DG",value:s.gd}].map(stat=><span key={stat.label}><small>{stat.label}</small><b>{stat.value}</b></span>)}</div></div>)}</div></>:<div className="empty">El proveedor no publica una tabla para esta competición.</div>}{result.error&&<p className="table-warning">{result.error}</p>}</div>
 <div className="leaders-grid">{[{name:"Goleadores",list:result.scorers},{name:"Asistencias",list:result.assisters}].map(box=><div className="table-panel" key={box.name}><h3>{box.name} · Top 3</h3>{box.list?.length?box.list.map((p,i)=><div className="leader" key={i}><strong>{i+1}</strong><span><b>{p.name}</b><small>{p.team}</small></span><b>{p.value??"—"}</b></div>):<p>Sin datos disponibles para este ranking.</p>}</div>)}</div></>}
 <div className="lcf-feature"><div className="lcf-header"><span>{gender==="Femenino"?"FÚTBOL FEMENINO CORDOBÉS · ACTUALIDAD":"LIGA CORDOBESA DE FÚTBOL · ACTUALIDAD"}</span><p>Primera A, Primera B y fútbol femenino. Noticias locales verificadas, sin tablas simuladas.</p></div>{(gender==="Femenino"?femaleLocal||lcf:lcf)?<NewsCard item={(gender==="Femenino"?femaleLocal||lcf:lcf)!} onRead={onRead}/>:<p className="lcf-empty">No encontramos una publicación local reciente que podamos verificar.</p>}</div>
 <div className="source-line"><Info size={16}/> Resultados y escudos de ESPN para las competiciones cubiertas; Primera A femenina, de Calcio24 con calendario contrastado con AFA. Son fuentes públicas sin garantía de continuidad. La pantalla consulta cada 60 segundos y no inventa minutos ni marcadores.</div></section>}
function WeatherPage({data}:{data:WeatherData|null}){return <section><div className="section-head"><span className="eyebrow"><CloudSun size={16}/> METEOROLOGÍA</span><h1>El tiempo, <em>con detalle.</em></h1><p>Córdoba Capital · Temperatura, probabilidad de lluvia, granizo y pronóstico extendido.</p></div><WeatherCard data={data}/>{data&&<section className="hourly-panel"><h2>Próximas horas</h2><div className="hourly-list">{data.hours.filter(h=>h.time>=localDate()).slice(0,36).map((h:WeatherHour)=><div key={h.time} className="hour-row"><span>{h.time.slice(5,10)} · {h.time.slice(11,16)}</span>{iconWeather(h.code)}<b>{Math.round(h.temp)}°</b><span>{h.rainChance??"—"}% lluvia</span><span>{h.rainMm??"—"} mm</span></div>)}</div></section>}</section>}


const LIVE_STATES=["1H","2H","HT","ET","BT","P","LIVE","INT"];
function HomeLivePanel({games,updatedAt,onSports}:{games:Game[];updatedAt:string|null;onSports:()=>void}){
 const live=games.filter(m=>LIVE_STATES.includes(m.status));
 const future=games.filter(m=>m.status==="NS"&&Date.parse(m.date)>=Date.now()-15*60000).sort((a,b)=>a.date.localeCompare(b.date));
 const finished=games.filter(m=>["FT","AET","PEN"].includes(m.status)).sort((a,b)=>b.date.localeCompare(a.date));
 const chosen=(live.length?live:future.length?future:finished).slice(0,4);
 return <section className="home-live"><div className="home-live-header"><div><span className="live-dot"/><strong>{live.length?"PARTIDOS EN VIVO":future.length?"PRÓXIMOS PARTIDOS":"RESULTADOS DE HOY"}</strong></div><button onClick={onSports}>Todos los partidos <ArrowRight size={16}/></button></div>
 {chosen.length?<div className="home-live-list">{chosen.map(m=><div className="home-live-match" key={m.id+"-"+m.league}><div className="home-live-league">{m.league}</div><div className="home-live-teams"><div><Crest url={m.homeLogo} name={m.home} compact/><span>{displayTeam(m.home)}</span></div><b>{m.homeScore==null||m.awayScore==null?"vs":m.homeScore+" - "+m.awayScore}</b><div><Crest url={m.awayLogo} name={m.away} compact/><span>{displayTeam(m.away)}</span></div></div><small>{LIVE_STATES.includes(m.status)?<ClockInfo m={m}/>:m.status==="FT"?"FINAL":timeText(m.date)}</small></div>)}</div>:<div className="home-no-live"><Activity size={26}/><b>Sin partidos confirmados en vivo en este momento.</b><small>Consultá el calendario completo en Deportes.</small></div>}
 <div className="home-live-footer"><span>Datos sujetos a la actualización de cada fuente</span><button onClick={onSports}>Ir a Deportes <ChevronRight size={16}/></button></div>
 </section>;
}

function Home({items,weather,edition,to,onRead,lcfStory,homeGames,scoresUpdated}:{items:Article[];weather:WeatherData|null;edition:Edition|null;to:(t:Tab)=>void;onRead:(item:Article)=>void;lcfStory:Article|null;homeGames:Game[];scoresUpdated:string|null}){
 const list=useMemo(()=>{
  const ed:Article[]=edition?edition.stories.map((s,i)=>({id:edition.id+i,title:s.title,summary:s.body,body:s.body,url:s.url,source:s.source,category:s.category,publishedAt:edition.publishedAt,image:s.image,scope:"local"})):[];
  return [...ed,...items];
 },[items,edition]);
 const locals=list.filter(n=>n.scope==="local");
 const nationals=list.filter(n=>n.scope!=="local");
 const lcf=lcfStory||locals.find(n=>n.isLcf);
 const headline=locals.find(n=>safe(n.image))||locals[0]||list[0];
 const localFirst=locals.filter(n=>n.id!==headline?.id);
 const pinned=lcf&&lcf.id!==headline?.id?[lcf]:[];
 const rest=[...pinned,...localFirst.filter(n=>n.id!==lcf?.id).slice(0,9),...nationals.slice(0,3)].filter((n,i,a)=>a.findIndex(x=>x.id===n.id)===i).slice(0,12);
 return <><div className="home-dashboard"><div className="home-dashboard-weather"><WeatherCard compact data={weather}/><button className="aside-btn" onClick={()=>to("El tiempo")}>Ver pronóstico completo <ArrowRight size={16}/></button></div><HomeLivePanel games={homeGames} updatedAt={scoresUpdated} onSports={()=>to("Deportes")}/></div><div className="home-intro"><span className="eyebrow">EL DIARIO DE CÓRDOBA · NOTICIAS ACTUALIZADAS</span><h1>Lo que pasa.<br/><em>Lo que importa.</em></h1><p>Primero Córdoba. Lo más relevante de Argentina y el mundo, con datos y fuentes identificados.</p></div>
 <div className="home-layout"><div className="home-primary">
 {edition&&<div className="edition-bar"><small>EDICIÓN {edition.edition.toUpperCase()} · {timeText(edition.publishedAt)}</small><b>{edition.title}</b><p>{edition.summary}</p></div>}
 {headline?<button type="button" onClick={()=>onRead(headline)} className={"headline-card"+(!safe(headline.image)?" headline-no-cover":"")}>{safe(headline.image)?<img src={headline.image!} alt="" onError={e=>e.currentTarget.style.display="none"}/>:null}<div className="headline-shadow"/><div className="headline-body"><span>{headline.isLcf?"LIGA CORDOBESA":headline.category.toUpperCase()} · {headline.source}</span><h2>{headline.title}</h2><p>{headline.summary}</p><b>LEER NOTICIA <ArrowUpRight size={17}/></b></div></button>:<div className="empty"><Newspaper size={45}/><h3>Preparando la portada</h3><p>No se recibieron noticias recientes de los medios consultados. No publicamos noticias inventadas.</p></div>}
 <div className="headline-section"><div><small>EN CÓRDOBA · Y LO ESENCIAL DEL PAÍS</small><h2>Actualidad en foco</h2></div><span>{locals.length} noticias locales</span></div>
 <div className="article-grid">{rest.map((n,i)=><NewsCard item={n} onRead={onRead} key={n.id+i}/>)}</div>
 </div><aside className="home-aside"><div className="sports-promo"><Trophy/><h3>El fútbol,<br/>al instante.</h3><p>Primera, Nacional, Europa, femenino y selecciones del top 20 FIFA.</p><button onClick={()=>to("Deportes")}>Ir a deportes <ArrowRight size={18}/></button></div><div className="edition-promo"><CalendarDays size={22}/><h3>Ediciones de mañana y tarde</h3><p>Los resúmenes editoriales aparecen cuando son publicados en el registro de GitHub; la información de los medios se actualiza cada cinco minutos.</p></div></aside></div></>;
}
export default function NewsApp(){
 const [selectedArticle,setSelectedArticle]=useState<Article|null>(null);
 const [homeGames,setHomeGames]=useState<Game[]>([]),[scoresUpdated,setScoresUpdated]=useState<string|null>(null);
 const [tab,setTab]=useState<Tab>("Portada"),[news,setNews]=useState<Article[]>([]),[lcfHeadline,setLcfHeadline]=useState<Article|null>(null),[weather,setWeather]=useState<WeatherData|null>(null),[edition,setEdition]=useState<Edition|null>(null),[menu,setMenu]=useState(false),[search,setSearch]=useState("");
 const getHomeScores=useCallback(async()=>{
  const rs=await Promise.allSettled(["Masculino","Femenino"].map(gender=>fetch("/api/football?"+new URLSearchParams({league:"todos",gender,date:localDate(),mode:"matches"}),{cache:"no-store"}).then(r=>r.json())));
  const all:Game[]=[];for(const x of rs)if(x.status==="fulfilled"&&x.value?.connected&&Array.isArray(x.value.matches))all.push(...x.value.matches);
  setHomeGames([...new Map(all.map(x=>[x.id+"|"+x.league,x])).values()]);setScoresUpdated(new Date().toISOString());
 },[]);
 useEffect(()=>{if(tab!=="Portada")return;void getHomeScores();const refresh=setInterval(()=>void getHomeScores(),60000);return()=>clearInterval(refresh)},[tab,getHomeScores]);
 const getNews=useCallback(async()=>{try{const r=await fetch("/api/news");if(r.ok){const j=await r.json();setNews(j.items||[]);setLcfHeadline(j.lcf||null)}}catch{}},[]);
 const getWeather=useCallback(async()=>{try{const r=await fetch("/api/weather");if(r.ok)setWeather(await r.json())}catch{}},[]);
 const getEd=useCallback(async()=>{try{const r=await fetch("/api/edition");if(r.ok){const j=await r.json();setEdition([...(j.editions||[])].sort((a:Edition,b:Edition)=>b.publishedAt.localeCompare(a.publishedAt))[0]||null)}}catch{}},[]);
 useEffect(()=>{void getNews();void getWeather();void getEd();const n=setInterval(()=>{void getNews();void getEd()},300000),w=setInterval(()=>void getWeather(),600000);return()=>{clearInterval(n);clearInterval(w)}},[getNews,getWeather,getEd]);
 const lcfStory=useMemo(()=>lcfHeadline||news.filter(n=>n.isLcf).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0]||null,[news,lcfHeadline]);
 const femaleLocal=useMemo(()=>news.filter(n=>n.isLcf&&/femenin|jugadora|villa siburu|mujeres|arquera|primera femenina/i.test(n.title)).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0]||null,[news]);
 const articles=useMemo(()=>news.filter(n=>(tab==="Portada"||tab===n.category)&&(!search||(n.title+" "+n.summary).toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")))),[news,tab,search]);
 const navigate=(t:Tab)=>{setTab(t);setMenu(false);setSearch("");window.scrollTo({top:0,behavior:"smooth"})};
 return <div className="shell"><header className="header"><div className="header-inner"><button className="brand" onClick={()=>navigate("Portada")}><span className="brand-sign">N<b>.</b></span><span><strong>NOTICIAS DIARIAS</strong><small>CÓRDOBA · ARGENTINA</small></span></button><div className="today"><span className="live-dot"/>{dateLong()}</div><div className="location"><MapPin size={15}/> Córdoba Capital</div><button className="menu-button" aria-label="Abrir navegación" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div></header>
 <nav className={"top-nav "+(menu?"show":"")}><div>{tabs.map(t=><button className={tab===t?"active":""} key={t} onClick={()=>navigate(t)}>{t}</button>)}</div></nav>
 <main className="main">{tab==="Portada"?<Home items={articles} weather={weather} edition={edition} to={navigate} onRead={setSelectedArticle} lcfStory={lcfStory} homeGames={homeGames} scoresUpdated={scoresUpdated}/>:tab==="Deportes"?<Sports lcf={lcfStory} femaleLocal={femaleLocal} onRead={setSelectedArticle}/>:tab==="El tiempo"?<WeatherPage data={weather}/>:<section><div className="section-head"><span className="eyebrow"><Newspaper size={16}/> NOTICIAS DIARIAS · {tab.toUpperCase()}</span><h1>{tab==="Córdoba"?"Córdoba, en foco.":tab==="Policiales"?"Policiales y justicia.":tab==="Política"?"Política y elecciones.":tab==="Economía"?"Economía real.":tab==="Espectáculos"?"Cultura y tendencias.":tab==="Mundo"?"El mundo hoy.":"La actualidad argentina."}</h1><p>Noticias recientes de medios identificados, organizadas para una lectura ágil.</p></div><div className="searchbar"><span>{articles.length} publicaciones</span><label><Search size={17}/><input placeholder="Buscar noticias" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>{articles.length?<div className="article-grid">{articles.map((n,i)=><NewsCard key={n.id+i} item={n} onRead={setSelectedArticle}/>)}</div>:<div className="empty">No hay publicaciones verificadas recientes en esta sección. Volvé a consultar más tarde.</div>}</section>}</main>
 <footer className="footer"><div><strong>NOTICIAS DIARIAS<span>.</span></strong><p>Información con fuentes · Actualidad, deportes y clima en Córdoba.</p></div><a href="https://www.smn.gob.ar/alertas" target="_blank" rel="noreferrer">Alertas oficiales <ExternalLink size={14}/></a></footer>
 {selectedArticle&&<ArticleReader item={selectedArticle} onClose={()=>setSelectedArticle(null)}/>}
 <nav className="mobile-nav"><button className={tab==="Portada"?"active":""} onClick={()=>navigate("Portada")}><Newspaper size={20}/>Portada</button><button className={tab==="Córdoba"?"active":""} onClick={()=>navigate("Córdoba")}><Compass size={20}/>Córdoba</button><button className={tab==="Deportes"?"active":""} onClick={()=>navigate("Deportes")}><Trophy size={20}/>Deportes</button><button className={tab==="El tiempo"?"active":""} onClick={()=>navigate("El tiempo")}><CloudSun size={20}/>Tiempo</button></nav></div>
}

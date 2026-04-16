import { useState, useEffect, useRef } from "react";

const DARK={bg:"#0c0c0f",s1:"#111116",s2:"#16161d",s3:"#1c1c25",s4:"#22222e",bd:"#22222c",bd2:"#2c2c3a",acc:"#dc2626",t2:"#c8c8d8",tx:"#f0f0f8",mu:"#606070",green:"#22c55e",amber:"#f59e0b",blue:"#3b82f6",cyan:"#06b6d4",purple:"#8b5cf6"};
const LIGHT={bg:"#f8f8fa",s1:"#ffffff",s2:"#f1f1f5",s3:"#e8e8ef",s4:"#dddde8",bd:"#e0e0ea",bd2:"#c8c8d8",acc:"#dc2626",t2:"#222230",tx:"#0c0c18",mu:"#888898",green:"#16a34a",amber:"#d97706",blue:"#2563eb",cyan:"#0891b2",purple:"#7c3aed"};
let _theme="dark";
try{_theme=localStorage.getItem("autorra_theme")||"dark";}catch{}
let C=_theme==="light"?{...LIGHT}:{...DARK};
function applyTheme(t){_theme=t;C=t==="light"?{...LIGHT}:{...DARK};try{localStorage.setItem("autorra_theme",t);}catch{}}
const ST={
  pending: {color:C.amber, bg:"#ca8a0412",label:"Függőben"},
  awaiting:{color:C.blue,  bg:"#2563eb12",label:"Visszaigazolásra vár"},
  ordered: {color:C.red,   bg:"#dc262612",label:"Megrendelve"},
  krakow:  {color:C.purple,bg:"#7c3aed12",label:"Krakkóban van"},
  transit: {color:C.cyan,  bg:"#0e749012",label:"Úton"},
  ready:   {color:C.green, bg:"#16a34a12",label:"Átvehető"},
};
const SQ=["pending","awaiting","ordered","krakow","transit","ready"];
const CONDITIONS=["Új","Kiváló","Jó","Közepes","Javított","Felújított","Hibás"];
// -- i18n translations --
const T={
  hu:{
    browse:"Alkatrészek böngészése",search:"Keresés...",allCond:"Minden állapot",
    allCat:"Minden kategória",noResults:"Nincs találat",clearFilters:"Szűrők törlése",
    loading:"Betöltés...",price:"Ár",contact:"Elérhetőség",pickup:"Átvétel",
    condition:"Állapot",serial:"Cikkszám",vehicle:"Jármű",call:"Hívás",whatsapp:"WhatsApp",
    admin:"Admin",back:"← Vissza",available:"Elérhető",sold:"Eladva",
    askPrice:"Ár: érdeklődjön",description:"Leírás",category:"Kategória",
    heroTitle:"Lengyel alkatrész.",heroRed:"Magyar ár.",
    heroSub:"Közvetlen import Krakkóból - eredeti és utángyártott alkatrészek, kedvező áron.",
    partQuality:"Ellenőrzött minőség",fastShip:"Gyors kiszállítás",
    directImport:"Közvetlen import",allMakes:"Minden márka",
  },
  en:{
    browse:"Browse Parts",search:"Search...",allCond:"All conditions",
    allCat:"All categories",noResults:"No results found",clearFilters:"Clear filters",
    loading:"Loading...",price:"Price",contact:"Contact",pickup:"Pickup",
    condition:"Condition",serial:"Part No.",vehicle:"Vehicle",call:"Call",whatsapp:"WhatsApp",
    admin:"Admin",back:"← Back",available:"Available",sold:"Sold",
    askPrice:"Ask for price",description:"Description",category:"Category",
    heroTitle:"Polish parts.",heroRed:"Hungarian price.",
    heroSub:"Direct import from Kraków - OEM and aftermarket parts, best prices, fast delivery.",
    partQuality:"Verified quality",fastShip:"Fast delivery",
    directImport:"Direct import",allMakes:"All makes",
  }
};
function useLang(){
  const[lang,setLang]=useState(()=>{try{return localStorage.getItem("autorra_lang")||"hu";}catch{return "hu";}});
  const switchLang=(l)=>{setLang(l);try{localStorage.setItem("autorra_lang",l);}catch{}};
  return[lang,switchLang,T[lang]||T.hu];
}

// -- Part categories --
// Part category hierarchy: {id, label, sub:[...]}
const PART_CAT_TREE=[
  {id:"Fékrendszer",label:"Fékrendszer",sub:["Féktárcsa","Fékbetét","Féknyereg","Fékcső / Főfékhenger","Kézifék","ABS szenzor","Fékfolyadék tartály"]},
  {id:"Motor",label:"Motor",sub:["Hengerfej","Szelepfedél","Olajteknő","Vezérlés / Lánc","Turbó","Befecskendező","Fojtószelep","Üzemanyag pumpa","Olajszűrő ház","Szívócső","EGR szelep"]},
  {id:"Felfüggesztés",label:"Felfüggesztés / Futómű",sub:["Lengéscsillapító","Rugó","Stabilizátor rúd","Lengőkar","Kerékcsapágy","Gömbcsukló","Kerékagycsapágy","Teleszkóp"]},
  {id:"Kormányzás",label:"Kormányzás",sub:["Kormánymű","Kormányrúd","Összekötőrúd","Szervószivattyú","Szervócső","Irányváltó"]},
  {id:"Hajtáslánc",label:"Váltó / Hajtáslánc",sub:["Váltó","Tengelykapcsoló","Hajtótengely / Féltengely","Kardántengely","Differenciálmű","Lendkerék","Erőátviteli szíj / lánc"]},
  {id:"Karosszéria",label:"Karosszéria / Külső",sub:["Motorháztető","Sárvédő","Ajtó","Lökhárító","Csomagtérajtó / Klapa","Küszöb","Tükör","Szélvédő","Tetőablak"]},
  {id:"BelsoTer",label:"Belső tér",sub:["Műszerfal","Ülés","Kárpit","Biztonsági öv","Légzsák","Belső ajtópanel","Központizár","Ablakemelő motor"]},
  {id:"Elektromos",label:"Elektromos / Elektronika",sub:["Generátor","Önindító","Akkumulátor","ECU / Vezérlőegység","Érzékelő / Szenzor","Biztosíték tábla","Kábelköteg","Gyújtótrafó"]},
  {id:"Huto",label:"Hűtő / Klíma",sub:["Hűtő","Ventilátor","Vízszivattyú","Termosztát","Klímakompresszor","Klímahűtő","Fűtésradiátor","Hőmérséklet szenzor"]},
  {id:"Kipufogo",label:"Kipufogó",sub:["Katalizátor","Hangtompító","Kipufogócső","Lambda szonda","Kipufogó-gyűjtőcső","DPF / FAP szűrő"]},
  {id:"Vilagitas",label:"Világítás",sub:["Fényszóró","Hátsó lámpa","Nappali fény (DRL)","Ködlámpa","Izzó","LED modul"]},
  {id:"Szurok",label:"Szűrők",sub:["Levegőszűrő","Olajszűrő","Üzemanyagszűrő","Pollenszűrő / Kabinszűrő","Hidraulikus szűrő"]},
  {id:"Egyeb",label:"Egyéb",sub:["Vonóhorog","Csomagtartó","Zajszigetelés","Felni","Gumi"]},
];
// Flat list for backwards compat with storefront
const PART_CATS=PART_CAT_TREE.map(c=>c.label);
// All flat subcategories for search
const PART_CATS_ALL=PART_CAT_TREE.flatMap(c=>[c.label,...c.sub]);

// -- Vehicle makes for filter --
const MAKES=[
  "Audi","BMW","Chevrolet","Chrysler","Citroën","Dacia","Fiat","Ford","Honda",
  "Hyundai","Kia","Mazda","Mercedes-Benz","Mitsubishi","Nissan","Opel","Peugeot",
  "Renault","Seat","Skoda","Subaru","Suzuki","Toyota","Volkswagen","Volvo","Egyéb",
];

const COND_C={Új:C.green,Kiváló:"#65a30d",Jó:C.blue,Közepes:C.amber,Javított:"#0891b2",Felújított:"#7c3aed",Hibás:C.acc};
const CHANNELS={
  fb_hu:{label:"Messenger",country:"HU",color:"#3b82f6",lang:"HU"},
  wa_hu:{label:"WhatsApp", country:"HU",color:"#22c55e",lang:"HU"},
  wa_pl:{label:"WhatsApp", country:"PL",color:"#22c55e",lang:"PL"},
  vb_hu:{label:"Viber",    country:"HU",color:"#7c3aed",lang:"HU"},
  vb_pl:{label:"Viber",    country:"PL",color:"#7c3aed",lang:"PL"},
};
const CURRENCIES=[
  {code:"HUF",name:"Magyarország",                                     countries:["HU"],          accent:C.green,  decimals:0, home:true},
  {code:"EUR",name:"Ausztria · Szlovákia · Horvátország · Szlovénia",  countries:["AT","SK","HR","SI"],accent:C.blue,decimals:2},
  {code:"RON",name:"Románia",                                           countries:["RO"],          accent:C.amber,  decimals:2},
  {code:"UAH",name:"Ukrajna",                                           countries:["UA"],          accent:C.green,  decimals:0},
  {code:"RSD",name:"Szerbia",                                           countries:["RS"],          accent:C.purple, decimals:0},
  {code:"CZK",name:"Csehország",                                        countries:["CZ"],          accent:C.cyan,   decimals:2},
];
const SYMBOLS={HUF:"Ft",EUR:"€",RON:"RON",UAH:"₴",RSD:"RSD",CZK:"Kč"};
const PL_TPL=[
  {id:1,title:"Elérhetőség",text:"Dzień dobry, czy ten produkt jest dostępny? Proszę o potwierdzenie stanu magazynowego."},
  {id:2,title:"Krakówba szállítás",text:"Czy mogą Państwo wysłać towar na adres magazynu w Krakowie? Proszę o potwierdzenie możliwości wysyłki."},
  {id:3,title:"ÁFA számla",text:"Proszę o wystawienie faktury VAT na firmę. Czy jest taka możliwość?"},
  {id:4,title:"Feladás időpontja",text:"Kiedy towar zostanie wysłany? Proszę o podanie szacowanego czasu dostawy."},
  {id:5,title:"Árajánlat",text:"Proszę o podanie ceny za sztukę oraz możliwości rabatu przy większym zamówieniu."},
];
const HU_TPL=[
  {id:1,title:"Megrendelés visszaigazolása",text:"Kedves Ügyfelünk! Az alkatrészét megrendeltük. Amint megérkezik Krakkóba, értesítjük."},
  {id:2,title:"Krakkóba érkezett",text:"Az alkatrésze megérkezett a krakkói raktárunkba. A következő fuvarral hozzuk Magyarországra."},
  {id:3,title:"Úton van",text:"Az alkatrésze úton van, hamarosan megérkezik az átvételi ponthoz."},
  {id:4,title:"Átvehető",text:"Az alkatrésze megérkezett és átvehető! Kérjük, jelezze, mikor tud jönni."},
  {id:5,title:"Árajánlat küldése",text:"Kedves Ügyfelünk! Az alkatrész ára: [ÁR]. Szállítási idő kb. [IDŐ] nap. Kéri, hogy megrendeljük?"},
];
const INIT_ORDERS=[]

const SAMPLE_CONVOS=[]
function makeId(name,zip){
  if(!name)return"-";
  const acc="ÁáÉéÍíÓóÖöŐőÚúÜüŰű",base="AaEeIiOoOoOoUuUuUu";
  const strip=s=>[...s].map(c=>{const i=acc.indexOf(c);return i>=0?base[i]:c;}).join("").toUpperCase();
  const initials=name.trim().split(" ").filter(Boolean).map(w=>strip(w)[0]||"").join("").slice(0,4);
  return(initials+((zip||"").replace(/[^0-9]/g,""))).slice(0,10)||"-";
}

// getParts: normalize order to parts array (supports legacy single-part + new multi-part)
function getParts(o){
  if(o.parts&&o.parts.length>0) return o.parts;
  return [{name:o.part||"",qty:o.qty||1,allegroLink:o.allegroLink||""}];
}
function partsLabel(o){
  const p=getParts(o);
  if(p.length===1) return p[0].name;
  return p[0].name+" +"+(p.length-1)+" tétel";
}
function totalQty(o){return getParts(o).reduce((s,p)=>s+(parseInt(p.qty)||1),0);}

const DEFAULT_AI_PROMPT="Te egy Autorra autóalkatrész asszisztense vagy (PL→HU logisztika). Professzionálisan válaszolj az adott csatorna nyelvén. Azonosítsd az alkatrész nevét és a járművet. Röviden és egyértelműen fogalmazz.";

const db={
  async get(k,sh=false){try{const r=await window.storage.get(k,sh);return r?JSON.parse(r.value):null;}catch{return null;}},
  async set(k,v,sh=false){try{await window.storage.set(k,JSON.stringify(v),sh);}catch{}},
};
async function ai(messages,sys){
  const body={model:"claude-sonnet-4-20250514",max_tokens:1200,messages};
  if(sys)body.system=sys;
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();return d.content?.find(b=>b.type==="text")?.text||"";
}

const F="'Manrope','Segoe UI',sans-serif";
const inp={background:C.s2,border:`1px solid ${C.bd}`,borderRadius:6,padding:"9px 12px",color:C.tx,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:F};
const FLAG_C={
  PL:{bg:"#dc2626",tx:"#fff"},   // Poland red
  HU:{bg:"#16a34a",tx:"#fff"},   // Hungary green (tricolor center)
  UA:{bg:"#ca8a04",tx:"#fff"},   // Ukraine amber/gold
  AT:{bg:"#dc2626",tx:"#fff"},   // Austria red
  SK:{bg:"#2563eb",tx:"#fff"},   // Slovakia blue
  HR:{bg:"#2563eb",tx:"#fff"},   // Croatia blue
  SI:{bg:"#2563eb",tx:"#fff"},   // Slovenia blue
  RO:{bg:"#b45309",tx:"#fff"},   // Romania orange-brown
  RS:{bg:"#7c3aed",tx:"#fff"},   // Serbia purple
  CZ:{bg:"#0e7490",tx:"#fff"},   // Czech cyan
};
const Flag=({code,sm})=>{const c=FLAG_C[code]||{bg:C.mu,tx:"#fff"};return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",background:c.bg,color:c.tx,borderRadius:3,padding:sm?"1px 4px":"2px 5px",fontSize:sm?9:10,fontWeight:800,letterSpacing:0.3,minWidth:sm?18:20,lineHeight:"14px",flexShrink:0}}>{code}</span>;};

const SBadge=({status,onClick})=>{const s=ST[status];return(<span onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:5,background:s.bg,color:s.color,borderRadius:4,padding:"3px 9px",fontSize:11,fontWeight:700,whiteSpace:"nowrap",cursor:onClick?"pointer":"default",userSelect:"none"}}><span style={{width:5,height:5,borderRadius:"50%",background:s.color,display:"inline-block",flexShrink:0}}/>{s.label}</span>);};
const PBadge=({p})=>{const cols={WhatsApp:"#22c55e",Messenger:"#3b82f6",Viber:"#8b5cf6"};const col=cols[p]||C.mu;return <span style={{color:col,fontSize:10,fontWeight:800,letterSpacing:0.8,background:col+"18",borderRadius:4,padding:"2px 7px"}}>{p.toUpperCase()}</span>;};
const ChBadge=({ch})=>{const c=CHANNELS[ch];if(!c)return null;return <span style={{display:"inline-flex",alignItems:"center",gap:5,background:c.color+"15",color:c.color,border:`1px solid ${c.color}25`,borderRadius:4,padding:"2px 8px",fontSize:10,fontWeight:700}}><Flag code={c.country} sm/>{c.label}</span>;};
const Btn=({children,onClick,v="primary",sz="md",disabled,full,style:sx={}})=>{const pad={sm:"5px 11px",md:"8px 16px",lg:"11px 22px"};const fs={sm:11,md:13,lg:14};const vs={primary:{background:disabled?C.mu:C.acc,color:"#fff",border:"none"},outline:{background:"transparent",color:C.t2,border:`1px solid ${C.bd2}`},ghost:{background:"transparent",color:C.mu,border:"none"},danger:{background:"#dc262610",color:"#ef4444",border:"1px solid #dc262628"},success:{background:"#16a34a10",color:"#22c55e",border:"1px solid #16a34a28"},subtle:{background:C.s3,color:C.t2,border:`1px solid ${C.bd}`},amber:{background:"#ca8a0415",color:C.amber,border:`1px solid ${C.amber}30`}};return <button onClick={!disabled?onClick:undefined} style={{...vs[v],padding:pad[sz],fontSize:fs[sz],fontWeight:600,borderRadius:6,cursor:disabled?"not-allowed":"pointer",fontFamily:F,transition:"opacity 0.15s",width:full?"100%":undefined,lineHeight:1,...sx}}>{children}</button>;};
const Field=({label,value,onChange,placeholder,type="text",rows,children})=>(<div>{label&&<div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>{label}</div>}{children||(rows?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...inp,resize:"vertical",lineHeight:1.5}}/>:<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={inp}/>)}</div>);
const CopyBtn=({text})=>{const[c,setC]=useState(false);return <button onClick={()=>{navigator.clipboard.writeText(text);setC(true);setTimeout(()=>setC(false),2000);}} style={{background:c?C.green+"15":C.s3,color:c?C.green:C.mu,border:`1px solid ${c?C.green+"30":C.bd}`,borderRadius:5,padding:"3px 9px",fontSize:10,cursor:"pointer",fontWeight:700,fontFamily:F}}>{c?"✓ Másolva":"Másolás"}</button>;};
const Modal=({children,onClose,width=520})=>(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20,backdropFilter:"blur(4px)"}}><div onClick={e=>e.stopPropagation()} style={{background:C.s1,border:`1px solid ${C.bd2}`,borderRadius:12,width:"100%",maxWidth:width,maxHeight:"90vh",overflowY:"auto"}}>{children}</div></div>);
const PH=({children,sub})=>(<div style={{marginBottom:24}}><h2 style={{fontSize:20,fontWeight:800,color:C.tx,margin:0,letterSpacing:-0.3}}>{children}</h2>{sub&&<p style={{color:C.mu,fontSize:13,margin:"4px 0 0"}}>{sub}</p>}</div>);

// Lockout helpers
const LOCKOUT_KEY="autorra_login_attempts";
function getAttempts(){try{return JSON.parse(localStorage.getItem(LOCKOUT_KEY)||"[]");}catch{return[];}}
function recordAttempt(){const a=[...getAttempts(),Date.now()];localStorage.setItem(LOCKOUT_KEY,JSON.stringify(a.slice(-10)));}
function clearAttempts(){localStorage.removeItem(LOCKOUT_KEY);}
function getLockoutStatus(){
  const now=Date.now();
  const a=getAttempts();
  const r1=a.filter(t=>now-t<3600000);
  const r24=a.filter(t=>now-t<86400000);
  if(r1.length>=3){
    if(r24.length>=5) return{blocked:true,hard:true,msg:"Locked. Contact administrator."};
    const mins=Math.ceil((r1[r1.length-3]+3600000-now)/60000);
    return{blocked:true,hard:false,msg:`Try again in ${mins} min`};
  }
  return{blocked:false};
}

// Inline login form - used inside popout
function LoginInline({onLogin,theme}){
  const[u,setU]=useState("");
  const[p,setP]=useState("");
  const[err,setErr]=useState("");
  const[ld,setLd]=useState(false);
  const[remember,setRemember]=useState(true);
  const[lockout,setLockout]=useState(getLockoutStatus);

  useEffect(()=>{
    try{
      const saved=localStorage.getItem("am_session");
      if(saved){const{user,expiry}=JSON.parse(saved);if(expiry>Date.now()){onLogin(user);return;}else localStorage.removeItem("am_session");}
    }catch{}
    const t=setInterval(()=>setLockout(getLockoutStatus()),15000);
    return()=>clearInterval(t);
  },[]);

  const go=async()=>{
    const ls=getLockoutStatus();
    if(ls.blocked){setErr(ls.msg);return;}
    setLd(true);setErr("");
    try{
      const API=window.__getApiBase?.()||"";
      const r=await fetch(`${API}/api/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Error");
      clearAttempts();
      localStorage.setItem("am_token",d.token);
      if(window.__setAuthToken) window.__setAuthToken(d.token);
      if(remember) localStorage.setItem("am_session",JSON.stringify({user:d.user,expiry:Date.now()+30*24*3600000}));
      onLogin(d.user);
    }catch(e){
      recordAttempt();
      const ls2=getLockoutStatus();
      setErr(ls2.blocked?ls2.msg:(e.message||"Invalid credentials"));
      setLockout(ls2);setLd(false);
    }
  };

  const isDk=theme==="dark";
  const bdr=isDk?"#1e1e26":"#e8e8ee";
  const tx2=isDk?"#f0f0f8":"#111";
  const mu2=isDk?"#555":"#aaa";
  const bg2=isDk?"#111116":"#fff";

  const placeholderColor=isDk?"#3a3a4a":"#bbb";
  return(
    <div>
      <style>{`.aur-input::placeholder{color:${placeholderColor}}.aur-input:focus{border-color:#dc2626!important}`}</style>
      <input value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==="Enter"&&p&&!lockout.blocked&&go()}
        placeholder="username" autoComplete="username" className="aur-input"
        style={{display:"block",width:"100%",padding:"9px 11px",marginBottom:1,border:`1px solid ${bdr}`,borderRadius:0,background:bg2,color:tx2,fontSize:12,fontFamily:F,outline:"none",transition:"border-color 0.12s"}}/>
      <input type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==="Enter"&&u&&!lockout.blocked&&go()}
        placeholder="password" autoComplete="current-password" className="aur-input"
        style={{display:"block",width:"100%",padding:"9px 11px",marginBottom:10,border:`1px solid ${bdr}`,borderRadius:0,background:bg2,color:tx2,fontSize:12,fontFamily:F,outline:"none",transition:"border-color 0.12s"}}/>
      {err&&<div style={{fontSize:10,color:"#dc2626",marginBottom:8,lineHeight:1.4}}>{err}</div>}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,cursor:"pointer"}} onClick={()=>setRemember(r=>!r)}>
        <div style={{width:12,height:12,border:`1.5px solid ${remember?"#dc2626":bdr}`,background:remember?"#dc2626":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {remember&&<span style={{color:"#fff",fontSize:7,lineHeight:1,fontWeight:900}}>✓</span>}
        </div>
        <span style={{fontSize:10,color:mu2,letterSpacing:0.2}}>Remember for 30 days</span>
      </div>
      <button onClick={go} disabled={ld||!u||!p||lockout.blocked}
        style={{width:"100%",padding:"9px 0",background:lockout.blocked?"#555":!u||!p?"transparent":"#dc2626",color:lockout.blocked||(!u||!p)?mu2:"#fff",border:`1px solid ${!u||!p?bdr:"#dc2626"}`,fontSize:11,fontWeight:700,cursor:lockout.blocked||!u||!p?"default":"pointer",fontFamily:F,letterSpacing:0.5,textTransform:"uppercase",transition:"all 0.12s"}}>
        {ld?"·  ·  ·":lockout.blocked?"Locked":"Login →"}
      </button>
    </div>
  );
}


const NAV=[
  {id:"dashboard",label:"Irányítópult",icon:"▣"},
  {id:"ai",       label:"AI Elemzés",   icon:"✦"},
  {id:"inbox",    label:"Beérkező",     icon:"◉"},
  {id:"inquiry",  label:"Új érdeklődés",icon:"⟡"},
  {id:"orders",   label:"Rendelések",   icon:"≡"},
  {id:"krakow",   label:"Krakkói raktár",icon:"◈"},
  {id:"catalogue",label:"Katalógus",    icon:"⊡"},
  {id:"calculator",label:"Árkalkulátor",icon:"◎"},
  {id:"templates",label:"Sablonok",     icon:"◫"},
  {id:"customers",label:"Vevők",         icon:"◷"},
  {id:"settings", label:"Beállítások",  icon:"⚙"},
  {id:"security", label:"Biztonság",     icon:"🔒"},
];
function Sidebar({active,setActive,user,onLogout,onPublic,orders,convos,onToggleTheme}){
  const kn=orders.filter(o=>o.status==="krakow").length;
  const pn=orders.filter(o=>["pending","awaiting"].includes(o.status)).length;
  const un=(convos||[]).reduce((a,c)=>a+(c.unread||0),0);
  const Dot=({n,col})=>n>0?(
    <span style={{background:col,color:"#fff",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:800,minWidth:14,textAlign:"center",lineHeight:"14px"}}>{n}</span>
  ):null;
  return(
    <div style={{width:200,background:C.s1,borderRight:`1px solid ${C.bd}`,display:"flex",flexDirection:"column",minHeight:"100vh",flexShrink:0}}>
      <div style={{padding:"24px 20px 18px"}}>
        <div style={{fontSize:16,fontWeight:900,color:C.tx,letterSpacing:-0.5}}>auto<span style={{color:C.acc}}>rra</span></div>
        <div style={{fontSize:9,color:C.mu,letterSpacing:2,textTransform:"uppercase",marginTop:3}}>PL → HU</div>
      </div>
      <div style={{flex:1,paddingTop:2}}>
        {NAV.filter(n=>!n.admin||user.role==="admin").map(n=>{
          const a=active===n.id;
          return(
            <button key={n.id} onClick={()=>setActive(n.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 20px",border:"none",cursor:"pointer",width:"100%",textAlign:"left",background:"transparent",borderLeft:a?"2px solid "+C.acc:"2px solid transparent",color:a?"#e8e8e8":"#3a3a3a",fontSize:12,fontWeight:a?600:400,fontFamily:F,transition:"color 0.1s"}}>
              <span style={{fontSize:10,color:a?C.acc:"#2a2a2a",flexShrink:0}}>{n.icon}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.id==="krakow"&&<Dot n={kn} col={C.purple}/>}
              {n.id==="orders"&&<Dot n={pn} col={C.amber}/>}
              {n.id==="inbox"&&<Dot n={un} col={C.acc}/>}
            </button>
          );
        })}
      </div>
      <div style={{borderTop:"1px solid #141414",padding:"14px 20px"}}>
        <button onClick={onPublic} style={{display:"block",width:"100%",background:"transparent",border:"1px solid #1c1c1c",borderRadius:4,padding:"6px 10px",color:"#2e2e2e",fontSize:10,cursor:"pointer",fontFamily:F,textAlign:"left",marginBottom:14}}>
          🌐 Katalógus
        </button>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{width:22,height:22,background:C.acc,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>{user.name[0]}</div>
          <div style={{overflow:"hidden"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#bbb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
            <div style={{fontSize:9,color:"#2e2e2e",textTransform:"uppercase",letterSpacing:1}}>{user.role}</div>
          </div>
        </div>
        <button onClick={onToggleTheme} style={{display:"block",width:"100%",background:"transparent",border:"none",color:C.mu,fontSize:11,cursor:"pointer",padding:"6px 0",fontFamily:F,marginBottom:4}}>{_theme==="light"?"🌙 Sötét mód":"☀ Világos mód"}</button><button onClick={onLogout} style={{background:"transparent",border:"none",color:"#282828",fontSize:10,cursor:"pointer",fontFamily:F,padding:0}}>Kijelentkezés</button>
      </div>
    </div>
  );
}
function Dashboard({orders,convos,onNav}){
  const unread=(convos||[]).reduce((a,c)=>a+(c.unread||0),0);
  const today=new Date().toISOString().split("T")[0];
  const todayOrders=orders.filter(o=>o.date===today);
  const needAction=orders.filter(o=>["pending","awaiting"].includes(o.status));
  const inTransit=orders.filter(o=>["krakow","transit"].includes(o.status));
  const ready=orders.filter(o=>o.status==="ready");
  const totalParts=orders.reduce((s,o)=>s+totalQty(o),0);
  const platforms=orders.reduce((m,o)=>{m[o.platform]=(m[o.platform]||0)+1;return m;},{});
  const topPlatform=Object.entries(platforms).sort((a,b)=>b[1]-a[1])[0];

  return(
    <div>
      <PH sub={`${today} - összesített üzleti áttekintő`}>Irányítópult</PH>

      {/* Alerts */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {unread>0&&(
          <div onClick={()=>onNav("inbox")} style={{background:C.acc+"10",border:`1px solid ${C.acc}25`,borderRadius:8,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>📬</span>
            <span style={{fontSize:13,color:C.t2,flex:1}}><strong style={{color:C.acc}}>{unread} megválaszolatlan üzenet</strong> - kattints a beérkezőhöz</span>
            <span style={{fontSize:11,color:C.mu}}>→</span>
          </div>
        )}
        {ready.length>0&&(
          <div onClick={()=>onNav("orders")} style={{background:C.green+"10",border:`1px solid ${C.green}25`,borderRadius:8,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>✅</span>
            <span style={{fontSize:13,color:C.t2,flex:1}}><strong style={{color:C.green}}>{ready.length} rendelés átvehető</strong> - értesítsd az ügyfeleket</span>
            <span style={{fontSize:11,color:C.mu}}>→</span>
          </div>
        )}
        {needAction.length>0&&(
          <div onClick={()=>onNav("orders")} style={{background:C.amber+"10",border:`1px solid ${C.amber}25`,borderRadius:8,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>⏳</span>
            <span style={{fontSize:13,color:C.t2,flex:1}}><strong style={{color:C.amber}}>{needAction.length} rendelés</strong> visszaigazolásra vagy döntésre vár</span>
            <span style={{fontSize:11,color:C.mu}}>→</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Összes rendelés",val:orders.length,col:C.blue,icon:"≡"},
          {label:"Alkatrész tétel",val:totalParts+" db",col:C.purple,icon:"⊡"},
          {label:"Úton / Krakkóban",val:inTransit.length,col:C.cyan,icon:"◈"},
          {label:"Ma felvett",val:todayOrders.length,col:C.green,icon:"✦"},
        ].map(({label,val,col,icon})=>(
          <div key={label} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:"16px 18px",borderLeft:`3px solid ${col}`}}>
            <div style={{fontSize:11,color:C.mu,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><span style={{color:col}}>{icon}</span>{label}</div>
            <div style={{fontSize:26,fontWeight:800,color:C.tx,letterSpacing:-0.5}}>{val}</div>
          </div>
        ))}
      </div>

      {/* Status pipeline */}
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18,marginBottom:16}}>
        <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:14}}>RENDELÉSEK STÁTUSZA</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
          {SQ.map(s=>{const n=orders.filter(o=>o.status===s).length;return(
            <div key={s} onClick={()=>onNav("orders",s)} style={{cursor:"pointer",textAlign:"center",padding:"12px 6px",borderRadius:8,background:n>0?ST[s].bg:"transparent",border:`1px solid ${n>0?ST[s].color+"30":C.bd}`,transition:"all 0.1s"}}>
              <div style={{fontSize:24,fontWeight:800,color:n>0?ST[s].color:C.mu}}>{n}</div>
              <div style={{fontSize:9,color:n>0?ST[s].color:C.mu,marginTop:3,lineHeight:1.3,fontWeight:600}}>{ST[s].label}</div>
            </div>
          );})}
        </div>
      </div>

      {/* Two columns: recent orders + platform breakdown */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:14}}>
        <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"hidden"}}>
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.bd}`,fontSize:10,fontWeight:700,color:C.mu,letterSpacing:1}}>LEGÚJABB RENDELÉSEK</div>
          {orders.length===0&&<div style={{padding:24,textAlign:"center",color:C.mu,fontSize:13}}>Nincs rendelés.</div>}
          {orders.slice(0,6).map((o,i)=>(
            <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:i<Math.min(orders.length,6)-1?`1px solid ${C.bd}`:"none"}}>
              <span style={{fontSize:9,fontFamily:"monospace",color:C.mu,minWidth:50}}>{makeId(o.customer,o.zip)}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.customer}</div>
                <div style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{partsLabel(o)} · {o.car}</div>
              </div>
              <SBadge status={o.status}/>
            </div>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:16}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:12}}>PLATFORMOK</div>
            {Object.entries(platforms).sort((a,b)=>b[1]-a[1]).map(([pl,n])=>{
              const pct=Math.round(n/orders.length*100);
              const col={WhatsApp:"#22c55e",Messenger:"#3b82f6",Viber:"#8b5cf6"}[pl]||C.mu;
              return(
                <div key={pl} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:11,color:C.t2}}>{pl}</span>
                    <span style={{fontSize:11,fontWeight:700,color:col}}>{n} ({pct}%)</span>
                  </div>
                  <div style={{height:4,background:C.bd,borderRadius:2}}>
                    <div style={{height:4,background:col,borderRadius:2,width:pct+"%",transition:"width 0.3s"}}/>
                  </div>
                </div>
              );
            })}
            {orders.length===0&&<div style={{fontSize:12,color:C.mu}}>Nincs adat.</div>}
          </div>

          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:16}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>GYORS MŰVELETEK</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              <Btn v="subtle" full onClick={()=>onNav("inquiry")} style={{textAlign:"left",justifyContent:"flex-start"}}>✦ Új érdeklődés feldolgozása</Btn>
              <Btn v="subtle" full onClick={()=>onNav("inbox")} style={{textAlign:"left",justifyContent:"flex-start"}}>◉ Beérkező üzenetek</Btn>
              <Btn v="subtle" full onClick={()=>onNav("krakow")} style={{textAlign:"left",justifyContent:"flex-start"}}>◈ Krakkói raktár</Btn>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiDashboard({orders}){
  const[insight,setInsight]=useState(null);
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState("");
  const[statusFilter,setStatusFilter]=useState("all");
  const filtered=statusFilter==="all"?orders:orders.filter(o=>o.status===statusFilter);

  const analyze=async()=>{
    setLoading(true);setErr("");setInsight(null);
    const summary=filtered.slice(0,30).map(o=>`${makeId(o.customer,o.zip)} | ${o.status} | ${o.part} | ${o.car} | ${o.date}`).join(", ");
    try{
      const text=await ai([{role:"user",content:`Te egy Autorra autóalkatrész AI elemzője vagy (PL-HU logisztika). Elemezd az alábbi rendelési adatokat és adj üzleti betekintést magyarul. Rendelések (${filtered.length} db, szűrő: ${statusFilter}):\n${summary}\n\nVálaszolj CSAK JSON formátumban:\n{"osszesfoglalas":"...","bottleneck":"...","topAlkatreszek":["max 3"],"javaslatok":["3 javaslat"],"kockazatok":["2 kockázat"],"statisztika":{"atlagosIdoNap":3,"legtobbenVaro":"státusz","teljesitesiArany":"75%"}}`}]);
      const d=JSON.parse(text.split(String.fromCharCode(96,96,96)+"json").join("").split(String.fromCharCode(96,96,96)).join("").trim());
      setInsight(d);
    }catch(e){setErr("Hiba az elemzés során. Próbálja újra.");}
    setLoading(false);
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <PH sub="AI-alapú üzleti betekintés a rendelési adatok alapján">AI Elemzés</PH>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setInsight(null);}} style={{...inp,width:"auto",fontSize:11,padding:"5px 10px"}}><option value="all">Összes státusz</option>{SQ.map(s=><option key={s} value={s}>{ST[s].label}</option>)}</select>
          <Btn onClick={analyze} disabled={loading}>{loading?"⟳ Elemzés...":"✦ Elemzés futtatása"}</Btn>
        </div>
      </div>
      <div style={{fontSize:11,color:C.mu,marginBottom:16}}>{filtered.length} rendelés az elemzésben{statusFilter!=="all"&&<span style={{color:ST[statusFilter]?.color,marginLeft:6,fontWeight:700}}> · {ST[statusFilter]?.label}</span>}</div>
      {err&&<div style={{color:C.acc,fontSize:13,marginBottom:14}}>{err}</div>}
      {!insight&&!loading&&(
        <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>✦</div>
          <div style={{fontSize:14,fontWeight:600,color:C.t2,marginBottom:6}}>AI üzleti elemzés</div>
          <div style={{fontSize:12,color:C.mu,marginBottom:20,maxWidth:400,margin:"0 auto 20px"}}>Kattints az elemzés gombra - a mesterséges intelligencia feldolgozza az összes rendelési adatot és konkrét javaslatokat ad.</div>
          <Btn onClick={analyze}>✦ Elemzés indítása</Btn>
        </div>
      )}
      {loading&&(
        <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:12,color:C.acc}}>⟳</div>
          <div style={{fontSize:13,color:C.mu}}>AI elemzi a rendelési adatokat...</div>
        </div>
      )}
      {insight&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Summary */}
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20,borderLeft:`3px solid ${C.acc}`}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:8}}>ÖSSZEFOGLALÁS</div>
            <div style={{fontSize:14,color:C.tx,lineHeight:1.65}}>{insight.osszesfoglalas}</div>
          </div>
          {/* Stats row */}
          {insight.statisztika&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[
                ["Átlag teljesítési idő",insight.statisztika.atlagosIdoNap+" nap",C.blue],
                ["Legtöbb vár",insight.statisztika.legtobbenVaro,C.amber],
                ["Teljesítési arány",insight.statisztika.teljesitesiArany,C.green],
              ].map(([l,v,col])=>(
                <div key={l} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:8,padding:"14px 16px",borderTop:`2px solid ${col}`}}>
                  <div style={{fontSize:18,fontWeight:800,color:col,marginBottom:3}}>{v}</div>
                  <div style={{fontSize:10,color:C.mu}}>{l}</div>
                </div>
              ))}
            </div>
          )}
          {/* Bottleneck */}
          <div style={{background:C.amber+"08",border:`1px solid ${C.amber}25`,borderRadius:10,padding:18}}>
            <div style={{fontSize:10,color:C.amber,fontWeight:700,letterSpacing:1,marginBottom:8}}>⚠ SZŰK KERESZTMETSZET</div>
            <div style={{fontSize:13,color:C.t2,lineHeight:1.6}}>{insight.bottleneck}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {/* Suggestions */}
            <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
              <div style={{fontSize:10,color:C.green,fontWeight:700,letterSpacing:1,marginBottom:10}}>✓ JAVASLATOK</div>
              {(insight.javaslatok||[]).map((j,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                  <span style={{color:C.green,fontWeight:800,fontSize:11,flexShrink:0}}>{i+1}.</span>
                  <span style={{fontSize:12,color:C.t2,lineHeight:1.5}}>{j}</span>
                </div>
              ))}
            </div>
            {/* Risks */}
            <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
              <div style={{fontSize:10,color:C.acc,fontWeight:700,letterSpacing:1,marginBottom:10}}>⚠ KOCKÁZATOK</div>
              {(insight.kockazatok||[]).map((k,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                  <span style={{color:C.acc,fontWeight:800,fontSize:11,flexShrink:0}}>!</span>
                  <span style={{fontSize:12,color:C.t2,lineHeight:1.5}}>{k}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Top parts */}
          {insight.topAlkatreszek?.length>0&&(
            <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
              <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>LEGGYAKORIBB ALKATRÉSZEK</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {insight.topAlkatreszek.map((a,i)=>(
                  <span key={i} style={{background:C.s3,border:`1px solid ${C.bd}`,borderRadius:5,padding:"4px 10px",fontSize:12,color:C.t2}}>{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Inbox({onCreateOrder,userName,users=[]}){
  const[convos,setConvos]=useState([]);
  const[active,setActive]=useState(null);
  const[reply,setReply]=useState("");
  const[aiLoad,setAiLoad]=useState(false);
  const[aiSugg,setAiSugg]=useState(null);
  const[ready,setReady]=useState(false);
  const[search,setSearch]=useState("");
  const[stFilter,setStFilter]=useState("all");
  const[newConvo,setNewConvo]=useState(false);
  const[nc,setNc]=useState({contact:"",channel:"fb_hu",phone:""});
  const endRef=useRef();

  useEffect(()=>{db.get("inbox_convos",true).then(d=>{setConvos(d||[]);setReady(true);});}, []);
  useEffect(()=>{if(ready)db.set("inbox_convos",convos,true);},[convos,ready]);
  useEffect(()=>{if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"});},[active,convos.map(c=>c.messages?.length).join("")]);

  // SSE live messages
  useEffect(()=>{
    const API=window.__getApiBase?.()||"";
    const es=new EventSource(`${API}/webhook/events`,{withCredentials:false});
    es.onmessage=(e)=>{
      try{
        const{type,msg}=JSON.parse(e.data);
        if(type!=="message"||msg.direction!=="in")return;
        const newMsg={id:msg.id,from:"in",text:msg.text,time:new Date(msg.sent_at).toLocaleTimeString("hu",{hour:"2-digit",minute:"2-digit"})};
        setConvos(prev=>{
          const ex=prev.find(c=>c.phone===msg.phone&&c.channel===msg.channel);
          if(ex)return prev.map(c=>c.id===ex.id?{...c,messages:[...c.messages,newMsg],unread:c.unread+1,lastTime:newMsg.time}:c);
          return[{id:Date.now(),contact:msg.contact,channel:msg.channel,phone:msg.phone,status:"open",unread:1,lastTime:newMsg.time,assigned:null,messages:[newMsg]},...prev];
        });
      }catch{}
    };
    es.onerror=()=>es.close();
    return()=>es.close();
  },[]);

  const ac=convos.find(c=>c.id===active);
  const ch=ac?CHANNELS[ac.channel]:null;

  const filtered=convos.filter(c=>{
    if(stFilter!=="all"&&c.status!==stFilter)return false;
    if(!search)return true;
    const q=search.toLowerCase();
    return c.contact.toLowerCase().includes(q)||c.messages.some(m=>m.text.toLowerCase().includes(q));
  });

  const openConvo=(id)=>{setActive(id);setAiSugg(null);setReply("");setConvos(p=>p.map(c=>c.id===id?{...c,unread:0}:c));};
  const setStatus=(id,s)=>setConvos(p=>p.map(c=>c.id===id?{...c,status:s}:c));
  const totalUnread=convos.reduce((a,c)=>a+(c.unread||0),0);

  const sendMsg=async()=>{
    if(!reply.trim()||!active)return;
    const text=reply.trim();
    const msg={id:Date.now(),from:"out",text,time:new Date().toLocaleTimeString("hu",{hour:"2-digit",minute:"2-digit"}),sender:userName};
    setConvos(p=>p.map(c=>c.id===active?{...c,messages:[...c.messages,msg],lastTime:msg.time}:c));
    setReply("");setAiSugg(null);
    const API=window.__getApiBase?.()||"";
    const endpointMap={wa_pl:`${API}/webhook/vonage/send/whatsapp`,wa_hu:`${API}/webhook/vonage/send/whatsapp`,vb_pl:`${API}/webhook/vonage/send/viber`,vb_hu:`${API}/webhook/vonage/send/viber`,fb_hu:`${API}/webhook/vonage/send/messenger`};
    const endpoint=endpointMap[ac?.channel];
    const chLang=ac?CHANNELS[ac.channel]?.lang:null;
    if(endpoint&&ac?.phone){
      fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("am_token")||""}`},body:JSON.stringify({to:ac.phone,text,lang:chLang})}).catch(()=>{});
    }
  };

  const getAI=async()=>{
    if(!ac)return;setAiLoad(true);setAiSugg(null);
    const chInfo=CHANNELS[ac.channel];
    const lang=chInfo?.lang==="PL"?"lengyel":"magyar";
    const history=ac.messages.slice(-6).map(m=>(m.from==="in"?"Ügyfél: ":"Mi: ")+m.text).join("\n");
    try{
      const txt=await ai([{role:"user",content:`Te egy Autorra autóalkatrész AI asszisztense vagy. Az alábbi ${lang} nyelvű beszélgetés alapján adj reszletes professzionalis választ ${lang} nyelven és pontosan hiba nelkul azonosítsd az érdeklődést ha van.\n\nBeszélgetés:\n${history}\n\nVálaszolj JSON-ban: {"reply":"javasolt válasz allapotfelmeressel ${lang} nyelven","inquiry":{"partName":"alkatrész neve","car":"ALWAYS exact make + model + generation + year e.g. Mercedes-Benz C-Class W204 2010 or BMW 3 Series E90 2008 - NEVER just the brand name alone","quantity":1,"serialNumber":"OEM/part number EXACTLY as written by customer - copy character by character, do NOT interpret or correct - if none mentioned set null","serialNumberConfidence":"high if customer explicitly stated it, low if inferred"}}`}]);
      const d=JSON.parse(txt.replace(/```json|```/g,"").trim());
      setAiSugg(d);
    }catch{setAiSugg({reply:"Nem sikerült az AI elemzés.",inquiry:null});}
    setAiLoad(false);
  };

  const createOrder=()=>{
    if(!aiSugg?.inquiry||!ac)return;
    onCreateOrder({customer:ac.contact,platform:ch?.label||"Inbox",car:aiSugg.inquiry.car||"",parts:[{name:aiSugg.inquiry.partName,qty:aiSugg.inquiry.quantity||1,allegroLink:""}],status:"pending",date:new Date().toISOString().split("T")[0],note:"",createdBy:userName});
  };

  const addNewConvo=()=>{
    if(!nc.contact)return;
    const id=Date.now();
    setConvos(p=>[{id,contact:nc.contact,channel:nc.channel,phone:nc.phone,status:"open",unread:0,lastTime:"",assigned:null,messages:[]},...p]);
    setActive(id);setNewConvo(false);setNc({contact:"",channel:"fb_hu",phone:""});
  };

  // Status colors for sidebar
  const statusDot={open:C.green,pending:C.amber,solved:C.mu};

  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>

      {/* -- LEFT SIDEBAR -- */}
      <div style={{width:300,background:C.s1,borderRight:`1px solid ${C.bd}`,display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>

        {/* Header */}
        <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.bd}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14,fontWeight:800,color:C.tx}}>Beérkező</span>
              {totalUnread>0&&<span style={{background:C.acc,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{totalUnread}</span>}
            </div>
            <Btn v="subtle" sz="sm" onClick={()=>setNewConvo(true)}>+ Új</Btn>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Keresés..." style={{...inp,padding:"7px 10px",fontSize:11,width:"100%",marginBottom:8}}/>
          <div style={{display:"flex",gap:4}}>
            {[["all","Mind"],["open","Nyitott"],["pending","Függő"],["solved","Megoldott"]].map(([v,l])=>(
              <button key={v} onClick={()=>setStFilter(v)} style={{flex:1,padding:"4px 0",fontSize:10,fontWeight:600,borderRadius:5,border:"none",cursor:"pointer",background:stFilter===v?C.acc:C.s2,color:stFilter===v?"#fff":C.mu,transition:"all 0.15s"}}>{l}</button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.length===0&&(
            <div style={{padding:"40px 20px",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>◉</div>
              <div style={{fontSize:12,color:C.mu}}>Nincs üzenet</div>
              <div style={{fontSize:11,color:C.mu,marginTop:4}}>Üzenetek itt jelennek meg</div>
            </div>
          )}
          {filtered.map(c=>{
            const chInfo=CHANNELS[c.channel];
            const lastMsg=c.messages[c.messages.length-1];
            const isA=active===c.id;
            return(
              <div key={c.id} onClick={()=>openConvo(c.id)} style={{padding:"11px 14px",cursor:"pointer",borderBottom:`1px solid ${C.bd}`,background:isA?C.acc+"10":"transparent",borderLeft:isA?`2px solid ${C.acc}`:"2px solid transparent",transition:"all 0.1s"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:7,minWidth:0}}>
                    {/* Channel color dot */}
                    <span style={{width:8,height:8,borderRadius:"50%",background:chInfo?.color||C.mu,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:c.unread>0?700:500,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.contact}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                    {c.unread>0&&<span style={{background:C.acc,color:"#fff",borderRadius:8,padding:"1px 6px",fontSize:9,fontWeight:700}}>{c.unread}</span>}
                    <span style={{fontSize:9,color:C.mu}}>{c.lastTime}</span>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingLeft:15}}>
                  <span style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{lastMsg?lastMsg.text:"Nincs üzenet"}</span>
                  <span style={{fontSize:9,fontWeight:600,color:statusDot[c.status]||C.mu,marginLeft:6,flexShrink:0,textTransform:"uppercase"}}>{c.status==="open"?"":"● "}{c.status==="solved"?"kész":c.status==="pending"?"függő":""}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -- MAIN CHAT AREA -- */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:C.bg}}>
        {!ac?(
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:C.mu,gap:12}}>
            <div style={{fontSize:36,opacity:0.3}}>◉</div>
            <div style={{fontSize:13,fontWeight:600,color:C.t2}}>Válassz egy beszélgetést</div>
            <div style={{fontSize:11,color:C.mu}}>Bal oldalt kattints egy üzenetre</div>
          </div>
        ):(
          <>
            {/* Chat header */}
            <div style={{padding:"12px 20px",borderBottom:`1px solid ${C.bd}`,background:C.s1,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:ch?.color+"20"||C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:ch?.color||C.mu,flexShrink:0}}>
                {ac.contact.charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{ac.contact}</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
                  <ChBadge ch={ac.channel}/>
                  {ac.phone&&<span style={{fontSize:10,color:C.mu,fontFamily:"monospace"}}>{ac.phone}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {[["open","Nyitott",C.green],["pending","Függő",C.amber],["solved","Megoldott",C.mu]].map(([v,l,col])=>(
                  <button key={v} onClick={()=>setStatus(ac.id,v)} style={{padding:"4px 10px",fontSize:10,fontWeight:600,borderRadius:5,border:`1px solid ${ac.status===v?col:C.bd}`,background:ac.status===v?col+"15":"transparent",color:ac.status===v?col:C.mu,cursor:"pointer"}}>{l}</button>
                ))}
                <Btn v="success" sz="sm" onClick={createOrder} disabled={!aiSugg?.inquiry}>✓ Rendelés</Btn>
              </div>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:8}}>
              {ac.messages.length===0&&(
                <div style={{textAlign:"center",color:C.mu,fontSize:12,marginTop:40}}>Még nincs üzenet ebben a beszélgetésben.</div>
              )}
              {ac.messages.map(m=>{
                const out=m.from==="out";
                return(
                  <div key={m.id} style={{display:"flex",justifyContent:out?"flex-end":"flex-start"}}>
                    <div style={{maxWidth:"72%",padding:"9px 13px",borderRadius:out?"12px 12px 2px 12px":"12px 12px 12px 2px",background:out?C.acc:C.s2,color:out?"#fff":C.tx,fontSize:13,lineHeight:1.5}}>
                      {m.text}
                      <div style={{fontSize:9,color:out?"rgba(255,255,255,0.6)":C.mu,marginTop:4,textAlign:"right"}}>{m.time}{m.sender&&out?` · ${m.sender}`:""}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef}/>
            </div>

            {/* AI suggestion */}
            {(aiSugg||aiLoad)&&(
              <div style={{margin:"0 20px 8px",padding:"10px 14px",background:C.acc+"08",border:`1px solid ${C.acc}25`,borderRadius:8,flexShrink:0}}>
                {aiLoad?(
                  <div style={{fontSize:12,color:C.acc,display:"flex",alignItems:"center",gap:6}}>⟳ AI elemez...</div>
                ):(
                  <>
                    <div style={{fontSize:10,color:C.acc,fontWeight:700,letterSpacing:0.8,marginBottom:6}}>✦ AI JAVASLAT</div>
                    {aiSugg.inquiry&&<div style={{fontSize:11,color:C.mu,marginBottom:6}}><strong style={{color:C.t2}}>{aiSugg.inquiry.partName}</strong>{aiSugg.inquiry.car?<span style={{color:C.mu}}> · {aiSugg.inquiry.car}</span>:""}{aiSugg.inquiry.serialNumber&&<span style={{marginLeft:6,fontFamily:"monospace",fontSize:10,background:aiSugg.inquiry.serialNumberConfidence==="low"?C.amber+"15":C.green+"15",color:aiSugg.inquiry.serialNumberConfidence==="low"?C.amber:C.green,borderRadius:3,padding:"1px 5px"}}>{aiSugg.inquiry.serialNumberConfidence==="low"?"⚠ ":""}{aiSugg.inquiry.serialNumber}</span>}</div>}
                    <div style={{fontSize:12,color:C.t2,background:C.s2,borderRadius:6,padding:"8px 10px",marginBottom:6}}>{aiSugg.reply}</div>
                    <div style={{display:"flex",gap:6}}>
                      <Btn v="subtle" sz="sm" onClick={()=>setReply(aiSugg.reply)}>↩ Használ</Btn>
                      {aiSugg.inquiry&&<Btn v="success" sz="sm" onClick={createOrder}>✓ Rendelés</Btn>}
                      <Btn v="ghost" sz="sm" onClick={()=>setAiSugg(null)}>✕</Btn>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Input bar */}
            <div style={{padding:"10px 16px",borderTop:`1px solid ${C.bd}`,background:C.s1,flexShrink:0}}>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <Btn v="subtle" sz="sm" onClick={getAI} disabled={aiLoad} style={{fontSize:11}}>✦ AI</Btn>
                <div style={{flex:1}}/>
                <select onChange={e=>{if(e.target.value){const isHU=!CHANNELS[ac.channel]?.lang||CHANNELS[ac.channel].lang==="HU";setReply(e.target.value);e.target.value=""}}} style={{...inp,width:"auto",fontSize:11,padding:"4px 8px"}} defaultValue="">
                  <option value="">Sablon...</option>
                  <option value="Köszönjük érdeklődését! Miben segíthetünk?">👋 Üdvözlés</option>
                  <option value="Az alkatrész készleten van, hamarosan visszajelzünk az árral.">✓ Készleten</option>
                  <option value="Sajnos ez az alkatrész jelenleg nem elérhető. Megpróbálunk alternatívát keresni.">✗ Nincs készleten</option>
                  <option value="A rendelés megérkezett raktárunkba, hamarosan szállítjuk.">📦 Megérkezett</option>
                  <option value="Az alkatrész átvehető! Mikor tud jönni?">🎉 Átvehető</option>
                </select>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                <textarea value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)sendMsg();}} placeholder={ch?`Üzenet ${ch.lang==="PL"?"lengyelül":"magyarul"}... (Ctrl+Enter)`:"Válasszon beszélgetést..."} rows={2} style={{...inp,resize:"none",flex:1,lineHeight:1.5,fontSize:13}}/>
                <button onClick={sendMsg} disabled={!reply.trim()} style={{flexShrink:0,width:38,height:38,borderRadius:"50%",background:reply.trim()?C.acc:"#1a1a1a",border:"none",cursor:reply.trim()?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.15s",marginBottom:1}}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* -- NEW CONVERSATION MODAL -- */}
      {newConvo&&(
        <Modal onClose={()=>setNewConvo(false)} width={400}>
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bd}`,fontSize:14,fontWeight:700,color:C.tx}}>Új beszélgetés</div>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Ügyfél neve" value={nc.contact} onChange={v=>setNc(x=>({...x,contact:v}))} placeholder="pl. Kovács Péter"/>
            <Field label="Csatorna">
              <select value={nc.channel} onChange={e=>setNc(x=>({...x,channel:e.target.value}))} style={inp}>
                {Object.entries(CHANNELS).map(([k,v])=><option key={k} value={k}>{v.label} ({v.country})</option>)}
              </select>
            </Field>
            <Field label="Telefonszám / ID" value={nc.phone} onChange={v=>setNc(x=>({...x,phone:v}))} placeholder="pl. 36201234567"/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn v="outline" onClick={()=>setNewConvo(false)}>Mégse</Btn>
              <Btn onClick={addNewConvo} disabled={!nc.contact}>Létrehozás</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Inquiry({onOrderCreated,userName}){
  const[msg,setMsg]=useState("");const[cust,setCust]=useState("");const[plat,setPlat]=useState("WhatsApp");const[ld,setLd]=useState(false);const[res,setRes]=useState(null);const[err,setErr]=useState("");
  const process=async()=>{setLd(true);setRes(null);setErr("");
    const custCode=makeId(cust||"Ügyfél","");
    // Read calculator settings for price conversion
    let calcState={rates:{HUF:390},markup:20,perMarkup:{},fixed:{}};
    try{const cs=await db.get("calc_live_rates",true);if(cs)calcState=JSON.parse(cs);}catch{}
    const plnToHuf=(pln)=>{
      const base=pln*(calcState.rates.HUF||390);
      const mup=calcState.perMarkup?.HUF!=null?calcState.perMarkup.HUF:calcState.markup;
      return Math.round(base*(1+mup/100));
    };
    try{const text=await ai([{role:"user",content:`You are an expert auto parts assistant for a Hungarian business sourcing parts from Poland. Process this inquiry with MAXIMUM precision. CRITICAL SERIAL NUMBER RULES - follow exactly: - Copy every serial/OEM/part number CHARACTER BY CHARACTER as written, do not interpret - Watch for common misreads: 0 vs O, 1 vs I vs l, 5 vs 6, 6 vs 5, 8 vs B, 2 vs Z - After extracting the serial, cross-reference it to VERIFY the exact part name and fitment - If any characters are ambiguous, flag them in serialNumberWarning - NEVER auto-correct a serial - report it exactly as the customer gave it Customer: ${cust||"Unknown"} (code: ${custCode}) Message: "${msg}" Respond ONLY with valid JSON, no other text: {"parts":[{"name":"specific Hungarian part name e.g. Első féktárcsa jobb","qty":1,"serialNumber":"OEM/part number EXACTLY as written - null if none","serialNumberVerified":"what this serial corresponds to based on cross-reference - confirms or corrects the part name","serialNumberWarning":"flag ambiguous chars e.g. position 3 could be 5 or 6 - null if clean","serialNumberConfidence":"high/medium/low","allegroUrl":"https://allegro.pl/listing?string=polish+terms+with+OEM+if+known","estimatedPricePLN":0}],"car":"FULL spec: make + model + generation + year e.g. Mercedes-Benz C-Class W204 2008, BMW 3 Series E90 2007 - NEVER brand alone - null if unknown","totalEstimatePLN":0,"totalEstimateHUF":"calculate using current rate: totalEstimatePLN * HUF_rate * (1 + markup/100)","priceNote":"OEM vs aftermarket price range and key factors affecting price","sellerMessagePL":"EXACTLY this format (translate part names to Polish): Witam aktualne?\nJaka cena do Krakowa po za allegro?\n[allegroUrl for this part]\n([customer code])\nDziękuję - one message per part with its own allegroUrl","customerReplyHU":"Hungarian reply with parts, verified serials, price estimate in HUF - ask for model/year if missing"}`}]);const parsed=JSON.parse(text.split(String.fromCharCode(96,96,96)+"json").join("").split(String.fromCharCode(96,96,96)).join("").trim());if(parsed.totalEstimatePLN)parsed.totalEstimateHUF=plnToHuf(parsed.totalEstimatePLN);if(parsed.parts)parsed.parts=parsed.parts.map(p=>p.estimatedPricePLN?{...p,estimatedPriceHUF:plnToHuf(p.estimatedPricePLN)}:p);setRes(parsed);}catch{setErr("Hiba. Próbálja újra.");}setLd(false);};
  const create=()=>{onOrderCreated({customer:cust||"Ismeretlen",platform:plat,part:res.partName,car:res.car||"",qty:res.quantity||1,allegroLink:res.allegroUrl||"",status:"pending",date:new Date().toISOString().split("T")[0],note:"",createdBy:userName});setMsg("");setCust("");setRes(null);};
return(<div><PH sub="AI-alapú feldolgozás és fordítás">Új érdeklődés</PH><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}><Field label="Ügyfél neve" value={cust} onChange={setCust} placeholder="pl. Kovács Péter"/><Field label="Platform"><select value={plat} onChange={e=>setPlat(e.target.value)} style={inp}><option>WhatsApp</option><option>Messenger</option><option>Viber</option></select></Field></div><div style={{marginBottom:14}}><Field label="Ügyfél üzenete" value={msg} onChange={setMsg} placeholder="Illessze be az ügyfél üzenetét..." rows={4}/></div><Btn onClick={process} disabled={ld||!msg.trim()}>{ld?"⟳  Elemzés...":"✦  AI Feldolgozás"}</Btn>{err&&<div style={{marginTop:10,color:C.acc,fontSize:12}}>{err}</div>}{res&&(<div style={{marginTop:20,display:"flex",flexDirection:"column",gap:12}}><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:9,padding:18}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:12}}>AZONOSÍTOTT ADATOK</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:14,marginBottom:16}}>{[["Jármű",res.car||"-"],["Tételek",(res.parts?.length||1)+" db"],["Becsült ár (PLN)",res.totalEstimatePLN?(res.totalEstimatePLN+" PLN"):"-"],["Becsült ár (HUF)",res.totalEstimateHUF?(res.totalEstimateHUF+" Ft"):"-"]].map(([k,v])=>(<div key={k}><div style={{fontSize:10,color:C.mu,marginBottom:3}}>{k}</div><div style={{fontSize:13,color:C.tx,fontWeight:600}}>{v}</div></div>))}</div>{res.priceNote&&<div style={{background:C.amber+"10",border:`1px solid ${C.amber}25`,borderRadius:6,padding:"9px 12px",marginBottom:12,fontSize:11,color:C.t2}}><span style={{color:C.amber,fontWeight:700,marginRight:6}}>💰</span>{res.priceNote}</div>}{res.parts&&<div style={{marginBottom:12}}>{res.parts.map((p,i)=><div key={i} style={{padding:"10px 0",borderBottom:i<res.parts.length-1?`1px solid ${C.bd}`:"none"}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:p.serialNumber?4:0}}><span style={{fontSize:11,color:C.mu,minWidth:20}}>{i+1}.</span><span style={{flex:1,fontSize:13,color:C.tx,fontWeight:600}}>{p.name}</span><span style={{fontSize:12,fontWeight:700,color:C.acc,minWidth:36}}>{p.qty} db</span>{p.estimatedPricePLN>0&&<span style={{fontSize:11,fontWeight:700,color:C.green}}>~{p.estimatedPricePLN} PLN</span>}</div>{p.serialNumber&&(<div style={{paddingLeft:26,display:"flex",flexDirection:"column",gap:3}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:10,color:C.mu}}>Cikkszám:</span><span style={{fontFamily:"monospace",fontSize:11,fontWeight:700,color:C.tx,letterSpacing:1,background:C.s2,borderRadius:3,padding:"1px 6px"}}>{p.serialNumber}</span><span style={{fontSize:9,borderRadius:3,padding:"1px 5px",background:p.serialNumberConfidence==="high"?C.green+"15":p.serialNumberConfidence==="medium"?C.amber+"15":C.acc+"15",color:p.serialNumberConfidence==="high"?C.green:p.serialNumberConfidence==="medium"?C.amber:C.acc,fontWeight:700}}>{p.serialNumberConfidence==="high"?"✓ Biztos":p.serialNumberConfidence==="medium"?"~ Valószínű":"⚠ Bizonytalan"}</span></div>{p.serialNumberWarning&&<div style={{fontSize:10,color:C.amber,display:"flex",alignItems:"center",gap:4}}><span>⚠</span><span>{p.serialNumberWarning}</span></div>}{p.serialNumberVerified&&<div style={{fontSize:10,color:C.mu}}>Ellenőrzés: <span style={{color:C.t2}}>{p.serialNumberVerified}</span></div>}</div>)}{p.allegroUrl&&<a href={p.allegroUrl} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.blue}}>🔍</a>}</div>)}</div>}<div style={{display:"flex",alignItems:"center",gap:10}}><a href={res.allegroUrl||res.parts?.[0]?.allegroUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:C.s2,color:C.blue,border:`1px solid ${C.bd}`,borderRadius:6,padding:"7px 12px",fontSize:12,fontWeight:600,textDecoration:"none"}}>🔍 Allegro keresés →</a><span style={{fontSize:11,color:C.mu,fontFamily:"monospace"}}>{res.allegroQuery}</span></div></div><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:9,padding:18}}> <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}> <div style={{display:"flex",alignItems:"center",gap:8}}> <span style={{fontSize:16}}>🇵🇱</span> <div> <div style={{fontSize:12,fontWeight:800,color:C.tx}}>Lengyel üzenet - Eladónak</div> <div style={{fontSize:10,color:C.mu,marginTop:1}}>Allegro eladónak küldendő · másold és küld el</div> </div> </div> <CopyBtn text={res.sellerMessagePL}/> </div> <div style={{background:C.s2,borderRadius:8,padding:"14px 16px",fontFamily:"monospace",fontSize:13,color:C.t2,border:`1px solid ${C.bd}`}}> {(res.sellerMessagePL||"").split("\n").map((line,i)=>{ const isUrl=line.trim().startsWith("http"); const isCode=line.trim().startsWith("(")&&line.trim().endsWith(")"); return( <div key={i} style={{marginBottom:line.trim()===""?8:4,minHeight:line.trim()===""?8:undefined}}> {isUrl?( <a href={line.trim()} target="_blank" rel="noreferrer" style={{color:C.blue,wordBreak:"break-all",fontSize:12}}>{line}</a> ):isCode?( <span style={{color:C.acc,fontWeight:700}}>{line}</span> ):( <span style={{color:line.trim()===""?undefined:C.t2}}>{line}</span> )} </div> ); })} </div> </div> <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:9,padding:18}}> <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}> <div style={{display:"flex",alignItems:"center",gap:8}}> <span style={{fontSize:16}}>🇭🇺</span> <div> <div style={{fontSize:12,fontWeight:800,color:C.tx}}>Magyar válasz - Ügyfélnek</div> <div style={{fontSize:10,color:C.mu,marginTop:1}}>Az ügyfélnek küldendő visszaigazolás</div> </div> </div> <CopyBtn text={res.customerReplyHU}/> </div> <div style={{background:C.s2,borderRadius:8,padding:"14px 16px",fontSize:13,color:C.t2,lineHeight:1.7,border:`1px solid ${C.bd}`}}> {(res.customerReplyHU||"").split("\n").map((line,i)=>( <div key={i} style={{marginBottom:line.trim()===""?8:3,minHeight:line.trim()===""?8:undefined}}>{line||<>&nbsp;</>}</div> ))} </div> </div><Btn v="success" onClick={create}>✓  Rendelés létrehozása (Függőben)</Btn></div>)}</div>);
}

const STATUS_NOTIFY={
  awaiting:"Kedves Ügyfél! Az alkatrészét megtaláltuk, visszaigazolásra vár. Kéri, hogy megrendeljük?",
  ordered: "Kedves Ügyfél! Az alkatrészét megrendeltük. Amint megérkezik Krakkóba, értesítjük.",
  krakow:  "Kedves Ügyfél! Az alkatrésze megérkezett krakkói raktárunkba. A következő szállítmánnyal hozzuk.",
  transit: "Kedves Ügyfél! Az alkatrésze úton van, hamarosan megérkezik az átvételi ponthoz.",
  ready:   "Kedves Ügyfél! Az alkatrésze megérkezett és átvehető! Mikor tud jönni?",
};
function Orders({orders,onChange,onDelete,initialFilter,onFilterUsed}){
  const[search,setSearch]=useState("");const[filter,setFilter]=useState(initialFilter||"all");
  useEffect(()=>{if(initialFilter&&initialFilter!=="all"){setFilter(initialFilter);if(onFilterUsed)onFilterUsed();}}, [initialFilter]);const[editing,setEditing]=useState(null);const[ef,setEf]=useState({});const[del,setDel]=useState(null);const[statusPicker,setStatusPicker]=useState(null);const[notify,setNotify]=useState(null);const[notifyLoad,setNotifyLoad]=useState(false);const[detailId,setDetailId]=useState(null);
  const shown=orders.filter(o=>{if(filter!=="all"&&o.status!==filter)return false;if(!search)return true;const q=search.toLowerCase();return [o.customer,o.part,o.car,o.platform,makeId(o.customer,o.zip)].join(" ").toLowerCase().includes(q);});
  const startEdit=(o)=>{setEditing(o.id);setEf({customer:o.customer,zip:o.zip||"",platform:o.platform,part:o.part,car:o.car,qty:o.qty,allegroLink:o.allegroLink||"",note:o.note||"",status:o.status});};
  const saveEdit=()=>{onChange(editing,ef);setEditing(null);};
  const e=(k)=>({value:ef[k]||"",onChange:v=>setEf(x=>({...x,[k]:v}))});
  const triggerNotify=async(order,newStatus)=>{
    const tmpl=STATUS_NOTIFY[newStatus];
    if(!tmpl)return;
    setNotify({order,newStatus,msg:tmpl});
    setNotifyLoad(true);
    try{
      const prompt="Te egy Autorra autóalkatrész asszisztense vagy. Írj rövid, személyes magyar értesítő üzenetet az ügyfélnek az alábbi adatok alapján. Csak az üzenet szövegét írd, semmi mást.";
      const userMsg="Ügyfél: "+order.customer+" | Alkatrész: "+order.part+" | Jármű: "+order.car+" | Mennyiség: "+order.qty+" db | Új státusz: "+ST[newStatus].label+" | Sablon: "+tmpl;
      const generated=await ai([{role:"user",content:prompt+"\n\n"+userMsg}]);
      if(generated) setNotify(n=>n?{...n,msg:generated}:n);
    }catch{}
    setNotifyLoad(false);
  };
  return(<div><PH sub="Összes rendelés - státusz bármelyik irányba módosítható">Rendelések</PH><div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}><div style={{flex:1,position:"relative"}}><span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:C.mu,fontSize:12,pointerEvents:"none"}}>🔍</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Keresés ügyfél, alkatrész, autó..." style={{...inp,paddingLeft:32}}/></div><select value={filter} onChange={e=>setFilter(e.target.value)} style={{...inp,width:"auto"}}><option value="all">Összes ({orders.length})</option>{SQ.map(s=><option key={s} value={s}>{ST[s].label} ({orders.filter(o=>o.status===s).length})</option>)}</select></div>
    <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"visible"}}><div style={{display:"grid",gridTemplateColumns:"90px 140px 1fr 55px 165px 85px 110px",padding:"9px 16px",borderBottom:`1px solid ${C.bd}`,background:C.s2,borderRadius:"10px 10px 0 0"}}>{["Platform","Ügyfél","Alkatrész / Autó","Db","Státusz","Dátum",""].map((h,i)=>(<div key={i} style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8}}>{h.toUpperCase()}</div>))}</div>
    {shown.length===0&&<div style={{padding:32,textAlign:"center",color:C.mu,fontSize:13}}>Nincs találat.</div>}
    {shown.map((o,i)=>{const next=SQ[SQ.indexOf(o.status)+1];const isOpen=detailId===o.id;return(<div key={o.id} style={{borderBottom:i<shown.length-1?`1px solid ${C.bd}`:"none"}}><div onClick={()=>setDetailId(isOpen?null:o.id)} style={{display:"grid",gridTemplateColumns:"90px 140px 1fr 55px 165px 85px 110px",padding:"12px 16px",alignItems:"center",cursor:"pointer",background:isOpen?C.acc+"06":"transparent"}}><div style={{display:"flex",flexDirection:"column",gap:3}}><PBadge p={o.platform}/><span style={{fontSize:9,color:C.mu,fontFamily:"monospace",fontWeight:700}}>{makeId(o.customer,o.zip)}</span></div><div style={{fontSize:13,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{o.customer}</div><div style={{paddingRight:8}}><div style={{fontSize:13,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{partsLabel(o)}</div><div style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.car}</div></div><div style={{fontSize:13,color:C.t2,fontWeight:getParts(o).length>1?700:400,color:getParts(o).length>1?C.amber:C.t2}}>{totalQty(o)} db</div>
    <div style={{position:"relative"}}><SBadge status={o.status} onClick={e=>{e.stopPropagation();setStatusPicker(statusPicker===o.id?null:o.id);}}/>{statusPicker===o.id&&(<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:100,background:C.s1,border:`1px solid ${C.bd2}`,borderRadius:8,padding:6,minWidth:200,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,padding:"4px 8px 6px"}}>STÁTUSZ MÓDOSÍTÁSA</div>{SQ.map(s=>(<button key={s} onClick={()=>{onChange(o.id,{status:s});setStatusPicker(null);if(STATUS_NOTIFY[s])triggerNotify(o,s);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",background:o.status===s?ST[s].bg:"transparent",border:"none",cursor:"pointer",borderRadius:5,fontFamily:F}}><span style={{width:7,height:7,borderRadius:"50%",background:ST[s].color,flexShrink:0}}/><span style={{fontSize:12,color:o.status===s?ST[s].color:C.t2,fontWeight:o.status===s?700:500}}>{ST[s].label}</span>{o.status===s&&<span style={{marginLeft:"auto",fontSize:10,color:ST[s].color}}>✓</span>}</button>))}</div>)}</div>
    <div style={{fontSize:11,color:C.mu}}>{o.date}</div><div style={{display:"flex",gap:4}}>{next&&<Btn v="subtle" sz="sm" onClick={e=>{e.stopPropagation();onChange(o.id,{status:next});if(STATUS_NOTIFY[next])triggerNotify(o,next);}} style={{padding:"4px 8px",fontSize:11}}>→</Btn>}<Btn v="ghost" sz="sm" onClick={e=>{e.stopPropagation();startEdit(o);}} style={{padding:"4px 8px",fontSize:12}}>✎</Btn><Btn v="ghost" sz="sm" onClick={e=>{e.stopPropagation();setDel(o.id);}} style={{padding:"4px 8px",fontSize:12,color:C.acc}}>✕</Btn></div></div>{o.note&&<div style={{padding:"0 16px 10px",fontSize:11,color:C.mu}}>💬 {o.note}</div>}{isOpen&&(<div style={{padding:"0 16px 16px",borderTop:`1px solid ${C.bd}`,marginTop:4,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>ID</div><div style={{fontSize:13,fontWeight:800,color:C.tx,fontFamily:"monospace"}}>{makeId(o.customer,o.zip)}</div></div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>PLATFORM</div><PBadge p={o.platform}/></div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>DÁTUM</div><div style={{fontSize:13,color:C.tx}}>{o.date}</div></div><div style={{gridColumn:"1/-1",background:C.s2,borderRadius:8,padding:"12px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:8}}>ALKATRÉSZEK ({getParts(o).length} tétel · {totalQty(o)} db)</div>{getParts(o).map((p,pi)=>(<div key={pi} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderTop:pi>0?`1px solid ${C.bd}`:"none"}}><span style={{fontSize:11,color:C.mu,minWidth:20}}>{pi+1}.</span><span style={{flex:1,fontSize:13,color:C.tx}}>{p.name}</span><span style={{fontSize:12,fontWeight:700,color:C.acc,minWidth:40,textAlign:"right"}}>{p.qty} db</span>{p.allegroLink&&<a href={p.allegroLink} target="_blank" rel="noreferrer" style={{fontSize:10,color:C.blue,textDecoration:"none"}}>🔍</a>}</div>))}</div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>JÁRMŰ</div><div style={{fontSize:13,color:C.tx}}>{o.car}</div></div></div>)}</div>)})}</div>
    <div style={{marginTop:8,fontSize:11,color:C.mu}}>Kattintson a státuszra a módosításhoz - bármely irányba.</div>
    {statusPicker&&<div onClick={()=>setStatusPicker(null)} style={{position:"fixed",inset:0,zIndex:99}}/>}

      {notify&&(
        <Modal onClose={()=>setNotify(null)} width={480}>
          <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.tx}}>Ügyfél értesítése</div>
              <div style={{fontSize:11,color:C.mu,marginTop:2}}>{notify.order.customer} · {makeId(notify.order.customer,notify.order.zip)} · {ST[notify.newStatus]?.label}</div>
            </div>
            <Btn v="ghost" sz="sm" onClick={()=>setNotify(null)}>✕</Btn>
          </div>
          <div style={{padding:22}}>
            {notifyLoad&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,fontSize:12,color:C.acc}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>⟳</span> AI személyre szabja az üzenetet...</div>}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1}}>ÜZENET AZ ÜGYFÉLNEK</div>
              {!notifyLoad&&<span style={{fontSize:9,background:C.acc+"15",color:C.acc,borderRadius:3,padding:"1px 6px",fontWeight:700}}>✦ AI</span>}
            </div>
            <textarea
              value={notify.msg}
              onChange={e=>setNotify(n=>({...n,msg:e.target.value}))}
              rows={4}
              style={{...inp,resize:"vertical",lineHeight:1.6,marginBottom:14,opacity:notifyLoad?0.5:1}}
            />
            <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,color:C.mu}}>Szerkeszthető · Másolja és küldje el a megfelelő csatornán.</div>
              <div style={{display:"flex",gap:8}}>
                <CopyBtn text={notify.msg}/>
                <Btn v="outline" onClick={()=>setNotify(null)}>Bezár</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}
    {editing&&(
      <Modal onClose={()=>setEditing(null)} width={580}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:C.tx}}>Rendelés szerkesztése</div>
          <Btn v="ghost" sz="sm" onClick={()=>setEditing(null)}>✕</Btn>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="Ügyfél neve" {...e("customer")}/>
            <Field label="Irányítószám" {...e("zip")} placeholder="pl. 2900"/>
            <Field label="Jármű" {...e("car")}/>
            <Field label="Platform">
              <select value={ef.platform||"WhatsApp"} onChange={ev=>setEf(x=>({...x,platform:ev.target.value}))} style={inp}>
                <option>WhatsApp</option><option>Messenger</option><option>Viber</option>
              </select>
            </Field>
            <Field label="Státusz">
              <select value={ef.status||"pending"} onChange={ev=>setEf(x=>({...x,status:ev.target.value}))} style={inp}>
                {SQ.map(s=><option key={s} value={s}>{ST[s].label}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>ALKATRÉSZEK</div>
            {(ef.parts||[]).map((p,pi)=>(
              <div key={pi} style={{display:"grid",gridTemplateColumns:"1fr 55px 160px auto",gap:8,marginBottom:7,alignItems:"center"}}>
                <input
                  value={p.name||""}
                  onChange={ev=>{const ps=[...ef.parts];ps[pi]={...ps[pi],name:ev.target.value};setEf(x=>({...x,parts:ps}));}}
                  placeholder="Alkatrész neve"
                  style={{...inp,fontSize:12}}
                />
                <input
                  type="number"
                  value={p.qty||1}
                  onChange={ev=>{const ps=[...ef.parts];ps[pi]={...ps[pi],qty:parseInt(ev.target.value)||1};setEf(x=>({...x,parts:ps}));}}
                  placeholder="db"
                  style={{...inp,fontSize:12,textAlign:"center",padding:"9px 6px"}}
                />
                <input
                  value={p.allegroLink||""}
                  onChange={ev=>{const ps=[...ef.parts];ps[pi]={...ps[pi],allegroLink:ev.target.value};setEf(x=>({...x,parts:ps}));}}
                  placeholder="Allegro link (opt.)"
                  style={{...inp,fontSize:11}}
                />
                <button
                  onClick={e=>{e.preventDefault();e.stopPropagation();setEf(x=>({...x,parts:x.parts.filter((_,j)=>j!==pi)}));}}
                  disabled={(ef.parts||[]).length<=1}
                  style={{background:"transparent",border:"none",color:(ef.parts||[]).length<=1?C.mu:C.acc,cursor:(ef.parts||[]).length<=1?"not-allowed":"pointer",fontSize:16,padding:"4px 8px",lineHeight:1,transition:"color 0.15s"}}
                  title={(ef.parts||[]).length<=1?"Legalább egy tétel szükséges":"Törlés"}
                >✕</button>
              </div>
            ))}
            <Btn v="subtle" sz="sm" onClick={()=>setEf(x=>({...x,parts:[...(x.parts||[]),{name:"",qty:1,allegroLink:""}]}))}>
              + Alkatrész hozzáadása
            </Btn>
          </div>

          <Field label="Megjegyzés" {...e("note")} rows={2} placeholder="Belső megjegyzés..."/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="outline" onClick={()=>setEditing(null)}>Mégse</Btn>
            <Btn onClick={saveEdit} disabled={!(ef.parts||[]).some(p=>p.name?.trim())}>Mentés</Btn>
          </div>
        </div>
      </Modal>
    )}
    {del&&(<Modal onClose={()=>setDel(null)} width={360}><div style={{padding:28,textAlign:"center"}}><div style={{fontSize:28,marginBottom:12}}>⚠</div><div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:8}}>Törli a rendelést?</div><div style={{fontSize:13,color:C.mu,marginBottom:22}}>Ez a művelet nem visszavonható.</div><div style={{display:"flex",gap:8,justifyContent:"center"}}><Btn v="outline" onClick={()=>setDel(null)}>Mégse</Btn><Btn v="danger" onClick={()=>{onDelete(del);setDel(null);}}>Törlés</Btn></div></div></Modal>)}
  </div>);
}

function Krakow({orders,onChange}){
  const items=orders.filter(o=>o.status==="krakow");
  return(<div><PH sub="Átvételre váró csomagok Krakkóban">Krakkói raktár</PH>{items.length===0?(<div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center"}}><div style={{fontSize:28,marginBottom:10}}>📦</div><div style={{color:C.mu,fontSize:13}}>Nincs csomag a raktárban.</div></div>):(<><div style={{background:C.purple+"10",border:`1px solid ${C.purple}22`,borderRadius:8,padding:"12px 16px",marginBottom:16}}><span style={{color:C.purple,fontWeight:700,fontSize:13}}>📦 {items.length} csomag vár a raktárban</span></div><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>{items.map((o,i)=>(<div key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<items.length-1?`1px solid ${C.bd}`:"none"}}><PBadge p={o.platform}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.tx}}>{o.customer}</div><div style={{fontSize:11,color:C.mu}}>{o.part} · {o.qty} db</div></div><Btn v="outline" sz="sm" onClick={()=>onChange(o.id,{status:"transit"})}>🚗 Úton van</Btn></div>))}</div><Btn full onClick={()=>items.forEach(o=>onChange(o.id,{status:"transit"}))}>🚗 Összes csomag - fuvar indítása</Btn></>)}</div>);
}

function PriceCalculator(){
  const[pln,setPln]=useState("");
  const[markup,setMarkup]=useState(20);
  const[perMarkup,setPerMarkup]=useState({}); // {HUF:16,EUR:null,RON:null,...} null=use global
  const[rates,setRates]=useState({});
  const[fixed,setFixed]=useState({}); // {HUF:{on:false,val:""},EUR:{on:false,val:""},...}
  const[status,setStatus]=useState("idle");
  const[lastFetch,setLastFetch]=useState(null);

  const BUILTIN={HUF:92.5,EUR:0.233,RON:1.16,UAH:9.87,RSD:27.3,CZK:5.82};
  useEffect(()=>{
    db.get("calc_fixed",true).then(d=>{ if(d) setFixed(d); });
    db.get("calc_markup",true).then(d=>{ if(d!=null) setMarkup(d); });
    db.get("calc_per_markup",true).then(d=>{ if(d) setPerMarkup(d); });
  },[]);

  const saveFixed=(next)=>{ setFixed(next); db.set("calc_fixed",next,true); };
  const saveMarkup=(v)=>{ setMarkup(v); db.set("calc_markup",v,true); };
  const savePerMarkup=(code,val)=>{ const next={...perMarkup,[code]:val===''?null:parseFloat(val)}; setPerMarkup(next); db.set("calc_per_markup",next,true); };
  const effectiveMarkup=(code)=>{ const v=perMarkup[code]; return (v!=null&&!isNaN(v))?v:markup; };

  const fetchRates=async()=>{
    setStatus("loading");
    try{
      const ecbCodes=["HUF","EUR","RON","CZK"];
      const r1=await fetch(`https://api.frankfurter.app/latest?from=PLN&to=${ecbCodes.join(",")}`);
      if(!r1.ok) throw new Error();
      const d1=await r1.json();
      const combined={...d1.rates};
      try{
        const r2=await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/pln.json");
        if(r2.ok){const d2=await r2.json();if(d2.pln?.uah)combined["UAH"]=d2.pln.uah;if(d2.pln?.rsd)combined["RSD"]=d2.pln.rsd;}
      }catch{combined["UAH"]=BUILTIN.UAH;combined["RSD"]=BUILTIN.RSD;}
      setRates(combined);setLastFetch(new Date());setStatus("live");return;
    }catch{}
    try{
      const r=await fetch("https://open.er-api.com/v6/latest/PLN");
      if(!r.ok) throw new Error();
      const d=await r.json();
      if(d.result!=="success") throw new Error();
      setRates(d.rates);setLastFetch(new Date());setStatus("live");return;
    }catch{}
    setRates(BUILTIN);setLastFetch(new Date());setStatus("fallback");
  };

  // Expose current rates+markup to other components via db
  useEffect(()=>{
    if(Object.keys(rates).length>0){
      db.set("calc_live_rates",JSON.stringify({rates,markup,perMarkup,fixed}),true);
    }
  },[rates,markup,perMarkup,fixed]);

  const effectiveRate=(code)=>{
    const f=fixed[code];
    if(f?.on && f?.val && parseFloat(f.val)>0) return parseFloat(f.val);
    return rates[code]||null;
  };

  const toggleFix=(code)=>{
    const cur=fixed[code]||{on:false,val:""};
    const liveRate=rates[code];
    const newVal=!cur.on&&liveRate ? (liveRate>=1?liveRate.toFixed(4):liveRate.toFixed(6)) : cur.val;
    saveFixed({...fixed,[code]:{on:!cur.on,val:newVal}});
  };

  const setFixVal=(code,val)=>{
    saveFixed({...fixed,[code]:{...(fixed[code]||{on:true}),val}});
  };

  const fmtAmt=(code,val,dec)=>{
    const sym=SYMBOLS[code]||code;
    if(dec===0) return Math.round(val).toLocaleString("hu-HU")+" "+sym;
    return val.toFixed(dec)+" "+sym;
  };

  const plnVal=parseFloat(pln)||0;
  const mult=1+(markup/100);
  const hasRates=Object.keys(rates).length>0;
  const ts=lastFetch?.toLocaleTimeString("hu",{hour:"2-digit",minute:"2-digit"});

  const statusCfg={
    idle:    {dot:C.mu,   text:"Kattintson az élő árfolyam letöltéséhez"},
    loading: {dot:C.amber,text:"Letöltés folyamatban..."},
    live:    {dot:C.green,text:`Élő árfolyam - ${ts} · frankfurter.app`},
    fallback:{dot:C.amber,text:`Beépített árfolyam - ${ts} · élő forrás nem elérhető`},
    error:   {dot:C.red,  text:"Nem sikerült letölteni."},
  }[status]||{dot:C.mu,text:""};

  return(
    <div>
      <PH sub="PLN átváltása a szomszédos országok pénznemeibe, felárral">Árkalkulátor</PH>

      <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:20,alignItems:"start"}}>

        {/* -- LEFT: controls -- */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* PLN input */}
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:8}}>ÖSSZEG ZLOTIBAN</div>
            <div style={{position:"relative"}}>
              <input type="number" value={pln} onChange={e=>setPln(e.target.value)} placeholder="0.00" min="0" step="0.01"
                style={{...inp,fontSize:26,fontWeight:700,paddingRight:52,height:54}}/>
              <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.mu,fontWeight:700,pointerEvents:"none"}}>PLN</span>
            </div>
          </div>

          {/* Markup */}
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>FELÁR</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <input type="range" min="0" max="100" step="1" value={markup} onChange={e=>saveMarkup(parseInt(e.target.value))}
                style={{flex:1,accentColor:C.acc,cursor:"pointer"}}/>
              <div style={{fontSize:22,fontWeight:800,color:C.acc,minWidth:48,textAlign:"right"}}>{markup}%</div>
            </div>
            <div style={{fontSize:11,color:C.mu,marginTop:8}}>PLN × árfolyam × {mult.toFixed(2)} = végső ár</div>
          </div>

          {/* Fetch button + status */}
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>ÉLŐ ÁRFOLYAM</div>
            <button onClick={fetchRates} disabled={status==="loading"} style={{width:"100%",height:44,background:status==="live"?C.green+"22":status==="fallback"?C.amber+"22":C.acc,color:status==="live"?C.green:status==="fallback"?C.amber:"#fff",border:status==="live"?`1px solid ${C.green}40`:status==="fallback"?`1px solid ${C.amber}40`:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:status==="loading"?"not-allowed":"pointer",fontFamily:F,marginBottom:10}}>
              {status==="loading"?"⟳  Letöltés folyamatban...":(status==="live"||status==="fallback")?"↺  Frissítés":"⬇  Árfolyam letöltése"}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:C.mu}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:statusCfg.dot,flexShrink:0}}/>
              {statusCfg.text}
            </div>
          </div>

          {/* Fixed rates summary */}
          {Object.values(fixed).some(f=>f?.on)&&(
            <div style={{background:C.acc+"10",border:`1px solid ${C.acc}25`,borderRadius:10,padding:14}}>
              <div style={{fontSize:10,color:C.acc,fontWeight:700,letterSpacing:1,marginBottom:8}}>RÖGZÍTETT ÁRFOLYAMOK</div>
              {CURRENCIES.filter(cur=>fixed[cur.code]?.on).map(cur=>(
                <div key={cur.code} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.t2,marginBottom:4}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5}}>{cur.countries.slice(0,2).map((cc,i)=><Flag key={i} code={cc} sm/>)} {cur.code}</span>
                  <span style={{color:C.acc,fontWeight:700}}>1 PLN = {fixed[cur.code]?.val} {cur.code}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* -- RIGHT: currency cards always visible -- */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {!hasRates&&(
            <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:32,textAlign:"center",marginBottom:4}}>
              <div style={{fontSize:24,marginBottom:8}}>💱</div>
              <div style={{color:C.mu,fontSize:13}}>Töltse le az árfolyamot, vagy adjon meg fix értéket.</div>
            </div>
          )}
          {CURRENCIES.map(cur=>{
            const fx=fixed[cur.code]||{on:false,val:""};
            const liveRate=rates[cur.code];
            const eff=effectiveRate(cur.code);
            const isFixed=fx.on;
            const base=plnVal*(eff||0);
            const effMup=effectiveMarkup(cur.code);
            const withMarkup=base*(1+effMup/100);
            const rateDisplay=eff?(eff>=100?`1 PLN = ${eff.toFixed(1)} ${cur.code}`:eff>=1?`1 PLN = ${eff.toFixed(4)} ${cur.code}`:`1 PLN = ${eff.toFixed(6)} ${cur.code}`):"-";
            const borderCol=isFixed?C.acc:cur.home?C.green:cur.accent;
            return(
              <div key={cur.code} style={{background:cur.home?C.green+"08":C.s1,border:`1px solid ${isFixed?C.acc+"55":cur.home?C.green+"30":C.bd}`,borderRadius:10,padding:16,borderLeft:`3px solid ${borderCol}`,transition:"all 0.2s"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>

                  {/* Country flags + name */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,flexWrap:"wrap"}}>
                      {cur.countries.map((cc,i)=><Flag key={i} code={cc}/>)}
                      <span style={{background:(isFixed?C.acc:cur.accent)+"20",color:isFixed?C.acc:cur.accent,border:`1px solid ${(isFixed?C.acc:cur.accent)}30`,borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:800}}>{cur.code}</span>
                      {cur.home&&<span style={{background:C.green+"15",color:C.green,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:800,letterSpacing:0.5}}>SAJÁT</span>}
                      {isFixed&&<span style={{background:C.acc+"15",color:C.acc,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:800,letterSpacing:0.5}}>RÖGZÍTETT</span>}
                    </div>
                    <div style={{fontSize:10,color:C.mu}}>{cur.name}</div>
                  </div>

                  {/* Result amount */}
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {eff&&plnVal>0?(
                      <div style={{fontSize:22,fontWeight:800,color:cur.home?C.green:C.tx,letterSpacing:-0.5}}>{fmtAmt(cur.code,withMarkup,cur.decimals)}</div>
                    ):(
                      <div style={{fontSize:16,fontWeight:700,color:C.mu}}>- {cur.code}</div>
                    )}
                    {eff&&plnVal>0&&markup>0&&(
                      <div style={{fontSize:10,color:C.mu,marginTop:1}}>Alap: {fmtAmt(cur.code,base,cur.decimals)}</div>
                    )}
                  </div>

                </div>

                {/* Rate row + fix toggle */}
                <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${isFixed?C.acc+"30":C.bd}`,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,fontSize:11,color:isFixed?C.acc:C.mu}}>{rateDisplay}{isFixed&&liveRate&&<span style={{color:C.mu,marginLeft:6}}>(élő: {liveRate>=1?liveRate.toFixed(4):liveRate.toFixed(6)})</span>}</div>
                  <div onClick={()=>toggleFix(cur.code)} style={{width:32,height:18,borderRadius:9,background:isFixed?C.acc:C.bd2,position:"relative",transition:"background 0.2s",cursor:"pointer",flexShrink:0}}>
                    <div style={{position:"absolute",top:2,left:isFixed?14:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                  </div>
                  <span style={{fontSize:10,color:isFixed?C.acc:C.mu,fontWeight:700,userSelect:"none",cursor:"pointer"}} onClick={()=>toggleFix(cur.code)}>Fix</span>
                </div>

                {/* Per-currency markup */}
                <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontSize:10,color:C.mu,fontWeight:700,whiteSpace:"nowrap"}}>Felár:</div>
                  <input type="number" value={perMarkup[cur.code]??""} onChange={e=>savePerMarkup(cur.code,e.target.value)} placeholder={markup+"%"} min="0" max="200" step="1"
                    style={{...inp,fontSize:12,fontWeight:700,color:perMarkup[cur.code]!=null?C.acc:C.mu,width:60,height:30,padding:"4px 8px",textAlign:"center"}}/>
                  <div style={{fontSize:10,color:C.mu}}>% {perMarkup[cur.code]!=null?<span style={{color:C.acc}}>egyéni</span>:<span>← globális</span>}</div>
                  {perMarkup[cur.code]!=null&&<button onClick={()=>savePerMarkup(cur.code,"")} style={{background:"transparent",border:"none",color:C.mu,cursor:"pointer",fontSize:10,fontFamily:F}}>törlés</button>}
                </div>

                {/* Fixed rate input */}
                {isFixed&&(
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:10,color:C.acc,fontWeight:700,whiteSpace:"nowrap"}}>1 PLN =</div>
                    <input type="number" value={fx.val} onChange={e=>setFixVal(cur.code,e.target.value)} placeholder="pl. 92.5" step="any"
                      style={{...inp,fontSize:14,fontWeight:700,color:C.acc,border:`1px solid ${C.acc}50`,background:C.acc+"08",flex:1,height:36}}/>
                    <div style={{fontSize:10,color:C.acc,fontWeight:700}}>{cur.code}</div>
                    {liveRate&&(
                      <button onClick={()=>setFixVal(cur.code,liveRate>=1?liveRate.toFixed(4):liveRate.toFixed(6))} style={{background:C.s3,border:`1px solid ${C.bd}`,borderRadius:5,padding:"4px 8px",fontSize:10,color:C.mu,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>
                        Élő beállítása
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

function Templates(){
  const[plTpl,setPlTpl]=useState(null);
  const[huTpl,setHuTpl]=useState(null);
  const[editing,setEditing]=useState(null); // {lang,id,title,text} or {lang,"new",title:"",text:""}
  const[ready,setReady]=useState(false);

  useEffect(()=>{
    Promise.all([
      db.get("tpl_pl",true),
      db.get("tpl_hu",true),
    ]).then(([pl,hu])=>{
      setPlTpl(pl||PL_TPL);
      setHuTpl(hu||HU_TPL);
      setReady(true);
    });
  },[]);

  const savePl=(items)=>{setPlTpl(items);db.set("tpl_pl",items,true);};
  const saveHu=(items)=>{setHuTpl(items);db.set("tpl_hu",items,true);};
  const getList=(lang)=>lang==="pl"?(plTpl||PL_TPL):(huTpl||HU_TPL);
  const setList=(lang,items)=>lang==="pl"?savePl(items):saveHu(items);

  const startEdit=(lang,item)=>setEditing({lang,...item});
  const startNew=(lang)=>setEditing({lang,id:"new",title:"",text:""});
  const cancelEdit=()=>setEditing(null);

  const saveEdit=()=>{
    if(!editing)return;
    const list=getList(editing.lang);
    if(editing.id==="new"){
      setList(editing.lang,[...list,{id:Date.now(),title:editing.title,text:editing.text}]);
    } else {
      setList(editing.lang,list.map(t=>t.id===editing.id?{...t,title:editing.title,text:editing.text}:t));
    }
    setEditing(null);
  };

  const deleteTpl=(lang,id)=>{
    const list=getList(lang);
    setList(lang,list.filter(t=>t.id!==id));
  };

  const Section=({lang,title,items})=>(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,color:C.mu,letterSpacing:0.5}}>{title}</div>
        <Btn v="subtle" sz="sm" onClick={()=>startNew(lang)} style={{fontSize:10,padding:"3px 10px"}}>+ Új sablon</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(items||[]).map(t=>(
          <div key={t.id} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:8,padding:"13px 15px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7,gap:8}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx,flex:1}}>{t.title}</div>
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <CopyBtn text={t.text}/>
                <button onClick={()=>startEdit(lang,t)} style={{background:"transparent",border:`1px solid ${C.bd}`,borderRadius:4,padding:"2px 7px",fontSize:10,color:C.mu,cursor:"pointer",fontFamily:F}}>✎</button>
                <button onClick={()=>deleteTpl(lang,t.id)} style={{background:"transparent",border:`1px solid ${C.bd}`,borderRadius:4,padding:"2px 7px",fontSize:10,color:C.acc,cursor:"pointer",fontFamily:F}}>✕</button>
              </div>
            </div>
            <div style={{fontSize:12,color:C.mu,lineHeight:1.65}}>{t.text}</div>
          </div>
        ))}
        {(!items||items.length===0)&&<div style={{fontSize:12,color:C.mu,textAlign:"center",padding:16}}>Nincs sablon. Hozzon létre egyet.</div>}
      </div>
    </div>
  );

  if(!ready) return <div style={{color:C.mu,padding:40,textAlign:"center"}}>Betöltés...</div>;
  return(
    <div>
      <PH sub="Szerkeszthető lengyel és magyar üzenet sablonok">Sablonok</PH>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <Section lang="pl" title="🇵🇱 Lengyel - eladóknak" items={plTpl}/>
        <Section lang="hu" title="🇭🇺 Magyar - ügyfeleknek" items={huTpl}/>
      </div>

      {editing&&(
        <Modal onClose={cancelEdit} width={500}>
          <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{editing.id==="new"?"Új sablon":"Sablon szerkesztése"}</div>
            <Btn v="ghost" sz="sm" onClick={cancelEdit}>✕</Btn>
          </div>
          <div style={{padding:22,display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Sablon neve" value={editing.title} onChange={v=>setEditing(e=>({...e,title:v}))} placeholder="pl. Elérhetőség kérdése"/>
            <Field label="Üzenet szövege" value={editing.text} onChange={v=>setEditing(e=>({...e,text:v}))} rows={5} placeholder="Sablon szövege..."/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn v="outline" onClick={cancelEdit}>Mégse</Btn>
              <Btn onClick={saveEdit} disabled={!editing.title||!editing.text}>Mentés</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const BF={partName:"",category:"",_catParent:"",serialNumber:"",serialNumberVerified:"",serialNumberWarning:"",serialNumberConfidence:"",car:"",condition:"Jó",price:"",estimatedPriceHUF:"",priceNote:"",contact:"",pickup:"",description:""};
function CatalogueManager({user}){
  const[items,setItems]=useState([]);
  const[learned,setLearned]=useState({});
  const[showForm,setShowForm]=useState(false);
  const[images,setImages]=useState([]);
  const[analyzing,setAnalyzing]=useState(false);
  const[form,setForm]=useState(BF);
  const[saving,setSaving]=useState(false);
  const[detail,setDetail]=useState(null);
  const fileRef=useRef();

  useEffect(()=>{
    db.get("catalogue_items",true).then(async d=>{
      const meta=Array.isArray(d)?d:[];
      // load images per item separately
      const withImages=await Promise.all(meta.map(async item=>{
        const imgs=await db.get("catalogue_img_"+item.id,true);
        return {...item,images:Array.isArray(imgs)?imgs:[]};
      }));
      setItems(withImages);
    });
    db.get("parts_learned",true).then(d=>setLearned(d&&typeof d==="object"?d:{}));
  },[]);

  const saveLearn=async(serial,car,partName)=>{
    if(!serial||!car)return;
    const updated={...learned,[serial.toUpperCase()]:{car,partName,confirmedAt:new Date().toISOString()}};
    setLearned(updated);
    await db.set("parts_learned",updated,true);
  };

  const setField=(k,v)=>{
    setForm(x=>({...x,[k]:v}));
    if(k==="car"&&form.serialNumber) saveLearn(form.serialNumber,v,form.partName);
    if(k==="partName"&&form.serialNumber&&form.car) saveLearn(form.serialNumber,form.car,v);
  };
  const f=(k)=>({value:form[k]||"",onChange:v=>setField(k,v)});

  // Compress image to max 700px before storing
  const compressImage=(dataUrl)=>new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      const MAX=700;
      const scale=Math.min(1,MAX/Math.max(img.width,img.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.round(img.width*scale);
      canvas.height=Math.round(img.height*scale);
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL("image/jpeg",0.75));
    };
    img.src=dataUrl;
  });

  const handleFiles=async(files)=>{
    const raw=await Promise.all(Array.from(files).map(file=>new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(file);})));
    const compressed=await Promise.all(raw.map(compressImage));
    setImages(prev=>[...prev,...compressed]); // store compressed
    setAnalyzing(true);
    try{
      // Send ORIGINAL uncompressed images to AI for accurate serial reading
      const knownSerials=Object.entries(learned).slice(0,20).map(([s,v])=>`${s} = ${v.car} (${v.partName})`).join("\n");
      const msgContent=[
        ...raw.map(b64=>({type:"image",source:{type:"base64",media_type:b64.split(";")[0].split(":")[1],data:b64.split(",")[1]}})),
        {type:"text",text:`You are an expert auto parts identification specialist.\n\nSTEP 1 - READ SERIAL:\n- Read every character digit by digit exactly as stamped/engraved/printed\n- Common misreads to avoid: 0 vs O, 1 vs I vs l, 5 vs 6, 6 vs 5, 8 vs B, 2 vs Z\n- Note any ambiguous characters in serialNumberWarning\n\nSTEP 2 - LOOK UP SERIAL IN YOUR KNOWLEDGE BASE:\n- Search your training data for this exact OEM/part number\n- What part does this number correspond to? (manufacturer catalog knowledge)\n- Does it match what you visually see in the image? Flag any mismatch in serialNumberVerified\n- What is the retail/wholesale price range for this part in PLN?\n\nSTEP 3 - IDENTIFY CAR FROM SERIAL (OEM prefix knowledge):\n- Mercedes-Benz: A + 3-digit chassis (A205=C-Class W205 2014-2021, A213=E-Class W213 2016+, A166=ML/GL W166, A176=A-Class W176, A117=CLA, A172=SLK)\n- VW/Skoda/Seat: 1K=Golf V/VI MkV, 5K=Golf VI, 5Q=Golf VII, 8P=Audi A3 8P, 8V=Audi A3 8V, 3C=Passat B6\n- BMW: 31xx=E90/E91 3-series, 34xx=brakes, prefix 51=body, 3310=steering; generation from last 2 digits of number\n- Opel: 13xxx, 90xxx series\n- Ford: 1xxx, 2xxx series\n- Use prefix + your knowledge to give FULL: Make + Model + Generation code + Year range\n- e.g. Mercedes-Benz C-Class W205 2014-2021, BMW 3 Series E90 2005-2012\n- NEVER just a brand name - always include model + generation\n- If truly unknown after lookup: null\n${knownSerials?"\\nSTEP 4 - CHECK AGAINST YOUR CORRECTIONS:\\n"+knownSerials:""}\n\nRespond ONLY with valid JSON:\n{"partName":"specific Hungarian part name","serialNumber":"exact digits or null","serialNumberVerified":"cross-reference result","serialNumberWarning":"ambiguous chars or null","serialNumberConfidence":"high/medium/low","car":"make model year or null","condition":"Jó","estimatedPricePLN":0,"estimatedPriceHUF":0,"priceNote":"OEM vs aftermarket range","description":"2-3 sentence Hungarian description"}`}
      ];
      const txt=await ai([{role:"user",content:msgContent}]);
      const d=JSON.parse(txt.replace(/```json|```/g,"").trim());
      setForm(x=>({...x,
        partName:d.partName||"",
        serialNumber:d.serialNumber||"",
        serialNumberVerified:d.serialNumberVerified||"",
        serialNumberWarning:d.serialNumberWarning||"",
        serialNumberConfidence:d.serialNumberConfidence||"",
        car:d.car||"",
        condition:d.condition||"Jó",
        description:d.description||"",
        estimatedPriceHUF:d.estimatedPriceHUF?""+d.estimatedPriceHUF:"",
        priceNote:d.priceNote||"",
      }));
    }catch(e){console.error("AI analyse error:",e);}
    setAnalyzing(false);
  };

  const publish=async()=>{
    if(!form.partName||!form.price)return;
    setSaving(true);
    if(form.serialNumber&&form.car) await saveLearn(form.serialNumber,form.car,form.partName);
    const id=Date.now();
    // Save images separately (keeps catalogue_items small)
    if(images.length>0){
      const ok=await db.set("catalogue_img_"+id,images,true);
      if(!ok)console.warn("Image save may have failed");
    }
    // Save metadata without images
    const{_catParent,...formClean}=form;const item={id,...formClean,images,publishedBy:user?.name||"?",publishedAt:new Date().toISOString(),sold:false};
    const meta={id,...formClean,publishedBy:user?.name||"?",publishedAt:new Date().toISOString(),sold:false};
    const metaList=[meta,...items.map(i=>({...i,images:undefined}))];
    try{
      await db.set("catalogue_items",metaList,true);
    }catch(e){
      console.error("Metadata save failed:",e);
      setSaving(false);
      alert("Mentés sikertelen. Ellenőrizd a kapcsolatot és próbáld újra.");
      return;
    }
    setItems([item,...items]);
    setShowForm(false);setImages([]);setForm(BF);setSaving(false);
  };

  const toggleSold=async(id)=>{const u=items.map(i=>i.id===id?{...i,sold:!i.sold}:i);await db.set("catalogue_items",u.map(i=>({...i,images:undefined})),true);setItems(u);};
  const remove=async(id)=>{const u=items.filter(i=>i.id!==id);await db.set("catalogue_items",u.map(i=>({...i,images:undefined})),true);await db.set("catalogue_img_"+id,[],true);setItems(u);if(detail?.id===id)setDetail(null);};

  const COND_C2={Jó:C.green,Bontott:C.amber,Hibás:C.acc,Felújított:C.blue};
  const condColor=(c)=>COND_C2[c]||C.mu;

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <PH sub="Alkatrészek kezelése és közzététele">Katalógus</PH>
        <div style={{display:"flex",gap:8}}>
          <Btn v="outline" sz="sm" onClick={()=>{setShowForm(false);window.__setPublic?.(true);}}>🌐 Nyilvános nézet</Btn>
          <Btn onClick={()=>setShowForm(f=>!f)}>{showForm?"✕ Mégse":"+ Új alkatrész"}</Btn>
        </div>
      </div>

      {/* Upload form */}
      {showForm&&(
        <div style={{background:C.s1,border:`1px solid ${C.acc}25`,borderRadius:10,padding:22,marginBottom:20}}>
          <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:14}}>ÚJ ALKATRÉSZ</div>

          {/* Image upload */}
          <div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${images.length?C.acc:C.bd2}`,borderRadius:8,padding:16,textAlign:"center",cursor:"pointer",marginBottom:16}}>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
            {images.length?(
              <div>
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:8}}>
                  {images.map((src,i)=>(
                    <div key={i} style={{position:"relative"}}>
                      <img src={src} alt="" style={{height:72,width:72,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bd}`}}/>
                      <button onClick={ev=>{ev.stopPropagation();setImages(imgs=>imgs.filter((_,j)=>j!==i));}} style={{position:"absolute",top:-6,right:-6,background:C.acc,color:"#fff",border:"none",borderRadius:"50%",width:18,height:18,cursor:"pointer",fontSize:9,fontFamily:F}}>✕</button>
                    </div>
                  ))}
                  <div style={{height:72,width:72,border:`2px dashed ${C.bd2}`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:C.mu,fontSize:22}}>+</div>
                </div>
                <div style={{fontSize:11,color:analyzing?C.amber:C.green,fontWeight:600}}>{analyzing?"⟳ AI elemzés folyamatban...":"✓ Feltöltve - szerkeszd az adatokat"}</div>
              </div>
            ):(
              <div>
                <div style={{fontSize:24,marginBottom:6}}>📷</div>
                <div style={{fontSize:13,color:C.mu}}>Kattints a képek feltöltéséhez - AI automatikusan felismeri az alkatrészt</div>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <Field label="Alkatrész neve" {...f("partName")} placeholder="pl. Első féktárcsa"/><Field label="Kategória">
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <select value={form._catParent||""} onChange={e=>{setForm(x=>({...x,_catParent:e.target.value,category:""}));}} style={{...inp,fontSize:12}}>
      <option value="">-- Főkategória --</option>
      {PART_CAT_TREE.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
    </select>
    {form._catParent&&(
      <select value={form.category||""} onChange={e=>setField("category",e.target.value)} style={{...inp,fontSize:12}}>
        <option value="">-- Alkategória --</option>
        {(PART_CAT_TREE.find(c=>c.id===form._catParent)?.sub||[]).map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    )}
    {form.category&&<div style={{fontSize:10,color:C.green,marginTop:2}}>✓ {form.category}</div>}
  </div>
</Field>
            <Field label="Sorozatszám / OEM" {...f("serialNumber")} placeholder="pl. 1K0615301AA"/>
            {form.serialNumberWarning&&<div style={{gridColumn:"1/-1",background:C.amber+"10",border:`1px solid ${C.amber}25`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.amber}}>⚠ {form.serialNumberWarning}</div>}
            {form.serialNumberVerified&&<div style={{gridColumn:"1/-1",background:C.green+"08",border:`1px solid ${C.green}20`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.t2}}>✓ Ellenőrzés: {form.serialNumberVerified}</div>}
            {form.serialNumber&&learned[form.serialNumber.toUpperCase()]&&(
              <div style={{gridColumn:"1/-1",background:C.green+"08",border:`1px solid ${C.green}20`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.green,display:"flex",alignItems:"center",gap:6}}>
                <span>🧠</span>
                <span>Tanult: <strong>{learned[form.serialNumber.toUpperCase()].car}</strong> · {learned[form.serialNumber.toUpperCase()].partName}</span>
                <button onClick={()=>setForm(x=>({...x,car:learned[form.serialNumber.toUpperCase()].car,partName:learned[form.serialNumber.toUpperCase()].partName}))} style={{marginLeft:"auto",background:C.green+"20",color:C.green,border:"none",borderRadius:4,padding:"2px 8px",fontSize:10,cursor:"pointer",fontFamily:F}}>Alkalmaz</button>
              </div>
            )}
            <Field label="Kompatibilis jármű" {...f("car")} placeholder="pl. VW Golf VII 2013-2020"/>
            <Field label="Állapot">
              <select value={form.condition||"Jó"} onChange={e=>setField("condition",e.target.value)} style={inp}>
                {CONDITIONS.map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Ár (Ft)" {...f("price")} placeholder="pl. 25000"/>
            {form.estimatedPriceHUF&&!form.price&&(
              <div style={{gridColumn:"1/-1",background:C.blue+"08",border:`1px solid ${C.blue}20`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.t2,display:"flex",alignItems:"center",gap:8}}>
                <span>💡 AI árbecslés: ~{Number(form.estimatedPriceHUF).toLocaleString("hu")} Ft{form.priceNote?" - "+form.priceNote:""}</span>
                <button onClick={()=>setField("price",""+form.estimatedPriceHUF)} style={{marginLeft:"auto",background:C.blue+"20",color:C.blue,border:"none",borderRadius:4,padding:"2px 8px",fontSize:10,cursor:"pointer",fontFamily:F}}>Használ</button>
              </div>
            )}
            <Field label="Elérhetőség" {...f("contact")} placeholder="pl. +36 30 123 4567"/>
            <Field label="Átvételi hely" {...f("pickup")} placeholder="pl. Budapest XV."/>
          </div>
          <div style={{marginBottom:14}}><Field label="Leírás" {...f("description")} rows={3}/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="outline" onClick={()=>{setShowForm(false);setImages([]);setForm(BF);}}>Mégse</Btn>
            <Btn onClick={publish} disabled={saving||!form.partName||!form.price}>{saving?"Mentés...":"Közzététel"}</Btn>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length===0&&!showForm&&(
        <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center",color:C.mu}}>
          <div style={{fontSize:32,marginBottom:12}}>🔩</div>
          <div style={{fontSize:13}}>Nincs alkatrész. Kattints az "Új alkatrész" gombra!</div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {items.map(item=>(
          <div key={item.id} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"hidden",opacity:item.sold?0.5:1}}>
            {/* Summary row */}
            <div onClick={()=>setDetail(detail?.id===item.id?null:item)} style={{display:"flex",gap:14,alignItems:"center",padding:"14px 16px",cursor:"pointer"}}>
              {(item.images||[]).slice(0,2).map((src,i)=>(
                <img key={i} src={src} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:7,border:`1px solid ${C.bd}`,flexShrink:0}}/>
              ))}
              {(!item.images||item.images.length===0)&&<div style={{width:52,height:52,background:C.s3,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🔩</div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.partName}</span>{item.category&&<span style={{fontSize:9,background:C.acc+"15",color:C.acc,borderRadius:4,padding:"1px 6px",fontWeight:700,flexShrink:0}}>{item.category}</span>}
                  {item.sold&&<span style={{background:C.mu+"20",color:C.mu,borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:800,flexShrink:0}}>ELADVA</span>}
                  <span style={{background:condColor(item.condition)+"20",color:condColor(item.condition),borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700,flexShrink:0}}>{item.condition}</span>
                </div>
                <div style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {item.car&&<span>🚗 {item.car}</span>}
                  {item.serialNumber&&<span style={{marginLeft:8,fontFamily:"monospace"}}>#{item.serialNumber}</span>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:16,fontWeight:800,color:C.acc}}>{item.price?parseInt(item.price||0).toLocaleString("hu")+" Ft":"-"}</div>
                <div style={{fontSize:10,color:C.mu}}>📍 {item.pickup||"-"}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <Btn v="outline" sz="sm" onClick={e=>{e.stopPropagation();toggleSold(item.id);}}>{item.sold?"Aktív":"Eladva"}</Btn>
                <Btn v="danger" sz="sm" onClick={e=>{e.stopPropagation();remove(item.id);}}>Törlés</Btn>
              </div>
            </div>
            {/* Detail expand */}
            {detail?.id===item.id&&(
              <div style={{borderTop:`1px solid ${C.bd}`,padding:"16px 18px",background:C.s2}}>
                {(item.images||[]).length>0&&(
                  <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                    {item.images.map((src,i)=><img key={i} src={src} alt="" style={{height:90,width:90,objectFit:"cover",borderRadius:8,border:`1px solid ${C.bd}`}}/>)}
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                  {[["Kategória",item.category||"-"],["Jármű",item.car||"-"],["Cikkszám",item.serialNumber||"-"],["Állapot",item.condition],["Ár",item.price?parseInt(item.price||0).toLocaleString("hu")+" Ft":"-"],["Elérhetőség",item.contact||"-"],["Átvétel",item.pickup||"-"]].map(([k,v])=>(
                    <div key={k} style={{background:C.s1,borderRadius:8,padding:"10px 12px"}}>
                      <div style={{fontSize:9,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:3}}>{k.toUpperCase()}</div>
                      <div style={{fontSize:12,color:C.tx,fontWeight:600}}>{v}</div>
                    </div>
                  ))}
                </div>
                {item.description&&<div style={{fontSize:12,color:C.t2,lineHeight:1.65}}>{item.description}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PublicCatalogue({onBack,onAdmin}){
  const[items,setItems]=useState([]);
  const[ld,setLd]=useState(true);
  const[search,setSearch]=useState("");
  const[cond,setCond]=useState("all");
  const[cat,setCat]=useState("all");
  const[make,setMake]=useState("all");
  const[sel,setSel]=useState(null);
  const[imgIdx,setImgIdx]=useState(0);
  const[lang,switchLang,t]=useLang();
  const[theme,setTheme]=useState(_theme);
  const isDark=theme==="dark";

  useEffect(()=>{
    db.get("catalogue_items",true)
      .then(async d=>{
        const meta=Array.isArray(d)?d.filter(i=>!i.sold):[];
        const withImages=await Promise.all(meta.map(async item=>{
          const imgs=await db.get("catalogue_img_"+item.id,true);
          return {...item,images:Array.isArray(imgs)?imgs:[]};
        }));
        console.log("[Autorra] Loaded",withImages.length,"items from storage");setItems(withImages);setLd(false);
      })
      .catch(e=>{console.error("[Autorra] Load error:",e);setItems([]);setLd(false);});
  },[]);

  const shown=items.filter(i=>{
    if(!i||i.sold)return false;
    if(cond!=="all"&&i.condition!==cond)return false;
    if(cat!=="all"){
      // cat could be a parent id (e.g. "Fékrendszer") or a subcategory name (e.g. "Féktárcsa")
      const parentTree=PART_CAT_TREE.find(t=>t.id===cat);
      if(parentTree){
        // Parent selected: show all items in this group
        const valid=[parentTree.label,...parentTree.sub];
        if(!valid.includes(i.category||""))return false;
      } else {
        // Subcategory selected: exact match
        if((i.category||"")!==cat)return false;
      }
    }
    if(make!=="all"&&!(i.car||"").toLowerCase().includes(make.toLowerCase()))return false;
    if(!search)return true;
    return [i.partName,i.car||"",i.serialNumber||"",i.description||"",i.category||""].join(" ").toLowerCase().includes(search.toLowerCase());
  });
  console.log("[Autorra] items total:",items.length,"shown:",shown.length,"cat:",cat,"cond:",cond);

  const bg=isDark?"#0c0c0f":"#f5f5f7";
  const card=isDark?"#111116":"#ffffff";
  const border=isDark?"#22222c":"#e5e5ea";
  const tx=isDark?"#f0f0f8":"#111111";
  const mu=isDark?"#606070":"#888888";
  const surf=isDark?"#16161d":"#fafafa";
  const COND_C2={Új:"#16a34a",Kiváló:"#22c55e",Jó:"#2563eb",Közepes:"#d97706",Hibás:"#dc2626"};
  const condLabel={Új:"New",Kiváló:"Excellent",Jó:"Good",Közepes:"Fair",Hibás:"For parts"};
  const activeFilters=[cond!=="all",cat!=="all",make!=="all",search].filter(Boolean).length;

  return(
    <div style={{minHeight:"100vh",background:bg,fontFamily:F,color:tx}}>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{"*{margin:0;padding:0;box-sizing:border-box}html,body{background:"+bg+";height:100%}"}</style>

      {/* -- Sticky header -- */}
      <header style={{background:isDark?"rgba(12,12,15,0.95)":"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${border}`,position:"sticky",top:0,zIndex:50,padding:"0 24px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",height:58,display:"flex",alignItems:"center",gap:16}}>
          <button onClick={onBack} style={{background:"transparent",border:"none",cursor:"pointer",color:mu,fontSize:13,fontFamily:F,padding:"4px 8px",borderRadius:6,display:"flex",alignItems:"center",gap:4}}>← {t.back.replace("← ","")}</button>
          <div style={{fontSize:18,fontWeight:900,letterSpacing:-0.5,color:tx}}>auto<span style={{color:"#dc2626"}}>rra</span></div>

          <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:"auto"}}>
            <button onClick={()=>switchLang(lang==="hu"?"en":"hu")} style={{background:surf,border:`1px solid ${border}`,borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",color:mu,fontFamily:F,letterSpacing:0.5}}>{lang==="hu"?"EN":"HU"}</button>
            <button onClick={()=>{const t=theme==="light"?"dark":"light";applyTheme(t);setTheme(t);}} style={{background:surf,border:`1px solid ${border}`,borderRadius:8,padding:"5px 10px",fontSize:13,cursor:"pointer",color:mu,fontFamily:F}}>{theme==="light"?"🌙":"☀"}</button>
            {onAdmin&&<button onClick={onAdmin} style={{background:"transparent",border:`1px solid ${border}`,borderRadius:8,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",color:mu,fontFamily:F}}>Login</button>}
          </div>
        </div>
      </header>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px"}}>

        {/* -- Filter bar -- */}
        <div style={{marginBottom:20}}>
          {/* Search + condition + make row */}
          <div style={{display:"flex",alignItems:"stretch",height:44,border:`1px solid ${border}`,borderBottom:0}}>
            <div style={{position:"relative",flex:"2 1 200px",borderRight:`1px solid ${border}`}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search} style={{width:"100%",height:"100%",padding:"0 12px 0 30px",border:"none",background:surf,color:tx,fontSize:13,fontFamily:F,outline:"none"}}/>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:mu,pointerEvents:"none"}}>&#8981;</span>
              {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:mu,cursor:"pointer",fontSize:12,fontFamily:F,padding:0}}>&#x2715;</button>}
            </div>
            <select value={cond} onChange={e=>setCond(e.target.value)} style={{flex:"1 1 120px",padding:"0 10px",border:"none",borderRight:`1px solid ${border}`,background:cond!=="all"?"#dc262606":surf,color:cond!=="all"?"#dc2626":isDark?"#bbb":"#333",fontSize:12,fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none"}}>
              <option value="all">{t.allCond}</option>
              {CONDITIONS.map(c=><option key={c} value={c}>{lang==="en"?(condLabel[c]||c):c}</option>)}
            </select>
            <select value={make} onChange={e=>setMake(e.target.value)} style={{flex:"1 1 130px",padding:"0 10px",border:"none",borderRight:activeFilters>0?`1px solid ${border}`:"none",background:make!=="all"?"#dc262606":surf,color:make!=="all"?"#dc2626":isDark?"#bbb":"#333",fontSize:12,fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none"}}>
              <option value="all">{t.allMakes}</option>
              {MAKES.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            {activeFilters>0&&<button onClick={()=>{setCond("all");setCat("all");setMake("all");setSearch("");}} style={{flexShrink:0,padding:"0 14px",border:"none",background:"transparent",color:"#dc2626",fontSize:11,fontFamily:F,cursor:"pointer",fontWeight:700}}>Clear</button>}
          </div>

          {/* Category browser — parent + subcategory two-level panel */}
          <div style={{display:"flex",border:`1px solid ${border}`,borderBottom:`2px solid ${isDark?"#1e1e1e":"#e0e0e0"}`}}>
            {/* Left: parent categories */}
            <div style={{width:170,flexShrink:0,borderRight:`1px solid ${border}`}}>
              {[{id:"all",label:lang==="en"?"All parts":"Minden alkatrész"},...PART_CAT_TREE].map(c=>{
                const isActive=cat===c.id||(cat!=="all"&&c.id!=="all"&&PART_CAT_TREE.find(t=>t.id===c.id)?.sub?.some(s=>cat===s));
                return(
                  <button key={c.id} onClick={()=>setCat(c.id)} style={{display:"block",width:"100%",textAlign:"left",padding:"9px 14px",border:"none",borderBottom:`1px solid ${border}`,background:isActive?"#dc262610":"transparent",color:isActive?"#dc2626":isDark?"#aaa":"#444",fontSize:12,fontWeight:isActive?700:400,cursor:"pointer",fontFamily:F,letterSpacing:0.1}}>
                    {c.label}
                    {c.sub&&<span style={{float:"right",opacity:0.4,fontSize:10}}>{c.sub.length}</span>}
                  </button>
                );
              })}
            </div>
            {/* Right: subcategories for selected parent */}
            <div style={{flex:1,padding:"8px 0",display:"flex",flexWrap:"wrap",alignContent:"flex-start",gap:0}}>
              {cat==="all"?(
                <div style={{padding:"12px 16px",fontSize:12,color:mu,display:"flex",alignItems:"center"}}>
                  {lang==="en"?"Select a category to filter subcategories":"Válassz kategóriát az alkategóriák szűréséhez"}
                </div>
              ):(()=>{
                const tree=PART_CAT_TREE.find(t=>t.id===cat);
                if(!tree)return null;
                return tree.sub.map(s=>(
                  <button key={s} onClick={()=>setCat(s===cat?cat:s)} style={{padding:"7px 14px",margin:"3px 4px",border:`1px solid ${s===cat?"#dc2626":border}`,background:s===cat?"#dc2626":"transparent",color:s===cat?"#fff":isDark?"#bbb":"#444",fontSize:11,fontFamily:F,cursor:"pointer",borderRadius:3,fontWeight:s===cat?700:400,transition:"all 0.1s"}}>{s}</button>
                ));
              })()}
            </div>
          </div>

          {/* Result count */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 12px",background:isDark?"#0d0d12":"#f5f5f8",border:`1px solid ${border}`,borderTop:0}}>
            <span style={{fontSize:10,color:mu,fontWeight:500,letterSpacing:0.3}}>{shown.length} {lang==="en"?"RESULTS":"TALÁLAT"}</span>
            {activeFilters>0&&<span style={{fontSize:10,color:"#dc2626",fontWeight:700,letterSpacing:0.3}}>{activeFilters} {lang==="en"?"FILTER":"SZŰRŐ"}</span>}
          </div>
        </div>

        {/* -- Loading -- */}
        {ld&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:80,color:mu}}>
            <div style={{width:36,height:36,border:`3px solid ${border}`,borderTopColor:"#dc2626",borderRadius:"50%",animation:"spin 0.8s linear infinite",marginBottom:16}}/>
            <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
            <div style={{fontSize:14}}>{t.loading}</div>
          </div>
        )}

        {/* -- Empty state -- */}
        {!ld&&shown.length===0&&(
          <div style={{textAlign:"center",padding:"80px 20px",color:mu}}>
            <div style={{fontSize:56,marginBottom:16,opacity:0.3}}>🔩</div>
            <div style={{fontSize:18,fontWeight:700,color:tx,marginBottom:8}}>{t.noResults}</div>
            {activeFilters>0&&<button onClick={()=>{setCond("all");setCat("all");setMake("all");setSearch("");}} style={{marginTop:16,background:"#dc2626",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:F}}>{t.clearFilters}</button>}
          </div>
        )}

        {/* -- Grid -- */}
        {!ld&&shown.length>0&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:20}}>
            {shown.map(item=>(
              <div key={item.id} onClick={()=>{setSel(item);setImgIdx(0);}} style={{background:card,borderRadius:16,overflow:"hidden",border:`1px solid ${border}`,cursor:"pointer",transition:"transform 0.2s,box-shadow 0.2s,border-color 0.2s"}}
                onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=isDark?"0 12px 32px rgba(0,0,0,0.5)":"0 12px 32px rgba(0,0,0,0.1)";e.currentTarget.style.borderColor="#dc2626"+"44";}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor=border;}}>
                {/* Image */}
                <div style={{height:200,background:isDark?"#1a1a22":"#f0f0f5",position:"relative",overflow:"hidden"}}>
                  {item.images?.[0]?<img src={item.images[0]} alt={item.partName} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:52,opacity:0.2}}>🔩</div>}
                  {(item.images?.length||0)>1&&<div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.6)",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>+{item.images.length-1}</div>}
                  <div style={{position:"absolute",top:10,left:10,display:"flex",gap:6}}>
                    <span style={{background:COND_C2[item.condition]||"#888",color:"#fff",borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:800}}>{lang==="en"?(condLabel[item.condition]||item.condition):item.condition}</span>
                  </div>
                  {item.category&&<div style={{position:"absolute",bottom:10,left:10,background:"rgba(0,0,0,0.55)",color:"#fff",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:600}}>{item.category}</div>}
                </div>
                {/* Info */}
                <div style={{padding:"16px 16px 18px"}}>
                  <div style={{fontSize:15,fontWeight:800,color:tx,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.2}}>{item.partName}</div>
                  {item.car&&<div style={{fontSize:12,color:mu,marginBottom:3}}>{item.car}</div>}
                  {item.serialNumber&&<div style={{fontSize:10,color:mu,fontFamily:"monospace",marginBottom:10,opacity:0.7}}>#{item.serialNumber}</div>}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:8,borderTop:`1px solid ${border}`,paddingTop:12}}>
                    <div style={{fontSize:20,fontWeight:900,color:"#dc2626",letterSpacing:-0.5}}>{item.price?parseInt(item.price||0).toLocaleString("hu")+" Ft":t.askPrice}</div>
                    <div style={{fontSize:11,color:mu,textAlign:"right"}}>{item.pickup||"-"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* -- Detail modal -- */}
      {sel&&(
        <div onClick={()=>setSel(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16,backdropFilter:"blur(4px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:20,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",border:`1px solid ${border}`}}>
            {/* Images */}
            {(sel.images?.length||0)>0&&(
              <div style={{position:"relative",height:280,background:isDark?"#1a1a22":"#f0f0f5",borderRadius:"20px 20px 0 0",overflow:"hidden"}}>
                <img src={sel.images[imgIdx]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                {sel.images.length>1&&(
                  <>
                    <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i-1+sel.images.length)%sel.images.length);}} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:18,fontFamily:F}}>‹</button>
                    <button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i+1)%sel.images.length);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:18,fontFamily:F}}>›</button>
                    <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>
                      {sel.images.map((_,i)=><div key={i} onClick={e=>{e.stopPropagation();setImgIdx(i);}} style={{width:7,height:7,borderRadius:"50%",background:i===imgIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer"}}/>)}
                    </div>
                  </>
                )}
                <button onClick={()=>setSel(null)} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,fontFamily:F}}>✕</button>
                <span style={{position:"absolute",top:12,left:12,background:COND_C2[sel.condition]||"#888",color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:800}}>{lang==="en"?(condLabel[sel.condition]||sel.condition):sel.condition}</span>
              </div>
            )}
            {/* Content */}
            <div style={{padding:"24px 24px 28px"}}>
              {sel.category&&<div style={{fontSize:11,fontWeight:700,color:"#dc2626",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{sel.category}</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <h2 style={{fontSize:22,fontWeight:900,color:tx,lineHeight:1.2,flex:1,marginRight:12}}>{sel.partName}</h2>
              </div>
              {sel.car&&<div style={{fontSize:13,color:mu,marginBottom:10}}><strong style={{color:tx}}>{sel.car}</strong></div>}
              {sel.serialNumber&&<div style={{background:isDark?"#1a1a22":"#f4f4f8",borderRadius:8,padding:"8px 14px",fontSize:12,fontFamily:"monospace",color:mu,marginBottom:14,display:"flex",gap:8,alignItems:"center"}}><span style={{opacity:0.6}}>#</span>{sel.serialNumber}</div>}
              {sel.description&&<p style={{fontSize:14,color:isDark?"#c8c8d8":"#444",lineHeight:1.7,marginBottom:18}}>{sel.description}</p>}
              <div style={{borderTop:`1px solid ${border}`,paddingTop:18,marginBottom:18}}>
                <div style={{fontSize:28,fontWeight:900,color:"#dc2626",letterSpacing:-0.5,marginBottom:10}}>{sel.price?parseInt(sel.price||0).toLocaleString("hu")+" Ft":t.askPrice}</div>
                {sel.pickup&&<div style={{fontSize:13,color:mu,marginBottom:4}}>{t.pickup}: <strong style={{color:tx}}>{sel.pickup}</strong></div>}
                {sel.contact&&<div style={{fontSize:13,color:mu}}>{t.contact}: <strong style={{color:tx}}>{sel.contact}</strong></div>}
              </div>
              {sel.contact&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <a href={`tel:${sel.contact}`} style={{background:"#dc2626",color:"#fff",borderRadius:10,padding:"13px 0",fontSize:14,fontWeight:800,textDecoration:"none",textAlign:"center",display:"block"}}>{t.call}</a>
                  <a href={`https://wa.me/${(sel.contact||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{background:"#16a34a",color:"#fff",borderRadius:10,padding:"13px 0",fontSize:14,fontWeight:800,textDecoration:"none",textAlign:"center",display:"block"}}>{t.whatsapp}</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SecurityPanel({user}){
  const LOCKOUT_KEY="autorra_login_attempts";
  const[attempts,setAttempts]=useState([]);
  const[blocked,setBlocked]=useState(null); // null or {until, hard}
  const[now,setNow]=useState(Date.now());

  useEffect(()=>{
    const refresh=()=>{
      setNow(Date.now());
      try{setAttempts(JSON.parse(localStorage.getItem(LOCKOUT_KEY)||"[]"));}catch{setAttempts([]);}
    };
    refresh();
    const t=setInterval(refresh,5000);
    return()=>clearInterval(t);
  },[]);

  const unlock=()=>{localStorage.removeItem(LOCKOUT_KEY);setAttempts([]);};

  const recent1h=attempts.filter(t=>now-t<3600000);
  const recent24h=attempts.filter(t=>now-t<86400000);
  const isHardBlocked=recent24h.length>=5;
  const isSoftBlocked=!isHardBlocked&&recent1h.length>=3;
  const nextUnlock=isSoftBlocked?(attempts[attempts.length-3]+3600000):null;
  const minsLeft=nextUnlock?Math.ceil((nextUnlock-now)/60000):0;

  const statusColor=isHardBlocked?C.acc:isSoftBlocked?C.amber:C.green;
  const statusLabel=isHardBlocked?"Zárolt - Admin feloldás szükséges":isSoftBlocked?`Ideiglenes zárolás - ${minsLeft} perc`:"Aktív";

  return(
    <div>
      <PH sub="Bejelentkezési kísérletek és zárolások">Biztonság</PH>

      {/* Status card */}
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:4}}>ÁLLAPOT</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:statusColor}}/>
              <span style={{fontSize:14,fontWeight:700,color:C.tx}}>{statusLabel}</span>
            </div>
          </div>
          {(isHardBlocked||isSoftBlocked)&&(
            <Btn onClick={unlock} v="danger" sz="sm">Feloldás</Btn>
          )}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[["Kísérletek (1h)",recent1h.length,"/ 3"],["Kísérletek (24h)",recent24h.length,"/ 5"],["Összes naplózott",attempts.length,"db"]].map(([label,val,sub])=>(
            <div key={label} style={{background:C.s2,borderRadius:8,padding:"12px 14px"}}>
              <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>{label.toUpperCase()}</div>
              <div style={{fontSize:22,fontWeight:800,color:val>0?C.amber:C.tx}}>{val}</div>
              <div style={{fontSize:10,color:C.mu}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20,marginBottom:16}}>
        <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:14}}>SZABÁLYOK</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            ["3 hibás kísérlet 1 órán belül","1 óra zárolás",C.amber],
            ["5 hibás kísérlet 24 órán belül","Teljes zárolás - admin feloldja",C.acc],
            ["Sikeres bejelentkezés","Számláló nullázódik",C.green],
          ].map(([rule,result,col])=>(
            <div key={rule} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",background:C.s2,borderRadius:7}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:col,flexShrink:0}}/>
              <div style={{flex:1,fontSize:12,color:C.t2}}>{rule}</div>
              <div style={{fontSize:11,color:C.mu}}>→ {result}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Attempt log */}
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1}}>KÍSÉRLET NAPLÓ</div>
          {attempts.length>0&&<Btn v="ghost" sz="sm" onClick={unlock}>Törlés</Btn>}
        </div>
        {attempts.length===0&&<div style={{fontSize:12,color:C.mu,textAlign:"center",padding:16}}>Nincs naplózott kísérlet.</div>}
        {[...attempts].reverse().map((ts,i)=>{
          const age=now-ts;
          const fresh=age<3600000;
          return(
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:i<attempts.length-1?`1px solid ${C.bd}`:"none"}}>
              <span style={{fontSize:12,color:C.t2,fontFamily:"monospace"}}>{new Date(ts).toLocaleString("hu",{hour:"2-digit",minute:"2-digit",second:"2-digit",day:"2-digit",month:"2-digit"})}</span>
              <span style={{fontSize:11,color:fresh?C.amber:C.mu,fontWeight:fresh?700:400}}>{fresh?"Legutóbbi 1h":">"+"1h"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function MainApp({user,onLogout,onPublic,onToggleTheme}){
  const[view,setView]=useState("dashboard");
  const[ordersFilter,setOrdersFilter]=useState("all");
  const[orders,setOrders]=useState([]);const[ready,setReady]=useState(false);const[nextId,setNextId]=useState(100);
  const[convos,setConvos]=useState([]);const[users,setUsers]=useState([]);
  useEffect(()=>{
    db.get("all_orders",true).then(d=>{const data=d||INIT_ORDERS;setOrders(data);setNextId((data.length?Math.max(...data.map(o=>o.id)):0)+1);setReady(true);});
    db.get("inbox_convos",true).then(d=>setConvos(Array.isArray(d)?d:[]));
    db.get("team_users",true).then(d=>setUsers(d||[]));
  },[]);
  useEffect(()=>{if(ready)db.set("all_orders",orders,true);},[orders,ready]);
  const upd=(id,patch)=>setOrders(p=>p.map(o=>o.id===id?{...o,...patch}:o));
  const del=(id)=>setOrders(p=>p.filter(o=>o.id!==id));
  const add=(o)=>{setOrders(p=>[{...o,id:nextId},...p]);setNextId(n=>n+1);setView("orders");};
  const panels={
    dashboard:()=><Dashboard orders={orders} convos={convos} onNav={(v,f)=>{setView(v);if(f)setOrdersFilter(f);}}/>,
    ai:()=><AiDashboard orders={orders}/>,
    inbox:()=><Inbox onCreateOrder={(o)=>{add(o);setView("orders");}} userName={user.name} users={users}/>,
    inquiry:()=><Inquiry onOrderCreated={add} userName={user.name}/>,
    orders:()=><Orders orders={orders} onChange={upd} onDelete={del} initialFilter={ordersFilter} onFilterUsed={()=>setOrdersFilter("all")}/>,
    krakow:()=><Krakow orders={orders} onChange={upd}/>,
    catalogue:()=><CatalogueManager user={user}/>,
    calculator:()=><PriceCalculator/>,
    templates:()=><Templates/>,
    customers:()=><Customers orders={orders}/>,
    settings:()=><Settings user={user}/>,
    security:()=><SecurityPanel user={user}/>,
  };
  return(<div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.tx,fontFamily:F}}>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
    <style>{"*{margin:0;padding:0;box-sizing:border-box}html,body{background:"+C.bg+";width:100%;height:100%}#root{min-height:100vh}*{scrollbar-width:thin;scrollbar-color:#1e1e1e #0a0a0a}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#2a2a2a}::-webkit-scrollbar-corner{background:#0a0a0a}"}</style>
    <Sidebar active={view} setActive={setView} user={user} onLogout={onLogout} onPublic={onPublic} orders={orders} convos={convos} onToggleTheme={onToggleTheme}/>
    <div style={{flex:1,padding:view==="inbox"?"0":"32px 36px",overflowY:view==="inbox"?"hidden":"auto",minWidth:0}}>{panels[view]?panels[view]():null}</div>
  </div>);
}

function LandingPage({onCatalogue,onAdmin,onLogin,loginOpen,setLoginOpen}){
  const[landingLang,setLandingLang]=useState(()=>{try{return localStorage.getItem("autorra_lang")||"hu";}catch{return "hu";}});
  const[contactOpen,setContactOpen]=useState(false);
  const[theme,setTheme]=useState(_theme);
  const[mouse,setMouse]=useState({x:0.5,y:0.5});
  const isDark=theme==="dark";
  const bg=isDark?"#0c0c0f":"#f8f8fa";
  const tx=isDark?"#f0f0f8":"#111";
  const mu=isDark?"#888":"#666";
  const handleMouse=e=>{const r=e.currentTarget.getBoundingClientRect();setMouse({x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height});};
  const toggleTheme=()=>{const n=isDark?"light":"dark";applyTheme(n);setTheme(n);};

  return(
    <div onMouseMove={handleMouse} style={{minHeight:"100vh",background:bg,fontFamily:F,color:tx,display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
  

      {/* Nav */}
      <nav style={{padding:"18px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:22,fontWeight:900,letterSpacing:-0.5}}>auto<span style={{color:"#dc2626"}}>rra</span><span style={{fontSize:10,fontWeight:600,color:"#888",marginLeft:6,letterSpacing:1,textTransform:"uppercase"}}>hu</span></div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={()=>setLandingLang(l=>l==="hu"?"en":"hu")} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",color:mu,fontFamily:F,letterSpacing:0.5}}>{landingLang==="hu"?"EN":"HU"}</button>
          <button onClick={toggleTheme} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:mu,fontFamily:F}}>{isDark?"☀":"🌙"}</button>
          <div style={{position:"relative"}}>
            <button onClick={e=>{e.stopPropagation();setLoginOpen(v=>!v);}} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:600,color:mu,cursor:"pointer",fontFamily:F}}>Login</button>
            {loginOpen&&(
              <>
                <style>{"@keyframes popLogin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}"}</style>
                <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:200,background:isDark?"#0f0f13":"#ffffff",border:`1px solid ${isDark?"#1a1a22":"#e8e8ee"}`,borderRadius:0,width:260,boxShadow:isDark?"0 8px 28px rgba(0,0,0,0.5)":"0 8px 28px rgba(0,0,0,0.1)",animation:"popLogin 0.15s cubic-bezier(0.16,1,0.3,1) forwards"}}>
                  <div style={{padding:"14px 16px 12px",borderBottom:`1px solid ${isDark?"#1a1a22":"#e8e8ee"}`,display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                    <span style={{fontSize:15,fontWeight:900,letterSpacing:-0.5,color:isDark?"#f0f0f8":"#111"}}>auto<span style={{color:"#dc2626"}}>rra</span></span>
                    <span style={{fontSize:12,color:isDark?"#555":"#999"}}><span style={{color:"#dc2626",fontWeight:800}}>admin</span> / seller</span>
                  </div>
                  <div style={{padding:"14px 16px 16px"}}>
                    <LoginInline onLogin={u=>{onLogin(u);setLoginOpen(false);}} theme={theme}/>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 20px 60px",position:"relative"}}>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,background:`radial-gradient(ellipse at ${20+mouse.x*60}% ${30+mouse.y*50}%, ${isDark?"rgba(220,38,38,0.07)":"rgba(220,38,38,0.04)"} 0%, transparent 60%)`,transition:"background 0.8s ease"}}/>
        <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,background:isDark?"radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.35) 100%)":"none"}}/>
        <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{fontSize:11,fontWeight:700,letterSpacing:3,color:"#dc2626",textTransform:"uppercase",marginBottom:20}}>{"Minőségi autóalkatrészek"}</div>
          <h1 style={{fontSize:"clamp(42px,7vw,80px)",fontWeight:900,lineHeight:1.1,letterSpacing:-2,marginBottom:20,paddingBottom:4}}>
            {T[landingLang]?.heroTitle||"Lengyel alkatrész."}<br/>
            <span style={{color:"#dc2626",backgroundImage:`linear-gradient(${90+mouse.x*40-20}deg, #dc2626 0%, #ff6666 ${30+mouse.x*40}%, #dc2626 100%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",transition:"background-image 0.6s ease",display:"inline-block",paddingBottom:"0.15em"}}>{T[landingLang]?.heroRed||"Magyar ár."}</span>
          </h1>
          <p style={{fontSize:17,color:isDark?"#888":"#555",maxWidth:480,lineHeight:1.65,marginBottom:40}}>{T[landingLang]?.heroSub}</p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",alignItems:"center"}}>
            <button onClick={onCatalogue} style={{background:"linear-gradient(105deg, #b91c1c 0%, #dc2626 35%, #ef4444 60%, #dc2626 80%, #b91c1c 100%)",color:"#fff",border:"none",borderRadius:12,padding:"14px 32px",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:F,letterSpacing:-0.3,boxShadow:"0 0 28px rgba(220,38,38,0.35)",backgroundSize:"200% 100%",backgroundPosition:`${mouse.x*100}% 0`,transition:"background-position 0.4s ease"}}>{(T[landingLang]?.browse||"Alkatrészek")+" →"}</button>
            <div style={{position:"relative"}}>
              <button onClick={e=>{e.stopPropagation();setContactOpen(v=>!v);}} style={{background:"transparent",border:`2px solid ${isDark?"#333":"#ddd"}`,borderRadius:12,padding:"14px 32px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:F,color:isDark?"#ccc":"#333",letterSpacing:-0.3}}>{landingLang==="en"?"Contact":"Érdeklődés"}</button>
              {contactOpen&&(
                <>
                  <style>{"@keyframes rise{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}"}</style>
                  <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 10px)",left:"50%",transform:"translateX(-50%)",zIndex:99,display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                    {[{href:"https://wa.me/36703771506",label:"WA · HU",bg:"#16a34a",delay:0},{href:"viber://chat?number=36703771506",label:"Viber · HU",bg:"#7c3aed",delay:35},{href:"sms:+36703771506",label:"SMS · HU",bg:isDark?"#2a2a35":"#e5e5ea",fg:isDark?"#ccc":"#333",delay:70},{href:"https://wa.me/48730320497",label:"WA · PL",bg:"#dc2626",delay:105},{href:"viber://chat?number=48730320497",label:"Viber · PL",bg:"#7c3aed",delay:140}].map((b,i)=>(
                      <a key={i} href={b.href} target={b.href.startsWith("http")?"_blank":undefined} rel="noreferrer" style={{display:"block",padding:"7px 20px",borderRadius:999,background:b.bg,color:b.fg||"#fff",fontSize:11,fontWeight:700,textDecoration:"none",whiteSpace:"nowrap",boxShadow:"0 2px 8px rgba(0,0,0,0.18)",animation:`rise 0.14s ease ${b.delay}ms both`,letterSpacing:0.3,fontFamily:F}}>{b.label}</a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Feature strip */}
      <div style={{borderTop:`1px solid ${isDark?"#1a1a1a":"#e8e8e8"}`,padding:"28px 32px",display:"flex",justifyContent:"center",gap:48,flexWrap:"wrap"}}>
        {[["",T[landingLang]?.browse||"Alkatrészek"],["",T[landingLang]?.directImport||"Közvetlen import"],["",T[landingLang]?.fastShip||"Gyors kiszállítás"],["",T[landingLang]?.partQuality||"Ellenőrzött minőség"]].map(([icon,text])=>(
          <div key={text} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:isDark?"#888":"#555",fontWeight:600}}><span style={{fontSize:18}}>{icon}</span>{text}</div>
        ))}
      </div>
    </div>
  );
}

export default function App(){
  const[user,setUser]=useState(null);
  const[page,setPage]=useState("home");
  const[loginOpen,setLoginOpen]=useState(false);
  const[theme,setTheme]=useState(_theme);
  const toggleTheme=()=>{const n=theme==="dark"?"light":"dark";applyTheme(n);setTheme(n);};

  useEffect(()=>{window.__setPublic=(v)=>setPage(v?"catalogue":"app");},[]);

  if(page==="app"&&user){
    return(<MainApp user={user} onLogout={()=>{localStorage.removeItem("am_session");setUser(null);setPage("home");}} onPublic={()=>setPage("catalogue")} onToggleTheme={toggleTheme}/>);
  }
  if(page==="catalogue"){
    return(<PublicCatalogue onBack={()=>setPage("home")} onAdmin={()=>{setPage("home");setTimeout(()=>setLoginOpen(true),100);}}/>);
  }
  return(<LandingPage onCatalogue={()=>setPage("catalogue")} onAdmin={()=>setLoginOpen(true)} onLogin={u=>{setUser(u);setPage("app");}} loginOpen={loginOpen} setLoginOpen={setLoginOpen}/>);
}

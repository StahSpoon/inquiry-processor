import { useState, useEffect, useRef } from "react";

const DARK={bg:"#0c0c0f",s1:"#111116",s2:"#16161d",s3:"#1c1c25",s4:"#22222e",bd:"#22222c",bd2:"#2c2c3a",acc:"#dc2626",t2:"#c8c8d8",tx:"#f0f0f8",mu:"#606070",green:"#22c55e",amber:"#f59e0b",blue:"#3b82f6",cyan:"#06b6d4",purple:"#8b5cf6"};
const LIGHT={bg:"#f8f8fa",s1:"#ffffff",s2:"#f1f1f5",s3:"#e8e8ef",s4:"#dddde8",bd:"#e0e0ea",bd2:"#c8c8d8",acc:"#dc2626",t2:"#222230",tx:"#0c0c18",mu:"#888898",green:"#16a34a",amber:"#d97706",blue:"#2563eb",cyan:"#0891b2",purple:"#7c3aed"};
let _theme="dark";
try{_theme=localStorage.getItem("autorra_theme")||"dark";}catch{}
let C=_theme==="light"?{...LIGHT}:{...DARK};
function applyTheme(t){_theme=t;C=t==="light"?{...LIGHT}:{...DARK};try{localStorage.setItem("autorra_theme",t);}catch{}}
const ST={
  pending: {color:C.amber, bg:"#ca8a0412",label:"F\u00fcgg\u0151ben"},
  awaiting:{color:C.blue,  bg:"#2563eb12",label:"Visszaigazol\u00e1sra v\u00e1r"},
  ordered: {color:C.red,   bg:"#dc262612",label:"Megrendelve"},
  krakow:  {color:C.purple,bg:"#7c3aed12",label:"Krakk\u00f3ban van"},
  transit: {color:C.cyan,  bg:"#0e749012",label:"\u00daton"},
  ready:   {color:C.green, bg:"#16a34a12",label:"\u00c1tvehet\u0151"},
};
const SQ=["pending","awaiting","ordered","krakow","transit","ready"];
const CONDITIONS=["\u00daj","Kiv\u00e1l\u00f3","J\u00f3","K\u00f6zepes","Jav\u00edtott","Fel\u00faj\u00edtott","Hib\u00e1s"];
// -- i18n translations --
const T={
  hu:{
    browse:"Alkatr\u00e9szek b\u00f6ng\u00e9sz\u00e9se",search:"Keres\u00e9s...",allCond:"Minden \u00e1llapot",
    allCat:"Minden kateg\u00f3ria",noResults:"Nincs tal\u00e1lat",clearFilters:"Sz\u0171r\u0151k t\u00f6rl\u00e9se",
    loading:"Bet\u00f6lt\u00e9s...",price:"\u00c1r",contact:"El\u00e9rhet\u0151s\u00e9g",pickup:"\u00c1tv\u00e9tel",
    condition:"\u00c1llapot",serial:"Cikksz\u00e1m",vehicle:"J\u00e1rm\u0171",call:"H\u00edv\u00e1s",whatsapp:"WhatsApp",
    admin:"Admin",back:"\u2190 Vissza",available:"El\u00e9rhet\u0151",sold:"Eladva",
    askPrice:"\u00c1r: \u00e9rdekl\u0151dj\u00f6n",description:"Le\u00edr\u00e1s",category:"Kateg\u00f3ria",
    heroTitle:"Lengyel alkatr\u00e9sz.",heroRed:"Magyar \u00e1r.",
    heroSub:"K\u00f6zvetlen import besz\u00e1ll\u00edt\u00f3kt\u00f3l - eredeti \u00e9s ut\u00e1ngy\u00e1rtott alkatr\u00e9szek, kedvez\u0151 \u00e1ron.",
    partQuality:"Ellen\u0151rz\u00f6tt min\u0151s\u00e9g",fastShip:"Gyors kisz\u00e1ll\u00edt\u00e1s",
    directImport:"K\u00f6zvetlen import",allMakes:"Minden m\u00e1rka",
    apply:"Alkalmaz",allParts:"Minden alkatr\u00e9sz",editFilter:"Sz\u0171r\u0151 szerkeszt\u00e9se",
    results:"tal\u00e1lat",filters:"sz\u0171r\u0151 akt\u00edv",
  },
  en:{
    browse:"Browse Parts",search:"Search...",allCond:"All conditions",
    allCat:"All categories",noResults:"No results found",clearFilters:"Clear filters",
    loading:"Loading...",price:"Price",contact:"Contact",pickup:"Pickup",
    condition:"Condition",serial:"Part No.",vehicle:"Vehicle",call:"Call",whatsapp:"WhatsApp",
    admin:"Admin",back:"\u2190 Back",available:"Available",sold:"Sold",
    askPrice:"Ask for price",description:"Description",category:"Category",
    heroTitle:"Polish parts.",heroRed:"Hungarian price.",
    heroSub:"Direct import from suppliers - OEM and aftermarket parts, best prices, fast delivery.",
    partQuality:"Verified quality",fastShip:"Fast delivery",
    directImport:"Direct import",allMakes:"All makes",
    apply:"Apply",allParts:"All parts",editFilter:"Edit filter",
    results:"results",filters:"filters active",
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
  {id:"F\u00e9krendszer",hu:"F\u00e9krendszer",en:"Brakes",sub:{hu:["F\u00e9kt\u00e1rcsa","F\u00e9kbet\u00e9t","F\u00e9knyereg","F\u00e9kcs\u0151 / F\u0151f\u00e9khenger","K\u00e9zif\u00e9k","ABS szenzor","F\u00e9kfolyad\u00e9k tart\u00e1ly"],en:["Brake Disc","Brake Pad","Brake Caliper","Brake Line","Handbrake","ABS Sensor","Brake Fluid Reservoir"]}},
  {id:"Motor",hu:"Motor",en:"Engine",sub:{hu:["Hengerfej","Szelepfed\u00e9l","Olajtekn\u0151","Vez\u00e9rl\u00e9s / L\u00e1nc","Turb\u00f3","Befecskendez\u0151","Fojt\u00f3szelep","\u00dczemanyag pumpa","Sz\u00edv\u00f3cs\u0151","EGR szelep"],en:["Cylinder Head","Valve Cover","Oil Pan","Timing Chain","Turbo","Injector","Throttle Body","Fuel Pump","Intake Manifold","EGR Valve"]}},
  {id:"Felf\u00fcggeszt\u00e9s",hu:"Fut\u00f3m\u0171",en:"Suspension",sub:{hu:["Leng\u00e9scsillap\u00edt\u00f3","Rug\u00f3","Stabiliz\u00e1tor r\u00fad","Leng\u0151kar","Ker\u00e9kcsap\u00e1gy","G\u00f6mbcsukl\u00f3","Ker\u00e9kagycsap\u00e1gy"],en:["Shock Absorber","Spring","Stabilizer Bar","Control Arm","Wheel Bearing","Ball Joint","Hub Bearing"]}},
  {id:"Korm\u00e1nyz\u00e1s",hu:"Korm\u00e1nyz\u00e1s",en:"Steering",sub:{hu:["Korm\u00e1nym\u0171","Korm\u00e1nyr\u00fad","\u00d6sszek\u00f6t\u0151r\u00fad","Szerv\u00f3szivatty\u00fa","Szerv\u00f3cs\u0151"],en:["Steering Rack","Steering Rod","Tie Rod","Power Steering Pump","Power Steering Hose"]}},
  {id:"Hajt\u00e1sl\u00e1nc",hu:"Hajt\u00e1sl\u00e1nc",en:"Drivetrain",sub:{hu:["V\u00e1lt\u00f3","Tengelykapcsol\u00f3","Hajt\u00f3tengely / F\u00e9ltengely","Kard\u00e1ntengely","Differenci\u00e1lm\u0171","Lendker\u00e9k"],en:["Gearbox","Clutch","Driveshaft / Half Shaft","Propshaft","Differential","Flywheel"]}},
  {id:"Karossz\u00e9ria",hu:"Karossz\u00e9ria",en:"Body",sub:{hu:["Motorh\u00e1ztet\u0151","S\u00e1rv\u00e9d\u0151","Ajt\u00f3","L\u00f6kh\u00e1r\u00edt\u00f3","Csomagt\u00e9rajt\u00f3 / Klapa","K\u00fcsz\u00f6b","T\u00fck\u00f6r","Sz\u00e9lv\u00e9d\u0151"],en:["Bonnet","Wing / Fender","Door","Bumper","Boot Lid / Tailgate","Sill","Mirror","Windscreen"]}},
  {id:"BelsoTer",hu:"Bels\u0151 t\u00e9r",en:"Interior",sub:{hu:["M\u0171szerfal","\u00dcl\u00e9s","K\u00e1rpit","Biztons\u00e1gi \u00f6v","L\u00e9gzs\u00e1k","Bels\u0151 ajt\u00f3panel","Ablakemel\u0151 motor"],en:["Dashboard","Seat","Trim","Seatbelt","Airbag","Door Panel","Window Motor"]}},
  {id:"Elektromos",hu:"Elektromos",en:"Electrical",sub:{hu:["Gener\u00e1tor","\u00d6nind\u00edt\u00f3","Akkumul\u00e1tor","ECU / Vez\u00e9rl\u0151egys\u00e9g","\u00c9rz\u00e9kel\u0151 / Szenzor","K\u00e1belk\u00f6teg","Gy\u00fajt\u00f3traf\u00f3"],en:["Alternator","Starter Motor","Battery","ECU","Sensor","Wiring Harness","Ignition Coil"]}},
  {id:"Huto",hu:"Kl\u00edma",en:"Cooling",sub:{hu:["H\u0171t\u0151","Ventil\u00e1tor","V\u00edzszivatty\u00fa","Termoszt\u00e1t","Kl\u00edmakompresszor","Kl\u00edmah\u0171t\u0151","F\u0171t\u00e9sradi\u00e1tor"],en:["Radiator","Fan","Water Pump","Thermostat","AC Compressor","AC Condenser","Heater Radiator"]}},
  {id:"Kipufogo",hu:"Kipufog\u00f3",en:"Exhaust",sub:{hu:["Kataliz\u00e1tor","Hangtomp\u00edt\u00f3","Kipufog\u00f3cs\u0151","Lambda szonda","DPF / FAP sz\u0171r\u0151"],en:["Catalytic Converter","Silencer","Exhaust Pipe","Lambda Sensor","DPF Filter"]}},
  {id:"Vilagitas",hu:"Vil\u00e1g\u00edt\u00e1s",en:"Lighting",sub:{hu:["F\u00e9nysz\u00f3r\u00f3","H\u00e1ts\u00f3 l\u00e1mpa","Nappali f\u00e9ny (DRL)","K\u00f6dl\u00e1mpa","Izz\u00f3","LED modul"],en:["Headlight","Rear Light","DRL","Fog Light","Bulb","LED Module"]}},
  {id:"Szurok",hu:"Sz\u0171r\u0151k",en:"Filters",sub:{hu:["Leveg\u0151sz\u0171r\u0151","Olajsz\u0171r\u0151","\u00dczemanyagsz\u0171r\u0151","Pollensz\u0171r\u0151 / Kabinsz\u0171r\u0151"],en:["Air Filter","Oil Filter","Fuel Filter","Cabin Filter"]}},
  {id:"Egyeb",hu:"Egy\u00e9b",en:"Other",sub:{hu:["Von\u00f3horog","Csomagtart\u00f3","Zajszigetel\u00e9s","Felni","Gumi"],en:["Tow Bar","Roof Rack","Sound Deadening","Alloy Wheel","Tyre"]}},
];
// Helper to get label/sub in current lang
function catLabel(c,lang){return lang==="en"?(c.en||c.hu):c.hu;}
function catSub(c,lang){return lang==="en"?((c.sub&&c.sub.en)||c.sub&&c.sub.hu||[]):((c.sub&&c.sub.hu)||[]);}
// Flat list for backwards compat
const PART_CATS=PART_CAT_TREE.map(c=>c.hu);
const PART_CATS_ALL=PART_CAT_TREE.flatMap(c=>[c.hu,c.en,...((c.sub&&c.sub.hu)||[]),...((c.sub&&c.sub.en)||[])]);

// -- Vehicle makes for filter --
const MAKES=[
  "Audi","BMW","Chevrolet","Chrysler","Citro\u00ebn","Dacia","Fiat","Ford","Honda",
  "Hyundai","Kia","Mazda","Mercedes-Benz","Mitsubishi","Nissan","Opel","Peugeot",
  "Renault","Seat","Skoda","Subaru","Suzuki","Toyota","Volkswagen","Volvo","Egy\u00e9b",
];

const COND_C={"\u00daj":C.green,"Kiv\u00e1l\u00f3":"#65a30d","J\u00f3":C.blue,"K\u00f6zepes":C.amber,"Jav\u00edtott":"#0891b2","Fel\u00faj\u00edtott":"#7c3aed","Hib\u00e1s":C.acc};
const CHANNELS={
  fb_hu:{label:"Messenger",country:"HU",color:"#3b82f6",lang:"HU"},
  wa_hu:{label:"WhatsApp", country:"HU",color:"#22c55e",lang:"HU"},
  wa_pl:{label:"WhatsApp", country:"PL",color:"#22c55e",lang:"PL"},
  vb_hu:{label:"Viber",    country:"HU",color:"#7c3aed",lang:"HU"},
  vb_pl:{label:"Viber",    country:"PL",color:"#7c3aed",lang:"PL"},
};
const CURRENCIES=[
  {code:"HUF",name:"Magyarorsz\u00e1g",                                     countries:["HU"],          accent:C.green,  decimals:0, home:true},
  {code:"EUR",name:"Ausztria \u00b7 Szlov\u00e1kia \u00b7 Horv\u00e1torsz\u00e1g \u00b7 Szlov\u00e9nia",  countries:["AT","SK","HR","SI"],accent:C.blue,decimals:2},
  {code:"RON",name:"Rom\u00e1nia",                                           countries:["RO"],          accent:C.amber,  decimals:2},
  {code:"UAH",name:"Ukrajna",                                           countries:["UA"],          accent:C.green,  decimals:0},
  {code:"RSD",name:"Szerbia",                                           countries:["RS"],          accent:C.purple, decimals:0},
  {code:"CZK",name:"Csehorsz\u00e1g",                                        countries:["CZ"],          accent:C.cyan,   decimals:2},
];
const SYMBOLS={HUF:"Ft",EUR:"\u20ac",RON:"RON",UAH:"\u20b4",RSD:"RSD",CZK:"K\u010d"};
const PL_TPL=[
  {id:1,title:"El\u00e9rhet\u0151s\u00e9g",text:"Dzie\u0144 dobry, czy ten produkt jest dost\u0119pny? Prosz\u0119 o potwierdzenie stanu magazynowego."},
  {id:2,title:"Krak\u00f3wba sz\u00e1ll\u00edt\u00e1s",text:"Czy mog\u0105 Pa\u0144stwo wys\u0142a\u0107 towar na adres magazynu w Krakowie? Prosz\u0119 o potwierdzenie mo\u017cliwo\u015bci wysy\u0142ki."},
  {id:3,title:"\u00c1FA sz\u00e1mla",text:"Prosz\u0119 o wystawienie faktury VAT na firm\u0119. Czy jest taka mo\u017cliwo\u015b\u0107?"},
  {id:4,title:"Felad\u00e1s id\u0151pontja",text:"Kiedy towar zostanie wys\u0142any? Prosz\u0119 o podanie szacowanego czasu dostawy."},
  {id:5,title:"\u00c1raj\u00e1nlat",text:"Prosz\u0119 o podanie ceny za sztuk\u0119 oraz mo\u017cliwo\u015bci rabatu przy wi\u0119kszym zam\u00f3wieniu."},
];
const HU_TPL=[
  {id:1,title:"Megrendel\u00e9s visszaigazol\u00e1sa",text:"Kedves \u00dcgyfel\u00fcnk! Az alkatr\u00e9sz\u00e9t megrendelt\u00fck. Amint meg\u00e9rkezik Krakk\u00f3ba, \u00e9rtes\u00edtj\u00fck."},
  {id:2,title:"Krakk\u00f3ba \u00e9rkezett",text:"Az alkatr\u00e9sze meg\u00e9rkezett a krakk\u00f3i rakt\u00e1runkba. A k\u00f6vetkez\u0151 fuvarral hozzuk Magyarorsz\u00e1gra."},
  {id:3,title:"\u00daton van",text:"Az alkatr\u00e9sze \u00faton van, hamarosan meg\u00e9rkezik az \u00e1tv\u00e9teli ponthoz."},
  {id:4,title:"\u00c1tvehet\u0151",text:"Az alkatr\u00e9sze meg\u00e9rkezett \u00e9s \u00e1tvehet\u0151! K\u00e9rj\u00fck, jelezze, mikor tud j\u00f6nni."},
  {id:5,title:"\u00c1raj\u00e1nlat k\u00fcld\u00e9se",text:"Kedves \u00dcgyfel\u00fcnk! Az alkatr\u00e9sz \u00e1ra: [\u00c1R]. Sz\u00e1ll\u00edt\u00e1si id\u0151 kb. [ID\u0150] nap. K\u00e9ri, hogy megrendelj\u00fck?"},
];
const INIT_ORDERS=[]

const SAMPLE_CONVOS=[]
function makeId(name,zip){
  if(!name)return"-";
  const acc="\u00c1\u00e1\u00c9\u00e9\u00cd\u00ed\u00d3\u00f3\u00d6\u00f6\u0150\u0151\u00da\u00fa\u00dc\u00fc\u0170\u0171",base="AaEeIiOoOoOoUuUuUu";
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
  return p[0].name+" +"+(p.length-1)+" t\u00e9tel";
}
function totalQty(o){return getParts(o).reduce((s,p)=>s+(parseInt(p.qty)||1),0);}

const DEFAULT_AI_PROMPT="Te egy Autorra aut\u00f3alkatr\u00e9sz asszisztense vagy (PL\u2192HU logisztika). Professzion\u00e1lisan v\u00e1laszolj az adott csatorna nyelv\u00e9n. Azonos\u00edtsd az alkatr\u00e9sz nev\u00e9t \u00e9s a j\u00e1rm\u0171vet. R\u00f6viden \u00e9s egy\u00e9rtelm\u0171en fogalmazz.";

const db={
  async get(k,sh=false){try{const r=await window.storage.get(k,sh);return r?JSON.parse(r.value):null;}catch{return null;}},
  async set(k,v,sh=false){try{await window.storage.set(k,JSON.stringify(v),sh);}catch{}},
};
async function ai(messages,sys){
  const body={model:"claude-sonnet-4-20250514",max_tokens:1200,messages};
  if(sys)body.system=sys;
  const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json();return d.content&&d.content.find(b=>b.type==="text")&&d.content.find(b=>b.type==="text").text||"";
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
const CopyBtn=({text})=>{const[c,setC]=useState(false);return <button onClick={()=>{navigator.clipboard.writeText(text);setC(true);setTimeout(()=>setC(false),2000);}} style={{background:c?C.green+"15":C.s3,color:c?C.green:C.mu,border:`1px solid ${c?C.green+"30":C.bd}`,borderRadius:5,padding:"3px 9px",fontSize:10,cursor:"pointer",fontWeight:700,fontFamily:F}}>{c?"\u2713 M\u00e1solva":"M\u00e1sol\u00e1s"}</button>;};
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
function LoginInline({onLogin,theme,lang="hu"}){
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
      const API=window.__getApiBase&&window.__getApiBase()||"";
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
          {remember&&<span style={{color:"#fff",fontSize:7,lineHeight:1,fontWeight:900}}>{"\u2713"}</span>}
        </div>
        <span style={{fontSize:10,color:mu2,letterSpacing:0.2}}>{lang==="en"?"Remember for 30 days":"Eml\u00e9kezz 30 napig"}</span>
      </div>
      <button onClick={go} disabled={ld||!u||!p||lockout.blocked}
        style={{width:"100%",padding:"9px 0",background:lockout.blocked?"#555":!u||!p?"transparent":"#dc2626",color:lockout.blocked||(!u||!p)?mu2:"#fff",border:`1px solid ${!u||!p?bdr:"#dc2626"}`,fontSize:11,fontWeight:700,cursor:lockout.blocked||!u||!p?"default":"pointer",fontFamily:F,letterSpacing:0.5,textTransform:"uppercase",transition:"all 0.12s"}}>
        {ld?"\u00b7  \u00b7  \u00b7":lockout.blocked?"Locked":"Login \u2192"}
      </button>
    </div>
  );
}



// -- Icon set (inline SVGs, render at any size) --
const ICON={
  dashboard:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  ai:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L14 8L20 10L14 12L12 18L10 12L4 10L10 8Z"/><path d="M19 15L20 17L22 18L20 19L19 21L18 19L16 18L18 17Z"/></svg>,
  inbox:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  inquiry:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  orders:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V7a3 3 0 0 1 6 0v4"/><rect x="5" y="11" width="14" height="10" rx="2"/></svg>,
  krakow:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  catalogue:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  calculator:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="10" y2="18"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="16" y1="18" x2="16.01" y2="18"/></svg>,
  templates:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="18" height="7"/></svg>,
  customers:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  settings:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  security:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  sellers:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-3V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a1 1 0 0 0-1-1zM9 5h6v2H9z"/><rect x="9" y="11" width="6" height="5" rx="1"/></svg>,
  sun:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  moon:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  logout:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  globe:(p)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
};

const NAV=[
  {id:"dashboard",label:"Ir\u00e1ny\u00edt\u00f3pult",icon:"dashboard"},
  {id:"ai",       label:"AI Elemz\u00e9s",         icon:"ai"},
  {id:"inbox",    label:"Be\u00e9rkez\u0151",      icon:"inbox"},
  {id:"inquiry",  label:"\u00daj \u00e9rdekl\u0151d\u00e9s",icon:"inquiry"},
  {id:"orders",   label:"Rendel\u00e9sek",         icon:"orders"},
  {id:"krakow",   label:"Krakk\u00f3i rakt\u00e1r",icon:"krakow"},
  {id:"catalogue",label:"Katal\u00f3gus",          icon:"catalogue"},
  {id:"calculator",label:"\u00c1rkalkul\u00e1tor",icon:"calculator"},
  {id:"templates",label:"Sablonok",                 icon:"templates"},
  {id:"customers",label:"Vev\u0151k",              icon:"customers"},
  {id:"settings", label:"Be\u00e1ll\u00edt\u00e1sok",icon:"settings"},
  {id:"security", label:"Biztons\u00e1g",          icon:"security"},
  {id:"sellers",  label:"Elad\u00f3i bek.",        icon:"sellers"},
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
        <div style={{fontSize:9,color:C.mu,letterSpacing:2,textTransform:"uppercase",marginTop:3}}>{"PL \u2192 HU"}</div>
      </div>
      <div style={{flex:1,paddingTop:2}}>
        {NAV.filter(n=>!n.admin||user.role==="admin").map(n=>{
          const a=active===n.id;
          return(
            <button key={n.id} onClick={()=>setActive(n.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 20px",border:"none",cursor:"pointer",width:"100%",textAlign:"left",background:"transparent",borderLeft:a?"2px solid "+C.acc:"2px solid transparent",color:a?"#e8e8e8":"#3a3a3a",fontSize:12,fontWeight:a?600:400,fontFamily:F,transition:"color 0.1s"}}>
              <span style={{width:14,height:14,flexShrink:0,color:a?C.acc:C.mu,display:"flex",alignItems:"center",justifyContent:"center"}}>{ICON[n.icon]&&ICON[n.icon]({width:14,height:14})}</span>
              <span style={{flex:1}}>{n.label}</span>
              {n.id==="krakow"&&<Dot n={kn} col={C.purple}/>}
              {n.id==="orders"&&<Dot n={pn} col={C.amber}/>}
              {n.id==="inbox"&&<Dot n={un} col={C.acc}/>}
            </button>
          );
        })}
      </div>
      <div style={{borderTop:"1px solid #141414",padding:"14px 20px"}}>
        <button onClick={onPublic} style={{display:"block",width:"100%",background:"transparent",border:"1px solid #1c1c1c",borderRadius:4,padding:"6px 10px",color:"#2e2e2e",fontSize:10,cursor:"pointer",fontFamily:F,textAlign:"left",marginBottom:14}}>Katal\u00f3gus</button>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <div style={{width:22,height:22,background:C.acc,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>{user.name[0]}</div>
          <div style={{overflow:"hidden"}}>
            <div style={{fontSize:11,fontWeight:600,color:"#bbb",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name}</div>
            <div style={{fontSize:9,color:"#2e2e2e",textTransform:"uppercase",letterSpacing:1}}>{user.role}</div>
          </div>
        </div>
        <button onClick={onToggleTheme} style={{display:"flex",alignItems:"center",gap:8,width:"100%",background:"transparent",border:"none",color:C.mu,fontSize:11,cursor:"pointer",padding:"6px 0",fontFamily:F,marginBottom:4}}><span style={{width:12,height:12,display:"flex",alignItems:"center"}}>{_theme==="light"?ICON.moon({width:12,height:12}):ICON.sun({width:12,height:12})}</span>{_theme==="light"?"S\u00f6t\u00e9t m\u00f3d":"Vil\u00e1gos m\u00f3d"}</button><button onClick={onLogout} style={{background:"transparent",border:"none",color:"#282828",fontSize:10,cursor:"pointer",fontFamily:F,padding:0}}>{"Kijelentkez\u00e9s"}</button>
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
      <PH sub={`${today} - \u00f6sszes\u00edtett \u00fczleti \u00e1ttekint\u0151`}>{"Ir\u00e1ny\u00edt\u00f3pult"}</PH>

      {/* Alerts */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {unread>0&&(
          <div onClick={()=>onNav("inbox")} style={{background:C.acc+"10",border:`1px solid ${C.acc}25`,borderRadius:8,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>c</span>
            <span style={{fontSize:13,color:C.t2,flex:1}}><strong style={{color:C.acc}}>{unread} megv\u00e1laszolatlan \u00fczenet</strong>{" - kattints a be\u00e9rkez\u0151h\u00f6z"}</span>
            <span style={{fontSize:11,color:C.mu}}>{"\u2192"}</span>
          </div>
        )}
        {ready.length>0&&(
          <div onClick={()=>onNav("orders")} style={{background:C.green+"10",border:`1px solid ${C.green}25`,borderRadius:8,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>{"\u2705"}</span>
            <span style={{fontSize:13,color:C.t2,flex:1}}><strong style={{color:C.green}}>{ready.length} rendel\u00e9s \u00e1tvehet\u0151</strong>{" - \u00e9rtes\u00edtsd az \u00fcgyfeleket"}</span>
            <span style={{fontSize:11,color:C.mu}}>{"\u2192"}</span>
          </div>
        )}
        {needAction.length>0&&(
          <div onClick={()=>onNav("orders")} style={{background:C.amber+"10",border:`1px solid ${C.amber}25`,borderRadius:8,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>{"\u23f3"}</span>
            <span style={{fontSize:13,color:C.t2,flex:1}}><strong style={{color:C.amber}}>{needAction.length} rendel\u00e9s</strong>{" visszaigazol\u00e1sra vagy d\u00f6nt\u00e9sre v\u00e1r"}</span>
            <span style={{fontSize:11,color:C.mu}}>{"\u2192"}</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"\u00d6sszes rendel\u00e9s",val:orders.length,col:C.blue,icon:"\u2261"},
          {label:"Alkatr\u00e9sz t\u00e9tel",val:totalParts+" db",col:C.purple,icon:"\u22a1"},
          {label:"\u00daton / Krakk\u00f3ban",val:inTransit.length,col:C.cyan,icon:"\u25c8"},
          {label:"Ma felvett",val:todayOrders.length,col:C.green,icon:"\u2726"},
        ].map(({label,val,col,icon})=>(
          <div key={label} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:"16px 18px",borderLeft:`3px solid ${col}`}}>
            <div style={{fontSize:11,color:C.mu,marginBottom:6,display:"flex",alignItems:"center",gap:6}}><span style={{color:col}}>{icon}</span>{label}</div>
            <div style={{fontSize:26,fontWeight:800,color:C.tx,letterSpacing:-0.5}}>{val}</div>
          </div>
        ))}
      </div>

      {/* Status pipeline */}
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18,marginBottom:16}}>
        <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:14}}>{"RENDEL\u00c9SEK ST\u00c1TUSZA"}</div>
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
          <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.bd}`,fontSize:10,fontWeight:700,color:C.mu,letterSpacing:1}}>{"LEG\u00daJABB RENDEL\u00c9SEK"}</div>
          {orders.length===0&&<div style={{padding:24,textAlign:"center",color:C.mu,fontSize:13}}>{"Nincs rendel\u00e9s."}</div>}
          {orders.slice(0,6).map((o,i)=>(
            <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 16px",borderBottom:i<Math.min(orders.length,6)-1?`1px solid ${C.bd}`:"none"}}>
              <span style={{fontSize:9,fontFamily:"monospace",color:C.mu,minWidth:50}}>{makeId(o.customer,o.zip)}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.customer}</div>
                <div style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{partsLabel(o)} \u00b7 {o.car}</div>
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
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>{"GYORS M\u0170VELETEK"}</div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              <Btn v="subtle" full onClick={()=>onNav("inquiry")} style={{textAlign:"left",justifyContent:"flex-start"}}>{"\u2726 \u00daj \u00e9rdekl\u0151d\u00e9s feldolgoz\u00e1sa"}</Btn>
              <Btn v="subtle" full onClick={()=>onNav("inbox")} style={{textAlign:"left",justifyContent:"flex-start"}}>{"\u25c9 Be\u00e9rkez\u0151 \u00fczenetek"}</Btn>
              <Btn v="subtle" full onClick={()=>onNav("krakow")} style={{textAlign:"left",justifyContent:"flex-start"}}>{"\u25c8 Krakk\u00f3i rakt\u00e1r"}</Btn>
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
      const text=await ai([{role:"user",content:`Te egy Autorra aut\u00f3alkatr\u00e9sz AI elemz\u0151je vagy (PL-HU logisztika). Elemezd az al\u00e1bbi rendel\u00e9si adatokat \u00e9s adj \u00fczleti betekint\u00e9st magyarul. Rendel\u00e9sek (${filtered.length} db,"sz\u0171r\u0151": ${statusFilter}):\n${summary}\n\nV\u00e1laszolj CSAK JSON form\u00e1tumban:\n{"osszesfoglalas":"...","bottleneck":"...","topAlkatreszek":["max 3"],"javaslatok":["3 javaslat"],"kockazatok":["2 kock\u00e1zat"],"statisztika":{"atlagosIdoNap":3,"legtobbenVaro":"st\u00e1tusz","teljesitesiArany":"75%"}}`}]);
      const d=JSON.parse(text.split(String.fromCharCode(96,96,96)+"json").join("").split(String.fromCharCode(96,96,96)).join("").trim());
      setInsight(d);
    }catch(e){setErr("Hiba az elemz\u00e9s sor\u00e1n. Pr\u00f3b\u00e1lja \u00fajra.");}
    setLoading(false);
  };

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <PH sub="AI elemzes">{"AI Elemz\u00e9s"}</PH>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={statusFilter} onChange={e=>{setStatusFilter(e.target.value);setInsight(null);}} style={{...inp,width:"auto",fontSize:11,padding:"5px 10px"}}><option value="all">{"\u00d6sszes st\u00e1tusz"}</option>{SQ.map(s=><option key={s} value={s}>{ST[s].label}</option>)}</select>
          <Btn onClick={analyze} disabled={loading}>{loading?"\u27f3 Elemz\u00e9s...":"\u2726 Elemz\u00e9s futtat\u00e1sa"}</Btn>
        </div>
      </div>
      <div style={{fontSize:11,color:C.mu,marginBottom:16}}>{filtered.length} rendel\u00e9s az elemz\u00e9sben{statusFilter!=="all"&&<span style={{color:(ST[statusFilter]&&ST[statusFilter].color),marginLeft:6,fontWeight:700}}> \u00b7 {(ST[statusFilter]&&ST[statusFilter].label)}</span>}</div>
      {err&&<div style={{color:C.acc,fontSize:13,marginBottom:14}}>{err}</div>}
      {!insight&&!loading&&(
        <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>{"\u2726"}</div>
          <div style={{fontSize:14,fontWeight:600,color:C.t2,marginBottom:6}}>{"AI \u00fczleti elemz\u00e9s"}</div>
          <div style={{fontSize:12,color:C.mu,marginBottom:20,maxWidth:400,margin:"0 auto 20px"}}>{"Kattints az elemz\u00e9s gombra - a mesters\u00e9ges intelligencia feldolgozza az \u00f6sszes rendel\u00e9si adatot \u00e9s konkr\u00e9t javaslatokat ad."}</div>
          <Btn onClick={analyze}>{"\u2726 Elemz\u00e9s ind\u00edt\u00e1sa"}</Btn>
        </div>
      )}
      {loading&&(
        <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center"}}>
          <div style={{fontSize:24,marginBottom:12,color:C.acc}}>{"\u27f3"}</div>
          <div style={{fontSize:13,color:C.mu}}>{"AI elemzi a rendel\u00e9si adatokat..."}</div>
        </div>
      )}
      {insight&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Summary */}
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20,borderLeft:`3px solid ${C.acc}`}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:8}}>{"\u00d6SSZEFOGLAL\u00c1S"}</div>
            <div style={{fontSize:14,color:C.tx,lineHeight:1.65}}>{insight.osszesfoglalas}</div>
          </div>
          {/* Stats row */}
          {insight.statisztika&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[
                ["\u00c1tlag teljes\u00edt\u00e9si id\u0151",insight.statisztika.atlagosIdoNap+" nap",C.blue],
                ["Legt\u00f6bb v\u00e1r",insight.statisztika.legtobbenVaro,C.amber],
                ["Teljes\u00edt\u00e9si ar\u00e1ny",insight.statisztika.teljesitesiArany,C.green],
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
            <div style={{fontSize:10,color:C.amber,fontWeight:700,letterSpacing:1,marginBottom:8}}>{"\u26a0 SZ\u0170K KERESZTMETSZET"}</div>
            <div style={{fontSize:13,color:C.t2,lineHeight:1.6}}>{insight.bottleneck}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {/* Suggestions */}
            <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
              <div style={{fontSize:10,color:C.green,fontWeight:700,letterSpacing:1,marginBottom:10}}>{"\u2713 JAVASLATOK"}</div>
              {(insight.javaslatok||[]).map((j,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                  <span style={{color:C.green,fontWeight:800,fontSize:11,flexShrink:0}}>{i+1}.</span>
                  <span style={{fontSize:12,color:C.t2,lineHeight:1.5}}>{j}</span>
                </div>
              ))}
            </div>
            {/* Risks */}
            <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
              <div style={{fontSize:10,color:C.acc,fontWeight:700,letterSpacing:1,marginBottom:10}}>{"\u26a0 KOCK\u00c1ZATOK"}</div>
              {(insight.kockazatok||[]).map((k,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:8}}>
                  <span style={{color:C.acc,fontWeight:800,fontSize:11,flexShrink:0}}>!</span>
                  <span style={{fontSize:12,color:C.t2,lineHeight:1.5}}>{k}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Top parts */}
          {(insight.topAlkatreszek&&insight.topAlkatreszek.length>0)&&(
            <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
              <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>{"LEGGYAKORIBB ALKATR\u00c9SZEK"}</div>
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
  useEffect(()=>{if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth"});},[active,convos.map(c=>(c.messages&&c.messages.length)).join("")]);

  // SSE live messages
  useEffect(()=>{
    const API=window.__getApiBase&&window.__getApiBase()||"";
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
    const API=window.__getApiBase&&window.__getApiBase()||"";
    const endpointMap={wa_pl:`${API}/webhook/vonage/send/whatsapp`,wa_hu:`${API}/webhook/vonage/send/whatsapp`,vb_pl:`${API}/webhook/vonage/send/viber`,vb_hu:`${API}/webhook/vonage/send/viber`,fb_hu:`${API}/webhook/vonage/send/messenger`};
    const endpoint=endpointMap[(ac&&ac.channel)];
    const chLang=ac?(CHANNELS[ac.channel]&&CHANNELS[ac.channel].lang):null;
    if(endpoint&&(ac&&ac.phone)){
      fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("am_token")||""}`},body:JSON.stringify({to:ac.phone,text,lang:chLang})}).catch(()=>{});
    }
  };

  const getAI=async()=>{
    if(!ac)return;setAiLoad(true);setAiSugg(null);
    const chInfo=CHANNELS[ac.channel];
    const lang=(chInfo&&chInfo.lang)==="PL"?"lengyel":"magyar";
    const history=ac.messages.slice(-6).map(m=>(m.from==="in"?"\u00dcgyf\u00e9l: ":"Mi: ")+m.text).join("\n");
    try{
      const txt=await ai([{role:"user",content:`Te egy Autorra aut\u00f3alkatr\u00e9sz AI asszisztense vagy. Az al\u00e1bbi ${lang} nyelv\u0171 besz\u00e9lget\u00e9s alapj\u00e1n adj reszletes professzionalis v\u00e1laszt ${lang} nyelven \u00e9s pontosan hiba nelkul azonos\u00edtsd az \u00e9rdekl\u0151d\u00e9st ha van.\n\nBesz\u00e9lget\u00e9s:\n${history}\n\nV\u00e1laszolj JSON-ban: {"reply":"javasolt v\u00e1lasz allapotfelmeressel ${lang} nyelven","inquiry":{"partName":"alkatr\u00e9sz neve","car":"ALWAYS exact make + model + generation + year e.g. Mercedes-Benz C-Class W204 2010 or BMW 3 Series E90 2008 - NEVER just the brand name alone","quantity":1,"serialNumber":"OEM/part number EXACTLY as written by customer - copy character by character, do NOT interpret or correct - if none mentioned set null","serialNumberConfidence":"high if customer explicitly stated it, low if inferred"}}`}]);
      const d=JSON.parse(txt.split(String.fromCharCode(96,96,96)+"json").join("").split(String.fromCharCode(96,96,96)).join("").trim());
      setAiSugg(d);
    }catch{setAiSugg({reply:"Nem siker\u00fclt az AI elemz\u00e9s.",inquiry:null});}
    setAiLoad(false);
  };

  const createOrder=()=>{
    if(!(aiSugg&&aiSugg.inquiry)||!ac)return;
    onCreateOrder({customer:ac.contact,platform:(ch&&ch.label)||"Inbox",car:aiSugg.inquiry.car||"",parts:[{name:aiSugg.inquiry.partName,qty:aiSugg.inquiry.quantity||1,allegroLink:""}],status:"pending",date:new Date().toISOString().split("T")[0],note:"",createdBy:userName});
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
              <span style={{fontSize:14,fontWeight:800,color:C.tx}}>{"Be\u00e9rkez\u0151"}</span>
              {totalUnread>0&&<span style={{background:C.acc,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:10,fontWeight:700}}>{totalUnread}</span>}
            </div>
            <Btn v="subtle" sz="sm" onClick={()=>setNewConvo(true)}>{"+ \u00daj"}</Btn>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Keres\u00e9s..." style={{...inp,padding:"7px 10px",fontSize:11,width:"100%",marginBottom:8}}/>
          <div style={{display:"flex",gap:4}}>
            {[["all","Mind"],["open","Nyitott"],["pending","F\u00fcgg\u0151"],["solved","Megoldott"]].map(([v,l])=>(
              <button key={v} onClick={()=>setStFilter(v)} style={{flex:1,padding:"4px 0",fontSize:10,fontWeight:600,borderRadius:5,border:"none",cursor:"pointer",background:stFilter===v?C.acc:C.s2,color:stFilter===v?"#fff":C.mu,transition:"all 0.15s"}}>{l}</button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div style={{flex:1,overflowY:"auto"}}>
          {filtered.length===0&&(
            <div style={{padding:"40px 20px",textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>{"\u25c9"}</div>
              <div style={{fontSize:12,color:C.mu}}>{"Nincs \u00fczenet"}</div>
              <div style={{fontSize:11,color:C.mu,marginTop:4}}>{"\u00dczenetek itt jelennek meg"}</div>
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
                    <span style={{width:8,height:8,borderRadius:"50%",background:(chInfo&&chInfo.color)||C.mu,flexShrink:0}}/>
                    <span style={{fontSize:13,fontWeight:c.unread>0?700:500,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.contact}</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                    {c.unread>0&&<span style={{background:C.acc,color:"#fff",borderRadius:8,padding:"1px 6px",fontSize:9,fontWeight:700}}>{c.unread}</span>}
                    <span style={{fontSize:9,color:C.mu}}>{c.lastTime}</span>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",paddingLeft:15}}>
                  <span style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{lastMsg?lastMsg.text:"Nincs \u00fczenet"}</span>
                  <span style={{fontSize:9,fontWeight:600,color:statusDot[c.status]||C.mu,marginLeft:6,flexShrink:0,textTransform:"uppercase"}}>{c.status==="open"?"":"\u25cf "}{c.status==="solved"?"k\u00e9sz":c.status==="pending"?"f\u00fcgg\u0151":""}</span>
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
            <div style={{fontSize:36,opacity:0.3}}>{"\u25c9"}</div>
            <div style={{fontSize:13,fontWeight:600,color:C.t2}}>{"V\u00e1lassz egy besz\u00e9lget\u00e9st"}</div>
            <div style={{fontSize:11,color:C.mu}}>{"Bal oldalt kattints egy \u00fczenetre"}</div>
          </div>
        ):(
          <>
            {/* Chat header */}
            <div style={{padding:"12px 20px",borderBottom:`1px solid ${C.bd}`,background:C.s1,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:"50%",background:(ch&&ch.color)+"20"||C.s2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:(ch&&ch.color)||C.mu,flexShrink:0}}>
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
                {[["open","Nyitott",C.green],["pending","F\u00fcgg\u0151",C.amber],["solved","Megoldott",C.mu]].map(([v,l,col])=>(
                  <button key={v} onClick={()=>setStatus(ac.id,v)} style={{padding:"4px 10px",fontSize:10,fontWeight:600,borderRadius:5,border:`1px solid ${ac.status===v?col:C.bd}`,background:ac.status===v?col+"15":"transparent",color:ac.status===v?col:C.mu,cursor:"pointer"}}>{l}</button>
                ))}
                <Btn v="success" sz="sm" onClick={createOrder} disabled={!(aiSugg&&aiSugg.inquiry)}>{"\u2713 Rendel\u00e9s"}</Btn>
              </div>
            </div>

            {/* Messages */}
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:8}}>
              {ac.messages.length===0&&(
                <div style={{textAlign:"center",color:C.mu,fontSize:12,marginTop:40}}>{"M\u00e9g nincs \u00fczenet ebben a besz\u00e9lget\u00e9sben."}</div>
              )}
              {ac.messages.map(m=>{
                const out=m.from==="out";
                return(
                  <div key={m.id} style={{display:"flex",justifyContent:out?"flex-end":"flex-start"}}>
                    <div style={{maxWidth:"72%",padding:"9px 13px",borderRadius:out?"12px 12px 2px 12px":"12px 12px 12px 2px",background:out?C.acc:C.s2,color:out?"#fff":C.tx,fontSize:13,lineHeight:1.5}}>
                      {m.text}
                      <div style={{fontSize:9,color:out?"rgba(255,255,255,0.6)":C.mu,marginTop:4,textAlign:"right"}}>{m.time}{m.sender&&out?` \u00b7 ${m.sender}`:""}</div>
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
                  <div style={{fontSize:12,color:C.acc,display:"flex",alignItems:"center",gap:6}}>{"\u27f3 AI elemez..."}</div>
                ):(
                  <>
                    <div style={{fontSize:10,color:C.acc,fontWeight:700,letterSpacing:0.8,marginBottom:6}}>{"\u2726 AI JAVASLAT"}</div>
                    {aiSugg.inquiry&&<div style={{fontSize:11,color:C.mu,marginBottom:6}}><strong style={{color:C.t2}}>{aiSugg.inquiry.partName}</strong>{aiSugg.inquiry.car?<span style={{color:C.mu}}> \u00b7 {aiSugg.inquiry.car}</span>:""}{aiSugg.inquiry.serialNumber&&<span style={{marginLeft:6,fontFamily:"monospace",fontSize:10,background:aiSugg.inquiry.serialNumberConfidence==="low"?C.amber+"15":C.green+"15",color:aiSugg.inquiry.serialNumberConfidence==="low"?C.amber:C.green,borderRadius:3,padding:"1px 5px"}}>{aiSugg.inquiry.serialNumberConfidence==="low"?"\u26a0 ":""}{aiSugg.inquiry.serialNumber}</span>}</div>}
                    <div style={{fontSize:12,color:C.t2,background:C.s2,borderRadius:6,padding:"8px 10px",marginBottom:6}}>{aiSugg.reply}</div>
                    <div style={{display:"flex",gap:6}}>
                      <Btn v="subtle" sz="sm" onClick={()=>setReply(aiSugg.reply)}>{"\u21a9 Haszn\u00e1l"}</Btn>
                      {aiSugg.inquiry&&<Btn v="success" sz="sm" onClick={createOrder}>{"\u2713 Rendel\u00e9s"}</Btn>}
                      <Btn v="ghost" sz="sm" onClick={()=>setAiSugg(null)}>{"\u2715"}</Btn>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Input bar */}
            <div style={{padding:"10px 16px",borderTop:`1px solid ${C.bd}`,background:C.s1,flexShrink:0}}>
              <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
                <Btn v="subtle" sz="sm" onClick={getAI} disabled={aiLoad} style={{fontSize:11}}>{"\u2726 AI"}</Btn>
                <div style={{flex:1}}/>
                <select onChange={e=>{if(e.target.value){const isHU=!(CHANNELS[ac.channel]&&CHANNELS[ac.channel].lang)||CHANNELS[ac.channel].lang==="HU";setReply(e.target.value);e.target.value=""}}} style={{...inp,width:"auto",fontSize:11,padding:"4px 8px"}} defaultValue="">
                  <option value="">Sablon...</option>
                  <option value="K\u00f6sz\u00f6nj\u00fck \u00e9rdekl\u0151d\u00e9s\u00e9t! Miben seg\u00edthet\u00fcnk?">{"b \u00dcdv\u00f6zl\u00e9s"}</option>
                  <option value="Az alkatr\u00e9sz k\u00e9szleten van, hamarosan visszajelz\u00fcnk az \u00e1rral.">{"\u2713 K\u00e9szleten"}</option>
                  <option value="Sajnos ez az alkatr\u00e9sz jelenleg nem el\u00e9rhet\u0151. Megpr\u00f3b\u00e1lunk alternat\u00edv\u00e1t keresni.">{"\u2717 Nincs k\u00e9szleten"}</option>
                  <option value="A rendel\u00e9s meg\u00e9rkezett rakt\u00e1runkba, hamarosan sz\u00e1ll\u00edtjuk.">{"6 Meg\u00e9rkezett"}</option>
                  <option value="Az alkatr\u00e9sz \u00e1tvehet\u0151! Mikor tud j\u00f6nni?">{"9 \u00c1tvehet\u0151"}</option>
                </select>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
                <textarea value={reply} onChange={e=>setReply(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&e.ctrlKey)sendMsg();}} placeholder={ch?`\u00dczenet ${ch.lang==="PL"?"lengyel\u00fcl":"magyarul"}... (Ctrl+Enter)`:"V\u00e1lasszon besz\u00e9lget\u00e9st..."} rows={2} style={{...inp,resize:"none",flex:1,lineHeight:1.5,fontSize:13}}/>
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
          <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bd}`,fontSize:14,fontWeight:700,color:C.tx}}>{"\u00daj besz\u00e9lget\u00e9s"}</div>
          <div style={{padding:20,display:"flex",flexDirection:"column",gap:12}}>
            <Field label="\u00dcgyf\u00e9l neve" value={nc.contact} onChange={v=>setNc(x=>({...x,contact:v}))} placeholder="pl. Kov\u00e1cs P\u00e9ter"/>
            <Field label="Csatorna">
              <select value={nc.channel} onChange={e=>setNc(x=>({...x,channel:e.target.value}))} style={inp}>
                {Object.entries(CHANNELS).map(([k,v])=><option key={k} value={k}>{v.label} ({v.country})</option>)}
              </select>
            </Field>
            <Field label="Telefonsz\u00e1m / ID" value={nc.phone} onChange={v=>setNc(x=>({...x,phone:v}))} placeholder="pl. 36201234567"/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn v="outline" onClick={()=>setNewConvo(false)}>{"M\u00e9gse"}</Btn>
              <Btn onClick={addNewConvo} disabled={!nc.contact}>{"L\u00e9trehoz\u00e1s"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Inquiry({onOrderCreated,userName}){
  const[msg,setMsg]=useState("");
  const[cust,setCust]=useState("");
  const[plat,setPlat]=useState("WhatsApp");
  const[res,setRes]=useState(null);
  const[ld,setLd]=useState(false);
  const[err,setErr]=useState("");

  const process=async()=>{
    setLd(true);setRes(null);setErr("");
    const custCode=makeId(cust||"Ugyfel","");
    let calcState={rates:{HUF:390},markup:20,perMarkup:{},fixed:{}};
    try{const cs=await db.get("calc_live_rates",true);if(cs)calcState=JSON.parse(cs);}catch{}
    const plnToHuf=(pln)=>{
      const base=pln*(calcState.rates&&calcState.rates.HUF||390);
      const mup=((calcState.perMarkup&&calcState.perMarkup.HUF)!=null)?calcState.perMarkup.HUF:calcState.markup;
      return Math.round(base*(1+mup/100));
    };
    const prompt="You are an auto parts assistant. Process this inquiry from customer "
      +custCode+". Message: "+JSON.stringify(msg)
      +". Return ONLY valid JSON: {partName,car,quantity,serialNumber,allegroUrl,estimatedPricePLN,priceNote,reply}";
    try{
      const text=await ai([{role:"user",content:prompt}]);
      const clean=text.split(String.fromCharCode(96,96,96)+"json").join("").split(String.fromCharCode(96,96,96)).join("").trim();
      const parsed=JSON.parse(clean);
      if(parsed.estimatedPricePLN){
        parsed.estimatedPriceHUF=plnToHuf(parsed.estimatedPricePLN);
      }
      setRes(parsed);
    }catch{setErr("Hiba. Pr\u00f3b\u00e1lja \u00fajra.");}
    setLd(false);
  };

  const create=()=>{
    if(!res)return;
    onOrderCreated({
      customer:cust||"Ismeretlen",platform:plat,
      part:res.partName,car:res.car||"",
      qty:res.quantity||1,allegroLink:res.allegroUrl||"",
      status:"pending",date:new Date().toISOString().split("T")[0],
      note:"",createdBy:userName
    });
    setMsg("");setCust("");setRes(null);
  };

  return(
    <div>
      <PH sub="AI feldolgoz\u00e1s">{"\u00daj \u00e9rdekl\u0151d\u00e9s"}</PH>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <Field label="\u00dcgyf\u00e9l neve" value={cust} onChange={setCust} placeholder="pl. Kov\u00e1cs P\u00e9ter"/>
        <Field label="Platform">
          <select value={plat} onChange={e=>setPlat(e.target.value)} style={inp}>
            <option>WhatsApp</option>
            <option>Messenger</option>
            <option>Viber</option>
          </select>
        </Field>
      </div>
      <div style={{marginBottom:14}}>
        <Field label="\u00dcgyf\u00e9l \u00fczenet" value={msg} onChange={setMsg}
          placeholder="Illessze be az \u00fczenetet..." rows={4}/>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <Btn onClick={process} disabled={ld||!msg.trim()}>
          {ld?"\u27f3  Elemz\u00e9s...":"\u2726  AI Feldolgoz\u00e1s"}
        </Btn>
        {res&&<Btn v="success" onClick={create}>{"\u2713 Rendel\u00e9s l\u00e9trehoz\u00e1sa"}</Btn>}
      </div>
      {err&&<div style={{color:C.acc,fontSize:13,marginBottom:12}}>{err}</div>}
      {res&&(
        <div style={{background:C.s1,border:"1px solid "+C.bd,borderRadius:9,padding:18}}>
          <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:12}}>AZONOS\u00cdTOTT ALKATR\u00c9SZ</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            {[["Alkatr\u00e9sz",res.partName],["J\u00e1rm\u0171",res.car||"\u2014"],
              ["Cikkz\u00e1m",res.serialNumber||"\u2014"],["Mennyis\u00e9g",(res.quantity||1)+" db"]
            ].map(([k,v])=>(
              <div key={k} style={{background:C.s2,borderRadius:6,padding:"8px 10px"}}>
                <div style={{fontSize:10,color:C.mu,marginBottom:3}}>{k}</div>
                <div style={{fontSize:13,color:C.tx,fontWeight:600}}>{v}</div>
              </div>
            ))}
          </div>
          {res.estimatedPriceHUF&&(
            <div style={{fontSize:18,fontWeight:900,color:C.acc,marginBottom:8}}>
              ~{res.estimatedPriceHUF.toLocaleString("hu")} Ft
            </div>
          )}
          {res.priceNote&&(
            <div style={{fontSize:12,color:C.amber,marginBottom:8}}>{res.priceNote}</div>
          )}
          {res.reply&&(
            <div style={{fontSize:13,color:C.t2,background:C.s2,padding:12,borderRadius:6,lineHeight:1.6}}>
              {res.reply}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STATUS_NOTIFY={
  awaiting:"Kedves \u00dcgyf\u00e9l! Az alkatr\u00e9sz\u00e9t megtal\u00e1ltuk, visszaigazol\u00e1sra v\u00e1r. K\u00e9ri, hogy megrendelj\u00fck?",
  ordered: "Kedves \u00dcgyf\u00e9l! Az alkatr\u00e9sz\u00e9t megrendelt\u00fck. Amint meg\u00e9rkezik Krakk\u00f3ba, \u00e9rtes\u00edtj\u00fck.",
  krakow:  "Kedves \u00dcgyf\u00e9l! Az alkatr\u00e9sze meg\u00e9rkezett krakk\u00f3i rakt\u00e1runkba. A k\u00f6vetkez\u0151 sz\u00e1ll\u00edtm\u00e1nnyal hozzuk.",
  transit: "Kedves \u00dcgyf\u00e9l! Az alkatr\u00e9sze \u00faton van, hamarosan meg\u00e9rkezik az \u00e1tv\u00e9teli ponthoz.",
  ready:   "Kedves \u00dcgyf\u00e9l! Az alkatr\u00e9sze meg\u00e9rkezett \u00e9s \u00e1tvehet\u0151! Mikor tud j\u00f6nni?",
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
      const prompt="Te egy Autorra aut\u00f3alkatr\u00e9sz asszisztense vagy. \u00cdrj r\u00f6vid, szem\u00e9lyes magyar \u00e9rtes\u00edt\u0151 \u00fczenetet az \u00fcgyf\u00e9lnek az al\u00e1bbi adatok alapj\u00e1n. Csak az \u00fczenet sz\u00f6veg\u00e9t \u00edrd, semmi m\u00e1st.";
      const userMsg="\u00dcgyf\u00e9l: "+order.customer+" | Alkatr\u00e9sz: "+order.part+" | J\u00e1rm\u0171: "+order.car+" | Mennyis\u00e9g: "+order.qty+" db | \u00daj st\u00e1tusz: "+ST[newStatus].label+" | Sablon: "+tmpl;
      const generated=await ai([{role:"user",content:prompt+"\n\n"+userMsg}]);
      if(generated) setNotify(n=>n?{...n,msg:generated}:n);
    }catch{}
    setNotifyLoad(false);
  };
  return(<div><PH sub="\u00d6sszes rendel\u00e9s - st\u00e1tusz b\u00e1rmelyik ir\u00e1nyba m\u00f3dos\u00edthat\u00f3">{"Rendel\u00e9sek"}</PH><div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}><div style={{flex:1,position:"relative"}}><span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:C.mu,fontSize:12,pointerEvents:"none"}}>d</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Keres\u00e9s \u00fcgyf\u00e9l, alkatr\u00e9sz, aut\u00f3..." style={{...inp,paddingLeft:32}}/></div><select value={filter} onChange={e=>setFilter(e.target.value)} style={{...inp,width:"auto"}}><option value="all">\u00d6sszes ({orders.length})</option>{SQ.map(s=><option key={s} value={s}>{ST[s].label} ({orders.filter(o=>o.status===s).length})</option>)}</select></div>
    <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"visible"}}><div style={{display:"grid",gridTemplateColumns:"90px 140px 1fr 55px 165px 85px 110px",padding:"9px 16px",borderBottom:`1px solid ${C.bd}`,background:C.s2,borderRadius:"10px 10px 0 0"}}>{["Platform","\u00dcgyf\u00e9l","Alkatr\u00e9sz / Aut\u00f3","Db","St\u00e1tusz","D\u00e1tum",""].map((h,i)=>(<div key={i} style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8}}>{h.toUpperCase()}</div>))}</div>
    {shown.length===0&&<div style={{padding:32,textAlign:"center",color:C.mu,fontSize:13}}>{"Nincs tal\u00e1lat."}</div>}
    {shown.map((o,i)=>{const next=SQ[SQ.indexOf(o.status)+1];const isOpen=detailId===o.id;return(<div key={o.id} style={{borderBottom:i<shown.length-1?`1px solid ${C.bd}`:"none"}}><div onClick={()=>setDetailId(isOpen?null:o.id)} style={{display:"grid",gridTemplateColumns:"90px 140px 1fr 55px 165px 85px 110px",padding:"12px 16px",alignItems:"center",cursor:"pointer",background:isOpen?C.acc+"06":"transparent"}}><div style={{display:"flex",flexDirection:"column",gap:3}}><PBadge p={o.platform}/><span style={{fontSize:9,color:C.mu,fontFamily:"monospace",fontWeight:700}}>{makeId(o.customer,o.zip)}</span></div><div style={{fontSize:13,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{o.customer}</div><div style={{paddingRight:8}}><div style={{fontSize:13,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{partsLabel(o)}</div><div style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.car}</div></div><div style={{fontSize:13,color:C.t2,fontWeight:getParts(o).length>1?700:400,color:getParts(o).length>1?C.amber:C.t2}}>{totalQty(o)} db</div>
    <div style={{position:"relative"}}><SBadge status={o.status} onClick={e=>{e.stopPropagation();setStatusPicker(statusPicker===o.id?null:o.id);}}/>{statusPicker===o.id&&(<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:100,background:C.s1,border:`1px solid ${C.bd2}`,borderRadius:8,padding:6,minWidth:200,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,padding:"4px 8px 6px"}}>{"ST\u00c1TUSZ M\u00d3DOS\u00cdT\u00c1SA"}</div>{SQ.map(s=>(<button key={s} onClick={()=>{onChange(o.id,{status:s});setStatusPicker(null);if(STATUS_NOTIFY[s])triggerNotify(o,s);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",background:o.status===s?ST[s].bg:"transparent",border:"none",cursor:"pointer",borderRadius:5,fontFamily:F}}><span style={{width:7,height:7,borderRadius:"50%",background:ST[s].color,flexShrink:0}}/><span style={{fontSize:12,color:o.status===s?ST[s].color:C.t2,fontWeight:o.status===s?700:500}}>{ST[s].label}</span>{o.status===s&&<span style={{marginLeft:"auto",fontSize:10,color:ST[s].color}}>{"\u2713"}</span>}</button>))}</div>)}</div>
    <div style={{fontSize:11,color:C.mu}}>{o.date}</div><div style={{display:"flex",gap:4}}>{next&&<Btn v="subtle" sz="sm" onClick={e=>{e.stopPropagation();onChange(o.id,{status:next});if(STATUS_NOTIFY[next])triggerNotify(o,next);}} style={{padding:"4px 8px",fontSize:11}}>{"\u2192"}</Btn>}<Btn v="ghost" sz="sm" onClick={e=>{e.stopPropagation();startEdit(o);}} style={{padding:"4px 8px",fontSize:12}}>{"\u270e"}</Btn><Btn v="ghost" sz="sm" onClick={e=>{e.stopPropagation();setDel(o.id);}} style={{padding:"4px 8px",fontSize:12,color:C.acc}}>{"\u2715"}</Btn></div></div>{o.note&&<div style={{padding:"0 16px 10px",fontSize:11,color:C.mu}}>c {o.note}</div>}{isOpen&&(<div style={{padding:"0 16px 16px",borderTop:`1px solid ${C.bd}`,marginTop:4,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>ID</div><div style={{fontSize:13,fontWeight:800,color:C.tx,fontFamily:"monospace"}}>{makeId(o.customer,o.zip)}</div></div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>PLATFORM</div><PBadge p={o.platform}/></div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>{"D\u00c1TUM"}</div><div style={{fontSize:13,color:C.tx}}>{o.date}</div></div><div style={{gridColumn:"1/-1",background:C.s2,borderRadius:8,padding:"12px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:8}}>ALKATR\u00c9SZEK ({getParts(o).length} t\u00e9tel \u00b7 {totalQty(o)} db)</div>{getParts(o).map((p,pi)=>(<div key={pi} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderTop:pi>0?`1px solid ${C.bd}`:"none"}}><span style={{fontSize:11,color:C.mu,minWidth:20}}>{pi+1}.</span><span style={{flex:1,fontSize:13,color:C.tx}}>{p.name}</span><span style={{fontSize:12,fontWeight:700,color:C.acc,minWidth:40,textAlign:"right"}}>{p.qty} db</span>{p.allegroLink&&<a href={p.allegroLink} target="_blank" rel="noreferrer" style={{fontSize:10,color:C.blue,textDecoration:"none"}}>d</a>}</div>))}</div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>{"J\u00c1RM\u0170"}</div><div style={{fontSize:13,color:C.tx}}>{o.car}</div></div></div>)}</div>)})}</div>
    <div style={{marginTop:8,fontSize:11,color:C.mu}}>{"Kattintson a st\u00e1tuszra a m\u00f3dos\u00edt\u00e1shoz - b\u00e1rmely ir\u00e1nyba."}</div>
    {statusPicker&&<div onClick={()=>setStatusPicker(null)} style={{position:"fixed",inset:0,zIndex:99}}/>}

      {notify&&(
        <Modal onClose={()=>setNotify(null)} width={480}>
          <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{"\u00dcgyf\u00e9l \u00e9rtes\u00edt\u00e9se"}</div>
              <div style={{fontSize:11,color:C.mu,marginTop:2}}>{notify.order.customer} \u00b7 {makeId(notify.order.customer,notify.order.zip)} \u00b7 {(ST[notify.newStatus]&&ST[notify.newStatus].label)}</div>
            </div>
            <Btn v="ghost" sz="sm" onClick={()=>setNotify(null)}>{"\u2715"}</Btn>
          </div>
          <div style={{padding:22}}>
            {notifyLoad&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,fontSize:12,color:C.acc}}><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>{"\u27f3"}</span>{" AI szem\u00e9lyre szabja az \u00fczenetet..."}</div>}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1}}>{"\u00dcZENET AZ \u00dcGYF\u00c9LNEK"}</div>
              {!notifyLoad&&<span style={{fontSize:9,background:C.acc+"15",color:C.acc,borderRadius:3,padding:"1px 6px",fontWeight:700}}>{"\u2726 AI"}</span>}
            </div>
            <textarea
              value={notify.msg}
              onChange={e=>setNotify(n=>({...n,msg:e.target.value}))}
              rows={4}
              style={{...inp,resize:"vertical",lineHeight:1.6,marginBottom:14,opacity:notifyLoad?0.5:1}}
            />
            <div style={{display:"flex",gap:8,justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,color:C.mu}}>{"Szerkeszthet\u0151 \u00b7 M\u00e1solja \u00e9s k\u00fcldje el a megfelel\u0151 csatorn\u00e1n."}</div>
              <div style={{display:"flex",gap:8}}>
                <CopyBtn text={notify.msg}/>
                <Btn v="outline" onClick={()=>setNotify(null)}>{"Bez\u00e1r"}</Btn>
              </div>
            </div>
          </div>
        </Modal>
      )}
    {editing&&(
      <Modal onClose={()=>setEditing(null)} width={580}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{"Rendel\u00e9s szerkeszt\u00e9se"}</div>
          <Btn v="ghost" sz="sm" onClick={()=>setEditing(null)}>{"\u2715"}</Btn>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Field label="\u00dcgyf\u00e9l neve" {...e("customer")}/>
            <Field label="Ir\u00e1ny\u00edt\u00f3sz\u00e1m" {...e("zip")} placeholder="pl. 2900"/>
            <Field label="J\u00e1rm\u0171" {...e("car")}/>
            <Field label="Platform">
              <select value={ef.platform||"WhatsApp"} onChange={ev=>setEf(x=>({...x,platform:ev.target.value}))} style={inp}>
                <option>WhatsApp</option><option>Messenger</option><option>Viber</option>
              </select>
            </Field>
            <Field label="St\u00e1tusz">
              <select value={ef.status||"pending"} onChange={ev=>setEf(x=>({...x,status:ev.target.value}))} style={inp}>
                {SQ.map(s=><option key={s} value={s}>{ST[s].label}</option>)}
              </select>
            </Field>
          </div>

          <div>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>{"ALKATR\u00c9SZEK"}</div>
            {(ef.parts||[]).map((p,pi)=>(
              <div key={pi} style={{display:"grid",gridTemplateColumns:"1fr 55px 160px auto",gap:8,marginBottom:7,alignItems:"center"}}>
                <input
                  value={p.name||""}
                  onChange={ev=>{const ps=[...ef.parts];ps[pi]={...ps[pi],name:ev.target.value};setEf(x=>({...x,parts:ps}));}}
                  placeholder="Alkatr\u00e9sz neve"
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
                  title={(ef.parts||[]).length<=1?"Legal\u00e1bb egy t\u00e9tel sz\u00fcks\u00e9ges":"T\u00f6rl\u00e9s"}
                >{"\u2715"}</button>
              </div>
            ))}
            <Btn v="subtle" sz="sm" onClick={()=>setEf(x=>({...x,parts:[...(x.parts||[]),{name:"",qty:1,allegroLink:""}]}))}>+ Alkatr\u00e9sz hozz\u00e1ad\u00e1sa</Btn>
          </div>

          <Field label="Megjegyz\u00e9s" {...e("note")} rows={2} placeholder="Bels\u0151 megjegyz\u00e9s..."/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="outline" onClick={()=>setEditing(null)}>{"M\u00e9gse"}</Btn>
            <Btn onClick={saveEdit} disabled={!(ef.parts||[]).some(p=>(p.name&&p.name.trim()))}>{"Ment\u00e9s"}</Btn>
          </div>
        </div>
      </Modal>
    )}
    {del&&(<Modal onClose={()=>setDel(null)} width={360}><div style={{padding:28,textAlign:"center"}}><div style={{fontSize:28,marginBottom:12}}>{"\u26a0"}</div><div style={{fontSize:15,fontWeight:700,color:C.tx,marginBottom:8}}>{"T\u00f6rli a rendel\u00e9st?"}</div><div style={{fontSize:13,color:C.mu,marginBottom:22}}>{"Ez a m\u0171velet nem visszavonhat\u00f3."}</div><div style={{display:"flex",gap:8,justifyContent:"center"}}><Btn v="outline" onClick={()=>setDel(null)}>{"M\u00e9gse"}</Btn><Btn v="danger" onClick={()=>{onDelete(del);setDel(null);}}>{"T\u00f6rl\u00e9s"}</Btn></div></div></Modal>)}
  </div>);
}

function Krakow({orders,onChange}){
  const items=orders.filter(o=>o.status==="krakow");
  return(<div><PH sub="\u00c1tv\u00e9telre v\u00e1r\u00f3 csomagok Krakk\u00f3ban">{"Krakk\u00f3i rakt\u00e1r"}</PH>{items.length===0?(<div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center"}}><div style={{fontSize:28,marginBottom:10}}>6</div><div style={{color:C.mu,fontSize:13}}>{"Nincs csomag a rakt\u00e1rban."}</div></div>):(<><div style={{background:C.purple+"10",border:`1px solid ${C.purple}22`,borderRadius:8,padding:"12px 16px",marginBottom:16}}><span style={{color:C.purple,fontWeight:700,fontSize:13}}>6 {items.length} csomag v\u00e1r a rakt\u00e1rban</span></div><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>{items.map((o,i)=>(<div key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<items.length-1?`1px solid ${C.bd}`:"none"}}><PBadge p={o.platform}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.tx}}>{o.customer}</div><div style={{fontSize:11,color:C.mu}}>{o.part} \u00b7 {o.qty} db</div></div><Btn v="outline" sz="sm" onClick={()=>onChange(o.id,{status:"transit"})}>{"7 \u00daton van"}</Btn></div>))}</div><Btn full onClick={()=>items.forEach(o=>onChange(o.id,{status:"transit"}))}>{"7 \u00d6sszes csomag - fuvar ind\u00edt\u00e1sa"}</Btn></>)}</div>);
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
        if(r2.ok){const d2=await r2.json();if((d2.pln&&d2.pln.uah))combined["UAH"]=d2.pln.uah;if((d2.pln&&d2.pln.rsd))combined["RSD"]=d2.pln.rsd;}
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
    if((f&&f.on) && (f&&f.val) && parseFloat(f.val)>0) return parseFloat(f.val);
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
  const ts=lastFetch?lastFetch.toLocaleTimeString("hu",{hour:"2-digit",minute:"2-digit"}):"";

  const statusCfg={
    idle:    {dot:C.mu,   text:"Kattintson az \u00e9l\u0151 \u00e1rfolyam let\u00f6lt\u00e9s\u00e9hez"},
    loading: {dot:C.amber,text:"Let\u00f6lt\u00e9s folyamatban..."},
    live:    {dot:C.green,text:`\u00c9l\u0151 \u00e1rfolyam - ${ts} \u00b7 frankfurter.app`},
    fallback:{dot:C.amber,text:`Be\u00e9p\u00edtett \u00e1rfolyam - ${ts} \u00b7 \u00e9l\u0151 forr\u00e1s nem el\u00e9rhet\u0151`},
    error:   {dot:C.red,  text:"Nem siker\u00fclt let\u00f6lteni."},
  }[status]||{dot:C.mu,text:""};

  return(
    <div>
      <PH sub="PLN \u00e1tv\u00e1lt\u00e1sa a szomsz\u00e9dos orsz\u00e1gok p\u00e9nznemeibe, fel\u00e1rral">{"\u00c1rkalkul\u00e1tor"}</PH>

      <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:20,alignItems:"start"}}>

        {/* -- LEFT: controls -- */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* PLN input */}
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:8}}>{"\u00d6SSZEG ZLOTIBAN"}</div>
            <div style={{position:"relative"}}>
              <input type="number" value={pln} onChange={e=>setPln(e.target.value)} placeholder="0.00" min="0" step="0.01"
                style={{...inp,fontSize:26,fontWeight:700,paddingRight:52,height:54}}/>
              <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:14,color:C.mu,fontWeight:700,pointerEvents:"none"}}>PLN</span>
            </div>
          </div>

          {/* Markup */}
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>{"FEL\u00c1R"}</div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <input type="range" min="0" max="100" step="1" value={markup} onChange={e=>saveMarkup(parseInt(e.target.value))}
                style={{flex:1,accentColor:C.acc,cursor:"pointer"}}/>
              <div style={{fontSize:22,fontWeight:800,color:C.acc,minWidth:48,textAlign:"right"}}>{markup}%</div>
            </div>
            <div style={{fontSize:11,color:C.mu,marginTop:8}}>PLN \u00d7 \u00e1rfolyam \u00d7 {mult.toFixed(2)} = v\u00e9gs\u0151 \u00e1r</div>
          </div>

          {/* Fetch button + status */}
          <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:18}}>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>{"\u00c9L\u0150 \u00c1RFOLYAM"}</div>
            <button onClick={fetchRates} disabled={status==="loading"} style={{width:"100%",height:44,background:status==="live"?C.green+"22":status==="fallback"?C.amber+"22":C.acc,color:status==="live"?C.green:status==="fallback"?C.amber:"#fff",border:status==="live"?`1px solid ${C.green}40`:status==="fallback"?`1px solid ${C.amber}40`:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:status==="loading"?"not-allowed":"pointer",fontFamily:F,marginBottom:10}}>
              {status==="loading"?"\u27f3  Let\u00f6lt\u00e9s folyamatban...":(status==="live"||status==="fallback")?"\u21ba  Friss\u00edt\u00e9s":"\u2b07  \u00c1rfolyam let\u00f6lt\u00e9se"}
            </button>
            <div style={{display:"flex",alignItems:"center",gap:7,fontSize:11,color:C.mu}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:statusCfg.dot,flexShrink:0}}/>
              {statusCfg.text}
            </div>
          </div>

          {/* Fixed rates summary */}
          {Object.values(fixed).some(f=>(f&&f.on))&&(
            <div style={{background:C.acc+"10",border:`1px solid ${C.acc}25`,borderRadius:10,padding:14}}>
              <div style={{fontSize:10,color:C.acc,fontWeight:700,letterSpacing:1,marginBottom:8}}>{"R\u00d6GZ\u00cdTETT \u00c1RFOLYAMOK"}</div>
              {CURRENCIES.filter(cur=>(fixed[cur.code]&&fixed[cur.code].on)).map(cur=>(
                <div key={cur.code} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:C.t2,marginBottom:4}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5}}>{cur.countries.slice(0,2).map((cc,i)=><Flag key={i} code={cc} sm/>)} {cur.code}</span>
                  <span style={{color:C.acc,fontWeight:700}}>1 PLN = {(fixed[cur.code]&&fixed[cur.code].val)} {cur.code}</span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* -- RIGHT: currency cards always visible -- */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {!hasRates&&(
            <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:32,textAlign:"center",marginBottom:4}}>
              <div style={{fontSize:24,marginBottom:8}}>1</div>
              <div style={{color:C.mu,fontSize:13}}>{"T\u00f6ltse le az \u00e1rfolyamot, vagy adjon meg fix \u00e9rt\u00e9ket."}</div>
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
                      {cur.home&&<span style={{background:C.green+"15",color:C.green,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:800,letterSpacing:0.5}}>{"SAJ\u00c1T"}</span>}
                      {isFixed&&<span style={{background:C.acc+"15",color:C.acc,borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:800,letterSpacing:0.5}}>{"R\u00d6GZ\u00cdTETT"}</span>}
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
                  <div style={{flex:1,fontSize:11,color:isFixed?C.acc:C.mu}}>{rateDisplay}{isFixed&&liveRate&&<span style={{color:C.mu,marginLeft:6}}>(\u00e9l\u0151: {liveRate>=1?liveRate.toFixed(4):liveRate.toFixed(6)})</span>}</div>
                  <div onClick={()=>toggleFix(cur.code)} style={{width:32,height:18,borderRadius:9,background:isFixed?C.acc:C.bd2,position:"relative",transition:"background 0.2s",cursor:"pointer",flexShrink:0}}>
                    <div style={{position:"absolute",top:2,left:isFixed?14:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                  </div>
                  <span style={{fontSize:10,color:isFixed?C.acc:C.mu,fontWeight:700,userSelect:"none",cursor:"pointer"}} onClick={()=>toggleFix(cur.code)}>Fix</span>
                </div>

                {/* Per-currency markup */}
                <div style={{marginTop:6,display:"flex",alignItems:"center",gap:8}}>
                  <div style={{fontSize:10,color:C.mu,fontWeight:700,whiteSpace:"nowrap"}}>{"Fel\u00e1r:"}</div>
                  <input type="number" value={perMarkup[cur.code]!==undefined?perMarkup[cur.code]:""} onChange={e=>savePerMarkup(cur.code,e.target.value)} placeholder={markup+"%"} min="0" max="200" step="1"
                    style={{...inp,fontSize:12,fontWeight:700,color:perMarkup[cur.code]!=null?C.acc:C.mu,width:60,height:30,padding:"4px 8px",textAlign:"center"}}/>
                  <div style={{fontSize:10,color:C.mu}}>% {perMarkup[cur.code]!=null?<span style={{color:C.acc}}>{"egy\u00e9ni"}</span>:<span>{"\u2190 glob\u00e1lis"}</span>}</div>
                  {perMarkup[cur.code]!=null&&<button onClick={()=>savePerMarkup(cur.code,"")} style={{background:"transparent",border:"none",color:C.mu,cursor:"pointer",fontSize:10,fontFamily:F}}>{"t\u00f6rl\u00e9s"}</button>}
                </div>

                {/* Fixed rate input */}
                {isFixed&&(
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{fontSize:10,color:C.acc,fontWeight:700,whiteSpace:"nowrap"}}>1 PLN =</div>
                    <input type="number" value={fx.val} onChange={e=>setFixVal(cur.code,e.target.value)} placeholder="pl. 92.5" step="any"
                      style={{...inp,fontSize:14,fontWeight:700,color:C.acc,border:`1px solid ${C.acc}50`,background:C.acc+"08",flex:1,height:36}}/>
                    <div style={{fontSize:10,color:C.acc,fontWeight:700}}>{cur.code}</div>
                    {liveRate&&(
                      <button onClick={()=>setFixVal(cur.code,liveRate>=1?liveRate.toFixed(4):liveRate.toFixed(6))} style={{background:C.s3,border:`1px solid ${C.bd}`,borderRadius:5,padding:"4px 8px",fontSize:10,color:C.mu,cursor:"pointer",fontFamily:F,whiteSpace:"nowrap"}}>\u00c9l\u0151 be\u00e1ll\u00edt\u00e1sa</button>
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
        <Btn v="subtle" sz="sm" onClick={()=>startNew(lang)} style={{fontSize:10,padding:"3px 10px"}}>{"+ \u00daj sablon"}</Btn>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {(items||[]).map(t=>(
          <div key={t.id} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:8,padding:"13px 15px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7,gap:8}}>
              <div style={{fontSize:13,fontWeight:600,color:C.tx,flex:1}}>{t.title}</div>
              <div style={{display:"flex",gap:5,flexShrink:0}}>
                <CopyBtn text={t.text}/>
                <button onClick={()=>startEdit(lang,t)} style={{background:"transparent",border:`1px solid ${C.bd}`,borderRadius:4,padding:"2px 7px",fontSize:10,color:C.mu,cursor:"pointer",fontFamily:F}}>{"\u270e"}</button>
                <button onClick={()=>deleteTpl(lang,t.id)} style={{background:"transparent",border:`1px solid ${C.bd}`,borderRadius:4,padding:"2px 7px",fontSize:10,color:C.acc,cursor:"pointer",fontFamily:F}}>{"\u2715"}</button>
              </div>
            </div>
            <div style={{fontSize:12,color:C.mu,lineHeight:1.65}}>{t.text}</div>
          </div>
        ))}
        {(!items||items.length===0)&&<div style={{fontSize:12,color:C.mu,textAlign:"center",padding:16}}>{"Nincs sablon. Hozzon l\u00e9tre egyet."}</div>}
      </div>
    </div>
  );

  if(!ready) return <div style={{color:C.mu,padding:40,textAlign:"center"}}>{"Bet\u00f6lt\u00e9s..."}</div>;
  return(
    <div>
      <PH sub="Sablonok">Sablonok</PH>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <Section lang="pl" title="\u1f1f5\u1f1f1 Lengyel - elad\u00f3knak" items={plTpl}/>
        <Section lang="hu" title="\u1f1ed\u1f1fa Magyar - \u00fcgyfeleknek" items={huTpl}/>
      </div>

      {editing&&(
        <Modal onClose={cancelEdit} width={500}>
          <div style={{padding:"18px 22px",borderBottom:`1px solid ${C.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.tx}}>{editing.id==="new"?"\u00daj sablon":"Sablon szerkeszt\u00e9se"}</div>
            <Btn v="ghost" sz="sm" onClick={cancelEdit}>{"\u2715"}</Btn>
          </div>
          <div style={{padding:22,display:"flex",flexDirection:"column",gap:12}}>
            <Field label="Sablon neve" value={editing.title} onChange={v=>setEditing(e=>({...e,title:v}))} placeholder="pl. El\u00e9rhet\u0151s\u00e9g k\u00e9rd\u00e9se"/>
            <Field label="\u00dczenet sz\u00f6vege" value={editing.text} onChange={v=>setEditing(e=>({...e,text:v}))} rows={5} placeholder="Sablon sz\u00f6vege..."/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn v="outline" onClick={cancelEdit}>{"M\u00e9gse"}</Btn>
              <Btn onClick={saveEdit} disabled={!editing.title||!editing.text}>{"Ment\u00e9s"}</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

const BF={partName:"",category:"",_catParent:"",serialNumber:"",serialNumberVerified:"",serialNumberWarning:"",serialNumberConfidence:"",car:"",condition:"J\u00f3",price:"",estimatedPriceHUF:"",priceNote:"",contact:"",pickup:"",description:""};
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

  // Keep raw images separately for re-analysis
  const[rawImages,setRawImages]=useState([]);
  
  const runAI=async(rawImgs)=>{
    if(!rawImgs||rawImgs.length===0){setAnalyzing(false);return;}
    setAnalyzing(true);
    // Timeout guard: fail after 45 seconds
    const timeoutId=setTimeout(()=>{setAnalyzing(false);alert("AI elemz\u00e9s id\u0151t\u00fall\u00e9p\u00e9s. Pr\u00f3b\u00e1ld \u00fajra.");},45000);
    try{
      const knownSerials=Object.entries(learned).slice(0,20).map(([s,v])=>`${s} = ${v.car} (${v.partName})`).join("\n");
      const msgContent=[
        ...rawImgs.map(b64=>({type:"image",source:{type:"base64",media_type:b64.split(";")[0].split(":")[1],data:b64.split(",")[1]}})),
        {type:"text",text:`You are an expert auto parts identification specialist.\n\nSTEP 1 - READ SERIAL:\n- Read every character digit by digit exactly as stamped/engraved/printed\n- Common misreads to avoid: 0 vs O, 1 vs I vs l, 5 vs 6, 6 vs 5, 8 vs B, 2 vs Z\n- Note any ambiguous characters in serialNumberWarning\n\nSTEP 2 - LOOK UP SERIAL IN YOUR KNOWLEDGE BASE:\n- Search your training data for this exact OEM/part number\n- What part does this number correspond to? (manufacturer catalog knowledge)\n- Does it match what you visually see in the image? Flag any mismatch in serialNumberVerified\n- What is the retail/wholesale price range for this part in PLN?\n\nSTEP 3 - IDENTIFY CAR FROM SERIAL (OEM prefix knowledge):\n- Mercedes-Benz: A + 3-digit chassis (A205=C-Class W205 2014-2021, A213=E-Class W213 2016+, A166=ML/GL W166, A176=A-Class W176, A117=CLA, A172=SLK)\n- VW/Skoda/Seat: 1K=Golf V/VI MkV, 5K=Golf VI, 5Q=Golf VII, 8P=Audi A3 8P, 8V=Audi A3 8V, 3C=Passat B6\n- BMW: 31xx=E90/E91 3-series, 34xx=brakes, prefix 51=body, 3310=steering; generation from last 2 digits of number\n- Opel: 13xxx, 90xxx series\n- Ford: 1xxx, 2xxx series\n- Use prefix + your knowledge to give FULL: Make + Model + Generation code + Year range\n- e.g. Mercedes-Benz C-Class W205 2014-2021, BMW 3 Series E90 2005-2012\n- NEVER just a brand name - always include model + generation\n- If truly unknown after lookup: null\n${knownSerials?"\\nSTEP 4 - CHECK AGAINST YOUR CORRECTIONS:\\n"+knownSerials:""}\n\nRespond ONLY with valid JSON:\n{"partName":"specific Hungarian part name","serialNumber":"exact digits or null","serialNumberVerified":"cross-reference result","serialNumberWarning":"ambiguous chars or null","serialNumberConfidence":"high/medium/low","car":"make model year or null","condition":"J\u00f3","estimatedPricePLN":0,"estimatedPriceHUF":0,"priceNote":"OEM vs aftermarket range","description":"2-3 sentence Hungarian description"}`}
      ];
      const txt=await ai([{role:"user",content:msgContent}]);
      const d=JSON.parse(txt.split(String.fromCharCode(96,96,96)+"json").join("").split(String.fromCharCode(96,96,96)).join("").trim());
      setForm(x=>({...x,
        partName:d.partName||"",
        serialNumber:d.serialNumber||"",
        serialNumberVerified:d.serialNumberVerified||"",
        serialNumberWarning:d.serialNumberWarning||"",
        serialNumberConfidence:d.serialNumberConfidence||"",
        car:d.car||"",
        condition:d.condition||"J\u00f3",
        description:d.description||"",
        estimatedPriceHUF:d.estimatedPriceHUF?""+d.estimatedPriceHUF:"",
        priceNote:d.priceNote||"",
      }));
    }catch(e){console.error("AI analyse error:",e);alert("AI elemz\u00e9si hiba: "+(e.message||"ismeretlen"));}
    clearTimeout(timeoutId);
    setAnalyzing(false);
  };

  const handleFiles=async(files)=>{
    const raw=await Promise.all(Array.from(files).map(file=>new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(file);})));
    const compressed=await Promise.all(raw.map(compressImage));
    setImages(prev=>[...prev,...compressed]);
    setRawImages(prev=>[...prev,...raw]);
    runAI(raw);
  };

  const retryAnalyze=()=>{
    if(rawImages.length===0){alert("Nincs k\u00e9p az \u00fajraelemz\u00e9shez.");return;}
    runAI(rawImages);
  };

  const publish=async()=>{
    if(!form.partName||!form.price){alert("Alkatr\u00e9sz neve \u00e9s \u00e1ra k\u00f6telez\u0151.");return;}
    setSaving(true);
    if(form.serialNumber&&form.car) await saveLearn(form.serialNumber,form.car,form.partName);
    const id=Date.now();
    // Strip form internals before saving
    const {_catParent,...formClean}=form;
    const meta={id,...formClean,publishedBy:(user&&user.name)||"?",publishedAt:new Date().toISOString(),sold:false};
    // Save images to separate keyspace (keeps catalogue_items small, under Turso 5MB cap)
    try{
      if(images.length>0){
        const ok=await db.set("catalogue_img_"+id,images,true);
        if(!ok)console.warn("Image save returned falsy - item will be listed without images");
      }
      // Prepend new meta, strip images from existing items for the list
      const metaList=[meta,...items.map(({images:_imgs,...rest})=>rest)];
      await db.set("catalogue_items",metaList,true);
    }catch(e){
      console.error("Catalogue save failed:",e);
      setSaving(false);
      alert("Ment\u00e9s sikertelen: "+(e.message||"ismeretlen hiba")+". Ellen\u0151rizd a kapcsolatot.");
      return;
    }
    // Reload from storage to ensure consistency with the public catalogue
    try{
      const d=await db.get("catalogue_items",true);
      const metaArr=Array.isArray(d)?d:[];
      const withImages=await Promise.all(metaArr.map(async m=>{
        const imgs=await db.get("catalogue_img_"+m.id,true);
        return {...m,images:Array.isArray(imgs)?imgs:[]};
      }));
      setItems(withImages);
    }catch(e){console.error("Reload failed:",e);}
    setShowForm(false);
    setImages([]);
    setRawImages([]);
    setForm(BF);
    setSaving(false);
  };

  const toggleSold=async(id)=>{const u=items.map(i=>i.id===id?{...i,sold:!i.sold}:i);await db.set("catalogue_items",u.map(i=>({...i,images:undefined})),true);setItems(u);};
  const remove=async(id)=>{const u=items.filter(i=>i.id!==id);await db.set("catalogue_items",u.map(i=>({...i,images:undefined})),true);await db.set("catalogue_img_"+id,[],true);setItems(u);if((detail&&detail.id)===id)setDetail(null);};

  const COND_ADMIN={"J\u00f3":C.green,Bontott:C.amber,"Hib\u00e1s":C.acc,"Fel\u00faj\u00edtott":C.blue};
  const condColor=(c)=>COND_ADMIN[c]||C.mu;

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
        <PH sub="Katalogus">{"Katal\u00f3gus"}</PH>
        <div style={{display:"flex",gap:8}}>
          <Btn v="outline" sz="sm" onClick={()=>{setShowForm(false);window.__setPublic&&window.__setPublic(true);}}>{"Nyilv\u00e1nos n\u00e9zet"}</Btn>
          <Btn onClick={()=>setShowForm(f=>!f)}>{showForm?"\u2715 M\u00e9gse":"+ \u00daj alkatr\u00e9sz"}</Btn>
        </div>
      </div>

      {/* Upload form */}
      {showForm&&(
        <div style={{background:C.s1,border:`1px solid ${C.acc}25`,borderRadius:10,padding:22,marginBottom:20}}>
          <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:14}}>{"\u00daJ ALKATR\u00c9SZ"}</div>

          {/* Image upload */}
          <div onClick={()=>fileRef.current&&fileRef.current.click()} style={{border:`2px dashed ${images.length?C.acc:C.bd2}`,borderRadius:8,padding:16,textAlign:"center",cursor:"pointer",marginBottom:16}}>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
            {images.length?(
              <div>
                <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:8}}>
                  {images.map((src,i)=>(
                    <div key={i} style={{position:"relative"}}>
                      <img src={src} alt="" style={{height:72,width:72,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bd}`}}/>
                      <button onClick={ev=>{ev.stopPropagation();setImages(imgs=>imgs.filter((_,j)=>j!==i));}} style={{position:"absolute",top:-6,right:-6,background:C.acc,color:"#fff",border:"none",borderRadius:"50%",width:18,height:18,cursor:"pointer",fontSize:9,fontFamily:F}}>{"\u2715"}</button>
                    </div>
                  ))}
                  <div style={{height:72,width:72,border:`2px dashed ${C.bd2}`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:C.mu,fontSize:22}}>+</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,fontSize:11,fontWeight:600}}>
                  <span style={{color:analyzing?C.amber:C.green}}>{analyzing?"\u27f3 AI elemz\u00e9s folyamatban...":"\u2713 Felt\u00f6ltve - szerkeszd az adatokat"}</span>
                  {!analyzing&&images.length>0&&<button onClick={ev=>{ev.stopPropagation();retryAnalyze();}} style={{padding:"4px 10px",background:"transparent",border:`1px solid ${C.acc}40`,color:C.acc,fontSize:10,fontWeight:600,cursor:"pointer",borderRadius:4,fontFamily:F}}>{"\u21bb \u00dajra elemz\u00e9s"}</button>}
                  {analyzing&&<button onClick={ev=>{ev.stopPropagation();setAnalyzing(false);}} style={{padding:"4px 10px",background:"transparent",border:`1px solid ${C.mu}40`,color:C.mu,fontSize:10,fontWeight:600,cursor:"pointer",borderRadius:4,fontFamily:F}}>{"M\u00e9gse"}</button>}
                </div>
              </div>
            ):(
              <div>
                <div style={{fontSize:24,marginBottom:6,color:C.mu}}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
                <div style={{fontSize:13,color:C.mu}}>{"Kattints a k\u00e9pek felt\u00f6lt\u00e9s\u00e9hez - AI automatikusan felismeri az alkatr\u00e9szt"}</div>
              </div>
            )}
          </div>

          {/* Form fields */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <Field label="Alkatr\u00e9sz neve" {...f("partName")} placeholder="pl. Els\u0151 f\u00e9kt\u00e1rcsa"/><Field label="Kateg\u00f3ria">
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <select value={form._catParent||""} onChange={e=>{setForm(x=>({...x,_catParent:e.target.value,category:""}));}} style={{...inp,fontSize:12}}>
      <option value="">{"-- F\u0151kateg\u00f3ria --"}</option>
      {PART_CAT_TREE.map(c=><option key={c.id} value={c.id}>{c.hu}</option>)}
    </select>
    {form._catParent&&(
      <select value={form.category||""} onChange={e=>setField("category",e.target.value)} style={{...inp,fontSize:12}}>
        <option value="">{"-- Alkateg\u00f3ria --"}</option>
        {((PART_CAT_TREE.find(c=>c.id===form._catParent)||{sub:{hu:[]}}).sub.hu||[]).map(s=><option key={s} value={s}>{s}</option>)}
      </select>
    )}
    {form.category&&<div style={{fontSize:10,color:C.green,marginTop:2}}>\u2713 {form.category}</div>}
  </div>
</Field>
            <Field label="Sorozatsz\u00e1m / OEM" {...f("serialNumber")} placeholder="pl. 1K0615301AA"/>
            {form.serialNumberWarning&&<div style={{gridColumn:"1/-1",background:C.amber+"10",border:`1px solid ${C.amber}25`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.amber}}>\u26a0 {form.serialNumberWarning}</div>}
            {form.serialNumberVerified&&<div style={{gridColumn:"1/-1",background:C.green+"08",border:`1px solid ${C.green}20`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.t2}}>\u2713 Ellen\u0151rz\u00e9s: {form.serialNumberVerified}</div>}
            {form.serialNumber&&learned[form.serialNumber.toUpperCase()]&&(
              <div style={{gridColumn:"1/-1",background:C.green+"08",border:`1px solid ${C.green}20`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.green,display:"flex",alignItems:"center",gap:6}}>
                <span>{"\u2713"}</span>
                <span>Tanult: <strong>{learned[form.serialNumber.toUpperCase()].car}</strong> \u00b7 {learned[form.serialNumber.toUpperCase()].partName}</span>
                <button onClick={()=>setForm(x=>({...x,car:learned[form.serialNumber.toUpperCase()].car,partName:learned[form.serialNumber.toUpperCase()].partName}))} style={{marginLeft:"auto",background:C.green+"20",color:C.green,border:"none",borderRadius:4,padding:"2px 8px",fontSize:10,cursor:"pointer",fontFamily:F}}>Alkalmaz</button>
              </div>
            )}
            <Field label="Kompatibilis j\u00e1rm\u0171" {...f("car")} placeholder="pl. VW Golf VII 2013-2020"/>
            <Field label="\u00c1llapot">
              <select value={form.condition||"J\u00f3"} onChange={e=>setField("condition",e.target.value)} style={inp}>
                {CONDITIONS.map(c=><option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="\u00c1r (Ft)" {...f("price")} placeholder="pl. 25000"/>
            {form.estimatedPriceHUF&&!form.price&&(
              <div style={{gridColumn:"1/-1",background:C.blue+"08",border:`1px solid ${C.blue}20`,borderRadius:6,padding:"8px 12px",fontSize:11,color:C.t2,display:"flex",alignItems:"center",gap:8}}>
                <span>AI \u00e1rbecsl\u00e9s: ~{Number(form.estimatedPriceHUF).toLocaleString("hu")} Ft{form.priceNote?" - "+form.priceNote:""}</span>
                <button onClick={()=>setField("price",""+form.estimatedPriceHUF)} style={{marginLeft:"auto",background:C.blue+"20",color:C.blue,border:"none",borderRadius:4,padding:"2px 8px",fontSize:10,cursor:"pointer",fontFamily:F}}>{"Haszn\u00e1l"}</button>
              </div>
            )}
            <Field label="El\u00e9rhet\u0151s\u00e9g" {...f("contact")} placeholder="pl. +36 30 123 4567"/>
            <Field label="\u00c1tv\u00e9teli hely" {...f("pickup")} placeholder="pl. Budapest XV."/>
          </div>
          <div style={{marginBottom:14}}><Field label="Le\u00edr\u00e1s" {...f("description")} rows={3}/></div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="outline" onClick={()=>{setShowForm(false);setImages([]);setForm(BF);}}>{"M\u00e9gse"}</Btn>
            <Btn onClick={publish} disabled={saving||!form.partName||!form.price}>{saving?"Ment\u00e9s...":"K\u00f6zz\u00e9t\u00e9tel"}</Btn>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length===0&&!showForm&&(
        <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center",color:C.mu}}>
          <div style={{fontSize:32,marginBottom:12,color:C.mu}}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
          <div style={{fontSize:13}}>{"Nincs alkatr\u00e9sz. Kattints az \u00daj alkatr\u00e9sz gombra!"}</div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {items.map(item=>(
          <div key={item.id} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"hidden",opacity:item.sold?0.5:1}}>
            {/* Summary row */}
            <div onClick={()=>setDetail((detail&&detail.id)===item.id?null:item)} style={{display:"flex",gap:14,alignItems:"center",padding:"14px 16px",cursor:"pointer"}}>
              {(item.images||[]).slice(0,2).map((src,i)=>(
                <img key={i} src={src} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:7,border:`1px solid ${C.bd}`,flexShrink:0}}/>
              ))}
              {(!item.images||item.images.length===0)&&<div style={{width:52,height:52,background:C.s3,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>9</div>}
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:3}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.partName}</span>{item.category&&<span style={{fontSize:9,background:C.acc+"15",color:C.acc,borderRadius:4,padding:"1px 6px",fontWeight:700,flexShrink:0}}>{item.category}</span>}
                  {item.sold&&<span style={{background:C.mu+"20",color:C.mu,borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:800,flexShrink:0}}>ELADVA</span>}
                  <span style={{background:condColor(item.condition)+"20",color:condColor(item.condition),borderRadius:4,padding:"1px 6px",fontSize:9,fontWeight:700,flexShrink:0}}>{item.condition}</span>
                </div>
                <div style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {item.car&&<span>{item.car}</span>}
                  {item.serialNumber&&<span style={{marginLeft:8,fontFamily:"monospace"}}>#{item.serialNumber}</span>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:16,fontWeight:800,color:C.acc}}>{item.price?parseInt(item.price||0).toLocaleString("hu")+" Ft":"-"}</div>
                <div style={{fontSize:10,color:C.mu}}>{item.pickup||"-"}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <Btn v="outline" sz="sm" onClick={e=>{e.stopPropagation();toggleSold(item.id);}}>{item.sold?"Akt\u00edv":"Eladva"}</Btn>
                <Btn v="danger" sz="sm" onClick={e=>{e.stopPropagation();remove(item.id);}}>{"T\u00f6rl\u00e9s"}</Btn>
              </div>
            </div>
            {/* Detail expand */}
            {(detail&&detail.id)===item.id&&(
              <div style={{borderTop:`1px solid ${C.bd}`,padding:"16px 18px",background:C.s2}}>
                {(item.images||[]).length>0&&(
                  <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                    {item.images.map((src,i)=><img key={i} src={src} alt="" style={{height:90,width:90,objectFit:"cover",borderRadius:8,border:`1px solid ${C.bd}`}}/>)}
                  </div>
                )}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
                  {[["Kateg\u00f3ria",item.category||"-"],["J\u00e1rm\u0171",item.car||"-"],["Cikksz\u00e1m",item.serialNumber||"-"],["\u00c1llapot",item.condition],["\u00c1r",item.price?parseInt(item.price||0).toLocaleString("hu")+" Ft":"-"],["El\u00e9rhet\u0151s\u00e9g",item.contact||"-"],["\u00c1tv\u00e9tel",item.pickup||"-"]].map(([k,v])=>(
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

const COND_C2={"\u00daj":"#16a34a","Kiv\u00e1l\u00f3":"#22c55e","J\u00f3":"#2563eb","K\u00f6zepes":"#d97706","Jav\u00edtott":"#0891b2","Fel\u00faj\u00edtott":"#7c3aed","Hib\u00e1s":"#dc2626"};
const condLabel={"\u00daj":"New","Kiv\u00e1l\u00f3":"Excellent","J\u00f3":"Good","K\u00f6zepes":"Fair","Jav\u00edtott":"Repaired","Fel\u00faj\u00edtott":"Refurbished","Hib\u00e1s":"For parts"};

function PublicCatalogue({onBack,onAdmin}){
  const[items,setItems]=useState([]);
  const[ld,setLd]=useState(true);
  const[search,setSearch]=useState("");
  const[cond,setCond]=useState("all");
  const[cat,setCat]=useState("all");
  const[catOpen,setCatOpen]=useState(true);
  const[catParent,setCatParent]=useState("all"); // tracks selected parent separately
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
setItems(withImages);setLd(false);
      })
      .catch(e=>{console.error("[Autorra] Load error:",e);setItems([]);setLd(false);});
  },[]);

  const shown=items.filter(i=>{
    if(!i||i.sold)return false;
    if(cond!=="all"&&i.condition!==cond)return false;
    if(cat!=="all"){
      const parentTree=PART_CAT_TREE.find(t=>t.id===cat);
      if(parentTree){
        const allSubs=[...( parentTree.sub.hu||[]),...(parentTree.sub.en||[])];
        if(!allSubs.includes(i.category||"")&&(i.category||"")!==parentTree.hu&&(i.category||"")!==parentTree.en)return false;
      } else {
        if((i.category||"")!==cat)return false;
      }
    }
    if(make!=="all"&&!(i.car||"").toLowerCase().includes(make.toLowerCase()))return false;
    if(!search)return true;
    return [i.partName,i.car||"",i.serialNumber||"",i.description||"",i.category||""].join(" ").toLowerCase().includes(search.toLowerCase());
  });

  const bg=isDark?"#0c0c0f":"#f8f8fa";
  const card=isDark?"#111116":"#ffffff";
  const border=isDark?"#22222c":"#e5e5ea";
  const tx=isDark?"#f0f0f8":"#111111";
  const mu=isDark?"#606070":"#888888";
  const surf=isDark?"#16161d":"#fafafa";
  const activeFilters=[cond!=="all",cat!=="all"||catParent!=="all",make!=="all",search].filter(Boolean).length;

  return(
    <div style={{minHeight:"100vh",background:bg,fontFamily:F,color:tx}}>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{"*{margin:0;padding:0;box-sizing:border-box}html,body{background:"+bg+";height:100%}"}</style>

      {/* -- Sticky header -- */}
      <header style={{background:isDark?"rgba(12,12,15,0.95)":"rgba(255,255,255,0.95)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${border}`,position:"sticky",top:0,zIndex:50,padding:"0 24px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"18px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={onBack} style={{background:"transparent",border:"none",cursor:"pointer",color:mu,fontSize:12,fontFamily:F,padding:0,display:"flex",alignItems:"center",gap:4,letterSpacing:0.3}}>{lang==="en"?"< Home":"< F\u0151oldal"}</button>
            <div style={{fontSize:22,fontWeight:900,letterSpacing:-0.5,color:tx}}>auto<span style={{color:"#dc2626"}}>rra</span><span style={{fontSize:10,fontWeight:600,color:"#888",marginLeft:6,letterSpacing:1,textTransform:"uppercase"}}>{lang==="hu"?"hu":"en"}</span></div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <button onClick={()=>switchLang(lang==="hu"?"en":"hu")} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",color:mu,fontFamily:F,letterSpacing:0.5}}>{lang==="hu"?"EN":"HU"}</button>
            <button onClick={()=>{const t=theme==="light"?"dark":"light";applyTheme(t);setTheme(t);}} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:mu,fontFamily:F}}>{isDark?"Light":"Dark"}</button>
            {onAdmin&&<button onClick={onAdmin} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:600,color:mu,cursor:"pointer",fontFamily:F,minWidth:72,textAlign:"center"}}>{lang==="en"?"Login":"Belepes"}</button>}
          </div>
        </div>
      </header>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 20px",position:"relative"}}>
        {/* Ambient red glow, subtle */}
        <div style={{position:"absolute",top:-40,left:"50%",transform:"translateX(-50%)",width:700,height:200,background:isDark?"radial-gradient(ellipse at center top, rgba(220,38,38,0.08) 0%, transparent 70%)":"radial-gradient(ellipse at center top, rgba(220,38,38,0.04) 0%, transparent 70%)",pointerEvents:"none",zIndex:0}}/>
        <div style={{position:"relative",zIndex:1}}>

        {/* -- Filter bar -- */}
        <div style={{marginBottom:20}}>{/* Filter box */}
          {/* Collapsed pill: shows current selection, click to expand */}
          {!catOpen?(
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 0 10px"}}>
              <button onClick={()=>setCatOpen(true)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",border:`1px solid ${cat!=="all"?"#dc2626":border}`,background:cat!=="all"?"#dc262610":"transparent",color:cat!=="all"?"#dc2626":mu,fontSize:12,fontFamily:F,cursor:"pointer",fontWeight:cat!=="all"?700:400}}>
                <span>{catParent==="all"?(t.allCat||"Minden kateg\u00f3ria"):(()=>{const p=PART_CAT_TREE.find(t=>t.id===catParent);return p?catLabel(p,lang):catParent;})()}{cat!=="all"&&catParent!==cat?<span style={{color:"#dc2626"}}> / {lang==="en"?(()=>{const p2=PART_CAT_TREE.find(t=>t.id===catParent);const hi=catSub(p2,"hu").indexOf(cat);return hi>=0?catSub(p2,"en")[hi]||cat:cat;})():cat}</span>:""}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{opacity:0.5,flexShrink:0}}><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              {cat!=="all"&&(
                <button onClick={()=>{setCat("all");setCatParent("all");}} style={{padding:"8px 10px",border:`1px solid ${border}`,background:"transparent",color:mu,fontSize:11,fontFamily:F,cursor:"pointer"}}>x</button>
              )}
            </div>
          ):(
            <div>
              {/* Category browser open */}
              <div style={{border:`1px solid ${border}`,marginBottom:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",borderBottom:`1px solid ${border}`,background:isDark?"#0f0f14":"#f9f9fb"}}>
                  <span style={{fontSize:11,fontWeight:700,color:mu,letterSpacing:0.5}}>{lang==="en"?"CATEGORY":"KATEG\u00d3RIA"}</span>
                  <button onClick={()=>setCatOpen(false)} style={{background:"transparent",border:"none",color:mu,cursor:"pointer",fontSize:12,fontFamily:F}}>x</button>
                </div>
                <div style={{display:"flex"}}>
                  {/* Left: parent list */}
                  <div style={{width:180,flexShrink:0,borderRight:`1px solid ${border}`}}>
                    {[{id:"all",label:lang==="en"?"All parts":"Minden alkatr\u00e9sz"},...PART_CAT_TREE].map(c=>{
                      const isActive=catParent===c.id||(c.id==="all"&&catParent==="all");
                      return(
                        <button key={c.id} onClick={()=>{if(c.id==="all"){setCat("all");setCatParent("all");}else{setCatParent(c.id);setCat(c.id);}}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%",textAlign:"left",padding:"9px 14px",border:"none",borderBottom:`1px solid ${border}`,background:isActive?"#dc262612":"transparent",color:isActive?"#dc2626":isDark?"#aaa":"#444",fontSize:12,fontWeight:isActive?700:400,cursor:"pointer",fontFamily:F}}>
                          <span>{c.id==="all"?(lang==="en"?"All parts":"Minden alkatr\u00e9sz"):catLabel(c,lang)}</span>
                          {c.sub&&<span style={{opacity:0.35,fontSize:10}}>{c.sub.length}</span>}
                        </button>
                      );
                    })}
                  </div>
                  {/* Right: subcategories */}
                  <div style={{flex:1,padding:"10px 12px",display:"flex",flexWrap:"wrap",gap:4,alignContent:"flex-start",minHeight:80}}>
                    {cat==="all"?(
                      <div style={{fontSize:12,color:mu,padding:"4px 0"}}>{lang==="en"?"Select a category":"V\u00e1lassz kateg\u00f3ri\u00e1t"}</div>
                    ):(()=>{
                      const tree=PART_CAT_TREE.find(t=>t.id===catParent);
                      if(!tree)return null;
                      return catSub(tree,lang).map((s,si)=>{
                      const huSubs=catSub(tree,"hu");
                      const enSubs=catSub(tree,"en");
                      const huEquiv=huSubs[si];
                      const isSel=cat===s||cat===huEquiv||(lang==="en"&&huEquiv===cat)||(lang==="hu"&&enSubs[si]===cat);
                      return(
                        <button key={s} onClick={()=>{const target=lang==="en"?(huEquiv||s):s;setCat(isSel?"all":target);}} style={{padding:"6px 12px",border:`1.5px solid ${isSel?"#dc2626":border}`,background:isSel?"#dc2626":"transparent",color:isSel?"#fff":isDark?"#ccc":"#444",fontSize:11,fontFamily:F,cursor:"pointer",fontWeight:isSel?700:400,transition:"all 0.1s"}}>{s}</button>
                      );
                    })})()}

                  </div>{/* right panel */}
                </div>{/* browser wrapper */}

                {/* Apply row */}
                <div style={{padding:"10px 14px",borderTop:`1px solid ${border}`,display:"flex",justifyContent:"flex-end",gap:8,background:isDark?"#0f0f14":"#f9f9fb"}}>
                  <button onClick={()=>{setCat("all");setCatParent("all");}} style={{padding:"7px 14px",border:`1px solid ${border}`,background:"transparent",color:mu,fontSize:12,fontFamily:F,cursor:"pointer"}}>{lang==="en"?"Reset":"T\u00f6rl\u00e9s"}</button>
                  <button onClick={()=>setCatOpen(false)} style={{padding:"7px 20px",border:"none",background:"#dc2626",color:"#fff",fontSize:12,fontFamily:F,cursor:"pointer",fontWeight:700}}>{lang==="en"?"Apply":"Alkalmaz"}</button>
                </div>
              </div>
            </div>
          )}

          {/* Search + condition + make */}
          <div style={{display:"flex",alignItems:"stretch",height:44,border:`1px solid ${border}`}}>
            <div style={{position:"relative",flex:"2 1 200px",borderRight:`1px solid ${border}`}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search||"Keres\u00e9s..."} style={{width:"100%",height:"100%",padding:"0 12px 0 30px",border:"none",background:surf,color:tx,fontSize:13,fontFamily:F,outline:"none"}}/>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:mu,pointerEvents:"none"}}>&#8981;</span>
              {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:mu,cursor:"pointer",fontSize:12,fontFamily:F,padding:0}}>&#x2715;</button>}
            </div>
            <select value={cond} onChange={e=>setCond(e.target.value)} style={{flex:"1 1 120px",padding:"0 10px",border:"none",borderRight:`1px solid ${border}`,background:cond!=="all"?"#dc262606":surf,color:cond!=="all"?"#dc2626":isDark?"#bbb":"#333",fontSize:12,fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none"}}>
              <option value="all">{t.allCond||"Minden \u00e1llapot"}</option>
              {CONDITIONS.map(c=><option key={c} value={c}>{lang==="en"?(condLabel[c]||c):c}</option>)}
            </select>
            <select value={make} onChange={e=>setMake(e.target.value)} style={{flex:"1 1 130px",padding:"0 10px",border:"none",borderRight:activeFilters>0?`1px solid ${border}`:"none",background:make!=="all"?"#dc262606":surf,color:make!=="all"?"#dc2626":isDark?"#bbb":"#333",fontSize:12,fontFamily:F,fontWeight:600,cursor:"pointer",outline:"none"}}>
              <option value="all">{t.allMakes||"Minden m\u00e1rka"}</option>
              {MAKES.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
            {(activeFilters>0||search)&&<button onClick={()=>{setCond("all");setCat("all");setCatParent("all");setMake("all");setSearch("");setCatOpen(false);}} style={{flexShrink:0,padding:"0 14px",border:"none",background:"transparent",color:"#dc2626",fontSize:11,fontFamily:F,cursor:"pointer",fontWeight:700}}>{lang==="en"?"Clear":"T\u00f6rl\u00e9s"}</button>}
          </div>

          {/* Status bar */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"5px 12px",background:isDark?"#0d0d12":"#f5f5f8",border:`1px solid ${border}`,borderTop:0}}>
            <span style={{fontSize:10,color:mu,fontWeight:500,letterSpacing:0.3}}>{shown.length} {lang==="en"?"RESULTS":"TAL\u00c1LAT"}</span>
            {activeFilters>0&&<span style={{fontSize:10,color:"#dc2626",fontWeight:700,letterSpacing:0.3}}>{activeFilters} {lang==="en"?"FILTER":"SZ\u0170R\u0150"}</span>}
          </div>
        </div>

        {/* -- Loading -- */}
        {ld&&(<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:80,color:mu}}><div style={{width:36,height:36,border:`3px solid ${border}`,borderTopColor:"#dc2626",borderRadius:"50%",animation:"spin 0.8s linear infinite",marginBottom:16}}/><style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style><div style={{fontSize:14}}>{t.loading}</div></div>)}

        {/* -- Empty state -- */}
        {!ld&&shown.length===0&&(<div style={{textAlign:"center",padding:"80px 20px",color:mu}}><div style={{fontSize:13,fontWeight:600,color:isDark?"#555":"#aaa",letterSpacing:0.5,marginBottom:8}}>{t.noResults}</div>{activeFilters>0&&<button onClick={()=>{setCond("all");setCat("all");setCatParent("all");setMake("all");setSearch("");}} style={{marginTop:10,background:"transparent",color:mu,border:`1px solid ${border}`,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>{t.clearFilters}</button>}</div>)}

        {/* -- Grid -- */}
        {!ld&&shown.length>0&&(<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:20}}>
          {shown.map(item=>(<div key={item.id} onClick={()=>{setSel(item);setImgIdx(0);}} style={{background:card,borderRadius:16,overflow:"hidden",border:`1px solid ${border}`,cursor:"pointer",transition:"transform 0.2s,box-shadow 0.2s,border-color 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=isDark?"0 12px 32px rgba(0,0,0,0.5)":"0 12px 32px rgba(0,0,0,0.1)";e.currentTarget.style.borderColor="#dc262644";}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor=border;}}>
            <div style={{height:200,background:isDark?"#1a1a22":"#f0f0f5",position:"relative",overflow:"hidden"}}>{(item.images&&item.images[0])?<img src={item.images[0]} alt={item.partName} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:52,opacity:0.2}}>&#9881;</div>}{((item.images&&item.images.length)||0)>1&&<div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.6)",color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>+{item.images.length-1}</div>}<div style={{position:"absolute",top:10,left:10}}><span style={{background:COND_C2[item.condition]||"#888",color:"#fff",borderRadius:6,padding:"3px 9px",fontSize:10,fontWeight:800}}>{lang==="en"?(condLabel[item.condition]||item.condition):item.condition}</span></div>{item.category&&<div style={{position:"absolute",bottom:10,left:10,background:"rgba(0,0,0,0.55)",color:"#fff",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:600}}>{item.category}</div>}</div>
            <div style={{padding:"16px 16px 18px"}}><div style={{fontSize:15,fontWeight:800,color:tx,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",lineHeight:1.2}}>{item.partName}</div>{item.car&&<div style={{fontSize:12,color:mu,marginBottom:3}}>{item.car}</div>}{item.serialNumber&&<div style={{fontSize:10,color:mu,fontFamily:"monospace",marginBottom:10,opacity:0.7}}>#{item.serialNumber}</div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginTop:8,borderTop:`1px solid ${border}`,paddingTop:12}}><div style={{fontSize:20,fontWeight:900,color:"#dc2626",letterSpacing:-0.5}}>{item.price?parseInt(item.price||0).toLocaleString("hu")+" Ft":t.askPrice}</div><div style={{fontSize:11,color:mu,textAlign:"right"}}>{item.pickup||""}</div></div></div>
          </div>))}
        </div>)}

        {/* -- Detail modal -- */}
        {sel&&(<div onClick={()=>setSel(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16,backdropFilter:"blur(4px)"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:card,borderRadius:20,width:"100%",maxWidth:520,maxHeight:"92vh",overflowY:"auto",border:`1px solid ${border}`}}>
            {((sel.images&&sel.images.length)||0)>0&&(<div style={{position:"relative",height:280,background:isDark?"#1a1a22":"#f0f0f5",borderRadius:"20px 20px 0 0",overflow:"hidden"}}><img src={sel.images[imgIdx]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>{sel.images.length>1&&(<><button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i-1+sel.images.length)%sel.images.length);}} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:18,fontFamily:F}}>&#8249;</button><button onClick={e=>{e.stopPropagation();setImgIdx(i=>(i+1)%sel.images.length);}} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:18,fontFamily:F}}>&#8250;</button><div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>{sel.images.map((_,i)=><div key={i} onClick={e=>{e.stopPropagation();setImgIdx(i);}} style={{width:7,height:7,borderRadius:"50%",background:i===imgIdx?"#fff":"rgba(255,255,255,0.4)",cursor:"pointer"}}/>)}</div></>)}<button onClick={()=>setSel(null)} style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,0.5)",color:"#fff",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,fontFamily:F}}>&#x2715;</button><span style={{position:"absolute",top:12,left:12,background:COND_C2[sel.condition]||"#888",color:"#fff",borderRadius:6,padding:"4px 10px",fontSize:11,fontWeight:800}}>{lang==="en"?(condLabel[sel.condition]||sel.condition):sel.condition}</span></div>)}
            <div style={{padding:"24px 24px 28px"}}>{sel.category&&<div style={{fontSize:11,fontWeight:700,color:"#dc2626",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>{sel.category}</div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}><h2 style={{fontSize:22,fontWeight:900,color:tx,lineHeight:1.2,flex:1,marginRight:12}}>{sel.partName}</h2></div>{sel.car&&<div style={{fontSize:14,color:mu,marginBottom:10}}><strong style={{color:tx}}>{sel.car}</strong></div>}{sel.serialNumber&&<div style={{background:isDark?"#1a1a22":"#f4f4f8",borderRadius:8,padding:"8px 14px",fontSize:12,fontFamily:"monospace",color:mu,marginBottom:14,display:"flex",gap:8,alignItems:"center"}}><span style={{opacity:0.6}}>#</span>{sel.serialNumber}</div>}{sel.description&&<p style={{fontSize:14,color:isDark?"#c8c8d8":"#444",lineHeight:1.7,marginBottom:18}}>{sel.description}</p>}<div style={{borderTop:`1px solid ${border}`,paddingTop:18,marginBottom:18}}><div style={{fontSize:28,fontWeight:900,color:"#dc2626",letterSpacing:-0.5,marginBottom:10}}>{sel.price?parseInt(sel.price||0).toLocaleString("hu")+" Ft":t.askPrice}</div>{sel.pickup&&<div style={{fontSize:13,color:mu,marginBottom:4}}>{t.pickup}: <strong style={{color:tx}}>{sel.pickup}</strong></div>}{sel.contact&&<div style={{fontSize:13,color:mu}}>{t.contact}: <strong style={{color:tx}}>{sel.contact}</strong></div>}</div>{sel.contact&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><a href={`tel:${sel.contact}`} style={{background:"#dc2626",color:"#fff",borderRadius:10,padding:"13px 0",fontSize:14,fontWeight:800,textDecoration:"none",textAlign:"center",display:"block"}}>{t.call}</a><a href={`https://wa.me/${(sel.contact||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{background:"#16a34a",color:"#fff",borderRadius:10,padding:"13px 0",fontSize:14,fontWeight:800,textDecoration:"none",textAlign:"center",display:"block"}}>{t.whatsapp}</a></div>)}</div>
          </div>
        </div>)}
        </div>
      </div>
    </div>
  );
}

// -- Stub panels for routes with no full implementation yet --
function Customers({orders}){return(<div><div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:12}}>{"Vev\u0151k"}</div><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:40,textAlign:"center",color:C.mu}}>{orders.length===0?"M\u00e9g nincs vev\u0151. Rendel\u00e9sek l\u00e9trehoz\u00e1sa ut\u00e1n automatikusan megjelennek.":orders.length+" rendel\u00e9s alapj\u00e1n \u00e9p\u00fctve. R\u00e9szletes n\u00e9zet el\u0151k\u00e9sz\u00fclet alatt."}</div></div>);}

function Settings({user}){
  const[aiPrompt,setAiPrompt]=useState("");
  useEffect(()=>{db.get("ai_system_prompt",true).then(d=>setAiPrompt(d||""));},[]);
  const save=async()=>{await db.set("ai_system_prompt",aiPrompt,true);alert("Mentve");};
  return(<div><div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:12}}>{"Be\u00e1ll\u00edt\u00e1sok"}</div>{user&&user.role==="admin"&&(<div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:10}}>AI RENDSZER PROMPT</div><textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} rows={8} style={{width:"100%",padding:10,background:C.s2,border:`1px solid ${C.bd}`,borderRadius:6,color:C.tx,fontSize:12,fontFamily:"monospace",outline:"none",resize:"vertical",marginBottom:10}}/><button onClick={save} style={{padding:"8px 16px",background:"#dc2626",color:"#fff",border:"none",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer"}}>{"Ment\u00e9s"}</button></div>)}</div>);
}

function SecurityPanel({user}){
  const LOCKOUT_KEY="autorra_login_attempts";
  const[attempts,setAttempts]=useState([]);
  useEffect(()=>{
    const refresh=()=>{try{const raw=localStorage.getItem(LOCKOUT_KEY);const p=raw?JSON.parse(raw):[];setAttempts(Array.isArray(p)?p:[]);}catch{setAttempts([]);}};
    refresh();const t=setInterval(refresh,5000);return()=>clearInterval(t);
  },[]);
  const unlock=()=>{localStorage.removeItem(LOCKOUT_KEY);setAttempts([]);};
  return(<div><div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:12}}>{"Biztons\u00e1g"}</div><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20,marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1}}>{"SIKERTELEN BEL\u00c9P\u00c9SEK"}</div>{attempts.length>0&&<button onClick={unlock} style={{padding:"5px 12px",background:"transparent",border:`1px solid ${C.acc}`,color:C.acc,fontSize:11,fontWeight:600,cursor:"pointer",borderRadius:4}}>{"Feloldoz\u00e1s"}</button>}</div>{attempts.length===0?<div style={{fontSize:12,color:C.mu,textAlign:"center",padding:20}}>{"Nincs sikertelen pr\u00f3b\u00e1lkoz\u00e1s."}</div>:<div style={{display:"flex",flexDirection:"column",gap:6}}>{attempts.map((t,i)=><div key={i} style={{fontSize:12,color:C.t2,padding:"6px 10px",background:C.s2,borderRadius:4}}>{new Date(t).toLocaleString("hu")}</div>)}</div>}</div></div>);
}

function SellerSubmissions(){
  const[subs,setSubs]=useState([]);
  useEffect(()=>{db.get("seller_submissions",true).then(d=>setSubs(Array.isArray(d)?d:[]));},[]);
  const approve=async(s)=>{const u=subs.map(x=>x.id===s.id?{...x,status:"approved"}:x);await db.set("seller_submissions",u,true);setSubs(u);};
  const reject=async(id)=>{const u=subs.filter(x=>x.id!==id);await db.set("seller_submissions",u,true);setSubs(u);};
  return(<div><div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:12}}>{"Elad\u00f3i bek\u00fcld\u00e9sek"}</div>{subs.length===0?<div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:40,textAlign:"center",color:C.mu}}>{"Nincs bek\u00fcld\u00e9s."}</div>:subs.map(s=><div key={s.id} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:14,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}><div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:C.tx}}>{s.partName}</div><div style={{fontSize:11,color:C.mu,marginTop:3}}>{s.car||"\u2014"} \u00b7 {s.businessName} \u00b7 {s.contact}</div>{s.description&&<div style={{fontSize:11,color:C.mu,marginTop:4}}>{s.description}</div>}</div><div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>{s.price&&<div style={{fontSize:13,fontWeight:800,color:C.acc}}>{parseInt(s.price).toLocaleString("hu")} Ft</div>}{s.status!=="approved"?<div style={{display:"flex",gap:6}}><button onClick={()=>approve(s)} style={{padding:"5px 10px",background:"#16a34a",color:"#fff",border:"none",borderRadius:4,fontSize:11,cursor:"pointer"}}>{"J\u00f3v\u00e1hagy"}</button><button onClick={()=>reject(s.id)} style={{padding:"5px 10px",background:"transparent",color:C.acc,border:`1px solid ${C.acc}`,borderRadius:4,fontSize:11,cursor:"pointer"}}>{"Elutas\u00edt"}</button></div>:<div style={{fontSize:10,color:C.green,fontWeight:700}}>{"J\u00d3V\u00c1HAGYVA"}</div>}</div></div></div>)}</div>);
}

// -- MainApp: authenticated admin interface --
function MainApp({user,onLogout,onPublic,onToggleTheme}){
  const[active,setActive]=useState("dashboard");
  const[orders,setOrders]=useState([]);
  const[convos,setConvos]=useState([]);

  useEffect(()=>{
    db.get("orders",true).then(d=>setOrders(Array.isArray(d)?d:[]));
    db.get("convos",true).then(d=>setConvos(Array.isArray(d)?d:[]));
  },[]);

  const saveOrders=async(next)=>{setOrders(next);await db.set("orders",next,true);};
  const addOrder=async(o)=>{const id=Date.now();const next=[{id,...o},...orders];await saveOrders(next);setActive("orders");};
  const updateOrder=async(o)=>{await saveOrders(orders.map(x=>x.id===o.id?o:x));};
  const deleteOrder=async(id)=>{await saveOrders(orders.filter(x=>x.id!==id));};

  const panels={
    dashboard:()=><Dashboard orders={orders} convos={convos} onNav={setActive}/>,
    ai:()=><AiDashboard orders={orders}/>,
    inbox:()=><Inbox onCreateOrder={addOrder} userName={user&&user.name}/>,
    inquiry:()=><Inquiry onOrderCreated={addOrder} userName={user&&user.name}/>,
    orders:()=><Orders orders={orders} onChange={updateOrder} onDelete={deleteOrder}/>,
    krakow:()=><Krakow orders={orders} onChange={updateOrder}/>,
    catalogue:()=><CatalogueManager user={user}/>,
    calculator:()=><PriceCalculator/>,
    templates:()=><Templates/>,
    customers:()=><Customers orders={orders}/>,
    settings:()=><Settings user={user}/>,
    security:()=><SecurityPanel user={user}/>,
    sellers:()=><SellerSubmissions/>,
  };
  const Panel=panels[active]||panels.dashboard;

  return(
    <div style={{display:"flex",minHeight:"100vh",background:C.bg,fontFamily:F,color:C.tx}}>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <Sidebar active={active} setActive={setActive} user={user} onLogout={onLogout} onPublic={onPublic} orders={orders} convos={convos} onToggleTheme={onToggleTheme}/>
      <div style={{flex:1,padding:"24px 32px",overflowY:"auto"}}>
        <Panel/>
      </div>
    </div>
  );
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

  // Rotating hero text
  const[heroIdx,setHeroIdx]=useState(0);
  const heroTexts=[
    {top:"Lengyel alkatr\u00e9sz.",bottom:"Magyar \u00e1r.",topEn:"Polish parts.",bottomEn:"Hungarian price."},
    {top:"Bontott alkatr\u00e9szek.",bottom:"Ellen\u0151rz\u00f6tt min\u0151s\u00e9g.",topEn:"Used parts.",bottomEn:"Verified quality."},
  ];
  useEffect(()=>{
    const t=setInterval(()=>setHeroIdx(i=>(i+1)%heroTexts.length),4500);
    return()=>clearInterval(t);
  },[]);
  const currHero=heroTexts[heroIdx];

  return(
    <div onMouseMove={handleMouse} style={{minHeight:"100vh",background:bg,fontFamily:F,color:tx,display:"flex",flexDirection:"column"}}>
      <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>

      {/* Nav */}
      <nav style={{padding:"18px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:22,fontWeight:900,letterSpacing:-0.5}}>auto<span style={{color:"#dc2626"}}>rra</span><span style={{fontSize:10,fontWeight:600,color:"#888",marginLeft:6,letterSpacing:1,textTransform:"uppercase"}}>hu</span></div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={()=>setLandingLang(l=>l==="hu"?"en":"hu")} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"6px 12px",fontSize:11,fontWeight:700,cursor:"pointer",color:mu,fontFamily:F,letterSpacing:0.5}}>{landingLang==="hu"?"EN":"HU"}</button>
          <button onClick={toggleTheme} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",color:mu,fontFamily:F}}>{isDark?"Light":"Dark"}</button>
          <div style={{position:"relative"}}>
            <button onClick={e=>{e.stopPropagation();setLoginOpen(v=>!v);}} style={{background:"transparent",border:`1px solid ${isDark?"#333":"#ddd"}`,borderRadius:8,padding:"7px 16px",fontSize:12,fontWeight:600,color:mu,cursor:"pointer",fontFamily:F,minWidth:72,textAlign:"center"}}>{landingLang==="en"?"Login":"Bel\u00e9p\u00e9s"}</button>
            {loginOpen&&(
              <>
                <style>{"@keyframes popLogin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}"}</style>
                <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:200,background:isDark?"#0f0f13":"#ffffff",border:`1px solid ${isDark?"#1a1a22":"#e8e8ee"}`,borderRadius:0,width:260,boxShadow:isDark?"0 8px 28px rgba(0,0,0,0.5)":"0 8px 28px rgba(0,0,0,0.1)",animation:"popLogin 0.15s cubic-bezier(0.16,1,0.3,1) forwards"}}>
                  <div style={{padding:"14px 16px 12px",borderBottom:`1px solid ${isDark?"#1a1a22":"#e8e8ee"}`,display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                    <span style={{fontSize:15,fontWeight:900,letterSpacing:-0.5,color:isDark?"#f0f0f8":"#111"}}>auto<span style={{color:"#dc2626"}}>rra</span></span>
                    <span style={{fontSize:12,color:isDark?"#555":"#999"}}><span style={{color:"#dc2626",fontWeight:800}}>{landingLang==="en"?"admin":"admin"}</span> / {landingLang==="en"?"seller":"elad\u00f3"}</span>
                  </div>
                  <div style={{padding:"14px 16px 16px"}}>
                    <LoginInline onLogin={u=>{onLogin(u);setLoginOpen(false);}} theme={theme} lang={landingLang}/>
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
          <div style={{fontSize:11,fontWeight:700,letterSpacing:3,color:"#dc2626",textTransform:"uppercase",marginBottom:20}}>{"Min\u0151s\u00e9gi aut\u00f3alkatr\u00e9szek"}</div>
          <h1 style={{fontSize:"clamp(42px,7vw,80px)",fontWeight:900,lineHeight:1.1,letterSpacing:-2,marginBottom:20,paddingBottom:4,minHeight:"clamp(100px,16vw,195px)"}}>
            <style>{"@keyframes heroFade{0%{opacity:0;transform:translateY(10px)}15%{opacity:1;transform:translateY(0)}85%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}}"}</style>
            <span key={heroIdx+"-top"} style={{display:"block",animation:"heroFade 4.5s ease-in-out both"}}>{landingLang==="en"?currHero.topEn:currHero.top}</span>
            <span key={heroIdx+"-bot"} style={{color:"#dc2626",backgroundImage:`linear-gradient(${90+mouse.x*40-20}deg, #dc2626 0%, #ff6666 ${30+mouse.x*40}%, #dc2626 100%)`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text",transition:"background-image 0.6s ease",display:"inline-block",paddingBottom:"0.15em",animation:"heroFade 4.5s ease-in-out both"}}>{landingLang==="en"?currHero.bottomEn:currHero.bottom}</span>
          </h1>
          <p style={{fontSize:17,color:isDark?"#888":"#555",maxWidth:480,lineHeight:1.65,marginBottom:40}}>{(T[landingLang]&&T[landingLang].heroSub)}</p>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",alignItems:"center"}}>
            <button onClick={onCatalogue} style={{background:"linear-gradient(105deg, #b91c1c 0%, #dc2626 35%, #ef4444 60%, #dc2626 80%, #b91c1c 100%)",color:"#fff",border:"none",borderRadius:12,padding:"14px 32px",fontSize:15,fontWeight:800,cursor:"pointer",fontFamily:F,letterSpacing:-0.3,boxShadow:"0 0 28px rgba(220,38,38,0.35)",backgroundSize:"200% 100%",backgroundPosition:`${mouse.x*100}% 0`,transition:"background-position 0.4s ease"}}>{((T[landingLang]&&T[landingLang].browse)||"Alkatr\u00e9szek")+" \u2192"}</button>
            <div style={{position:"relative"}}>
              <button onClick={e=>{e.stopPropagation();setContactOpen(v=>!v);}} style={{background:"transparent",border:`2px solid ${isDark?"#333":"#ddd"}`,borderRadius:12,padding:"14px 32px",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:F,color:isDark?"#ccc":"#333",letterSpacing:-0.3}}>{landingLang==="en"?"Contact":"\u00c9rdekl\u0151d\u00e9s"}</button>
              {contactOpen&&(
                <>
                  <style>{"@keyframes rise{0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}"}</style>
                  <div onClick={e=>e.stopPropagation()} style={{position:"absolute",top:"calc(100% + 10px)",left:"50%",transform:"translateX(-50%)",zIndex:99,display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                    {[{href:"https://wa.me/36703771506",label:"WA \u00b7 HU",bg:"#16a34a",delay:0},{href:"viber://chat?number=36703771506",label:"Viber \u00b7 HU",bg:"#7c3aed",delay:35},{href:"sms:+36703771506",label:"SMS \u00b7 HU",bg:isDark?"#2a2a35":"#e5e5ea",fg:isDark?"#ccc":"#333",delay:70},{href:"https://wa.me/48730320497",label:"WA \u00b7 PL",bg:"#dc2626",delay:105},{href:"viber://chat?number=48730320497",label:"Viber \u00b7 PL",bg:"#7c3aed",delay:140}].map((b,i)=>(
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
        {[["",(T[landingLang]&&T[landingLang].browse)||"Alkatr\u00e9szek"],["",(T[landingLang]&&T[landingLang].directImport)||"K\u00f6zvetlen import"],["",(T[landingLang]&&T[landingLang].fastShip)||"Gyors kisz\u00e1ll\u00edt\u00e1s"],["",(T[landingLang]&&T[landingLang].partQuality)||"Ellen\u0151rz\u00f6tt min\u0151s\u00e9g"]].map(([icon,text])=>(
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

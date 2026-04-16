import { useState, useEffect, useRef } from "react";

const C = {
  bg:"#0c0c0f",s1:"#111116",s2:"#16161d",s3:"#1c1c25",s4:"#22222e",
  bd:"#22222c",bd2:"#2c2c3a",acc:"#dc2626",
  tx:"#eeeef2",t2:"#b0b0c0",mu:"#606070",mu2:"#888898",
  green:"#16a34a",blue:"#2563eb",amber:"#ca8a04",purple:"#7c3aed",cyan:"#0e7490",red:"#dc2626",
};
const ST={
  pending: {color:C.amber, bg:"#ca8a0412",label:"Függőben"},
  awaiting:{color:C.blue,  bg:"#2563eb12",label:"Visszaigazolásra vár"},
  ordered: {color:C.red,   bg:"#dc262612",label:"Megrendelve"},
  krakow:  {color:C.purple,bg:"#7c3aed12",label:"Krakkóban van"},
  transit: {color:C.cyan,  bg:"#0e749012",label:"Úton"},
  ready:   {color:C.green, bg:"#16a34a12",label:"Átvehető"},
};
const SQ=["pending","awaiting","ordered","krakow","transit","ready"];
const CONDITIONS=["Új","Kiváló","Jó","Közepes","Alkatrésznek"];
const COND_C={Új:C.green,Kiváló:"#65a30d",Jó:C.blue,Közepes:C.amber,Alkatrésznek:C.red};
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
  if(!name)return"—";
  const acc="ÁáÉéÍíÓóÖöŐőÚúÜüŰű",base="AaEeIiOoOoOoUuUuUu";
  const strip=s=>[...s].map(c=>{const i=acc.indexOf(c);return i>=0?base[i]:c;}).join("").toUpperCase();
  const initials=name.trim().split(" ").filter(Boolean).map(w=>strip(w)[0]||"").join("").slice(0,4);
  return(initials+((zip||"").replace(/[^0-9]/g,""))).slice(0,10)||"—";
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

const DEFAULT_AI_PROMPT="Te egy autóalkatrész-kereskedés asszisztense vagy (PL→HU logisztika). Professzionálisan válaszolj az adott csatorna nyelvén. Azonosítsd az alkatrész nevét és a járművet. Röviden és egyértelműen fogalmazz.";

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

function Login({onLogin}){
  const[u,setU]=useState("");const[p,setP]=useState("");const[err,setErr]=useState("");const[ld,setLd]=useState(false);
  const go=async()=>{
    setLd(true);setErr("");
    try{
      const API=window.__getApiBase?.()||"";
      const r=await fetch(`${API}/api/auth/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.error||"Hiba");
      localStorage.setItem("am_token",d.token);
      if(window.__setAuthToken) window.__setAuthToken(d.token);
      onLogin(d.user);
    }catch(e){setErr(e.message||"Hibás felhasználónév vagy jelszó.");setLd(false);}
  };
  return(<div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:F}}><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/><div style={{width:360}}><div style={{textAlign:"center",marginBottom:40}}><div style={{fontSize:10,color:C.mu,letterSpacing:3,textTransform:"uppercase",marginBottom:10}}>Alkatrész</div><div style={{fontSize:30,fontWeight:800,color:C.tx,letterSpacing:-1}}>Manager<span style={{color:C.acc}}>.</span></div><div style={{fontSize:12,color:C.mu,marginTop:6}}>PL → HU logisztikai platform</div></div><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:28}}><div style={{display:"flex",flexDirection:"column",gap:14}}><Field label="Felhasználónév" value={u} onChange={setU} placeholder="felhasználónév"/><div><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:5}}>Jelszó</div><input type="password" value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&u&&p)go();}} placeholder="••••••••" style={inp}/></div>{err&&<div style={{color:C.acc,fontSize:12,fontWeight:500}}>{err}</div>}<Btn onClick={go} disabled={ld||!u||!p} full>{ld?"Bejelentkezés...":"Bejelentkezés →"}</Btn></div></div></div></div>);
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
];
function Sidebar({active,setActive,user,onLogout,onPublic,orders,convos}){
  const kn=orders.filter(o=>o.status==="krakow").length;
  const pn=orders.filter(o=>["pending","awaiting"].includes(o.status)).length;
  const un=(convos||[]).reduce((a,c)=>a+(c.unread||0),0);
  const Dot=({n,col})=>n>0?(
    <span style={{background:col,color:"#fff",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:800,minWidth:14,textAlign:"center",lineHeight:"14px"}}>{n}</span>
  ):null;
  return(
    <div style={{width:200,background:"#080808",borderRight:"1px solid #141414",display:"flex",flexDirection:"column",minHeight:"100vh",flexShrink:0}}>
      <div style={{padding:"24px 20px 18px"}}>
        <div style={{fontSize:15,fontWeight:800,color:"#e8e8e8",letterSpacing:-0.5}}>Manager<span style={{color:C.acc}}>.</span></div>
        <div style={{fontSize:9,color:"#2a2a2a",letterSpacing:2,textTransform:"uppercase",marginTop:3}}>PL → HU</div>
      </div>
      <div style={{flex:1,paddingTop:2}}>
        {NAV.filter(n=>!n.admin||user.role==="admin").map(n=>{
          const a=active===n.id;
          return(
            <button key={n.id} onClick={()=>setActive(n.id)} style={{
              display:"flex",alignItems:"center",gap:10,padding:"9px 20px",
              border:"none",cursor:"pointer",width:"100%",textAlign:"left",
              background:"transparent",
              borderLeft:a?"2px solid "+C.acc:"2px solid transparent",
              color:a?"#e8e8e8":"#3a3a3a",
              fontSize:12,fontWeight:a?600:400,fontFamily:F,transition:"color 0.1s",
            }}>
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
        <button onClick={onLogout} style={{background:"transparent",border:"none",color:"#282828",fontSize:10,cursor:"pointer",fontFamily:F,padding:0}}>Kijelentkezés</button>
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
      <PH sub={`${today} — összesített üzleti áttekintő`}>Irányítópult</PH>

      {/* Alerts */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
        {unread>0&&(
          <div onClick={()=>onNav("inbox")} style={{background:C.acc+"10",border:`1px solid ${C.acc}25`,borderRadius:8,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>📬</span>
            <span style={{fontSize:13,color:C.t2,flex:1}}><strong style={{color:C.acc}}>{unread} megválaszolatlan üzenet</strong> — kattints a beérkezőhöz</span>
            <span style={{fontSize:11,color:C.mu}}>→</span>
          </div>
        )}
        {ready.length>0&&(
          <div onClick={()=>onNav("orders")} style={{background:C.green+"10",border:`1px solid ${C.green}25`,borderRadius:8,padding:"11px 16px",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
            <span>✅</span>
            <span style={{fontSize:13,color:C.t2,flex:1}}><strong style={{color:C.green}}>{ready.length} rendelés átvehető</strong> — értesítsd az ügyfeleket</span>
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
      const text=await ai([{role:"user",content:`Te egy autóalkatrész-kereskedés AI elemzője vagy (PL-HU logisztika). Elemezd az alábbi rendelési adatokat és adj üzleti betekintést magyarul. Rendelések (${filtered.length} db, szűrő: ${statusFilter}):\n${summary}\n\nVálaszolj CSAK JSON formátumban:\n{"osszesfoglalas":"...","bottleneck":"...","topAlkatreszek":["max 3"],"javaslatok":["3 javaslat"],"kockazatok":["2 kockázat"],"statisztika":{"atlagosIdoNap":3,"legtobbenVaro":"státusz","teljesitesiArany":"75%"}}`}]);
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
          <div style={{fontSize:12,color:C.mu,marginBottom:20,maxWidth:400,margin:"0 auto 20px"}}>Kattints az elemzés gombra — a mesterséges intelligencia feldolgozza az összes rendelési adatot és konkrét javaslatokat ad.</div>
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
      const txt=await ai([{role:"user",content:`Te egy autóalkatrész-kereskedés AI asszisztense vagy. Az alábbi ${lang} nyelvű beszélgetés alapján adj rövid választ ${lang} nyelven és azonosítsd az érdeklődést ha van.\n\nBeszélgetés:\n${history}\n\nVálaszolj JSON-ban: {"reply":"javasolt válasz ${lang} nyelven","inquiry":{"partName":"alkatrész neve","car":"ALWAYS exact make + model + generation + year e.g. Mercedes-Benz C-Class W204 2010 or BMW 3 Series E90 2008 - NEVER just the brand name alone","quantity":1}}`}]);
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

      {/* ── LEFT SIDEBAR ── */}
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

      {/* ── MAIN CHAT AREA ── */}
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
                    {aiSugg.inquiry&&<div style={{fontSize:11,color:C.mu,marginBottom:6}}>Érdeklődés: <strong style={{color:C.t2}}>{aiSugg.inquiry.partName}</strong>{aiSugg.inquiry.car?` · ${aiSugg.inquiry.car}`:""}</div>}
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

      {/* ── NEW CONVERSATION MODAL ── */}
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
  const process=async()=>{setLd(true);setRes(null);setErr("");const custCode=makeId(cust||"Ügyfél","");try{const text=await ai([{role:"user",content:`Process this customer inquiry for a Hungarian auto parts business. Respond ONLY with valid JSON:\n\nCustomer: ${cust||"Unknown"} (code: ${custCode})\nMessage: "${msg}"\n\n{"parts":[{"name":"Hungarian part name","qty":1,"allegroUrl":"https://allegro.pl/listing?string=polish+search+car+model"}],"car":"make model year or null","sellerMessagePL":"Polish message starting with the customer code then listing ALL parts with quantities asking about availability and Krakow shipping","customerReplyHU":"Hungarian reply listing all requested parts"}`}]);setRes(JSON.parse(text.split(String.fromCharCode(96,96,96)+"json").join("").split(String.fromCharCode(96,96,96)).join("").trim()));}catch{setErr("Hiba. Próbálja újra.");}setLd(false);};
  const create=()=>{onOrderCreated({customer:cust||"Ismeretlen",platform:plat,part:res.partName,car:res.car||"",qty:res.quantity||1,allegroLink:res.allegroUrl||"",status:"pending",date:new Date().toISOString().split("T")[0],note:"",createdBy:userName});setMsg("");setCust("");setRes(null);};
  return(<div><PH sub="AI-alapú feldolgozás és fordítás">Új érdeklődés</PH><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}><Field label="Ügyfél neve" value={cust} onChange={setCust} placeholder="pl. Kovács Péter"/><Field label="Platform"><select value={plat} onChange={e=>setPlat(e.target.value)} style={inp}><option>WhatsApp</option><option>Messenger</option><option>Viber</option></select></Field></div><div style={{marginBottom:14}}><Field label="Ügyfél üzenete" value={msg} onChange={setMsg} placeholder="Illessze be az ügyfél üzenetét..." rows={4}/></div><Btn onClick={process} disabled={ld||!msg.trim()}>{ld?"⟳  Elemzés...":"✦  AI Feldolgozás"}</Btn>{err&&<div style={{marginTop:10,color:C.acc,fontSize:12}}>{err}</div>}{res&&(<div style={{marginTop:20,display:"flex",flexDirection:"column",gap:12}}><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:9,padding:18}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:12}}>AZONOSÍTOTT ADATOK</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:14,marginBottom:16}}>{[["Jármű",res.car||"—"],["Tételek",(res.parts?.length||1)+" db"]].map(([k,v])=>(<div key={k}><div style={{fontSize:10,color:C.mu,marginBottom:3}}>{k}</div><div style={{fontSize:13,color:C.tx,fontWeight:600}}>{v}</div></div>))}</div>{res.parts&&<div style={{marginBottom:12}}>{res.parts.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:i<res.parts.length-1?`1px solid ${C.bd}`:"none"}}><span style={{fontSize:11,color:C.mu,minWidth:20}}>{i+1}.</span><span style={{flex:1,fontSize:13,color:C.tx}}>{p.name}</span><span style={{fontSize:12,fontWeight:700,color:C.acc,minWidth:36}}>{p.qty} db</span>{p.allegroUrl&&<a href={p.allegroUrl} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.blue}}>🔍</a>}</div>)}</div>}<div style={{display:"flex",alignItems:"center",gap:10}}><a href={res.allegroUrl||res.parts?.[0]?.allegroUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,background:C.s2,color:C.blue,border:`1px solid ${C.bd}`,borderRadius:6,padding:"7px 12px",fontSize:12,fontWeight:600,textDecoration:"none"}}>🔍 Allegro keresés →</a><span style={{fontSize:11,color:C.mu,fontFamily:"monospace"}}>{res.allegroQuery}</span></div></div>{[{lbl:"🇵🇱 LENGYEL ÜZENET — ELADÓNAK",text:res.sellerMessagePL},{lbl:"🇭🇺 MAGYAR VÁLASZ — ÜGYFÉLNEK",text:res.customerReplyHU}].map(({lbl,text})=>(<div key={lbl} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:9,padding:18}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1}}>{lbl}</div><CopyBtn text={text}/></div><div style={{fontSize:13,color:C.t2,lineHeight:1.65,background:C.s2,borderRadius:6,padding:"10px 12px"}}>{text}</div></div>))}<Btn v="success" onClick={create}>✓  Rendelés létrehozása (Függőben)</Btn></div>)}</div>);
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
      const prompt="Te egy autóalkatrész-kereskedés asszisztense vagy. Írj rövid, személyes magyar értesítő üzenetet az ügyfélnek az alábbi adatok alapján. Csak az üzenet szövegét írd, semmi mást.";
      const userMsg="Ügyfél: "+order.customer+" | Alkatrész: "+order.part+" | Jármű: "+order.car+" | Mennyiség: "+order.qty+" db | Új státusz: "+ST[newStatus].label+" | Sablon: "+tmpl;
      const generated=await ai([{role:"user",content:prompt+"\n\n"+userMsg}]);
      if(generated) setNotify(n=>n?{...n,msg:generated}:n);
    }catch{}
    setNotifyLoad(false);
  };
  return(<div><PH sub="Összes rendelés — státusz bármelyik irányba módosítható">Rendelések</PH><div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}><div style={{flex:1,position:"relative"}}><span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:C.mu,fontSize:12,pointerEvents:"none"}}>🔍</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Keresés ügyfél, alkatrész, autó..." style={{...inp,paddingLeft:32}}/></div><select value={filter} onChange={e=>setFilter(e.target.value)} style={{...inp,width:"auto"}}><option value="all">Összes ({orders.length})</option>{SQ.map(s=><option key={s} value={s}>{ST[s].label} ({orders.filter(o=>o.status===s).length})</option>)}</select></div>
    <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"visible"}}><div style={{display:"grid",gridTemplateColumns:"90px 140px 1fr 55px 165px 85px 110px",padding:"9px 16px",borderBottom:`1px solid ${C.bd}`,background:C.s2,borderRadius:"10px 10px 0 0"}}>{["Platform","Ügyfél","Alkatrész / Autó","Db","Státusz","Dátum",""].map((h,i)=>(<div key={i} style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8}}>{h.toUpperCase()}</div>))}</div>
    {shown.length===0&&<div style={{padding:32,textAlign:"center",color:C.mu,fontSize:13}}>Nincs találat.</div>}
    {shown.map((o,i)=>{const next=SQ[SQ.indexOf(o.status)+1];const isOpen=detailId===o.id;return(<div key={o.id} style={{borderBottom:i<shown.length-1?`1px solid ${C.bd}`:"none"}}><div onClick={()=>setDetailId(isOpen?null:o.id)} style={{display:"grid",gridTemplateColumns:"90px 140px 1fr 55px 165px 85px 110px",padding:"12px 16px",alignItems:"center",cursor:"pointer",background:isOpen?C.acc+"06":"transparent"}}><div style={{display:"flex",flexDirection:"column",gap:3}}><PBadge p={o.platform}/><span style={{fontSize:9,color:C.mu,fontFamily:"monospace",fontWeight:700}}>{makeId(o.customer,o.zip)}</span></div><div style={{fontSize:13,fontWeight:600,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{o.customer}</div><div style={{paddingRight:8}}><div style={{fontSize:13,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{partsLabel(o)}</div><div style={{fontSize:11,color:C.mu,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.car}</div></div><div style={{fontSize:13,color:C.t2,fontWeight:getParts(o).length>1?700:400,color:getParts(o).length>1?C.amber:C.t2}}>{totalQty(o)} db</div>
    <div style={{position:"relative"}}><SBadge status={o.status} onClick={e=>{e.stopPropagation();setStatusPicker(statusPicker===o.id?null:o.id);}}/>{statusPicker===o.id&&(<div style={{position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:100,background:C.s1,border:`1px solid ${C.bd2}`,borderRadius:8,padding:6,minWidth:200,boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,padding:"4px 8px 6px"}}>STÁTUSZ MÓDOSÍTÁSA</div>{SQ.map(s=>(<button key={s} onClick={()=>{onChange(o.id,{status:s});setStatusPicker(null);if(STATUS_NOTIFY[s])triggerNotify(o,s);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",background:o.status===s?ST[s].bg:"transparent",border:"none",cursor:"pointer",borderRadius:5,fontFamily:F}}><span style={{width:7,height:7,borderRadius:"50%",background:ST[s].color,flexShrink:0}}/><span style={{fontSize:12,color:o.status===s?ST[s].color:C.t2,fontWeight:o.status===s?700:500}}>{ST[s].label}</span>{o.status===s&&<span style={{marginLeft:"auto",fontSize:10,color:ST[s].color}}>✓</span>}</button>))}</div>)}</div>
    <div style={{fontSize:11,color:C.mu}}>{o.date}</div><div style={{display:"flex",gap:4}}>{next&&<Btn v="subtle" sz="sm" onClick={e=>{e.stopPropagation();onChange(o.id,{status:next});if(STATUS_NOTIFY[next])triggerNotify(o,next);}} style={{padding:"4px 8px",fontSize:11}}>→</Btn>}<Btn v="ghost" sz="sm" onClick={e=>{e.stopPropagation();startEdit(o);}} style={{padding:"4px 8px",fontSize:12}}>✎</Btn><Btn v="ghost" sz="sm" onClick={e=>{e.stopPropagation();setDel(o.id);}} style={{padding:"4px 8px",fontSize:12,color:C.acc}}>✕</Btn></div></div>{o.note&&<div style={{padding:"0 16px 10px",fontSize:11,color:C.mu}}>💬 {o.note}</div>}{isOpen&&(<div style={{padding:"0 16px 16px",borderTop:`1px solid ${C.bd}`,marginTop:4,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>ID</div><div style={{fontSize:13,fontWeight:800,color:C.tx,fontFamily:"monospace"}}>{makeId(o.customer,o.zip)}</div></div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>PLATFORM</div><PBadge p={o.platform}/></div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>DÁTUM</div><div style={{fontSize:13,color:C.tx}}>{o.date}</div></div><div style={{gridColumn:"1/-1",background:C.s2,borderRadius:8,padding:"12px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:8}}>ALKATRÉSZEK ({getParts(o).length} tétel · {totalQty(o)} db)</div>{getParts(o).map((p,pi)=>(<div key={pi} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderTop:pi>0?`1px solid ${C.bd}`:"none"}}><span style={{fontSize:11,color:C.mu,minWidth:20}}>{pi+1}.</span><span style={{flex:1,fontSize:13,color:C.tx}}>{p.name}</span><span style={{fontSize:12,fontWeight:700,color:C.acc,minWidth:40,textAlign:"right"}}>{p.qty} db</span>{p.allegroLink&&<a href={p.allegroLink} target="_blank" rel="noreferrer" style={{fontSize:10,color:C.blue,textDecoration:"none"}}>🔍</a>}</div>))}</div><div style={{background:C.s2,borderRadius:8,padding:"11px 14px"}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>JÁRMŰ</div><div style={{fontSize:13,color:C.tx}}>{o.car}</div></div></div>)}</div>)})}</div>
    <div style={{marginTop:8,fontSize:11,color:C.mu}}>Kattintson a státuszra a módosításhoz — bármely irányba.</div>
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
  return(<div><PH sub="Átvételre váró csomagok Krakkóban">Krakkói raktár</PH>{items.length===0?(<div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:48,textAlign:"center"}}><div style={{fontSize:28,marginBottom:10}}>📦</div><div style={{color:C.mu,fontSize:13}}>Nincs csomag a raktárban.</div></div>):(<><div style={{background:C.purple+"10",border:`1px solid ${C.purple}22`,borderRadius:8,padding:"12px 16px",marginBottom:16}}><span style={{color:C.purple,fontWeight:700,fontSize:13}}>📦 {items.length} csomag vár a raktárban</span></div><div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"hidden",marginBottom:14}}>{items.map((o,i)=>(<div key={o.id} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderBottom:i<items.length-1?`1px solid ${C.bd}`:"none"}}><PBadge p={o.platform}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:C.tx}}>{o.customer}</div><div style={{fontSize:11,color:C.mu}}>{o.part} · {o.qty} db</div></div><Btn v="outline" sz="sm" onClick={()=>onChange(o.id,{status:"transit"})}>🚗 Úton van</Btn></div>))}</div><Btn full onClick={()=>items.forEach(o=>onChange(o.id,{status:"transit"}))}>🚗 Összes csomag — fuvar indítása</Btn></>)}</div>);
}

function PriceCalculator(){
  const[pln,setPln]=useState("");
  const[markup,setMarkup]=useState(20);
  const[rates,setRates]=useState({});
  const[fixed,setFixed]=useState({}); // {HUF:{on:false,val:""},EUR:{on:false,val:""},...}
  const[status,setStatus]=useState("idle");
  const[lastFetch,setLastFetch]=useState(null);

  const BUILTIN={HUF:92.5,EUR:0.233,RON:1.16,UAH:9.87,RSD:27.3,CZK:5.82};
  useEffect(()=>{
    db.get("calc_fixed",true).then(d=>{ if(d) setFixed(d); });
    db.get("calc_markup",true).then(d=>{ if(d!=null) setMarkup(d); });
  },[]);

  const saveFixed=(next)=>{ setFixed(next); db.set("calc_fixed",next,true); };
  const saveMarkup=(v)=>{ setMarkup(v); db.set("calc_markup",v,true); };

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
    live:    {dot:C.green,text:`Élő árfolyam — ${ts} · frankfurter.app`},
    fallback:{dot:C.amber,text:`Beépített árfolyam — ${ts} · élő forrás nem elérhető`},
    error:   {dot:C.red,  text:"Nem sikerült letölteni."},
  }[status]||{dot:C.mu,text:""};

  return(
    <div>
      <PH sub="PLN átváltása a szomszédos országok pénznemeibe, felárral">Árkalkulátor</PH>

      <div style={{display:"grid",gridTemplateColumns:"320px 1fr",gap:20,alignItems:"start"}}>

        {/* ── LEFT: controls ── */}
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

        {/* ── RIGHT: currency cards always visible ── */}
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
            const withMarkup=base*mult;
            const rateDisplay=eff?(eff>=100?`1 PLN = ${eff.toFixed(1)} ${cur.code}`:eff>=1?`1 PLN = ${eff.toFixed(4)} ${cur.code}`:`1 PLN = ${eff.toFixed(6)} ${cur.code}`):"—";
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
                      <div style={{fontSize:16,fontWeight:700,color:C.mu}}>— {cur.code}</div>
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
        <Section lang="pl" title="🇵🇱 Lengyel — eladóknak" items={plTpl}/>
        <Section lang="hu" title="🇭🇺 Magyar — ügyfeleknek" items={huTpl}/>
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

const BF={partName:"",serialNumber:"",car:"",condition:"Jó",price:"",contact:"",pickup:"",description:""};
function CatalogueManager({user}){
  const[items,setItems]=useState([]);const[showForm,setShowForm]=useState(false);const[images,setImages]=useState([]);const[analyzing,setAnalyzing]=useState(false);const[form,setForm]=useState(BF);const[saving,setSaving]=useState(false);
  const fileRef=useRef();const f=(k)=>({value:form[k],onChange:v=>setForm(x=>({...x,[k]:v}))});
  useEffect(()=>{db.get("catalogue_items",true).then(d=>setItems(d||[]));}, []);
  const handleFiles=async(files)=>{const b64s=await Promise.all(Array.from(files).map(file=>new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(file);})));setImages(prev=>[...prev,...b64s]);setAnalyzing(true);try{const content=[...b64s.map(b64=>({type:"image",source:{type:"base64",media_type:b64.split(";")[0].split(":")[1],data:b64.split(",")[1]}})),{type:"text",text:`Analyze car part images. Find serial/OEM numbers. JSON only:\n{"partName":"Hungarian name","serialNumber":"exact number or null","car":"compatible vehicles or null","condition":"Jó","description":"2-3 sentence Hungarian description"}`}];const text=await ai([{role:"user",content}]);const d=JSON.parse(text.split(String.fromCharCode(96,96,96)+"json").join("").split(String.fromCharCode(96,96,96)).join("").trim());setForm(x=>({...x,partName:d.partName||"",serialNumber:d.serialNumber||"",car:d.car||"",condition:d.condition||"Jó",description:d.description||""}));}catch{}setAnalyzing(false);};
  const publish=async()=>{if(!form.partName||!form.price)return;setSaving(true);const item={id:Date.now(),...form,images,publishedBy:user.name,publishedAt:new Date().toISOString(),sold:false};const updated=[item,...items];await db.set("catalogue_items",updated,true);setItems(updated);setShowForm(false);setImages([]);setForm(BF);setSaving(false);};
  const toggleSold=async(id)=>{const u=items.map(i=>i.id===id?{...i,sold:!i.sold}:i);await db.set("catalogue_items",u,true);setItems(u);};
  const remove=async(id)=>{const u=items.filter(i=>i.id!==id);await db.set("catalogue_items",u,true);setItems(u);};
  return(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}><PH sub="Alkatrészek közzététele a nyilvános katalógusban">Katalógus</PH><Btn onClick={()=>{setShowForm(!showForm);setImages([]);setForm(BF);}}>{showForm?"✕ Mégse":"+ Új alkatrész"}</Btn></div>
    {showForm&&(<div style={{background:C.s1,border:`1px solid ${C.acc}20`,borderRadius:10,padding:22,marginBottom:22}}><div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:14}}>ÚJ ALKATRÉSZ</div><div onClick={()=>fileRef.current?.click()} style={{border:`2px dashed ${images.length?C.acc:C.bd2}`,borderRadius:8,padding:20,textAlign:"center",cursor:"pointer",marginBottom:16}}><input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>{images.length?(<div><div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:10}}>{images.map((src,i)=>(<div key={i} style={{position:"relative"}}><img src={src} alt="" style={{height:76,width:76,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bd}`}}/><button onClick={ev=>{ev.stopPropagation();setImages(imgs=>imgs.filter((_,j)=>j!==i));}} style={{position:"absolute",top:-6,right:-6,background:C.acc,color:"#fff",border:"none",borderRadius:"50%",width:18,height:18,cursor:"pointer",fontSize:9,fontFamily:F}}>✕</button></div>))}<div style={{height:76,width:76,border:`2px dashed ${C.bd2}`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:C.mu,fontSize:22,cursor:"pointer"}}>+</div></div><div style={{fontSize:11,color:analyzing?C.amber:C.green,fontWeight:600}}>{analyzing?"⟳  AI elemzés...":"✓  Feltöltve"}</div></div>):(<div><div style={{fontSize:22,marginBottom:6}}>📷</div><div style={{fontSize:13,color:C.mu}}>Képek feltöltése — AI olvassa a sorozatszámot</div></div>)}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}><Field label="Alkatrész neve" {...f("partName")} placeholder="pl. Féktárcsa első"/><Field label="Sorozatszám / OEM" {...f("serialNumber")} placeholder="pl. 1K0615301AA"/><Field label="Kompatibilis jármű" {...f("car")} placeholder="pl. VW Golf VII 2013-2020"/><Field label="Állapot"><select value={form.condition} onChange={e=>setForm(x=>({...x,condition:e.target.value}))} style={inp}>{CONDITIONS.map(c=><option key={c}>{c}</option>)}</select></Field><Field label="Ár (Ft)" {...f("price")} placeholder="pl. 25000"/><Field label="Elérhetőség" {...f("contact")} placeholder="pl. +36 30 123 4567"/><Field label="Átvételi hely" {...f("pickup")} placeholder="pl. Budapest XV."/></div>
    <div style={{marginBottom:14}}><Field label="Leírás" {...f("description")} rows={3}/></div><Btn onClick={publish} disabled={saving||!form.partName||!form.price}>{saving?"Mentés...":"🌐  Közzétesz"}</Btn></div>)}
    <div style={{display:"flex",flexDirection:"column",gap:8}}>{items.length===0&&<div style={{color:C.mu,fontSize:13,textAlign:"center",padding:32}}>Még nincs közzétett alkatrész.</div>}{items.map(item=>(<div key={item.id} style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:9,padding:"14px 16px",display:"flex",gap:14,alignItems:"center",opacity:item.sold?0.5:1}}><div style={{display:"flex",gap:5,flexShrink:0}}>{(item.images||[]).slice(0,2).map((src,i)=><img key={i} src={src} alt="" style={{width:50,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bd}`}}/>)}{(!item.images||item.images.length===0)&&<div style={{width:50,height:50,background:C.s3,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🔩</div>}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}><div style={{fontSize:14,fontWeight:700,color:C.tx,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.partName}</div>{item.sold&&<span style={{background:C.mu+"20",color:C.mu,borderRadius:4,padding:"2px 7px",fontSize:9,fontWeight:800,flexShrink:0}}>ELADVA</span>}</div><div style={{fontSize:11,color:C.mu}}>{item.car}{item.serialNumber&&` · ${item.serialNumber}`}</div><div style={{display:"flex",gap:8,marginTop:5,alignItems:"center"}}><span style={{background:COND_C[item.condition]+"18",color:COND_C[item.condition],border:`1px solid ${COND_C[item.condition]}25`,borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:700}}>{item.condition}</span><span style={{fontSize:14,fontWeight:800,color:C.acc}}>{parseInt(item.price).toLocaleString("hu")} Ft</span><span style={{fontSize:11,color:C.mu}}>📍 {item.pickup}</span></div></div><div style={{display:"flex",gap:6,flexShrink:0}}><Btn v="outline" sz="sm" onClick={()=>toggleSold(item.id)}>{item.sold?"Aktív":"Eladva"}</Btn><Btn v="danger" sz="sm" onClick={()=>remove(item.id)}>Törlés</Btn></div></div>))}</div>
  </div>);
}

function Customers({orders}){
  const[customers,setCustomers]=useState(null);
  const[setup,setSetup]=useState(false);
  const[detail,setDetail]=useState(null);

  useEffect(()=>{db.get("customers_db",true).then(d=>setCustomers(d||null));}, []);

  const firstSetup=async()=>{
    setSetup(true);
    const map={};
    orders.forEach(o=>{
      const id=makeId(o.customer,o.zip);
      if(!map[id]) map[id]={id,name:o.customer,zip:o.zip||"",address:"",phone:"",platform:o.platform,orders:0,firstSeen:o.date};
      map[id].orders++;
      if(o.date<map[id].firstSeen) map[id].firstSeen=o.date;
    });
    const list=Object.values(map);
    await db.set("customers_db",list,true);
    setCustomers(list);
    setSetup(false);
  };

  const updateAddr=(id,addr)=>{
    const updated=(customers||[]).map(c=>c.id===id?{...c,address:addr}:c);
    setCustomers(updated);
    db.set("customers_db",updated,true);
  };

  const uniqueCount=new Set(orders.map(o=>makeId(o.customer,o.zip))).size;
  if(!customers) return(
    <div>
      <PH sub="Vevők nyilvántartása — cím, rendelésszám, elérhetőség">Vevők</PH>
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:40,textAlign:"center"}}>
        <div style={{fontSize:48,fontWeight:800,color:C.acc,marginBottom:6}}>{uniqueCount}</div>
        <div style={{fontSize:14,fontWeight:700,color:C.t2,marginBottom:4}}>egyedi vevő a rendelésekből</div>
        <div style={{fontSize:12,color:C.mu,marginBottom:24}}>Kattints az importáláshoz — nevek, platformok, rendelésszámok betöltése.</div>
        <Btn onClick={firstSetup} disabled={setup}>{setup?"Betöltés...":"⟳ Vevők importálása"}</Btn>
      </div>
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
        <PH sub="Mentett vevőadatok — cím, platform, rendelésszám">Vevők</PH>
        <Btn v="subtle" sz="sm" onClick={firstSetup} disabled={setup}>{setup?"...":"↺ Szinkronizál"}</Btn>
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 80px 60px",padding:"9px 16px",borderBottom:`1px solid ${C.bd}`,background:C.s2}}>
          {["ID","Név","Cím","Platform","Rendel."].map((h,i)=><div key={i} style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8}}>{h}</div>)}
        </div>
        {customers.length===0&&<div style={{padding:24,textAlign:"center",color:C.mu,fontSize:13}}>Nincs vevő.</div>}
        {customers.map((c,i)=>(
          <div key={c.id} onClick={()=>setDetail(detail?.id===c.id?null:c)} style={{display:"grid",gridTemplateColumns:"90px 1fr 1fr 80px 60px",padding:"12px 16px",borderBottom:i<customers.length-1?`1px solid ${C.bd}`:"none",cursor:"pointer",background:detail?.id===c.id?C.acc+"08":"transparent"}}>
            <span style={{fontSize:10,fontWeight:800,color:C.mu,fontFamily:"monospace"}}>{c.id}</span>
            <div><div style={{fontSize:13,fontWeight:600,color:C.tx}}>{c.name}</div><div style={{fontSize:10,color:C.mu}}>Első: {c.firstSeen}</div></div>
            <div style={{fontSize:12,color:c.address?C.t2:C.mu}}>{c.address||<span style={{color:C.amber,fontSize:11}}>Nincs cím</span>}</div>
            <div style={{fontSize:11,color:C.mu}}>{c.platform}</div>
            <div style={{fontSize:12,fontWeight:700,color:C.acc}}>{c.orders}</div>
          </div>
        ))}
      </div>
      {detail&&(
        <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20,marginTop:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:C.tx}}>{detail.name} <span style={{fontSize:11,color:C.mu,fontFamily:"monospace"}}>{detail.id}</span></div>
            <Btn v="ghost" sz="sm" onClick={()=>setDetail(null)}>✕</Btn>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <div style={{flex:1}}><Field label="Szállítási cím" value={detail.address||""} onChange={v=>{const u={...detail,address:v};setDetail(u);updateAddr(detail.id,v);}} placeholder="pl. 2900 Komárom, Klapka tér 1."/></div>
          </div>
          <div style={{fontSize:11,color:C.mu,marginTop:8}}>A cím automatikusan mentődik. Az AI a beérkező üzenetekből is kinyeri a címet, ha az ügyfél elküldi.</div>
        </div>
      )}
    </div>
  );
}
function Settings({user}){
  const[users,setUsers]=useState([]);
  const[form,setForm]=useState({username:"",password:"",name:"",role:"staff"});
  const[msg,setMsg]=useState("");
  const[aiPrompt,setAiPrompt]=useState("");
  const[promptSaved,setPromptSaved]=useState(false);
  const f=(k)=>({value:form[k],onChange:v=>setForm(x=>({...x,[k]:v}))});

  useEffect(()=>{
    db.get("team_users",true).then(d=>setUsers(d||[]));
    db.get("ai_system_prompt",true).then(d=>setAiPrompt(d||DEFAULT_AI_PROMPT));
  },[]);

  const add=async()=>{
    if(!form.username||!form.password||!form.name)return;
    const updated=[...users,{...form,id:Date.now()}];
    await db.set("team_users",updated,true);
    setUsers(updated);setForm({username:"",password:"",name:"",role:"staff"});
    setMsg("✓ Hozzáadva");setTimeout(()=>setMsg(""),2000);
  };
  const del=async(id)=>{const u=users.filter(u=>u.id!==id);await db.set("team_users",u,true);setUsers(u);};
  const savePrompt=async()=>{
    await db.set("ai_system_prompt",aiPrompt,true);
    setPromptSaved(true);setTimeout(()=>setPromptSaved(false),2000);
  };
  const resetPrompt=()=>setAiPrompt(DEFAULT_AI_PROMPT);

  return(
    <div>
      <PH sub="Csapattagok és AI beállítások">Beállítások</PH>

      {/* AI System Prompt — admin only */}
      {user?.role==="admin"&&<div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1}}>AI RENDSZER PROMPT</div>
            <div style={{fontSize:11,color:C.mu,marginTop:3}}>Ez szabja meg, hogyan viselkedik az AI a beérkező üzenetekre adott válaszoknál.</div>
          </div>
          <div style={{display:"flex",gap:7}}>
            <Btn v="outline" sz="sm" onClick={resetPrompt}>Alapértelmezett</Btn>
            <Btn v={promptSaved?"success":"primary"} sz="sm" onClick={savePrompt}>{promptSaved?"✓ Mentve":"Mentés"}</Btn>
          </div>
        </div>
        <textarea
          value={aiPrompt}
          onChange={e=>setAiPrompt(e.target.value)}
          rows={8}
          style={{...inp,resize:"vertical",lineHeight:1.65,fontFamily:"monospace",fontSize:12}}
        />
        <div style={{fontSize:10,color:C.mu,marginTop:8}}>
          A prompt az összes csatornán (WhatsApp PL/HU, Viber, Messenger) érvényes. Az AI a prompt után kapja meg a beszélgetés előzményeit és a csatorna nyelvét.
        </div>
      </div>}

      {/* Team members */}
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,padding:20,marginBottom:20}}>
        <div style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:1,marginBottom:14}}>ÚJ CSAPATTAG</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 120px auto",gap:10,alignItems:"end"}}>
          <Field label="Teljes név" {...f("name")} placeholder="pl. Kovács Péter"/>
          <Field label="Felhasználónév" {...f("username")} placeholder="pl. peter"/>
          <Field label="Jelszó" type="password" {...f("password")} placeholder="jelszó"/>
          <Field label="Szerepkör"><select value={form.role} onChange={e=>setForm(x=>({...x,role:e.target.value}))} style={inp}><option value="staff">staff</option><option value="admin">admin</option></select></Field>
          <Btn onClick={add} disabled={!form.username||!form.password||!form.name}>{msg||"Hozzáad"}</Btn>
        </div>
      </div>
      <div style={{background:C.s1,border:`1px solid ${C.bd}`,borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"40px 1fr 100px 80px",padding:"9px 16px",borderBottom:`1px solid ${C.bd}`,background:C.s2,borderRadius:"10px 10px 0 0"}}>
          {["","Név","Szerepkör",""].map((h,i)=><div key={i} style={{fontSize:10,color:C.mu,fontWeight:700,letterSpacing:0.8}}>{h.toUpperCase()}</div>)}
        </div>
        {users.map((u,i)=>(
          <div key={u.id} style={{display:"grid",gridTemplateColumns:"40px 1fr 100px 80px",padding:"12px 16px",alignItems:"center",borderBottom:i<users.length-1?`1px solid ${C.bd}`:"none"}}>
            <div style={{width:28,height:28,background:C.acc+"18",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:C.acc}}>{u.name[0]}</div>
            <div><div style={{fontSize:13,fontWeight:600,color:C.tx}}>{u.name}</div><div style={{fontSize:11,color:C.mu}}>@{u.username}</div></div>
            <span style={{background:u.role==="admin"?C.acc+"15":C.s3,color:u.role==="admin"?C.acc:C.mu,borderRadius:4,padding:"3px 8px",fontSize:10,fontWeight:700,display:"inline-block"}}>{u.role}</span>
            <div>{u.id!==1&&<Btn v="danger" sz="sm" onClick={()=>del(u.id)}>Törlés</Btn>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PublicCatalogue({onBack}){
  const[items,setItems]=useState([]);const[ld,setLd]=useState(true);const[search,setSearch]=useState("");const[cond,setCond]=useState("Összes");const[sel,setSel]=useState(null);const[imgIdx,setImgIdx]=useState(0);
  useEffect(()=>{db.get("catalogue_items",true).then(d=>{setItems((d||[]).filter(i=>!i.sold));setLd(false);});}, []);
  const shown=items.filter(i=>(cond==="Összes"||i.condition===cond)&&(!search||[i.partName,i.car||"",i.serialNumber||""].join(" ").toLowerCase().includes(search.toLowerCase())));
  return(<div style={{minHeight:"100vh",background:"#f4f4f6",fontFamily:F}}><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/><div style={{background:"#0e0e12",borderBottom:"1px solid #1c1c22"}}><div style={{maxWidth:1100,margin:"0 auto",padding:"0 32px",height:58,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16,fontWeight:800,color:"#f0f0f2",letterSpacing:-0.5}}>AutoRészek<span style={{color:C.acc}}>.</span></span><span style={{fontSize:9,color:"#444",letterSpacing:2,textTransform:"uppercase",borderLeft:"1px solid #2a2a2a",paddingLeft:10}}>PL → HU</span></div>{onBack&&<button onClick={onBack} style={{background:"transparent",border:"1px solid #252525",color:"#555",borderRadius:5,padding:"5px 11px",fontSize:11,cursor:"pointer",fontFamily:F,fontWeight:600}}>← Admin</button>}</div></div><div style={{background:"linear-gradient(160deg,#0e0e12 0%,#161620 100%)",padding:"40px 32px 32px",textAlign:"center"}}><div style={{maxWidth:520,margin:"0 auto"}}><h1 style={{fontSize:26,fontWeight:800,color:"#f0f0f2",margin:"0 0 6px",letterSpacing:-0.5}}>Alkatrész Katalógus</h1><p style={{fontSize:13,color:"#555",margin:"0 0 20px"}}>Lengyelországból behozott alkatrészek · Magyarországi átvétel</p><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Keresés alkatrész, autó, cikkszám..." style={{width:"100%",background:"#1a1a22",border:"1px solid #252530",borderRadius:8,padding:"11px 16px",color:"#f0f0f2",fontSize:13,outline:"none",boxSizing:"border-box"}}/></div></div>
    <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 32px"}}><div style={{display:"flex",gap:7,marginBottom:22,flexWrap:"wrap",alignItems:"center"}}>{["Összes",...CONDITIONS].map(c=>(<button key={c} onClick={()=>setCond(c)} style={{background:cond===c?"#111":"#fff",color:cond===c?"#fff":"#555",border:`1px solid ${cond===c?"#111":"#e0e0e0"}`,borderRadius:6,padding:"6px 13px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:F}}>{c==="Összes"?"Minden állapot":c}</button>))}<span style={{marginLeft:"auto",fontSize:12,color:"#999"}}>{shown.length} alkatrész</span></div>
    {ld&&<div style={{textAlign:"center",color:"#999",padding:48}}>Betöltés...</div>}{!ld&&shown.length===0&&<div style={{textAlign:"center",color:"#999",padding:48}}>Nincs találat.</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>{shown.map(item=>(<div key={item.id} onClick={()=>{setSel(item);setImgIdx(0);}} style={{background:"#fff",borderRadius:12,overflow:"hidden",cursor:"pointer",border:"1px solid #e8e8ec",transition:"all 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.05)"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.09)";}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.05)";}}>
      <div style={{height:185,background:"#f0f0f0",position:"relative",overflow:"hidden"}}>{item.images?.[0]?<img src={item.images[0]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",fontSize:34,color:"#ccc"}}>🔩</div>}{(item.images?.length||0)>1&&<div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,0.55)",color:"#fff",borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:700}}>+{item.images.length-1}</div>}<span style={{position:"absolute",top:8,left:8,background:COND_C[item.condition],color:"#fff",borderRadius:4,padding:"3px 8px",fontSize:10,fontWeight:800}}>{item.condition}</span></div>
      <div style={{padding:"13px 15px"}}><div style={{fontSize:14,fontWeight:800,color:"#111",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.partName}</div>{item.car&&<div style={{fontSize:11,color:"#888",marginBottom:1}}>🚗 {item.car}</div>}{item.serialNumber&&<div style={{fontSize:10,color:"#bbb",fontFamily:"monospace",marginBottom:7}}># {item.serialNumber}</div>}<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}><span style={{fontSize:16,fontWeight:800,color:C.acc}}>{parseInt(item.price).toLocaleString("hu")} Ft</span><span style={{fontSize:10,color:"#aaa"}}>📍 {item.pickup}</span></div></div>
    </div>))}</div></div>
    {sel&&(<div onClick={()=>setSel(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20,backdropFilter:"blur(5px)"}}><div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,maxWidth:540,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
      {(sel.images?.length||0)>0&&(<div style={{position:"relative",background:"#f0f0f0",height:255,overflow:"hidden",borderRadius:"14px 14px 0 0"}}><img src={sel.images[imgIdx]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>{sel.images.length>1&&(<><button onClick={()=>setImgIdx(i=>(i-1+sel.images.length)%sel.images.length)} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.45)",color:"#fff",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,fontFamily:F}}>‹</button><button onClick={()=>setImgIdx(i=>(i+1)%sel.images.length)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,0.45)",color:"#fff",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:16,fontFamily:F}}>›</button><div style={{position:"absolute",bottom:8,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5}}>{sel.images.map((_,i)=><div key={i} onClick={()=>setImgIdx(i)} style={{width:6,height:6,borderRadius:"50%",background:i===imgIdx?"#fff":"rgba(255,255,255,0.35)",cursor:"pointer"}}/>)}</div><div style={{position:"absolute",bottom:8,right:10,display:"flex",gap:4}}>{sel.images.slice(0,4).map((src,i)=><img key={i} src={src} alt="" onClick={()=>setImgIdx(i)} style={{width:34,height:34,objectFit:"cover",borderRadius:5,border:i===imgIdx?"2px solid #fff":"2px solid transparent",cursor:"pointer"}}/>)}</div></>)}</div>)}
      <div style={{padding:24}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}><div><h2 style={{fontSize:18,fontWeight:800,color:"#111",margin:"0 0 4px"}}>{sel.partName}</h2>{sel.car&&<div style={{fontSize:13,color:"#888"}}>🚗 {sel.car}</div>}</div><span style={{background:COND_C[sel.condition],color:"#fff",borderRadius:5,padding:"4px 10px",fontSize:11,fontWeight:800,flexShrink:0,marginLeft:12}}>{sel.condition}</span></div>{sel.serialNumber&&<div style={{background:"#f4f4f6",borderRadius:6,padding:"8px 12px",fontSize:12,fontFamily:"monospace",color:"#555",marginBottom:12}}>Cikkszám: {sel.serialNumber}</div>}{sel.description&&<p style={{fontSize:13,color:"#555",lineHeight:1.65,margin:"0 0 16px"}}>{sel.description}</p>}<div style={{borderTop:"1px solid #eee",paddingTop:16,marginBottom:16}}><div style={{fontSize:22,fontWeight:800,color:C.acc,marginBottom:8}}>{parseInt(sel.price).toLocaleString("hu")} Ft</div><div style={{fontSize:13,color:"#555",marginBottom:4}}>📍 Átvétel: <strong>{sel.pickup}</strong></div><div style={{fontSize:13,color:"#555"}}>📞 <strong>{sel.contact}</strong></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 80px",gap:8}}><a href={`tel:${sel.contact}`} style={{background:C.acc,color:"#fff",borderRadius:7,padding:"11px 0",fontSize:13,fontWeight:700,textDecoration:"none",textAlign:"center",display:"block"}}>📞 Hívás</a><a href={`https://wa.me/${(sel.contact||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{background:"#22c55e",color:"#fff",borderRadius:7,padding:"11px 0",fontSize:13,fontWeight:700,textDecoration:"none",textAlign:"center",display:"block"}}>💬 WhatsApp</a><button onClick={()=>setSel(null)} style={{background:"#f0f0f0",color:"#666",border:"none",borderRadius:7,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:F}}>✕</button></div></div>
    </div></div>)}
  </div>);
}

function MainApp({user,onLogout,onPublic}){
  const[view,setView]=useState("dashboard");
  const[ordersFilter,setOrdersFilter]=useState("all");
  const[orders,setOrders]=useState([]);const[ready,setReady]=useState(false);const[nextId,setNextId]=useState(100);
  const[convos,setConvos]=useState([]);const[users,setUsers]=useState([]);
  useEffect(()=>{
    db.get("all_orders",true).then(d=>{const data=d||INIT_ORDERS;setOrders(data);setNextId(Math.max(...data.map(o=>o.id),0)+1);setReady(true);});
    db.get("inbox_convos",true).then(d=>setConvos(d||SAMPLE_CONVOS));
    db.get("team_users",true).then(d=>setUsers(d||[]));
  },[]);
  useEffect(()=>{if(ready)db.set("all_orders",orders,true);},[orders,ready]);
  const upd=(id,patch)=>setOrders(p=>p.map(o=>o.id===id?{...o,...patch}:o));
  const del=(id)=>setOrders(p=>p.filter(o=>o.id!==id));
  const add=(o)=>{setOrders(p=>[{...o,id:nextId},...p]);setNextId(n=>n+1);setView("orders");};
  const panels={
    dashboard:<Dashboard orders={orders} convos={convos} onNav={(v,f)=>{setView(v);if(f)setOrdersFilter(f);}}/>,
    ai:<AiDashboard orders={orders}/>,
    inbox:<Inbox onCreateOrder={(o)=>{add(o);setView("orders");}} userName={user.name} users={users}/>,
    inquiry:<Inquiry onOrderCreated={add} userName={user.name}/>,
    orders:<Orders orders={orders} onChange={upd} onDelete={del} initialFilter={ordersFilter} onFilterUsed={()=>setOrdersFilter("all")}/>,
    krakow:<Krakow orders={orders} onChange={upd}/>,
    catalogue:<CatalogueManager user={user}/>,
    calculator:<PriceCalculator/>,
    templates:<Templates/>,
    customers:<Customers orders={orders}/>,
    settings:<Settings user={user}/>,
  };
  return(<div style={{display:"flex",minHeight:"100vh",background:C.bg,color:C.tx,fontFamily:F}}>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
    <style>{"*{margin:0;padding:0;box-sizing:border-box}html,body{background:#0c0c0f;width:100%;height:100%}#root{min-height:100vh}*{scrollbar-width:thin;scrollbar-color:#1e1e1e #0a0a0a}::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#0a0a0a}::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#2a2a2a}::-webkit-scrollbar-corner{background:#0a0a0a}"}</style>
    <Sidebar active={view} setActive={setView} user={user} onLogout={onLogout} onPublic={onPublic} orders={orders} convos={convos}/>
    <div style={{flex:1,padding:view==="inbox"?"0":"32px 36px",overflowY:view==="inbox"?"hidden":"auto",minWidth:0}}>{panels[view]||null}</div>
  </div>);
}

export default function App(){
  const[user,setUser]=useState(null);const[pub,setPub]=useState(false);
  if(pub)return <PublicCatalogue onBack={()=>setPub(false)}/>;
  if(!user)return <Login onLogin={setUser}/>;
  return <MainApp user={user} onLogout={()=>setUser(null)} onPublic={()=>setPub(true)}/>;
}

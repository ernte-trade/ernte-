// ===== ERNTE · PREHĽAD MAJITEĽA (Martin Vaľko + Jana Valková) – dlaždice sklo · diamant =====
// Poradie zhora: 💶 naše nákupné ceny a za koľko to predáme → 🔔 čo riešiť → 🤝 obchody → 💰 zisky ERNTE →
// 🧭 komodity, služby, evidencia, burza → podrobnosti (pozícia a riziko, cieľové ceny, termíny, upozornenia).
// Ťuknutie na dlaždicu otvorí sekciu. Vidí iba rola „owner“ (Martin, Jana). Bez vodičov, flotily a balíka mobility.
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"");
const F=(x,d)=>typeof fmt==="function"?fmt(x,d):String(x);
const ON=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER);
const MAIN=()=>typeof window.MAIN_OK==="function"&&MAIN_OK();
const DAY=864e5,t0=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const dd=s=>Math.round((new Date(s+"T00:00:00")-t0())/DAY);
const CC={repka:"#f2d22e",lo:"#ffb703",ho:"#fb8500",soja:"#e9c46a",psenica_p:"#e0b878",psenica_k:"#c99a5b",jacmen_k:"#cdb07a",jacmen_s:"#b7c98a",kukurica:"#f4a340",cirok:"#c98b8b"};
window.owHomeOn=ON;

// ---- predajná cena z automatického cenníka (rovnaký výpočet ako Kalkulačka) ----
let calcC=null,calcAt=0,retry=0;
function sellMap(){const A=window.autoCennik;if(!A)return {};
  if(A.state&&A.state.calc&&Object.keys(A.state.calc).length)return A.state.calc;
  if(Date.now()-calcAt>20e3){calcAt=Date.now();try{calcC=A.calc()||{}}catch(x){calcC={}}}
  return calcC||{}}
function later(){if(retry>8)return;retry++;setTimeout(()=>{if(typeof TAB!=="undefined"&&TAB==="home"&&ON())renderStaff()},3500)}

// ---- dlaždica ----
const tile=(o)=>`<button type="button" class="owt${o.c?" "+o.c:""}" data-owgo="${e(o.go)}"${o.glow?` style="--glow:${o.glow}"`:""}><span class="owi" aria-hidden="true">${o.i}</span><span class="owl">${e(o.l)}</span><b class="owv">${o.v}</b>${o.s?`<small>${o.s}</small>`:""}</button>`;
const sec=(ic,t,badge,body,id)=>`<section class="owsec"${id?` id="${id}"`:""}><h3 class="owsh"><span>${ic} ${e(t)}</span>${badge?`<em>${badge}</em>`:""}</h3>${body}</section>`;

// ---- 1. ceny ----
function pricesHTML(){const P=(STATE.prices||[]).filter(p=>p.price!=null&&+p.price>0),S=sellMap(),M=STATE.mkt;
  if(STATE.mkt===undefined&&typeof loadMkt==="function"){STATE.mkt=null;try{loadMkt().then(()=>{if(TAB==="home")renderStaff()})}catch(x){}}
  if(!P.length)return `<div class="owempty">Cenník je prázdny – zadaj ceny v záložke <button type="button" class="owlink" data-owgo="price">💶 Cenník</button>.</div>`;
  const order=(typeof MK!=="undefined"?MK.map(m=>m[0]):[]);P.sort((a,b)=>order.indexOf(a.com)-order.indexOf(b.com));
  let anySell=false;
  const cards=P.map(p=>{let s=S[p.com];if(s&&(s.arx||s.ia))s=s.rg||null;/* náš NÁKUPNÝ model (ADM, Interagros, VSK) nie je predaj – iba Kalkulačka (región Bunge/Somotor) */const buy=+p.price,bst=window.sellBest?sellBest(p.com,+p.price):null;
    // jedno číslo všade: ak máme skutočné ponuky odberateľov, predaj a marža = najlepšia z nich (to isté ako 🏆 Kde predať)
    if(bst&&bst.net!=null)s={dap:bst.price,dop:bst.dop||0,pl:bst.b.name+(bst.siteName?" "+bst.siteName:"")+" · "+bst.del};
    const dap=s&&Number.isFinite(+s.dap)?+s.dap:null,dop=s&&Number.isFinite(+s.dop)?+s.dop:0;
    const mg=dap!=null?Math.round((dap-dop-buy)*100)/100:null;if(dap!=null)anySell=true;
    const bs=typeof MKB!=="undefined"?MKB[p.com]:null,bx=bs&&M&&M[bs]&&M[bs].eur_t!=null?+M[bs].eur_t:null;
    const img=typeof imgUrl==="function"?imgUrl(p.com):"";
    return `<button type="button" class="owp" data-owgo="price" style="--cc:${CC[p.com]||"#7cc4ff"}">
      <span class="owpn">${img?`<img src="${img}" alt="" loading="lazy" onerror="this.remove()">`:"<i></i>"}<span>${e(comName(p.com))}</span></span>
      <span class="owpk">Nákup FCA</span><b class="owpv">${F(buy,0)}<small> €/t</small></b>
      <span class="owps">${dap!=null?`Predaj <b>${F(dap,0)} €/t</b>`:`Predaj <b>–</b>`}<small>${dap!=null?e(String(s.pl||"").replace("Bunge · ","Bunge "))+(dop?` · doprava ${F(dop,0)} €`:""):"čaká na trh"}</small></span>
      <span class="owpf"><span class="owpm ${mg==null?"":mg>=0?"ps":"ng"}">${mg==null?"marža –":`marža ${mg>0?"+":mg<0?"−":""}${F(Math.abs(mg),0)} €/t`}</span>${bx!=null?`<span class="owpb">${e(bs==="soja_usc_bu"?"CBOT":"MATIF")} ${F(bx,0)}</span>`:""}</span></button>`}).join("");
  if(!anySell)later();
  const valid=((STATE.settings||{}).pricelist||{}).valid;
  return `<div class="owg owpg">${cards}</div>${window.sellRecHTML?sellRecHTML():""}<div class="owfoot">Nákup = naša výkupná cena FCA farma, ktorú vidia farmári. Predaj = najlepšia ponuka odberateľa (rovnaká ako v „🏆 Kde predať“), inak odhad Kalkulačky; marža = predaj − doprava − nákup.${valid?` Cenník platí do ${e(dSK(valid))}.`:""}</div>`}

// ---- 2. čo riešiť ----
function todoHTML(){const R=STATE.reqs||[],nNew=R.filter(r=>r.status==="nova").length,auto=R.filter(r=>r.status==="nova"&&/^🎯 Automaticky/.test(r.note||"")).length,AL=[];
  if(nNew)AL.push(["w","📥",`${nNew} ${nNew===1?"nová požiadavka":nNew<5?"nové požiadavky":"nových požiadaviek"}${auto?` · 🎯 ${auto}× cieľová cena`:""}`,"req"]);
  const valid=((STATE.settings||{}).pricelist||{}).valid;if(valid){const d=dd(valid);if(d<0)AL.push(["r","💶","Cenník vypršal – farmári nemôžu predávať","price"]);else if(d<=2)AL.push(["w","💶",`Cenník platí ešte ${d} ${d===1?"deň":"dni"}`,"price"])}
  const X=window.HUBX;if(X&&X.DUE){const D=X.DUE.map(x=>[x,dd(x[0])]).filter(x=>x[1]>=0&&x[1]<=90);for(const [x,n] of D.filter(z=>z[1]<=30))AL.push(["r",x[1],`O ${n} dní: ${e(x[2].split(" – ")[0])}`,"#hs-due"]);const l=D.filter(z=>z[1]>30);if(l.length)AL.push(["w","📅",`${l.length} ${l.length===1?"zákonný termín":"zákonné termíny"} do 90 dní`,"#hs-due"])}
  const pn=window.opushParts?opushParts.newCnt():0;if(pn)AL.push(["b","🔔",`${pn} ${pn===1?"nové upozornenie":pn<5?"nové upozornenia":"nových upozornení"}`,"#ow-push"]);
  if(!AL.length)return `<div class="owtodo"><span class="owchip ok">✅ Všetko v poriadku</span></div>`;
  return `<div class="owtodo">${AL.map(a=>`<button type="button" class="owchip ${a[0]}" data-owgo="${e(a[3])}"><span>${a[1]}</span>${a[2]}<i>›</i></button>`).join("")}</div>`}

// ---- 3. obchody ----
function dealsHTML(){const R=STATE.reqs||[],nNew=R.filter(r=>r.status==="nova").length,O=window.OPSDATA||[],run=O.filter(d=>["podpisany","odvoz"].includes(d.status));
  const left=run.reduce((s,d)=>s+(+d.left_t||0),0),wait=O.filter(d=>d.status==="navrh").length,T=(STATE.trips||[]).filter(t=>t.day===today()&&t.status!=="zrusena");
  const X=window.HUBX,TG=X&&Array.isArray(X.H.tg)?X.H.tg:[],tgA=TG.filter(t=>t.active),tgH=TG.filter(t=>t.hit_at&&Date.now()-new Date(t.hit_at)<7*DAY);
  const L=[];
  if(window.vQd)L.push(tile({i:"🤝",l:"Uzatvoriť obchod",v:"+",s:"odfotiť · nadiktovať · zmluva",go:"qd",c:"acc"}));
  L.push(tile({i:"📥",l:"Nové požiadavky",v:String(nNew),s:"od farmárov",go:"req",c:nNew?"w":""}));
  L.push(tile({i:"📄",l:"Bežiace obchody",v:String(run.length),s:wait?`${wait} čaká na podpis`:"podpísané · odvoz",go:"deals"}));
  L.push(tile({i:"🚚",l:"Zostáva vyviezť",v:F(left,0)+"<small> t</small>",s:`${run.filter(d=>+d.left_t>0).length} obchodov`,go:"deals"}));
  L.push(tile({i:"🗓️",l:"Odvozy dnes",v:String(T.length),s:T.length?"naplánované":"nič naplánované",go:"trans"}));
  L.push(tile({i:"🎯",l:"Cieľové ceny farmárov",v:String(tgA.length),s:tgH.length?`${tgH.length} dosiahnutých za 7 dní`:"čakajú na našu cenu",go:"#hs-tg"}));
  return `<div class="owg">${L.join("")}</div>`}

// ---- 4. zisky ERNTE ----
function profitHTML(){const X=window.HUBX,R=X&&X.H.risk,L=[];
  if(R===undefined||!X)L.push(tile({i:"💰",l:"Zisky ERNTE",v:"…",s:"načítavam",go:"#hs-risk"}));
  else if(!R||R.err||!Array.isArray(R.rows))L.push(tile({i:"💰",l:"Zisky ERNTE",v:"–",s:"zapne sa po aktualizácii databázy",go:"#hs-risk"}));
  else{const T={real:0,lock:0,pos:0,tk:0,bt:0};for(const x of R.rows){const pos=x.pos_t!=null?+x.pos_t:(+x.unsold_t||0);T.real+=+x.margin_real||0;T.lock+=+x.margin_locked||0;T.pos+=pos;T.tk+=+x.tickets_t||0;T.bt+=+x.tons||0}
    const risk=R.rows.reduce((s,x)=>s+Math.max(0,+x.pos_t||0),0)*10;
    L.push(tile({i:"💰",l:"Realizovaná marža",v:F(T.real,0)+"<small> €</small>",s:T.tk>0?`${F(T.real/T.tk,2)} €/t · ${F(T.tk,0)} t dodané`:"z vážnych lístkov",go:"#hs-risk",c:T.real>=0?"ok":"r"}));
    L.push(tile({i:"🔒",l:"Zamknutá marža",v:F(T.lock,0)+"<small> €</small>",s:"zo zmlúv s odberateľmi",go:"#hs-risk",c:"ok"}));
    L.push(tile({i:"⚖️",l:"Otvorená pozícia",v:(T.pos>0?"+":"")+F(T.pos,0)+"<small> t</small>",s:T.pos>0?"nakúpené, nepredané":T.pos<0?"predané naviac":"všetko kryté",go:"#hs-risk",c:T.pos>0?"w":T.pos<0?"r":""}));
    L.push(tile({i:"📉",l:"Ak burza klesne o 10 €",v:(risk?"−":"")+F(risk,0)+"<small> €</small>",s:"riziko otvorenej pozície",go:"#hs-risk",c:risk?"w":""}))}
  if(MAIN()&&window.ziskOpen)L.push(tile({i:"🔍",l:"Kde zarábame a strácame",v:"→",s:"komodity · odberatelia · farmári · úniky",go:"#zisk",c:"acc"}));
  if(window.vZuct)L.push(tile({i:"🧾",l:"Zúčtovanie",v:"→",s:"lístky · faktúry · PDF",go:"zuct"}));
  if(MAIN()&&STATE.me&&STATE.me.hlavny!==false)L.push(tile({i:"🔮",l:"Predikcia",v:"→",s:"kedy predať · trend",go:"pred",c:"acc"}));
  return `<div class="owg">${L.join("")}</div>`}

// ---- 5. komodity, služby, evidencia, burza ----
function navHTML(){const M=STATE.mkt,L=[];
  const nF=(STATE.farmers||[]).filter(f=>f.active).length;
  L.push(tile({i:"📈",l:"Burza",v:M&&M.repka&&M.repka.eur_t!=null?F(M.repka.eur_t,0)+"<small> €/t</small>":"→",s:"MATIF · CBOT · pri cenách",go:"price",glow:"rgba(124,92,255,.4)"}));
  L.push(tile({i:"💶",l:"Komodity · cenník",v:String((STATE.prices||[]).filter(p=>p.price!=null).length),s:"zverejnené komodity",go:"price"}));
  if(window.vCalc)L.push(tile({i:"🧮",l:"Kalkulačka",v:"→",s:"nákupná cena z predaja",go:"calc"}));
  if(window.vDanube)L.push(tile({i:"🌊",l:"Danube Trade",v:"→",s:"obchod Maďarsko",go:"danube"}));
  if(window.vAgro)L.push(tile({i:"🚜",l:"Agro služby",v:"→",s:"služby pre farmárov",go:"agro"}));
  if(window.vTrus){const n=window.trusNew?+trusNew()||0:0;L.push(tile({i:"🐔",l:"Kurací trus",v:n?String(n):"→",s:n?"nové objednávky":"Bio-Fer NATUR",go:"trus",c:n?"w":""}))}
  if(window.vEvid)L.push(tile({i:"📒",l:"Evidencia",v:"→",s:"evidencia · mzdy",go:"evid"}));
  L.push(tile({i:"👨‍🌾",l:"Farmári",v:String(nF),s:"aktívni",go:"farm"}));
  if(MAIN()&&window.vCal){const n=window.calOpenCount?+calOpenCount()||0:0;L.push(tile({i:"📅",l:"Kalendár",v:n?String(n):"→",s:n?"otvorené":"stretnutia · pripomienky",go:"cal"}))}
  if(window.vNovinky){const n=window.novCnt?+novCnt()||0:0;L.push(tile({i:"🆕",l:"Novinky",v:n?String(n):"→",s:"zmeny v aplikácii",go:"nov",c:n?"b":""}))}
  return `<div class="owg">${L.join("")}</div>`}

// ---- 6. podrobnosti ----
function detailsHTML(){const X=window.HUBX;let h="";
  if(X){try{h+=X.riskHTML().replace('id="hs-risk" open>','id="hs-risk">')}catch(x){}try{h+=X.tgHTML(Array.isArray(X.H.tg)?X.H.tg:[])}catch(x){}try{h+=X.dueHTML()}catch(x){}}
  if(window.opushParts){let l="",c="";try{l=opushParts.list()}catch(x){}try{c=opushParts.card()}catch(x){}h+=`<div id="ow-push" class="owpush">${l}${c}</div>`}
  return h}

window.owHome=function(){css();
  let h=`<div class="hub owh"><div class="owhd"><div><small>${e(new Date().toLocaleDateString("sk-SK",{weekday:"long",day:"numeric",month:"long"}))}</small><h2 class="hubt">Prehľad ERNTE · VALKO</h2></div><button type="button" class="hubr" data-hubre="1" aria-label="Obnoviť prehľad">↻</button></div>`;
  h+=sec("💶","Naše ceny · nákup a predaj","🔒 iba Martin a Jana",pricesHTML(),"ow-ceny");
  h+=sec("🔔","Čo riešiť","",todoHTML());
  h+=sec("🤝","Obchody","",dealsHTML());
  h+=sec("💰","Zisky ERNTE","🔒 iba Martin a Jana",profitHTML());
  h+=sec("🧭","Komodity · služby · evidencia","",navHTML());
  h+=`<section class="owsec owdet"><h3 class="owsh"><span>📋 Podrobnosti</span></h3>${detailsHTML()}</section>`;
  return h+`</div>`};

document.addEventListener("click",ev=>{const x=ev.target.closest&&ev.target.closest("[data-owgo]");if(!x||!ON())return;const g=x.dataset.owgo;ev.preventDefault();
  if(g.charAt(0)==="#"){const el=document.getElementById(g.slice(1));if(el){if(el.tagName==="DETAILS")el.open=true;el.scrollIntoView({behavior:"smooth",block:"start"})}return}
  TAB=g;renderStaff();try{scrollTo({top:0,behavior:"instant"})}catch(y){scrollTo(0,0)}});

// ---- vzhľad: sklo · diamant ----
function css(){if(document.getElementById("owh-css"))return;const s=document.createElement("style");s.id="owh-css";s.textContent=`
.owh{display:grid;gap:22px}
.owhd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.owhd small{color:var(--muted);font-size:.78rem;text-transform:capitalize}
.owsec{display:grid;gap:10px;min-width:0}
.owsh{display:flex;align-items:center;gap:10px;margin:0;font:700 .72rem/1.2 var(--f-ui);letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
.owsh>span{white-space:nowrap}
.owsh::after{content:"";flex:1;height:1px;min-width:12px;background:linear-gradient(90deg,var(--line2,rgba(255,255,255,.18)),transparent)}
.owsh em{order:2;font-style:normal;letter-spacing:0;text-transform:none;font-weight:600;font-size:.68rem;color:#c4b5fd;border:1px solid rgba(167,139,250,.38);background:rgba(124,92,255,.1);border-radius:999px;padding:2px 8px;white-space:nowrap}
.owsh::after{order:3}
.owg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.owt,.owp{position:relative;overflow:hidden;isolation:isolate;text-align:left;cursor:pointer;color:var(--ink);font:inherit;margin:0;
  border-radius:18px;padding:14px 14px 13px;display:grid;align-content:start;gap:3px;min-width:0;
  background:linear-gradient(160deg,rgba(255,255,255,.11),rgba(255,255,255,.025) 45%,rgba(255,255,255,.06)) padding-box,
    linear-gradient(135deg,rgba(255,255,255,.42),rgba(124,196,255,.16) 32%,rgba(255,255,255,.03) 58%,rgba(167,139,250,.32)) border-box;
  border:1px solid transparent;backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 16px 34px -20px rgba(0,0,0,.85);transition:transform .18s var(--ui-ease,ease),box-shadow .18s}
.owt::before,.owp::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;
  background:conic-gradient(from 200deg at 88% 0%,transparent 0 34deg,rgba(255,255,255,.10) 34deg 46deg,transparent 46deg 74deg,rgba(124,196,255,.09) 74deg 92deg,transparent 92deg 130deg,rgba(255,255,255,.05) 130deg 140deg,transparent 140deg)}
.owt::after,.owp::after{content:"";position:absolute;right:-34px;top:-34px;width:100px;height:100px;z-index:-1;border-radius:50%;pointer-events:none;background:radial-gradient(circle,var(--glow,rgba(124,196,255,.32)),transparent 66%)}
.owt:hover,.owp:hover{transform:translateY(-2px);box-shadow:inset 0 1px 0 rgba(255,255,255,.26),0 20px 40px -18px rgba(34,211,238,.35)}
.owt:active,.owp:active{transform:scale(.98)}
.owt:focus-visible,.owp:focus-visible,.owchip:focus-visible{outline:2px solid var(--cyan,#22d3ee);outline-offset:2px}
.owt{min-height:116px}
.owi{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;font-size:1.05rem;line-height:1;margin-bottom:5px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
.owl{font-size:.76rem;font-weight:600;opacity:.82;line-height:1.25}
.owv{font:700 1.5rem/1.1 var(--f-num);letter-spacing:-.035em;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owv small{font-size:.62em;font-weight:600;opacity:.7;letter-spacing:0}
.owt>small{font-size:.7rem;color:var(--muted);line-height:1.3}
.owt.w{--glow:rgba(255,207,90,.42)}.owt.w .owv{color:var(--warn,#ffcf5a)}
.owt.r{--glow:rgba(255,107,129,.45)}.owt.r .owv{color:var(--bad,#ff6b81)}
.owt.ok{--glow:rgba(182,255,59,.32)}.owt.ok .owv{color:var(--lime,#b6ff3b)}
.owt.b{--glow:rgba(34,211,238,.42)}.owt.b .owv{color:var(--cyan,#22d3ee)}
.owt.acc{--glow:rgba(124,92,255,.5)}.owt.acc .owi{background:linear-gradient(135deg,#7c5cff,#22d3ee);border-color:transparent}
/* cenové dlaždice */
.owpg{grid-template-columns:repeat(auto-fill,minmax(158px,1fr))}
.owp{--glow:color-mix(in srgb,var(--cc) 45%,transparent);gap:2px;padding:13px 13px 12px}
.owpn{display:flex;align-items:center;gap:8px;font-weight:650;font-size:.84rem;letter-spacing:-.01em;margin-bottom:6px;min-width:0}
.owpn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.owpn img,.owpn i{flex:none;width:26px;height:26px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px var(--cc),0 0 14px color-mix(in srgb,var(--cc) 60%,transparent)}
.owpn i{background:var(--cc)}
.owpk{font-size:.62rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.owpv{font:700 1.65rem/1.05 var(--f-num);letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.owpv small{font-size:.5em;font-weight:600;opacity:.65;letter-spacing:0}
.owps{display:grid;gap:0;margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.1);font-size:.76rem}
.owps b{font-variant-numeric:tabular-nums}
.owps small{font-size:.66rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owpf{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-top:6px;min-width:0}
.owpm{justify-self:start;font:700 .72rem var(--f-num);border-radius:8px;padding:3px 8px;background:rgba(255,255,255,.07);color:var(--muted)}
.owpm.ps{background:rgba(182,255,59,.14);color:var(--lime,#b6ff3b)}
.owpm.ng{background:rgba(255,107,129,.16);color:var(--bad,#ff6b81)}
.owpb{font-size:.62rem;font-weight:600;color:var(--muted);white-space:nowrap}
.owfoot{font-size:.72rem;color:var(--muted);line-height:1.45}
.owempty{font-size:.85rem;color:var(--muted)}
.owlink{font:inherit;color:var(--cyan,#22d3ee);background:none;border:0;padding:0;cursor:pointer;text-decoration:underline}
/* čo riešiť */
.owtodo{display:flex;flex-wrap:wrap;gap:8px}
.owchip{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:8px 12px;border-radius:999px;font:600 .8rem var(--f-ui);color:var(--ink);cursor:pointer;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);text-align:left}
.owchip i{font-style:normal;opacity:.6}
.owchip.w{border-color:rgba(255,207,90,.5);background:rgba(255,207,90,.1)}
.owchip.r{border-color:rgba(255,107,129,.55);background:rgba(255,107,129,.12)}
.owchip.b{border-color:rgba(34,211,238,.5);background:rgba(34,211,238,.1)}
.owchip.ok{cursor:default;border-color:rgba(182,255,59,.4);background:rgba(182,255,59,.08)}
.owdet{gap:12px}.owdet .hsec{margin:0}.owpush{display:grid;gap:10px}
@media (max-width:380px){.owg{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.owt,.owp{padding:12px 11px}.owv{font-size:1.3rem}.owpv{font-size:1.45rem}.owpb{display:none}}
@media (prefers-reduced-motion:reduce){.owt,.owp{transition:none}}
/* svetlý režim */
:root[data-theme="light"] .owt,:root[data-theme="light"] .owp{background:linear-gradient(160deg,rgba(255,255,255,.92),rgba(255,255,255,.62) 48%,rgba(240,246,255,.85)) padding-box,
  linear-gradient(135deg,rgba(255,255,255,1),rgba(124,160,255,.35) 32%,rgba(15,23,42,.06) 58%,rgba(124,92,255,.35)) border-box;box-shadow:inset 0 1px 0 #fff,0 14px 30px -20px rgba(30,41,90,.45)}
:root[data-theme="light"] .owt::before,:root[data-theme="light"] .owp::before{background:conic-gradient(from 200deg at 88% 0%,transparent 0 34deg,rgba(124,160,255,.12) 34deg 46deg,transparent 46deg 74deg,rgba(124,92,255,.08) 74deg 92deg,transparent 92deg)}
:root[data-theme="light"] .owt,:root[data-theme="light"] .owp,:root[data-theme="light"] .owchip{color:#0f172a}
:root[data-theme="light"] .owt>small,:root[data-theme="light"] .owps small,:root[data-theme="light"] .owpk,:root[data-theme="light"] .owpb,:root[data-theme="light"] .owfoot,:root[data-theme="light"] .owsh,:root[data-theme="light"] .owhd small{color:#475569}
:root[data-theme="light"] .owi{background:rgba(15,23,42,.05);border-color:rgba(15,23,42,.09)}
:root[data-theme="light"] .owps{border-top-color:rgba(15,23,42,.1)}
:root[data-theme="light"] .owpm{background:rgba(15,23,42,.06)}
:root[data-theme="light"] .owpm.ps{background:rgba(77,124,15,.12);color:#3f6212}
:root[data-theme="light"] .owpm.ng{background:rgba(190,18,60,.1);color:#be123c}
:root[data-theme="light"] .owt.ok .owv{color:#3f6212}:root[data-theme="light"] .owt.w .owv{color:#b45309}:root[data-theme="light"] .owt.r .owv{color:#be123c}:root[data-theme="light"] .owt.b .owv{color:#0e7490}
:root[data-theme="light"] .owsh em{color:#5b21b6;background:rgba(124,92,255,.08)}
:root[data-theme="light"] .owsh::after{background:linear-gradient(90deg,rgba(15,23,42,.15),transparent)}
:root[data-theme="light"] .owchip{background:rgba(255,255,255,.8);border-color:rgba(15,23,42,.12)}
:root[data-theme="light"] .owchip.w{background:#fff7e0;border-color:#f5c451}:root[data-theme="light"] .owchip.r{background:#ffe8ec;border-color:#f3a3b2}:root[data-theme="light"] .owchip.b{background:#e3f8fc;border-color:#8bd9e8}:root[data-theme="light"] .owchip.ok{background:#f0fbe0;border-color:#b7dc7a}
`;document.head.appendChild(s)}
})();

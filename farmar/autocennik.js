// ===== ERNTE · AUTOMATICKÝ CENNÍK (Agro-Somotor · Bunge) =====
// Výkupné ceny pre farmárov (FCA farma) sa počítajú samy rovnako ako v Kalkulačke (sekcia „Ceny odberateľov · DAP sklad“):
//   DAP odberateľa (burza MATIF/CBOT dodaná do sila, alebo cena farmárov v regióne + doprava) − doprava − odpočet ERNTE.
// Pre každú komoditu sa vyberie lepší odberateľ (Somotor alebo niektorý sklad Bunge) a cena sa zverejní do tabuľky prices.
// Viditeľnosť sa nemení: farmári vidia cenu ako doteraz (iba výslednú cenu FCA, nikdy odberateľa ani burzu),
// tím ako doteraz (price_view / price_edit). Odpočet (marža) a ceny odberateľov vidí iba majiteľ.
// Moje ceny: čo majiteľ (alebo cenník) prepíše v tabuľke cien, platí ako „moja cena“ do dátumu, potom sa vráti automatická.
// Každá zmena zverejnenej ceny sa zapíše do histórie a majiteľovi sa ukáže upozornenie. Raz za čas pripomenie zapísať vlastné ceny.
// Údaje: kalk_store pricelist/auto (nastavenie), pricelist/log (história), config/margins (odpočet – iba majiteľ zapisuje).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const R2=x=>Math.round(x*100)/100,f0=x=>x==null||!isFinite(x)?"–":Math.round(+x).toLocaleString("sk-SK"),f2=x=>x==null||!isFinite(x)?"–":(+x).toLocaleString("sk-SK",{maximumFractionDigits:2});
const T=()=>typeof today==="function"?today():new Date().toISOString().slice(0,10);
const addD=(d,n)=>{const x=new Date(d+"T12:00:00");x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
const dk=d=>{const m=String(d||"").match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${+m[3]}. ${+m[2]}.`:""};
const hm=t=>{const d=new Date(t);return d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})};
const staff=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER)&&typeof sb!=="undefined";
const OWN=()=>staff()&&ROLE==="owner";
const CAN=k=>OWN()||(typeof can==="function"&&can(k));
const ED=()=>staff()&&(OWN()||(CAN("price_edit")&&CAN("calc")));
const MKL=()=>typeof MK!=="undefined"?MK:[];
const nm=c=>(MKL().find(m=>m[0]===c)||[c,c])[1];

// ---- rovnaké údaje ako Kalkulačka (kalkulacka.html) ----
const PLANTS=[
  {id:"martfu",buyer:"bunge",name:"Bunge · Martfű",cs:["lo","ho","repka"],reg:null},
  {id:"tallya",buyer:"bunge",name:"Bunge · Tállya",cs:["lo","ho","repka"],reg:null},
  {id:"gyor",buyer:"bunge",name:"Bunge · Győr",cs:["lo","ho","repka"],reg:"wien"},
  {id:"bruck",buyer:"bunge",name:"Bunge · Bruck",cs:["lo","ho","repka"],reg:"wien"},
  {id:"somotor",buyer:"somotor",name:"Agro-Somotor",cs:["repka","soja","psenica","jacmen","kukurica"]}];
const ROUTES={martfu:{ke:[243,25,218],po:[283,65,218],chop:[250,0,245]},tallya:{ke:[74,25,49],po:[114,65,49],chop:[109,0,104]},gyor:{ke:[381,25,356],po:[421,65,356],chop:[423,0,415]},bruck:{ke:[438,400,0,38,0.2677],po:[443,405,0,38,0.2677],chop:[504,0,470,34]},somotor:{ke:[65,65,0],po:[100,100,0],chop:[63,8,50]}};
const ROUTE_T=25,ROUTE_EKM0=1.60,HU_TOLL_FT=192.38,SK_TOLL=0.1942,AT_TOLL=0.5724;
const C2M={lo:"lo",ho:"ho",repka:"repka",soja:"soja",psenica:"psenica_p",jacmen:"jacmen_k",kukurica:"kukurica"};
const PXS={repka:"repka",psenica_p:"psenica",kukurica:"kukurica",soja:"soja_usc_bu"}; // market_px – čerstvejšia burza (2× denne)
const AUTO_COMS=[...new Set(Object.values(C2M))];

const A={mk:null,px:null,mg:null,cfg:null,log:null,calc:{},pend:{},allow:{},lastRun:0,loadedAt:0,err:"",expired:[]};
const DEF={on:true,auto:null,mine:{},mineDays:7,remindDays:7,step:1,maxJump:10,lastMineAt:null,since:null};

async function kget(path,id){try{const r=await sb.from("kalk_store").select("data,updated_at").eq("path",path).eq("id",id).maybeSingle();return r.error?undefined:(r.data?r.data.data:null)}catch(x){return undefined}}
async function kset(path,id,data){try{const r=await sb.from("kalk_store").upsert({path,id,data},{onConflict:"path,id"});return !r.error}catch(x){return false}}
async function loadAll(force){if(!force&&Date.now()-A.loadedAt<4*60e3&&A.cfg)return;
  const [mf,ml,px,mg,cfg,log]=await Promise.all([
    fetch("market.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
    kget("market","latest"),
    sb.from("market_px").select("*").then(r=>r.error?null:r.data).catch(()=>null),
    kget("config","margins"),kget("pricelist","auto"),kget("pricelist","log")]);
  const t=v=>v&&v.updatedAt?Date.parse(v.updatedAt):0;A.mk=t(ml)>t(mf)?ml:(mf||ml||null);
  A.px=px?Object.fromEntries(px.map(x=>[x.sym,x])):null;A.mg=mg||null;
  A.cfg=Object.assign({},DEF,cfg||{});A.cfg.mine=A.cfg.mine||{};
  if(!A.cfg.auto){// prvé zapnutie: automaticky iba komodity, ktoré majú odberateľa a sú dnes v cenníku
    A.cfg.auto={};for(const c of AUTO_COMS){const p=(STATE.prices||[]).find(x=>x.com===c);A.cfg.auto[c]=!!(p&&p.price!=null)}}
  A.cfgSaved=!!cfg;A.log=(log&&log.items)||[];A.loadedAt=Date.now()}

// ---- výpočet (kópia logiky z Kalkulačky) ----
function origin(){let o=null;try{o=localStorage.getItem("ernte-dap-origin")}catch(x){}return o==="ke"||o==="po"?o:"avg"} // výjazd od farmárov (KE/PO), nie Čop
function ekm(){const f=A.mk&&A.mk.fuel;if(!f||!f.ref)return ROUTE_EKM0;const xs=[f.sk&&f.sk.netL,f.hu&&f.hu.netL].filter(Number.isFinite);if(!xs.length)return ROUTE_EKM0;const n=xs.reduce((a,b)=>a+b,0)/xs.length;return R2(f.ref.ekm+f.ref.cons*(n-f.ref.netL))}
function route(pid){const o=origin(),E=ekm(),huf=(A.mk&&A.mk.fx&&A.mk.fx.huf)||366.43,huR=HU_TOLL_FT/huf;
  let km,sk,hu,at,skR;if(o!=="avg"&&ROUTES[pid][o]){[km,sk,hu,at=0,skR=SK_TOLL]=ROUTES[pid][o]}
  else{const a=ROUTES[pid].ke,b=ROUTES[pid].po;km=(a[0]+b[0])/2;sk=(a[1]+b[1])/2;hu=(a[2]+b[2])/2;at=((a[3]||0)+(b[3]||0))/2;skR=a[4]||SK_TOLL}
  const toll=R2(2*(sk*skR+hu*huR+at*AT_TOLL)),run=R2(km*E*2);return {km,dop:R2((run+toll)/ROUTE_T)}}
function burza(pl,mc){const rows=(A.mk&&A.mk.rows)||[],lim=Date.now()-21*864e5;
  if(pl.reg){const rg=rows.find(r=>r.kind==="regburza"&&r.reg===pl.reg&&r.c===mc&&(!r.date||Date.parse(r.date)>=lim));if(rg)return rg}
  let r=rows.find(x=>x.kind==="burza"&&x.c===mc&&!/náhrada/.test(x.market))||null;
  const p=A.px&&PXS[mc]&&A.px[PXS[mc]];// čerstvejšia burza z market_px (najbližší kontrakt)
  if(p&&p.eur_t!=null&&p.updated_at){const d=String(p.quote_date||p.updated_at).slice(0,10);if(!r||!r.date||d>=r.date)r={kind:"burza",c:mc,market:p.name||(mc==="soja"?"CBOT sója":"MATIF"),term:p.contract||"",price:+p.eur_t,date:d}}
  return r}
const bzName=r=>r?(r.kind==="regburza"?"Börse Wien":/cbo?t|soja_usc/i.test(r.market)?"CBOT":"MATIF"):"";
function dap(pl,c,dop){if(!A.mk)return null;const mc=C2M[c],lim=Date.now()-60*864e5;
  const rows=(A.mk.rows||[]).filter(r=>r.c===mc&&r.kind!=="burza"&&r.kind!=="regburza"&&!/porovnanie/.test(r.market)&&(!r.date||Date.parse(r.date)>=lim));
  const hu=rows.filter(r=>!r.chop&&/^Maďarsko/.test(r.market)),sk=rows.filter(r=>!r.chop&&/^Slovensko/.test(r.market));
  const U=(pl.buyer==="bunge"?hu:sk.concat(hu)).map(r=>({v:R2(r.price+dop),d:r.date}));
  const bz=burza(pl,mc);
  if(!U.length)return bz?{dap:R2(bz.price),src:bzName(bz)+(bz.term?" "+bz.term:""),date:bz.date,bz}:null;
  const m=R2(U.reduce((s,a)=>s+a.v,0)/U.length),dmax=U.map(a=>a.d).sort().pop();
  return bz&&bz.price>=m?{dap:R2(bz.price),src:bzName(bz)+(bz.term?" "+bz.term:""),date:bz.date,bz}:{dap:m,src:"región + doprava",date:dmax,bz}}
function margin(){const c=A.cfg&&A.cfg.marginOwn;if(Number.isFinite(+c)&&c!==""&&c!=null)return +c;const r=A.mg&&+A.mg.rec;return Number.isFinite(r)?r:20}
function calc(){const out={},M=margin();
  for(const pl of PLANTS){const {dop}=route(pl.id);
    for(const c of pl.cs){const E=dap(pl,c,dop);if(!E||!Number.isFinite(E.dap))continue;const com=C2M[c];let fca=R2(E.dap-dop-M),cap=false;
      // bezpečnostný strop: nikdy nad burzou − doprava − odpočet (výkup nad burzou = strata)
      if(E.bz&&Number.isFinite(+E.bz.price)&&fca>R2(E.bz.price-dop-M)){fca=R2(E.bz.price-dop-M);cap=true}
      const age=E.date?(Date.now()-Date.parse(E.date))/864e5:99,ok=age<=(E.src.startsWith("región")?60:12);
      if(!out[com]||(ok&&!out[com].ok)||(ok===out[com].ok&&fca>out[com].fca))out[com]={fca,p:Math.floor(fca),dap:E.dap,dop,pl:pl.name,buyer:pl.buyer,src:E.src,date:E.date,ok,cap,bz:E.bz?+E.bz.price:null}}}
  return out}

// ---- zverejnenie ----
let running=false;
async function logAdd(items){if(!items.length)return;await loadAll();const L=(A.log||[]).concat(items).slice(-300);A.log=L;await kset("pricelist","log",{items:L})}
async function saveCfg(){A.cfg.since=A.cfg.since||new Date().toISOString();const ok=await kset("pricelist","auto",A.cfg);if(ok)A.cfgSaved=true;return ok}
async function run(force){if(!ED()||running)return;if(!force&&Date.now()-A.lastRun<5*60e3)return;running=true;A.err="";
  try{await loadAll(force);if(!A.cfgSaved&&OWN())await saveCfg();if(!A.cfg.on){A.lastRun=Date.now();return}
    if(!A.mk&&!A.px){A.err="Trhové ceny sa nenačítali – cenník zostal bez zmeny.";return}
    const C=calc();A.calc=C;const cur=Object.fromEntries((STATE.prices||[]).map(p=>[p.com,p.price==null?null:+p.price]));
    const t=T(),ch=[],pend={},exp=[];let dirty=false;
    for(const [com] of MKL()){const mine=A.cfg.mine[com];let tgt,src,pl="";
      if(mine&&(!mine.till||mine.till>=t)){tgt=+mine.price;src="mine"}
      else{if(mine){exp.push({com,price:mine.price,till:mine.till});delete A.cfg.mine[com];dirty=true}
        if(!A.cfg.auto[com])continue;const a=C[com];if(!a||!a.ok||!(a.p>0))continue;tgt=a.p;src="auto";pl=a.pl}
      const old=cur[com]??null;if(tgt==null||!isFinite(tgt))continue;
      if(old!=null&&Math.abs(tgt-old)<(+A.cfg.step||1))continue;
      if(src==="auto"&&old!=null&&old>0&&Math.abs(tgt-old)/old*100>(+A.cfg.maxJump||10)&&!A.allow[com]){pend[com]={old,tgt,pl};continue}
      ch.push({com,old,new:tgt,src,pl})}
    A.pend=pend;A.expired=exp;
    if(dirty&&!(await saveCfg()))A.cfg.mine=Object.assign({},A.cfg.mine);
    if(ch.length){const now=new Date().toISOString();
      const r=await sb.from("prices").upsert(ch.map(c=>({com:c.com,price:c.new,updated_at:now})));
      if(r.error){A.err="Zverejnenie zlyhalo: "+r.error.message;return}
      ch.forEach(c=>{const p=(STATE.prices||[]).find(x=>x.com===c.com);if(p){p.price=c.new;p.updated_at=now}else STATE.prices.push({com:c.com,price:c.new,updated_at:now});delete A.allow[c.com]});
      const by=(typeof ME!=="undefined"&&ME&&ME.staffName)||"";
      await logAdd(ch.map(c=>({at:now,com:c.com,old:c.old,new:c.new,src:c.src,pl:c.pl,by:c.src==="auto"?"automaticky":by})))}
    // cenník je pri automatike stále platný (farmári nevidia „cenník vypršal“)
    const pv=((STATE.settings||{}).pricelist)||{};if(!pv.valid||pv.valid<addD(t,3)){const v={...pv,valid:addD(t,7),by:"ERNTE",at:new Date().toISOString()};
      const s=await sb.from("settings").upsert({key:"pricelist",value:v});if(!s.error){STATE.settings=STATE.settings||{};STATE.settings.pricelist=v}}
    A.lastRun=Date.now();A.lastCh=ch.length;
    if(ch.length||exp.length){notifyNew();if(typeof toast==="function"&&ch.length)toast(`🤖 Cenník aktualizovaný: ${ch.map(c=>nm(c.com)+" "+f0(c.new)).join(", ")} €/t`,6000)}
  }catch(x){A.err=String(x&&x.message||x)}finally{running=false;rerender()}}
function rerender(){if(typeof renderStaff!=="function"||typeof TAB==="undefined")return;if(window.formBusy&&formBusy())return;if(TAB==="price"&&(A.lastCh||!document.querySelector(".acn-card")))renderStaff();else inject()}

// ---- moje ceny: čo sa prepíše v tabuľke cien (Uložiť a zverejniť), platí ako moja cena ----
document.addEventListener("submit",async ev=>{const f=ev.target;if(!f||f.id!=="fPrice"||!ED()||!A.cfg||!A.cfg.on)return;
  const fd=new FormData(f),cur=Object.fromEntries((STATE.prices||[]).map(p=>[p.com,p.price==null?null:+p.price])),t=T(),now=new Date().toISOString(),by=(typeof ME!=="undefined"&&ME&&ME.staffName)||"";
  const till=(f.querySelector("[name=ac_till]")||{}).value||addD(t,+A.cfg.mineDays||7);const L=[];
  for(const [com] of MKL()){const raw=fd.get("p_"+com);const v=typeof num==="function"?num(raw):parseFloat(String(raw).replace(",","."));const nv=Number.isFinite(v)?Math.round(v*100)/100:null,old=cur[com]??null;
    if(nv===old||(nv!=null&&old!=null&&Math.abs(nv-old)<0.005))continue;
    if(nv==null){A.cfg.auto[com]=false;delete A.cfg.mine[com]}else A.cfg.mine[com]={price:nv,till,at:now,by};
    L.push({at:now,com,old,new:nv,src:"mine",by,till:nv==null?"":till})}
  if(!L.length)return;A.cfg.lastMineAt=now;const ok=await saveCfg();
  if(!ok&&typeof toast==="function")toast("Ceny sú zverejnené, ale automatika ich môže prepísať – nemáš prístup k nastaveniu automatického cenníka.",7000);
  await logAdd(L);notifyNew()},true);

// ---- upozornenia majiteľovi: každá zmena zverejnenej ceny + pripomienka mojich cien ----
const SEEN="ernte-acn-seen",SNZ="ernte-acn-remind";
const gs=k=>{try{return localStorage.getItem(k)||""}catch(x){return ""}},ss=(k,v)=>{try{localStorage.setItem(k,v)}catch(x){}};
function unseen(){const s=gs(SEEN);return (A.log||[]).filter(x=>x.at>s)}
function notifyNew(){if(!OWN())return;const U=unseen();if(!U.length)return;
  try{if(document.hidden&&"Notification" in window&&Notification.permission==="granted")new Notification("ERNTE · cenník sa zmenil",{body:U.slice(-6).map(x=>`${nm(x.com)}: ${x.old==null?"–":f0(x.old)} → ${x.new==null?"skryté":f0(x.new)} €/t`).join("\n"),icon:"icon-192.png",tag:"ernte-cennik"})}catch(x){}
  try{navigator.vibrate&&navigator.vibrate([90,60,90])}catch(x){}inject()}
const srcL=x=>x.src==="auto"?`🤖 automaticky${x.pl?" · "+e(x.pl):""}`:x.src==="mine"?`✍️ ${e(x.by||"ručne")}${x.till?" · platí do "+dk(x.till):""}`:e(x.by||"");
function bannerHTML(){if(!OWN()||!A.cfg)return "";let h="";const U=unseen();
  if(U.length){const last={};U.forEach(x=>last[x.com]=Object.assign({},x,{old:last[x.com]?last[x.com].old:x.old}));const L=Object.values(last);
    h+=`<div class="acn-b" role="alert"><div class="acn-bh"><span aria-hidden="true">💶</span><b>Zmena v zverejnenom cenníku${L.length>1?" ("+L.length+")":""}</b></div><ul>${L.map(x=>`<li><b>${e(nm(x.com))}</b> ${x.old==null?"–":f0(x.old)} → <b>${x.new==null?"skryté":f0(x.new)+" €/t"}</b> <small>${x.new!=null&&x.old!=null?(x.new>x.old?"▲ +":"▼ −")+f0(Math.abs(x.new-x.old))+" · ":""}${srcL(x)} · ${hm(x.at)}</small></li>`).join("")}</ul>
    <div class="btns"><button type="button" class="pri" data-acn="seen">✓ Videl som</button>${typeof TAB!=="undefined"&&TAB!=="price"?`<button type="button" data-acn="open">Otvoriť cenník</button>`:""}</div></div>`}
  const P=Object.entries(A.pend||{});if(P.length)h+=`<div class="acn-b warn" role="alert"><div class="acn-bh"><span aria-hidden="true">⚠️</span><b>Veľká zmena ceny čaká na tvoje potvrdenie</b></div><ul>${P.map(([c,x])=>`<li><b>${e(nm(c))}</b> ${f0(x.old)} → <b>${f0(x.tgt)} €/t</b> <small>${x.tgt>x.old?"▲":"▼"} ${f0(Math.abs(x.tgt-x.old))} €/t (${f0(Math.abs(x.tgt-x.old)/x.old*100)} %) · ${e(x.pl)}</small> <button type="button" data-acn="allow:${e(c)}">Zverejniť</button></li>`).join("")}</ul><div class="s">Automatika zmenu nad ${f0(A.cfg.maxJump)} % sama nezverejní. Ak ju nechceš, prepíš cenu v cenníku (platí ako tvoja).</div></div>`;
  if((A.expired||[]).length)h+=`<div class="acn-b"><div class="acn-bh"><span aria-hidden="true">⏰</span><b>Tvoja cena vypršala – späť na automatickú</b></div><ul>${A.expired.map(x=>`<li><b>${e(nm(x.com))}</b> ${f0(x.price)} €/t platila do ${dk(x.till)}${A.cfg.auto[x.com]?"":" · komodita nemá automatickú cenu, cena zostala"}</li>`).join("")}</ul><div class="btns"><button type="button" data-acn="expok">OK</button></div></div>`;
  // pripomienka: zapíš svoje ceny (raz za X dní)
  const rd=+A.cfg.remindDays||0,lm=Date.parse(A.cfg.lastMineAt||A.cfg.since||"")||0,snz=+gs(SNZ)||0;
  if(A.cfg.on&&rd>0&&A.cfgSaved&&Date.now()-lm>rd*864e5&&Date.now()>snz)h+=`<div class="acn-b rem" role="status"><div class="acn-bh"><span aria-hidden="true">📝</span><b>Máš nové ceny od Somotora alebo Bunge?</b></div><div class="s">${lm?"Svoje ceny si naposledy zapísal "+dk(new Date(lm).toISOString())+". ":""}Zapíš ich do cenníka – zverejnia sa hneď a platia ${f0(A.cfg.mineDays)} dní, potom sa cena vráti na automatickú.</div>
    <div class="btns"><button type="button" class="pri" data-acn="write">✍️ Zapísať moje ceny</button><button type="button" data-acn="snooze">Pripomenúť zajtra</button><button type="button" data-acn="none">Nemám nové</button></div></div>`;
  return h?`<div class="acn-wrap">${h}</div>`:""}

// ---- karta v záložke Cenník ----
function cardHTML(){if(!ED())return "";if(!A.cfg)return `<div class="card acn-card"><div class="tdh"><b>🤖 Automatický cenník · Somotor a Bunge</b><small>načítavam…</small></div></div>`;
  const C=A.calc||{},own=OWN(),cur=Object.fromEntries((STATE.prices||[]).map(p=>[p.com,p.price==null?null:+p.price])),t=T();
  const rows=MKL().map(([c,n])=>{const a=C[c],mine=A.cfg.mine[c],mv=mine&&(!mine.till||mine.till>=t),au=!!A.cfg.auto[c],has=AUTO_COMS.includes(c);
    const st=mv?`<span class="acn-m">✍️ moja do <input type="date" data-acntill="${e(c)}" value="${e(mine.till||"")}" aria-label="Moja cena ${e(n)} platí do"></span><button type="button" class="acn-x" data-acn="back:${e(c)}">↩ auto</button>`
      :has?`<label class="acn-sw"><input type="checkbox" data-acnauto="${e(c)}"${au?" checked":""}> 🤖 automaticky</label>`:`<span class="acn-n">bez odberateľa – iba tvoja cena</span>`;
    const av=a?`<b>${f0(a.p)}</b>${a.ok?"":` <em class="acn-old" title="Trhová cena je stará – nezverejňuje sa">staré dáta</em>`}`:"<b>–</b>";
    const dt=a?`${e(a.pl)} · ${e(a.src)}${a.date?" · "+dk(a.date):""}${own?` · DAP ${f2(a.dap)} − doprava ${f2(a.dop)} − odpočet ${f2(margin())}${a.cap?` · obmedzené burzou ${f2(a.bz)} (nikdy nad burzou)`:""}`:""}`:(has?"bez trhových dát":"");
    return `<div class="acn-r${mv?" mine":au&&has?" on":""}"><div class="acn-rh"><b class="n">${e(n)}</b><span class="v"><small>zverejnené</small>${cur[c]==null?"<b class='no'>–</b>":"<b>"+f0(cur[c])+"</b>"}</span><span class="v a"><small>automatická</small>${av}</span></div>${dt?`<div class="acn-rd">${dt}</div>`:""}<div class="acn-rm">${st}</div></div>`}).join("");
  const L=(A.log||[]).slice(-40).reverse();
  return `<div class="card acn-card"><div class="tdh"><b>🤖 Automatický cenník · Somotor a Bunge</b><label class="acn-sw big"><input type="checkbox" data-acnon${A.cfg.on?" checked":""}${own?"":" disabled"}> ${A.cfg.on?"zapnutý":"vypnutý"}</label></div>
   <div class="s">Ceny pre farmárov (FCA farma, bez DPH) sa počítajú samy z cien odberateľov <b>Agro-Somotor</b> a <b>Bunge</b> (burza alebo región + doprava) mínus doprava${own?" a tvoj odpočet":""} – pre každú komoditu z lepšieho odberateľa – a hneď sa zverejnia. Zaokrúhľuje sa nadol na celé € a nikdy nie nad burzu (MATIF/CBOT) mínus doprava${own?" a odpočet":""}.
   Kto čo vidí, sa nemení: farmári vidia iba výslednú cenu ako doteraz, nikdy odberateľa ani burzu. <b>Tvoje ceny</b> zapíš v tabuľke nižšie – majú prednosť do dátumu, potom sa vráti automatická.</div>
   <div class="acn-rows">${rows}</div>
   ${own?`<div class="acn-cfg"><label>Odpočet ERNTE €/t<input data-acncfg="marginOwn" inputmode="decimal" value="${e(A.cfg.marginOwn??"")}" placeholder="${e(f2(A.mg&&A.mg.rec!=null?A.mg.rec:20))}"><small>${A.mg&&A.mg.rec!=null?"prázdne = z Kalkulačky ("+f2(A.mg.rec)+")":"prázdne = 20 €/t"}</small></label>
     <label>Moja cena platí dní<input data-acncfg="mineDays" inputmode="numeric" value="${e(A.cfg.mineDays)}"></label>
     <label>Pripomenúť moje ceny každých dní<input data-acncfg="remindDays" inputmode="numeric" value="${e(A.cfg.remindDays)}"><small>0 = nepripomínať</small></label>
     <label>Bez potvrdenia najviac %<input data-acncfg="maxJump" inputmode="decimal" value="${e(A.cfg.maxJump)}"><small>väčšiu zmenu najprv potvrdíš</small></label></div>`:""}
   <div class="acn-st">${A.err?`<b class="bad">${e(A.err)}</b> · `:""}${A.lastRun?"Skontrolované "+hm(A.lastRun)+(A.lastCh?" · zmenené "+A.lastCh:" · bez zmeny"):"Ešte neprebehlo"} · automaticky každých 20 min, keď je aplikácia otvorená${A.mk&&A.mk.updatedAt?" · trh "+hm(A.mk.updatedAt):""}</div>
   <div class="btns"><button type="button" class="pri" data-acn="run">↻ Prepočítať a zverejniť teraz</button></div>
   ${L.length?`<details class="acn-h"><summary>📜 História zmien cien (${(A.log||[]).length})</summary><ul>${L.map(x=>`<li><span>${hm(x.at)}</span> <b>${e(nm(x.com))}</b> ${x.old==null?"–":f0(x.old)} → <b>${x.new==null?"skryté":f0(x.new)}</b> <small>${srcL(x)}</small></li>`).join("")}</ul></details>`:""}</div>`}
function css(){if(document.getElementById("acnCss"))return;const s=document.createElement("style");s.id="acnCss";s.textContent=`
.acn-wrap{display:grid;gap:10px;margin:8px 0 12px}.acn-b{border-radius:20px;padding:12px 14px;border:1px solid rgba(182,255,59,.5);background:linear-gradient(135deg,rgba(28,48,30,.95),rgba(14,22,30,.95));color:#F3F1EA;box-shadow:0 10px 30px rgba(0,0,0,.3);animation:acnIn .4s ease}
.acn-b.warn{border-color:#FFC457;background:linear-gradient(135deg,rgba(60,44,12,.95),rgba(20,18,14,.95))}.acn-b.rem{border-color:rgba(130,190,255,.6);background:linear-gradient(135deg,rgba(16,34,58,.95),rgba(14,22,30,.95))}
.acn-bh{display:flex;gap:10px;align-items:center;font-size:1.02rem}.acn-bh span{font-size:1.5rem}.acn-b ul{margin:8px 0 4px;padding-left:18px;display:grid;gap:4px}.acn-b li small{opacity:.78}.acn-b li button{min-height:32px;padding:0 12px;margin-left:6px}
.acn-b .s{opacity:.85;font-size:.86rem;margin:6px 0}html[data-theme=light] .acn-b{background:#fff;color:#0f172a}
.acn-rows{display:grid;gap:8px;margin:12px 0}.acn-r{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.03)}
.acn-r.on{border-color:rgba(182,255,59,.35)}.acn-r.mine{border-color:rgba(255,196,87,.55)}.acn-rh{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:end}
.acn-rh .n{font-size:.95rem}.acn-r.on .n{color:#B6FF3B}.acn-r.mine .n{color:#FFC457}.acn-rh .v{display:grid;justify-items:end;line-height:1.1}.acn-rh .v small{font-size:.66rem;opacity:.6}.acn-rh .v b{font-size:1.15rem}.acn-rh .v b.no{opacity:.4}.acn-rh .v.a b{opacity:.85}
.acn-rd{font-size:.74rem;opacity:.65;margin-top:4px;line-height:1.35}.acn-rm{margin-top:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}html[data-theme=light] .acn-r.on .n{color:#4d7c00}html[data-theme=light] .acn-r.mine .n{color:#b26b00}.acn-old{color:#FFC457;font-style:normal;font-size:.72rem}.acn-sw{display:inline-flex;gap:6px;align-items:center;white-space:nowrap;font-size:.82rem}.acn-sw input{width:auto;min-height:0}
.acn-sw.big{font-size:.86rem;font-weight:600}.acn-m{display:inline-flex;gap:4px;align-items:center;white-space:nowrap;font-size:.8rem}.acn-m input{width:auto;min-height:32px;padding:2px 6px;font-size:.8rem}.acn-x{min-height:30px;padding:0 10px;font-size:.78rem;margin-top:4px}.acn-n{font-size:.76rem;opacity:.65}
.acn-cfg{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:6px 0 10px}.acn-cfg small{display:block;opacity:.65;font-size:.72rem}
.acn-st{font-size:.78rem;opacity:.75;margin:6px 0}.acn-st .bad{color:#ff7b7b}.acn-h ul{list-style:none;padding:0;margin:8px 0;display:grid;gap:4px;font-size:.82rem}.acn-h li span{opacity:.6;font-size:.76rem}.acn-h li small{opacity:.7}
@keyframes acnIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.acn-b{animation:none}}`;document.head.appendChild(s)}
function inject(){const app=document.getElementById("app");if(!app||!staff())return;css();
  app.querySelectorAll(".acn-wrap,.acn-card").forEach(x=>x.remove());
  if(typeof TAB==="undefined")return;
  if(OWN()&&(TAB==="home"||TAB==="price")){const b=bannerHTML();if(b){const d=document.createElement("div");d.innerHTML=b;const a=app.querySelector("nav.tabs:not(.trtabs)")||app.querySelector(".hero");if(a)a.after(d.firstChild);else app.prepend(d.firstChild)}}
  if(TAB==="price"&&ED()){const f=app.querySelector("#fPrice");if(f){const d=document.createElement("div");d.innerHTML=cardHTML();f.before(d.firstChild);
    if(A.cfg&&A.cfg.on&&!f.querySelector("[name=ac_till]")){const btn=f.querySelector(".btns");const l=document.createElement("label");l.className="w acn-tl";
      l.innerHTML=`Zmenené ceny platia ako tvoje do<input name="ac_till" type="date" value="${e(addD(T(),+A.cfg.mineDays||7))}"><small>Potom sa komodity s 🤖 vrátia na automatickú cenu. Vymazaná cena = komodita sa nezverejní a automatika sa pre ňu vypne.</small>`;if(btn)btn.before(l)}}}}
function wrap(){const o=window.renderStaff;if(typeof o!=="function"||o.__acn)return;const w=function(){const r=o.apply(this,arguments);try{inject()}catch(x){}return r};w.__acn=1;Object.keys(o).forEach(k=>{try{w[k]=o[k]}catch(x){}});window.renderStaff=w;try{inject()}catch(x){}}
const tk=setInterval(wrap,500);setTimeout(()=>clearInterval(tk),60000);wrap();

// ---- ovládanie ----
document.addEventListener("click",async ev=>{const b=ev.target.closest&&ev.target.closest("[data-acn]");if(!b)return;ev.preventDefault();const k=b.dataset.acn;
  if(k==="seen"){const L=A.log||[];ss(SEEN,L.length?L[L.length-1].at:new Date().toISOString());inject();return}
  if(k==="open"){try{TAB="price"}catch(x){}renderStaff();scrollTo(0,0);return}
  if(k==="expok"){A.expired=[];inject();return}
  if(k==="snooze"){const d=new Date();d.setDate(d.getDate()+1);d.setHours(7,0,0,0);ss(SNZ,String(d.getTime()));inject();return}
  if(k==="none"){A.cfg.lastMineAt=new Date().toISOString();await saveCfg();inject();return}
  if(k==="write"){try{TAB="price"}catch(x){}renderStaff();setTimeout(()=>{const f=document.getElementById("fPrice");if(f){f.scrollIntoView({behavior:"smooth",block:"start"});const i=f.querySelector("input");i&&i.focus({preventScroll:true})}},120);return}
  if(k==="run"){if(typeof busy==="function")busy(b,true);await run(true);if(typeof toast==="function"&&!A.err&&!A.lastCh)toast("Cenník je aktuálny – nič sa nezmenilo.");return}
  if(k.startsWith("allow:")){A.allow[k.slice(6)]=1;await run(true);return}
  if(k.startsWith("back:")){const c=k.slice(5);delete A.cfg.mine[c];A.cfg.auto[c]=true;await saveCfg();await run(true);return}},true);
document.addEventListener("change",async ev=>{const t=ev.target;if(!t||!A.cfg)return;
  if(t.matches("[data-acnon]")){if(!OWN())return;A.cfg.on=t.checked;await saveCfg();if(t.checked)await run(true);else rerender();return}
  if(t.matches("[data-acnauto]")){const c=t.dataset.acnauto;A.cfg.auto[c]=t.checked;await saveCfg();if(t.checked)await run(true);else rerender();return}
  if(t.matches("[data-acntill]")){const c=t.dataset.acntill;if(A.cfg.mine[c]){A.cfg.mine[c].till=t.value||addD(T(),+A.cfg.mineDays||7);await saveCfg();await run(true)}return}
  if(t.matches("[data-acncfg]")&&OWN()){const k=t.dataset.acncfg,v=typeof num==="function"?num(t.value):parseFloat(t.value);
    if(k==="marginOwn")A.cfg.marginOwn=t.value.trim()===""||!Number.isFinite(v)?null:v;else if(Number.isFinite(v)&&v>=0)A.cfg[k]=v;
    await saveCfg();if(typeof toast==="function")toast("Uložené.");await run(true)}},true);

// ---- štart: majiteľ a ľudia s cenníkom + kalkulačkou; kontrola každých 20 min a pri návrate do aplikácie ----
let started=false;
function start(){if(started||!ED())return;started=true;setTimeout(()=>run(true),3500);setInterval(()=>{if(!document.hidden)run()},20*60e3);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)run()});
  if(OWN())setInterval(async()=>{if(document.hidden&&!("Notification" in window&&Notification.permission==="granted"))return;
    const n=(A.log||[]).length,l=await kget("pricelist","log");if(l&&l.items&&l.items.length!==n){A.log=l.items;notifyNew()}},2*60e3)}
const sw=setInterval(()=>{if(ED()&&typeof STATE!=="undefined"&&STATE.prices){clearInterval(sw);start()}},1500);setTimeout(()=>clearInterval(sw),20*60e3);
window.autoCennik={run,calc:()=>{return calc()},state:A};
})();

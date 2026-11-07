// ===== 🏆 KDE PREDAŤ S NAJVYŠŠÍM ZISKOM (iba majiteľ) =====
// Ku každej našej zverejnenej nákupnej cene: všetci odberatelia (ponuky odberateľov, ponuky konkurencie, skutočné predaje z vážnych lístkov),
// cena posunutá podľa burzy (ak odberateľ ráta z burzy), mínus doprava z regiónu farmárov (rovnaký výpočet ako Kalkulačka) → zisk €/t.
// Mená odberateľov, modely a ponuky sú iba v databáze (sell_buyers, sell_offers – vidí iba majiteľ).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// PRÍKAZ MAJITEĽA (30. 10.): možnosti predaja (Kde predať, pri cenách) vidí iba Martin (MAIN_OK)
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS&&typeof window.MAIN_OK==="function"&&window.MAIN_OK();
const f0=n=>n==null||!isFinite(n)?"–":Math.round(n).toLocaleString("sk-SK");
const sg=n=>(n>=0?"+":"−")+f0(Math.abs(n));
const dk=d=>/^\d{4}-\d\d-\d\d/.test(d||"")?(+d.slice(8,10))+". "+(+d.slice(5,7))+".":"";
const nm=c=>{try{const m=(typeof MK!=="undefined"?MK:[]).find(x=>x[0]===c);if(m)return m[1]}catch(x){}return c};
const age=d=>d?Math.floor((Date.now()-Date.parse(String(d).slice(0,10)+"T12:00:00"))/864e5):999;
const MAXAGE=21;
const D={B:null,O:[],K:[],T:[],mk:null,at:0,busy:false,err:"",form:false};
// burza pre komoditu (posun ponuky): repka, slnečnica → MATIF repka; obilniny → MATIF pšenica; kukurica → MATIF kukurica; sója → CBOT
const BZ={repka:"repka",lo:"repka",ho:"repka",psenica_p:"psenica_p",psenica_k:"psenica_p",jacmen_k:"psenica_p",jacmen_s:"psenica_p",kukurica:"kukurica",soja:"soja"};
// posun s burzou: iba keď odberateľ ráta z burzy; float_coms = len tieto komodity (prázdne = všetky)
const FL=(b,c)=>!!(b&&b.float_burza)&&(!Array.isArray(b.float_coms)||!b.float_coms.length||b.float_coms.includes(c));
const MON={jan:0,feb:1,mar:2,apr:3,maj:4,máj:4,may:4,jun:5,jún:5,jul:6,júl:6,aug:7,sep:8,okt:9,oct:9,nov:10,dec:11};
function bzNow(sym){const R=((D.mk&&D.mk.rows)||[]).filter(r=>r.kind==="burza"&&r.c===sym&&!/náhrada|cbo?t pšen|cbot kuku/i.test(r.market||"")&&(sym==="soja"||/euronext|matif/i.test(r.market||"")));
  if(!R.length)return null;const lim=Date.now()+20*864e5;
  const t=r=>{const m=String(r.term||"").toLowerCase().match(/([a-zá-ž]+)\s*(\d{4})/);return m&&MON[m[1].slice(0,3)]!=null?new Date(+m[2],MON[m[1].slice(0,3)],15).getTime():null};
  const ok=R.filter(r=>t(r)&&t(r)>=lim).sort((a,b)=>t(a)-t(b));const r=ok[0]||R.sort((a,b)=>(t(b)||0)-(t(a)||0))[0];return r?{v:+r.price,n:(sym==="soja"?"CBOT":"MATIF")+" "+(r.term||""),d:r.date}:null}
// doprava €/t z regiónu farmárov (priemer Košice / Prešov), 25 t, prázdny návrat – ako Kalkulačka
function dop(site){if(!site||!site.ke)return null;const f=D.mk&&D.mk.fuel,huf=(D.mk&&D.mk.fx&&D.mk.fx.huf)||366.9;let ekm=1.6;
  if(f&&f.ref){const xs=[f.sk&&f.sk.netL,f.hu&&f.hu.netL].filter(Number.isFinite);if(xs.length)ekm=f.ref.ekm+f.ref.cons*(xs.reduce((a,b)=>a+b,0)/xs.length-f.ref.netL)}
  const one=a=>{const [km,sk,hu,at]=a;return (km*ekm*2+2*((sk||0)*0.1942+(hu||0)*192.38/huf+(at||0)*0.5724))/25};
  return Math.round(((one(site.ke)+one(site.po||site.ke))/2)*10)/10}
const siteOf=(b,txt)=>{const S=(b&&b.sites)||[];if(!S.length)return null;if(txt){const s=S.find(x=>x.rx&&new RegExp(x.rx,"i").test(txt));if(s)return s}return S.length===1?S[0]:null};
const buyerOf=who=>(D.B||[]).find(b=>b.rx&&new RegExp(b.rx,"i").test(who||""));

async function load(){if(!OWN()||D.busy)return;D.busy=true;D.err="";
  try{const [s,mk,k,t]=await Promise.all([sb.rpc("sell_data"),fetch("market.json",{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null),
      sb.from("kalk_store").select("data").eq("path","pricelist").eq("id","konk").maybeSingle(),
      sb.rpc("buyer_tickets",{d0:new Date(Date.now()-45*864e5).toISOString().slice(0,10),d1:null}).then(x=>x,()=>({data:[]}))]);
    if(s.error){D.err=/sell_data/.test(s.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":s.error.message;D.B=[]}else{D.B=s.data.buyers||[];D.O=s.data.offers||[]}
    D.mk=mk;D.K=(k&&k.data&&k.data.data&&k.data.data.items)||[];D.T=(t&&!t.error&&t.data)||[]}
  catch(x){D.err=String(x&&x.message||x);D.B=D.B||[]}
  D.at=Date.now();D.busy=false;try{if(D.B&&D.B.length)await caps()}catch(x){}if(typeof TAB!=="undefined"&&(TAB==="home"||TAB==="pred"||TAB==="price")&&typeof renderStaff==="function")renderStaff()}
// načítanie po uložení / zmazaní – počká na prebiehajúce načítanie (inak by sa nové údaje neukázali bez F5)
async function reload(){for(let i=0;i<60&&D.busy;i++)await new Promise(r=>setTimeout(r,250));D.at=0;await load();try{window.dispatchEvent(new Event("ernte-odb-changed"))}catch(x){}}

// všetky možnosti predaja pre komoditu
function options(com,buy){const out=[],B=D.B||[];
  const push=(b,siteName,site,del,price,d,src,extra)=>{const bz=extra&&extra.bz;const d0=del==="FCA"||del==="EXW"?0:dop(site);const net=d0==null?null:price-d0;
    out.push({b,siteName:siteName||(site&&site.n)||"",del,price,d,src,dop:d0,net,profit:net==null?null:net-buy,bz,age:age(d),term:extra&&extra.term||""})};
  // 1) ponuky odberateľov (posunuté s burzou, ak odberateľ ráta z burzy)
  const seen=new Set();
  for(const o of D.O){if(o.com!==com||FWD(o.period))continue;const k=o.buyer+"|"+(o.site||"")+"|"+o.del;if(seen.has(k))continue;seen.add(k);const b=B.find(x=>x.id===o.buyer);if(!b)continue;
    let p=+o.price,bz=null;if(FL(b,com)&&o.bz_val!=null){const n=bzNow(o.bz_sym||BZ[com]);if(n){bz={d:n.v-(+o.bz_val),n:n.n};p+=bz.d}}
    push(b,o.site,siteOf(b,o.site)||((b.sites||[]).find(s=>s.n===o.site)),o.del,p,o.d,"ponuka odberateľa",{bz,term:o.period})}
  // 2) ponuky konkurencie (ich výkupná cena = za toľko by kúpili od nás); bez ponúk na neskorší odber (3. 11.: LO FCA 512 = odber 1.–3. 2027, nie dnešný predaj)
  const KK=D.K.filter(x=>x.com===com&&!x.sell&&+x.price>0&&age(x.d)<=MAXAGE&&!/nad\s*500/i.test(x.term||"")&&!/odber\s*[0-9]/i.test(x.term||"")&&!/hamburg|z[aá]pad/i.test((x.who||"")+" "+(x.place||""))).sort((a,b)=>String(b.d||"").localeCompare(String(a.d||""))||String(b.at||"").localeCompare(String(a.at||"")));
  for(const x of KK){const b=buyerOf(x.who);if(!b)continue;const del=String(x.del||"").toUpperCase()||"DAP",fca=del==="FCA"||del==="EXW",site=fca?{n:"FCA farma"}:siteOf(b,(x.place||"")+" "+(x.term||"")+" "+(x.who||""));
    const k=b.id+"|"+(site&&site.n||"")+"|"+del+"|"+(x.term||"");if(seen.has(k))continue;seen.add(k);
    let p=+x.price,bz=null;if(FL(b,com)&&x.b!=null){const n=bzNow(BZ[com]);if(n){const np=n.v+(+x.b);bz={d:np-p,n:n.n};p=np}}
    push(b,site&&site.n,site,del,p,x.d,"ponuka (Konkurenčné ceny)",{bz,term:/odber\s*[0-9]/i.test(x.term||"")?x.term:""})}
  // 3) skutočné predaje z vážnych lístkov (Zúčtovanie odberateľa)
  const last={};for(const t of D.T){if(t.k!==com||!(+t.s>0))continue;const bn=t.b||"Odberateľ";if(!last[bn]||String(t.d)>String(last[bn].d))last[bn]=t}
  for(const bn in last){const t=last[bn],b=buyerOf(bn)||{id:"t:"+bn,name:bn,sites:[]},site=(b.sites||[])[0]||null,fca=String(b.parita||"").toUpperCase()==="FCA";push(b,fca?"FCA farma":site&&site.n,fca?{n:"FCA farma"}:site,fca?"FCA":"DAP",+t.s,t.d,"skutočný predaj (vážne lístky)",{})}
  // 7. 11. (príkaz majiteľa „prečo ukazuje Agro-Somotor 230, keď už má novú cenu 215 DDP“): platí iba NAJNOVŠIA cena odberateľa
  // pre komoditu (pri odberateľovi s viacerými miestami najnovšia pre každé miesto); skutočný predaj z lístkov iba keď od odberateľa nemáme novšiu ponuku
  const G={},Lo={},gk=o=>o.b.id+"|"+grp(o.b,o.del,o.siteName),tk=o=>/^skutočný/.test(o.src||"");
  for(const o of out){if(tk(o))continue;const k=gk(o),d=String(o.d||"");if(!G[k]||d>G[k])G[k]=d;if(!Lo[o.b.id]||d>Lo[o.b.id])Lo[o.b.id]=d}
  return out.filter(o=>tk(o)?!(Lo[o.b.id]&&Lo[o.b.id]>=String(o.d||"")):String(o.d||"")>=(G[gk(o)]||""))
    .filter(o=>o.age<=Math.max(MAXAGE,tk(o)?45:MAXAGE)).sort((a,b)=>(b.profit??-1e9)-(a.profit??-1e9))}
// skupina ceny (rovnako ako databáza sell_grp): odberateľ s ≥ 2 miestami + DAP/DDP na miesto → to miesto, inak jedna skupina (FCA, jedno miesto)
const skey=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s*(n\s*\/\s*o\.?|n\.\s*o\.|nad\s+ondavou)(\s|$)/g," ").replace(/[^a-z0-9]+/g,"");
const grp=(b,del,site)=>{const t=String(site||"").trim();return ((b&&b.sites)||[]).length>=2&&!/^(FCA|EXW)$/i.test(del||"")&&t&&!/^fca\b/i.test(t)?"s:"+skey(t):"*"};
// všetci odberatelia, ktorí komoditu vykupujú (sell_buyers.coms) – aj bez platnej ponuky: miesto + naša doprava (vzorec Kalkulačky)
const FWD=t=>/^\s*odber/i.test(t||"");
const MARGIN=()=>{try{return +(window.__sellcapM??10)}catch(x){return 10}};
function allOpts(com,buy){const O=options(com,buy),have=new Set(O.map(o=>o.b.id+"|"+(o.siteName||"")));const out=O.slice();
  for(const b of (D.B||[])){if(!(b.coms||[]).includes(com))continue;const S=(b.sites||[]).length?b.sites:[null];
    if(String(b.parita||"").toUpperCase()==="FCA"){if(!O.some(o=>o.b.id===b.id&&o.del==="FCA"))out.push({b,siteName:"FCA farma",del:"FCA",price:null,d:null,src:"bez ponuky",dop:0,net:null,profit:null,need:Math.ceil(buy+MARGIN()),age:0,none:true});continue}
    for(const st of S){const k=b.id+"|"+(st?st.n:"");if(have.has(k)||(!st&&O.some(o=>o.b.id===b.id)))continue;if(st&&O.some(o=>o.b.id===b.id&&!o.siteName))continue;
      const d0=st?dop(st):null;out.push({b,siteName:st?st.n:"",del:"DAP",price:null,d:null,src:"bez ponuky",dop:d0,net:null,profit:null,need:d0!=null?Math.ceil(buy+d0+MARGIN()):null,age:0,none:true})}}
  return out}
window.sellAllOpts=allOpts;
// pri nákupnej cene v Cenníku (iba majiteľ): všetky možnosti predaja so ziskom a dopravou
window.sellTileHTML=function(com,buy){if(!OWN()||buy==null||!(+buy>0))return "";if(!D.B){if(!D.busy&&Date.now()-D.at>60e3)load();return ""}
  const L=allOpts(com,+buy);if(!L.length)return `<span class="stl"><small>Kde predať: žiadny odberateľ nemá túto komoditu</small></span>`;
  const Y=L.filter(o=>!o.none&&o.net!=null),N=L.filter(o=>o.none),B=Y[0],R=Y.slice(1);
  const nm=o=>E(o.b.name)+(o.siteName?" "+E(o.siteName):""),calc=o=>`${E(o.del)} ${f0(o.price)}${o.dop?` − doprava ${f0(o.dop)}`:""} = ${f0(o.net)} €/t`;
  const top=B?`<span class="sbig ${B.profit>=0?"ok":"bad"}"><i>${B.profit>=0?"🏆 NAJVIAC ZAROBÍME":"⚠️ VŠADE STRATA – najmenšia"}</i>
     <b class="sbn">${nm(B)}</b><b class="sbp">${sg(B.profit)} €/t</b>
     <small>${calc(B)} · náš nákup ${f0(+buy)} €/t</small>
     <small class="sb100">na 100 t: <b>${sg(Math.round(B.profit*100))} €</b></small></span>`:`<small>Žiadna platná ponuka odberateľa</small>`;
  const rest=R.length?`<span class="srest"><small class="srh">Ďalšie možnosti predaja</small>${R.map(o=>`<span class="sr ${o.profit>=0?"ps":"ng"}"><b>${sg(o.profit)}</b><span>${nm(o)}<small>${calc(o)}${B&&B.profit!=null&&o.profit!=null?` · o ${f0(B.profit-o.profit)} €/t menej`:""}</small></span></span>`).join("")}</span>`:"";
  return `<span class="stl">${top}${rest}
    ${N.length?`<details class="stnd"><summary>+ ${N.length} bez ponuky (koľko musia dať)</summary>${N.map(o=>`<small class="stn">${E(o.b.name)}${o.siteName?" "+E(o.siteName):""}${o.del==="FCA"?` · FCA → treba ≥ ${f0(o.need)}`:o.dop!=null?` · dopr. ${f0(o.dop)} € → treba ≥ ${f0(o.need)}`:""}</small>`).join("")}</details>`:""}</span>`};
function missing(com,opts){const have=new Set(opts.map(o=>o.b.id));return (D.B||[]).filter(b=>(b.coms||[]).includes(com)&&!have.has(b.id))}
// PRÍKAZ MAJITEĽA (30. 10.): nákupná cena nikdy nad najlepší predaj po našej doprave − marža (predvolene 10 €/t)
// strop = najlepší MODEL / ponuka odberateľa (posúvaná s burzou), NIE posledné lístky (príkaz majiteľa); ukladá sa do kalk_store pricelist/sellcap; databáza (soja_adm_tick, ia_tick, price_propose) zverejní najviac strop
async function caps(){if(!OWN()||!window.sb)return;const P=(typeof STATE!=="undefined"&&STATE.prices)||[];if(!P.length)return;
  let cur=null;try{const r=await sb.from("kalk_store").select("data").eq("path","pricelist").eq("id","sellcap").maybeSingle();cur=r.error?undefined:(r.data?r.data.data:null)}catch(x){cur=undefined}
  if(cur===undefined)return;const m=cur&&cur.m!=null?+cur.m:10,C={};window.__sellcapM=m;
  for(const p of P){const o=options(p.com,+p.price||0).filter(x=>x.net!=null&&x.net>0&&!/^skutočný/.test(x.src||""));if(!o.length)continue;const b=o.reduce((a,x)=>x.net>a.net?x:a,o[0]);
    C[p.com]={best:Math.round(b.net*100)/100,cap:Math.floor(b.net-m),src:`${b.b.name}${b.siteName?" "+b.siteName:""} ${b.del} ${Math.round(b.price)}${b.dop?" − doprava "+b.dop:""} (${b.src}, ${dk(b.d)})`}}
  const same=cur&&cur.c&&JSON.stringify(cur.c)===JSON.stringify(C)&&Date.now()-Date.parse(cur.at||0)<6*3600e3;
  if(!same){const data={m,at:new Date().toISOString(),c:C};const r=await sb.from("kalk_store").upsert({path:"pricelist",id:"sellcap",data},{onConflict:"path,id"});if(r.error)return}
  try{const a=await sb.rpc("sellcap_apply");if(!a.error&&a.data&&a.data.zmenene&&a.data.zmenene.length&&typeof toast==="function")toast("📉 Nákupná cena znížená na najlepší predaj − "+m+" €/t: "+a.data.zmenene.map(x=>nm(x.c)+" "+x.old+" → "+x.new).join(", "),9000)}catch(x){}}
window.sellCaps=caps;
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-scom]");if(!t||!OWN())return;e.preventDefault();const [id,c]=t.dataset.scom.split("|");const b=(D.B||[]).find(x=>x.id===id);if(!b)return;
  const on=(b.coms||[]).includes(c),nc=on?(b.coms||[]).filter(x=>x!==c):[...(b.coms||[]),c];t.disabled=true;const r=await sb.from("sell_buyers").update({coms:nc,updated_at:new Date().toISOString()}).eq("id",id);t.disabled=false;
  if(r.error){toast("Nepodarilo sa uložiť: "+r.error.message,5000);return}b.coms=nc;t.classList.toggle("on",!on);toast(`${b.name}: ${nm(c)} ${on?"nevykupuje":"vykupuje"}`,3000);try{caps()}catch(x){}},true);
// pre owner: obnovenie každých 30 min aj mimo Prehľadu
setInterval(()=>{if(OWN()&&!D.busy&&Date.now()-D.at>30*60e3)load()},5*60e3);
setTimeout(()=>{if(OWN()&&!D.B&&!D.busy)load()},8000);
// pre Predikciu: všetky predajné možnosti s cenou (posunutou s burzou) a dopravou z regiónu
window.sellOpts=function(com){if(!OWN())return [];if(!D.B){if(!D.busy)load();return []}return options(com,0).filter(o=>o.net!=null)};
window.sellBest=function(com,buy){if(!OWN()||!D.B)return null;const o=options(com,buy).find(x=>x.profit!=null);return o||null};
window.sellBestLine=function(com,buy){if(!OWN())return "";if(!D.B){if(!D.busy&&Date.now()-D.at>60e3)load();return ""}const o=window.sellBest(com,buy);if(!o)return "";
  return `<span class="owrec ${o.profit>=0?"ps":"ng"}">🏆 ${E(o.b.name)}${o.siteName?" "+E(o.siteName):""} ${sg(o.profit)} €/t</span>`};

function row(o,i){const bst=i===0&&o.profit!=null&&o.profit>=0,neg=i===0&&o.profit!=null&&o.profit<0;return `<div class="srow ${o.profit==null?"":o.profit>=0?"ps":"ng"}${bst?" sbest":neg?" sworst":""}">${bst?`<i class="sbtag">🏆 Odporúča ekonomika – najvyšší zisk</i>`:neg?`<i class="sbtag neg">⚠️ Všetky ponuky v mínuse – toto je najmenšia strata, nepredávať</i>`:""}<div class="srh"><b>${E(o.b.name)}${o.siteName?" · "+E(o.siteName):""}</b><span>${o.profit==null?"doprava ?":sg(o.profit)+" €/t"}</span></div>
  <small>${E(o.del)} ${f0(o.price)} €/t${o.bz?` (s burzou ${o.bz.d>=0?"+":"−"}${f0(Math.abs(o.bz.d))}, ${E(o.bz.n)})`:""}${o.dop?` − doprava ${f0(o.dop)}`:o.del==="FCA"?" · odvoz zabezpečí odberateľ":""} = <b>${o.net==null?"?":f0(o.net)} €/t</b> · ${E(o.src)} ${dk(o.d)}${o.term?" · "+E(o.term):""}${o.age>10?` · <em>${o.age} dní stará</em>`:""}</small></div>`}
window.sellRecHTML=function(){if(!OWN())return "";if(!D.B){if(!D.busy)load();return `<div class="card srec"><div class="s">🏆 Počítam, kde predať s najvyšším ziskom…</div></div>`}
  if(Date.now()-D.at>5*60e3&&!D.busy)load();
  const P=((typeof STATE!=="undefined"&&STATE.prices)||[]).filter(p=>p.price!=null&&+p.price>0);const order=(typeof MK!=="undefined"?MK.map(m=>m[0]):[]);P.sort((a,b)=>order.indexOf(a.com)-order.indexOf(b.com));
  let h=`<div class="card srec"><b class="srt">🏆 Kde predať s najvyšším ziskom</b>${D.err?`<div class="s">${E(D.err)}</div>`:""}
   <div class="s">Zisk = cena odberateľa (posunutá s burzou, ak podľa nej ráta) − naša doprava z regiónu farmárov − naša zverejnená nákupná cena. Ponuky staršie ako ${MAXAGE} dní sa nepočítajú.</div>`;
  /* 3. 11. (Claude): komodity bez platnej ponuky zbalené do jedného riadku na konci – menej posúvania */
  let hN="";const nN=[];
  for(const p of P){const buy=+p.price,O=options(p.com,buy),best=O.find(o=>o.profit!=null),M=missing(p.com,O);
    if(!O.length)nN.push(nm(p.com));
    const hc=`<details class="scom"${best||!O.length?"":" open"}><summary><span class="sn">${E(nm(p.com))}<small>nákup ${f0(buy)} €/t</small></span>${best?`<span class="sb ${best.profit>=0?"ps":"ng"}">${E(best.b.name)}${best.siteName?" "+E(best.siteName):""}<b>${sg(best.profit)} €/t</b></span>`:`<span class="sb">bez ponuky</span>`}</summary>
     ${O.length?O.map(row).join(""):`<div class="s">Zatiaľ žiadna platná ponuka.</div>`}
     ${(()=>{const N=allOpts(p.com,buy).filter(o=>o.none);return N.length?`<div class="smiss"><b>Bez platnej ponuky</b> (vykupujú ${E(nm(p.com))}):${N.map(o=>`<div>${E(o.b.name)}${o.siteName?" · "+E(o.siteName):""}${o.del==="FCA"?` – FCA u farmára (dopravu platia oni), aby sme zarobili ${MARGIN()} €/t, musia dať aspoň <b>${f0(o.need)} €/t</b> FCA`:o.dop!=null?` – naša doprava ${f0(o.dop)} €/t, aby sme zarobili ${MARGIN()} €/t, musia dať aspoň <b>${f0(o.need)} €/t</b> DAP`:""}</div>`).join("")}</div>`:""})()}</details>`;
    if(O.length)h+=hc;else hN+=hc}
  if(nN.length)h+=`<details class="scom snone"><summary><span class="sn">⏳ Bez platnej ponuky (${nN.length})<small>${nN.map(E).join(" · ")}</small></span><span class="sb">ukáž ›</span></summary><div class="snin">${hN}</div></details>`;
  h+=nakHTML();
  h+=`<details class="smod"><summary>📚 Modely odberateľov – podľa čoho rátajú</summary><div class="s">Ťuknutím na komoditu nastavíš, čo odberateľ vykupuje (zelené = vykupuje).</div>${(D.B||[]).map(b=>`<div class="srow"><b>${E(b.name)}</b>${(b.sites||[]).length?` <small>· ${(b.sites||[]).map(s=>E(s.n)+" ~"+f0(dop(s))+" €/t doprava").join(" · ")}</small>`:""}<small>${E(b.model||"")}</small>
     <span class="scoms">${(typeof MK!=="undefined"?MK:[]).map(m=>`<button type="button" class="scm${(b.coms||[]).includes(m[0])?" on":""}" data-scom="${E(b.id)}|${m[0]}">${E(m[1])}</button>`).join("")}</span></div>`).join("")}</details>`;
  h+=`<div class="btns"><button type="button" class="lime" data-ocn="go">🏷️ Pridať / opraviť ceny odberateľov</button><button type="button" data-sref>↻ Prepočítať</button></div>`;
  return h+`</div>`};
// ===== 🛒 NÁKUP PRE ODBERATEĽA (5. 11. príkaz majiteľa): pri každom odberateľovi jeho aktuálne ceny (posunuté s burzou), naša doprava, marža
// a odporúčaná NAŠA nákupná cena = cena odberateľa − doprava − marža; kontrola modelu (báza voči burze) pri každej novej ponuke; na konci vyjadrenie Claude.
function dopBack(site){if(!site||!site.ke)return null;const f=D.mk&&D.mk.fuel,huf=(D.mk&&D.mk.fx&&D.mk.fx.huf)||366.9;let ekm=1.6;
  if(f&&f.ref){const xs=[f.sk&&f.sk.netL,f.hu&&f.hu.netL].filter(Number.isFinite);if(xs.length)ekm=f.ref.ekm+f.ref.cons*(xs.reduce((a,b)=>a+b,0)/xs.length-f.ref.netL)}
  const one=a=>{const [km,sk,hu,at]=a;return (km*ekm+((sk||0)*0.1942+(hu||0)*192.38/huf+(at||0)*0.5724))/25};
  return Math.round(((one(site.ke)+one(site.po||site.ke))/2)*10)/10}
function buyOffers(b){const L=[],seen=new Set();
  for(const o of D.O){if(o.buyer!==b.id||age(o.d)>45)continue;const k=o.com+"|"+(o.site||"")+"|"+o.del+"|"+(o.period||"");if(seen.has(k))continue;seen.add(k);
    let p=+o.price,bz=null;const n=o.bz_val!=null?bzNow(o.bz_sym||BZ[o.com]):null;if(FL(b,o.com)&&n){bz={d:n.v-(+o.bz_val),n:n.n};p+=bz.d}
    const fca=o.del==="FCA"||o.del==="EXW",site=fca?null:(siteOf(b,o.site)||(b.sites||[]).find(s=>s.n===o.site)||((b.sites||[]).length===1?b.sites[0]:null));
    const d0=fca?0:dop(site),d1=fca?0:dopBack(site),M=MARGIN(),basis=o.bz_val!=null?Math.round((+o.price-(+o.bz_val))*10)/10:null,mb=b.basis&&b.basis[o.com];
    L.push({o,com:o.com,p,bz,d0,d1,M,rec:d0==null?null:Math.floor(p-d0-M),recB:d1==null?null:Math.floor(p-d1-M),fwd:FWD(o.period),basis,mb:mb!=null?+(mb.b??mb):null,site})}
  return L}
function ourPrice(com){const P=(typeof STATE!=="undefined"&&STATE.prices)||[];const x=P.find(p=>p.com===com);return x&&+x.price>0?+x.price:null}
function autoNote(L){const T=L.filter(x=>!x.fwd&&x.rec!=null),out=[];
  for(const x of T){const our=ourPrice(x.com);if(our==null)continue;const d=x.rec-our;out.push(`${nm(x.com)}: ${d>=0?`pri dnešnej našej cene ${f0(our)} €/t zarobíme ${f0(d+x.M)} €/t – oplatí sa`:`naša cena ${f0(our)} €/t je o ${f0(-d)} €/t vyššia, než unesie ich cena po doprave a marži – teraz sa neoplatí`}`)}
  const old=L.filter(x=>age(x.o.d)>14);if(old.length)out.push(`ponuka je stará ${age(old[0].o.d)} dní – vyžiadať novú`);
  return out.length?"Dnes: "+E(out.join("; "))+".":""}
function nakHTML(){const B=(D.B||[]).filter(b=>b.active!==false);const rows=B.map(b=>({b,L:buyOffers(b)})).filter(x=>x.L.length);if(!rows.length)return "";
  return `<details class="snak"><summary>🛒 Nákup pre odberateľa – naša odporúčaná nákupná cena (${rows.length})</summary>
   <div class="s">Pri každom odberateľovi: jeho aktuálna cena (posunutá s burzou) − naša doprava z regiónu farmárov − naša marža ${MARGIN()} €/t = za koľko môžeme kúpiť od farmára FCA.</div>
   ${rows.map(({b,L})=>{const chk=[];
     const items=L.map(x=>{const our=ourPrice(x.com),diff=our!=null&&x.rec!=null?our-x.rec:null;
       if(x.basis!=null&&x.mb!=null&&Math.abs(x.basis-x.mb)>5)chk.push(`⚠️ ${E(nm(x.com))}${x.o.period?" ("+E(x.o.period)+")":""}: báza novej ponuky ${x.basis>=0?"+":"−"}${f0(Math.abs(x.basis))} €/t voči burze, model počíta ${x.mb>=0?"+":"−"}${f0(Math.abs(x.mb))} – model nesedí o ${f0(Math.abs(x.basis-x.mb))} €/t`);
       else if(x.basis!=null&&x.mb!=null)chk.push(`✅ ${E(nm(x.com))}${x.o.period?" ("+E(x.o.period)+")":""}: model sedí (báza ${x.basis>=0?"+":"−"}${f0(Math.abs(x.basis))}, model ${x.mb>=0?"+":"−"}${f0(Math.abs(x.mb))} €/t)`);
       return `<div class="snk${x.fwd?" fwd":""}"><div class="snkh"><b>${E(nm(x.com))}</b><small>${E(x.o.del)}${x.site?" "+E(x.site.n):""}${x.o.period?" · "+E(x.o.period):""} · ponuka ${dk(x.o.d)}${x.fwd?" · neskorší odber":""}</small></div>
        <div class="snkg"><span class="snkb"><i>Ich nákupná cena</i><b>${f0(x.p)} €/t</b>${x.bz?`<small>ponuka ${f0(+x.o.price)} ${x.bz.d>=0?"+":"−"} ${f0(Math.abs(x.bz.d))} burza (${E(x.bz.n)})</small>`:""}</span>
        <span class="snko"><i>Naša odporúčaná nákupná</i><b>${x.rec==null?"?":f0(x.rec)} €/t</b><small>FCA farma</small></span></div>
        <small class="snkc">− doprava ${x.d0==null?"? (chýba miesto)":f0(x.d0)+" €/t"}${x.d0?" (25 t, prázdny návrat)":x.o.del==="FCA"?" (odvoz zabezpečí odberateľ)":""} · − marža ${f0(x.M)} €/t${x.recB!=null&&x.d1!==x.d0?` · so spätným nákladom doprava ~${f0(x.d1)} €/t → nákup ${f0(x.recB)} €/t`:""}</small>
        ${our!=null&&x.rec!=null&&!x.fwd?`<small class="snkc ${diff>0?"ng":"ps"}">Naša zverejnená cena ${f0(our)} €/t → ${diff>0?`o ${f0(diff)} €/t NAD odporúčanou – s týmto odberateľom by sme nezarobili maržu`:`o ${f0(-diff)} €/t pod odporúčanou – zarobíme ${f0(x.M-diff)} €/t`}</small>`:""}</div>`}).join("");
     return `<details class="snb"><summary><span>${E(b.name)}</span><small>${[...new Set(L.map(x=>nm(x.com)))].map(E).join(" · ")}</small></summary>${items}
      ${b.model?`<div class="snkm"><b>📚 Model:</b> ${E(b.model)}</div>`:""}${chk.length?`<div class="snkm">${chk.join("<br>")}</div>`:""}
      <div class="snkn"><b>🤖 Vyjadrenie Claude:</b> ${b.note?E(b.note)+" ":""}${autoNote(L)}</div></details>`}).join("")}</details>`}
function newRow(o){return Object.assign({on:true,com:"repka",site:"",del:"DDP",price:"",period:"",note:""},o||{})}
const COMS=["repka","psenica_p","psenica_k","soja","jacmen_k","jacmen_s","kukurica","lo","ho","cirok"];
function formHTML(){const B=D.B||[],F=D.form,C=(typeof MK!=="undefined"?MK:[]).filter(m=>COMS.includes(m[0])||true);
  const b=findBuyer(F.buyer),sites=b?(b.sites||[]).map(x=>x.n):[];
  return `<form class="f sform" id="sForm"><div class="w t">➕ Ponuka odberateľa</div>
   <div class="w sscan"><b>📷 Načítať ponuku z fotky alebo dokumentu</b><small>Aplikácia prečíta všetky ceny a vyplní riadky nižšie – skontroluj a ulož.</small>
    <div class="btns"><label class="btn lime sfile">📸 Odfotiť<input type="file" accept="image/*" capture="environment" data-sscan hidden></label><label class="btn sfile">🖼️ Fotka / 📄 PDF<input type="file" accept="image/*,application/pdf" data-sscan hidden></label></div>
    ${F.scan?`<div class="s">${F.scan==="busy"?"⏳ Čítam ponuku… (do 1 minúty)":E(F.scan)}</div>`:""}</div>
   <label class="w">Odberateľ (vyber alebo napíš nového)<input name="buyer" list="sBuyers" value="${E(F.buyer||"")}" data-sbuy required placeholder="napr. Agro-Somotor"></label><datalist id="sBuyers">${B.map(x=>`<option value="${E(x.name)}">`).join("")}</datalist>
   <label>Dátum ponuky<input type="date" name="d" value="${E(F.d||new Date().toISOString().slice(0,10))}"></label>
   <datalist id="sSites">${sites.map(x=>`<option value="${E(x)}">`).join("")}</datalist>
   <div class="w srows">${F.rows.map((r,i)=>`<div class="srowf" data-si="${i}"><label class="sck"><input type="checkbox" data-sk="on"${r.on?" checked":""}> ${i+1}.</label>
     <label>Komodita<select data-sk="com">${C.map(m=>`<option value="${m[0]}"${m[0]===r.com?" selected":""}>${E(m[1])}</option>`).join("")}</select></label>
     <label>Miesto<input data-sk="site" list="sSites" value="${E(r.site)}" placeholder="Tállya, Somotor…"></label>
     <label>Parita<select data-sk="del">${["DDP","DAP","FCA"].map(x=>`<option${x===r.del?" selected":""}>${x}</option>`).join("")}</select></label>
     <label>Cena ${r.cur==="HUF"?"HUF":"€"}/t<input data-sk="price" inputmode="decimal" value="${E(r.price)}"></label>
     <label>Obdobie<input data-sk="period" value="${E(r.period)}" placeholder="2026-11"></label>
     <label class="w">Poznámka<input data-sk="note" value="${E(r.note)}"></label></div>`).join("")}
    <div class="btns"><button type="button" data-sadd>＋ Ďalší riadok</button></div></div>
   <div class="w s">Nový odberateľ sa založí sám. Ak odberateľ ráta z burzy, uloží sa aj dnešná burza – ponuka sa potom sama posúva s burzou.</div>
   <div class="w btns"><button class="pri" type="submit">💾 Uložiť ponuku</button><button type="button" class="ghost" data-sform="0">Zrušiť</button></div></form>`}
const nzs=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
// komodita z ponuky (aj skratky odberateľov: SFS = slnečnica LO, HO, RPS = repka)
function comOf(k){const t=String(k||"").trim();if(COMS.includes(t))return t;const n=nzs(t);
  if(/\bho\b|high ?oleic|vysokoolej/.test(n))return "ho";if(/\bsfs\b|sunflower|slnecn|napraforgo/.test(n))return "lo";if(/\brps\b|rape|repk|repce|canola/.test(n))return "repka";
  if(/soy|soj|szoja/.test(n))return "soja";if(/corn|maize|kukur|kukoric/.test(n))return "kukurica";if(/barley|jacm|arpa/.test(n))return /malt|slad|sor/.test(n)?"jacmen_s":"jacmen_k";
  if(/feed|krmn|takarm/.test(n)&&/wheat|psen|buza/.test(n))return "psenica_k";if(/wheat|psen|buza/.test(n))return "psenica_p";if(/sorg|ciro|cirok/.test(n))return "cirok";return "repka"}
function findBuyer(name){const n=nzs(name);if(!n)return null;const B=D.B||[];return B.find(b=>nzs(b.name)===n)||B.find(b=>b.rx&&new RegExp(b.rx,"i").test(name))||B.find(b=>nzs(b.name).includes(n)||n.includes(nzs(b.name)))||null}
function syncForm(){const f=document.getElementById("sForm");if(!f||!D.form)return;D.form.buyer=f.buyer.value;D.form.d=f.d.value;
  f.querySelectorAll(".srowf").forEach(el=>{const r=D.form.rows[+el.dataset.si];if(!r)return;el.querySelectorAll("[data-sk]").forEach(x=>{r[x.dataset.sk]=x.type==="checkbox"?x.checked:x.value})})}
// fotka → JPEG max 1800 px; PDF → base64
function fileData(file){return new Promise((ok,no)=>{if(file.type==="application/pdf"){const r=new FileReader();r.onload=()=>ok({data:String(r.result).split(",")[1],mime:"application/pdf"});r.onerror=no;r.readAsDataURL(file);return}
  const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,1800/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok({data:c.toDataURL("image/jpeg",.86).split(",")[1],mime:"image/jpeg"})};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("Fotku sa nepodarilo otvoriť."))};im.src=u})}
async function scan(file){syncForm();D.form.scan="busy";renderStaff();
  try{if(file.size>12e6)throw new Error("Súbor je príliš veľký (max. 12 MB).");const f=await fileData(file);const r=await sb.rpc("sell_scan",{p_data:f.data,p_mime:f.mime});if(r.error)throw new Error(r.error.message);
    const sid=r.data,t0=Date.now();let g;while(Date.now()-t0<190e3){await new Promise(z=>setTimeout(z,2500));g=await sb.rpc("sell_scan_get",{sid});if(g.error)throw new Error(g.error.message);if(g.data.status!=="wait")break}
    if(!g||g.data.status==="wait")throw new Error("Čítanie trvá príliš dlho – skús znova.");if(g.data.status==="err")throw new Error(g.data.err||"Nepodarilo sa prečítať.");
    const R=g.data.result||{},P=Array.isArray(R.ponuky)?R.ponuky:[];if(!P.length)throw new Error("V prílohe som nenašiel žiadne ceny.");
    if(R.odberatel)D.form.buyer=(findBuyer(R.odberatel)||{name:R.odberatel}).name;
    else{const txt=P.map(x=>x.miesto||"").join(" "),hit=(D.B||[]).find(b=>(b.sites||[]).some(st=>st.rx&&new RegExp(st.rx,"i").test(txt)));if(hit)D.form.buyer=hit.name}if(/^\d{4}-\d\d-\d\d$/.test(R.datum||""))D.form.d=R.datum;
    D.form.rows=P.filter(x=>+x.cena>0).map(x=>newRow({com:comOf(x.komodita),site:x.miesto||"",del:["DDP","DAP","FCA"].includes(String(x.parita||"").toUpperCase())?String(x.parita).toUpperCase():"DDP",
      price:String(x.cena).replace(".",","),cur:String(x.mena||"EUR").toUpperCase()==="HUF"?"HUF":"EUR",period:x.obdobie||"",note:[x.pozn,R.burza].filter(Boolean).join(" · ")}));
    D.form.scan=`✓ Načítaných ${D.form.rows.length} cien – skontroluj a ulož.`}
  catch(x){D.form.scan="⚠️ "+(x&&x.message||x)}renderStaff()}
/* 📥 Vhoď sem (7. 11.): cenník / ponuka odberateľa z fotky alebo PDF → formulár „viac cien naraz“, prečíta ho Claude; nič sa neuloží bez Uložiť */
window.sellScanFile=function(file){if(!OWN()||!file)return false;D.form={buyer:"",rows:[newRow()]};Q.mf=true;
  if(typeof TAB==="undefined"||(TAB!=="home"&&TAB!=="price")){try{const b=document.querySelector('#app>nav.tabs [data-tab="home"]');if(b)b.click();else{TAB="home";renderStaff()}}catch(x){}}else renderStaff();
  let n=0;const w=()=>{if(document.getElementById("sForm")){scan(file);setTimeout(()=>{const f=document.getElementById("sForm");if(f)f.scrollIntoView({block:"start",behavior:"smooth"})},200);return}if(++n<30)setTimeout(w,150)};setTimeout(w,120);return true};
/* 🗣️ „Agro-Somotor kúpi kukuricu po 215 DDP“ (Hľadať) → predvyplnený formulár, uloží až Martin */
window.sellAddPrefill=function(o){if(!OWN()||!o)return false;const b=o.buyer?findBuyer(o.buyer):null;Q.edit=null;Q.err="";Q.msg="";Q.mf=true;D.form=false;
  if(b){Q.buyer=b.id;const S=b.sites||[];Q.site=o.site||(S.length===1?S[0].n:"")}else{Q.buyer="";Q.site=o.site||""}if(o.com)Q.com=o.com;if(o.del)Q.del=o.del;if(o.price)Q.price=String(o.price).replace(".",",");if(o.cur)Q.cur=o.cur;Q.d=today();
  if(!b&&o.buyer)Q.err=`Odberateľa „${o.buyer}“ nepoznám – vyber ho zo zoznamu (alebo ho založ cez 📷 Z fotky / viac cien).`;
  if(typeof TAB==="undefined"||(TAB!=="home"&&TAB!=="price")){try{const x=document.querySelector('#app>nav.tabs [data-tab="home"]');if(x)x.click();else{TAB="home";renderStaff()}}catch(x){}}else ocnPaint();
  let n=0;const w=()=>{const f=document.getElementById("ocnForm");if(f){ocnPaint();const g=document.getElementById("ocnForm");g.scrollIntoView({block:"center",behavior:"smooth"});const p=g.querySelector(Q.buyer?'[data-ocnk="price"]':'[data-ocnk="buyer"]');if(p)setTimeout(()=>{try{p.focus({preventScroll:true})}catch(x){}},350);return}
    const s=document.getElementById("ocnSec");if(s&&s.dataset.mini==="1")ocnPaint();if(++n<30)setTimeout(w,150)};setTimeout(w,120);return true};
window.sellBuyers=()=>(D.B||[]).map(b=>({id:b.id,name:b.name,rx:b.rx||""}));
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-sform],[data-sref],[data-sadd]");if(!t||!OWN())return;e.preventDefault();
  if(t.dataset.sref!==undefined){D.at=0;load();return}if(t.dataset.sadd!==undefined){syncForm();D.form.rows.push(newRow());renderStaff();return}
  D.form=t.dataset.sform==="1"?{buyer:(D.B||[]).some(b=>b.id===Q.buyer)?(D.B.find(b=>b.id===Q.buyer)||{}).name:"",rows:[newRow(Q.com?{com:Q.com}:null)]}:false;if(D.form&&typeof TAB!=="undefined"&&TAB!=="home"&&TAB!=="price")TAB="home";renderStaff();
  if(D.form){let n=0;const sc=()=>{const f=document.getElementById("sForm");if(f){f.scrollIntoView({block:"start",behavior:"smooth"});return}if(++n<20)setTimeout(sc,150)};setTimeout(sc,60)}},true);
document.addEventListener("change",e=>{const x=e.target;if(!x.dataset||!D.form)return;if(x.dataset.sscan!==undefined&&x.files&&x.files[0]){scan(x.files[0]);x.value="";return}
  if(x.dataset.sbuy!==undefined){const b=findBuyer(x.value),l=document.getElementById("sSites");if(l)l.innerHTML=(b&&b.sites||[]).map(s=>`<option value="${E(s.n)}">`).join("")}},true);
document.addEventListener("submit",async e=>{const f=e.target;if(f.id!=="sForm"||!OWN())return;e.preventDefault();e.stopPropagation();syncForm();const btn=f.querySelector("button[type=submit]");
  const F=D.form,name=String(F.buyer||"").trim();if(!name){toast("Zadaj odberateľa.",4000);return}
  const R=F.rows.filter(r=>r.on&&+String(r.price).replace(",",".").replace(/\s/g,"")>0);if(!R.length){toast("Zadaj aspoň jednu cenu.",4000);return}
  if(typeof busy==="function")busy(btn,true);
  try{let b=findBuyer(name);
    if(!b){const id=(nzs(name).replace(/ /g,"-")||"odb").slice(0,40)+"-"+Date.now().toString(36).slice(-4);const nb={id,name,rx:nzs(name).split(" ").filter(w=>w.length>=3).slice(0,2).join(".*")||null,coms:[...new Set(R.map(r=>r.com))],sites:[],float_burza:false,model:"Ceny z ich ponúk.",sort:200};
      const q=await sb.from("sell_buyers").insert(nb);if(q.error)throw new Error(q.error.message);b=nb;(D.B=D.B||[]).push(nb)}
    const huf=(D.mk&&D.mk.fx&&D.mk.fx.huf)||null;
    const rows=R.map(r=>{let p=+String(r.price).replace(",",".").replace(/\s/g,""),note=r.note||null;if(r.cur==="HUF"){if(!huf)throw new Error("Chýba kurz HUF – zadaj cenu v €.");note=[note,"z "+Math.round(p)+" HUF/t"].filter(Boolean).join(" · ");p=Math.round(p/huf*100)/100}
      const n=FL(b,r.com)?bzNow(BZ[r.com]):null;return {buyer:b.id,com:r.com,site:String(r.site||"").trim()||null,del:r.del,price:p,period:String(r.period||"").trim()||null,d:F.d||null,note,bz_sym:n?BZ[r.com]:null,bz_val:n?n.v:null}});
    const q=await sb.from("sell_offers").insert(rows);if(q.error)throw new Error(q.error.message);
    toast(`✓ Uložené ${rows.length} ${rows.length===1?"cena":rows.length<5?"ceny":"cien"} – staršie ceny tých istých odberateľov idú do archívu, prepočítavam.`,5000);Q.msg=`Uložené ${rows.length} ${rows.length===1?"cena":rows.length<5?"ceny":"cien"} od ${b.name}.`;Q.err="";D.form=false;reload()}
  catch(x){toast("Nepodarilo sa uložiť: "+(x&&x.message||x),7000)}finally{if(typeof busy==="function")busy(btn,false)}},true);

// ===== 💰 UPOZORNENIE: KDE LEPŠIE PREDAŤ NAŠE NÁKUPY (3. 11. príkaz majiteľa) =====
// Otvorené nákupy od farmárov (deal_watch_list – bez predajnej ceny) × všetky ponuky odberateľov (posunuté s burzou, − naša doprava).
// Karta na Prehľade a v Obchodoch; pri novej / lepšej možnosti predaja zvýraznenie 🆕 + upozornenie, kým Martin nepotvrdí „Beriem na vedomie“.
const W={L:null,at:0,busy:false,told:""};const WK="ernte-sell-al";
const wSeen=()=>{try{return JSON.parse(localStorage.getItem(WK)||"{}")||{}}catch(x){return {}}};
async function wLoad(){if(!OWN()||W.busy||typeof sb==="undefined")return;W.busy=true;try{const r=await sb.rpc("deal_watch_list");W.L=r.error?[]:(r.data||[])}catch(x){W.L=W.L||[]}W.at=Date.now();W.busy=false;wSch()}
function wCalc(){if(!D.B||!W.L)return [];const G={};
  for(const x of W.L){if(!x.com||!(+x.tons>0)||!(+x.buy>0))continue;const g=G[x.com]=G[x.com]||{com:x.com,t:0,v:0,n:0};g.t+=+x.tons;g.v+=x.tons*x.buy;g.n++}
  const S=wSeen(),out=[];
  for(const c in G){const g=G[c],buy=g.v/g.t,O=options(c,buy).filter(o=>o.profit!=null&&!/^skutočný/.test(o.src||""));if(!O.length)continue;
    const b=O[0],sig=b.b.id+"|"+(b.siteName||"")+"|"+b.del,s=S[c],isNew=!s||(s.sig!==sig&&b.net>(+s.net||0))||b.net>=(+s.net||0)+3;
    out.push({com:c,tons:g.t,n:g.n,buy,best:b,next:O[1]||null,sig,isNew})}
  return out.sort((a,b)=>(b.isNew-a.isNew)||(b.best.profit*b.tons-a.best.profit*a.tons))}
const wOpt=o=>`${E(o.b.name)}${o.siteName?" "+E(o.siteName):""} ${E(o.del)} ${f0(o.price)}${o.dop?` − doprava ${f0(o.dop)}`:""} = <b>${f0(o.net)} €/t</b>`;
function wHTML(){const A=wCalc();if(!A.length)return "";const nw=A.filter(x=>x.isNew);
  return `<div class="card swal${nw.length?" al":""}" id="swAl" data-nosec><b class="srt">💰 Kde predať naše nákupy${nw.length?` · <span class="cnt">🆕 ${nw.length} ${nw.length===1?"lepšia možnosť":nw.length<5?"lepšie možnosti":"lepších možností"}</span>`:""}</b>
   <div class="s">Otvorené nákupy od farmárov bez predajnej ceny × najlepšia ponuka odberateľa po našej doprave.</div>
   ${A.map(x=>{const p=x.best.profit;return `<div class="swr${x.isNew?" nw":""}"><div class="srh"><b>${x.isNew?"🆕 ":""}${E(nm(x.com))} · ${f0(x.tons)} t</b><span class="${p>=0?"ps":"ng"}">${sg(p)} €/t · spolu ${sg(p*x.tons)} €</span></div>
     <small>nakúpené ${x.n}× ⌀ ${f0(x.buy)} €/t → 🏆 ${wOpt(x.best)} · ${E(x.best.src)} ${dk(x.best.d)}${x.best.term?" · "+E(x.best.term):""}</small>
     ${x.next?`<small class="swn">2. možnosť: ${wOpt(x.next)} (${sg(x.next.net-x.best.net)} €/t)</small>`:""}
     ${p<0?`<small class="ng">⚠️ Všetky ponuky sú pod nákupom – zatiaľ nepredávať, pýtať vyššiu cenu.</small>`:""}</div>`}).join("")}
   <div class="btns">${nw.length?`<button type="button" class="lime" data-swack>✓ Beriem na vedomie</button>`:""}<button type="button" data-ocn="go">🏷️ Pridať ceny odberateľov</button></div></div>`}
function wPaint(){if(!OWN()||typeof TAB==="undefined"||(TAB!=="home"&&TAB!=="deals"))return;const app=document.getElementById("app");if(!app)return;
  const h=wHTML(),old=document.getElementById("swAl");
  if(old){if(!h){old.remove();return}if(old.dataset.h===h)return;const d=document.createElement("div");d.innerHTML=h;d.firstElementChild.dataset.h=h;old.replaceWith(d.firstElementChild);}
  else if(h){const d=document.createElement("div");d.innerHTML=h;const el=d.firstElementChild;el.dataset.h=h;const a=TAB==="deals"?(app.querySelector("#dwCard")||app.querySelector("#fDeal")):(app.querySelector("#dwHome")||app.querySelector(".hub,.owh"));
    if(a)a.before(el);else{const nav=app.querySelector("nav.tabs");(nav||app.firstElementChild).after(el)}}
  const nw=wCalc().filter(x=>x.isNew),k=nw.map(x=>x.com+":"+x.sig+":"+Math.round(x.best.net)).join(",");
  if(nw.length&&k!==W.told&&typeof toast==="function"){W.told=k;const x=nw[0];toast(`💰 Lepší predaj: ${nm(x.com)} ${f0(x.tons)} t → ${x.best.b.name}${x.best.siteName?" "+x.best.siteName:""} ${f0(x.best.net)} €/t (${sg(x.best.profit)} €/t)`,9000)}}
let wq=0;function wSch(){if(wq)return;wq=(window.ernteSoon||requestAnimationFrame)(()=>{wq=0;try{if(!OWN()||typeof TAB==="undefined"||(TAB!=="home"&&TAB!=="deals"))return;if(!D.B){if(!D.busy&&Date.now()-D.at>60e3)load();return}
  if(W.L===null||Date.now()-W.at>5*60e3)wLoad();wPaint()}catch(x){}})}
window.sellAlertsHTML=wHTML;
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-swack]");if(!t||!OWN())return;e.preventDefault();const S=wSeen();
  for(const x of wCalc())S[x.com]={sig:x.sig,net:Math.round(x.best.net*10)/10,at:new Date().toISOString()};try{localStorage.setItem(WK,JSON.stringify(S))}catch(x){}
  toast("✓ Beriem na vedomie – ozve sa pri lepšej ponuke.",4000);const o=document.getElementById("swAl");if(o)o.remove();wPaint()},true);
// ===== 🏷️ CENY ODBERATEĽOV – PEVNÁ SEKCIA (7. 11. 06:57 PRÍKAZ MAJITEĽA „daj pevnú sekciu viditeľnú pridať odberateľské ceny“) =====
// Prehľad (hneď pod Naše ceny · nákup a predaj) a Cenník (hore): ✍️ pridať · ✏️ opraviť · 🗑️ zmazať cenu odberateľa, 📋 čo platí teraz, 🗄️ archív (↩️ vrátiť).
// Nová cena nahradí staršiu cenu toho istého odberateľa a komodity (pri viacerých miestach toho istého miesta) – databáza (trigger zz_sell_sup) ju dá do archívu sell_offers_old.
// Po uložení sa hneď prepočíta Predaj v Naše ceny, 🏆 Kde predať, strop nákupných cien (sellcap) aj 🏷️ Ceny odberateľov v Cenníku – bez F5.
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const Q={buyer:"",com:"",del:"DDP",site:"",price:"",cur:"EUR",d:"",edit:null,err:"",msg:"",busy:false,ask:null,weird:"",list:true,open:{},arch:null,archOpen:false,archBusy:false};
const BY=id=>(D.B||[]).find(b=>b.id===id)||null;
function offNet(o){const b=BY(o.buyer);if(!b)return {p:+o.price,d0:null,net:null};let p=+o.price,bz=null;
  if(FL(b,o.com)&&o.bz_val!=null){const n=bzNow(o.bz_sym||BZ[o.com]);if(n){bz=n.v-(+o.bz_val);p+=bz}}
  const fca=/^(FCA|EXW)$/i.test(o.del||""),st=fca?null:(siteOf(b,o.site)||(b.sites||[]).find(s=>s.n===o.site)||null),d0=fca?0:dop(st);
  return {p,bz,d0,net:d0==null?null:p-d0}}
function ocnForm(){const B=(D.B||[]).slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),"sk")),b=BY(Q.buyer),S=b?(b.sites||[]):[];
  const C=(typeof MK!=="undefined"&&MK.length?MK:COMS.map(c=>[c,c])),fca=Q.del==="FCA";
  return `<form class="ocnf" id="ocnForm" autocomplete="off" novalidate>
   ${Q.edit?`<div class="ocnw ocned">✏️ Opravuješ: <b>${E(Q.edit.t)}</b> – po uložení ide stará cena do archívu. <button type="button" data-ocn="cancel">✕ Zrušiť opravu</button></div>`:""}
   <label class="ocnw">Odberateľ<select name="buyer" data-ocnk="buyer"><option value="">– vyber odberateľa –</option>${B.map(x=>`<option value="${E(x.id)}"${x.id===Q.buyer?" selected":""}>${E(x.name)}</option>`).join("")}</select></label>
   <label>Komodita<select name="com" data-ocnk="com"><option value="">– vyber –</option>${C.map(m=>`<option value="${E(m[0])}"${m[0]===Q.com?" selected":""}>${E(m[1])}</option>`).join("")}</select></label>
   <label>Parita<select name="del" data-ocnk="del">${[["DDP","DDP – k nim"],["DAP","DAP – k nim"],["FCA","FCA – od farmára"]].map(x=>`<option value="${x[0]}"${x[0]===Q.del?" selected":""}>${x[1]}</option>`).join("")}</select></label>
   <label class="ocn2">Miesto dodania<input name="site" data-ocnk="site" list="ocnSites" value="${fca?"":E(Q.site)}" placeholder="${fca?"FCA – u farmára":S.length?E(S.map(s=>s.n).join(", ")):"napr. Somotor"}"${fca?" disabled":""}></label>
   <datalist id="ocnSites">${S.map(s=>`<option value="${E(s.n)}">`).join("")}</datalist>
   <label class="ocn2">Cena<span class="ocnp"><input name="price" data-ocnk="price" inputmode="decimal" value="${E(Q.price)}" placeholder="napr. 215"><select data-ocnk="cur" aria-label="Mena"><option value="EUR"${Q.cur!=="HUF"?" selected":""}>€/t</option><option value="HUF"${Q.cur==="HUF"?" selected":""}>Ft/t</option></select></span></label>
   <label class="ocn2">Dátum ceny<input type="date" name="d" data-ocnk="d" value="${E(Q.d||today())}" max="${today()}"></label>
   ${Q.err?`<div class="ocnw ocnerr" role="alert">⚠️ ${E(Q.err)}</div>`:""}${Q.msg?`<div class="ocnw ocnok" role="status">✅ ${E(Q.msg)}</div>`:""}
   <div class="ocnw ocnb"><button class="pri" type="submit"${Q.busy?" disabled":""}>${Q.busy?"⏳ Ukladám…":Q.edit?"💾 Uložiť opravu":"💾 Uložiť cenu"}</button><button type="button" data-sform="1">📷 Z fotky / viac cien naraz</button></div>
  </form>`}
function ocnRow(o,best){const b=BY(o.buyer)||{name:o.buyer},x=offNet(o),old=age(o.d)>MAXAGE,ask=Q.ask===o.id;
  return `<div class="ocnr${old?" old":""}${best?" best":""}" data-ocnid="${E(o.id)}">
   <div class="ocnrh"><b>${E(b.name)}</b><span>${E(o.del)}${o.site?" "+E(o.site):""} <b>${f0(+o.price)} €/t</b></span></div>
   <small>${dk(o.d)}${o.period?" · "+E(o.period):""}${x.bz!=null?` · s burzou dnes ${f0(x.p)} €/t`:""} · ${x.d0==null?"doprava ? (chýba miesto)":x.d0?`po našej doprave ${f0(x.net)} €/t`:"odvoz platia oni"}${old?` · <em>⏳ staršia ako ${MAXAGE} dní – nepočíta sa</em>`:best?" · <em class=\"ocnbest\">🏆 najvyššia po doprave</em>":""}${o.note?" · "+E(o.note):""}</small>
   ${ask?`<div class="ocna"><span>Zmazať túto cenu? (pôjde do archívu)</span><button type="button" class="ocnyes" data-ocn="del" data-id="${E(o.id)}">🗑️ Áno, zmazať</button><button type="button" data-ocn="nodel">Nie</button></div>`
     :`<div class="ocna"><button type="button" data-ocn="edit" data-id="${E(o.id)}">✏️ Opraviť</button><button type="button" data-ocn="ask" data-id="${E(o.id)}">🗑️ Zmazať</button></div>`}</div>`}
function ocnList(){const A=(D.O||[]),O=A.filter(o=>!FWD(o.period)),F=A.filter(o=>FWD(o.period));if(!A.length)return `<div class="s">Zatiaľ žiadne ceny odberateľov – zadaj prvú vyššie.</div>`;
  const by={};for(const o of O)(by[o.com]=by[o.com]||[]).push(o);const order=typeof MK!=="undefined"?MK.map(m=>m[0]):COMS;
  let h=Object.keys(by).sort((a,b)=>order.indexOf(a)-order.indexOf(b)).map(c=>{const L=by[c].slice().sort((a,b)=>String(b.d).localeCompare(String(a.d))||(+b.price)-(+a.price));
    let best=null,bn=-1e9;for(const o of L){if(age(o.d)>MAXAGE)continue;const n=offNet(o).net;if(n!=null&&n>bn){bn=n;best=o}}
    const bb=best?BY(best.buyer):null;
    return `<details class="ocnc" data-ocnc="${E(c)}"${Q.open[c]?" open":""}><summary><span><b>${E(nm(c))}</b><small>${L.length} ${L.length===1?"cena":L.length<5?"ceny":"cien"}</small></span><span class="ocns">${best?`🏆 ${E(bb?bb.name:best.buyer)} <b>${f0(bn)} €/t</b><small>po doprave</small>`:"<small>bez platnej ceny</small>"}</span></summary>${L.map(o=>ocnRow(o,o===best)).join("")}</details>`}).join("");
  if(F.length)h+=`<details class="ocnc" data-ocnc="_fwd"${Q.open._fwd?" open":""}><summary><span><b>📅 Na neskorší odber</b><small>${F.length} ${F.length===1?"cena":F.length<5?"ceny":"cien"} – nerátajú sa do dnešného predaja</small></span></summary>${F.map(o=>ocnRow(o,false)).join("")}</details>`;
  return h}
function ocnArch(){if(Q.arch===null)return `<div class="s">${Q.archBusy?"⏳ Načítavam…":"Ťukni na nadpis, načíta sa."}</div>`;if(Q.arch.err)return `<div class="ocnerr">⚠️ ${E(Q.arch.err)}</div>`;
  if(!Q.arch.length)return `<div class="s">Za posledných 30 dní nič nenahradené ani zmazané.</div>`;
  return Q.arch.map(a=>`<div class="ocnr old"><div class="ocnrh"><b>${E(a.b||a.buyer)}</b><span>${E(nm(a.com))} · ${E(a.del)}${a.site?" "+E(a.site):""} <b>${f0(+a.price)} €/t</b></span></div>
    <small>${dk(a.d)}${a.period?" · "+E(a.period):""} · ${E(a.why||"")}</small><div class="ocna"><button type="button" data-ocn="back" data-id="${E(a.id)}">↩️ Vrátiť späť</button></div></div>`).join("")}
/* 7. 11. 17:49 „zjednoduš“ (bod 5 – Trh): na Prehľade iba riadok ➕ Pridať cenu odberateľa (formulár sa rozbalí na mieste) + 📈 Trh;
   celý zoznam, archív, 🏷️ Ceny odberateľov a Konkurenčné ceny sú v Cenníku → 📈 Trh (secbtn) */
function ocnMini(){const A=(D.O||[]).filter(o=>!FWD(o.period)&&age(o.d)<=MAXAGE);let best=null,bn=-1e9;for(const o of A){const n=offNet(o).net;if(n!=null&&n>bn){bn=n;best=o}}
  return `<section class="card ocn ocnmini" id="ocnSec" data-nosec data-mini="1"><div class="ocnmh"><b class="ocnt">🏷️ Ceny odberateľov</b><small>${A.length} platných${best?` · 🏆 ${E(nm(best.com))} ${E((BY(best.buyer)||{name:best.buyer}).name)} ${f0(bn)} €/t po doprave`:""}</small></div>
   ${Q.msg?`<div class="ocnok" role="status">✅ ${E(Q.msg)}</div>`:""}<div class="ocnmb"><button type="button" class="pri" data-ocn="mf">➕ Pridať cenu odberateľa</button><button type="button" data-ocn="trh">📈 Trh – všetky ceny ›</button></div></section>`}
window.ernteTrh=function(){try{sessionStorage.setItem("ernte-sec-price","trh")}catch(x){}const b=document.querySelector('#app>nav.tabs [data-tab="price"]');if(b)b.click();else{try{TAB="price";renderStaff()}catch(x){}}
  let n=0;const w=()=>{const s=document.querySelector("#app>#ocnSec");if(s){s.scrollIntoView({block:"start"});return}if(++n<25)setTimeout(w,150)};setTimeout(w,120)};
window.sellAddHTML=function(o){if(!OWN())return "";const mini=o&&o.mini;if(mini&&D.B&&!Q.mf&&!D.form&&!Q.edit)return ocnMini();
  if(!D.B){if(!D.busy)load();return `<section class="card ocn" id="ocnSec" data-nosec${mini?' data-mini="1"':""}><b class="ocnt">🏷️ Ceny odberateľov</b><div class="s">⏳ Načítavam odberateľov…</div></section>`}
  if(mini)return `<section class="card ocn" id="ocnSec" data-nosec data-mini="1"><div class="ocnh"><b class="ocnt">🏷️ Pridať cenu odberateľa</b><small>Nová cena nahradí staršiu cenu toho istého odberateľa pre tú komoditu. Predaj, 🏆 Kde predať aj strop nákupných cien sa prepočítajú hneď.</small></div>
   ${D.err?`<div class="ocnerr">⚠️ ${E(D.err)}</div>`:""}${D.form?formHTML():ocnForm()}<div class="ocnmb"><button type="button" data-ocn="mfx">✕ Zavrieť</button><button type="button" data-ocn="trh">📈 Trh – všetky ceny ›</button></div></section>`;
  return `<section class="card ocn" id="ocnSec" data-nosec><div class="ocnh"><b class="ocnt">🏷️ Ceny odberateľov – pridať · opraviť · zmazať</b>
    <small>Nová cena nahradí staršiu cenu toho istého odberateľa pre tú komoditu (a to miesto). Predaj, 🏆 Kde predať aj strop našich nákupných cien sa prepočítajú hneď.</small></div>
   ${D.err?`<div class="ocnerr">⚠️ ${E(D.err)}</div>`:""}${D.form?formHTML():ocnForm()}
   <details class="ocnl" data-ocnd="list"${Q.list?" open":""}><summary>📋 Platné ceny odberateľov (${(D.O||[]).length})</summary>${ocnList()}</details>
   <details class="ocnl" data-ocnd="arch"${Q.archOpen?" open":""}><summary>🗄️ Archív – nahradené a zmazané (30 dní)</summary>${ocnArch()}</details></section>`};
// prekreslenie iba sekcie (formulár ostane, kde bol); na Prehľade aj celý Prehľad, keď sa zmenili ceny
function ocnPaint(){const el=document.getElementById("ocnSec");if(!el)return;const d=document.createElement("div");d.innerHTML=window.sellAddHTML({mini:el.dataset.mini==="1"});const n=d.firstElementChild;if(n)el.replaceWith(n)}
function ocnSync(f){f=f||document.getElementById("ocnForm");if(!f)return;f.querySelectorAll("[data-ocnk]").forEach(x=>{if(!x.disabled)Q[x.dataset.ocnk]=x.value})}
async function ocnArchLoad(){Q.archBusy=true;ocnPaint();try{const r=await sb.rpc("sell_offers_old_list",{p_dni:30});Q.arch=r.error?{err:/sell_offers_old_list/.test(r.error.message)?"Archív sa zapne po aktualizácii databázy (pár minút).":r.error.message}:(r.data||[])}catch(x){Q.arch={err:String(x&&x.message||x)}}Q.archBusy=false;ocnPaint()}
function ocnFail(m){Q.err=m;Q.msg="";Q.busy=false;ocnPaint();const f=document.querySelector("#ocnForm .ocnerr");if(f)f.scrollIntoView({block:"center",behavior:"smooth"});return false}
async function ocnSave(){ocnSync();Q.err="";Q.msg="";const b=BY(Q.buyer);if(!b)return ocnFail("Vyber odberateľa.");if(!Q.com)return ocnFail("Vyber komoditu.");
  let p=+String(Q.price).replace(/\s/g,"").replace(",",".");if(!(p>0))return ocnFail("Zadaj cenu – číslo, napr. 215.");
  if(Q.cur==="HUF"){const huf=D.mk&&D.mk.fx&&D.mk.fx.huf;if(!huf)return ocnFail("Chýba kurz forintu – zadaj cenu v €/t.");p=Math.round(p/huf*100)/100}
  if(!(p<5000))return ocnFail("Cena "+f0(p)+" €/t je príliš vysoká – skontroluj, či je to €/t.");
  const d=Q.d||today();if(!/^\d{4}-\d\d-\d\d$/.test(d)||d>today())return ocnFail("Dátum ceny nemôže byť v budúcnosti.");
  const del=Q.del==="FCA"?"FCA":Q.del==="DAP"?"DAP":"DDP";let site=del==="FCA"?null:String(Q.site||"").trim()||null;
  if(del!=="FCA"&&!site){const S=b.sites||[];if(S.length===1)site=S[0].n;else if(S.length)return ocnFail("Vyber miesto dodania: "+S.map(s=>s.n).join(", ")+".");else return ocnFail("Zadaj miesto dodania (kam sa vezie) – bez neho sa nedá spočítať naša doprava.")}
  const our=ourPrice(Q.com),wk=Q.com+"|"+p;if(our&&(p<our*0.6||p>our*1.7)&&Q.weird!==wk){Q.weird=wk;return ocnFail(`${f0(p)} €/t je ďaleko od našej nákupnej ceny ${nm(Q.com)} ${f0(our)} €/t – skontroluj komoditu a menu. Ak je to správne, ťukni Uložiť ešte raz.`)}
  const n=FL(b,Q.com)?bzNow(BZ[Q.com]):null,g=grp(b,del,site),ed=Q.edit;
  const rep=(D.O||[]).filter(o=>o.buyer===b.id&&o.com===Q.com&&!FWD(o.period)&&grp(b,o.del,o.site)===g&&String(o.d)<=d&&(!ed||o.id!==ed.id));
  const row={buyer:b.id,com:Q.com,site,del,price:p,period:null,d,note:Q.cur==="HUF"?"z "+String(Q.price).trim()+" Ft/t":null,bz_sym:n?BZ[Q.com]:null,bz_val:n?n.v:null,src:"rucne"};
  Q.busy=true;ocnPaint();
  try{const r=await sb.from("sell_offers").insert(row);if(r.error)throw new Error(r.error.message);
    if(ed){const x=await sb.rpc("sell_offer_off",{p_id:ed.id});if(x.error&&!/nenašla/.test(x.error.message||""))throw new Error("Nová cena uložená, staršiu sa nepodarilo dať do archívu: "+x.error.message)}
    const txt=`${b.name} · ${nm(Q.com)} ${del}${site?" "+site:""} ${f0(p)} €/t (${dk(d)})`+(ed?` – oprava, pôvodná ${ed.t} je v archíve`:rep.length?` – nahradila ${rep.map(o=>o.del+(o.site?" "+o.site:"")+" "+f0(+o.price)+" ("+dk(o.d)+")").join(", ")}`:"");
    Q.msg="Uložené: "+txt;Q.err="";Q.price="";Q.edit=null;Q.weird="";Q.busy=false;Q.open[Q.com]=true;Q.arch=null;if(typeof toast==="function")toast("✅ "+Q.msg,7000);
    ocnPaint();await reload()}
  catch(x){Q.busy=false;ocnFail("Neuložené: "+(x&&x.message||x)+" – skontroluj signál a skús znova.")}}
document.addEventListener("submit",e=>{const f=e.target;if(!f||f.id!=="ocnForm"||!OWN())return;e.preventDefault();e.stopPropagation();if(!Q.busy)ocnSave()},true);
document.addEventListener("change",e=>{const x=e.target;if(!x||!x.dataset||x.dataset.ocnk===undefined||!OWN())return;ocnSync();
  if(x.dataset.ocnk==="buyer"){const b=BY(Q.buyer);Q.site="";if(b){const S=b.sites||[];if(S.length===1)Q.site=S[0].n;if(!Q.com||!(b.coms||[]).includes(Q.com))Q.com=(b.coms||[]).length===1?b.coms[0]:Q.com}Q.err="";Q.msg="";ocnPaint();const n=document.querySelector('#ocnForm [data-ocnk="'+(Q.com?"price":"com")+'"]');if(n)n.focus()}
  else if(x.dataset.ocnk==="del"){if(Q.del!=="FCA"&&!Q.site){const b=BY(Q.buyer);if(b&&(b.sites||[]).length===1)Q.site=b.sites[0].n}ocnPaint()}},true);
document.addEventListener("input",e=>{const x=e.target;if(x&&x.dataset&&x.dataset.ocnk!==undefined)Q[x.dataset.ocnk]=x.value},true);
document.addEventListener("toggle",e=>{const d=e.target;if(!d||!d.dataset)return;if(d.dataset.ocnc){Q.open[d.dataset.ocnc]=d.open;return}
  if(d.dataset.ocnd==="list")Q.list=d.open;else if(d.dataset.ocnd==="arch"){Q.archOpen=d.open;if(d.open&&Q.arch===null&&!Q.archBusy)ocnArchLoad()}},true);
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-ocn]");if(!t||!OWN())return;e.preventDefault();e.stopPropagation();const a=t.dataset.ocn,id=+t.dataset.id;
  if(a==="mf"){Q.mf=true;Q.msg="";Q.err="";ocnPaint();const f=document.querySelector('#ocnForm [data-ocnk="buyer"]');if(f)setTimeout(()=>{try{f.focus({preventScroll:true});f.closest("#ocnSec").scrollIntoView({block:"start",behavior:"smooth"})}catch(x){}},120);return}
  if(a==="mfx"){Q.mf=false;Q.edit=null;Q.err="";if(D.form)D.form=false;ocnPaint();if(typeof renderStaff==="function")renderStaff();return}
  if(a==="trh"){window.ernteTrh();return}
  if(a==="go"){D.form=false;Q.mf=true;const go=()=>{let s=document.getElementById("ocnSec");if(!s)return false;if(s.dataset.mini==="1"&&s.classList.contains("ocnmini")){ocnPaint();s=document.getElementById("ocnSec")}s.scrollIntoView({block:"start",behavior:"smooth"});const f=s.querySelector('[data-ocnk="buyer"]');if(f)setTimeout(()=>{try{f.focus({preventScroll:true})}catch(x){}},400);return true};
    if(!go()){if(typeof TAB!=="undefined"&&TAB!=="home"&&TAB!=="price"){TAB="home";renderStaff()}let n=0;const w=()=>{if(go()||++n>25)return;setTimeout(w,150)};setTimeout(w,80)}return}
  if(a==="cancel"){Q.edit=null;Q.price="";Q.err="";ocnPaint();return}
  if(a==="ask"){Q.ask=id;ocnPaint();return}if(a==="nodel"){Q.ask=null;ocnPaint();return}
  if(a==="edit"){const o=(D.O||[]).find(x=>+x.id===id);if(!o)return;Q.buyer=o.buyer;Q.com=o.com;Q.del=o.del==="FCA"||o.del==="EXW"?"FCA":o.del==="DAP"?"DAP":"DDP";Q.site=o.site||"";Q.price=String(o.price).replace(".",",");Q.cur="EUR";Q.d=today();
    Q.edit={id:o.id,t:`${(BY(o.buyer)||{name:o.buyer}).name} · ${nm(o.com)} ${o.del}${o.site?" "+o.site:""} ${f0(+o.price)} €/t (${dk(o.d)})`};Q.err="";Q.msg="";ocnPaint();
    const s=document.getElementById("ocnForm");if(s){s.scrollIntoView({block:"start",behavior:"smooth"});const p=s.querySelector('[data-ocnk="price"]');if(p)setTimeout(()=>{try{p.focus({preventScroll:true});p.select()}catch(x){}},400)}return}
  if(a==="del"||a==="back"){t.disabled=true;t.textContent="⏳ Chvíľu…";
    try{const r=await sb.rpc(a==="del"?"sell_offer_off":"sell_offer_back",{p_id:id});if(r.error)throw new Error(r.error.message);if(r.data&&r.data.ok===false)throw new Error(r.data.err||"Nepodarilo sa.");
      Q.ask=null;Q.arch=null;Q.msg=a==="del"?"Cena zmazaná (je v archíve, dá sa vrátiť).":"Cena vrátená späť z archívu.";Q.err="";if(typeof toast==="function")toast("✅ "+Q.msg,4500);if(a==="back"&&Q.archOpen)ocnArchLoad();ocnPaint();await reload()}
    catch(x){t.disabled=false;t.textContent=a==="del"?"🗑️ Áno, zmazať":"↩️ Vrátiť späť";Q.err=(a==="del"?"Nezmazané: ":"Nevrátené: ")+(x&&x.message||x);Q.msg="";ocnPaint()}}},true);
// Cenník (iba Martin): sekcia hore (namiesto samotného tlačidla) – vloží sa raz, ak chýba; poradie pásov pod lištou rieši ernteTopOrder
function pBtn(){if(!OWN()||typeof TAB==="undefined"||TAB!=="price")return;const app=document.getElementById("app");if(!app||document.getElementById("ocnSec"))return;
  const d=document.createElement("div");d.innerHTML=window.sellAddHTML();const n=d.firstElementChild;if(!n)return;
  const a=app.querySelector(".hero")||app.querySelector("nav.tabs");if(a)a.after(n);else app.prepend(n)}
(function wBoot(){const app=document.getElementById("app");if(!app){setTimeout(wBoot,500);return}new MutationObserver(()=>{wSch();(window.ernteSoon||requestAnimationFrame)(()=>{try{pBtn()}catch(x){}})}).observe(app,{childList:true});wSch()})();
setInterval(()=>{if(OWN())wLoad()},10*60e3);
{const s=document.createElement("style");s.textContent=`.ocnmh{display:grid;gap:3px;min-width:0}.ocnmh small{opacity:.8;line-height:1.35;overflow-wrap:anywhere}.ocnmb{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.ocnmb button{min-height:48px;font-weight:700;white-space:normal;line-height:1.2}
.ocn{display:grid;gap:10px;min-width:0;border:1px solid rgba(94,234,212,.45)!important}.ocnh{display:grid;gap:4px;min-width:0}.ocnt{font-size:1.06rem;line-height:1.3}.ocnh small{opacity:.8;line-height:1.4;overflow-wrap:anywhere}
.ocnf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;min-width:0;margin:0}.ocnf label{display:grid;gap:4px;font-size:.8rem;font-weight:700;min-width:0}.ocnf .ocnw{grid-column:1/-1}
.ocnf select,.ocnf input{width:100%;min-width:0;min-height:46px;box-sizing:border-box}.ocnp{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;min-width:0}.ocnp select{width:auto;min-width:72px}
.ocnb{display:flex;flex-wrap:wrap;gap:8px}.ocnb button{flex:1 1 150px;min-height:48px;white-space:normal}
.ocnerr,.ocnok,.ocned{padding:10px 12px;border-radius:12px;line-height:1.4;overflow-wrap:anywhere;font-weight:700;font-size:.86rem}.ocnerr{background:rgba(255,107,129,.12);border:1px solid rgba(255,107,129,.65);color:#fecdd3}
.ocnok{background:rgba(94,234,212,.12);border:1px solid rgba(94,234,212,.6);color:#99f6e4}.ocned{background:rgba(255,207,90,.12);border:1px solid rgba(255,207,90,.6);color:#fde68a;display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ocned button{min-height:40px}
.ocnl{border-top:1px solid rgba(255,255,255,.08);padding-top:4px;min-width:0}.ocnl>summary{cursor:pointer;font-weight:800;min-height:44px;display:flex;align-items:center;list-style:none}.ocnl>summary::-webkit-details-marker{display:none}
.ocnc{border-top:1px solid rgba(255,255,255,.06);min-width:0}.ocnc>summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none;min-height:46px;padding:4px 0}.ocnc>summary::-webkit-details-marker{display:none}
.ocnc>summary>span{display:grid;min-width:0}.ocnc>summary small{opacity:.7;font-size:.74rem;overflow-wrap:anywhere}.ocns{text-align:right;font-size:.84rem;overflow-wrap:anywhere}.ocns b{display:block;font-size:1.02rem;color:#5eead4}
.ocnr{display:grid;gap:4px;padding:9px 11px;margin:6px 0;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);min-width:0}.ocnr.best{border:2px solid rgba(94,234,212,.7);background:rgba(94,234,212,.07)}.ocnr.old{opacity:.66}
.ocnrh{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}.ocnrh>b,.ocnrh>span{min-width:0;overflow-wrap:anywhere}.ocnr small{line-height:1.4;overflow-wrap:anywhere;opacity:.85}.ocnr em{font-style:normal;color:#ffcf5a}.ocnr em.ocnbest{color:#5eead4}
.ocna{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.ocna>span{flex:1 1 100%;font-size:.84rem;font-weight:700}.ocna button{flex:1 1 120px;min-height:44px}.ocna .ocnyes{border-color:rgba(255,107,129,.7)!important;color:#fecdd3}
html[data-theme=light] .ocnerr{color:#9f1239}html[data-theme=light] .ocnok{color:#0f766e}html[data-theme=light] .ocned{color:#92400e}html[data-theme=light] .ocns b,html[data-theme=light] .ocnr em.ocnbest{color:#0f766e}
.ocn,#ocnForm,#sForm{scroll-margin-top:96px}.ocnf select{padding-right:22px;text-overflow:ellipsis}
@media(max-width:520px){.ocnf .ocn2{grid-column:1/-1}}@media(max-width:330px){.ocnf{grid-template-columns:minmax(0,1fr)}}`;document.head.appendChild(s)}
{const s=document.createElement("style");s.textContent=`.swal.al{border-color:rgba(134,239,172,.6)!important;box-shadow:0 0 0 1px rgba(134,239,172,.35)}.swal .cnt{color:#86efac}.swr{padding:8px 0;border-top:1px solid rgba(255,255,255,.08);display:grid;gap:3px}
.swr .srh{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}.swr small{overflow-wrap:anywhere;line-height:1.4}.swr .ps{color:#86efac}.swr .ng{color:#fca5a5}.swr.nw{background:rgba(134,239,172,.06);border-radius:12px;padding:8px}.swn{opacity:.7}.swadd{margin:8px 0}
html[data-theme=light] .swr .ps,html[data-theme=light] .swal .cnt{color:#15803d}html[data-theme=light] .swr .ng{color:#b91c1c}
.srec .srt{display:block;font-size:1.05rem;margin-bottom:4px}.srec .s{margin:4px 0 8px}
.scom{border-top:1px solid rgba(255,255,255,.08);padding:8px 0}.scom summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none}.scom summary::-webkit-details-marker{display:none}
.snone>summary .sn small{white-space:normal}.snone>summary .sb{white-space:nowrap}.snone[open]>summary .sb{opacity:.5}.snin{padding-left:10px;border-left:2px solid rgba(255,255,255,.1);margin-top:6px}.snin .scom:first-child{border-top:0}.scom .sn{display:grid}.scom .sn small{opacity:.7;font-size:.78rem}.scom .sb{text-align:right;display:grid;font-size:.86rem}.scom .sb b{font-size:1.05rem}.sb.ps b,.srow.ps .srh span{color:#86efac}.sb.ng b,.srow.ng .srh span{color:#fca5a5}
.srow{display:grid;gap:2px;padding:7px 10px;margin:6px 0;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}.srow .srh{display:flex;justify-content:space-between;gap:8px}.srow small{opacity:.8;overflow-wrap:anywhere;line-height:1.4}
.srow em{color:#fcd34d;font-style:normal}.smiss{font-size:.8rem;opacity:.75;margin-top:4px}.smiss span{text-decoration:underline dotted}.smod{margin:10px 0}.snak{margin:10px 0}.snak>summary{cursor:pointer;font-weight:700}.snb{border-top:1px solid rgba(255,255,255,.08);padding:8px 0}.snb>summary{cursor:pointer;display:grid;gap:2px;list-style:none}.snb>summary::-webkit-details-marker{display:none}.snb>summary span{font-weight:800}.snb>summary small{opacity:.7}.snk{display:grid;gap:4px;padding:8px 10px;margin:6px 0;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);min-width:0}.snk.fwd{border-style:dashed;opacity:.85}.snkh{display:grid}.snkh small,.snkc{opacity:.8;overflow-wrap:anywhere;line-height:1.4}.snkg{display:grid;grid-template-columns:1fr 1fr;gap:6px}.snkg>span{display:grid;gap:1px;text-align:center;padding:6px;border-radius:10px;min-width:0}.snkg i{font-style:normal;font-size:.72rem;font-weight:700;opacity:.85}.snkg b{font-size:1.25rem}.snkg small{font-size:.68rem;opacity:.75;overflow-wrap:anywhere}.snkb{background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.6)}.snko{background:rgba(74,222,128,.14);border:2px solid rgba(74,222,128,.75)}.snko b{color:#86efac}.snkc.ng{color:#fca5a5;opacity:1}.snkc.ps{color:#86efac;opacity:1}.snkm,.snkn{font-size:.8rem;line-height:1.45;margin-top:6px;overflow-wrap:anywhere}.snkn{padding:8px 10px;border-radius:12px;background:rgba(165,243,252,.08);border:1px solid rgba(165,243,252,.35)}html[data-theme=light] .snko b,html[data-theme=light] .snkc.ps{color:#15803d}html[data-theme=light] .snkc.ng{color:#b91c1c}.smod summary{cursor:pointer;font-weight:700}
.stl{display:grid;gap:2px;margin-top:6px;text-align:left;font-size:.74rem;line-height:1.35}.stl small{display:block;overflow-wrap:anywhere;opacity:.9}.stl .ps b{color:#86efac}.stl .ng b{color:#fca5a5}.stl .sbest{background:rgba(74,222,128,.16);border:1px solid rgba(74,222,128,.6);border-radius:10px;padding:4px 6px}.stl .sbest i{display:block;font-style:normal;font-weight:800;color:#86efac;font-size:.7rem}
.stl .sworst{border:1px dashed rgba(251,146,60,.7);border-radius:10px;padding:4px 6px}.stl .sworst i{display:block;font-style:normal;font-weight:800;font-size:.7rem}.stl i.neg,.sbtag.neg{color:#fdba74!important}.srow.sworst{border:2px dashed rgba(251,146,60,.75)!important}
.srow.sbest{background:rgba(74,222,128,.14)!important;border:2px solid rgba(74,222,128,.75)!important}.sbtag{font-style:normal;font-weight:800;color:#86efac;font-size:.78rem}
html[data-theme=light] .stl .sbest i,html[data-theme=light] .sbtag{color:#15803d}
.stl .sbig{display:grid;gap:3px;text-align:center;padding:10px 8px;border-radius:14px;background:rgba(74,222,128,.14);border:2px solid rgba(74,222,128,.75)}
.stl .sbig.bad{background:rgba(251,146,60,.12);border:2px dashed rgba(251,146,60,.8)}
.stl .sbig i{font-style:normal;font-weight:800;font-size:.78rem;letter-spacing:.03em;color:#86efac}.stl .sbig.bad i{color:#fdba74}
.stl .sbig .sbn{font-size:1.02rem;line-height:1.25;overflow-wrap:anywhere}.stl .sbig .sbp{font-size:1.7rem;line-height:1.1;color:#86efac}.stl .sbig.bad .sbp{color:#fca5a5}
.stl .sbig small{font-size:.78rem;opacity:.9}.stl .sbig .sb100 b{font-size:.9rem;color:inherit}
.stl .srest{display:grid;gap:4px;margin-top:6px}.stl .srh{font-weight:700;opacity:.7;text-align:center}
.stl .sr{display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center;padding:6px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03)}
.stl .sr>b{font-size:.95rem;min-width:40px;text-align:center}.stl .sr.ps>b{color:#86efac}.stl .sr.ng>b{color:#fca5a5}.stl .sr span{display:grid;gap:1px;min-width:0;overflow-wrap:anywhere}.stl .sr small{opacity:.75;font-size:.72rem}
html[data-theme=light] .stl .sbig i,html[data-theme=light] .stl .sbig .sbp,html[data-theme=light] .stl .sr.ps>b{color:#15803d}html[data-theme=light] .stl .sr{border-color:rgba(0,0,0,.12);background:rgba(0,0,0,.03)}
.stl .stn{opacity:.65}.stnd summary{cursor:pointer;font-size:.74rem!important;font-weight:600;opacity:.8;list-style:none;padding:2px 0}.stnd summary::-webkit-details-marker{display:none}
.scoms{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}.scm{min-height:30px!important;padding:2px 9px!important;border-radius:999px!important;font-size:.74rem!important;opacity:.55}.scm.on{opacity:1;background:rgba(134,239,172,.2)!important;border-color:rgba(134,239,172,.6)!important}.smiss div{margin-top:3px}
.owrec{display:block;margin-top:4px;font-size:.78rem;font-weight:700}.owrec.ps{color:#86efac}.owrec.ng{color:#fca5a5}.sform{margin-top:8px}.sscan{display:grid;gap:6px;padding:12px;border-radius:16px;border:1px solid rgba(165,243,252,.4);background:linear-gradient(135deg,rgba(165,243,252,.12),rgba(139,92,246,.10))}.sscan small{opacity:.8}.sfile{cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.srows{display:grid;gap:8px}.srowf{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px 8px;padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)}.srowf .w{grid-column:1/-1}.sck{display:flex;align-items:center;gap:6px;grid-column:1/-1;font-weight:700}`;document.head.appendChild(s)}
})();

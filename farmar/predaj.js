// ===== 🏆 KDE PREDAŤ S NAJVYŠŠÍM ZISKOM (iba majiteľ) =====
// Ku každej našej zverejnenej nákupnej cene: všetci odberatelia (ponuky odberateľov, ponuky konkurencie, skutočné predaje z vážnych lístkov),
// cena posunutá podľa burzy (ak odberateľ ráta z burzy), mínus doprava z regiónu farmárov (rovnaký výpočet ako Kalkulačka) → zisk €/t.
// Mená odberateľov, modely a ponuky sú iba v databáze (sell_buyers, sell_offers – vidí iba majiteľ).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OWN=()=>typeof ROLE!=="undefined"&&ROLE==="owner"&&!(typeof FARMER!=="undefined"&&FARMER)&&!window.ERNTE_VIEWAS;
const f0=n=>n==null||!isFinite(n)?"–":Math.round(n).toLocaleString("sk-SK");
const sg=n=>(n>=0?"+":"−")+f0(Math.abs(n));
const dk=d=>/^\d{4}-\d\d-\d\d/.test(d||"")?(+d.slice(8,10))+". "+(+d.slice(5,7))+".":"";
const nm=c=>{try{const m=(typeof MK!=="undefined"?MK:[]).find(x=>x[0]===c);if(m)return m[1]}catch(x){}return c};
const age=d=>d?Math.floor((Date.now()-Date.parse(String(d).slice(0,10)+"T12:00:00"))/864e5):999;
const MAXAGE=21;
const D={B:null,O:[],K:[],T:[],mk:null,at:0,busy:false,err:"",form:false};
// burza pre komoditu (posun ponuky): repka, slnečnica → MATIF repka; obilniny → MATIF pšenica; kukurica → MATIF kukurica; sója → CBOT
const BZ={repka:"repka",lo:"repka",ho:"repka",psenica_p:"psenica_p",psenica_k:"psenica_p",jacmen_k:"psenica_p",jacmen_s:"psenica_p",kukurica:"kukurica",soja:"soja"};
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
  D.at=Date.now();D.busy=false;if(typeof TAB!=="undefined"&&TAB==="home"&&typeof renderStaff==="function")renderStaff()}

// všetky možnosti predaja pre komoditu
function options(com,buy){const out=[],B=D.B||[];
  const push=(b,siteName,site,del,price,d,src,extra)=>{const bz=extra&&extra.bz;const d0=del==="FCA"||del==="EXW"?0:dop(site);const net=d0==null?null:price-d0;
    out.push({b,siteName:siteName||(site&&site.n)||"",del,price,d,src,dop:d0,net,profit:net==null?null:net-buy,bz,age:age(d),term:extra&&extra.term||""})};
  // 1) ponuky odberateľov (posunuté s burzou, ak odberateľ ráta z burzy)
  const seen=new Set();
  for(const o of D.O){if(o.com!==com)continue;const k=o.buyer+"|"+(o.site||"")+"|"+o.del;if(seen.has(k))continue;seen.add(k);const b=B.find(x=>x.id===o.buyer);if(!b)continue;
    let p=+o.price,bz=null;if(b.float_burza&&o.bz_val!=null){const n=bzNow(o.bz_sym||BZ[com]);if(n){bz={d:n.v-(+o.bz_val),n:n.n};p+=bz.d}}
    push(b,o.site,siteOf(b,o.site)||((b.sites||[]).find(s=>s.n===o.site)),o.del,p,o.d,"ponuka odberateľa",{bz,term:o.period})}
  // 2) ponuky konkurencie (ich výkupná cena = za toľko by kúpili od nás)
  const KK=D.K.filter(x=>x.com===com&&+x.price>0&&age(x.d)<=MAXAGE&&!/nad\s*500/i.test(x.term||"")&&!/hamburg|z[aá]pad/i.test((x.who||"")+" "+(x.place||"")));
  for(const x of KK){const b=buyerOf(x.who);if(!b)continue;const del=String(x.del||"").toUpperCase()||"DAP",fca=del==="FCA"||del==="EXW",site=fca?{n:"FCA farma"}:siteOf(b,(x.place||"")+" "+(x.term||"")+" "+(x.who||""));
    const k=b.id+"|"+(site&&site.n||"")+"|"+del+"|"+(x.term||"");if(seen.has(k))continue;seen.add(k);
    let p=+x.price,bz=null;if(b.float_burza&&x.b!=null){const n=bzNow(BZ[com]);if(n){const np=n.v+(+x.b);bz={d:np-p,n:n.n};p=np}}
    push(b,site&&site.n,site,del,p,x.d,"ponuka (Konkurenčné ceny)",{bz,term:/odber\s*[0-9]/i.test(x.term||"")?x.term:""})}
  // 3) skutočné predaje z vážnych lístkov (Zúčtovanie odberateľa)
  const last={};for(const t of D.T){if(t.k!==com||!(+t.s>0))continue;const bn=t.b||"Odberateľ";if(!last[bn]||String(t.d)>String(last[bn].d))last[bn]=t}
  for(const bn in last){const t=last[bn],b=buyerOf(bn)||{id:"t:"+bn,name:bn,sites:[]},site=(b.sites||[])[0]||null;push(b,site&&site.n,site,"DAP",+t.s,t.d,"skutočný predaj (vážne lístky)",{})}
  return out.filter(o=>o.age<=Math.max(MAXAGE,o.src.startsWith("skutočný")?45:MAXAGE)).sort((a,b)=>(b.profit??-1e9)-(a.profit??-1e9))}
function missing(com,opts){const have=new Set(opts.map(o=>o.b.id));return (D.B||[]).filter(b=>(b.coms||[]).includes(com)&&!have.has(b.id))}
window.sellBest=function(com,buy){if(!OWN()||!D.B)return null;const o=options(com,buy).find(x=>x.profit!=null);return o||null};
window.sellBestLine=function(com,buy){if(!OWN())return "";if(!D.B){if(!D.busy&&Date.now()-D.at>60e3)load();return ""}const o=window.sellBest(com,buy);if(!o)return "";
  return `<span class="owrec ${o.profit>=0?"ps":"ng"}">🏆 ${E(o.b.name)}${o.siteName?" "+E(o.siteName):""} ${sg(o.profit)} €/t</span>`};

function row(o){return `<div class="srow ${o.profit==null?"":o.profit>=0?"ps":"ng"}"><div class="srh"><b>${E(o.b.name)}${o.siteName?" · "+E(o.siteName):""}</b><span>${o.profit==null?"doprava ?":sg(o.profit)+" €/t"}</span></div>
  <small>${E(o.del)} ${f0(o.price)} €/t${o.bz?` (s burzou ${o.bz.d>=0?"+":"−"}${f0(Math.abs(o.bz.d))}, ${E(o.bz.n)})`:""}${o.dop?` − doprava ${f0(o.dop)}`:o.del==="FCA"?" · odvoz zabezpečí odberateľ":""} = <b>${o.net==null?"?":f0(o.net)} €/t</b> · ${E(o.src)} ${dk(o.d)}${o.term?" · "+E(o.term):""}${o.age>10?` · <em>${o.age} dní stará</em>`:""}</small></div>`}
window.sellRecHTML=function(){if(!OWN())return "";if(!D.B){if(!D.busy)load();return `<div class="card srec"><div class="s">🏆 Počítam, kde predať s najvyšším ziskom…</div></div>`}
  if(Date.now()-D.at>5*60e3&&!D.busy)load();
  const P=((typeof STATE!=="undefined"&&STATE.prices)||[]).filter(p=>p.price!=null&&+p.price>0);const order=(typeof MK!=="undefined"?MK.map(m=>m[0]):[]);P.sort((a,b)=>order.indexOf(a.com)-order.indexOf(b.com));
  let h=`<div class="card srec"><b class="srt">🏆 Kde predať s najvyšším ziskom</b>${D.err?`<div class="s">${E(D.err)}</div>`:""}
   <div class="s">Zisk = cena odberateľa (posunutá s burzou, ak podľa nej ráta) − naša doprava z regiónu farmárov − naša zverejnená nákupná cena. Ponuky staršie ako ${MAXAGE} dní sa nepočítajú.</div>`;
  for(const p of P){const buy=+p.price,O=options(p.com,buy),best=O.find(o=>o.profit!=null),M=missing(p.com,O);
    h+=`<details class="scom"${best?"":" open"}><summary><span class="sn">${E(nm(p.com))}<small>nákup ${f0(buy)} €/t</small></span>${best?`<span class="sb ${best.profit>=0?"ps":"ng"}">${E(best.b.name)}${best.siteName?" "+E(best.siteName):""}<b>${sg(best.profit)} €/t</b></span>`:`<span class="sb">bez ponuky</span>`}</summary>
     ${O.length?O.slice(0,8).map(row).join(""):`<div class="s">Zatiaľ žiadna platná ponuka.</div>`}
     ${M.length?`<div class="smiss">Chýba ponuka: ${M.map(b=>`<span title="${E(b.model||"")}">${E(b.name)}</span>`).join(" · ")}</div>`:""}</details>`}
  h+=`<details class="smod"><summary>📚 Modely odberateľov – podľa čoho rátajú</summary>${(D.B||[]).map(b=>`<div class="srow"><b>${E(b.name)}</b>${(b.sites||[]).length?` <small>· ${(b.sites||[]).map(s=>E(s.n)+" ~"+f0(dop(s))+" €/t doprava").join(" · ")}</small>`:""}<small>${E(b.model||"")}</small></div>`).join("")}</details>`;
  h+=D.form?formHTML():`<div class="btns"><button type="button" class="lime" data-sform="1">➕ Vložiť ponuku odberateľa</button><button type="button" data-sref>↻ Prepočítať</button></div>`;
  return h+`</div>`};
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
    if(R.odberatel)D.form.buyer=(findBuyer(R.odberatel)||{name:R.odberatel}).name;if(/^\d{4}-\d\d-\d\d$/.test(R.datum||""))D.form.d=R.datum;
    D.form.rows=P.filter(x=>+x.cena>0).map(x=>newRow({com:COMS.includes(x.komodita)?x.komodita:"repka",site:x.miesto||"",del:["DDP","DAP","FCA"].includes(String(x.parita||"").toUpperCase())?String(x.parita).toUpperCase():"DDP",
      price:String(x.cena).replace(".",","),cur:String(x.mena||"EUR").toUpperCase()==="HUF"?"HUF":"EUR",period:x.obdobie||"",note:[x.pozn,R.burza].filter(Boolean).join(" · ")}));
    D.form.scan=`✓ Načítaných ${D.form.rows.length} cien – skontroluj a ulož.`}
  catch(x){D.form.scan="⚠️ "+(x&&x.message||x)}renderStaff()}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-sform],[data-sref],[data-sadd]");if(!t||!OWN())return;e.preventDefault();
  if(t.dataset.sref!==undefined){D.at=0;load();return}if(t.dataset.sadd!==undefined){syncForm();D.form.rows.push(newRow());renderStaff();return}
  D.form=t.dataset.sform==="1"?{buyer:"",rows:[newRow()]}:false;renderStaff();if(D.form)setTimeout(()=>{const f=document.getElementById("sForm");if(f)f.scrollIntoView({block:"start",behavior:"smooth"})},60)},true);
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
      const n=b.float_burza?bzNow(BZ[r.com]):null;return {buyer:b.id,com:r.com,site:String(r.site||"").trim()||null,del:r.del,price:p,period:String(r.period||"").trim()||null,d:F.d||null,note,bz_sym:n?BZ[r.com]:null,bz_val:n?n.v:null}});
    const q=await sb.from("sell_offers").insert(rows);if(q.error)throw new Error(q.error.message);
    toast(`✓ Uložené ${rows.length} ${rows.length===1?"cena":rows.length<5?"ceny":"cien"} – prepočítavam.`,4000);D.form=false;D.at=0;load()}
  catch(x){toast("Nepodarilo sa uložiť: "+(x&&x.message||x),7000)}finally{if(typeof busy==="function")busy(btn,false)}},true);
{const s=document.createElement("style");s.textContent=`.srec .srt{display:block;font-size:1.05rem;margin-bottom:4px}.srec .s{margin:4px 0 8px}
.scom{border-top:1px solid rgba(255,255,255,.08);padding:8px 0}.scom summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none}.scom summary::-webkit-details-marker{display:none}
.scom .sn{display:grid}.scom .sn small{opacity:.7;font-size:.78rem}.scom .sb{text-align:right;display:grid;font-size:.86rem}.scom .sb b{font-size:1.05rem}.sb.ps b,.srow.ps .srh span{color:#86efac}.sb.ng b,.srow.ng .srh span{color:#fca5a5}
.srow{display:grid;gap:2px;padding:7px 10px;margin:6px 0;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}.srow .srh{display:flex;justify-content:space-between;gap:8px}.srow small{opacity:.8;overflow-wrap:anywhere;line-height:1.4}
.srow em{color:#fcd34d;font-style:normal}.smiss{font-size:.8rem;opacity:.75;margin-top:4px}.smiss span{text-decoration:underline dotted}.smod{margin:10px 0}.smod summary{cursor:pointer;font-weight:700}
.owrec{display:block;margin-top:4px;font-size:.78rem;font-weight:700}.owrec.ps{color:#86efac}.owrec.ng{color:#fca5a5}.sform{margin-top:8px}.sscan{display:grid;gap:6px;padding:12px;border-radius:16px;border:1px solid rgba(165,243,252,.4);background:linear-gradient(135deg,rgba(165,243,252,.12),rgba(139,92,246,.10))}.sscan small{opacity:.8}.sfile{cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.srows{display:grid;gap:8px}.srowf{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:6px 8px;padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)}.srowf .w{grid-column:1/-1}.sck{display:flex;align-items:center;gap:6px;grid-column:1/-1;font-weight:700}`;document.head.appendChild(s)}
})();

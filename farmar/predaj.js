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
const siteOf=(b,txt)=>{const S=(b&&b.sites)||[];if(!S.length)return null;if(txt){const s=S.find(x=>x.rx&&new RegExp(x.rx,"i").test(txt));if(s)return s}return null};
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
  const KK=D.K.filter(x=>x.com===com&&+x.price>0&&age(x.d)<=MAXAGE&&!/nad\s*500/i.test(x.term||""));
  for(const x of KK){const b=buyerOf(x.who);if(!b)continue;const del=String(x.del||"").toUpperCase()||"DAP",fca=del==="FCA"||del==="EXW",site=fca?{n:"FCA farma"}:(siteOf(b,(x.place||"")+" "+(x.term||"")+" "+(x.who||""))||((b.sites||[])[0]||null));
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
function formHTML(){const B=D.B||[],b=B.find(x=>x.id===D.form.buyer)||B[0]||{},C=(typeof MK!=="undefined"?MK:[]);
  return `<form class="f sform" id="sForm"><div class="w t">➕ Ponuka odberateľa</div>
   <label>Odberateľ<select name="buyer" data-sbuy>${B.map(x=>`<option value="${E(x.id)}"${x.id===b.id?" selected":""}>${E(x.name)}</option>`).join("")}</select></label>
   <label>Komodita<select name="com">${C.map(m=>`<option value="${m[0]}">${E(m[1])}</option>`).join("")}</select></label>
   <label>Miesto<input name="site" list="sSites" placeholder="napr. Tállya"></label><datalist id="sSites">${(b.sites||[]).map(s=>`<option value="${E(s.n)}">`).join("")}</datalist>
   <label>Parita<select name="del"><option>DDP</option><option>DAP</option><option>FCA</option></select></label>
   <label>Cena €/t<input name="price" inputmode="decimal" required></label><label>Obdobie dodania<input name="period" placeholder="napr. 2026-11"></label>
   <label>Dátum ponuky<input type="date" name="d" value="${new Date().toISOString().slice(0,10)}"></label><label class="w">Poznámka<input name="note"></label>
   <div class="w s">Ak odberateľ ráta z burzy, uloží sa aj dnešná burza – ponuka sa potom sama posúva s burzou.</div>
   <div class="w btns"><button class="pri" type="submit">💾 Uložiť ponuku</button><button type="button" class="ghost" data-sform="0">Zrušiť</button></div></form>`}
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-sform],[data-sref]");if(!t||!OWN())return;e.preventDefault();
  if(t.dataset.sref!==undefined){D.at=0;load();return}D.form=t.dataset.sform==="1"?{buyer:(D.B&&D.B[0]||{}).id}:false;renderStaff()},true);
document.addEventListener("change",e=>{const x=e.target;if(!x.dataset||x.dataset.sbuy===undefined||!D.form)return;D.form.buyer=x.value;const l=document.getElementById("sSites"),b=(D.B||[]).find(y=>y.id===x.value);if(l&&b)l.innerHTML=(b.sites||[]).map(s=>`<option value="${E(s.n)}">`).join("")},true);
document.addEventListener("submit",async e=>{const f=e.target;if(f.id!=="sForm"||!OWN())return;e.preventDefault();e.stopPropagation();const d=new FormData(f),btn=f.querySelector("button[type=submit]");
  const price=+String(d.get("price")||"").replace(",",".").replace(/\s/g,"");if(!(price>0)){toast("Zadaj cenu.",4000);return}
  const com=String(d.get("com")),b=(D.B||[]).find(x=>x.id===d.get("buyer")),n=b&&b.float_burza?bzNow(BZ[com]):null;
  const row={buyer:String(d.get("buyer")),com,site:String(d.get("site")||"").trim()||null,del:String(d.get("del")),price,period:String(d.get("period")||"").trim()||null,d:d.get("d")||null,note:String(d.get("note")||"").trim()||null,bz_sym:n?BZ[com]:null,bz_val:n?n.v:null};
  if(typeof busy==="function")busy(btn,true);const r=await sb.from("sell_offers").insert(row);if(typeof busy==="function")busy(btn,false);
  if(r.error){toast("Nepodarilo sa uložiť: "+r.error.message,7000);return}toast("✓ Ponuka uložená – prepočítavam.",4000);D.form=false;D.at=0;load()},true);
{const s=document.createElement("style");s.textContent=`.srec .srt{display:block;font-size:1.05rem;margin-bottom:4px}.srec .s{margin:4px 0 8px}
.scom{border-top:1px solid rgba(255,255,255,.08);padding:8px 0}.scom summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none}.scom summary::-webkit-details-marker{display:none}
.scom .sn{display:grid}.scom .sn small{opacity:.7;font-size:.78rem}.scom .sb{text-align:right;display:grid;font-size:.86rem}.scom .sb b{font-size:1.05rem}.sb.ps b,.srow.ps .srh span{color:#86efac}.sb.ng b,.srow.ng .srh span{color:#fca5a5}
.srow{display:grid;gap:2px;padding:7px 10px;margin:6px 0;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}.srow .srh{display:flex;justify-content:space-between;gap:8px}.srow small{opacity:.8;overflow-wrap:anywhere;line-height:1.4}
.srow em{color:#fcd34d;font-style:normal}.smiss{font-size:.8rem;opacity:.75;margin-top:4px}.smiss span{text-decoration:underline dotted}.smod{margin:10px 0}.smod summary{cursor:pointer;font-weight:700}
.owrec{display:block;margin-top:4px;font-size:.78rem;font-weight:700}.owrec.ps{color:#86efac}.owrec.ng{color:#fca5a5}.sform{margin-top:8px}`;document.head.appendChild(s)}
})();

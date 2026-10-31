// ===== 🏷️ KONKURENČNÉ CENY – vložíš text ponuky (e-mail, SMS, WhatsApp), aplikácia ju rozpozná a porovná s našimi cenami =====
// Uloženie: kalk_store pricelist/konk {items:[{id,at,d,who,place,del,com,price,term,bz,bzn,b}]} – vidí iba majiteľ a ľudia s úpravou cenníka.
// Pri plodinách s burzou sa vypočíta báza (ich cena − burza v ten deň). Ponuky ADM na sóju spresňujú bázu automatického cenníka.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&!!ROLE&&!(typeof FARMER!=="undefined"&&FARMER)&&(ROLE==="owner"||(typeof can==="function"&&can("price_edit")));
const NM={repka:"Repka",lo:"LO slnečnica",ho:"HO slnečnica",soja:"Sója",psenica_p:"Pšenica potravinárska",psenica_k:"Pšenica kŕmna",jacmen_k:"Jačmeň kŕmny",jacmen_s:"Jačmeň sladovnícky",kukurica:"Kukurica",cirok:"Cirok"};
const nm=c=>{try{if(typeof MK!=="undefined"){const m=MK.find(x=>x[0]===c);if(m)return m[1]}}catch(x){}return NM[c]||c};
const HK={repka:"matif_repka",psenica_p:"matif_psenica",psenica_k:"matif_psenica",kukurica:"matif_kukurica",soja:"cbot_soja"};
const BZN={repka:"MATIF",psenica_p:"MATIF",psenica_k:"MATIF",kukurica:"MATIF",soja:"CBOT"};
const f0=n=>n==null||!isFinite(n)?"–":Math.round(n).toLocaleString("sk-SK");
const f2=n=>n==null||!isFinite(n)?"–":(+n).toLocaleString("sk-SK",{maximumFractionDigits:2});
const today=()=>new Date().toLocaleDateString("sv-SE");
const dk=d=>/^\d{4}-\d\d-\d\d$/.test(d||"")?(+d.slice(8))+". "+(+d.slice(5,7))+". "+d.slice(0,4):(d||"");
const fold=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
// ---- rozpoznanie plodín ----
const CROPS=[[/slne?cnic\w*\s*(ho\b|high)|\bho\s*slne?cnic|\bho\s*26/,"ho"],[/slne?cnic\w*\s*(cier|lo\b|klasick)|napraforgo/,"lo"],[/slne?cnic|sunflower/,"lo"],
  [/repk|rapeseed|\braps|repce/,"repka"],[/\bsoj|\bsoy|szoja|\bsoja/,"soja"],[/psenic\w*\s*(krm|feed)|takarmany\s*buza/,"psenica_k"],[/psenic|wheat|\bbuza/,"psenica_p"],
  [/kukuric|\bcorn\b|maize|kukorica/,"kukurica"],[/jacmen\w*\s*slad|malting|sorarpa/,"jacmen_s"],[/jacmen|barley|\barpa/,"jacmen_k"],[/cirok|sorghum|cirok/,"cirok"]];
function parse(txt){const t=String(txt||"");const f=fold(t);const hits=[];
  // všetky výskyty plodín (dlhšie zhody majú prednosť)
  const used=new Array(f.length).fill(false);
  for(const [re,c] of CROPS){const g=new RegExp(re.source,"g");let m;while(m=g.exec(f)){let free=true;for(let i=m.index;i<m.index+m[0].length;i++)if(used[i]){free=false;break}
      if(!free)continue;for(let i=m.index;i<m.index+m[0].length;i++)used[i]=true;hits.push({i:m.index,e:m.index+m[0].length,c})}}
  hits.sort((a,b)=>a.i-b.i);const rows=[];
  for(let k=0;k<hits.length;k++){const h=hits[k],end=k+1<hits.length?hits[k+1].i:t.length;let seg=t.slice(h.e,end);
    const lines=seg.split(/\n/);const L=[];for(const ln of lines){if(L.length&&!ln.trim())break;L.push(ln);if(L.length>=5)break}
    let first=true;for(const ln of L){const re=/(^|[^\d.,])(\d{3}(?:[.,]\d{1,2})?)(?![\d])\s*(€|eur|,-|e\b)?/gi;let m;
      while(m=re.exec(ln)){const v=parseFloat(m[2].replace(",","."));if(!(v>=80&&v<=999))continue;const after=ln.slice(m.index+m[0].length);
        if(!first&&!m[3]&&!/^\s*(fca|ddp|dap|exw|cpt|€|eur)/i.test(after))continue;first=false;
        const term=after.replace(/^[\s\-–,:]*/,"").replace(/^(fca|ddp|dap|exw|cpt)\s*\/?\s*/i,"").replace(/\s+/g," ").trim().slice(0,60);
        const del=(/\b(fca|ddp|dap|exw|cpt)\b/i.exec(after+" "+seg)||[])[1];const pl=(/\b(?:[Dd][Dd][Pp]|[Dd][Aa][Pp]|[Ff][Cc][Aa])\s+([A-ZÁ-Ž][A-Za-zÁ-ž-]+)/.exec(after+" "+seg)||[])[1];
        rows.push({com:h.c,price:v,term,del:del?del.toUpperCase():"",place:pl||""})}}}
  // dátum, firma
  const dm=/(\d{1,2})\.\s?(\d{1,2})\.\s?(20\d\d)/.exec(t);const d=dm?`${dm[3]}-${String(dm[2]).padStart(2,"0")}-${String(dm[1]).padStart(2,"0")}`:"";
  const fm=/\b(ADM Sečovce|ADM Hamburg|ADM|Interagros|Agro-?podnik(?:\s*\(?Tajba\)?)?|Tajba|Bunge|Cargill|Viterra|LDC|Louis Dreyfus|Glencore|Agrofert|Soufflet|InVivo)\b/i.exec(t);
  let who=fm?fm[1]:"";const sig=/pozdravom[,\s]*\n?\s*([^\n]+)/i.exec(t);if(sig){const p=sig[1].split(",").map(x=>x.trim()).filter(Boolean);if(p.length>1&&!who)who=p.slice(1).join(", ");if(who&&p.length>1)who=p.slice(1).join(", ")}
  const D=(rows.find(r=>r.del)||{}).del||"",P=(rows.find(r=>r.place)||{}).place||"";rows.forEach(r=>{if(!r.del)r.del=D;if(!r.place)r.place=P});
  who=who.replace(/\s+(tel|mob|t\.|e-?mail)\b.*$/i,"").replace(/[.,;\s]+$/,"");
  return {rows,d,who:who.slice(0,60)}}
window.konkParse=parse;
// ---- burza v deň ponuky ----
function st(){return window.autoCennik&&autoCennik.state||{}}
function bzAt(com,d){const k=HK[com];if(!k)return null;const A=st();const H=((A.mk&&A.mk.hist)||[]).filter(h=>h[k]!=null).sort((a,b)=>a.d.localeCompare(b.d));
  const x=H.filter(h=>h.d<=d).pop();if(x&&(Date.parse(d)-Date.parse(x.d))/864e5<=4)return {v:+x[k],d:x.d};
  if(d>=today()&&H.length){const l=H[H.length-1];return {v:+l[k],d:l.d}}return null}
// ---- údaje ----
const K={items:null,busy:false,prev:null,txt:"",d:"",who:"",open:false,err:"",buyers:{},sell:null,dop:""};
// PRÍKAZ MAJITEĽA (30. 10.): Konkurenčné ceny a možnosti predaja vidí iba Martin (MAIN_OK); 🛡️ Kontrola cien ostáva ako doteraz
const MAIN=()=>typeof window.MAIN_OK==="function"&&window.MAIN_OK()&&!window.ERNTE_VIEWAS;
const OWNR=()=>MAIN();
const bKey=w=>fold(w).replace(/[^a-z0-9]+/g," ").trim();
function buyerOfW(w){const k=bKey(w);if(!k)return null;for(const n in (K.buyers||{})){const b=bKey(n);if(b&&(k===b||k.includes(b)||b.includes(k)))return Object.assign({name:n},K.buyers[n])}return null}
const isSell=x=>!!(x&&(x.sell||buyerOfW(x.who)));
async function kget(){try{const r=await sb.from("kalk_store").select("data").eq("path","pricelist").eq("id","konk").maybeSingle();return r.error?undefined:(r.data?r.data.data:null)}catch(x){return undefined}}
async function kset(data){try{const cur=await kget();if(cur&&typeof cur==="object")data=Object.assign({},cur,data);const r=await sb.from("kalk_store").upsert({path:"pricelist",id:"konk",data},{onConflict:"path,id"});return !r.error}catch(x){return false}}
const FIRMS0=["ADM Sečovce","ADM Hamburg","Interagros","Agro-podnik (Tajba)","Poľsko"];
function firms(){const S=new Set(FIRMS0.concat(K.firms||[]));for(const x of (K.items||[]))if(x.who)S.add(x.who);return [...S].slice(0,40)}
async function load(){if(K.busy)return;K.busy=true;let v=await kget();K.busy=false;if(v===undefined){K.err="Konkurenčné ceny sa nepodarilo načítať.";K.items=K.items||[];paint();return}
  if(!v||!Array.isArray(v.items))v={items:[]};
  K.firms=Array.isArray(v.firms)?v.firms:[];K.buyers=(v.buyers&&typeof v.buyers==="object")?v.buyers:{};K.items=v.items;try{const [pp,pw]=await Promise.all([sb.rpc("price_pending",{}),sb.rpc("price_watch_get")]);K.pend=pp.error?null:pp.data;K.watch=pw.error?null:pw.data}catch(x){}K.err="";paint();if(!MAIN())paintGuard()}
// ---- vzhľad ----
function ourPrice(c){const p=((typeof STATE!=="undefined"&&STATE.prices)||[]).find(x=>x.com===c);return p&&p.price!=null?+p.price:null}
function offerHTML(L){const o=L[0];const rows=L.map(x=>{const our=ourPrice(x.com),df=our!=null?our-x.price:null;
    return `<div class="kkr"><div class="kkc"><b>${E(nm(x.com))}</b><small>${E(x.term||"")}</small></div><div class="kkv"><b>${f0(x.price)} €/t</b>${x.b!=null?`<small>${E(BZN[x.com]||"burza")} ${f0(x.bz)} ${x.b>=0?"+":"−"} ${f0(Math.abs(x.b))}</small>`:""}</div>
     <div class="kko ${df==null?"":df>=0?"up":"dn"}"><small>my</small><b>${our!=null?f0(our):"–"}</b>${df!=null?`<small>${df>=0?"+":"−"}${f0(Math.abs(df))}</small>`:""}</div></div>`}).join("");
  return `<div class="kko-card"><div class="kkh"><b>${E(o.who||"Konkurencia")}</b><small>${E(dk(o.d))}${o.del?" · "+E(o.del):""}${o.place?" "+E(o.place):""}</small><button type="button" class="kkdel" data-kkdel="${E(o.oid||o.id)}" aria-label="Zmazať ponuku">✕</button></div>${rows}</div>`}
function sellHTML(L){const o=L[0],bo=buyerOfW(o.who)||{},dp=+(o.dop!=null?o.dop:bo.dop)||0;
  const rows=L.map(x=>{const our=ourPrice(x.com),fca=+x.price,dap=fca+dp,pf=our!=null?fca-our:null;
    return `<div class="kkr"><div class="kkc"><b>${E(nm(x.com))}</b><small>${E(x.term||"")}</small></div><div class="kkv"><b>${f0(fca)} €/t</b><small>${/^(FCA|EXW)$/i.test(x.del||"FCA")?"FCA – odvezú si":E((x.del||"")+" "+(x.place||""))+(x.per?" · "+E(x.per):"")}</small>${dp?`<small>s našou dopravou <b>${f2(dap)}</b> (+${f2(dp)})</small>`:""}</div>
     <div class="kko ${pf==null?"":pf>=0?"up":"dn"}"><small>nákup my</small><b>${our!=null?f0(our):"–"}</b>${pf!=null?`<small>zisk ${pf>=0?"+":"−"}${f0(Math.abs(pf))}</small>`:""}</div></div>`}).join("");
  return `<div class="kko-card kksell"><div class="kkh"><b>💰 ${E(o.who||"Odberateľ")} – kupuje od nás</b><small>${E(dk(o.d))}</small><button type="button" class="kkdel" data-kkdel="${E(o.oid||o.id)}" aria-label="Zmazať ponuku">✕</button></div>${rows}</div>`}
function html(){let h=`<div class="card kkcard" id="kkCard"><h2>🏷️ Konkurenčné ceny</h2>
  <div class="s">Vlož text ponuky (e-mail, SMS, WhatsApp) – aplikácia rozpozná plodiny, ceny a termíny a porovná ich s našimi výkupnými cenami. Pri sóji, repke, pšenici a kukurici vypočíta ich bázu oproti burze. Ponuky <b>ADM na sóju</b> hneď spresnia automatický cenník (sója = CBOT + báza ADM).</div>
  <textarea id="kkTxt" rows="5" placeholder="Sem vlož skopírovaný text ponuky…">${E(K.txt)}</textarea>
  <div class="kkf"><label>Dátum ponuky<input type="date" id="kkD" value="${E(K.d||today())}"></label><label>Firma / trh<input id="kkW" list="kkFirms" value="${E(K.who)}" placeholder="vyber alebo napíš"></label><datalist id="kkFirms">${firms().map(f=>`<option value="${E(f)}">`).join("")}</datalist></div>
  ${OWNR()?(()=>{const bo=buyerOfW(K.who),on=K.sell===null?!!bo:K.sell;return `<label class="kksl"><input type="checkbox" id="kkSell"${on?" checked":""}> <span>💰 <b>Odberateľ – predávame im</b> (ich cena = za koľko kúpia od nás, nie konkurencia)</span></label>${on?`<label class="kksd">Keď odvezieme my, doplatia za dopravu €/t<input id="kkDop" inputmode="decimal" value="${E(K.dop!==""?K.dop:(bo&&bo.dop!=null?String(bo.dop).replace(".",","):""))}" placeholder="napr. 9,4"></label>`:""}`})():""}
  <div class="btns"><button type="button" class="pri" data-kkparse="1">🔎 Rozpoznať ceny</button></div>`;
  if(K.prev){h+=K.prev.rows.length?`<div class="kkprev"><b>Rozpoznané (${K.prev.rows.length}) – skontroluj a ulož:</b>${K.prev.rows.map((r,i)=>`<label class="kkpr"><input type="checkbox" data-kkp="${i}" checked> <span><b>${E(nm(r.com))}</b> ${f0(r.price)} €/t ${E(r.del)} ${E(r.term)}</span></label>`).join("")}
    <div class="btns"><button type="button" class="lime" data-kksave="1">💾 Uložiť a porovnať</button><button type="button" data-kkcancel="1">Zrušiť</button></div></div>`:`<div class="s">⚠️ V texte som nenašiel plodinu s cenou (napr. „Sója 480 € fca“). Skús vložiť celý text ponuky.</div>`}
  if(K.err)h+=`<div class="s">${E(K.err)}</div>`;
  const I=K.items;if(I===null)h+=`<div class="s">Načítavam…</div>`;
  else if(I.length){const G={},GS={};for(const x of I)if(isSell(x)){if(OWNR())(GS[x.oid||x.id]=GS[x.oid||x.id]||[]).push(x)}else(G[x.oid||x.id]=G[x.oid||x.id]||[]).push(x);
    const OS=Object.values(GS).sort((a,b)=>String(b[0].d).localeCompare(String(a[0].d)));
    if(OS.length)h+=`<div class="kksh">💰 Odberatelia – za koľko predáme <small>(nie je to konkurencia; vidí iba majiteľ)</small></div><div class="kkl">${OS.slice(0,K.open?30:2).map(sellHTML).join("")}</div><div class="kksh">🏷️ Konkurencia – výkup od farmárov</div>`;
    const O=Object.values(G).sort((a,b)=>String(b[0].d).localeCompare(String(a[0].d)));
    h+=`<div class="kkl">${O.slice(0,K.open?50:4).map(offerHTML).join("")}</div>${O.length>4?`<button type="button" class="kkmore" data-kkmore="1">${K.open?"Menej":"Všetky ponuky ("+O.length+")"}</button>`:""}
    <div class="s">„my“ = naša zverejnená výkupná cena FCA farma; ▲/▼ rozdiel oproti ich cene. Pozor na paritu (DDP = dovezené k nim, FCA = na farme).</div>`}
  return h+`</div>`}
function guardHTML(){const P=K.pend&&typeof K.pend==="object"?Object.entries(K.pend).filter(([c,x])=>!x.rejected):[],W=(K.watch&&K.watch.w)||[];
  if(!P.length&&!W.length)return `<div class="card kkg ok" id="kkGuard"><b>🛡️ Kontrola cien</b><div class="s">Automatické ceny sú v poriadku${K.watch&&K.watch.at?" · kontrola "+new Date(K.watch.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}):""}. Pokles ceny sa zverejní sám hneď. Zvýšenie sa nezverejní samo – príde sem na potvrdenie (zverejniť ho môže iba Martin).</div></div>`;
  return `<div class="card kkg" id="kkGuard"><b>🛡️ Kontrola cien</b>${P.map(([c,x])=>`<div class="kkp"><div><b>${E(nm(c))}: ${f0(x.old)} → ${f0(x.new)} €/t</b><small>${E(x.src||"")} · čaká od ${new Date(x.at).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}</small></div><div class="btns"><button type="button" class="lime" data-ppok="${E(c)}">✓ Zverejniť ${f0(x.new)}</button><button type="button" data-ppno="${E(c)}">✕ Nechať ${f0(x.old)}</button></div></div>`).join("")}
   ${W.map(t=>`<div class="kkw">⚠️ ${E(t)}</div>`).join("")}</div>`}
function paintGuard(){const old=document.getElementById("kkGuard"),kk=document.getElementById("kkCard")||document.querySelector(".acn-card")||document.getElementById("fPrice");if(!kk)return;const d=document.createElement("div");d.innerHTML=guardHTML();if(old)old.replaceWith(d.firstElementChild);else{const ac=document.querySelector(".acn-card");(ac||kk).before(d.firstElementChild)}}
document.addEventListener("click",async e=>{const b=e.target.closest&&e.target.closest("[data-ppok],[data-ppno]");if(!b||!OK())return;e.preventDefault();const c=b.dataset.ppok||b.dataset.ppno,ok=!!b.dataset.ppok;
  if(ok&&!confirm(`Zverejniť novú cenu ${nm(c)}? Hneď ju uvidia farmári.`))return;b.disabled=true;const r=await sb.rpc("price_pending",{p_com:c,p_apply:ok});b.disabled=false;
  if(r.error){toast("Nepodarilo sa: "+r.error.message,6000);return}K.pend=r.data;paintGuard();toast(ok?"✓ Cena zverejnená.":"Cena ostáva – zmena zamietnutá.",5000);if(ok&&typeof loadStaff==="function"){await loadStaff();try{renderStaff()}catch(x){}}},true);
function paint(force){if(typeof TAB==="undefined"||TAB!=="price"||!OK()||!MAIN())return;const app=document.getElementById("app");if(!app)return;
  const old=document.getElementById("kkCard");if(old){const ae=document.activeElement;if(!force&&old.contains(ae)&&ae&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName)&&ae.type!=="checkbox")return;const d=document.createElement("div");d.innerHTML=html();old.replaceWith(d.firstElementChild);return}
  const anchor=document.getElementById("chHist")||document.getElementById("fPrice");if(!anchor)return;const d=document.createElement("div");d.innerHTML=html();
  if(anchor.id==="chHist")anchor.before(d.firstElementChild);else anchor.after(d.firstElementChild)}
function inject(){if(typeof TAB==="undefined"||TAB!=="price"||!OK())return;if(!MAIN()){const o=document.getElementById("kkCard");if(o)o.remove();if(K.items===null&&!K.busy)load();else if(!document.getElementById("kkGuard")&&K.items!==null)paintGuard();return}if(!document.getElementById("kkCard")){paint();if(K.items===null)load()}if(!document.getElementById("kkGuard")&&K.items!==null)paintGuard()}
document.addEventListener("input",e=>{const t=e.target;if(!t)return;if(t.id==="kkTxt")K.txt=t.value;else if(t.id==="kkW")K.who=t.value;else if(t.id==="kkD")K.d=t.value;else if(t.id==="kkDop")K.dop=t.value});
document.addEventListener("change",e=>{if(e.target&&e.target.id==="kkD")K.d=e.target.value;if(e.target&&e.target.id==="kkSell"){K.sell=e.target.checked;paint(true)}if(e.target&&e.target.id==="kkW"){K.who=e.target.value;if(K.sell===null)paint(true)}});
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-kkparse],[data-kksave],[data-kkcancel],[data-kkdel],[data-kkmore]");if(!t||!OK())return;e.preventDefault();
  if(t.dataset.kkparse){const p=parse(K.txt);if(p.d&&!K.d)K.d=p.d;if(p.d)K.d=p.d;if(p.who&&!K.who)K.who=p.who;K.prev=p;paint(true);return}
  if(t.dataset.kkcancel){K.prev=null;paint(true);return}
  if(t.dataset.kkmore){K.open=!K.open;paint(true);return}
  if(t.dataset.kkdel){if(!confirm("Zmazať túto ponuku z porovnania?"))return;const id=t.dataset.kkdel;const v=await kget();const L=((v&&v.items)||K.items||[]).filter(x=>(x.oid||x.id)!==id);
    if(await kset({items:L,firms:(v&&v.firms)||K.firms||[]})){K.items=L;paint(true);try{autoCennik.run(true)}catch(x){}}else toast("Zmazanie zlyhalo.",5000);return}
  if(t.dataset.kksave){const P=K.prev;if(!P)return;const sel=[...document.querySelectorAll("[data-kkp]")].filter(x=>x.checked).map(x=>P.rows[+x.dataset.kkp]);if(!sel.length){toast("Vyber aspoň jednu cenu.");return}
    const d=K.d||P.d||today(),who=(K.who||P.who||"Konkurencia").trim(),oid="k"+Date.now().toString(36),at=new Date().toISOString();
    const SELL=OWNR()&&(K.sell===null?!!buyerOfW(who):K.sell),DOP=SELL?(+String(K.dop!==""?K.dop:((buyerOfW(who)||{}).dop??"")).replace(",",".")||0):0;
    if(SELL&&who==="Konkurencia"){toast("Zadaj názov odberateľa (Firma / trh).",5000);return}
    const add=sel.map((r,i)=>{const bz=bzAt(r.com,d);const o={id:oid+"-"+i,oid,at,d,who,place:r.place,del:SELL?"FCA":r.del,com:r.com,price:r.price,term:r.term,bz:bz?bz.v:null,bzn:bz?(BZN[r.com]||"")+" "+dk(bz.d):"",b:bz?Math.round((r.price-bz.v)*100)/100:null};if(SELL){o.sell=true;o.dop=DOP}return o});
    t.disabled=true;const v=await kget();const L=((v&&v.items)||[]).concat(add).slice(-400);const nb=Object.assign({},(v&&v.buyers)||K.buyers||{});if(SELL){const ex=buyerOfW(who);nb[ex?ex.name:who]={dop:DOP}}
    const ok=await kset({items:L,firms:(v&&v.firms)||K.firms||[],buyers:nb});t.disabled=false;
    if(!ok){toast("Uloženie zlyhalo – skús znova.",6000);return}K.items=L;try{if(window.autoCennik&&autoCennik.state)autoCennik.state.konk={items:L}}catch(x){}K.buyers=nb;K.prev=null;K.txt="";K.who="";K.d="";K.sell=null;K.dop="";paint(true);
    if(SELL){try{const r=await sb.rpc("konk_sell_offer",{p_who:who,p_rows:add.map(x=>({com:x.com,price:x.price,term:x.term})),p_dop:DOP,p_d:d});if(r.error)throw r.error;toast("💰 Uložené ako ponuka odberateľa – započíta sa do „Kde predať“ (FCA aj s našou dopravou).",7000)}catch(x){toast("Do „Kde predať“ sa nepodarilo zapísať: "+(x.message||x),7000)}}
    const noBz=add.filter(x=>HK[x.com]&&x.b==null).length;toast(`✓ Uložené ${add.length} ${add.length===1?"cena":add.length<5?"ceny":"cien"} – porovnanie je nižšie.${noBz?" Pri "+noBz+" chýba burza z toho dňa (báza sa nepočíta).":""}`,7000);
    if(/interagros/i.test(who)){try{await sb.rpc("ia_run");await autoCennik.run(true);toast("🤖 Repka, kukurica a LO slnečnica prepočítané: Interagros − 10 €.",6000)}catch(x){}}
    if(add.some(x=>x.com==="soja"&&/adm/i.test(who))){try{await sb.rpc("soja_adm_run");await autoCennik.run(true);toast("🤖 Báza ADM pre sóju prepočítaná podľa novej ponuky.",6000)}catch(x){}}}},true);
{const s=document.createElement("style");s.textContent=`.kkcard h2{margin:0 0 6px;font-size:1.05rem}.kkcard textarea{width:100%;box-sizing:border-box;margin:8px 0;min-height:110px;font:inherit}
.kkf{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.kkf label{display:flex;flex-direction:column;gap:4px;min-width:0}
.kkprev{margin:10px 0;padding:10px;border-radius:14px;background:rgba(182,255,59,.08);border:1px solid rgba(182,255,59,.3);display:grid;gap:6px}
.kkpr{display:flex;gap:8px;align-items:flex-start;flex-direction:row}.kkpr input{width:20px;min-height:20px;flex-shrink:0}.kkpr span{overflow-wrap:anywhere}
.kkl{display:grid;gap:10px;margin-top:10px}.kko-card{padding:10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);display:grid;gap:6px}
.kkh{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px}.kkh b{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}.kkh small{opacity:.75}
.kkdel{min-height:32px!important;min-width:32px;padding:0 8px!important;border-radius:50%!important;margin-left:auto}
.kksh{margin:12px 0 0;font-weight:800}.kksh small{font-weight:500;opacity:.7}.kksell{border-color:rgba(74,222,128,.4)!important;background:rgba(74,222,128,.06)!important}.kksl{display:flex!important;flex-direction:row!important;gap:8px;align-items:flex-start;margin:8px 0}.kksl input{width:20px;min-height:20px;flex-shrink:0}.kksd{display:flex;flex-direction:column;gap:4px;margin:0 0 8px}
.kkr{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,.8fr);gap:8px;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,.07)}
.kkc,.kkv,.kko{display:flex;flex-direction:column;min-width:0}.kkc small,.kkv small,.kko small{font-size:.74rem;opacity:.75;overflow-wrap:anywhere}.kkv{text-align:right}.kko{text-align:right}
.kko.up b,.kko.up small:last-child{color:#4ade80}.kko.dn b,.kko.dn small:last-child{color:#f87171}.kkmore{margin-top:8px}.kkg{border-color:rgba(250,204,21,.5)!important}.kkg.ok{border-color:rgba(74,222,128,.35)!important}.kkg>b{display:block;margin-bottom:6px}.kkp{display:grid;gap:6px;padding:8px 0;border-top:1px solid rgba(255,255,255,.08)}.kkp small{display:block;opacity:.75;overflow-wrap:anywhere}.kkw{padding:6px 0;color:#fde68a;overflow-wrap:anywhere}`;document.head.appendChild(s)}
let q=0;const sch=()=>{if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{inject()}catch(x){}})};
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch()}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();

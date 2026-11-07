// ===== ERNTE · 🤝 SPOLUPRÁCA S ODBERATEĽMI + VZORY ZMLÚV PRE FARMÁROV (7. 11. 07:15 PRÍKAZ MAJITEĽA) =====
// 1) Obchody → 🤝 Spolupráca s odberateľmi (IBA Martin): pri každom odberateľovi návrh podmienok spolupráce (Claude predvyplní z modelu
//    odberateľa), ➕ Nový návrh spolupráce, 💾 / 📄 návrh pre odberateľa / ✅ Schváliť / ✕ Zamietnuť / ⏹ Ukončiť.
// 2) Po ✅ vznikne vzor kúpnej zmluvy pre farmárov (bez mena odberateľa): 👁️ Prečítať, ✏️ upraviť, ✅ Schváliť vzor.
// 3) Pri zmluve farmára (Nový obchod, 🤝 Uzatvoriť obchod a pri každej zmluve v Obchodoch) skrytý výber „🏭 Kam to pôjde“ – vidí Martin
//    a obchodník s prístupom k obchodom, nikdy farmár. Zmluva sa prispôsobí podmienkam vzoru; ručne sa dajú zmeniť.
// Vlhkosť, nečistoty a zrážky za čistenie / sušenie ostávajú podľa zúčtovania ERNTE (zmluva a zúčtovanie rátajú rovnako).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const isF=()=>typeof FARMER!=="undefined"&&!!FARMER;
const MAIN=()=>!isF()&&typeof window.MAIN_OK==="function"&&window.MAIN_OK()&&!window.ERNTE_VIEWAS;
const TEAM=()=>!isF()&&typeof ROLE!=="undefined"&&(ROLE==="owner"||(typeof can==="function"&&can("deals")))&&!window.ERNTE_VIEWAS;
const nm=c=>{try{const m=(typeof MK!=="undefined"?MK:[]).find(x=>x[0]===c);if(m)return m[1]}catch(x){}return c};
const COMS=()=>(typeof MK!=="undefined"&&MK.length?MK.map(m=>m[0]):["repka","lo","ho","soja","psenica_p","psenica_k","jacmen_k","jacmen_s","kukurica","cirok"]);
const tst=(m,t)=>{if(typeof toast==="function")toast(m,t||4500)};
const ST={L:null,at:0,busy:false,err:"",V:null,M:null,vat:0,vbusy:false,sh:null};
const SPS={navrh:["📝","návrh – čaká na teba"],schvalena:["✅","dohodnutá spolupráca"],zamietnuta:["✕","zamietnutá"],ukoncena:["⏹","ukončená"]};
const VZS={navrh:["📝","vzor – na prečítanie a schválenie"],schvaleny:["✅","vzor schválený – používa sa pri zmluvách"],archiv:["🗄️","archív"]};
async function load(force){if(!MAIN()||ST.busy||typeof sb==="undefined")return;if(!force&&ST.L&&Date.now()-ST.at<120e3)return;ST.busy=true;
  try{const r=await sb.rpc("ospl_list");if(r.error)ST.err=/ospl_list/.test(r.error.message)?"Zapne sa po aktualizácii databázy (pár minút).":r.error.message;else{ST.L=r.data||{};ST.err=""}}
  catch(x){ST.err=String(x&&x.message||x)}ST.at=Date.now();ST.busy=false;paint();homeLink()}
async function loadV(force){if(!TEAM()||ST.vbusy||typeof sb==="undefined")return;if(!force&&ST.V&&Date.now()-ST.vat<120e3)return;ST.vbusy=true;
  try{const [a,b]=await Promise.all([sb.rpc("ospl_vzory"),sb.rpc("deal_vzor_map")]);if(!a.error)ST.V=a.data||[];if(!b.error)ST.M=b.data||{}}catch(x){}
  ST.vat=Date.now();ST.vbusy=false;sch()}

// ---------- karta v Obchodoch (IBA Martin) ----------
function cardHTML(){const L=ST.L;if(!L)return `<section class="card ospl" id="osplCard" data-nosec><h2>🤝 Spolupráca s odberateľmi</h2><div class="s">${ST.err?"⚠️ "+E(ST.err):"⏳ Načítavam…"}</div></section>`;
  const B=L.buyers||[],S=L.spol||[],V=L.vzory||[],U=L.pouzite||{};
  const rows=B.map(b=>{const s=S.filter(x=>x.buyer===b.id),sa=s.find(x=>x.status==="schvalena")||s.find(x=>x.status==="navrh")||s[0],v=V.filter(x=>x.buyer===b.id),vs=v.find(x=>x.status==="schvaleny"),vn=v.find(x=>x.status==="navrh");
    const st=sa?SPS[sa.status]:null,ch=[];
    if(st)ch.push(`<span class="osc s-${E(sa.status)}">${st[0]} ${E(st[1])}</span>`);else ch.push(`<span class="osc">— bez návrhu</span>`);
    if(vs)ch.push(`<span class="osc s-schvalena">📄 vzor v${E(vs.verzia)} schválený${U[vs.id]?` · ${E(U[vs.id])} zml.`:""}</span>`);
    if(vn)ch.push(`<span class="osc s-navrh">📄 vzor v${E(vn.verzia)} na schválenie</span>`);
    return `<div class="osr"><div class="osh"><b>${E(b.name)}</b><small>${(b.coms||[]).map(c=>E(nm(c))).join(" · ")||"bez komodít"}</small></div>
      <div class="oschips">${ch.join("")}</div>
      <div class="osa">${sa?`<button type="button" data-osp="open" data-id="${E(sa.id)}">📝 Podmienky spolupráce</button>`:""}${vn||vs?`<button type="button" data-osp="vzor" data-id="${E((vn||vs).id)}">📄 Vzor zmluvy pre farmárov</button>`:""}
       <button type="button" class="${sa?"":"lime"}" data-osp="new" data-b="${E(b.id)}">➕ Nový návrh spolupráce</button></div></div>`}).join("");
  const nn=S.filter(x=>x.status==="navrh").length,vv=V.filter(x=>x.status==="navrh").length;
  return `<section class="card ospl" id="osplCard" data-nosec><h2>🤝 Spolupráca s odberateľmi · vzory zmlúv pre farmárov</h2>
   <div class="s">1️⃣ podmienky spolupráce s odberateľom (návrh pripravil Claude z jeho modelu) → 2️⃣ ✅ schváliš → 3️⃣ vznikne vzor kúpnej zmluvy pre farmárov – prečítaš, upravíš, ✅ schváliš → 4️⃣ pri zmluve farmára ty alebo obchodník vyberiete <b>🏭 Kam to pôjde</b> a zmluva sa prispôsobí sama. Farmár meno odberateľa nikdy nevidí.</div>
   ${nn||vv?`<div class="osw">📝 Čaká na teba: ${nn?`${nn} ${nn===1?"návrh spolupráce":nn<5?"návrhy spolupráce":"návrhov spolupráce"}`:""}${nn&&vv?" · ":""}${vv?`${vv} ${vv===1?"vzor zmluvy":vv<5?"vzory zmlúv":"vzorov zmlúv"}`:""}</div>`:""}
   ${rows||`<div class="s">Žiadni aktívni odberatelia.</div>`}</section>`}
function paint(){if(!MAIN()||typeof TAB==="undefined"||TAB!=="deals")return;const app=document.getElementById("app");if(!app)return;
  const d=document.createElement("div");d.innerHTML=cardHTML();const n=d.firstElementChild,old=document.getElementById("osplCard");
  if(old){if(old.innerHTML===n.innerHTML)return;old.replaceWith(n);return}
  const a=app.querySelector("#mzgCard")||app.querySelector(".carch")||app.querySelector(".hrow");if(a)a.after(n);else app.appendChild(n)}

// ---------- okno (podmienky spolupráce / vzor zmluvy / zmluva farmára) ----------
function sheet(html){let m=document.getElementById("osplSheet");if(!m){m=document.createElement("div");m.id="osplSheet";m.className="ospsh";document.body.appendChild(m)}
  const top=m.querySelector(".ospbox")?m.querySelector(".ospbox").scrollTop:0;m.innerHTML=`<div class="ospbox" role="dialog" aria-modal="true">${html}</div>`;if(ST.keep)m.querySelector(".ospbox").scrollTop=top;ST.keep=false}
function close(){const m=document.getElementById("osplSheet");if(m)m.remove();ST.sh=null}
const hdr=t=>`<div class="osph"><button type="button" class="ospx" data-osp="close">← Späť</button><b>${t}</b><button type="button" class="ospx ospc" data-osp="close" aria-label="Zavrieť">✕</button></div>`;
const fld=(k,l,v,o)=>{o=o||{};const id="osf_"+k.replace(/[^a-z0-9_]/gi,"_");if(o.ta)return `<label class="${o.w?"osw1":""}">${l}<textarea id="${id}" data-osk="${E(k)}" rows="${o.rows||3}"${o.ph?` placeholder="${E(o.ph)}"`:""}>${E(v??"")}</textarea>${o.h?`<small>${o.h}</small>`:""}</label>`;
  if(o.sel)return `<label>${l}<select id="${id}" data-osk="${E(k)}">${o.sel.map(x=>`<option value="${E(x[0])}"${String(v)===String(x[0])?" selected":""}>${E(x[1])}</option>`).join("")}</select></label>`;
  if(o.cb)return `<label class="oscb"><input type="checkbox" id="${id}" data-osk="${E(k)}"${v?" checked":""}> ${l}</label>`;
  return `<label class="${o.w?"osw1":""}">${l}<input id="${id}" data-osk="${E(k)}" value="${E(v??"")}"${o.num?' inputmode="decimal"':""}${o.ph?` placeholder="${E(o.ph)}"`:""}>${o.h?`<small>${o.h}</small>`:""}</label>`};
const bname=id=>{const b=((ST.L&&ST.L.buyers)||[]).find(x=>x.id===id);return b?b.name:id};
// podmienky spolupráce
function spolHTML(s){const p=s.p||{},K=Array.isArray(p.koms)?p.koms:[],Q=p.kvalita||{},st=SPS[s.status]||["",""];
  return hdr(`🤝 ${E(bname(s.buyer))}`)+`<div class="ospst s-${E(s.status)}">${st[0]} ${E(st[1])}${s.src==="claude"?" · návrh pripravil Claude":""}${s.ok_at?" · schválené "+E(new Date(s.ok_at).toLocaleDateString("sk-SK")):""}</div>
   <form class="ospf" id="ospForm" data-sid="${E(s.id)}" autocomplete="off">
    ${fld("nazov","Názov spolupráce",s.nazov,{w:1})}
    <div class="osw1"><span class="osl">Komodity</span><div class="oskm">${COMS().map(c=>`<button type="button" class="oskb${K.includes(c)?" on":""}" data-oskom="${E(c)}">${E(nm(c))}</button>`).join("")}</div></div>
    ${fld("parita","Parita",p.parita,{sel:[["FCA","FCA – odvoz od farmára zabezpečí odberateľ"],["DAP","DAP – dovezieme k odberateľovi"],["DDP","DDP – dovezieme, clo a dane naše"],["CPT","CPT – doprava zaplatená"]]})}
    ${fld("miesto","Miesto dodania",p.miesto)}
    ${fld("doprava","Doprava",p.doprava)}
    ${fld("cena","Cena",p.cena,{sel:[["burza","burza + báza (fixácia pri kontrakte)"],["cennik","ich cenník / ponuka, pevná na kontrakt"],["pevna","pevná cena na celé obdobie"]]})}
    ${fld("cena_txt","Cena – podrobne",p.cena_txt,{ta:1,w:1,rows:2})}
    ${fld("platba","Platba (dní od faktúry)",p.platba,{num:1})}
    ${fld("tol","Tolerancia množstva ± %",p.tol,{num:1})}
    ${fld("mnozstvo","Množstvo (t, obdobie)",p.mnozstvo,{ph:"napr. 2 000 t / mesiac"})}
    ${fld("platnost","Platnosť do",p.platnost)}
    ${fld("vazenie","Váženie a rozbory",p.vazenie,{ta:1,w:1,rows:2})}
    ${fld("reklam","Reklamácia (prac. dní)",p.reklam,{num:1})}
    ${fld("lab","Rozhodcovské laboratórium",p.lab)}
    <div class="osw1"><span class="osl">Kvalita podľa komodít</span>${K.length?K.map(c=>{const q=Q[c]||{};return `<div class="osq"><b>${E(nm(c))}</b>
       ${fld("kv."+c+".vlh","Vlhkosť max %",q.vlh,{num:1})}${fld("kv."+c+".nec","Nečistoty max %",q.nec,{num:1})}${fld("kv."+c+".ine","Ďalšie parametre (oddeľ bodkočiarkou)",q.ine,{ta:1,w:1,rows:2,h:"napr. bielkoviny v sušine min. 38 %; Non-GMO"})}</div>`}).join(""):`<div class="s">Vyber komodity vyššie.</div>`}</div>
    ${fld("zrazky","Zrážky za kvalitu",p.zrazky,{ta:1,w:1,rows:3})}
    ${fld("cert","Certifikáty",p.cert,{w:1})}
    ${fld("iscc","Udržateľný tovar ISCC EU povinný (farmár musí podpísať samohodnotenie pred dodávkou)",!!p.iscc,{cb:1})}
    ${fld("pozn","Poznámka",p.pozn,{ta:1,w:1,rows:2})}
    ${fld("text","Sprievodný text pre odberateľa (do e-mailu / PDF)",s.text||"",{ta:1,w:1,rows:4,h:"Nič sa neodošle samo – PDF návrhu si pošleš sám."})}
    <div class="osw1 ospmsg" id="ospMsg"></div>
    <div class="osw1 ospb"><button class="pri" type="submit">💾 Uložiť podmienky</button><button type="button" data-osp="pdf" data-id="${E(s.id)}">📄 Návrh pre odberateľa (PDF)</button>
     ${s.status==="navrh"?`<button type="button" class="lime" data-osp="ok" data-id="${E(s.id)}">✅ Schváliť spoluprácu → vzor zmluvy</button><button type="button" data-osp="no" data-id="${E(s.id)}">✕ Zamietnuť</button><button type="button" data-osp="del" data-id="${E(s.id)}">🗑️ Zmazať návrh</button>`:""}
     ${s.status==="schvalena"?`<button type="button" class="lime" data-osp="ok" data-id="${E(s.id)}">🔄 Prepočítať vzor zmluvy z podmienok</button><button type="button" data-osp="end" data-id="${E(s.id)}">⏹ Ukončiť spoluprácu</button>`:""}
     ${s.status==="zamietnuta"||s.status==="ukoncena"?`<button type="button" data-osp="reopen" data-id="${E(s.id)}">↩️ Vrátiť do návrhu</button>`:""}</div>
   </form>`}
function readSpol(f,s){const p=JSON.parse(JSON.stringify(s.p||{}));const num=v=>{const n=parseFloat(String(v).replace(",","."));return Number.isFinite(n)?n:null};
  f.querySelectorAll("[data-osk]").forEach(x=>{const k=x.dataset.osk,v=x.type==="checkbox"?x.checked:x.value;if(k==="nazov"||k==="text")return;
    if(k.startsWith("kv.")){const [,c,f2]=k.split(".");p.kvalita=p.kvalita||{};p.kvalita[c]=p.kvalita[c]||{};p.kvalita[c][f2]=f2==="ine"?v:num(v);return}
    p[k]=["platba","tol","reklam"].includes(k)?num(v):v});
  return {p,nazov:(f.querySelector('[data-osk="nazov"]')||{}).value||"",text:(f.querySelector('[data-osk="text"]')||{}).value||""}}
// vzor zmluvy pre farmárov
function vzorHTML(v,ctx){const t=v.t||{},K=ctx.koms||Object.keys(t.x||{}),st=VZS[v.status]||["",""];
  return hdr(ctx.title)+`${ctx.st!==false?`<div class="ospst s-${v.status==="schvaleny"?"schvalena":"navrh"}">${st[0]} ${E(st[1])} · verzia ${E(v.verzia||1)}</div>`:""}
   <div class="osinfo">🔒 V zmluve pre farmára sa meno odberateľa NIKDY neuvádza. Vlhkosť, nečistoty a zrážky za čistenie / sušenie ostávajú podľa zúčtovania ERNTE (Príloha 1) – zmluva a zúčtovanie rátajú rovnako.</div>
   ${ctx.pre||""}
   <form class="ospf" id="ospVzor" autocomplete="off">
    ${fld("miesto","III.1 Miesto plnenia",t.miesto,{w:1,ph:"FCA sklady Dodávateľa"})}
    ${fld("vazenie","III.3 Odovzdanie, váženie a kvalita",t.vazenie,{ta:1,w:1,rows:3,ph:"prázdne = štandardné znenie zmluvy ERNTE"})}
    ${fld("preprava","III.4 Nakládka a preprava",t.preprava,{ta:1,w:1,rows:3,ph:"prázdne = štandardné znenie zmluvy ERNTE"})}
    ${fld("lab","III.7 Rozhodcovské laboratórium",t.lab,{w:1,ph:"SGS Slovakia spol. s r. o. Košice"})}
    ${fld("platba","V.2 Platba farmárovi (dní)",t.platba??14,{num:1})}
    ${fld("tol","VI.4 Tolerancia ± %",t.tol??5,{num:1})}
    ${fld("vyzva","VI.3 Nakládka do (dní od výzvy)",t.vyzva??10,{num:1})}
    ${fld("pokuta","VI.6 a VIII. Zmluvná pokuta %",t.pokuta??20,{num:1})}
    ${fld("gmp","Príloha 2 – GMP+ vyhlásenie farmára",t.gmp!==false,{cb:1})}
    ${fld("iscc","Príloha 3 – ISCC samohodnotenie",t.iscc!==false,{cb:1})}
    <div class="osw1"><span class="osl">Príloha 1 – ďalšie parametre kvality (každý riadok „Parameter | hodnota“)</span>${K.length?K.map(c=>fld("x."+c,E(nm(c)),((t.x||{})[c]||[]).map(r=>r[0]+" | "+r[1]).join("\n"),{ta:1,w:1,rows:3})).join(""):`<div class="s">—</div>`}</div>
    ${fld("osobitne","VIII. Osobitné ustanovenia (každý riadok = jeden bod)",(t.osobitne||[]).join("\n"),{ta:1,w:1,rows:6})}
    <div class="osw1 ospmsg" id="ospMsg"></div>
    <div class="osw1 ospb">${ctx.btns}</div>
   </form>`}
function readVzor(f,t0,koms){const t=JSON.parse(JSON.stringify(t0||{}));const num=(v,d)=>{const n=parseFloat(String(v).replace(",","."));return Number.isFinite(n)?n:d};
  f.querySelectorAll("[data-osk]").forEach(x=>{const k=x.dataset.osk,v=x.type==="checkbox"?x.checked:x.value;
    if(k.startsWith("x.")){const c=k.slice(2);t.x=t.x||{};t.x[c]=String(v).split("\n").map(l=>l.split("|").map(z=>z.trim())).filter(r=>r[0]).map(r=>[r[0],r.slice(1).join(" | ")||"áno"]);return}
    if(k==="osobitne"){t.osobitne=String(v).split("\n").map(z=>z.trim()).filter(Boolean);return}
    if(["platba","tol","vyzva","pokuta"].includes(k)){t[k]=num(v,null);return}
    t[k]=v});
  if(!(t.platba>=1&&t.platba<=120))throw new Error("Platba musí byť 1 až 120 dní.");if(!(t.tol>=0&&t.tol<=20))throw new Error("Tolerancia musí byť 0 až 20 %.");
  if(!(t.vyzva>=1&&t.vyzva<=60))throw new Error("Nakládka po výzve musí byť 1 až 60 dní.");if(!(t.pokuta>=0&&t.pokuta<=50))throw new Error("Zmluvná pokuta musí byť 0 až 50 %.");
  return t}
const msg=(m,ok)=>{const el=document.getElementById("ospMsg");if(el){el.className="osw1 ospmsg "+(ok?"ok":"err");el.textContent=(ok?"✅ ":"⚠️ ")+m;el.scrollIntoView({block:"nearest",behavior:"smooth"})}};
const ourPrice=c=>{const p=((typeof STATE!=="undefined"&&STATE.prices)||[]).find(x=>x.com===c);return p&&+p.price>0?+p.price:200};
function openSpol(id){const s=((ST.L&&ST.L.spol)||[]).find(x=>+x.id===+id);if(!s){tst("Návrh sa nenašiel – obnov stránku.");return}ST.sh={k:"spol",id:s.id,s:JSON.parse(JSON.stringify(s))};sheet(spolHTML(ST.sh.s))}
function openVzor(id){const v=((ST.L&&ST.L.vzory)||[]).find(x=>+x.id===+id);if(!v){tst("Vzor sa nenašiel – obnov stránku.");return}
  const s=((ST.L&&ST.L.spol)||[]).find(x=>+x.id===+v.spol_id),koms=s&&s.p&&Array.isArray(s.p.koms)?s.p.koms:Object.keys((v.t&&v.t.x)||{});
  ST.sh={k:"vzor",id:v.id,v,koms};
  sheet(vzorHTML(v,{title:`📄 Vzor zmluvy pre farmárov · ${E(bname(v.buyer))}`,koms,btns:`<button type="button" data-osp="read">👁️ Prečítať zmluvu</button><button class="pri" type="submit">💾 Uložiť vzor</button>${v.status==="navrh"?`<button type="button" class="lime" data-osp="vok" data-id="${E(v.id)}">✅ Schváliť vzor – používať pri zmluvách</button>`:`<small>Úprava schváleného vzoru vytvorí novú verziu na schválenie – podpísané zmluvy sa nemenia.</small>`}`}))}
// zmluva farmára: 🏭 kam to pôjde (Martin + obchodník)
function dealHTML(d){const V=(ST.V||[]).filter(v=>!Array.isArray(v.coms)||!v.coms.length||v.coms.includes(d.com)),cur=(ST.M||{})[d.id],sel=ST.sh&&ST.sh.vid!==undefined?ST.sh.vid:(cur?cur.vzor:null);
  const v=V.find(x=>+x.id===+sel),t=ST.sh&&ST.sh.t?ST.sh.t:(cur&&cur.vzor===sel?cur.t:(v?v.t:null));
  const fn=((typeof STATE!=="undefined"&&STATE.farmers)||[]).find(f=>f.id===d.farmer_id);
  const pre=`<div class="osdl"><b>${E(d.no||"")}</b> · ${E(fn?fn.name:"farmár")} · ${E(nm(d.com))} ${E(d.tons)} t za ${E(d.price)} €/t</div>
   <label class="osw1 osvsel">🏭 Kam to pôjde (vidíš iba ty a obchodník, farmár nikdy)<select data-osdv="${E(d.id)}"><option value="">— štandardná zmluva ERNTE (bez odberateľa)</option>${V.map(x=>`<option value="${E(x.id)}"${+x.id===+sel?" selected":""}>${E(x.name)} · vzor v${E(x.verzia)}</option>`).join("")}</select></label>
   ${!V.length?`<div class="s">Pre ${E(nm(d.com))} zatiaľ nie je schválený vzor odberateľa${MAIN()?" – schváľ ho v 🤝 Spolupráca s odberateľmi":" – Martin ho schváli v 🤝 Spolupráca s odberateľmi"}.</div>`:""}`;
  if(!v)return hdr("🏭 Podmienky zmluvy")+pre+`<div class="ospb"><button class="pri" type="button" data-osp="dsave0" data-id="${E(d.id)}">💾 Uložiť – štandardná zmluva</button><button type="button" data-osp="dpdf" data-id="${E(d.id)}">📄 Zmluva PDF</button></div><div class="osw1 ospmsg" id="ospMsg"></div>`;
  return vzorHTML({t,status:"schvaleny",verzia:v.verzia},{title:"🏭 Podmienky zmluvy",st:false,koms:[d.com],pre,btns:`<button class="pri" type="submit">💾 Uložiť podmienky zmluvy</button><button type="button" data-osp="dpdf" data-id="${E(d.id)}">📄 Zmluva PDF</button>`})}
function openDeal(id){const d=((typeof STATE!=="undefined"&&STATE.deals)||[]).concat((typeof STATE!=="undefined"&&STATE.dealsArch)||[]).find(x=>x.id===id);if(!d){tst("Zmluva sa nenašla.");return}
  ST.sh={k:"deal",id,d};sheet(dealHTML(d));if(!ST.V)loadV(true).then(()=>{if(ST.sh&&ST.sh.k==="deal"&&ST.sh.id===id){ST.keep=true;sheet(dealHTML(d))}})}

// PDF návrhu pre odberateľa (ERNTE)
function spolPdf(s){const p=s.p||{},K=Array.isArray(p.koms)?p.koms:[],Q=p.kvalita||{},head=typeof brandHead==="function"?brandHead("ernte","Návrh podmienok spolupráce",bname(s.buyer)):`<h1>Návrh podmienok spolupráce</h1><h2>${E(bname(s.buyer))}</h2>`;
  const css=typeof brandCss==="function"?brandCss("ernte"):"";const row=(a,b)=>b==null||b===""?"":`<tr><th>${E(a)}</th><td>${E(b)}</td></tr>`;
  const w=window.open("","_blank");if(!w){tst("Povoľ vyskakovacie okná.");return}
  w.document.write(`<!doctype html><html lang="sk"><head><meta charset="utf-8"><title>Návrh spolupráce ${E(bname(s.buyer))}</title><style>${css}body{font:11pt/1.5 Arial,sans-serif;color:#111;max-width:180mm;margin:0 auto;padding:10px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #bbb;padding:6px 8px;text-align:left;vertical-align:top}th{width:34%;background:#f4f7ef}h3{margin:14px 0 4px}.pb{text-align:center;margin:16px}@media print{.pb{display:none}}</style></head><body>${head}
   ${s.text?`<p>${E(s.text).replace(/\n/g,"<br>")}</p>`:""}
   <table>${row("Komodity",K.map(nm).join(", "))}${row("Parita",p.parita)}${row("Miesto dodania",p.miesto)}${row("Doprava",p.doprava)}${row("Cena",p.cena_txt)}${row("Platba",p.platba!=null?p.platba+" dní od doručenia faktúry":"")}
    ${row("Tolerancia množstva",p.tol!=null?"± "+p.tol+" %":"")}${row("Množstvo",p.mnozstvo)}${row("Váženie a rozbory",p.vazenie)}${row("Reklamácia",p.reklam!=null?p.reklam+" pracovné dni; rozhodcovské laboratórium "+(p.lab||""):"")}${row("Zrážky za kvalitu",p.zrazky)}${row("Certifikáty ERNTE",p.cert)}${row("Platnosť",p.platnost)}${row("Poznámka",p.pozn)}</table>
   ${K.length?`<h3>Kvalita</h3><table><tr><th>Komodita</th><td><b>vlhkosť max · nečistoty max · ďalšie</b></td></tr>${K.map(c=>{const q=Q[c]||{};return `<tr><th>${E(nm(c))}</th><td>${q.vlh!=null?E(q.vlh)+" %":"–"} · ${q.nec!=null?E(q.nec)+" %":"–"}${q.ine?" · "+E(q.ine):""}</td></tr>`}).join("")}</table>`:""}
   <p style="margin-top:14px">Návrh je nezáväzný; zmluva vzniká až podpisom kontraktu oboma stranami.</p><p>Ernte spol. s r. o. · Zbudza 141, 072 23 · IČO 52 341 356</p>
   <div class="pb"><button onclick="print()" style="font-size:15px;padding:10px 18px">🖨️ Tlačiť / uložiť ako PDF</button></div></body></html>`);w.document.close()}

// ---------- udalosti ----------
document.addEventListener("click",async e=>{const t=e.target.closest&&e.target.closest("[data-osp],[data-oskom],[data-osdeal]");if(!t)return;
  if(t.dataset.osdeal!==undefined){if(!TEAM())return;e.preventDefault();e.stopPropagation();openDeal(t.dataset.osdeal);return}
  if(t.dataset.oskom!==undefined){if(!MAIN()||!ST.sh||ST.sh.k!=="spol")return;e.preventDefault();const f=document.getElementById("ospForm");if(f){const r=readSpol(f,ST.sh.s);ST.sh.s.p=r.p;ST.sh.s.nazov=r.nazov;ST.sh.s.text=r.text}
    const c=t.dataset.oskom,p=ST.sh.s.p;p.koms=Array.isArray(p.koms)?p.koms:[];if(p.koms.includes(c))p.koms=p.koms.filter(x=>x!==c);else{p.koms.push(c);p.kvalita=p.kvalita||{};if(!p.kvalita[c]){const S=(typeof SPEC!=="undefined"&&SPEC[c])||[/^(repka|lo|ho)$/.test(c)?8:c==="soja"?13:14,2];p.kvalita[c]={vlh:S[0],nec:S[1],ine:""}}}
    ST.keep=true;sheet(spolHTML(ST.sh.s));return}
  const a=t.dataset.osp,id=t.dataset.id;e.preventDefault();e.stopPropagation();
  if(a==="close"){close();return}
  if(a==="go"){if(typeof TAB!=="undefined"){TAB="deals";if(typeof renderStaff==="function")renderStaff()}let k=0;const f=()=>{const c=document.getElementById("osplCard");if(c){c.scrollIntoView({block:"start",behavior:"smooth"});return}if(++k<30)setTimeout(f,150)};setTimeout(f,100);return}
  const run=async(fn,okm,after)=>{const old=t.textContent;t.disabled=true;t.textContent="⏳ Chvíľu…";try{const r=await fn();if(r&&r.error)throw new Error(r.error.message);if(r&&r.data&&r.data.ok===false)throw new Error(r.data.err||"Nepodarilo sa.");
      if(okm)tst("✅ "+okm,4500);await load(true);await loadV(true);if(after)after(r&&r.data)}catch(x){t.disabled=false;t.textContent=old;msg(String(x&&x.message||x).replace(/^.*?:\s(?=[A-ZÁČĎÉÍĽĹŇÓÔŔŠŤÚÝŽ])/,""))}};
  if(a==="new"){if(!MAIN())return;await run(()=>sb.rpc("ospl_new",{p_buyer:t.dataset.b}),"Návrh spolupráce pripravený – skontroluj a uprav.",d=>{if(d&&d.id)openSpol(d.id)});return}
  if(a==="open"){openSpol(id);return}if(a==="vzor"){openVzor(id);return}
  if(a==="pdf"){const f=document.getElementById("ospForm");if(f&&ST.sh){const r=readSpol(f,ST.sh.s);spolPdf(Object.assign({},ST.sh.s,r))}return}
  if(a==="ok"){const f=document.getElementById("ospForm");if(f&&ST.sh){const r=readSpol(f,ST.sh.s);const s1=await sb.rpc("ospl_save",{p_id:+id,p_nazov:r.nazov,p:r.p,p_text:r.text});if(s1.error){msg(s1.error.message);return}}
    await run(()=>sb.rpc("ospl_set",{p_id:+id,p_status:"schvalena"}),"Spolupráca schválená – prečítaj a schváľ vzor zmluvy pre farmárov.",d=>{if(d&&d.vzor)openVzor(d.vzor)});return}
  if(a==="no"||a==="end"||a==="reopen"){const st=a==="no"?"zamietnuta":a==="end"?"ukoncena":"navrh";await run(()=>sb.rpc("ospl_set",{p_id:+id,p_status:st}),a==="no"?"Návrh zamietnutý.":a==="end"?"Spolupráca ukončená – vzor sa už neponúka.":"Vrátené do návrhu.",()=>openSpol(id));return}
  if(a==="del"){if(t.dataset.sure!=="1"){t.dataset.sure="1";t.textContent="🗑️ Naozaj zmazať? Ťukni ešte raz";return}await run(()=>sb.rpc("ospl_del",{p_id:+id}),"Návrh zmazaný.",()=>close());return}
  if(a==="read"){const f=document.getElementById("ospVzor");if(!f||!ST.sh)return;let tt;try{tt=readVzor(f,ST.sh.v.t,ST.sh.koms)}catch(x){msg(x.message);return}
    const c=(ST.sh.koms||[])[0]||"kukurica";if(window.contractPreview)window.contractPreview({no:"VZOR",com:c,tons:100,price:ourPrice(c),term:"",created_at:new Date().toISOString(),__t:tt});return}
  if(a==="vok"){const f=document.getElementById("ospVzor");if(f&&ST.sh){let tt;try{tt=readVzor(f,ST.sh.v.t,ST.sh.koms)}catch(x){msg(x.message);return}const s1=await sb.rpc("ospl_vzor_save",{p_id:+id,p_t:tt});if(s1.error){msg(s1.error.message);return}}
    await run(()=>sb.rpc("ospl_vzor_ok",{p_id:+id}),"Vzor zmluvy schválený – pri zmluve farmára ho vyberieš v 🏭 Kam to pôjde.",()=>close());return}
  if(a==="dpdf"){if(window.contractPdf)window.contractPdf(id);return}
  if(a==="dsave0"){await run(()=>sb.rpc("deal_vzor_set",{p_deal:id,p_vzor:null,p_t:null}),"Zmluva je štandardná zmluva ERNTE.",()=>{msg("Uložené – štandardná zmluva ERNTE.",true)});return}
},true);
document.addEventListener("change",e=>{const s=e.target.closest&&e.target.closest("[data-osdv]");if(!s||!ST.sh||ST.sh.k!=="deal")return;ST.sh.vid=s.value?+s.value:null;ST.sh.t=null;ST.keep=true;sheet(dealHTML(ST.sh.d))},true);
document.addEventListener("submit",async e=>{const f=e.target;if(!f||(f.id!=="ospForm"&&f.id!=="ospVzor"))return;e.preventDefault();e.stopPropagation();if(!ST.sh)return;const b=f.querySelector("button[type=submit]");
  const done=(m)=>{if(b){b.disabled=false;b.textContent=b.dataset.t||b.textContent}msg(m,true)};if(b){b.dataset.t=b.textContent;b.disabled=true;b.textContent="⏳ Ukladám…"}
  try{if(ST.sh.k==="spol"){const r=readSpol(f,ST.sh.s);const x=await sb.rpc("ospl_save",{p_id:ST.sh.id,p_nazov:r.nazov,p:r.p,p_text:r.text});if(x.error)throw new Error(x.error.message);Object.assign(ST.sh.s,r);await load(true);done("Podmienky uložené.");return}
    if(ST.sh.k==="vzor"){const tt=readVzor(f,ST.sh.v.t,ST.sh.koms);const x=await sb.rpc("ospl_vzor_save",{p_id:ST.sh.id,p_t:tt});if(x.error)throw new Error(x.error.message);await load(true);
      if(x.data&&x.data.nova_verzia){tst(`✅ Uložené ako nová verzia v${x.data.nova_verzia} – schváľ ju.`,6000);openVzor(x.data.id);return}ST.sh.v.t=tt;done("Vzor uložený. Keď je v poriadku, ťukni ✅ Schváliť vzor.");return}
    if(ST.sh.k==="deal"){const d=ST.sh.d,vid=ST.sh.vid!==undefined?ST.sh.vid:((ST.M||{})[d.id]||{}).vzor;if(!vid)throw new Error("Vyber odberateľa.");const v=(ST.V||[]).find(x=>+x.id===+vid);
      const tt=readVzor(f,(ST.sh.t||((ST.M||{})[d.id]&&(ST.M||{})[d.id].vzor===vid?(ST.M||{})[d.id].t:(v&&v.t))||{}),[d.com]);const x=await sb.rpc("deal_vzor_set",{p_deal:d.id,p_vzor:+vid,p_t:tt});if(x.error)throw new Error(x.error.message);
      ST.sh.t=tt;await loadV(true);done(`Uložené – zmluva ${d.no||""} je prispôsobená (${v?v.name:"odberateľ"}). Farmár meno odberateľa nevidí.`);return}}
  catch(x){if(b){b.disabled=false;b.textContent=b.dataset.t||b.textContent}msg(String(x&&x.message||x))}},true);

// ---------- 🏭 pri zmluvách v Obchodoch + výber pri novej zmluve ----------
function decorate(){if(!TEAM())return;const app=document.getElementById("app");if(!app)return;if(!ST.V&&!ST.vbusy&&Date.now()-ST.vat>60e3)loadV(false);
  app.querySelectorAll("[data-cpdf]").forEach(b=>{const id=b.dataset.cpdf;if(!id||b.parentElement.querySelector(`[data-osdeal="${CSS.escape(id)}"]`))return;const cur=(ST.M||{})[id];
    const x=document.createElement("button");x.type="button";x.dataset.osdeal=id;x.className="osdb";x.textContent=cur?`🏭 ${cur.name||"odberateľ"}`:"🏭 Kam to pôjde";b.after(x)});
  app.querySelectorAll("[data-osdeal]").forEach(x=>{const cur=(ST.M||{})[x.dataset.osdeal],tx=cur?`🏭 ${cur.name||"odberateľ"}`:"🏭 Kam to pôjde";if(x.textContent!==tx)x.textContent=tx});
  for(const fid of ["fDeal","fQd"]){const f=document.getElementById(fid);if(!f||f.querySelector(".osnew"))continue;const V=ST.V||[];if(!V.length)continue;
    const l=document.createElement("label");l.className="w osnew";l.innerHTML=`🏭 Kam to pôjde – vidíš iba ty a obchodník<select data-osnew><option value="">— štandardná zmluva ERNTE</option>${V.map(x=>`<option value="${E(x.id)}" data-coms="${E((x.coms||[]).join(","))}">${E(x.name)}${(x.coms||[]).length?" · "+E((x.coms||[]).map(nm).join(", ")):""}</option>`).join("")}</select><small>Zmluva sa prispôsobí podmienkam odberateľa; po uložení ich upravíš v 🏭 pri zmluve.</small>`;
    const btn=f.querySelector(".btns,.qdgo");if(btn&&btn.parentElement===f)f.insertBefore(l,btn);else if(btn)btn.parentElement.insertBefore(l,btn);else f.appendChild(l)}}
// Prehľad (Martin): skratka hneď pod 🏷️ Ceny odberateľov – kde sú návrhy spolupráce (7. 11. 07:41 „predajné návrhy zmluvy kde nájdem“)
function homeLink(){if(!MAIN()||typeof TAB==="undefined"||TAB!=="home")return;if(window.ernteCakaReload){const o=document.getElementById("osplHome");if(o)o.remove();return} /* 7. 11.: návrhy sú v 📋 Čaká na teba */const app=document.getElementById("app");if(!app)return;if(!ST.L&&!ST.busy){load(false);return}if(!ST.L)return;
  const S=ST.L.spol||[],V=ST.L.vzory||[],n=S.filter(x=>x.status==="navrh").length,v=V.filter(x=>x.status==="navrh").length,ok=S.filter(x=>x.status==="schvalena").length;
  const h=`<button type="button" class="osgo${n||v?" w":""}" data-osp="go" id="osplHome"><b>🤝 Návrhy spolupráce a zmlúv s odberateľmi</b><small>${n?`📝 ${n} ${n===1?"návrh čaká":n<5?"návrhy čakajú":"návrhov čaká"} na teba`:"bez čakajúcich návrhov"}${v?` · 📄 ${v} ${v===1?"vzor zmluvy":"vzory zmlúv"} na schválenie`:""}${ok?` · ✅ ${ok} ${ok===1?"dohodnutá":"dohodnuté"}`:""} · Zmluvy → Obchody → 🤝</small></button>`;
  const old=document.getElementById("osplHome");if(old){if(old.outerHTML!==h){const d=document.createElement("div");d.innerHTML=h;old.replaceWith(d.firstElementChild)}return}
  const a=document.getElementById("ocnSec");if(!a)return;const d=document.createElement("div");d.innerHTML=h;a.after(d.firstElementChild)}
let q=0;function sch(){if(q)return;q=(window.ernteSoon||requestAnimationFrame)(()=>{q=0;try{decorate();homeLink();if(MAIN()&&typeof TAB!=="undefined"&&TAB==="deals"){if(!ST.L&&!ST.busy)load(false);if(!document.getElementById("osplCard"))paint()}}catch(x){}})}
// pri uložení novej zmluvy: zapamätať výber a po vzniku zmluvy ho priradiť (Nový obchod aj 🤝 Uzatvoriť obchod)
document.addEventListener("submit",e=>{const f=e.target;if(!f||(f.id!=="fDeal"&&f.id!=="fQd")||!TEAM())return;const s=f.querySelector("[data-osnew]");if(!s||!s.value)return;
  const num=v=>{const n=parseFloat(String(v||"").replace(/\s/g,"").replace(",","."));return Number.isFinite(n)?n:null};
  const P=f.id==="fDeal"?{fid:(f.querySelector('[name="farmer"]')||{}).value||null,com:(f.querySelector('[name="com"]')||{}).value,tons:num((f.querySelector('[name="tons"]')||{}).value),price:num((f.querySelector('[name="price"]')||{}).value)}
    :{fid:null,com:null,tons:num((document.getElementById("qdTons")||{}).value),price:num((document.getElementById("qdPrice")||{}).value)};
  P.vzor=+s.value;P.at=Date.now();watch(P)},true);
async function watch(P){const since=new Date(P.at-20e3).toISOString();
  for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,2500));
    try{let q=sb.from("deals").select("id,no,farmer_id,com,tons,price,created_at").gte("created_at",since).order("created_at",{ascending:false}).limit(5);const r=await q;if(r.error)continue;
      const d=(r.data||[]).find(x=>(!P.fid||x.farmer_id===P.fid)&&(!P.com||x.com===P.com)&&(P.tons==null||Math.abs(+x.tons-P.tons)<0.001)&&(P.price==null||Math.abs(+x.price-P.price)<0.001));if(!d)continue;
      const v=(ST.V||[]).find(x=>+x.id===+P.vzor);const s=await sb.rpc("deal_vzor_set",{p_deal:d.id,p_vzor:P.vzor,p_t:v?v.t:null});
      if(s.error){tst("⚠️ Zmluvu "+(d.no||"")+" sa nepodarilo prispôsobiť odberateľovi: "+s.error.message+" – nastav to v 🏭 pri zmluve.",8000);return}
      tst(`🏭 Zmluva ${d.no||""} je prispôsobená odberateľovi ${v?v.name:""} (farmár meno nevidí).`,6000);loadV(true);return}catch(x){}}
  tst("⚠️ Novú zmluvu som nenašiel – odberateľa nastav v Obchodoch cez 🏭 Kam to pôjde.",8000)}
function boot(){const app=document.getElementById("app");if(!app){setTimeout(boot,500);return}new MutationObserver(sch).observe(app,{childList:true});sch();
  setInterval(()=>{if(!document.hidden&&TEAM())loadV(true)},300e3)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
addEventListener("hashchange",()=>{if(location.hash==="#spolupraca"&&MAIN()&&typeof TAB!=="undefined"){TAB="deals";if(typeof renderStaff==="function")renderStaff();setTimeout(()=>{const c=document.getElementById("osplCard");c&&c.scrollIntoView({block:"start",behavior:"smooth"})},700)}});

{const s=document.createElement("style");s.textContent=`.ospl{display:grid;gap:10px;min-width:0}.ospl h2{margin:0}.ospl .s{line-height:1.45}
.osw{padding:9px 12px;border-radius:12px;background:rgba(255,207,90,.12);border:1px solid rgba(255,207,90,.55);font-weight:700;color:#fde68a;overflow-wrap:anywhere}
.osr{display:grid;gap:6px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);min-width:0}
.osh{display:grid;min-width:0}.osh b{overflow-wrap:anywhere}.osh small{opacity:.7;font-size:.78rem;overflow-wrap:anywhere}
.oschips{display:flex;flex-wrap:wrap;gap:6px}.osc{font-size:.76rem;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);overflow-wrap:anywhere}
.osc.s-navrh{background:rgba(255,207,90,.14);border-color:rgba(255,207,90,.5);color:#fde68a}.osc.s-schvalena{background:rgba(94,234,212,.14);border-color:rgba(94,234,212,.55);color:#99f6e4}
.osc.s-zamietnuta,.osc.s-ukoncena{opacity:.7}
.osa{display:flex;flex-wrap:wrap;gap:6px}.osa button{flex:1 1 150px;min-height:44px;white-space:normal}
.osdb{min-height:44px}
.osgo{display:grid;gap:3px;width:100%;text-align:left;margin:10px 0;padding:12px 14px;border-radius:16px;min-height:56px;white-space:normal}.osgo small{font-weight:600;opacity:.85;line-height:1.35;overflow-wrap:anywhere}.osgo.w{border-color:rgba(255,207,90,.7)!important;background:rgba(255,207,90,.1)!important}#osplCard{scroll-margin-top:96px}
.ospsh{position:fixed;inset:0;z-index:9500;background:rgba(2,6,15,.78);display:flex;align-items:flex-end;justify-content:center;padding:8px}@media(min-width:700px){.ospsh{align-items:center}}
.ospbox{width:min(760px,100%);max-height:94vh;overflow:auto;display:grid;gap:10px;padding:14px 14px 18px;border-radius:22px;background:#0B0F19;border:1px solid rgba(34,211,238,.45);color:#eef2f7;box-sizing:border-box;overscroll-behavior:contain}
html[data-theme=light] .ospbox{background:#fff;color:#0f172a}
.osph{display:flex;align-items:center;gap:8px;position:sticky;top:-14px;z-index:2;background:inherit;padding:6px 0}.osph b{flex:1;min-width:0;overflow-wrap:anywhere;font-size:1.05rem;text-align:center}
.ospx{min-height:44px;min-width:44px;padding:0 12px;border-radius:999px}.ospc{width:44px;padding:0;display:grid;place-items:center;font-size:1.1rem}
.ospst{padding:8px 12px;border-radius:12px;font-weight:700;font-size:.86rem;background:rgba(255,255,255,.06);overflow-wrap:anywhere}.ospst.s-navrh{background:rgba(255,207,90,.12);color:#fde68a}.ospst.s-schvalena{background:rgba(94,234,212,.12);color:#99f6e4}
.osinfo{padding:9px 12px;border-radius:12px;background:rgba(124,196,255,.1);border:1px solid rgba(124,196,255,.45);font-size:.84rem;line-height:1.45;overflow-wrap:anywhere}
.ospf{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;min-width:0;margin:0}.ospf label{display:grid;gap:4px;font-size:.8rem;font-weight:700;min-width:0}.ospf .osw1{grid-column:1/-1}
.ospf input,.ospf select,.ospf textarea{width:100%;min-width:0;box-sizing:border-box;min-height:44px;font-weight:400}.ospf textarea{min-height:64px;line-height:1.4}.ospf small{font-weight:400;opacity:.75}
.oscb{grid-column:1/-1;display:flex!important;grid-template-columns:none;align-items:flex-start;gap:8px!important;font-weight:600!important;line-height:1.4}.oscb input{width:22px!important;min-height:22px!important;flex:none;margin-top:2px}
.osl{display:block;font-size:.8rem;font-weight:800;margin:4px 0}.oskm{display:flex;flex-wrap:wrap;gap:6px}.oskb{min-height:40px;padding:0 12px;border-radius:999px;opacity:.6}.oskb.on{opacity:1;background:rgba(182,255,59,.18)!important;border-color:rgba(182,255,59,.7)!important}
.osq{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;padding:8px 10px;margin:6px 0;border-radius:12px;border:1px solid rgba(255,255,255,.12)}.osq>b{grid-column:1/-1}
.ospmsg{font-weight:700;font-size:.88rem;line-height:1.4;overflow-wrap:anywhere}.ospmsg:empty{display:none}.ospmsg.err{padding:9px 12px;border-radius:12px;background:rgba(255,107,129,.12);border:1px solid rgba(255,107,129,.6);color:#fecdd3}.ospmsg.ok{padding:9px 12px;border-radius:12px;background:rgba(94,234,212,.12);border:1px solid rgba(94,234,212,.6);color:#99f6e4}
.ospb{display:flex;flex-wrap:wrap;gap:8px}.ospb button{flex:1 1 170px;min-height:48px;white-space:normal}.ospb small{flex:1 1 100%;opacity:.75}
.osdl{font-size:.9rem;line-height:1.4;overflow-wrap:anywhere}.osvsel select{min-height:48px}.osnew small{font-weight:400;opacity:.75}
@media(max-width:520px){.ospf,.osq{grid-template-columns:minmax(0,1fr)}}`;document.head.appendChild(s)}
})();

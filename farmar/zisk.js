// ===== 💰 ZISK ERNTE · 🔍 KDE ZARÁBAME A KDE STRÁCAME – iba Martin (MAIN_OK) =====
// 5. 11. PRÍKAZ MAJITEĽA: zisk = zúčtovanie odberateľov − zúčtovanie farmárov (po lístkoch) − doprava obilia + flotila VALKO + kurací trus + agro služby.
// Databáza zisk_ernte(od, do) → spolu, obchod (= profit_overview: komodity, odberatelia, farmári, mesiace, úniky), valko po mesiacoch, trus, agro,
// sklad (zostáva vyviezť – odhad) a odporúčania (iba legálne a podľa zmlúv). Pri starej databáze záloha profit_overview.
// 🤖 Rozbor od AI: profit_ai_now → profit_ai_get. Otvára sa dlaždicou 💰 Zisk ERNTE v Prehľade alebo window.ziskOpen().
// Dlaždica: window.ziskTile() → {v,s,c} z vyrovnávacej pamäte (10 min), načíta sa na pozadí.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof MAIN_OK==="function"&&MAIN_OK();
const F=(n,d=0)=>n==null||!isFinite(n)?"–":(+n).toLocaleString("sk-SK",{minimumFractionDigits:d,maximumFractionDigits:d});
const S=(n,d=0)=>n==null||!isFinite(n)?"–":(n>0?"+":n<0?"−":"")+F(Math.abs(n),d);
const CN=c=>typeof comName==="function"?comName(c):c;
const CNS=s=>String(s||"").split(",").filter(Boolean).map(CN).join(", ");
const dk=d=>/^\d{4}-\d\d-\d\d/.test(d||"")?(+d.slice(8,10))+". "+(+d.slice(5,7))+".":"";
const md=t=>E(t).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/\n/g,"<br>");
const iso=d=>new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
function season(back){const n=new Date(),y=n.getMonth()>=6?n.getFullYear():n.getFullYear()-1;return [iso(new Date(y-back,6,1)),back?iso(new Date(y-back+1,5,30)):null]}
const PER=[["s","🌾 Táto sezóna",()=>season(0)],["30","30 dní",()=>[iso(new Date(Date.now()-30*864e5)),null]],["90","90 dní",()=>[iso(new Date(Date.now()-90*864e5)),null]],["p","Minulá sezóna",()=>season(1)]];
const D={per:"s",R:null,Z:null,busy:false,err:null,ai:null,open:false};
const ZC={at:0,d:null,busy:false};/* dlaždica v Prehľade */

async function load(){D.busy=true;D.err=null;paint();const p=(PER.find(x=>x[0]===D.per)||PER[0])[2]();
  try{let r=await sb.rpc("zisk_ernte",{p_from:p[0],p_to:p[1]});
    if(r.error&&!/zisk_ernte|does not exist|could not find/i.test(r.error.message))D.err=r.error.message;
    else if(!r.error&&r.data&&r.data.spolu){D.Z=r.data;D.R=D.Z.obchod||{};if(D.per==="s"){ZC.d=D.Z;ZC.at=Date.now()}}
    else{D.Z=null;r=await sb.rpc("profit_overview",{p_from:p[0],p_to:p[1]});if(r.error)D.err=r.error.message;else D.R=r.data||{}}}catch(x){D.err=String(x.message||x)}
  D.busy=false;paint();loadAi()}
async function loadAi(){try{const r=await sb.rpc("profit_ai_get");D.ai=r.error?null:r.data}catch(x){}paint();
  if(D.open&&D.ai&&D.ai.at&&!D.ai.done)setTimeout(()=>{if(D.open)loadAi()},8000)}

const kp=(l,v,s,c)=>`<div class="zkp ${c||""}"><small>${l}</small><b>${v}</b>${s?`<em>${s}</em>`:""}</div>`;
function bar(v,max){const w=max>0?Math.max(2,Math.min(100,Math.abs(v)/max*100)):0;return `<i class="zbar ${v<0?"neg":""}" style="width:${w}%"></i>`}
function rows(L,f,empty){return L&&L.length?L.map(f).join(""):`<div class="s">${empty||"Žiadne údaje."}</div>`}
const PL=(n,a,b,c)=>{n=Math.abs(+n||0);return n===1?a:n>=2&&n<=4?b:c};
const MES=["","jan","feb","mar","apr","máj","jún","júl","aug","sep","okt","nov","dec"];
const mk=m=>{const x=String(m||"");return MES[+x.slice(5,7)]?MES[+x.slice(5,7)]+" "+x.slice(2,4):x};
/* 💰 Zisk ERNTE spolu – vodopád (obchod − doprava + VALKO + trus + agro) */
function topHTML(){const Z=D.Z;if(!Z||!Z.spolu)return "";const P=Z.spolu,V=Z.valko||{},T=Z.trus||{},A=Z.agro||{},O=(Z.obchod||{}).tot||{};
  const row=(i,l,v,s,go)=>`<button type="button" class="zwr" data-zigo="${go}"><span class="zwi" aria-hidden="true">${i}</span><span class="zwl">${l}${s?`<small>${s}</small>`:""}</span><b class="${+v<0?"neg":+v>0?"pos":""}">${S(v)} €</b><i aria-hidden="true">›</i></button>`;
  let h=`<div class="ztot ${+P.zisk<0?"r":"ok"}"><small>Zisk ERNTE · ${E(dk(Z.od))} – ${E(dk(Z.do))} ${E(String(Z.do||"").slice(0,4))}</small><b>${S(P.zisk)} €</b>
   <em>obchod − doprava obilia + flotila VALKO + kurací trus + agro služby</em></div>
  <div class="zwf">${row("🤝","Obchod",P.obchod,`zúčtovanie odberateľov − zúčtovanie farmárov · ${F(O.t_farm,0)} t`,"#zisk-obchod")}
   ${row("🚚","Doprava obilia",P.doprava,O.trn_n?`odhad z GPS: ${F(O.trn_n)} ${PL(O.trn_n,"jazda","jazdy","jázd")} × ${F((Z.obchod||{}).ret)} × ${F((Z.obchod||{}).ekm,2)} €/km`:"lístky bez GPS jazdy","#zisk-obchod")}
   ${row("🚛","Flotila VALKO",P.valko,(V.mesiace||[]).length?`${F(V.km)} km · obrat ${F(V.obrat)} €${V.odhad?" (odhad)":""} − náklady ${F(V.naklady)} €`:"bez GPS údajov v období","#zisk-valko")}
   ${row("🐔","Kurací trus",P.trus,T.chyba?"zapne sa po aktualizácii":+T.n?`${F(T.n)} ${PL(T.n,"vývoz","vývozy","vývozov")} · ${F(T.t,1)} t`:`zatiaľ žiadny doručený vývoz${+T.plan_n?` · ${F(T.plan_n)} naplánované`:""}`,"#zisk-ine")}
   ${row("🚜","Agro služby",P.agro,A.chyba?"zapne sa po aktualizácii":+A.n?`${F(A.n)} ${PL(A.n,"hotová objednávka","hotové objednávky","hotových objednávok")} · tržby − nafta`:`zatiaľ žiadna hotová objednávka${+A.plan_n?` · ${F(A.plan_n)} rozpracované`:""}`,"#zisk-ine")}
   <div class="zwr zsum"><span class="zwi" aria-hidden="true">=</span><span class="zwl">Zisk ERNTE</span><b class="${+P.zisk<0?"neg":"pos"}">${S(P.zisk)} €</b><i></i></div></div>`;
  const R=Z.odporucania||[];
  if(R.length){const K={strata:["r","📉 Kde prerábame"],zisk:["ok","📈 Ako zarobiť viac"],udaje:["i","🧩 Čo doplniť do údajov"]};let last="";
    h+=`<h3>💡 Odporúčania</h3><div class="zrecs">`+R.map(r=>{const k=K[r.k]||K.udaje;const hd=r.k!==last?`<div class="zrech ${k[0]}">${k[1]}</div>`:"";last=r.k;
      return hd+`<div class="zrec ${k[0]}"><div class="zrect"><span aria-hidden="true">${r.i||"💡"}</span><b>${E(r.t)}</b>${r.eur!=null?`<em class="${+r.eur<0?"neg":"pos"}">${S(r.eur)} €</em>`:""}</div>
        <div class="zrecd">${E(r.d)}</div>${r.go?`<button type="button" class="zrecg" data-zigo="${E(r.go)}">${String(r.go).charAt(0)==="#"?"Ukázať v rozpise ›":"Otvoriť ›"}</button>`:""}</div>`}).join("")+`</div>
     <div class="s zrecn">Odporúčania sú iba férové a v súlade so zmluvami – nič, čo by farmár nemal vidieť.</div>`}
  return h}
function valkoHTML(){const V=(D.Z||{}).valko;if(!V)return "";const L=V.mesiace||[];
  if(!L.length)return `<h3 id="zisk-valko">🚛 Flotila VALKO</h3><div class="s">V období nie sú GPS údaje z áut.</div>`;
  const mx=Math.max(1,...L.map(x=>Math.abs(+x.zisk||0)));
  return `<h3 id="zisk-valko">🚛 Flotila VALKO</h3>`+L.map(x=>`<div class="zkr"><div class="zkrh"><b>${E(mk(x.m))}${x.g==="eu"?" · EU":""}${+x.dni&&+x.dni<+x.dni_m?` <small>(${F(x.dni,1)} z ${F(x.dni_m)} dní)</small>`:""}</b><span class="${+x.zisk<0?"neg":"pos"}">${S(x.zisk)} €</span></div>${bar(+x.zisk,mx)}
     <div class="zkrm">${F(x.km)} km · obrat <b>${F(x.obrat)} €</b>${x.odhad?" (odhad z km)":""} − nafta ${F(x.nafta)} − mýto ${F(x.myto)} − mzdy ${F(x.mzdy)} − pevné ${F(x.pevne)} €</div></div>`).join("")
   +(V.odhad?`<div class="s">Obrat je odhad z km × sadzba za km, nie z faktúr. Skutočný obrat zadaj vo Flotile – zisk dopravy bude presný.</div>`:"")
   +`<div class="s">Doprava obilia v obchode = čo by sme platili VALKO (km tam aj späť × €/km); flotila = jej obrat − skutočné náklady. Spolu je to skutočná cena dopravy.</div>`}
function ineHTML(){const Z=D.Z;if(!Z)return "";const T=Z.trus||{},A=Z.agro||{},K=Array.isArray(Z.sklad)?Z.sklad.filter(x=>!x.chyba):[];
  let h=`<h3 id="zisk-ine">🐔 Kurací trus · 🚜 Agro služby</h3><div class="zkleak">
   <div class="zkl"><b>🐔 Kurací trus</b><span>${T.chyba?"Zapne sa po aktualizácii databázy.":+T.n?`${F(T.n)} ${PL(T.n,"doručený vývoz","doručené vývozy","doručených vývozov")}, ${F(T.t,1)} t: od odberateľa <b>${F(T.trzby)} €</b> − dodávateľovi ${F(T.nakup)} € = <b class="${+T.zisk<0?"neg":"pos"}">${S(T.zisk)} €</b>. Doprava trusu je vo flotile VALKO.`:"V období zatiaľ žiadny doručený vývoz."}</span></div>
   <div class="zkl"><b>🚜 Agro služby</b><span>${A.chyba?"Zapne sa po aktualizácii databázy.":+A.n?`${F(A.n)} ${PL(A.n,"hotová objednávka","hotové objednávky","hotových objednávok")}: tržby <b>${F(A.trzby)} €</b> − nafta ${F(A.nafta)} € = <b class="${+A.zisk<0?"neg":"pos"}">${S(A.zisk)} €</b> (stroje a mzdy nie sú v údajoch).`:"V období zatiaľ žiadna hotová objednávka."}</span></div></div>`;
  if(K.length){h+=`<h3>📦 Zostáva vyviezť <small>(odhad – nie je v zisku)</small></h3>`+K.map(x=>`<div class="zkf"><b>${E(CN(x.com))} · ${F(x.t,0)} t${x.fwd?" · 📅 neskorší odber":""}</b><span class="${x.vysledok==null?"":+x.vysledok<0?"neg":"pos"}">${x.vysledok==null?"–":S(x.vysledok)+" €"}</span>
     <small>nákup ${F(x.nakup,2)} €/t${x.predaj!=null?` · ${x.fwd?"najlepší predaj na neskorší odber":"dnes najlepší predaj"} po doprave ${F(x.predaj,2)} €/t`:x.fwd?" · chýba ponuka odberateľa na neskorší odber":" · chýba aktuálna cena odberateľa"}</small></div>`).join("")}
  return h}
function body(){const R=D.R;if(D.err)return `<div class="s zer">Nepodarilo sa načítať: ${E(D.err)}${/profit_overview/.test(D.err)?" – databáza sa práve aktualizuje, skús o pár minút.":""}</div>`;
  if(!R)return `<div class="s">Počítam…</div>`;
  const T=R.tot||{},L=R.leak||{},afterTrn=(+T.margin||0)-(+T.trn||0);
  const mx=Math.max(1,...(R.com||[]).map(x=>Math.abs(+x.margin||0)));
  const bmx=Math.max(1,...(R.buyer||[]).map(x=>Math.abs(+x.margin||0)));
  const mmx=Math.max(1,...(R.month||[]).map(x=>Math.abs(+x.margin||0)));
  const W=L.weight||{},LS=L.loss||{};
  let h=topHTML()+`${D.Z?`<h3 id="zisk-obchod">🤝 Obchod – zúčtovanie odberateľov − farmárov</h3>`:""}<div class="zcov">Obdobie ${E(dk(R.od))}${String(R.od||"").slice(0,4)!==String(R.do||"").slice(0,4)?" "+String(R.od).slice(0,4):""} – ${E(dk(R.do))} ${String(R.do||"").slice(0,4)} · spočítané <b>${F(T.n_ok)}</b> z ${F(T.n)} lístkov${T.no_sell?` · <span class="w">${F(T.no_sell)} bez predajnej ceny</span>`:""}${T.no_buy?` · <span class="w">${F(T.no_buy)} bez nákupnej ceny</span>`:""}</div>
  <div class="zkps">${kp("Hrubá marža",S(T.margin)+" €",F(T.t_farm,0)+" t od farmárov",(+T.margin||0)>=0?"ok":"r")}${kp("Marža na tonu",S(T.per_t,2)+" €/t","po zúčtovaní farmárom",(+T.per_t||0)>=0?"ok":"r")}
   ${kp("Odhad dopravy","−"+F(T.trn)+" €",T.trn_n?`${F(T.trn_n)} lístkov s GPS jazdou`:"lístky bez GPS jazdy","")}${kp("Po doprave",S(afterTrn)+" €",T.trn_n?`${F(R.ekm,2)} €/km × ${F(R.ret)} (tam aj späť)`:"doprava zatiaľ nezistená",afterTrn>=0?"ok":"r")}</div>
  <h3>📦 Komodity</h3>${rows(R.com,x=>`<div class="zkr"><div class="zkrh"><b>${E(CN(x.com))}</b><span class="${+x.margin<0?"neg":"pos"}">${S(x.margin)} €</span></div>${bar(+x.margin,mx)}
     <div class="zkrm">${F(x.t,0)} t · nákup ${F(x.avg_buy,2)} → predaj ${F(x.avg_sell,2)} €/t · <b>${S(x.per_t,2)} €/t</b>${+x.n_loss?` · <span class="neg">${F(x.n_loss)} lístkov so stratou</span>`:""}</div></div>`)}
  <h3>🏭 Odberatelia</h3>${rows(R.buyer,x=>`<div class="zkr"><div class="zkrh"><b>${E(x.buyer)}</b><span class="${+x.margin<0?"neg":"pos"}">${S(x.margin)} €</span></div>${bar(+x.margin,bmx)}
     <div class="zkrm">${E(CNS(x.coms))} · ${F(x.t,0)} t · predaj ${F(x.avg_sell,2)} €/t · <b>${S(x.per_t,2)} €/t</b>${+x.kg_gap_t>0.05?` · <span class="neg">rozdiel váhy ${F(x.kg_gap_t,1)} t</span>`:""}</div></div>`)}
  <div class="zcols"><div><h3>🏆 Najviac zarábame na farmároch</h3>${rows(R.farm_best,x=>`<div class="zkf"><b>${E(x.farmer)}</b><span class="pos">${S(x.margin)} €</span><small>${E(CNS(x.coms))} · ${F(x.t,0)} t · ${S(x.per_t,2)} €/t</small></div>`)}</div>
   <div><h3>⚠️ Najmenej na tonu (od 20 t)</h3>${rows(R.farm_worst,x=>`<div class="zkf"><b>${E(x.farmer)}</b><span class="${+x.per_t<0?"neg":""}">${S(x.per_t,2)} €/t</span><small>${E(CNS(x.coms))} · ${F(x.t,0)} t · spolu ${S(x.margin)} €</small></div>`,"Zatiaľ nikto nemá 20 t.")}</div></div>
  <h3>📅 Po mesiacoch</h3>${rows(R.month,x=>`<div class="zkm"><span>${E(x.m.slice(5))}/${E(x.m.slice(2,4))}</span>${bar(+x.margin,mmx)}<b class="${+x.margin<0?"neg":""}">${S(x.margin)} €</b><small>${F(x.t,0)} t · ${S(x.per_t,2)} €/t</small></div>`)}
  <h3>🕳️ Kde unikajú peniaze</h3>
  <div class="zkleak"><div class="zkl" id="zisk-weight"><b>⚖️ Váha</b><span>Farmárom sme zaplatili o <b>${F(W.t,1)} t</b> viac, než prevzali odberatelia${+W.eur>0?` – asi <b class="neg">${F(W.eur)} €</b>`:""}.${+W.n?` ${F(W.n)} lístkov s rozdielom nad 2 %.`:""}</span></div>
   ${rows(L.weight_top,x=>`<div class="zkt"><span>${E(dk(x.day))} · ${E(x.ticket)} · ${E(CN(x.com))}</span><span>${E(x.farmer)} → ${E(x.buyer)}</span><span>${F(x.fkg)} → ${F(x.bkg)} kg (<b class="neg">−${F(x.pct,1)} %</b>) · ${F(x.eur)} €</span></div>`,"")}
   ${L.dry&&+L.dry.n?`<div class="zkl"><b>💧 Sušenie</b><span>Odberateľ strhol za sušenie <b>${F(L.dry.t,1)} t</b> pri ${F(L.dry.n)} ${PL(L.dry.n,"lístku","lístkoch","lístkoch")}, kde sa farmárovi sušenie neodpočítalo – asi <b class="neg">${F(L.dry.eur)} €</b>. Doplň vlhkosť na lístku – zmluva (čl. IV) odpočet vo fakturačnej váhe umožňuje.</span></div>`:""}
   <div class="zkl" id="zisk-loss"><b>📉 Lístky so stratou</b><span>${+LS.n?`<b class="neg">${F(LS.n)}</b> lístkov, spolu <b class="neg">${S(LS.eur)} €</b> – predali sme lacnejšie, než sme kúpili.`:"Žiadny lístok so stratou. 👍"}</span></div>
   ${rows(L.loss_top,x=>`<div class="zkt"><span>${E(dk(x.day))} · ${E(x.ticket)} · ${E(CN(x.com))}</span><span>${E(x.farmer)} → ${E(x.buyer)}</span><span>nákup ${F(x.bp,2)} · predaj ${F(x.sp,2)} €/t · <b class="neg">${S(x.mg)} €</b></span></div>`,"")}
   <div class="zkl"><b>❓ Bez predajnej ceny</b><span>${+L.no_sell_t?`<b>${F(L.no_sell_t,0)} t</b> nevieme spočítať – chýba cena odberateľa na lístku: ${(L.no_sell_buyers||[]).map(x=>`${E(x.buyer)} (${F(x.t,0)} t)`).join(", ")}. Doplň ich v Zúčtovaní → lístky odberateľa.`:"Všetky lístky majú predajnú cenu. 👍"}</span></div></div>
  ${valkoHTML()}${ineHTML()}
  <h3>🤖 Rozbor od AI</h3>${aiHtml()}`;
  return h}
function aiHtml(){const A=D.ai,run=A&&A.at&&!A.done;
  return `${A&&A.text?`<div class="zkai"><div class="zkaid">${E(dk(String(A.done||A.at||"").slice(0,10)))}</div>${md(A.text)}</div>`:A&&A.err?`<div class="s zer">Rozbor sa nepodaril: ${E(String(A.err).slice(0,160))}</div>`:""}
   <div class="btns"><button type="button" class="lime" data-ziai ${run||!D.R?"disabled":""}>${run?"⏳ AI analyzuje (do minúty)…":A&&A.text?"↻ Nový rozbor od AI":"🤖 Rozbor od AI – celý zisk ERNTE"}</button></div>`}
function paint(){const m=document.getElementById("ziskMod");if(!m)return;
  const st=m.querySelector(".zbody")?m.querySelector(".zbody").scrollTop:0;
  m.innerHTML=`<div class="zbox" role="dialog" aria-modal="true" aria-label="Zisk ERNTE – kde zarábame a kde strácame"><div class="zhd"><b>💰 Zisk ERNTE · kde zarábame a strácame</b><button type="button" data-ziclose aria-label="Zavrieť">✕</button></div>
   <div class="zper">${PER.map(p=>`<button type="button" class="${p[0]===D.per?"on":""}" data-ziper="${p[0]}">${p[1]}</button>`).join("")}</div>
   <div class="zbody">${D.busy&&!D.R?`<div class="s">Počítam zisk z vážnych lístkov, dopravy a služieb…</div>`:body()}</div></div>`;
  const b=m.querySelector(".zbody");if(b)b.scrollTop=st}
/* dlaždica 💰 Zisk ERNTE v Prehľade – číslo z vyrovnávacej pamäte (10 min), načíta sa na pozadí (nikdy nenechá stav null) */
async function tileLoad(){if(ZC.busy||!OK())return;ZC.busy=true;const p=season(0);
  try{const r=await sb.rpc("zisk_ernte",{p_from:p[0],p_to:p[1]});ZC.d=r.error?{err:r.error.message}:r.data&&r.data.spolu?r.data:{err:"prázdne"}}catch(x){ZC.d={err:String(x.message||x)}}
  ZC.at=Date.now();ZC.busy=false;
  try{if(typeof TAB!=="undefined"&&(TAB==="home"||TAB==="ow")&&!document.getElementById("ziskMod")&&typeof renderStaff==="function")renderStaff()}catch(x){}}
window.ziskTile=function(){if(!OK())return null;if(Date.now()-ZC.at>10*6e4&&!ZC.busy)setTimeout(tileLoad,400);
  const Z=ZC.d;if(!Z)return {v:"…",s:"počítam · obchod, doprava, VALKO, služby",c:"acc"};
  if(Z.err)return {v:"→",s:/zisk_ernte|does not exist|could not find/i.test(Z.err)?"zapne sa po aktualizácii databázy":"podrobný rozpis",c:"acc"};
  const P=Z.spolu||{},n=(Z.odporucania||[]).filter(r=>r.k==="strata").length;
  return {v:S(P.zisk)+"<small> €</small>",s:`táto sezóna${n?` · ${n} ${PL(n,"miesto","miesta","miest")}, kde prerábame`:""}`,c:+P.zisk<0?"r":"ok"}};
window.ziskOpen=function(){if(!OK())return;let m=document.getElementById("ziskMod");if(!m){m=document.createElement("div");m.id="ziskMod";m.className="zmod";document.body.appendChild(m)}
  D.open=true;document.documentElement.classList.add("zlock");paint();load()};
function close(){D.open=false;const m=document.getElementById("ziskMod");if(m)m.remove();document.documentElement.classList.remove("zlock")}
document.addEventListener("click",async e=>{const t=e.target;
  const g=t.closest&&t.closest('[data-owgo="#zisk"]');if(g){e.preventDefault();e.stopPropagation();ziskOpen();return}
  const m=document.getElementById("ziskMod");if(!m||!m.contains(t))return;
  if(t===m||t.closest("[data-ziclose]")){close();return}
  const p=t.closest("[data-ziper]");if(p){D.per=p.dataset.ziper;D.R=null;D.Z=null;load();return}
  const zg=t.closest("[data-zigo]");if(zg){const g=zg.dataset.zigo;
    if(g.charAt(0)==="#"){const el=m.querySelector(g);if(el)el.scrollIntoView({behavior:"smooth",block:"start"});return}
    close();try{TAB=g;renderStaff();scrollTo({top:0,behavior:"instant"})}catch(x){}return}
  if(t.closest("[data-ziai]")){const b=t.closest("[data-ziai]");b.disabled=true;const pp=(PER.find(x=>x[0]===D.per)||PER[0])[2]();
    const r=await sb.rpc("profit_ai_now",{p_from:pp[0],p_to:pp[1]});if(r.error){b.disabled=false;if(typeof toast==="function")toast("Nepodarilo sa: "+r.error.message,6000);return}
    if(r.data==="chýba kľúč"){if(typeof toast==="function")toast("Chýba kľúč ERNTE AI.",5000);b.disabled=false;return}
    D.ai={at:new Date().toISOString()};paint();setTimeout(loadAi,6000)}},true);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("ziskMod"))close()});
{const s=document.createElement("style");s.textContent=`
html.zlock,html.zlock body{overflow:hidden}
.zmod{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:stretch;justify-content:center;padding:0}
@media(min-width:760px){.zmod{align-items:center;padding:16px}}
.zbox{width:min(860px,100%);max-height:100%;display:flex;flex-direction:column;background:linear-gradient(160deg,rgba(28,34,46,.98),rgba(12,16,24,.99));color:#eef2f7;border:1px solid rgba(255,255,255,.14);box-sizing:border-box}
@media(min-width:760px){.zbox{border-radius:24px;max-height:94vh}}
.zhd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:calc(12px + env(safe-area-inset-top,0px)) 14px 8px 16px}.zhd b{font-size:1.05rem;min-width:0}
.zhd button{flex:0 0 auto;width:44px;height:44px;border-radius:50%;padding:0;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font:700 1.05rem/1 system-ui;display:flex;align-items:center;justify-content:center}
.zper{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;flex:0 0 auto}.zper button{flex:0 0 auto;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#dfe6f3;font:700 .85rem system-ui;white-space:nowrap}
.zper button.on{background:linear-gradient(135deg,#b6ff3b,#5eead4);color:#06110a;border-color:transparent}
.zbody{overflow:auto;padding:4px 14px calc(18px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}
.zbody h3{margin:18px 0 8px;font-size:.95rem;letter-spacing:.02em}
.zcov{font-size:.82rem;opacity:.8;margin:2px 0 10px;overflow-wrap:anywhere}.zcov .w,.zbody .w{color:#fbbf24}
.zkps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}@media(min-width:700px){.zkps{grid-template-columns:repeat(4,minmax(0,1fr))}}
.zkp{border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);display:grid;gap:2px;min-width:0;text-align:center}
.zkp small{opacity:.7;font-size:.75rem}.zkp b{font-size:1.2rem;overflow-wrap:anywhere}.zkp em{font-style:normal;font-size:.72rem;opacity:.6;overflow-wrap:anywhere}
.zkp.ok b{color:#b6ff3b}.zkp.r b{color:#fca5a5}
.zkr{padding:8px 0;border-top:1px solid rgba(255,255,255,.07)}.zkrh{display:flex;justify-content:space-between;gap:10px;align-items:baseline}.zkrh b{min-width:0;overflow-wrap:anywhere}.zkrh span{flex:0 0 auto;font-weight:800}
.zkrm{font-size:.82rem;opacity:.85;margin-top:3px;overflow-wrap:anywhere}
.zbar{display:block;height:6px;border-radius:3px;margin-top:5px;background:linear-gradient(90deg,#5eead4,#b6ff3b)}.zbar.neg{background:linear-gradient(90deg,#f87171,#fb923c)}
.zbox .pos{color:#b6ff3b}.zbox .neg{color:#fca5a5}
.zcols{display:grid;gap:0 18px}@media(min-width:700px){.zcols{grid-template-columns:1fr 1fr}}
.zkf{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 10px;padding:7px 0;border-top:1px solid rgba(255,255,255,.07)}.zkf b{overflow-wrap:anywhere}.zkf span{font-weight:800}.zkf small{grid-column:1/-1;opacity:.7;overflow-wrap:anywhere}
.zkm{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:2px 10px;align-items:center;padding:6px 0;border-top:1px solid rgba(255,255,255,.07)}.zkm .zbar{margin:0}.zkm small{grid-column:2/-1;opacity:.65;font-size:.75rem}
.zkleak{display:grid;gap:8px}.zkl{display:grid;gap:3px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);overflow-wrap:anywhere}
.zkt{display:grid;gap:1px;font-size:.8rem;padding:6px 12px;border-left:2px solid rgba(248,113,113,.5);margin-left:4px;overflow-wrap:anywhere}.zkt span:first-child{opacity:.7}
.zkai{line-height:1.55;padding:12px;border-radius:16px;background:rgba(182,255,59,.06);border:1px solid rgba(182,255,59,.25);overflow-wrap:anywhere}.zkai b{color:#b6ff3b}.zkaid{font-size:.75rem;opacity:.6;margin-bottom:4px}
.zbody .btns{justify-content:center;margin-top:10px}.zer{color:#fca5a5}
.ztot{display:grid;gap:2px;text-align:center;padding:14px 12px;border-radius:20px;background:linear-gradient(150deg,rgba(182,255,59,.10),rgba(94,234,212,.05));border:1px solid rgba(182,255,59,.32);margin:4px 0 10px}
.ztot.r{background:linear-gradient(150deg,rgba(248,113,113,.13),rgba(251,146,60,.05));border-color:rgba(248,113,113,.38)}
.ztot small{opacity:.75;font-size:.78rem;overflow-wrap:anywhere}.ztot b{font-size:clamp(1.6rem,7vw,2.2rem);line-height:1.15;color:#b6ff3b;overflow-wrap:anywhere}.ztot.r b{color:#fca5a5}
.ztot em{font-style:normal;font-size:.74rem;opacity:.6;overflow-wrap:anywhere}
.zwf{display:grid;gap:0;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);overflow:hidden}
.zwr{display:grid;grid-template-columns:28px minmax(0,1fr) auto 14px;gap:4px 8px;align-items:center;width:100%;min-height:52px;padding:8px 10px;border:0;border-top:1px solid rgba(255,255,255,.07);background:none;color:inherit;text-align:left;font:inherit;box-sizing:border-box}
.zwr:first-child{border-top:0}.zwi{font-size:1.15rem;text-align:center}.zwl{min-width:0;display:grid;gap:1px;font-weight:700;overflow-wrap:anywhere}.zwl small{font-weight:500;font-size:.74rem;opacity:.65}
.zwr>b{font-size:.98rem;white-space:nowrap;text-align:right}.zwr>i{font-style:normal;opacity:.5}
.zwr.zsum{background:rgba(255,255,255,.05);border-top:1px solid rgba(255,255,255,.18)}.zwr.zsum .zwl{font-size:1rem}.zwr.zsum>b{font-size:1.1rem}
@media(max-width:380px){.zwr{grid-template-columns:24px minmax(0,1fr) auto;padding:8px}.zwr>i{display:none}.zwr>b{font-size:.9rem}}
.zrecs{display:grid;gap:8px}.zrech{font-weight:800;font-size:.84rem;margin:6px 2px 0;opacity:.9}.zrech.r{color:#fca5a5}.zrech.ok{color:#b6ff3b}.zrech.i{color:#93c5fd}
.zrec{display:grid;gap:5px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-left:3px solid rgba(147,197,253,.6);min-width:0}
.zrec.r{border-left-color:rgba(248,113,113,.75)}.zrec.ok{border-left-color:rgba(182,255,59,.7)}
.zrect{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:baseline}.zrect b{overflow-wrap:anywhere}.zrect em{font-style:normal;font-weight:800;white-space:nowrap}
@media(max-width:380px){.zrect{grid-template-columns:auto minmax(0,1fr)}.zrect em{grid-column:2}}
.zrecd{font-size:.84rem;line-height:1.45;opacity:.88;overflow-wrap:anywhere}
.zrecg{justify-self:start;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#e7eef9;font:700 .82rem system-ui;white-space:nowrap}
.zrecn{margin-top:6px;font-size:.76rem;opacity:.6}.zkrh small{font-weight:500;opacity:.65;font-size:.74rem}`;document.head.appendChild(s)}
})();

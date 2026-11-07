// ===== 📈 INVESTIČNÁ AKADÉMIA – Martin a Timotej sa učia investovať spolu (príkaz majiteľa 31. 10. 2026) =====
// Cvičné portfólio (vymyslené peniaze: Martin 10 000 €, Timotej 1 000 €), skutočné denné ceny ETF (workflow invest → vetva invest-data),
// lekcie pre dospelého, listy od Claude (tabuľka invest_notes, každý týždeň). Databáza: inv_state / inv_trade / inv_snap / inv_read.
// Majiteľ: záložka 📈 Investovanie (iba Martin – MAIN_OK). Timotej: ERNTE Junior → 📈 Investujeme s tatinom (window.vInvestKid).
// Vzdelávanie, nie investičné odporúčanie.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const SRC="https://raw.githubusercontent.com/ernte-trade/ernte-/invest-data/invest.json";
const I={st:null,px:null,busy:false,err:null,at:0,who:null,open:{},lesson:null,amt:{},snapDay:null};
const eur=v=>v==null||!isFinite(v)?"–":Number(v).toLocaleString("sk-SK",{maximumFractionDigits:v>=1000?0:2,minimumFractionDigits:v>=1000?0:2})+" €";
const pct=v=>{if(v==null||!isFinite(v))return "–";v=Math.round(v*10)/10;if(Object.is(v,-0))v=0;return (v>0?"+":"")+v.toLocaleString("sk-SK",{maximumFractionDigits:1,minimumFractionDigits:1})+" %"};
const cls=v=>v>0.05?"up":v<-0.05?"dn":"";
const nmPerson=p=>p.who==="martin"?"Martin":String(p.name||"Timotej").split(" ")[0];
function rr(){try{if(window.kidRender&&window.K_IN_INV)kidRender();else if(typeof renderStaff==="function")renderStaff()}catch(x){}}
async function load(force){if(I.busy)return;if(!force&&I.st&&Date.now()-I.at<60e3)return;I.busy=true;I.err=null;
  try{const [a,b]=await Promise.all([sb.rpc("inv_state"),fetch(SRC+"?t="+Math.floor(Date.now()/600e3),{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null)]);
    if(a.error)I.err=/could not find|schema cache/i.test(a.error.message)?"Akadémia sa zapína po aktualizácii databázy – o pár minút.":a.error.message;else{I.st=a.data;I.who=I.who||a.data.me}
    if(b&&b.f)I.px=b;I.at=Date.now();snap()}catch(x){I.err=String(x.message||x)}I.busy=false;rr()}
const F=s=>((I.px&&I.px.f)||[]).find(f=>f.s===s);
function chg(f,days){if(!f||!f.h||f.h.length<2)return null;const h=f.h,last=h[h.length-1][1];const t=new Date(h[h.length-1][0]);t.setDate(t.getDate()-days);
  let p=h[0];for(let i=h.length-1;i>=0;i--){if(new Date(h[i][0])<=t){p=h[i];break}}return (last/p[1]-1)*100}
function val(p){let v=+p.cash||0;for(const [s,x] of Object.entries(p.hold||{})){const f=F(s);v+=(+x.q||0)*(f?f.px:(+x.avg||0))}return v}
function snap(){if(!I.st||!I.px)return;const d=new Date().toISOString().slice(0,10);if(I.snapDay===d)return;I.snapDay=d;const o={};(I.st.pf||[]).forEach(p=>{o[p.who]=Math.round(val(p)*100)/100});sb.rpc("inv_snap",{p_val:o}).then(()=>{}).catch(()=>{})}
function spark(h,w,ht,col){if(!h||h.length<2)return "";const vs=h.map(x=>x[1]),mn=Math.min(...vs),mx=Math.max(...vs),X=i=>i/(h.length-1)*w,Y=v=>ht-2-(v-mn)/((mx-mn)||1)*(ht-4);
  return `<svg viewBox="0 0 ${w} ${ht}" preserveAspectRatio="none" class="ivsp"><path d="${h.map((x,i)=>(i?"L":"M")+X(i).toFixed(1)+","+Y(x[1]).toFixed(1)).join(" ")}" fill="none" stroke="${col||"#86efac"}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`}

// ---------- lekcie pre dospelého ----------
const LA=[
 ["🎯","Ciele a čas","Investovať má zmysel peniaze, ktoré <b>5 a viac rokov nebudeš potrebovať</b>. Na kratší čas (auto o rok, daň, rezerva firmy) patria peniaze na sporiaci či termínovaný účet. Napíš si cieľ, sumu a rok – podľa toho sa rozhoduje o riziku."],
 ["🛟","Najprv rezerva a dlhy","Pred investovaním: <b>rezerva 3–6 mesačných výdavkov</b> na účte a splatené drahé dlhy (kreditka, spotrebák). Kto nemá rezervu, pri prvej nečakanej výdavke predáva investície – často práve v poklese."],
 ["🧺","Akcie, dlhopisy, ETF","<b>Akcia</b> = podiel vo firme (vyšší výnos, väčšie výkyvy). <b>Dlhopis</b> = pôžička štátu či firme (pokojnejší, menší výnos). <b>ETF</b> = fond obchodovaný na burze, ktorý v jednom kuse drží stovky až tisíce akcií alebo dlhopisov. Lacný široký ETF je pre väčšinu ľudí najjednoduchší základ."],
 ["⚖️","Rozloženie (alokácia)","Pomer akcie / dlhopisy určuje, ako veľmi bude portfólio kolísať. Bežné jadro: <b>jeden svetový akciový ETF</b> (celý svet alebo vyspelý svet) + podľa nervov a veku časť dlhopisov. Nesnaž sa trafiť jednu víťaznú firmu – široké rozloženie je jediný „obed zadarmo“."],
 ["💸","Náklady","Rozhodujú poplatky: <b>TER</b> fondu (ročný náklad, pri širokých ETF ~0,1–0,25 %), poplatok brokera, výmena meny. Rozdiel 1 % ročne pri 100 000 € za 20 rokov je pri 6 % výnose približne 50 000 € na konci. Lacný a jednoduchý vyhráva."],
 ["⛄","Pravidelne + čas","Pravidelné investovanie každý mesiac (DCA) odstráni hádanie „kedy“. Príklad: <b>300 € mesačne, 20 rokov, 6 % ročne ≈ 138 600 €</b>, z toho vložené 72 000 €. Zložené úročenie potrebuje hlavne čas – najdôležitejšie je začať a nevyberať."],
 ["📉","Poklesy a hlava","Akcie občas padnú hlboko: 2008 približne −50 %, marec 2020 −34 % za mesiac. Kto predal v panike, stratu si zafixoval; kto vydržal a ďalej investoval, dobehol to. Raz ročne <b>rebalancuj</b> späť na plánovaný pomer – to je jediný „predaj“, ktorý plán potrebuje."],
 ["🧾","Dane a účty na Slovensku","Fyzická osoba: zisk z predaja akcií či ETF obchodovaných na regulovanom trhu je <b>oslobodený, ak ich držíš viac ako 1 rok</b> (nie v obchodnom majetku); inak oslobodenie do 500 € ročne. <b>DIS</b> (dlhodobé investičné sporenie): oslobodené pri držbe aspoň 15 rokov, max 6 000 € ročne. Investovanie cez s.r.o. (ERNTE, VALKO) sa zdaňuje inak – s účtovníčkou. Broker: regulovaný v EÚ, ochrana investora min. 20 000 €. Toto je vzdelávanie, nie daňová ani investičná rada."]];

// ---------- spoločné časti ----------
function notesHTML(kid){const N=((I.st&&I.st.notes)||[]).filter(n=>kid?(n.who==="kid"||n.who==="both"):true);if(!N.length)return `<div class="s">Prvý list príde čoskoro.</div>`;
  return N.map((n,i)=>{const op=I.open[n.id]!=null?I.open[n.id]:i===0;return `<div class="ivn${n.read?"":" new"}"><button type="button" class="ivnh" data-ivn="${n.id}"><b>${n.read?"":"🆕 "}${E(n.title)}</b><small>${new Date(n.at).toLocaleDateString("sk-SK")}${!kid?` · ${n.who==="kid"?"pre Timoteja":n.who==="both"?"pre oboch":"pre teba"}`:""}</small></button>${op?`<div class="ivnb">${E(n.body).replace(/\n/g,"<br>")}</div>`:""}</div>`}).join("")}
function raceHTML(){const P=(I.st&&I.st.pf)||[];if(!P.length)return "";
  const rows=P.map(p=>{const v=val(p),g=(v/(+p.start||1)-1)*100;return {p,v,g}}).sort((a,b)=>b.g-a.g);
  return `<div class="ivrace">${rows.map((r,i)=>`<div class="ivrr${i===0&&rows.length>1&&r.g>rows[1].g?" lead":""}"><span class="ivrn">${i===0&&rows.length>1?"🏆 ":""}${E(nmPerson(r.p))}</span><b>${eur(r.v)}</b><span class="${cls(r.g)}">${pct(r.g)}</span>${(r.p.hist||[]).length>1?spark(r.p.hist.map(x=>[x.d,x.v]),90,26,r.g>=0?"#86efac":"#f87171"):""}</div>`).join("")}</div>
   <div class="s">Porovnáva sa percento od štartu (Martin 10 000 €, Timotej 1 000 €), poplatok 1 € za každý obchod.</div>`}
function pfHTML(who,kid){const p=((I.st&&I.st.pf)||[]).find(x=>x.who===who);if(!p)return "";const v=val(p),g=(v/(+p.start||1)-1)*100;
  const H=Object.entries(p.hold||{});
  return `<div class="ivpf"><div class="ivpfh"><div><small>${kid?"Moje":"Hodnota"}</small><b>${eur(v)}</b><span class="${cls(g)}">${pct(g)} od štartu</span></div><div><small>${kid?"Peniaze na kúpu":"Hotovosť"}</small><b>${eur(+p.cash)}</b></div></div>
   ${H.length?`<div class="ivh">${H.map(([s,x])=>{const f=F(s),cv=(+x.q)*(f?f.px:+x.avg),gg=f&&+x.avg?(f.px/(+x.avg)-1)*100:null;return `<div class="ivhr"><span><b>${E(f?f.n.split(" (")[0]:s)}</b><small>${(+x.q).toLocaleString("sk-SK",{maximumFractionDigits:3})} ks · nákup ${eur(+x.avg)}</small></span><span><b>${eur(cv)}</b><small class="${cls(gg)}">${pct(gg)}</small></span></div>`}).join("")}</div>`:`<div class="s">${kid?"Ešte nemáš žiadny košík – vyber si dole 👇":"Zatiaľ nič nekúpené – vyber fondy nižšie."}</div>`}</div>`}
function fundsHTML(who,kid){const L=(I.px&&I.px.f)||[];if(!L.length)return `<div class="s">Ceny fondov sa práve sťahujú (prvýkrát do pár minút).</div>`;
  const p=((I.st&&I.st.pf)||[]).find(x=>x.who===who)||{};
  return `<div class="ivfl">${L.map(f=>{const m1=chg(f,30),y1=chg(f,365),own=(p.hold||{})[f.s];const a=I.amt[f.s]!=null?I.amt[f.s]:(kid?100:1000);
   return `<div class="ivf"><div class="ivft"><b>${E(kid?f.n.split(" (")[0]:f.n)}</b><small>${E(f.d)}</small></div>
    <div class="ivfm"><span class="ivpx">${eur(f.px)}<small> / ks · ${E(f.dt)}</small></span><span class="${cls(m1)}">1 mes. ${pct(m1)}</span><span class="${cls(y1)}">1 rok ${pct(y1)}</span></div>
    ${spark(f.h.slice(-260),300,40,y1>=0?"#86efac":"#f87171")}
    <div class="ivfa">${kid?[50,100,200].map(x=>`<button type="button" class="${a===x?"on":""}" data-ivamt="${f.s}" data-v="${x}">${x} €</button>`).join(""):`<label>Suma €<input type="number" inputmode="decimal" min="10" step="10" value="${a}" data-ivin="${f.s}"></label>`}
     <button type="button" class="lime" data-ivbuy="${f.s}">${kid?"🧺 Kúpiť":"Kúpiť"}</button>${own?`<button type="button" class="ghost" data-ivsell="${f.s}">${kid?"Predať všetko":"Predať všetko"}</button>`:""}</div></div>`}).join("")}</div>
   <div class="s">Ceny: denné uzávierky Xetra v EUR (${E((I.px&&I.px.src)||"")}), aktualizácia každý pracovný deň večer.</div>`}
async function trade(who,s,qtyFn){const f=F(s);if(!f)return;const q=qtyFn(f);if(!q||!isFinite(q))return;
  const r=await sb.rpc("inv_trade",{p_sym:s,p_qty:Math.round(q*10000)/10000,p_px:f.px,p_who:who});
  if(r.error){(window.toast||alert)(r.error.message);return}I.st=r.data;I.snapDay=null;snap();(window.toast||(()=>{}))(q>0?"🧺 Kúpené (cvičné peniaze)":"✓ Predané",2500);rr()}

// ---------- majiteľ: záložka 📈 Investovanie ----------
window.vInvest=function(){if(!(window.MAIN_OK&&MAIN_OK()))return "";if(!I.st&&!I.err){load();return `<h2>📈 Investičná akadémia</h2><div class="card"><div class="s">Načítavam…</div></div>`}
  if(I.err&&!I.st)return `<h2>📈 Investičná akadémia</h2><div class="card"><div class="s">${E(I.err)}</div></div>`;
  if(Date.now()-I.at>10*60e3)load();
  const kids=((I.st&&I.st.pf)||[]).filter(p=>p.who!=="martin"),who=I.who||"martin";
  return `<h2>📈 Investičná akadémia · Martin a ${E(kids[0]?nmPerson(kids[0]):"Timotej")}</h2>
   <div class="card ivx"><div class="s">Učíte sa spolu: cvičné portfólio s vymyslenými peniazmi a skutočnými cenami ETF, lekcie a každý týždeň list od Claude. <b>Vzdelávanie, nie investičné odporúčanie</b> – skutočné peniaze podľa vlastného rozhodnutia.</div></div>
   <div class="card ivx"><div class="t">✉️ Listy od Claude</div>${notesHTML(false)}</div>
   <div class="card ivx"><div class="t">🏆 Kto investuje lepšie</div>${raceHTML()}</div>
   <div class="card ivx"><div class="t">💼 Cvičné portfólio</div>${kids.length?`<div class="ivtabs">${[{who:"martin",name:"Martin"},...kids].map(p=>`<button type="button" class="${who===p.who?"on":""}" data-ivwho="${E(p.who)}">${E(p.who==="martin"?"Ja":nmPerson(p))}</button>`).join("")}</div>`:""}
    ${pfHTML(who,false)}<h3 class="ivh3">Fondy na výber${who!=="martin"?` · nakupuješ za ${E(nmPerson(kids.find(k=>k.who===who)||{}))}`:""}</h3>${fundsHTML(who,false)}</div>
   <div class="card ivx"><div class="t">🎓 Lekcie</div>${LA.map((l,i)=>`<details class="ivl"${I.lesson===i?" open":""}><summary data-ivl="${i}">${l[0]} ${i+1}. ${E(l[1])}</summary><p>${l[2]}</p></details>`).join("")}</div>`};

// ---------- Timotej: ERNTE Junior ----------
window.vInvestKid=function(){window.K_IN_INV=1;if(!I.st&&!I.err){load();return `<div class="kjcard"><p>Načítavam… 📈</p></div>`}
  if(I.err&&!I.st)return `<div class="kjcard"><p>${E(I.err)}</p></div>`;if(Date.now()-I.at>10*60e3)load();
  const me=I.st.me;
  return `<div class="kjbar"><button type="button" data-kh>← Späť</button><b>📈 Investujeme s tatinom</b><span></span></div>
   <div class="kjcard ivk"><h2>✉️ Listy od Claude</h2>${notesHTML(true)}</div>
   <div class="kjcard ivk"><h2>🏆 Ty vs. tatino</h2>${raceHTML()}</div>
   <div class="kjcard ivk"><h2>🧺 Moje košíky</h2>${pfHTML(me,true)}</div>
   <div class="kjcard ivk"><h2>🛒 Košíky na výber</h2><p class="kjnote">Peniaze sú vymyslené, ceny sú ozajstné z burzy. Nedávaj všetky vajíčka do jedného košíka! 🥚</p>${fundsHTML(me,true)}</div>
   <div class="kjcard ivk"><h2>🎓 Nauč sa</h2><div class="kjtiles"><button type="button" class="kjt" data-kl="burzaetf">📈<b>Burza a ETF jednoducho</b></button><button type="button" class="kjt" data-kl="etf">🧺<b>Investovanie a ETF</b></button><button type="button" class="kjt" data-ketf>⛄<b>Hra ETF sporenie</b></button></div></div>`};

document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-ivn],[data-ivwho],[data-ivamt],[data-ivbuy],[data-ivsell],[data-ivl],[data-kinv],[data-kh],[data-kl],[data-ketf]");if(!t)return;
  if("kh" in t.dataset||"kl" in t.dataset||"ketf" in t.dataset){window.K_IN_INV=0;return}
  if("kinv" in t.dataset)return;
  if(t.dataset.ivl!==undefined){const d=t.closest("details");setTimeout(()=>{I.lesson=d&&d.open?+t.dataset.ivl:null},0);return}
  e.preventDefault();
  if(t.dataset.ivn){const id=+t.dataset.ivn,n=((I.st&&I.st.notes)||[]).find(x=>x.id===id),idx=((I.st&&I.st.notes)||[]).indexOf(n);I.open[id]=!(I.open[id]!=null?I.open[id]:idx===0);if(n&&!n.read){n.read=true;sb.rpc("inv_read",{p_id:id}).then(()=>{}).catch(()=>{})}rr();return}
  if(t.dataset.ivwho){I.who=t.dataset.ivwho;I.amt={};rr();return}
  if(t.dataset.ivamt){I.amt[t.dataset.ivamt]=+t.dataset.v;rr();return}
  const kid=!!window.K_IN_INV,who=kid?(I.st&&I.st.me):(I.who||"martin");
  if(t.dataset.ivbuy){const s=t.dataset.ivbuy;let a=I.amt[s]!=null?I.amt[s]:(kid?100:1000);const inp=document.querySelector(`[data-ivin="${s}"]`);if(inp)a=+inp.value||0;
    if(a<10){(window.toast||alert)("Najmenej 10 €.");return}trade(who,s,f=>(a-1)/f.px);return}
  if(t.dataset.ivsell){const s=t.dataset.ivsell,p=((I.st&&I.st.pf)||[]).find(x=>x.who===who),q=p&&p.hold&&p.hold[s]?+p.hold[s].q:0;if(!q)return;if(!confirm(kid?"Naozaj predať celý košík?":"Predať všetky kusy?"))return;trade(who,s,()=>-q)}},true);
document.addEventListener("input",e=>{const t=e.target;if(t.dataset&&t.dataset.ivin)I.amt[t.dataset.ivin]=+t.value||0},true);

{const st=document.createElement("style");st.textContent=`.ivx .t{font-weight:700;margin-bottom:6px}.ivh3{margin:12px 0 6px;font-size:1rem}
.ivn{border:1px solid rgba(255,255,255,.12);border-radius:14px;margin-top:8px;overflow:hidden;background:rgba(255,255,255,.03)}.ivn.new{border-color:rgba(182,255,59,.5)}
.ivnh{all:unset;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;width:100%;padding:10px 12px;cursor:pointer;text-align:left}.ivnh small{opacity:.7;font-size:.76rem}
.ivnb{padding:0 12px 12px;line-height:1.5;font-size:.92rem;overflow-wrap:anywhere}
.ivrace{display:grid;gap:6px}.ivrr{display:grid;grid-template-columns:1fr auto auto 90px;gap:8px;align-items:center;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1)}
.ivrr.lead{border-color:rgba(250,204,21,.6);background:rgba(250,204,21,.08)}.ivrn{font-weight:700;min-width:0;overflow-wrap:anywhere}
.ivsp{width:100%;height:auto;display:block}.up{color:#86efac}.dn{color:#fca5a5}
.ivtabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}.ivtabs button{flex:1 1 90px;min-height:38px}.ivtabs button.on{background:linear-gradient(135deg,#b6ff3b,#22d3ee);color:#0b1020;font-weight:700}
.ivpfh{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ivpfh>div{padding:10px;border-radius:12px;background:rgba(255,255,255,.05);display:grid;gap:2px;text-align:center}.ivpfh b{font-size:1.25rem}.ivpfh small{opacity:.75;font-size:.76rem}
.ivh{display:grid;gap:6px;margin-top:8px}.ivhr{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)}.ivhr span{display:grid;gap:2px;min-width:0}.ivhr span:last-child{text-align:right}.ivhr small{opacity:.75;font-size:.76rem}
.ivfl{display:grid;gap:8px}.ivf{padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);display:grid;gap:6px;min-width:0}
.ivft{display:grid;gap:2px}.ivft b{overflow-wrap:anywhere}.ivft small{opacity:.72;font-size:.78rem}.ivfm{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:.86rem;align-items:baseline}.ivpx{font-weight:700}.ivpx small{font-weight:400;opacity:.7}
.ivfa{display:flex;flex-wrap:wrap;gap:6px;align-items:flex-end}.ivfa label{flex:1 1 110px;display:grid;gap:2px;font-size:.78rem}.ivfa input{width:100%;box-sizing:border-box}.ivfa button{flex:1 1 90px;min-height:40px}.ivfa button.on{outline:2px solid #b6ff3b}
.ivl{border-top:1px solid rgba(255,255,255,.1);padding:8px 0}.ivl summary{cursor:pointer;font-weight:600}.ivl p{line-height:1.55;margin:8px 0 2px}
.ivk h2{margin-top:0}@media(min-width:800px){.ivfl{grid-template-columns:1fr 1fr}}@media(max-width:380px){.ivrr{grid-template-columns:1fr auto auto}.ivrr .ivsp{display:none}}`;document.head.appendChild(st)}
})();

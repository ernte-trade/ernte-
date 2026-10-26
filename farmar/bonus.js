// ===== ERNTE · BONUS K VÝKUPNEJ CENE: „konečná cena až do +X %“ po komoditách =====
// Nastavuje majiteľ alebo ten, kto smie meniť cenník (price_edit). Farmár vidí len zadanú cenu ERNTE,
// strop bonusu a podmienky – nikdy burzu, odberateľa ani interné odpočty.
(function(){
const RT={qty:["Množstvo aspoň","t"],moist:["Vlhkosť najviac","%"],dirt:["Nečistoty najviac","%"],fast:["Odvoz do","dní od podpisu"],contract:["Zmluva vopred na celé množstvo",""],custom:["Iná podmienka",""]};
const SUG={qty1:{t:"qty",v:100,pct:1},qty2:{t:"qty",v:300,pct:1},moist:{t:"moist",v:null,pct:1},dirt:{t:"dirt",v:1,pct:1},fast:{t:"fast",v:14,pct:1},contract:{t:"contract",v:null,pct:1}};
const LIM={repka:{m:8},soja:{m:12},kukurica:{m:14},lo:{m:8},ho:{m:8},psenica_p:{m:14},psenica_k:{m:14},jacmen_k:{m:14},jacmen_s:{m:14},cirok:{m:14}};
const r2=x=>Math.round(x*100)/100;
const cfg=()=>((STATE.settings||{}).price_bonus)||{};
const cOf=com=>{const c=cfg()[com];return c&&+c.max>0?c:null};
function suggest(com){const m=(LIM[com]||{m:14}).m;return {max:5,rules:[{...SUG.qty1},{...SUG.qty2},{t:"moist",v:Math.max(1,m-1),pct:1},{...SUG.dirt},{...SUG.fast}]}}
function ruleTxt(r){const L=RT[r.t]||RT.custom;if(r.t==="custom")return r.label||"Iná podmienka";if(r.t==="contract")return r.label||L[0];return `${L[0]} ${String(r.v??"").replace(".",",")} ${L[1]}`.trim()}
// koľko % získa farmár pri zadaných hodnotách
function evalB(c,inp){let got=0;const rows=(c.rules||[]).map((r,i)=>{let ok=false,hint="";const v=+r.v;
   if(r.t==="qty"){const t=+inp.tons||0;ok=t>=v;hint=ok?"":t>0?`pridajte ešte ${fmt(v-t,1)} t`:`ponúknite aspoň ${fmt(v,0)} t`}
   else if(r.t==="moist"){const x=inp.moist;ok=x!==""&&x!=null&&+x<=v;hint=ok?"":x!==""&&x!=null?`vysušte o ${fmt(+x-v,1)} %`:"zadajte vlhkosť"}
   else if(r.t==="dirt"){const x=inp.dirt;ok=x!==""&&x!=null&&+x<=v;hint=ok?"":x!==""&&x!=null?`prečistite o ${fmt(+x-v,1)} %`:"zadajte nečistoty"}
   else{ok=!!inp["c"+i];hint=ok?"":"zaškrtnite, ak to splníte"}
   if(ok)got+=+r.pct||0;return {r,ok,hint,i}});
  const pct=Math.min(+c.max||0,got);return {rows,pct,full:got}}
// ---- FARMÁR: riadok pod cenou + kalkulačka ----
let OPEN=null;const INP={};
window.bonusRow=function(p){const c=cOf(p.com);if(!c||p.price==null)return "";const top=r2(p.price*(1+c.max/100));
  const open=OPEN===p.com,I=INP[p.com]||(INP[p.com]={tons:"",moist:"",dirt:""});
  return `<div class="bnr"><div class="bnl"><span class="bnup">🎯 Konečná cena až do <b>+${fmt(c.max,1)} %</b></span><span class="bnto">až <b class="num">${fmt(top)} €/t</b></span></div>
   <button type="button" class="bnb" data-bon="${esc(p.com)}">${open?"✕ Zavrieť":"Ako dosiahnuť vyššiu cenu"}</button>
   ${open?`<div class="bnc" data-bonc="${esc(p.com)}">${calcBody(p,c,I)}</div>`:""}</div>`};
function calcBody(p,c,I){const has=t=>(c.rules||[]).some(r=>r.t===t);
  return `<div class="bnin">${has("qty")?`<label>Koľko ton ponúkate?<input data-bk="tons" inputmode="decimal" value="${esc(I.tons)}" placeholder="napr. 150"></label>`:""}
    ${has("moist")?`<label>Vlhkosť (%)<input data-bk="moist" inputmode="decimal" value="${esc(I.moist)}" placeholder="napr. ${(LIM[p.com]||{m:14}).m}"></label>`:""}
    ${has("dirt")?`<label>Nečistoty (%)<input data-bk="dirt" inputmode="decimal" value="${esc(I.dirt)}" placeholder="napr. 1,5"></label>`:""}</div>
   <div class="bnout">${outHTML(p,c,I)}</div>
   <div class="s">Odhad podľa vašich údajov. Konečnú cenu potvrdí ERNTE v zmluve podľa skutočného množstva a kvality (vážny lístok, rozbor).</div>`}
function outHTML(p,c,I){const E=evalB(c,{tons:num(I.tons),moist:I.moist===""?"":num(I.moist),dirt:I.dirt===""?"":num(I.dirt),...I.ck}),pr=r2(p.price*(1+E.pct/100)),w=c.max?E.pct/c.max*100:0;
  const nx=E.rows.filter(x=>!x.ok).sort((a,b)=>(+b.r.pct)-(+a.r.pct))[0];
  return `<div class="bnres"><div><small>Vaša odhadovaná cena</small><b class="num">${fmt(pr)} €/t</b></div><div><small>Bonus</small><b class="num">+${fmt(E.pct,1)} %</b></div></div>
   <div class="bnbar" role="progressbar" aria-valuemin="0" aria-valuemax="${c.max}" aria-valuenow="${E.pct}"><i style="width:${Math.min(100,w).toFixed(0)}%"></i><span>${E.pct>=c.max?"🏆 maximálna cena":`do maxima chýba ${fmt(c.max-E.pct,1)} %`}</span></div>
   <ul class="bnlist">${E.rows.map(x=>`<li class="${x.ok?"ok":""}">${["fast","contract","custom"].includes(x.r.t)?`<label class="bnck"><input type="checkbox" data-bc="${x.i}"${(I.ck||{})["c"+x.i]?" checked":""}>`:"<span>"}<i>${x.ok?"✓":"○"}</i><b>${esc(ruleTxt(x.r))}</b><em>+${fmt(+x.r.pct,1)} %</em>${x.hint?`<small>${esc(x.hint)}</small>`:""}${["fast","contract","custom"].includes(x.r.t)?"</label>":"</span>"}</li>`).join("")}</ul>
   ${nx&&E.pct<c.max?`<div class="bntip">💡 Najviac pomôže: <b>${esc(ruleTxt(nx.r))}</b> → +${fmt(+nx.r.pct,1)} % (${fmt(r2(p.price*(+nx.r.pct)/100))} €/t navyše)</div>`:""}
   ${(!window.fcan||fcan("f_sell"))?`<div class="btns"><button type="button" class="lime" data-bsell="${esc(p.com)}">Predať${num(I.tons)>0?" "+fmt(num(I.tons),1)+" t":""} za odhad ${fmt(pr)} €/t</button></div>`:""}`}
function refresh(com){const el=document.querySelector(`[data-bonc="${CSS.escape(com)}"] .bnout`),p=(STATE.prices||[]).find(x=>x.com===com),c=cOf(com);if(el&&p&&c)el.innerHTML=outHTML(p,c,INP[com])}
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.bk;if(!k)return;const box=e.target.closest("[data-bonc]");if(!box)return;const com=box.dataset.bonc;INP[com][k]=e.target.value;refresh(com)});
document.addEventListener("change",e=>{const i=e.target.dataset&&e.target.dataset.bc;if(i==null)return;const box=e.target.closest("[data-bonc]");if(!box)return;const com=box.dataset.bonc;INP[com].ck=INP[com].ck||{};INP[com].ck["c"+i]=e.target.checked;refresh(com)});
document.addEventListener("click",e=>{let x=e.target.closest("[data-bon]");if(x){OPEN=OPEN===x.dataset.bon?null:x.dataset.bon;renderFarmer();return}
  x=e.target.closest("[data-bsell]");if(x){const com=x.dataset.bsell,I=INP[com]||{},c=cOf(com),p=(STATE.prices||[]).find(y=>y.com===com);
    const E=c&&p?evalB(c,{tons:num(I.tons),moist:I.moist===""?"":num(I.moist),dirt:I.dirt===""?"":num(I.dirt),...(I.ck||{})}):null;
    window.BONUS_NOTE=E?`Odhad bonusu +${fmt(E.pct,1)} % (${fmt(r2(p.price*(1+E.pct/100)))} €/t)${I.moist!==""?", vlhkosť "+I.moist+" %":""}${I.dirt!==""?", nečistoty "+I.dirt+" %":""}`:"";
    SELL=com;OPEN=null;renderFarmer();setTimeout(()=>{const f=document.getElementById("fSell");if(!f)return;const t=f.querySelector("input[name=tons]"),n=f.querySelector("input[name=note]");if(t&&I.tons)t.value=I.tons;if(n&&window.BONUS_NOTE)n.value=window.BONUS_NOTE;f.scrollIntoView({block:"center"})},60)}});

// ---- ERNTE (Cenník): nastavenie bonusu po komoditách ----
let EDIT=null;
function cfgCard(){const P=STATE.prices||[],C=cfg(),ed=typeof can==="function"?can("price_edit"):ROLE==="owner";
  const L=MK.filter(m=>P.some(x=>x.com===m[0]&&x.price!=null));
  let h=`<div class="card bnset"><div class="tdh"><b>🎯 Bonus pre farmárov · „konečná cena až do +%“</b><small>${ed?"nastav pri každej komodite zvlášť":"nastavuje majiteľ / manažér obchodu"}</small></div>
   <div class="s">Farmár pri cene uvidí, o koľko % sa môže jeho cena zvýšiť, a kalkulačku, ktorá ho navedie, čo má splniť (množstvo, vlhkosť, nečistoty, rýchly odvoz, zmluva vopred). Prázdne / 0 % = farmár bonus nevidí.</div>`;
  if(!L.length)return h+`<div class="s">Najprv zadaj výkupné ceny.</div></div>`;
  h+=`<div class="bngrid">${L.map(m=>{const p=P.find(x=>x.com===m[0]),c=C[m[0]],on=c&&+c.max>0,top=on?r2(p.price*(1+c.max/100)):null;
    return `<div class="bncard${on?" on":""}"><div class="bnh"><b>${esc(m[1])}</b><span class="num">${fmt(p.price)} €/t</span></div>
      ${on?`<div class="bnsum">až <b>+${fmt(c.max,1)} %</b> → do <b class="num">${fmt(top)} €/t</b><small>${(c.rules||[]).map(r=>esc(ruleTxt(r))+" +"+fmt(+r.pct,1)+" %").join(" · ")}</small></div>`:`<div class="s">bonus vypnutý</div>`}
      ${ed?`<button type="button" data-bed="${m[0]}">${EDIT===m[0]?"✕ Zavrieť":on?"✏️ Upraviť":"＋ Nastaviť bonus"}</button>`:""}
      ${EDIT===m[0]?editForm(m[0],c||suggest(m[0]),p):""}</div>`}).join("")}</div></div>`;
  return h}
function editForm(com,c,p){const R=c.rules||[];
  return `<form class="bnf" data-bsave="${com}"><label>Strop bonusu (%)<input name="max" inputmode="decimal" value="${String(c.max??"").replace(".",",")}" placeholder="napr. 5"></label>
   <div class="s">Podmienky (súčet % sa oreže na strop) – <b>typ · hodnota · + %</b>:</div>
   ${R.map((r,i)=>ruleRow(r,i)).join("")}${ruleRow({t:"",v:"",pct:""},R.length)}
   <div class="btns"><button class="pri" type="submit">💾 Uložiť – farmári uvidia hneď</button><button type="button" data-bsug="${com}">✨ Navrhnúť podmienky</button><button type="button" class="dng" data-boff="${com}">Vypnúť</button></div>
   <div class="s">Príklad: pri ${fmt(p.price)} €/t a strope ${fmt(+c.max||0,1)} % je najvyššia cena ${fmt(r2(p.price*(1+(+c.max||0)/100)))} €/t.</div></form>`}
function ruleRow(r,i){return `<div class="bnrow"><select name="t${i}"><option value="">– bez podmienky –</option>${Object.entries(RT).map(([k,v])=>`<option value="${k}"${r.t===k?" selected":""}>${esc(v[0])}${v[1]?" ("+v[1]+")":""}</option>`).join("")}</select>
   <input name="v${i}" inputmode="decimal" placeholder="hodnota" value="${r.v==null?"":String(r.v).replace(".",",")}" aria-label="hodnota"><input name="p${i}" inputmode="decimal" placeholder="+ %" value="${r.pct===""||r.pct==null?"":String(r.pct).replace(".",",")}" aria-label="percent">
   <input name="l${i}" placeholder="popis (nepovinné)" value="${esc(r.label||"")}" aria-label="popis"></div>`}
async function saveCfg(next){const r=await sb.from("settings").upsert({key:"price_bonus",value:next});if(r.error){toast("Neuložené: "+r.error.message,6000);return false}
  STATE.settings=STATE.settings||{};STATE.settings.price_bonus=next;return true}
const _vp=window.vPrice;window.vPrice=function(){return _vp.apply(this,arguments)+cfgCard()};
document.addEventListener("click",async e=>{let x=e.target.closest("[data-bed]");if(x){EDIT=EDIT===x.dataset.bed?null:x.dataset.bed;renderStaff();return}
  x=e.target.closest("[data-bsug]");if(x){const com=x.dataset.bsug,c=suggest(com),f=x.closest("form");f.outerHTML=editForm(com,c,(STATE.prices||[]).find(p=>p.com===com));toast("Navrhnuté – skontroluj a ulož.");return}
  x=e.target.closest("[data-boff]");if(x){if(!confirm("Vypnúť bonus pre túto komoditu?"))return;const n={...cfg()};delete n[x.dataset.boff];if(await saveCfg(n)){EDIT=null;renderStaff();toast("Bonus vypnutý.")}}});
document.addEventListener("submit",async e=>{const f=e.target;if(!f.dataset||!f.dataset.bsave)return;e.preventDefault();e.stopPropagation();const d=new FormData(f),com=f.dataset.bsave,mx=num(d.get("max"));
  if(!(mx>=0&&mx<=30)){toast("Strop zadaj 0 až 30 %.");return}const rules=[];
  for(let i=0;i<20;i++){const t=d.get("t"+i);if(t==null)break;if(!t)continue;const pct=num(d.get("p"+i));if(!(pct>0)){toast("Pri podmienke zadaj + %.");return}
    const v=d.get("v"+i)===""?null:num(d.get("v"+i));if(["qty","moist","dirt","fast"].includes(t)&&!(v>0)){toast("Pri „"+RT[t][0]+"“ zadaj hodnotu.");return}
    rules.push({t,v,pct,label:String(d.get("l"+i)||"").trim()||undefined})}
  const n={...cfg()};if(mx>0)n[com]={max:mx,rules};else delete n[com];if(await saveCfg(n)){EDIT=null;renderStaff();toast("✓ Bonus uložený – farmári ho vidia.")}},true);
})();

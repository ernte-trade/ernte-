// ===== ERNTE · DYNAMICKÝ VZOREC CENY PRE FARMÁRA =====
// Majiteľ alebo obchod zadá v Cenníku cenu P. Farmár automaticky vidí základnú cenu P − 5 %
// a kalkulačku, ako získať bonus až 5 % – po splnení všetkých podmienok dostane plnú cenu P.
// Percentá sa rátajú z plnej ceny P, takže farmár nikdy nedostane viac ako P.
(function(){
const RT={qty:["Množstvo aspoň","t"],moist:["Vlhkosť najviac","%"],dirt:["Nečistoty najviac","%"],fast:["Odvoz do","dní od podpisu"],contract:["Zmluva vopred na celé množstvo",""],custom:["Iná podmienka",""]};
const LIM=(typeof SPEC!=="undefined")?Object.fromEntries(Object.entries(SPEC).map(([k,v])=>[k,v[0]])):{repka:8,soja:12,kukurica:14,lo:9,ho:9,psenica_p:14,psenica_k:13,jacmen_k:14,jacmen_s:14.5,cirok:14};
const r2=x=>Math.round(x*100)/100;
const DEF_RULES=[{t:"qty",v:100,pct:1},{t:"qty",v:300,pct:1},{t:"moist",v:-1,pct:1},{t:"dirt",v:1,pct:1},{t:"fast",v:14,pct:1}]; // v:-1 = limit komodity mínus 1 %
const raw=()=>((typeof STATE!=="undefined"&&STATE.settings)||{}).price_bonus||{};
function gdef(){const g=raw()._def;return g&&g.max!=null?g:{max:5,rules:DEF_RULES}}
function rulesFor(com,rules){return (rules||[]).map(r=>r.t==="moist"&&+r.v===-1?{...r,v:Math.max(1,(LIM[com]||14)-1)}:r)}
// konfigurácia pre komoditu: vlastná, alebo spoločný vzorec
function cOf(com){const o=raw()[com];const c=o&&o.max!=null?o:gdef();return {max:+c.max||0,rules:rulesFor(com,c.rules),own:!!(o&&o.max!=null)}}
window.farmDisc=com=>cOf(com).max;
function ruleTxt(r){const L=RT[r.t]||RT.custom;if(r.t==="custom")return r.label||"Iná podmienka";if(r.t==="contract")return r.label||L[0];return (r.label?r.label+" – ":"")+`${L[0]} ${String(r.v??"").replace(".",",")} ${L[1]}`.trim()}
function evalB(c,inp){let got=0;const rows=(c.rules||[]).map((r,i)=>{let ok=false,hint="";const v=+r.v;
   if(r.t==="qty"){const t=+inp.tons||0;ok=t>=v;hint=ok?"":t>0?`pridajte ešte ${fmt(v-t,1)} t`:`ponúknite aspoň ${fmt(v,0)} t`}
   else if(r.t==="moist"){const x=inp.moist;ok=x!==""&&x!=null&&+x<=v;hint=ok?"":x!==""&&x!=null?`vysušte o ${fmt(+x-v,1)} %`:"zadajte vlhkosť"}
   else if(r.t==="dirt"){const x=inp.dirt;ok=x!==""&&x!=null&&+x<=v;hint=ok?"":x!==""&&x!=null?`prečistite o ${fmt(+x-v,1)} %`:"zadajte nečistoty"}
   else{ok=!!inp["c"+i];hint=ok?"":"zaškrtnite, ak to splníte"}
   if(ok)got+=+r.pct||0;return {r,ok,hint,i}});
  return {rows,pct:Math.min(c.max,got)}}

// ---- FARMÁR: cena −5 % automaticky ----
const _lf=window.loadFarmer;
window.loadFarmer=async function(){await _lf.apply(this,arguments);
  STATE.prices=(STATE.prices||[]).map(p=>{if(p.full!=null)return p;const d=cOf(p.com).max;return {...p,full:+p.price,price:r2(+p.price*(1-d/100))}})};
let OPEN=null;const INP={};
window.bonusRow=function(p){if(typeof FARMER==="undefined"||!FARMER||p.full==null)return "";const c=cOf(p.com);if(!(c.max>0))return "";
  const open=OPEN===p.com,I=INP[p.com]||(INP[p.com]={tons:"",moist:"",dirt:""});
  return `<div class="bnr"><div class="bnl"><span class="bnup">🎯 Bonus až <b>+${fmt(c.max,1)} %</b></span><span class="bnto">cena až <b class="num">${fmt(p.full)} €/t</b></span></div>
   <button type="button" class="bnb" data-bon="${esc(p.com)}">${open?"✕ Zavrieť":"Ako získať bonus "+fmt(c.max,0)+" %"}</button>
   ${open?`<div class="bnc" data-bonc="${esc(p.com)}">${calcBody(p,c,I)}</div>`:""}</div>`};
function calcBody(p,c,I){const has=t=>(c.rules||[]).some(r=>r.t===t);
  return `<div class="bnex">Základná cena <b>${fmt(p.price)} €/t</b> + bonus za každú splnenú podmienku. Pri splnení všetkých dostanete <b>${fmt(p.full)} €/t</b>.</div>
   <div class="bnin">${has("qty")?`<label>Koľko ton ponúkate?<input data-bk="tons" inputmode="decimal" value="${esc(I.tons)}" placeholder="napr. 150"></label>`:""}
    ${has("moist")?`<label>Vlhkosť (%)<input data-bk="moist" inputmode="decimal" value="${esc(I.moist)}" placeholder="napr. ${LIM[p.com]||14}"></label>`:""}
    ${has("dirt")?`<label>Nečistoty (%)<input data-bk="dirt" inputmode="decimal" value="${esc(I.dirt)}" placeholder="napr. 1,5"></label>`:""}</div>
   <div class="bnout">${outHTML(p,c,I)}</div>
   <div class="s">Odhad podľa vašich údajov. Konečnú cenu potvrdí ERNTE v zmluve podľa skutočného množstva a kvality (vážny lístok, rozbor).</div>`}
const inpOf=I=>({tons:num(I.tons),moist:I.moist===""?"":num(I.moist),dirt:I.dirt===""?"":num(I.dirt),...(I.ck||{})});
const priceAt=(p,pct)=>Math.min(p.full,r2(p.price+p.full*pct/100));
function outHTML(p,c,I){const E=evalB(c,inpOf(I)),pr=priceAt(p,E.pct),w=c.max?E.pct/c.max*100:0;
  const nx=E.rows.filter(x=>!x.ok).sort((a,b)=>(+b.r.pct)-(+a.r.pct))[0];
  return `<div class="bnres"><div><small>Vaša cena</small><b class="num">${fmt(pr)} €/t</b></div><div><small>Bonus</small><b class="num">+${fmt(E.pct,1)} % · +${fmt(r2(pr-p.price))} €</b></div></div>
   <div class="bnbar" role="progressbar" aria-valuemin="0" aria-valuemax="${c.max}" aria-valuenow="${E.pct}"><i style="width:${Math.min(100,w).toFixed(0)}%"></i><span>${E.pct>=c.max?"🏆 plná cena "+fmt(p.full)+" €/t":`do plnej ceny chýba ${fmt(c.max-E.pct,1)} % (${fmt(r2(p.full-pr))} €/t)`}</span></div>
   <ul class="bnlist">${E.rows.map(x=>{const ck=["fast","contract","custom"].includes(x.r.t),tag=ck?"label":"span";return `<li class="${x.ok?"ok":""}"><${tag}${ck?' class="bnck"':""}>${ck?`<input type="checkbox" data-bc="${x.i}"${(I.ck||{})["c"+x.i]?" checked":""}>`:""}<i>${x.ok?"✓":"○"}</i><b>${esc(ruleTxt(x.r))}</b><em>+${fmt(+x.r.pct,1)} % · ${fmt(r2(p.full*(+x.r.pct)/100))} €</em>${x.hint?`<small>${esc(x.hint)}</small>`:""}</${tag}></li>`}).join("")}</ul>
   ${nx&&E.pct<c.max?`<div class="bntip">💡 Najviac pomôže: <b>${esc(ruleTxt(nx.r))}</b> → +${fmt(r2(p.full*(+nx.r.pct)/100))} €/t</div>`:""}
   ${(!window.fcan||fcan("f_sell"))?`<div class="btns"><button type="button" class="lime" data-bsell="${esc(p.com)}">Predať${num(I.tons)>0?" "+fmt(num(I.tons),1)+" t":""} za ${fmt(pr)} €/t</button></div>`:""}`}
function refresh(com){const el=document.querySelector(`[data-bonc="${CSS.escape(com)}"] .bnout`),p=(STATE.prices||[]).find(x=>x.com===com);if(el&&p&&p.full!=null)el.innerHTML=outHTML(p,cOf(com),INP[com])}
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.bk;if(!k)return;const box=e.target.closest("[data-bonc]");if(!box)return;INP[box.dataset.bonc][k]=e.target.value;refresh(box.dataset.bonc)});
document.addEventListener("change",e=>{const i=e.target.dataset&&e.target.dataset.bc;if(i==null)return;const box=e.target.closest("[data-bonc]");if(!box)return;const I=INP[box.dataset.bonc];I.ck=I.ck||{};I.ck["c"+i]=e.target.checked;refresh(box.dataset.bonc)});
document.addEventListener("click",e=>{let x=e.target.closest("[data-bon]");if(x){OPEN=OPEN===x.dataset.bon?null:x.dataset.bon;renderFarmer();return}
  x=e.target.closest("[data-bsell]");if(x){const com=x.dataset.bsell,I=INP[com]||{},p=(STATE.prices||[]).find(y=>y.com===com);if(!p)return;const E=evalB(cOf(com),inpOf(I));
    window.BONUS_NOTE=`Bonus podľa kalkulačky +${fmt(E.pct,1)} % → ${fmt(priceAt(p,E.pct))} €/t${I.moist!==""&&I.moist!=null?", vlhkosť "+I.moist+" %":""}${I.dirt!==""&&I.dirt!=null?", nečistoty "+I.dirt+" %":""}${E.rows.filter(r=>r.ok&&["fast","contract","custom"].includes(r.r.t)).map(r=>", "+ruleTxt(r.r)).join("")}`;
    SELL=com;OPEN=null;renderFarmer();setTimeout(()=>{const f=document.getElementById("fSell");if(!f)return;const t=f.querySelector("input[name=tons]"),n=f.querySelector("input[name=note]");if(t&&I.tons)t.value=I.tons;if(n)n.value=window.BONUS_NOTE;f.scrollIntoView({block:"center"})},60)}});

// ---- ERNTE (Cenník): vzorec + podmienky ----
let EDIT=null;
const canEd=()=>typeof can==="function"?can("price_edit"):ROLE==="owner";
function cfgCard(){const P=(STATE.prices||[]).filter(p=>p.price!=null),g=gdef(),ed=canEd();
  let h=`<div class="card bnset"><div class="tdh"><b>🎯 Cena pre farmára · dynamický vzorec</b><small>${ed?"platí automaticky pre každú zadanú cenu":"nastavuje majiteľ / manažér obchodu"}</small></div>
   <div class="bnform">Farmár vidí <b>zadanú cenu − ${fmt(g.max,1)} %</b> a kalkulačku, ako získať bonus späť až do <b>plnej zadanej ceny</b>.</div>
   <div class="bnrules"><b>Podmienky bonusu (spoločné pre všetky komodity):</b> ${rulesFor("repka",g.rules).map(r=>esc(ruleTxt(r).replace(/Vlhkosť najviac 7 %/,"Vlhkosť o 1 % pod limitom"))+" <b>+"+fmt(+r.pct,1)+" %</b>").join(" · ")}</div>
   ${ed?`<div class="btns"><button type="button" data-bed="_def">${EDIT==="_def"?"✕ Zavrieť":"✏️ Upraviť vzorec a podmienky"}</button></div>${EDIT==="_def"?editForm("_def",g):""}`:""}`;
  if(!P.length)return h+`<div class="s">Zadaj výkupné ceny – farmárske sa dopočítajú samé.</div></div>`;
  h+=`<div class="bngrid">${MK.filter(m=>P.some(x=>x.com===m[0])).map(m=>{const p=P.find(x=>x.com===m[0]),c=cOf(m[0]),base=r2(p.price*(1-c.max/100));
    return `<div class="bncard on"><div class="bnh"><b>${esc(m[1])}</b>${c.own?`<span class="pill">vlastné</span>`:""}</div>
      <div class="bnflow"><div><small>zadaná (plná)</small><b class="num">${fmt(p.price)}</b></div><i>→</i><div class="fv"><small>farmár vidí</small><b class="num">${fmt(base)}</b></div><i>+</i><div><small>bonus až</small><b class="num">${fmt(r2(p.price-base))}</b></div></div>
      ${ed?`<div class="btns"><button type="button" data-bed="${m[0]}">${EDIT===m[0]?"✕ Zavrieť":c.own?"✏️ Vlastné podmienky":"Iné podmienky pre "+esc(m[1])}</button>${c.own?`<button type="button" data-boff="${m[0]}">↺ Spoločný vzorec</button>`:""}</div>`:""}
      ${EDIT===m[0]?editForm(m[0],c):""}</div>`}).join("")}</div></div>`;
  return h}
function editForm(key,c){const R=c.rules||[];
  return `<form class="bnf" data-bsave="${key}"><label>Farmár vidí o koľko % menej (= max. bonus)<input name="max" inputmode="decimal" value="${String(c.max??"").replace(".",",")}" placeholder="5"></label>
   <div class="s">Podmienky – <b>typ · hodnota · + % z plnej ceny</b>${key==="_def"?" (vlhkosť −1 = 1 % pod limitom komodity)":""}:</div>
   ${R.map((r,i)=>ruleRow(r,i)).join("")}${ruleRow({t:"",v:"",pct:""},R.length)}
   <div class="btns"><button class="pri" type="submit">💾 Uložiť – farmári uvidia hneď</button>${key==="_def"?`<button type="button" data-bsug="1">↺ Predvolené (5 × 1 %)</button>`:""}</div></form>`}
function ruleRow(r,i){return `<div class="bnrow"><select name="t${i}"><option value="">– bez podmienky –</option>${Object.entries(RT).map(([k,v])=>`<option value="${k}"${r.t===k?" selected":""}>${esc(v[0])}${v[1]?" ("+v[1]+")":""}</option>`).join("")}</select>
   <input name="v${i}" inputmode="decimal" placeholder="hodnota" value="${r.v==null?"":String(r.v).replace(".",",")}" aria-label="hodnota"><input name="p${i}" inputmode="decimal" placeholder="+ %" value="${r.pct===""||r.pct==null?"":String(r.pct).replace(".",",")}" aria-label="percent">
   <input name="l${i}" placeholder="popis (nepovinné)" value="${esc(r.label||"")}" aria-label="popis"></div>`}
async function saveCfg(next){const r=await sb.from("settings").upsert({key:"price_bonus",value:next});if(r.error){toast("Neuložené: "+r.error.message,6000);return false}
  STATE.settings=STATE.settings||{};STATE.settings.price_bonus=next;return true}
const _vp=window.vPrice;window.vPrice=function(){return _vp.apply(this,arguments)+cfgCard()};
document.addEventListener("click",async e=>{let x=e.target.closest("[data-bed]");if(x){EDIT=EDIT===x.dataset.bed?null:x.dataset.bed;renderStaff();return}
  x=e.target.closest("[data-bsug]");if(x){const f=x.closest("form");f.outerHTML=editForm("_def",{max:5,rules:DEF_RULES});toast("Predvolené – ulož.");return}
  x=e.target.closest("[data-boff]");if(x){const n={...raw()};delete n[x.dataset.boff];if(await saveCfg(n)){EDIT=null;renderStaff();toast("Komodita používa spoločný vzorec.")}}});
document.addEventListener("submit",async e=>{const f=e.target;if(!f.dataset||!f.dataset.bsave)return;e.preventDefault();e.stopPropagation();const d=new FormData(f),key=f.dataset.bsave,mx=num(d.get("max"));
  if(!(mx>=0&&mx<=30)){toast("Zadaj 0 až 30 %.");return}const rules=[];let sum=0;
  for(let i=0;i<20;i++){const t=d.get("t"+i);if(t==null)break;if(!t)continue;const pct=num(d.get("p"+i));if(!(pct>0)){toast("Pri podmienke zadaj + %.");return}
    const v=d.get("v"+i)===""?null:num(d.get("v"+i));if(["qty","dirt","fast"].includes(t)&&!(v>0)){toast("Pri „"+RT[t][0]+"“ zadaj hodnotu.");return}if(t==="moist"&&!(v>0||v===-1)){toast("Pri vlhkosti zadaj hodnotu (alebo −1).");return}
    sum+=pct;rules.push({t,v,pct,label:String(d.get("l"+i)||"").trim()||undefined})}
  if(mx>0&&sum<mx&&!confirm(`Súčet podmienok je ${fmt(sum,1)} %, ale farmár vidí cenu o ${fmt(mx,1)} % menšiu – plnú cenu nikdy nedosiahne. Uložiť aj tak?`))return;
  const n={...raw(),[key]:{max:mx,rules}};if(await saveCfg(n)){EDIT=null;renderStaff();toast("✓ Uložené – farmári vidia nové ceny hneď.")}},true);
})();

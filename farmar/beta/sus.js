// ===== ERNTE · Kalkulačka sušenia a čistenia – pre farmárov a obchodníkov =====
// Rovnaká metodika ako vyúčtovanie (Zúčtovanie): nečistoty a zlomky nad limit z hrubej váhy,
// voda presným vzorcom (W−N)/(100−W) z váhy po čistení, náklady čistenia a sušenia sa prepočítajú na tony (technologická zrážka).
(function(){
const e=x=>typeof esc==="function"?esc(x):String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const f2=(x,d=2)=>typeof fmt==="function"?fmt(x,d):(+x).toFixed(d);
const num=v=>{if(v==null||v==="")return null;const x=parseFloat(String(v).replace(/\s/g,"").replace(",","."));return Number.isFinite(x)?x:null};
const cn=k=>typeof comName==="function"?comName(k):k;
let U={open:false,R:null,com:"",t:"100",w:"",p:"",b:"",c:"",cTouched:false,loading:false};
const prices=()=>(typeof STATE!=="undefined"&&STATE.prices)||[];
async function loadR(){if(U.loading)return;U.loading=true;let r;try{r=await sb.rpc("sus_rules")}catch(x){r={error:x}}U.loading=false;
  U.R=r.error?{norm:{kukurica:14,soja:13},clean:2.5,dry:3.5,broken_limit:5,off:true}:r.data;if(!U.com)U.com=Object.keys(U.R.norm).includes("kukurica")?"kukurica":Object.keys(U.R.norm)[0];setPrice();rer()}
function setPrice(){if(U.cTouched)return;const p=prices().find(x=>x.com===U.com);U.c=p&&p.price?String(p.price).replace(".",","):""}
function rer(){if(typeof FARMER!=="undefined"&&FARMER&&typeof renderFarmer==="function")renderFarmer();else if(typeof renderStaff==="function")renderStaff()}

// výpočet na 1 dodávku (t)
function calc(com,j,w,p,b,price){const R=U.R,nm=+(R.norm[com]??14),lim=+(R.broken_limit??5);
  p=Math.max(0,p||0);const q=com==="kukurica"?Math.max(0,(b||0)-lim):0;
  const sk=j*(1-(p+q)/100);                                  // po čistení
  const uk=w!=null&&w>nm?sk-sk*(w-nm)/(100-w):sk;            // po sušení (presný vzorec)
  const xe=p>0?j*(+R.clean):0, ye=w!=null&&w>nm?sk*(w-nm)*(+R.dry):0;
  const tech=price>0?(xe+ye)/price:0, inv=Math.max(0,uk-tech);
  return {nm,q,sk,uk,xe,ye,tech,inv,eur:inv*(price||0),voda:sk-uk,nec:j-sk,full:j*(price||0)}}

window.susCardHTML=function(){
  if(!U.open)return `<button type="button" class="card susbtn" data-susopen><span>🧮</span><div><b>Kalkulačka sušenia a čistenia</b><small>Koľko dostanete zaplatené pri danej vlhkosti a nečistotách</small></div><i>›</i></button>`;
  if(!U.R){loadR();return `<div class="card"><div class="s">Načítavam kalkulačku…</div></div>`}
  const K=Object.keys(U.R.norm);
  return `<div class="card sus"><div class="row"><b>🧮 Kalkulačka sušenia a čistenia</b><button type="button" class="evmini" data-susopen>Zavrieť</button></div>
   <form class="f susf" id="susF" onsubmit="return false">
    <label>Komodita<select name="com">${K.map(k=>`<option value="${e(k)}"${k===U.com?" selected":""}>${e(cn(k))} · norma ${f2(U.R.norm[k],0)} %</option>`).join("")}</select></label>
    <label>Množstvo (t, hrubá váha)<input name="t" inputmode="decimal" value="${e(U.t)}"></label>
    <label>Vlhkosť pri zbere (%)<input name="w" inputmode="decimal" value="${e(U.w)}" placeholder="napr. ${U.com==="kukurica"?"22":"15"}"></label>
    <label>Nečistoty (%)<input name="p" inputmode="decimal" value="${e(U.p)}" placeholder="napr. 3"></label>
    <label class="susb"${U.com==="kukurica"?"":" hidden"}>Zlomky (%) <small>zrážka nad ${f2(U.R.broken_limit,0)} %</small><input name="b" inputmode="decimal" value="${e(U.b)}" placeholder="napr. 4"></label>
    <label>Cena (€/t bez DPH)<input name="c" inputmode="decimal" value="${e(U.c)}" placeholder="podľa cenníka"></label></form>
   <div id="susOut">${outHTML()}</div>
   <div class="s">Sadzby ERNTE: čistenie ${f2(U.R.clean)} €/t (iba ak sú nečistoty), sušenie ${f2(U.R.dry)} €/t za každé % vlhkosti nad normu. Orientačný výpočet rovnakým spôsobom ako vyúčtovanie – platí váženie a rozbor vzorky pri príjme.</div></div>`};
function outHTML(){const j=num(U.t),w=num(U.w),p=num(U.p),b=num(U.b),c=num(U.c);
  if(!j||j<=0)return `<div class="s">Zadajte množstvo v tonách.</div>`;
  const r=calc(U.com,j,w,p,b,c);
  let h=`<div class="hrk sushr"><div class="ps"><small>Zaplatená (fakturačná) hmotnosť</small><b>${f2(r.inv,3)} t</b></div>${c?`<div class="ps"><small>Dostanete zaplatené</small><b>${f2(r.eur)} €</b></div>`:""}
    <div><small>Zrážky spolu</small><b>${f2(j-r.inv,3)} t · ${f2((j-r.inv)/j*100,1)} %</b></div>${c?`<div class="${r.full-r.eur>0?"ng":""}"><small>Rozdiel oproti suchému a čistému</small><b>${f2(r.full-r.eur)} €</b></div>`:""}</div>
   <table class="evbd"><tr><td>Hrubá váha</td><td class="r">${f2(j,3)} t</td></tr>
    <tr><td>− nečistoty ${f2(p||0,1)} %${r.q?` a zlomky nad limit ${f2(r.q,1)} %`:""}</td><td class="r">−${f2(r.nec,3)} t</td></tr>
    <tr><td>− voda (z ${f2(w??r.nm,1)} % na normu ${f2(r.nm,1)} %)</td><td class="r">−${f2(r.voda,3)} t</td></tr>
    <tr><td>− technologická zrážka (čistenie ${f2(r.xe)} € + sušenie ${f2(r.ye)} €${c?` ÷ ${f2(c)} €/t`:""})</td><td class="r">${c?"−"+f2(r.tech,3)+" t":"zadajte cenu"}</td></tr>
    <tr class="t"><td>Fakturačná hmotnosť</td><td class="r">${f2(r.inv,3)} t</td></tr>${c?`<tr class="t"><td>Suma bez DPH</td><td class="r">${f2(r.eur)} €</td></tr>`:""}</table>`;
  if(c){const base=w!=null&&w>r.nm?Math.floor(w):r.nm;const rows=[];for(let m=r.nm;m<=Math.max(r.nm+8,base+2);m++)rows.push(m);
    h+=`<details class="trap"${U.sens?" open":""} data-sussens><summary>📉 Ako vlhkosť mení sumu</summary><div class="trtab"><table class="sust"><thead><tr><th>Vlhkosť</th><th class="r">Zaplatené t</th><th class="r">Suma €</th></tr></thead><tbody>
     ${rows.map(m=>{const x=calc(U.com,j,m,p,b,c);return `<tr${w!=null&&Math.round(w)===m?' class="susme"':""}><td>${m} %</td><td class="r">${f2(x.inv,2)}</td><td class="r">${f2(x.eur,0)}</td></tr>`}).join("")}</tbody></table></div>
     <div class="s">💡 Každé percento vlhkosti nad normu vás pri ${f2(j,0)} t stojí približne <b>${f2(calc(U.com,j,r.nm,p,b,c).eur-calc(U.com,j,r.nm+1,p,b,c).eur)} €</b>.</div></details>`}
  return h}
document.addEventListener("click",ev=>{const x=ev.target.closest&&ev.target.closest("[data-susopen]");if(!x)return;U.open=!U.open;if(U.open&&!U.R)loadR();rer()});
document.addEventListener("toggle",ev=>{if(ev.target.dataset&&ev.target.dataset.sussens!=null)U.sens=ev.target.open},true);
document.addEventListener("input",ev=>{const f=ev.target.form;if(!f||f.id!=="susF")return;const k=ev.target.name;U[k]=ev.target.value;if(k==="c")U.cTouched=true;
  if(k==="com"){setPrice();const c=f.querySelector("[name=c]");if(c)c.value=U.c;const b=f.querySelector(".susb");if(b)b.hidden=U.com!=="kukurica";const w=f.querySelector("[name=w]");if(w)w.placeholder="napr. "+(U.com==="kukurica"?"22":"15")}
  const o=document.getElementById("susOut");if(o)o.innerHTML=outHTML()});
})();

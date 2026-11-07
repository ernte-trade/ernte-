// ===== 💰 ZISK PODĽA VÁŽNYCH LÍSTKOV – skryté pod tlačidlom a heslom (príkaz majiteľa 3. 11. 20:46) =====
// IBA Martin (MAIN_OK). Na Prehľade je len zamknuté tlačidlo; obsah sa ukáže až po zadaní hesla jeho účtu (overí Supabase Auth).
// Každý vážny lístok každého farmára: nákup = suma na úhradu farmárovi (settle_lines.invoice_eur – po zrážkach, ako v zúčtovaní),
// predaj = fakturačná váha × predajná cena z lístka odberateľa (deliveries.sell_price) → zarobil / prerobil na lístku.
// Zisk je PRED dopravou a réžiou (rovnako ako Zúčtovanie → Prehľady). Lístok bez predajnej ceny sa vypíše, ale nezapočíta.
// Odomknutie platí 10 minút a iba v pamäti (po obnovení stránky treba heslo znova); nič sa neukladá do zariadenia.
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const F=(n,d)=>(+n||0).toLocaleString("sk-SK",{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d});
const dSK=d=>d?new Date(String(d).slice(0,10)+"T12:00").toLocaleDateString("sk-SK"):"";
const OK=()=>typeof window.MAIN_OK==="function"&&MAIN_OK();
const lst=n=>n+" "+(n===1?"lístok":n>1&&n<5?"lístky":"lístkov");
const cn=c=>typeof comName==="function"?comName(c):c;
const S={unl:0,open:false,busy:false,D:null,q:"",only:"",sort:"zisk",err:""};
const unlocked=()=>S.unl&&Date.now()-S.unl<10*60e3;

async function unlock(pw,btn){if(!pw){S.err="Zadajte heslo.";paint();return}
  if(btn){btn.disabled=true;btn.textContent="⏳ Overujem…"}
  try{const u=await sb.auth.getUser();const em=u&&u.data&&u.data.user&&u.data.user.email;
    if(!em)throw new Error("Nie ste prihlásený.");
    const r=await sb.auth.signInWithPassword({email:em,password:pw});
    if(r.error)throw new Error(/invalid/i.test(r.error.message)?"Nesprávne heslo.":r.error.message);
    S.unl=Date.now();S.err="";S.open=true;paint();load()}
  catch(e){S.err=String(e&&e.message||e);paint()}}

/* všetky lístky: deliveries (predajná cena, odberateľ) + settle_lines každej zmluvy (nákup, fakturačná váha) */
async function load(){if(S.busy)return;S.busy=true;S.D=null;paint();
  try{const DV=[];for(let i=0;i<50;i++){const r=await sb.from("deliveries").select("ticket,deal_id,farmer_id,buyer,sell_price,day,com").range(i*1000,i*1000+999);
      if(r.error)throw new Error(r.error.message);DV.push(...(r.data||[]));if(!r.data||r.data.length<1000)break}
    const B={};for(const d of DV)if(d.deal_id)B[d.deal_id+"|"+d.ticket]=d;
    const deals=(typeof STATE!=="undefined"&&[...(STATE.deals||[]),...(STATE.dealsArch||[])])||[];const DM={};deals.forEach(d=>DM[d.id]=d);
    const ids=[...new Set(DV.map(d=>d.deal_id).filter(Boolean))];
    const FA={};((typeof STATE!=="undefined"&&STATE.farmers)||[]).forEach(f=>FA[f.id]=f.name);
    const L=[];let i=0;const one=async id=>{const d=DM[id]||{};const fid=d.farmer_id||(DV.find(x=>x.deal_id===id)||{}).farmer_id;if(!fid)return;
      const r=await sb.rpc("settle_lines",{p_farmer:fid,p_deal:id,d0:null,d1:null});if(r.error)return;
      for(const x of (r.data||[])){const b=B[id+"|"+x.ticket]||{},kg=+x.invoice_kg||0,buy=+x.invoice_eur||0,sp=+b.sell_price||0;
        L.push({day:x.day||b.day,ticket:x.ticket,farmer:FA[fid]||d.farmer||"?",fid,deal:d.no||"",com:x.com||d.com||b.com,buyer:b.buyer||"",kg,pb:+x.price||(kg?buy/kg*1000:0),sp,buy,sell:sp?kg*sp/1000:null,zisk:sp?kg*sp/1000-buy:null})}};
    const W=Array.from({length:6},async()=>{while(i<ids.length){const id=ids[i++];try{await one(id)}catch(e){}}});await Promise.all(W);
    S.D={L,at:Date.now()}}
  catch(e){S.D={err:String(e&&e.message||e)}}
  S.busy=false;paint()}

function body(){if(S.busy||!S.D)return `<div class="s">⏳ Počítam všetky lístky všetkých farmárov…</div>`;
  if(S.D.err)return `<div class="s">⚠️ ${E(S.D.err)}</div>`;
  const q=S.q.trim().toLowerCase();let L=S.D.L.filter(x=>!q||(x.farmer+" "+x.ticket+" "+x.buyer+" "+cn(x.com)).toLowerCase().includes(q));
  if(S.only==="minus")L=L.filter(x=>x.zisk!=null&&x.zisk<0);else if(S.only==="plus")L=L.filter(x=>x.zisk!=null&&x.zisk>=0);else if(S.only==="bez")L=L.filter(x=>x.zisk==null);
  const Z=L.filter(x=>x.zisk!=null),zs=Z.reduce((s,x)=>s+x.zisk,0),tk=L.reduce((s,x)=>s+x.kg,0)/1000,neg=Z.filter(x=>x.zisk<0),nz=neg.reduce((s,x)=>s+x.zisk,0);
  // súhrn po farmároch
  const G={};for(const x of L){const g=G[x.fid]||(G[x.fid]={farmer:x.farmer,n:0,t:0,z:0,zn:0,neg:0,bez:0,L:[]});g.n++;g.t+=x.kg/1000;g.L.push(x);if(x.zisk==null)g.bez++;else{g.z+=x.zisk;g.zn++;if(x.zisk<0)g.neg++}}
  let GA=Object.values(G);GA.sort(S.sort==="meno"?(a,b)=>a.farmer.localeCompare(b.farmer,"sk"):S.sort==="strata"?(a,b)=>a.z-b.z:(a,b)=>b.z-a.z);
  const zc=v=>v==null?"":v<0?"zlng":"zlps";
  const row=x=>`<tr><td>${E(dSK(x.day))}</td><td>${E(x.ticket)}</td><td>${E(cn(x.com))}</td><td>${E(x.buyer||"–")}</td><td>${F(x.kg/1000,3)}</td><td>${F(x.pb)}</td><td>${x.sp?F(x.sp):"–"}</td><td>${F(x.buy)}</td><td>${x.sell!=null?F(x.sell):"–"}</td><td class="${zc(x.zisk)}"><b>${x.zisk!=null?(x.zisk>=0?"+":"")+F(x.zisk):"bez predajnej ceny"}</b></td></tr>`;
  return `<div class="zlk"><div><small>Lístkov</small><b>${L.length}</b></div><div><small>Fakturačná váha</small><b>${F(tk,1)} t</b></div><div class="${zs<0?"zlng":"zlps"}"><small>Spolu zarobené</small><b>${zs>=0?"+":""}${F(zs,0)} €</b></div><div class="zlng"><small>Prerobené (${lst(neg.length)})</small><b>${F(nz,0)} €</b></div><div><small>Bez predajnej ceny</small><b>${L.length-Z.length}</b></div></div>
   <div class="zlf"><input type="search" data-zlq placeholder="🔎 Farmár, lístok, odberateľ, komodita" value="${E(S.q)}">
    <select data-zlonly><option value="">Všetky lístky</option><option value="minus"${S.only==="minus"?" selected":""}>🔴 Iba prerobené</option><option value="plus"${S.only==="plus"?" selected":""}>🟢 Iba zarobené</option><option value="bez"${S.only==="bez"?" selected":""}>⚪ Bez predajnej ceny</option></select>
    <select data-zlsort><option value="zisk">Najviac zarobené hore</option><option value="strata"${S.sort==="strata"?" selected":""}>Najviac prerobené hore</option><option value="meno"${S.sort==="meno"?" selected":""}>Podľa mena</option></select>
    <button type="button" data-zlre>↻ Prepočítať</button></div>
   ${GA.map(g=>`<details class="zlg"><summary><b>${E(g.farmer)}</b><span>${lst(g.n)} · ${F(g.t,1)} t${g.neg?` · <em class="zlng">${g.neg}× prerobené</em>`:""}${g.bez?` · ${g.bez}× bez ceny`:""}</span><b class="${g.z<0?"zlng":"zlps"}">${g.z>=0?"+":""}${F(g.z,0)} €</b></summary>
     <div class="zlt"><table><thead><tr><th>Dátum</th><th>Lístok</th><th>Komodita</th><th>Odberateľ</th><th>Fakt. t</th><th>Nákup €/t</th><th>Predaj €/t</th><th>Farmárovi €</th><th>Od odberateľa €</th><th>Zarobil / prerobil €</th></tr></thead>
     <tbody>${g.L.slice().sort((a,b)=>String(b.day).localeCompare(String(a.day))).map(row).join("")}</tbody></table></div></details>`).join("")||`<div class="s">Žiadne lístky.</div>`}
   <div class="s">Farmárovi € = suma na úhradu zo zúčtovania farmára (po zrážkach). Od odberateľa € = fakturačná váha × predajná cena z vážneho lístka odberateľa. Zisk je <b>pred dopravou a réžiou</b>, bez DPH. Prepočítané ${E(new Date(S.D.at).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"}))} · zamkne sa samo o 10 min.</div>`}

function html(){if(!OK())return "";
  if(!unlocked()){S.open=false;return `<section class="card zl" id="zlCard"><button type="button" class="zlb" data-zlopen>🔒 Zisk podľa vážnych lístkov <small>všetci farmári · zarobil / prerobil</small></button>
    ${S.ask?`<form class="zlpw" data-zlform><input type="password" name="pw" autocomplete="current-password" placeholder="Heslo vášho účtu" required><button class="pri">🔓 Odomknúť</button><button type="button" data-zlclose>Zrušiť</button></form>${S.err?`<div class="s zlng">${E(S.err)}</div>`:""}`:""}</section>`}
  return `<section class="card zl" id="zlCard"><div class="zlh"><b>💰 Zisk podľa vážnych lístkov</b><button type="button" data-zllock>🔒 Zamknúť</button></div>${body()}</section>`}
function paint(){const el=document.getElementById("zlCard");if(el){const d=document.createElement("div");d.innerHTML=html();const n=d.firstElementChild;if(n)el.replaceWith(n);else el.remove()}else place()}
function place(){if(!OK())return;const app=document.getElementById("app"),hub=app&&app.querySelector(":scope>.hub.owh");if(!hub||document.getElementById("zlCard"))return;hub.insertAdjacentHTML("afterend",html())}
new MutationObserver(()=>{if(OK()&&document.querySelector("#app>.hub.owh")&&!document.getElementById("zlCard"))(window.ernteSoon||requestAnimationFrame)(place)}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{if(S.unl&&!unlocked()){S.unl=0;S.D=null;S.ask=false;paint()}},30e3);

document.addEventListener("click",e=>{const t=e.target;if(!t.closest||!t.closest("#zlCard"))return;
  if(t.closest("[data-zlopen]")){S.ask=true;S.err="";paint();setTimeout(()=>{const i=document.querySelector("#zlCard input[name=pw]");if(i)i.focus()},50);return}
  if(t.closest("[data-zlclose]")){S.ask=false;S.err="";paint();return}
  if(t.closest("[data-zllock]")){S.unl=0;S.D=null;S.ask=false;paint();return}
  if(t.closest("[data-zlre]")){load();return}});
document.addEventListener("submit",e=>{const f=e.target.closest&&e.target.closest("[data-zlform]");if(!f)return;e.preventDefault();unlock(f.pw.value,f.querySelector("button.pri"))},true);
document.addEventListener("input",e=>{const t=e.target;if(t.matches&&t.matches("[data-zlq]")){S.q=t.value;const p=t.selectionStart;paint();const n=document.querySelector("[data-zlq]");if(n){n.focus();try{n.setSelectionRange(p,p)}catch(x){}}}});
document.addEventListener("change",e=>{const t=e.target;if(!t.matches)return;if(t.matches("[data-zlonly]")){S.only=t.value;paint()}else if(t.matches("[data-zlsort]")){S.sort=t.value;paint()}});

{const s=document.createElement("style");s.textContent=`.zl{display:grid;gap:10px}.zlb{width:100%;min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-weight:800;font-size:1.02rem;border-radius:16px}
.zlb small{font-weight:500;opacity:.75;font-size:.8rem}.zlpw{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}.zlpw input{flex:1 1 220px;min-height:46px}.zlpw button{min-height:46px}
.zlh{display:flex;justify-content:space-between;align-items:center;gap:10px}.zlh b{font-size:1.05rem}
.zlk{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.zlk>div{display:grid;gap:2px;text-align:center;padding:10px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}.zlk small{opacity:.75;font-size:.75rem}.zlk b{font-size:1.15rem}
.zlf{display:flex;flex-wrap:wrap;gap:8px}.zlf input{flex:1 1 220px;min-height:42px}.zlf select,.zlf button{min-height:42px}
.zlg{border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);padding:4px 10px}.zlg summary{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;cursor:pointer;padding:8px 0}.zlg summary>span{flex:1 1 180px;opacity:.8;font-size:.85rem}.zlg summary em{font-style:normal}
.zlt{overflow-x:auto;padding-bottom:6px}.zlt table{width:100%;border-collapse:collapse;font-size:.84rem;min-width:860px}.zlt th,.zlt td{padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right;white-space:nowrap}.zlt th:nth-child(-n+4),.zlt td:nth-child(-n+4){text-align:left}
.zlps,.zlps b{color:#86efac}.zlng,.zlng b{color:#fca5a5}
html[data-theme=light] .zlk>div,html[data-theme=light] .zlg{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.1)}html[data-theme=light] .zlps,html[data-theme=light] .zlps b{color:#15803d}html[data-theme=light] .zlng,html[data-theme=light] .zlng b{color:#b91c1c}
#app:has(>.hub.owh)>#zlCard{order:2}`;document.head.appendChild(s)}
})();

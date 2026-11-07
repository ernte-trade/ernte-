// ===== 👥 KLIENTSKÁ ZÓNA (príkaz majiteľa 2. 11. 2026) – sekretárka (kľúč „klient“) a majiteľ =====
// Iba klienti (farmári ERNTE aj DANUBE) a členovia tímu, ktorým CHÝBAJÚ údaje → doplniť (nič existujúce sa neprepíše, databáza klient_fill),
// po doplnení zmiznú. ➕ Nový klient (klient_new, kontrola duplicít). 🤝 Uzatvoriť obchod → zmluva PDF e-mailom klientovi + kópia Galajdovi a Martinovi (deal_sign_cc).
(function(){
const E=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const OK=()=>typeof ROLE!=="undefined"&&(ROLE==="owner"||(typeof can==="function"&&can("klient")));
const tst=(t,ms)=>typeof toast==="function"?toast(t,ms):alert(t);
const FL={ico:["IČO","12345678","numeric"],dic:["DIČ","2020123456","numeric"],icdph:["IČ DPH (ak je platca)","SK2020123456","text"],addr:["Adresa (ulica, PSČ, obec)","Hlavná 1, 072 23 Zbudza","text"],
  phone:["Telefón","+421 9xx xxx xxx","tel"],email:["E-mail","meno@firma.sk","email"],iban:["IBAN","SK00 0000 0000 0000 0000 0000","text"],title:["Funkcia","napr. obchodník","text"]};
const K={d:null,at:0,busy:false,q:"",f:"all",nw:false,open:{}};
const rr=()=>{if(typeof TAB!=="undefined"&&TAB==="klient"&&typeof renderStaff==="function")renderStaff()};
async function load(force){if(K.busy||(!force&&K.d&&Date.now()-K.at<60e3))return;K.busy=true;
  try{const r=await sb.rpc("klient_list");K.d=r.error?{err:r.error.message}:(r.data||{farmers:[],staff:[]})}catch(x){K.d={err:String(x)}}K.at=Date.now();K.busy=false;rr()}
const nz=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
function inp(n,v){const f=FL[n];return `<label>${f[0]}<input name="${n}" type="${f[2]==="numeric"?"text":f[2]}"${f[2]==="numeric"?' inputmode="numeric"':""} autocomplete="off" placeholder="${E(f[1])}" value="${E(v||"")}"></label>`}
function newForm(){return `<form class="card klnew" id="fKlNew"><b class="sth">➕ Nový klient</b>
  <label>Firma<select name="firma"><option value="ERNTE">ERNTE spol. s r.o. (Slovensko)</option><option value="DANUBE">DANUBE Commodities Kft. (Maďarsko)</option></select></label>
  <label>Názov firmy / meno klienta<input name="name" required autocomplete="off" placeholder="napr. Agro Zbudza s.r.o."></label>
  <div class="klg">${["ico","dic","icdph","addr","phone","email","iban"].map(n=>inp(n,"")).join("")}</div>
  <div class="s">Po zadaní IČO sa názov a adresa doplnia z registra (ak sú prázdne).</div>
  <div class="btns"><button type="submit" class="pri">💾 Uložiť klienta</button><button type="button" data-klnew="0">Zrušiť</button></div></form>`}
function card(x,kind){const id=kind==="farmer"?x.id:x.email,miss=x.miss||[],op=K.open[id]!==false;
  const have=kind==="farmer"?[x.ico&&"IČO "+x.ico,x.dic&&"DIČ "+x.dic,x.addr,x.phone,x.email,x.iban&&"IBAN ✓"].filter(Boolean):[x.title,x.phone,x.email].filter(Boolean);
  const fields=kind==="farmer"?miss.concat(!x.icdph&&miss.includes("dic")?["icdph"]:[]):miss;
  return `<form class="card klc" data-klform="${E(kind)}|${E(id)}"><div class="klh"><b>${kind==="farmer"?"👨‍🌾":"👤"} ${E(x.name)}</b>${kind==="farmer"?`<em class="klf ${x.firma==="DANUBE"?"dn":""}">${x.firma==="DANUBE"?"DANUBE":"ERNTE"}</em>`:`<em class="klf tm">Tím</em>`}</div>
   ${have.length?`<div class="klhave">${E(have.join(" · "))}</div>`:""}
   <div class="klmiss">Chýba: ${miss.map(m=>`<span>${E(FL[m][0].replace(/ \(.*\)/,""))}</span>`).join("")}</div>
   ${op?`<div class="klg">${fields.map(n=>inp(n,"")).join("")}</div><div class="btns"><button type="submit" class="pri">💾 Uložiť doplnené</button></div>`:""}</form>`}
window.vKlient=function(){if(!OK())return `<div class="card"><div class="s">Klientskú zónu vidí sekretárka s prístupom a majiteľ.</div></div>`;
  if(!K.d){load();return `<div class="card"><div class="s">Načítavam Klientskú zónu…</div></div>`}
  if(K.d.err)return `<div class="card"><div class="s">${/klient_list/.test(K.d.err)?"Klientská zóna sa zapne po aktualizácii databázy (pár minút).":E(K.d.err)}</div></div>`;
  const F=K.d.farmers||[],S=K.d.staff||[],q=nz(K.q),mq=x=>!q||nz([x.name,x.ico,x.email,x.phone,x.addr].join(" ")).includes(q);
  const fv=F.filter(x=>(K.f==="all"||K.f===(x.firma==="DANUBE"?"dn":"er"))&&mq(x)),sv=(K.f==="all"||K.f==="tm")?S.filter(mq):[];
  const deal=ROLE==="owner"||(typeof can==="function"&&can("deals"));
  let h=`<div class="kl"><div class="card klhd"><h2>👥 Klientská zóna</h2><div class="s">Vidíš iba klientov a členov tímu, ktorým chýbajú údaje. Doplň ich – po doplnení zmiznú. Existujúce údaje sa neprepíšu.</div>
   <div class="kltiles"><button type="button" class="klt" data-klnew="1"><span>➕</span><b>Nový klient</b><small>farmár ERNTE / DANUBE</small></button>${deal?`<button type="button" class="klt" data-kldeal="1"><span>🤝</span><b>Uzatvoriť obchod</b><small>zmluva na podpis klientovi, kópia Galajdovi a Martinovi</small></button>`:""}</div>
   <div class="klk"><div><small>Klienti s chýbajúcimi údajmi</small><b>${F.length}</b></div><div><small>Tím s chýbajúcimi údajmi</small><b>${S.length}</b></div><div><small>Klientov spolu</small><b>${K.d.total||0}</b></div></div></div>`;
  if(K.nw)h+=newForm();
  h+=`<div class="card klfl"><input id="klQ" type="search" placeholder="🔎 Hľadať meno, IČO, telefón…" value="${E(K.q)}" autocomplete="off"><div class="btns seg2">${[["all","Všetko"],["er","ERNTE"],["dn","DANUBE"],["tm","Tím"]].map(b=>`<button type="button" data-klf="${b[0]}" aria-pressed="${K.f===b[0]}">${b[1]}</button>`).join("")}</div></div>`;
  if(!fv.length&&!sv.length)h+=`<div class="card"><div class="s">${q||K.f!=="all"?"Nič nevyhovuje filtru.":"✅ Všetci klienti aj tím majú údaje kompletné."}</div></div>`;
  h+=fv.slice(0,80).map(x=>card(x,"farmer")).join("")+sv.map(x=>card(x,"staff")).join("");
  if(fv.length>80)h+=`<div class="card"><div class="s">Zobrazených 80 z ${fv.length} – spresni hľadanie.</div></div>`;
  return h+`</div>`};
document.addEventListener("click",e=>{const t=e.target.closest&&e.target.closest("[data-klnew],[data-kldeal],[data-klf]");if(!t||!OK())return;e.preventDefault();
  if(t.dataset.klnew!=null){K.nw=t.dataset.klnew==="1";rr();if(K.nw)setTimeout(()=>{const i=document.querySelector('#fKlNew input[name=name]');if(i){i.scrollIntoView({block:"center"});i.focus()}},60);return}
  if(t.dataset.kldeal){TAB="qd";try{sessionStorage.setItem("ernte-tab","qd")}catch(x){}renderStaff();window.scrollTo(0,0);return}
  if(t.dataset.klf){K.f=t.dataset.klf;rr()}});
document.addEventListener("input",e=>{if(e.target&&e.target.id==="klQ"){K.q=e.target.value;clearTimeout(K.qt);K.qt=setTimeout(()=>{rr();const i=document.getElementById("klQ");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}},350)}});
document.addEventListener("submit",async e=>{const fm=e.target;if(!fm||!OK())return;
  if(fm.id==="fKlNew"){e.preventDefault();e.stopPropagation();if(fm._b)return;const d=Object.fromEntries(new FormData(fm));if(String(d.name||"").trim().length<3){tst("Zadaj názov klienta.",4000);return}
    fm._b=1;const b=fm.querySelector("[type=submit]");if(b)b.disabled=true;
    try{const r=await sb.rpc("klient_new",{p:d});if(r.error)throw r.error;if(r.data&&r.data.dup){tst("ℹ️ Klient už existuje: "+r.data.name+" – chýbajúce údaje doplň nižšie.",6000)}else tst("✅ Klient "+d.name+" uložený",4000);
      K.nw=false;if(typeof loadStaff==="function")loadStaff();await load(true)}catch(x){tst("⚠️ "+(x.message||x),7000)}finally{fm._b=0;if(b)b.disabled=false}return}
  const k=fm.dataset&&fm.dataset.klform;if(!k)return;e.preventDefault();e.stopPropagation();if(fm._b)return;
  const [kind,id]=k.split("|"),d={};new FormData(fm).forEach((v,n)=>{v=String(v).trim();if(v)d[n]=v});if(!Object.keys(d).length){tst("Vyplň aspoň jeden údaj.",4000);return}
  fm._b=1;const b=fm.querySelector("[type=submit]");if(b){b.disabled=true;b.textContent="Ukladám…"}
  try{const r=await sb.rpc("klient_fill",{p_kind:kind,p_id:id,p:d});if(r.error)throw r.error;const left=(r.data&&r.data.miss)||[];
    tst(left.length?`✓ Uložené (${r.data.n}) – ešte chýba: ${left.map(m=>FL[m][0].replace(/ \(.*\)/,"")).join(", ")}`:"✅ Údaje kompletné – klient zmizol zo zoznamu",5000);
    if(kind==="farmer"&&typeof STATE!=="undefined"){const f=(STATE.farmers||[]).find(x=>x.id===id);if(f)for(const n in d)if(!f[n])f[n]=d[n]}
    await load(true)}catch(x){tst("⚠️ "+(x.message||x),7000)}finally{fm._b=0;if(b){b.disabled=false;b.textContent="💾 Uložiť doplnené"}}},true);
{const s=document.createElement("style");s.textContent=`.kl{display:grid;gap:12px}.klhd h2{margin:0 0 4px;text-align:center}.klhd .s{text-align:center}
.kltiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px;margin-top:10px}
.klt{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-height:104px;border-radius:20px;padding:12px;text-align:center;background:linear-gradient(160deg,rgba(52,211,153,.22),rgba(34,211,238,.14));border:1px solid rgba(255,255,255,.18);color:inherit;font:inherit;white-space:normal}
.klt span{font-size:2rem}.klt b{font-size:1.05rem}.klt small{opacity:.75;font-size:.8rem}
.klk{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}.klk div{display:grid;gap:2px;text-align:center;padding:8px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04)}.klk small{font-size:.75rem;opacity:.75}.klk b{font-size:1.3rem}
.klfl{display:grid;gap:8px}.klfl input{width:100%;min-height:46px}.klfl .btns button{flex:1 1 70px}
.klc,.klnew{display:grid;gap:8px}.klh{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}.klh b{font-size:1.02rem;overflow-wrap:anywhere}
.klf{font-style:normal;font-size:.72rem;font-weight:800;padding:2px 9px;border-radius:999px;background:rgba(132,204,22,.18);border:1px solid rgba(132,204,22,.5)}.klf.dn{background:rgba(201,162,39,.18);border-color:rgba(201,162,39,.6)}.klf.tm{background:rgba(56,189,248,.16);border-color:rgba(56,189,248,.5)}
.klhave{font-size:.82rem;opacity:.75;overflow-wrap:anywhere}.klmiss{display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:.82rem}.klmiss span{padding:2px 8px;border-radius:999px;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.55)}
.klg{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:8px}.klg label,.klnew>label{display:grid;gap:3px;font-size:.85rem}.klg input,.klnew input,.klnew select{width:100%;min-height:46px;font-size:16px}
.klc .btns button,.klnew .btns button{flex:1 1 160px;min-height:46px}
@media(max-width:400px){.klk b{font-size:1.1rem}.klk small{font-size:.7rem}}`;document.head.appendChild(s)}
})();

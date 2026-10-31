// ===== ODBERATEĽ – portál (Etapa 1) =====
// Aktivuje sa IBA keď je prihlásený odberateľ (window.BUYER). Majiteľa/farmára sa nedotýka.
// Etapa 1: Prehľad (hero), Počasie, Autá na dvore (len počet, cez zabezpečenú funkciu),
//          Doklady. Ďalšie sekcie (ponuka, vyjednávanie, zmluvy, zúčtovanie) pridávame v ďalších etapách.
(function(){
  const E=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const COM={psenica_p:"Pšenica potrav.",psenica_k:"Pšenica kŕmna",repka:"Repka",kukurica:"Kukurica",soja:"Sója",jacmen_s:"Jačmeň sladovn.",jacmen_k:"Jačmeň kŕmny",lo:"Slnečnica",cirok:"Cirok"};
  const DKIND={faktura:"🧾 Faktúra",dodaci:"📄 Dodací list",listok:"⚖️ Vážny lístok",certifikat:"🔬 Certifikát kvality"};
  const WXI=c=>c===0?"☀️":c<3?"🌤":c<45?"☁️":c<60?"🌧":c<70?"🌦":c<80?"❄️":"⛈";
  const WXN=c=>c===0?"jasno":c<3?"polojasno":c<45?"zamračené":c<60?"dážď":c<70?"prehánky":c<80?"sneženie":"búrky";

  function css(){ if(document.getElementById("odb-css"))return; const s=document.createElement("style"); s.id="odb-css"; s.textContent=`
.odbw,.odbw *{box-sizing:border-box;min-width:0}
.odbw{display:grid;gap:14px;padding:4px 0 90px;max-width:100%;overflow-x:clip}
.odbhero{display:grid;gap:4px;padding:18px;border-radius:20px;background:linear-gradient(150deg,rgba(30,36,58,.92),rgba(12,16,30,.96));border:1px solid rgba(165,243,252,.25);color:#eef2f7}
.odbhero small{color:#9fb0c2;font-size:.8rem}.odbhero b{font-size:1.35rem;font-weight:600}
.odbgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.odbcard{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:16px;color:#eef2f7}
.odbcard .k{color:#9fb0c2;font-size:.78rem;margin-bottom:6px}
.odbcard .v{font-size:1.7rem;font-weight:600;line-height:1}
.odbcard .s{color:#9fb0c2;font-size:.82rem;margin-top:6px}
.odbyard .v{color:#5eead4}
.odbsec{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:16px}
.odbsec h2{font-size:1.05rem;font-weight:600;margin:0 0 12px;color:#eef2f7}
.odbdoc{display:flex;align-items:center;gap:10px;padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);margin-bottom:8px;text-decoration:none;color:#eef2f7}
.odbdoc:last-child{margin-bottom:0}.odbdoc .dt{flex:1;min-width:0}.odbdoc .dt b{display:block;font-weight:500;font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.odbdoc .dt small{color:#9fb0c2;font-size:.78rem}.odbdoc .dl{flex:none;opacity:.7}
.odbempty{color:#9fb0c2;font-size:.9rem;text-align:center;padding:14px}
html[data-theme=light] .odbhero{background:linear-gradient(150deg,#fff,#eef3fb);color:#0f172a;border-color:rgba(15,23,42,.12)}
html[data-theme=light] .odbhero small,html[data-theme=light] .odbcard .k,html[data-theme=light] .odbcard .s,html[data-theme=light] .odbdoc .dt small,html[data-theme=light] .odbempty{color:#5f6b7a}
html[data-theme=light] .odbcard,html[data-theme=light] .odbsec,html[data-theme=light] .odbdoc{background:#fff;border-color:rgba(15,23,42,.1);color:#0f172a}
`; document.head.appendChild(s); }

  function shell(B){ return `<div class="odbw">
    <div class="hero odbhero"><small>Odberateľ · ERNTE Trade & Logistic</small><b>${E(B.name)}</b><small id="odbWhen">${new Date().toLocaleString("sk-SK")}</small></div>
    <div class="odbgrid">
      <div class="odbcard" id="odbWx"><div class="k">Počasie</div><div class="v">—</div><div class="s">načítavam…</div></div>
      <div class="odbcard odbyard" id="odbYard"><div class="k">Autá VALKO na dvore</div><div class="v">—</div><div class="s">zisťujem…</div></div>
    </div>
    <div class="odbsec"><h2>📑 Doklady</h2><div id="odbDocs"><div class="odbempty">načítavam…</div></div></div>
    <div class="odbsec"><h2>🚚 Doprava</h2><div class="odbempty">Prehľad dodávok a áut na ceste pripravujeme.</div></div>
  </div>`; }

  async function fillWx(B){ const el=document.getElementById("odbWx"); if(!el)return;
    const lat=B.yard_lat!=null?B.yard_lat:48.755, lon=B.yard_lng!=null?B.yard_lng:21.915;
    try{ const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`);
      const j=await r.json(), c=j.current||{};
      el.querySelector(".v").textContent=WXI(c.weather_code)+" "+Math.round(c.temperature_2m)+"°";
      el.querySelector(".s").textContent=`${WXN(c.weather_code)} · ${Math.round(c.wind_speed_10m)} km/h`;
    }catch(x){ el.querySelector(".s").textContent="počasie nedostupné"; } }

  async function fillYard(){ const el=document.getElementById("odbYard"); if(!el)return;
    try{ const r=await sb.rpc("odb_yard_trucks");
      if(r.error){ el.querySelector(".v").textContent="—"; el.querySelector(".s").textContent="dvor zatiaľ nenastavený"; return; }
      const n=Array.isArray(r.data)?(r.data[0]&&r.data[0].count||0):(r.data&&r.data.count!=null?r.data.count:(+r.data||0));
      el.querySelector(".v").textContent=String(n);
      el.querySelector(".s").textContent=n===0?"práve žiadne":n===1?"auto na dvore":n<5?"autá na dvore":"áut na dvore";
    }catch(x){ el.querySelector(".v").textContent="—"; el.querySelector(".s").textContent="dvor zatiaľ nenastavený"; } }

  async function fillDocs(B){ const el=document.getElementById("odbDocs"); if(!el)return;
    try{ const r=await sb.from("odb_docs").select("*").eq("buyer_id",B.id).order("created_at",{ascending:false}).limit(50);
      if(r.error){ el.innerHTML=`<div class="odbempty">Doklady sa nepodarilo načítať.</div>`; return; }
      const L=r.data||[];
      el.innerHTML = L.length ? L.map(d=>`<a class="odbdoc" ${d.url?`href="${E(d.url)}" target="_blank" rel="noopener"`:""}>
        <span>${(DKIND[d.kind]||"📎").split(" ")[0]}</span>
        <span class="dt"><b>${E(d.title)}</b><small>${E((DKIND[d.kind]||d.kind).replace(/^\S+\s/,""))} · ${new Date(d.created_at).toLocaleDateString("sk-SK")}</small></span>
        ${d.url?'<span class="dl">⬇️</span>':""}</a>`).join("")
        : `<div class="odbempty">Zatiaľ žiadne doklady. Pribudnú tu faktúry, dodacie listy a certifikáty.</div>`;
    }catch(x){ el.innerHTML=`<div class="odbempty">Doklady sa nepodarilo načítať.</div>`; } }

  window.startBuyer = function(){ const B=window.BUYER; if(!B)return; css();
    try{ if($("refBtn"))$("refBtn").hidden=true; }catch(x){}
    document.title="ERNTE · "+B.name;
    const app=document.getElementById("app"); if(!app)return;
    app.innerHTML=shell(B);
    fillWx(B); fillYard(); fillDocs(B);
    // obnova času + áut na dvore + počasia
    clearInterval(window._odbT);
    window._odbT=setInterval(()=>{ if(document.hidden)return; const w=document.getElementById("odbWhen"); if(w)w.textContent=new Date().toLocaleString("sk-SK"); fillYard(); },120000);
  };
})();

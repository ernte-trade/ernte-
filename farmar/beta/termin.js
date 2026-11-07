// 📅 TERMÍN V MINULOSTI (úloha majiteľa 5. 11.): pri ukladaní obchodu nedovoliť termín v minulosti – upozornenie „Termín je v minulosti – skontroluj rok“.
// Termín je voľný text („30. 11. 2026“, „1.–15. 12. 2026“, „11/2026“, „november 2026“, ISO) → berie sa NAJNESKORŠÍ dátum v texte.
// Kontroluje nový obchod (#fDeal), rýchly obchod (qd.js, dátumy Od/Do), úpravu obchodu (data-dfe) a predajnú zmluvu (form.pzf) – pri úprave iba keď sa termín zmenil.
// Rovnaké pravidlo stráži aj databáza (trigger deals_term_guard) – aplikácia ho iba ukáže skôr a zrozumiteľne.
(function(){
const MSG="Termín je v minulosti – skontroluj rok";
// mesiace (SK, EN, DE, HU) – iba celé slová, aby „marža 2025“ nebola marec
const MW={};[[1,"jan januar januara january janner januari"],[2,"feb februar februara february februari"],[3,"mar marec marca march marz marcius"],[4,"apr april aprila aprilis"],
  [5,"maj maja may mai majus"],[6,"jun juna june juni junius"],[7,"jul jula july juli julius"],[8,"aug august augusta augusztus"],[9,"sep sept september septembra szeptember"],
  [10,"okt oct oktober oktobra october"],[11,"nov november novembra"],[12,"dec december decembra dezember"]].forEach(([m,w])=>w.split(" ").forEach(x=>MW[x]=m));
const nz=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const ok=(y,m,d)=>{const t=new Date(y,m-1,d);return t.getFullYear()===y&&t.getMonth()===m-1&&t.getDate()===d?t:null};
const eom=(y,m)=>new Date(y,m,0);
// najneskorší dátum v texte (alebo null, keď tam žiadny úplný dátum nie je)
function termLast(s){const t=nz(s);if(!t)return null;let best=null;const add=x=>{if(x&&(!best||x>best))best=x};let m;
  const R1=/(\d{4})-(\d{1,2})-(\d{1,2})/g;while((m=R1.exec(t)))add(ok(+m[1],+m[2],+m[3]));
  const R2=/(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/g;while((m=R2.exec(t)))add(ok(+m[3],+m[2],+m[1]));
  const t2=t.replace(/(\d{4})-(\d{1,2})-(\d{1,2})/g," ").replace(/(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(\d{4})/g," "); // úplné dátumy už sú zarátané
  const R3=/(?:^|[^\d.])(\d{1,2})\s*[./]\s*(\d{4})(?!\d)/g;while((m=R3.exec(t2))){const mo=+m[1];if(mo>=1&&mo<=12)add(eom(+m[2],mo))}
  const R4=/(?:^|[^a-z])([a-z]{3,})\.?\s+(\d{4})(?!\d)/g;while((m=R4.exec(t2))){const mo=MW[m[1]];if(mo)add(eom(+m[2],mo))}
  return best}
const today=()=>{const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
const termPast=s=>{const d=termLast(s);return !!d&&d<today()};
const dk=d=>d?d.getDate()+". "+(d.getMonth()+1)+". "+d.getFullYear():"";
window.termLast=termLast;window.termPast=termPast;window.termPastMsg=MSG;

// ⚠️ nápoveda hneď pri písaní (pod políčkom termínu)
function hint(inp,s){let h=inp.parentElement&&inp.parentElement.querySelector(".tpast");const d=termLast(s);const bad=!!d&&d<today();
  if(!bad){if(h)h.remove();return}
  if(!h){h=document.createElement("small");h.className="tpast";h.setAttribute("role","alert");inp.insertAdjacentElement("afterend",h)}
  h.textContent="⚠️ "+MSG+" ("+dk(d)+")"}
const SEL='#fDeal input[name=term],form[data-dfe] input[name=term],form.pzf input[name=term]';
document.addEventListener("input",e=>{const t=e.target;if(!t||!t.matches)return;
  if(t.matches(SEL)){hint(t,t.value);return}
  if(t.id==="qdOd"||t.id==="qdDo"){const a=document.getElementById("qdOd"),b=document.getElementById("qdDo");const v=(b&&b.value)||(a&&a.value)||"";hint(b||t,v)}},true);
document.addEventListener("change",e=>{const t=e.target;if(t&&(t.id==="qdOd"||t.id==="qdDo")){const a=document.getElementById("qdOd"),b=document.getElementById("qdDo");hint(b||t,(b&&b.value)||(a&&a.value)||"")}},true);

// 🛑 uloženie: zastaví sa skôr, ako formulár odošle obchod (window capture beží pred ostatnými spracovateľmi)
function stop(e,d){e.preventDefault();e.stopImmediatePropagation();const m="📅 "+MSG+(d?" – "+dk(d):"")+". Oprav termín a ulož znova.";
  if(typeof toast==="function")toast(m,7000);else alert(m)}
window.addEventListener("submit",e=>{const f=e.target;if(!f||!f.matches)return;
  if(f.id==="fQd"){const a=document.getElementById("qdOd"),b=document.getElementById("qdDo"),v=(b&&b.value)||(a&&a.value)||"";if(termPast(v)){hint(b||a,v);stop(e,termLast(v))}return}
  if(!(f.id==="fDeal"||f.matches("form[data-dfe],form.pzf")))return;
  const i=f.querySelector("input[name=term]");if(!i)return;const v=i.value||"";
  const isNew=f.id==="fDeal"||(f.matches("form.pzf")&&!f.dataset.pzform);
  if(!isNew&&v.trim()===String(i.defaultValue||"").trim())return; // termín sa nemenil – staré obchody s uplynutým termínom sa dajú upravovať
  if(termPast(v)){hint(i,v);stop(e,termLast(v))}},true);

const st=document.createElement("style");st.textContent=`.tpast{display:block;margin-top:4px;color:#fca5a5;font-weight:700;font-size:.8rem;line-height:1.35;overflow-wrap:anywhere}html[data-theme=light] .tpast{color:#b91c1c}`;document.head.appendChild(st);
})();

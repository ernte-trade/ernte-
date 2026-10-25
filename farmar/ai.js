// ERNTE AI Podpora – chat s AI, prehľady, úpravy aplikácie. Iba pre majiteľa.
(function(){
const CSS=`
.aibtn{position:relative;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:0 14px 0 10px;border-radius:999px;border:1px solid rgba(182,255,59,.55);
  background:linear-gradient(135deg,rgba(124,92,255,.35),rgba(34,211,238,.18) 55%,rgba(182,255,59,.22));color:#fff;font:700 .8rem var(--f-head,system-ui);letter-spacing:.01em;cursor:pointer;
  box-shadow:0 0 22px rgba(124,92,255,.45),inset 0 1px 0 rgba(255,255,255,.3);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
.aibtn i{width:20px;height:20px;border-radius:50%;background:conic-gradient(from 0deg,#b6ff3b,#22d3ee,#7c5cff,#ff5ea8,#b6ff3b);animation:aispin 4s linear infinite;box-shadow:0 0 12px #7c5cff}
.aibtn em{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#b6ff3b;color:#06110a;font:800 .65rem/18px system-ui;text-align:center;font-style:normal;padding:0 4px}
@keyframes aispin{to{transform:rotate(360deg)}}
.aibtn[hidden]{display:none}
.aish{position:fixed;inset:0;z-index:3000;display:flex;flex-direction:column;color:#f4f6ff;
  background:radial-gradient(90% 55% at 100% 0%,rgba(124,92,255,.42),transparent 60%),radial-gradient(80% 50% at 0% 100%,rgba(182,255,59,.20),transparent 60%),radial-gradient(60% 40% at 0% 30%,rgba(34,211,238,.16),transparent 60%),#04060b;
  animation:aiin .28s cubic-bezier(.2,.8,.2,1)}
@keyframes aiin{from{opacity:0;transform:translateY(24px) scale(.985)}}
.aish::before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 0 40%,rgba(255,255,255,.035) 40.3%,transparent 41%),linear-gradient(65deg,transparent 0 70%,rgba(180,220,255,.03) 70.3%,transparent 71%)}
.aihd{position:relative;display:flex;align-items:center;gap:12px;padding:calc(14px + env(safe-area-inset-top)) 16px 10px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box}
.aiorb{width:46px;height:46px;border-radius:50%;flex:none;position:relative;background:conic-gradient(from 0deg,#b6ff3b,#22d3ee,#7c5cff,#ff5ea8,#b6ff3b);animation:aispin 6s linear infinite;box-shadow:0 0 30px rgba(124,92,255,.7),0 0 60px rgba(182,255,59,.25)}
.aiorb::after{content:"";position:absolute;inset:4px;border-radius:50%;background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.55),rgba(10,12,22,.9) 45%,#05070d 75%)}
.aish.busy .aiorb{animation-duration:1.1s}
.aihd h2{margin:0;font:800 1.35rem/1 var(--f-head,system-ui);letter-spacing:-.03em;background:linear-gradient(90deg,#fff,#d9ffb0 60%,#5eead4);-webkit-background-clip:text;background-clip:text;color:transparent}
.aihd small{display:block;color:rgba(255,255,255,.6);font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;margin-top:4px}
.aihd .x{margin-left:auto;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font-size:1.3rem;cursor:pointer}
.aitabs{display:flex;gap:6px;padding:0 16px 10px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box}
.aitabs{gap:4px!important}.aitabs button{flex:1 1 auto;min-width:0;padding:0 3px;font-size:.7rem!important;white-space:nowrap;letter-spacing:-.01em;min-height:40px;border-radius:14px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:rgba(255,255,255,.75);font:700 .82rem var(--f-head,system-ui);cursor:pointer}
.aitabs button[aria-pressed=true]{background:linear-gradient(135deg,rgba(182,255,59,.9),rgba(94,234,212,.9));color:#06110a;border-color:transparent;box-shadow:0 0 22px rgba(182,255,59,.35)}
.aibody{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:6px 16px 18px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box;display:flex;flex-direction:column;gap:12px}
.aimsg{max-width:88%;padding:12px 15px;border-radius:20px;font-size:.95rem;line-height:1.5;word-wrap:break-word;position:relative}
.aimsg.u{align-self:flex-end;background:linear-gradient(135deg,rgba(124,92,255,.55),rgba(34,211,238,.35));border:1px solid rgba(255,255,255,.22);border-bottom-right-radius:6px;box-shadow:0 8px 30px rgba(124,92,255,.25)}
.aimsg.a{align-self:flex-start;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-bottom-left-radius:6px;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}
.aimsg.err{border-color:rgba(255,107,129,.6);background:rgba(239,68,68,.12)}
.aimsg p{margin:0 0 8px}.aimsg p:last-child{margin:0}.aimsg ul{margin:4px 0 8px;padding-left:18px}.aimsg li{margin:2px 0}.aimsg b{color:#fff}.aimsg a{color:#b6ff3b;word-break:break-all}
.aimsg time{display:block;font-size:.66rem;color:rgba(255,255,255,.45);margin-top:6px}
.aitask{display:flex;gap:8px;align-items:flex-start;margin-top:8px;padding:9px 11px;border-radius:14px;background:linear-gradient(135deg,rgba(182,255,59,.16),rgba(94,234,212,.08));border:1px solid rgba(182,255,59,.4);font-size:.85rem}
.aitype{display:inline-flex;gap:5px;align-items:center;color:rgba(255,255,255,.7);font-size:.85rem}.aitype i{width:7px;height:7px;border-radius:50%;background:#b6ff3b;animation:aidot 1.2s infinite}.aitype i:nth-child(2){animation-delay:.2s;background:#5eead4}.aitype i:nth-child(3){animation-delay:.4s;background:#a78bfa}
@keyframes aidot{0%,100%{opacity:.25;transform:translateY(0)}50%{opacity:1;transform:translateY(-4px)}}
.aichips{display:flex;gap:8px;overflow-x:auto;padding:0 16px 8px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box;scrollbar-width:none}
.aichips button{flex:none;min-height:36px;padding:0 13px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e9ecff;font:600 .78rem system-ui;cursor:pointer;white-space:nowrap}
.aiin{display:flex;gap:8px;align-items:flex-end;padding:10px 16px calc(12px + env(safe-area-inset-bottom));max-width:860px;width:100%;margin:0 auto;box-sizing:border-box}
.aiin textarea{flex:1;resize:none;max-height:140px;min-height:50px;padding:13px 15px;border-radius:20px;border:1px solid rgba(255,255,255,.22);background:rgba(10,13,22,.75);color:#fff;font:500 1rem/1.35 system-ui;outline:none;backdrop-filter:blur(14px)}
.aiin textarea:focus{border-color:rgba(182,255,59,.7);box-shadow:0 0 0 3px rgba(182,255,59,.15)}
.aiin button{width:52px;height:52px;flex:none;border-radius:50%;border:0;cursor:pointer;font-size:1.25rem;color:#06110a;background:linear-gradient(135deg,#b6ff3b,#5eead4);box-shadow:0 0 24px rgba(182,255,59,.5)}
.aiin button:disabled{opacity:.4;box-shadow:none}
.aicode{position:relative;margin:8px 0;border-radius:14px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.14)}.aicode pre{margin:0;padding:38px 12px 12px;white-space:pre-wrap;word-break:break-word;font:500 .86rem/1.45 ui-monospace,Menlo,monospace;color:#e9ecff}
.aicp{position:absolute;top:6px;right:6px;display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:0 10px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:600 .72rem system-ui;cursor:pointer}.aicp.ok,.aiact button.ok{background:rgba(182,255,59,.25);border-color:rgba(182,255,59,.6)}
.aimsg code{font:500 .85em ui-monospace,Menlo,monospace;background:rgba(255,255,255,.1);padding:1px 5px;border-radius:5px}.aimsg .aih{margin:10px 0 6px;font:700 1rem var(--f-head,system-ui)}.aimsg ol{margin:4px 0 8px;padding-left:20px}
.aitbl{overflow-x:auto;margin:8px 0;border-radius:12px;border:1px solid rgba(255,255,255,.14)}.aitbl table{border-collapse:collapse;width:100%;font-size:.82rem}.aitbl th,.aitbl td{padding:7px 9px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left;white-space:nowrap}.aitbl th{background:rgba(182,255,59,.12);color:#d9ffb0}
.aiact{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.aiact button{display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:0 10px;border-radius:10px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#e9ecff;font:600 .72rem system-ui;cursor:pointer}
#aiprint{display:none}@media print{html.aiprinting body>*:not(#aiprint){display:none!important}html.aiprinting #aiprint{display:block!important;background:#fff}html.aiprinting,html.aiprinting body{background:#fff!important}@page{margin:16mm}}
.aiin button.aiplus{width:46px;height:46px;flex:none;border-radius:50%;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;font:300 1.8rem/1 system-ui;cursor:pointer;margin-bottom:3px;box-shadow:inset 0 1px 0 rgba(255,255,255,.2);backdrop-filter:blur(12px)}
.aipend{display:flex;gap:8px;overflow-x:auto;padding:0 16px 6px;max-width:860px;width:100%;margin:0 auto;box-sizing:border-box}.aipend[hidden]{display:none}
.aich{position:relative;display:flex;align-items:center;gap:6px;flex:none;max-width:200px;padding:6px 36px 6px 6px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2);font-size:.74rem}.aich img{width:40px;height:40px;object-fit:cover;border-radius:9px}.aich b{font-size:1.3rem;padding:0 4px}.aich span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.aich button{position:absolute;top:50%;transform:translateY(-50%);right:6px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.35)!important;border:0;background:none;color:#fff;font-size:1.1rem;cursor:pointer}
.aiatt{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}.aiatt img{width:110px;height:110px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,.25)}.aiatt span{align-self:flex-start;padding:6px 10px;border-radius:10px;background:rgba(0,0,0,.25);font-size:.78rem}
.aibd{display:inline-block;min-width:16px;height:16px;border-radius:8px;line-height:16px!important;background:#ff6b81;color:#fff;font:800 .64rem/18px system-ui;text-align:center;font-style:normal;margin-left:4px;padding:0 4px}
.aibody>*{flex-shrink:0}
/* Safari/iPhone: obyčajný blokový tok – nič sa nemôže prekrývať */.aibody{display:block!important}.aibody>*+*{margin-top:12px}.aibody>.aimsg{display:block;width:fit-content;width:-webkit-fit-content}.aibody>.aimsg.u{margin-left:auto}.aibody>.aimsg.a{margin-right:auto}.aibody>.aiempty{margin:40px auto 0}.aicard{display:block!important;height:auto!important;overflow:visible}.aicard>*+*{margin-top:8px}.aidoccard,.aisel,.aidf{height:auto}.aidf{flex-shrink:0;min-height:38px;gap:6px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.aidf button{flex:none;min-height:34px;padding:0 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);color:#e9ecff;font:600 .74rem system-ui;cursor:pointer}.aidf button[aria-pressed=true]{background:rgba(182,255,59,.22);border-color:rgba(182,255,59,.6);color:#fff}
.aisel{display:flex;gap:8px;margin:2px 0;flex-shrink:0;min-height:44px}.aisel button{flex:1;min-height:44px;border-radius:14px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06);color:#fff;font:700 .8rem system-ui;cursor:pointer}.aisel button.p{background:linear-gradient(135deg,#25d366,#5eead4);color:#04110a;border:0}.aisel button:disabled{opacity:.4}
.aidoccard{position:relative}.aidoccard.sel{border-color:rgba(37,211,102,.8)!important;box-shadow:0 0 0 2px rgba(37,211,102,.35)}
.aick{position:absolute;top:12px;right:12px;width:26px;height:26px;z-index:2}.aick input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}.aick span{display:block;width:26px;height:26px;border-radius:8px;border:2px solid rgba(255,255,255,.45);background:rgba(0,0,0,.25)}.aick input:checked+span{background:#25d366;border-color:#25d366;box-shadow:0 0 12px rgba(37,211,102,.6)}.aick input:checked+span::after{content:"✓";display:grid;place-items:center;height:100%;color:#04110a;font:900 .9rem system-ui}
.aidoccard .aidh{padding-right:44px!important;box-sizing:border-box}.aiwa{display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:0 10px;border-radius:10px;background:rgba(37,211,102,.18);border:1px solid rgba(37,211,102,.55);color:#d6ffe6;font:600 .72rem system-ui;text-decoration:none}
.aidoccard{border-radius:20px;padding:12px 13px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.aidoccard.n{border-color:rgba(255,107,129,.45);background:linear-gradient(150deg,rgba(239,68,68,.12),rgba(255,255,255,.03))}
.aidh{all:unset;display:flex;gap:10px;align-items:center;width:100%;cursor:pointer}.aidi{width:40px;height:40px;flex:none;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.08);font-size:1.2rem}.aidt{flex:1;min-width:0}.aidt b{display:block;font:700 .9rem var(--f-head,system-ui);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aidt small{color:rgba(255,255,255,.6);font-size:.7rem}
.aist2{flex:none;padding:3px 9px;border-radius:999px;font:700 .64rem system-ui;text-transform:uppercase;letter-spacing:.04em}.aist2.n{background:rgba(239,68,68,.3);color:#ffd2d8}.aist2.o{background:rgba(124,92,255,.3);color:#d8ccff}.aist2.v{background:rgba(182,255,59,.22);color:#d9ffb0}
.aidbody{max-width:100%!important;margin-top:10px;background:rgba(0,0,0,.25)!important}.aiact button.dng{color:#ffb3bf}
.aicard{padding:14px 15px;border-radius:20px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);display:grid;gap:8px}
.aicard h3{margin:0;font:700 .95rem var(--f-head,system-ui)}.aicard .s{color:rgba(255,255,255,.6);font-size:.8rem}
.aist{display:inline-block;padding:2px 9px;border-radius:999px;font:700 .68rem system-ui;letter-spacing:.04em;text-transform:uppercase}
.aist.nova,.aist.odoslana{background:rgba(124,92,255,.3);color:#d8ccff}.aist.hotova{background:rgba(182,255,59,.22);color:#d9ffb0}.aist.chyba{background:rgba(239,68,68,.25);color:#ffc2cb}
.aibig{min-height:52px;border-radius:16px;border:0;font:700 .95rem var(--f-head,system-ui);cursor:pointer;color:#06110a;background:linear-gradient(135deg,#b6ff3b,#5eead4)}
.aiempty{margin:auto;text-align:center;color:rgba(255,255,255,.65);max-width:420px;display:grid;gap:10px;justify-items:center;padding:20px}
.aiempty b{font:800 1.4rem var(--f-head,system-ui);color:#fff;letter-spacing:-.02em}
/* Dashboard karta */
.aidash{position:relative;overflow:hidden;border-radius:26px;padding:16px 16px 14px;margin:12px 0;border:1px solid rgba(167,139,250,.45);
  background:linear-gradient(150deg,rgba(124,92,255,.28),rgba(34,211,238,.10) 55%,rgba(182,255,59,.10));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 20px 60px rgba(124,92,255,.22)}
.aidash .h{display:flex;align-items:center;gap:10px}.aidash .h .aiorb{width:32px;height:32px}.aidash .h b{font:800 1.02rem var(--f-head,system-ui)}.aidash .h small{margin-left:auto;color:rgba(255,255,255,.55);font-size:.7rem}
.aidash .txt{margin-top:10px;font-size:.9rem;line-height:1.5;max-height:9.5em;overflow:hidden;mask-image:linear-gradient(180deg,#000 70%,transparent);-webkit-mask-image:linear-gradient(180deg,#000 70%,transparent)}
.aidash .txt p{margin:0 0 6px}.aidash .txt ul{margin:0 0 6px;padding-left:18px}
.aidash .fx{display:grid;gap:6px;margin-top:10px}.aidash .fx div{display:flex;gap:8px;font-size:.82rem;padding:8px 10px;border-radius:12px;background:rgba(182,255,59,.10);border:1px solid rgba(182,255,59,.3)}
.aidash .row{display:flex;gap:8px;margin-top:12px}.aidash .row button{flex:1;min-height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font:700 .8rem system-ui;cursor:pointer}
.aidash .row button.p{background:linear-gradient(135deg,#b6ff3b,#5eead4);color:#06110a;border:0}
@media (max-width:460px){.aibtn{padding:0 11px 0 8px;font-size:.74rem;gap:6px}.aibtn i{width:16px;height:16px}}`;
const st=document.createElement("style");st.textContent=CSS;document.head.appendChild(st);

const A={open:false,tab:"chat",msgs:[],tasks:[],busy:null,ready:null};
const tm=d=>new Date(d).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"});
const CB=[];const ICO_COPY='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/></svg>';
function il(s){return esc(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g,"$1<i>$2</i>").replace(/(^|\s)_([^_]+)_(?=\s|$|[.,!?])/g,"$1<i>$2</i>").replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>')}
function cells(l){return l.replace(/^\s*\|/,"").replace(/\|\s*$/,"").split("|").map(c=>c.trim())}
function md(t){const L=String(t||"").split("\n");let h="",lst=null,tasks=[],i=0;
  const close=()=>{if(lst){h+=`</${lst}>`;lst=null}};
  while(i<L.length){const raw=L[i],l=raw.trim();
    if(/^```/.test(l)){close();const buf=[];i++;while(i<L.length&&!/^```/.test(L[i].trim())){buf.push(L[i]);i++}i++;const k=CB.push(buf.join("\n"))-1;
      h+=`<div class="aicode"><button type="button" class="aicp" data-aicb="${k}" aria-label="Kopírovať">${ICO_COPY}<span>Kopírovať</span></button><pre>${esc(buf.join("\n"))}</pre></div>`;continue}
    if(/^\|.*\|\s*$/.test(l)&&i+1<L.length&&/^\|?\s*:?-{2,}/.test(L[i+1].trim())){close();const head=cells(l);i+=2;const rows=[];while(i<L.length&&/^\|.*\|\s*$/.test(L[i].trim())){rows.push(cells(L[i].trim()));i++}
      h+=`<div class="aitbl"><table><thead><tr>${head.map(c=>`<th>${il(c)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${il(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;continue}
    const tk=l.match(/^\**ÚLOHA:\**\s*(.+)$/);if(tk){tasks.push(tk[1]);i++;continue}
    let m;
    if((m=l.match(/^(#{1,4})\s+(.+)$/))){close();h+=`<h${Math.min(4,m[1].length+2)} class="aih">${il(m[2])}</h${Math.min(4,m[1].length+2)}>`;i++;continue}
    if(/^[-•*]\s+/.test(l)){if(lst!=="ul"){close();h+="<ul>";lst="ul"}h+="<li>"+il(l.replace(/^[-•*]\s+/,""))+"</li>";i++;continue}
    if((m=l.match(/^\d+[.)]\s+(.+)$/))){if(lst!=="ol"){close();h+="<ol>";lst="ol"}h+="<li>"+il(m[1])+"</li>";i++;continue}
    close();if(l)h+="<p>"+il(l)+"</p>";i++}
  close();for(const x of tasks)h+=`<div class="aitask"><span>🛠</span><div><b>Úloha pre úpravu aplikácie</b><br>${esc(x)}</div></div>`;return h}
function plain(t){return String(t||"").split("\n").filter(l=>!/^\s*\**ÚLOHA:/.test(l)&&!/^```/.test(l.trim())).join("\n").replace(/\*\*(.+?)\*\*/g,"$1").replace(/^#+\s+/gm,"").trim()}
function tables(t){const L=String(t||"").split("\n"),out=[];for(let i=0;i<L.length;i++){if(/^\|.*\|\s*$/.test(L[i].trim())&&i+1<L.length&&/^\|?\s*:?-{2,}/.test(L[i+1].trim())){const rows=[cells(L[i].trim())];i+=2;while(i<L.length&&/^\|.*\|\s*$/.test(L[i].trim())){rows.push(cells(L[i].trim()));i++}out.push(rows)}}return out}
function acts(x){if(x.role!=="assistant"||x.status!=="ok")return "";const hasT=tables(x.content).length;
  return `<div class="aiact"><button type="button" data-aia="copy" data-id="${x.id}">${ICO_COPY}<span>Kopírovať</span></button><button type="button" data-aia="save" data-id="${x.id}">📁<span>Do dokumentov</span></button><button type="button" data-aia="pdfsave" data-id="${x.id}">⬇️<span>Uložiť PDF</span></button><button type="button" data-aia="pdf" data-id="${x.id}">🖨<span>Tlačiť</span></button><button type="button" data-aia="doc" data-id="${x.id}">📝<span>Word</span></button>${hasT?`<button type="button" data-aia="csv" data-id="${x.id}">📊<span>Excel</span></button>`:""}<button type="button" data-aia="mail" data-id="${x.id}">✉️<span>E-mail</span></button>${navigator.share?`<button type="button" data-aia="share" data-id="${x.id}">⤴<span>Zdieľať</span></button>`:""}</div>`}
async function copyTxt(t,btn){try{await navigator.clipboard.writeText(t)}catch(e){const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();try{document.execCommand("copy")}catch(_){}ta.remove()}
  if(btn){const sp=btn.querySelector("span"),o=sp?sp.textContent:"";btn.classList.add("ok");if(sp)sp.textContent="Skopírované ✓";setTimeout(()=>{btn.classList.remove("ok");if(sp)sp.textContent=o},1800)}}
function docTitle(t){const f=String(t||"").split("\n").map(l=>l.replace(/^#+\s*/,"").replace(/\*\*/g,"").trim()).find(Boolean)||"ERNTE";return f.slice(0,70)}
function docHTML(x){const d=new Date(x.created_at).toLocaleDateString("sk-SK",{day:"numeric",month:"long",year:"numeric"});
  const body=String(x.content||"").split(/\n-{3,}\s*\n/)[0].split("\n").filter(l=>!/ťukni\s+\**(pdf|word|uložiť|tlačiť)|pod odpoveďou/i.test(l)).join("\n");
  const fm=docFirm(x,body);
  const hd=fm==="valko"?`<div class="aidoc-h vk"><img src="valko-logo.png" alt="VALKO"><div><b>VALKO s.r.o.</b><small>Medzinárodná kamiónová doprava · Zbudza 141, 072 23<br>IČO: 53 365 241 · IČ DPH: SK2121345424 · ${esc(d)}</small></div></div>`
    :`<div class="aidoc-h"><img src="logo.png" alt="ERNTE"><div><b>ERNTE spol. s r.o.</b><small>Zbudza 141, 072 23 · ${esc(d)}</small></div></div>`;
  return `<div class="aidoc">${hd}${placeStamp(md(body),stampFor(x,body))}</div>`}
function placeStamp(h,st){if(!st)return h;const P=h.split(/(?=<p>)/);let i=-1;for(let k=P.length-1;k>=0;k--){if(/Vaľko|konateľ\b|konateľ,|konateľ </i.test(P[k].split("</p>")[0])){i=k;break}}
  if(i<0)return h+st;const end=P[i].indexOf("</p>")+4;P[i]=P[i].slice(0,end)+st+P[i].slice(end);return P.join("")}
// pečiatka s podpisom – uložená len v databáze (nie verejne), vidí iba majiteľ
const STAMP={};
async function loadStamps(){try{const r=await sb.from("ai_state").select("key,value").like("key","stamp_%");for(const x of (r.data||[]))STAMP[x.key.slice(6)]=x.value}catch(e){}}
// VALKO s.r.o. = doprava, autá, vodiči (zamestnanci); ERNTE spol. s r.o. = výkup obilia, farmári
function docFirm(x,body){const t=String(body||""),k=String(x.kind||"");
  if(/upozornen|výzv|vyzv/i.test(k)||/VALKO|vodič|vodic|vozidl|ŠPZ|SPZ|tankov|spotreb|nafty|nafta|kamión|kamion|tachograf|mýto|myto/i.test(t))return "valko";return "ernte"}
function stampFor(x,body){if(x.nostamp)return "";
  const valko=docFirm(x,body)==="valko",ernte=!valko;
  const S=(valko&&STAMP.valko)||(ernte&&STAMP.ernte)||null;
  return S&&S.img?`<div class="aistamp"><img src="${S.img}" alt="Pečiatka a podpis ${esc(S.firma||"")}"></div>`:""}
const DOCCSS=`.aidoc{font:12pt/1.5 Georgia,"Times New Roman",serif;color:#111}.aidoc-h{display:flex;gap:14px;align-items:center;border-bottom:2px solid #8bc34a;padding-bottom:10px;margin-bottom:16px}.aidoc-h img{height:46px}.aidoc-h b{display:block;font:700 13pt Arial,sans-serif}.aidoc-h small{color:#555;font:9pt Arial,sans-serif}.aidoc h3,.aidoc h4{font-family:Arial,sans-serif;margin:14px 0 6px}.aidoc table{border-collapse:collapse;width:100%;margin:8px 0}.aidoc th,.aidoc td{border:1px solid #bbb;padding:5px 7px;text-align:left;font-size:10.5pt}.aidoc th{background:#eef5e4}.aidoc pre{white-space:pre-wrap;background:#f5f5f5;padding:8px;border-radius:4px}.aidoc .aitask,.aidoc .aicp{display:none}.aidoc a{color:#111}.aidoc-h.vk{border-bottom-color:#1e2f8a}.aidoc-h.vk img{height:40px}.aidoc-h small{display:block;line-height:1.45!important;margin-top:2px}.aidoc .vkw{font:900 22pt/1 Arial,sans-serif;letter-spacing:.12em;color:#111;display:flex;align-items:baseline;gap:4px}.aidoc .vkw span{font:700 11pt Arial,sans-serif;letter-spacing:.05em}.aidoc .aistamp{display:flex;justify-content:flex-start;margin:-6px 0 10px;page-break-inside:avoid}.aidoc .aistamp img{width:62mm;max-width:60%;height:auto}.aidoc th,.aidoc td,.aidoc pre,.aidoc p,.aidoc li,.aidoc b{color:#111!important}.aidoc th{background:#eef5e4!important}.aidoc .aicode{background:#f5f5f5!important;border:1px solid #ccc!important}.aidoc .aicode pre{padding:10px!important;font:10.5pt/1.45 Menlo,Consolas,monospace!important}.aidoc .aitbl{border:0!important;overflow:visible}`;
function dl(name,blob){const u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000)}
function fname(x,ext){return (docTitle(x.content).normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"ERNTE")+"."+ext}
// ===== ARCHÍV DOKUMENTOV =====
const DK={upozornenie:["⚠️","Upozornenie"],vyzva:["❓","Výzva na vysvetlenie"],zmluva:["📜","Zmluva"],ponuka:["💼","Ponuka"],list:["✉️","List"],iny:["📄","Dokument"],dokument:["📄","Dokument"]};
const DS={novy:["nový","n"],odoslany:["odoslaný","o"],vyriesene:["vyriešené","v"]};
function docObj(d){return d?{id:"d"+d.id,content:d.content,created_at:d.created_at,role:"assistant",status:"ok",title:d.title,kind:d.kind}:null}
function docsView(){if(A.docs===null)return `<div class="aiempty"><span>Archív dokumentov sa zapne po aktualizácii databázy (prebehne automaticky do pár minút).</span></div>`;
  const D=A.docs,drv=[...new Set(D.map(d=>d.driver).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"sk")),f=A.dflt||"";
  const L=D.filter(d=>!f||(f==="_n"?d.status==="novy":d.driver===f));
  let h=`<div class="aidf"><button type="button" data-aidf="" aria-pressed="${!f}">Všetko (${D.length})</button><button type="button" data-aidf="_n" aria-pressed="${f==="_n"}">Neodoslané (${D.filter(d=>d.status==="novy").length})</button>${drv.map(n=>`<button type="button" data-aidf="${esc(n)}" aria-pressed="${f===n}">${esc(n)} (${D.filter(d=>d.driver===n).length})</button>`).join("")}</div>`;
  A.sel=A.sel||new Set();const nS=L.filter(d=>A.sel.has(d.id)).length;
  if(L.length)h+=`<div class="aisel"><button type="button" data-aiselall="1">${nS===L.length?"☑ Zrušiť výber":"☐ Vybrať všetko"} (${L.length})</button><button type="button" class="p" data-aibulk="1" ${nS?"":"disabled"}>📤 Odoslať vybrané${nS?" ("+nS+")":""}</button></div>`;
  if(!L.length)return h+`<div class="aiempty"><b>Zatiaľ žiadne dokumenty</b><span>Upozornenia pre vodičov sa sem ukladajú automaticky z prehľadov. Môžeš napísať aj „sprav upozornenie pre Vodič alebo pod akúkoľvek odpoveďou ťuknúť 📁 Do dokumentov.</span></div>`;
  return h+L.map(d=>{const k=DK[d.kind]||DK.iny,st=DS[d.status]||DS.novy,op=A.dopen===d.id;const ph=drvPhone(d.driver);return `<div class="aidoccard ${st[1]}${A.sel.has(d.id)?" sel":""}"><label class="aick"><input type="checkbox" data-aick="${d.id}" ${A.sel.has(d.id)?"checked":""} aria-label="Vybrať"><span></span></label><button type="button" class="aidh" data-aidopen="${d.id}"><span class="aidi">${k[0]}</span><span class="aidt"><b>${esc(d.title)}</b><small>${esc(k[1])}${d.driver?" · "+esc(d.driver):""} · ${tm(d.created_at)}${d.sent_at?" · odoslané "+tm(d.sent_at):""}</small></span><span class="aist2 ${st[1]}">${st[0]}</span></button>
    ${op?`<div class="aimsg a aidbody">${md(d.content)}</div>`:""}
    <div class="aiact"><button type="button" data-aia="send" data-id="d${d.id}">📤<span>Odoslať</span></button>${ph?`<a class="aiwa" href="https://wa.me/${esc(ph)}?text=${encodeURIComponent("Dobrý deň, posielam Vám dokument: "+d.title+". Prosím o vyjadrenie v uvedenej lehote. Vaľko, VALKO s.r.o.")}" target="_blank" rel="noopener">💬<span>WhatsApp ${esc(String(d.driver||"").split(" ")[0])}</span></a>`:""}<button type="button" data-aia="pdfsave" data-id="d${d.id}">⬇️<span>PDF</span></button><button type="button" data-aia="pdf" data-id="d${d.id}">🖨<span>Tlačiť</span></button><button type="button" data-aia="doc" data-id="d${d.id}">📝<span>Word</span></button>${d.status!=="odoslany"?`<button type="button" data-aidst="${d.id}|odoslany">✓<span>Odoslané</span></button>`:""}${d.status!=="vyriesene"?`<button type="button" data-aidst="${d.id}|vyriesene">✔︎<span>Vyriešené</span></button>`:""}<button type="button" data-aidst="${d.id}|zmazat" class="dng">🗑</button></div></div>`}).join("")}
let PHONES=null;async function loadPhones(){try{const r=await sb.from("fleet_cfg").select("value").eq("key","phones").maybeSingle();PHONES=(r.data&&r.data.value)||{}}catch(e){PHONES={}}}
const nrm=n=>String(n||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").split(/\s+/).filter(Boolean).sort().join(" ");
function drvPhone(n){if(!n||!PHONES)return null;const k=Object.keys(PHONES).find(x=>nrm(x)===nrm(n));let p=k?String(PHONES[k]).replace(/[^\d+]/g,""):"";if(!p)return null;p=p.replace(/^\+/,"").replace(/^00/,"");if(p.startsWith("0"))p="421"+p.slice(1);return p}
async function bulkSend(btn){const ids=[...A.sel];const D=(A.docs||[]).filter(d=>ids.includes(d.id));if(!D.length)return;btn.disabled=true;const old=btn.textContent;
  const files=[];try{for(let i=0;i<D.length;i++){btn.textContent=`Pripravujem ${i+1}/${D.length}…`;const x=docObj(D[i]);const b=await makePdf(x);files.push(new File([b],fname(x,"pdf").replace(/\.pdf$/,"")+"-"+(D[i].driver||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^A-Za-z]+/g,"-").replace(/-$/,"")+".pdf",{type:"application/pdf"}))}}
  catch(e){btn.disabled=false;btn.textContent=old;toast("PDF sa nepodarilo pripraviť – skús Odoslať pri jednotlivých dokumentoch.");return}
  const mark=async()=>{for(const d of D)await sb.rpc("ai_doc_mark",{p_id:d.id,p_status:"odoslany"});A.sel.clear();await load();view()};
  btn.disabled=false;btn.textContent=old;
  if(navigator.canShare&&navigator.canShare({files})){try{await navigator.share({files,title:`Dokumenty VALKO (${files.length})`});await mark();return}catch(e){if(e&&e.name==="AbortError")return}
    return shareFiles(files,mark)}
  for(const f of files)dl(f.name,f);await mark()}
function shareFiles(files,after){const o=document.createElement("div");o.className="hsheet";o.id="pdfReady";
  o.innerHTML=`<div class="hbox" style="max-width:420px;text-align:center"><div style="font-size:2.4rem">📄</div><b style="font:800 1.2rem var(--f-head,system-ui)">${files.length} PDF pripravených</b><p class="hrole" style="margin:8px 0 14px">${files.map(f=>esc(f.name)).join("<br>")}</p>
   <button type="button" class="hai" id="pdfGo">📤 Odoslať všetky (WhatsApp, e-mail…)</button><button type="button" class="hai" id="pdfDl" style="background:rgba(255,255,255,.1);color:#fff;margin-top:8px">⬇️ Uložiť do telefónu</button><button type="button" class="hx" id="pdfX" style="margin:12px auto 0;display:block">×</button></div>`;
  document.body.appendChild(o);const close=()=>o.remove();
  o.querySelector("#pdfGo").onclick=async()=>{try{await navigator.share({files});close();after&&after()}catch(e){if(e&&e.name!=="AbortError"){files.forEach(f=>dl(f.name,f));close();after&&after()}}};
  o.querySelector("#pdfDl").onclick=()=>{files.forEach(f=>dl(f.name,f));close();after&&after()};o.querySelector("#pdfX").onclick=close}
async function makePdf(x){const H=await loadLib("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js","html2pdf");
  const sx=window.scrollX,sy=window.scrollY;window.scrollTo(0,0);
  const box=document.createElement("div");box.style.cssText="position:absolute;left:0;top:0;width:180mm;background:#fff;z-index:-5";box.innerHTML=`<style>${DOCCSS}</style>`+docHTML(x);document.body.appendChild(box);
  try{await Promise.all([...box.querySelectorAll("img")].map(im=>im.complete?1:new Promise(r=>{im.onload=im.onerror=r})));
    const w=H().set({margin:[14,14,14,14],image:{type:"jpeg",quality:.95},html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",scrollX:0,scrollY:0,windowWidth:box.scrollWidth,windowHeight:box.scrollHeight},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],avoid:["tr","li","h3","h4",".aistamp"]}}).from(box.querySelector(".aidoc"));
    const cv=await w.toCanvas().get("canvas");
    // kontrola: ak je horná časť prázdna, PDF by bolo zlé → použije sa tlač
    const c2=cv.getContext("2d"),hh=Math.min(cv.height,400),d=c2.getImageData(0,0,cv.width,hh).data;let ink=0;for(let k=0;k<d.length;k+=16)if(d[k]<200)ink++;
    if(ink<20)throw new Error("prázdna strana");
    return await w.toPdf().output("blob")}
  finally{box.remove();window.scrollTo(sx,sy)}}
// zdieľanie súboru vyžaduje čerstvé ťuknutie – po príprave PDF ukáže tlačidlo „Odoslať teraz“
function shareReady(file,title,after){const o=document.createElement("div");o.className="hsheet";o.id="pdfReady";
  o.innerHTML=`<div class="hbox" style="max-width:420px;text-align:center"><div style="font-size:2.4rem">📄</div><b style="font:800 1.2rem var(--f-head,system-ui)">PDF je pripravené</b><p class="hrole" style="margin:8px 0 14px">${esc(file.name)}</p>
   <button type="button" class="hai" id="pdfGo">📤 Odoslať teraz (WhatsApp, e-mail…)</button><button type="button" class="hai" id="pdfDl" style="background:rgba(255,255,255,.1);color:#fff;margin-top:8px">⬇️ Uložiť do telefónu</button><button type="button" class="hx" id="pdfX" style="margin:12px auto 0;display:block">×</button></div>`;
  document.body.appendChild(o);const close=()=>o.remove();
  o.querySelector("#pdfGo").onclick=async()=>{try{await navigator.share({files:[file],title});close();after&&after()}catch(e){if(e&&e.name!=="AbortError"){dl(file.name,file);close();after&&after()}}};
  o.querySelector("#pdfDl").onclick=()=>{dl(file.name,file);close();after&&after()};o.querySelector("#pdfX").onclick=close}
async function sharePdf(x,file,after){if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:docTitle(x.content)});after&&after();return}catch(e){if(e&&e.name==="AbortError")return;return shareReady(file,docTitle(x.content),after)}}
  dl(file.name,file);after&&after()}
async function sendDoc(x,btn){const sp=btn&&btn.querySelector("span");if(sp)sp.textContent="Pripravujem…";const name=fname(x,"pdf");
  const mark=async()=>{if(String(x.id).startsWith("d")){await sb.rpc("ai_doc_mark",{p_id:+String(x.id).slice(1),p_status:"odoslany"});await load();view()}};
  try{const blob=await makePdf(x);await sharePdf(x,new File([blob],name,{type:"application/pdf"}),mark)}
  catch(e){toast("Priame PDF nevyšlo – v tlači vyber „Uložiť ako PDF“ a potom ho pošli.");msgAct("pdf",x.id,null)}
  if(sp)sp.textContent="Odoslať"}
async function saveDoc(x,btn){const sp=btn&&btn.querySelector("span");const txt=String(x.content||"");const m=txt.match(/upozornen|výzv|vyzv/i);
  const drv=(A.docs||[]).map(d=>d.driver).filter(Boolean).find(n=>txt.includes(n.split(" ")[0]))||null;
  const r=await sb.rpc("ai_doc_save",{p_title:docTitle(txt),p_content:txt.split(/\n-{3,}\s*\n/)[0],p_kind:m?"upozornenie":"dokument",p_driver:drv,p_msg:typeof x.id==="number"?x.id:null});
  if(r.error){toast(/ai_doc_save|function/i.test(r.error.message)?"Archív sa zapne po aktualizácii databázy (pár minút).":"Chyba: "+r.error.message);return}
  if(sp)sp.textContent="Uložené ✓";await load();view()}

async function msgAct(kind,id,btn){const x=String(id).startsWith("d")?docObj(A.docs.find(d=>"d"+d.id===String(id))):A.msgs.find(m=>String(m.id)===String(id));if(!x)return;
  if(kind==="copy")return copyTxt(plain(x.content),btn);
  if(kind==="send"){return sendDoc(x,btn)}
  if(kind==="save"){return saveDoc(x,btn)}
  if(kind==="pdfsave"){const sp=btn&&btn.querySelector("span");if(sp)sp.textContent="Pripravujem…";const name=fname(x,"pdf");
    try{const blob=await makePdf(x),file=new File([blob],name,{type:"application/pdf"});
      if(/iPhone|iPad|Android/i.test(navigator.userAgent))await sharePdf(x,file,null);else dl(name,blob);
      if(sp)sp.textContent="Uložené ✓"}
    catch(e){if(sp)sp.textContent="Uložiť PDF";toast("Priame PDF nevyšlo – v tlači vyber „Uložiť ako PDF“.");return msgAct("pdf",x.id,null)}
    setTimeout(()=>{if(sp)sp.textContent=sp.textContent==="Uložené ✓"?"Uložiť PDF":sp.textContent},2500);return}
  if(kind==="pdf"){let p=$("aiprint");if(!p){p=document.createElement("div");p.id="aiprint";document.body.appendChild(p)}p.innerHTML=`<style>${DOCCSS}</style>`+docHTML(x);const t=document.title;document.title=docTitle(x.content);document.documentElement.classList.add("aiprinting");
    setTimeout(()=>{window.print();setTimeout(()=>{document.documentElement.classList.remove("aiprinting");document.title=t},800)},150);return}
  if(kind==="doc"){const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>${esc(docTitle(x.content))}</title><style>${DOCCSS}</style></head><body>${docHTML(x).replace(/src="(logo|valko-logo)\.png"/g,(m,n)=>'src="'+location.href.replace(/[^/]*$/,"")+n+'.png"')}</body></html>`;
    return dl(fname(x,"doc"),new Blob(["﻿"+html],{type:"application/msword"}))}
  if(kind==="csv"){const T=tables(x.content);const q=c=>'"'+String(c).replace(/\*\*/g,"").replace(/"/g,'""')+'"';const csv=T.map(rows=>rows.map(r=>r.map(q).join(";")).join("\r\n")).join("\r\n\r\n");return dl(fname(x,"csv"),new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8"}))}
  if(kind==="mail"){location.href="mailto:?subject="+encodeURIComponent(docTitle(x.content))+"&body="+encodeURIComponent(plain(x.content).slice(0,1800));return}
  if(kind==="share"){try{await navigator.share({title:docTitle(x.content),text:plain(x.content)})}catch(e){}}}
async function load(){const [m,t,dc]=await Promise.all([sb.from("ai_msgs").select("id,kind,role,content,status,created_at,att_meta").order("id",{ascending:false}).limit(80),sb.from("ai_tasks").select("*").order("created_at",{ascending:false}).limit(40),sb.from("ai_docs").select("*").order("created_at",{ascending:false}).limit(300)]);A.docs=dc.error?null:(dc.data||[]);
  if(m.error){A.ready=/ai_msgs|relation|does not exist|schema cache/i.test(m.error.message)?"setup":"err:"+m.error.message;return}
  A.ready="ok";if(!Object.keys(STAMP).length)loadStamps();if(!PHONES)loadPhones().then(()=>view());A.msgs=(m.data||[]).reverse();A.tasks=t.data||[];badge()}
function badge(){const b=$("aiBtn");if(!b)return;let seen=0;try{seen=+localStorage.getItem("aiSeen")||0}catch(e){}
  const n=A.msgs.filter(x=>x.role==="assistant"&&x.kind!=="chat"&&x.status==="ok"&&x.id>seen).length;let e=b.querySelector("em");if(n){if(!e){e=document.createElement("em");b.appendChild(e)}e.textContent=n}else if(e)e.remove()}
function markSeen(){const mx=Math.max(0,...A.msgs.map(x=>x.id));try{localStorage.setItem("aiSeen",mx)}catch(e){}badge()}

function view(){const el=$("aiSheet");if(!el)return;CB.length=0;el.classList.toggle("busy",!!A.busy);
  const nD=(A.docs||[]).filter(d=>d.status==="novy").length;const tabs=[["chat","💬 Chat"],["docs","📁 Dokumenty"+(nD?` <em class="aibd">${nD}</em>`:"")],["rep","📊 Prehľady"],["fix","🛠 Úpravy"]];
  let body="";
  if(A.ready==="setup")body=`<div class="aiempty"><div class="aiorb" style="width:72px;height:72px"></div><b>AI Podpora ešte nie je zapnutá</b><span>Raz spusti nastavenie – vložíš kľúč a SQL ako pri Commanderi.</span><a class="aibig" style="display:flex;align-items:center;justify-content:center;padding:0 24px;text-decoration:none" href="ai.html">Zapnúť AI Podporu</a></div>`;
  else if(A.ready&&A.ready.startsWith("err:"))body=`<div class="aiempty"><b>Chyba</b><span>${esc(A.ready.slice(4))}</span></div>`;
  else if(!A.ready)body=`<div class="aiempty"><span class="aitype"><i></i><i></i><i></i></span></div>`;
  else if(A.tab==="chat"){const C=A.msgs.filter(x=>x.kind==="chat");
    body=C.length?C.map(x=>x.status==="wait"?`<div class="aimsg a"><span class="aitype"><i></i><i></i><i></i>&nbsp;Premýšľam, kontrolujem údaje a trhy…</span></div>`:
      `<div class="aimsg ${x.role==="user"?"u":"a"}${x.status==="err"?" err":""}">${x.role==="user"?attView(x.att_meta)+"<p>"+esc(x.content).replace(/\n/g,"<br>")+"</p>":md(x.content)}${x.status==="err"&&/kľúč|ai\.html|401/.test(x.content||"")?`<p><a href="ai.html">Otvoriť nastavenie AI</a></p>`:""}<time>${tm(x.created_at)}</time>${acts(x)}</div>`).join(""):
      `<div class="aiempty"><div class="aiorb" style="width:84px;height:84px"></div><b>Ahoj, som ERNTE AI.</b><span>Kontrolujem obchody, flotilu, náklady a zisk, sledujem trhy a radím, čo robiť. Napíš aj „oprav…“ alebo „pridaj…“ a aplikáciu upravím – zhrnutie nájdeš v Dashboarde.</span></div>`}
  else if(A.tab==="rep"){const R=A.msgs.filter(x=>x.kind==="report"&&x.role==="assistant").reverse();
    body=`<button type="button" class="aibig" data-ai="rep">${A.busy?"Pripravujem prehľad…":"✦ Urobiť prehľad teraz"}</button>`+(R.length?R.map(x=>`<div class="aicard"><div class="s">${tm(x.created_at)} · prehľad</div>${x.status==="wait"?`<span class="aitype"><i></i><i></i><i></i>&nbsp;Pripravujem…</span>`:`<div class="aimsg a" style="max-width:100%;background:none;border:0;padding:0;backdrop-filter:none">${md(x.content)}${acts(x)}</div>`}</div>`).join(""):`<div class="aiempty"><span>Prehľad príde automaticky každé ráno o 6:00 a v pracovné dni o 14:00.</span></div>`)}
  else if(A.tab==="docs")body=docsView();
  else{const T=A.tasks,SN={nova:"čaká na odoslanie",odoslana:"odoslaná · robí sa",hotova:"hotové",chyba:"chyba – neodoslané"};
    body=T.length?T.map(t=>`<div class="aicard"><div style="display:flex;gap:8px;align-items:center"><span class="aist ${t.status}">${SN[t.status]||t.status}</span><span class="s">${tm(t.created_at)}${t.done_at?" → "+tm(t.done_at):""}</span></div><h3>${esc(t.text)}</h3>${t.status==="chyba"?`<div style="display:flex;gap:8px"><button type="button" class="aibig" data-airetry="${esc(t.id)}" style="min-height:44px;flex:1">↻ Skúsiť znova</button><button type="button" class="aibig" data-aidismiss="${esc(t.id)}" style="min-height:44px;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.25)">Zrušiť</button></div>`:""}${t.report?`<div class="aimsg a" style="max-width:100%;background:none;border:0;padding:0;backdrop-filter:none">${md(t.report)}</div>`:""}</div>`).join(""):
      `<div class="aiempty"><span>Zatiaľ žiadne úpravy. V chate napíš napr. „pridaj do Obchodov export do Excelu“.</span></div>`}
  el.querySelector(".aitabs").innerHTML=tabs.map(t=>`<button type="button" data-aitab="${t[0]}" aria-pressed="${A.tab===t[0]}">${t[1]}</button>`).join("");
  const b=el.querySelector(".aibody");const atBottom=b.scrollHeight-b.scrollTop-b.clientHeight<80;b.innerHTML=body;if(A.tab==="chat"&&(atBottom||A.jump)){b.scrollTop=b.scrollHeight;A.jump=false}
  el.querySelector(".aichips").hidden=A.tab!=="chat"||A.ready!=="ok";el.querySelector(".aiin").hidden=A.tab!=="chat"||A.ready!=="ok";
  const s=el.querySelector(".aiin button");if(s)s.disabled=!!A.busy}

async function openAI(){if($("aiSheet"))return;const d=document.createElement("div");d.id="aiSheet";d.className="aish";d.setAttribute("role","dialog");d.setAttribute("aria-label","ERNTE AI Podpora");
  d.innerHTML=`<div class="aihd"><div class="aiorb"></div><div><h2>ERNTE AI</h2><small>Podpora · kontrola · trhy</small></div><button type="button" class="x" data-ai="close" aria-label="Zavrieť">×</button></div>
  <div class="aitabs"></div><div class="aibody"></div>
  <div class="aichips">${["Ako sme na tom dnes?","Trhy – predať alebo držať?","Kde strácame peniaze?","Skontroluj flotilu a naftu","Čo mám dnes urobiť?"].map(q=>`<button type="button" data-aiq="${esc(q)}">${esc(q)}</button>`).join("")}</div>
  <div class="aipend" hidden></div><form class="aiin"><button type="button" class="aiplus" data-aiplus="1" aria-label="Pridať fotku alebo súbor">+</button><input type="file" id="aiFile" multiple accept="image/*,application/pdf,.pdf,.txt,.csv,.xlsx,.xls,.docx,.doc,.json,.md" hidden><textarea rows="1" placeholder="Napíš otázku alebo úlohu…" aria-label="Správa pre AI"></textarea><button type="submit" aria-label="Odoslať">➤</button></form>`;
  document.body.appendChild(d);document.documentElement.style.overflow="hidden";A.jump=true;view();await load();A.jump=true;view();markSeen();
  if(A.msgs.some(x=>x.status==="wait"))poll()}
function closeAI(){const d=$("aiSheet");if(d)d.remove();document.documentElement.style.overflow="";markSeen();refreshDash()}

let pollT=null;
async function poll(){clearTimeout(pollT);const t0=Date.now();
  const step=async()=>{try{await sb.rpc("ai_collect")}catch(e){}await load();view();
    if(A.msgs.some(x=>x.status==="wait")&&Date.now()-t0<7*60e3)pollT=setTimeout(step,2500);else{A.busy=null;view();markSeen();refreshDash()}};
  pollT=setTimeout(step,2000)}
// ===== PRÍLOHY: fotky, PDF, Word, Excel, text =====
const PEND=[];const MAXB=9e6;
function attView(meta){if(!meta||!meta.length)return "";return `<div class="aiatt">${meta.map(a=>a.thumb?`<img src="${esc(a.thumb)}" alt="${esc(a.name)}">`:`<span>${a.kind==="pdf"?"📄":a.kind==="sheet"?"📊":"📎"} ${esc(a.name)}</span>`).join("")}</div>`}
function pendView(){const el=document.querySelector("#aiSheet .aipend");if(!el)return;el.hidden=!PEND.length;el.innerHTML=PEND.map((a,i)=>`<div class="aich">${a.thumb?`<img src="${esc(a.thumb)}" alt="">`:`<b>${a.kind==="pdf"?"📄":a.kind==="sheet"?"📊":"📎"}</b>`}<span>${esc(a.name)}</span><button type="button" data-aidel="${i}" aria-label="Odstrániť">×</button></div>`).join("")}
const b64=buf=>{let s="",u=new Uint8Array(buf);for(let i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s)};
function loadLib(src,g){if(window[g])return Promise.resolve(window[g]);return new Promise((ok,no)=>{const s=document.createElement("script");s.src=src;s.onload=()=>ok(window[g]);s.onerror=no;document.head.appendChild(s)})}
function imgTo(file,max,q){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok(c.toDataURL("image/jpeg",q))};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("Obrázok sa nedá načítať"))};im.src=u})}
async function readFile(f){const n=f.name||"súbor",t=(f.type||"").toLowerCase(),ext=(n.split(".").pop()||"").toLowerCase();
  if(t.startsWith("image/")||/^(jpe?g|png|heic|heif|webp|gif)$/.test(ext)){const d=await imgTo(f,1600,.85),th=await imgTo(f,160,.7);return {kind:"image",name:n,media_type:"image/jpeg",data:d.split(",")[1],thumb:th}}
  if(t==="application/pdf"||ext==="pdf"){if(f.size>MAXB)throw new Error(n+": PDF je väčšie ako 9 MB");return {kind:"pdf",name:n,data:b64(await f.arrayBuffer())}}
  if(/^(xlsx|xls)$/.test(ext)){const X=await loadLib("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js","XLSX");const wb=X.read(await f.arrayBuffer(),{type:"array"});
    return {kind:"sheet",name:n,text:wb.SheetNames.map(sn=>"Hárok "+sn+":\n"+X.utils.sheet_to_csv(wb.Sheets[sn],{FS:";"})).join("\n\n").slice(0,150000)}}
  if(ext==="docx"){const M=await loadLib("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js","mammoth");const r=await M.extractRawText({arrayBuffer:await f.arrayBuffer()});return {kind:"text",name:n,text:r.value.slice(0,150000)}}
  if(ext==="doc")throw new Error(n+": starý formát .doc – ulož ho ako .docx alebo PDF");
  return {kind:"text",name:n,text:(await f.text()).slice(0,150000)}}
async function addFiles(list){for(const f of list){try{const a=await readFile(f);if(PEND.reduce((s,x)=>s+(x.data||x.text||"").length,0)+(a.data||a.text||"").length>14e6){toast("Príloh je priveľa naraz – pošli ich postupne.");break}PEND.push(a)}catch(e){toast(e.message||"Súbor sa nedá načítať")}}pendView()}

async function ask(q){q=String(q||"").trim();const att=PEND.length?PEND.splice(0):null;pendView();if((!q&&!att)||A.busy)return;A.busy="chat";A.tab="chat";
  A.msgs.push({id:1e15,kind:"chat",role:"user",content:q||"Pozri si prílohu.",att_meta:att?att.map(a=>({name:a.name,kind:a.kind,thumb:a.thumb})):null,status:"ok",created_at:new Date()},{id:1e15+1,kind:"chat",role:"assistant",status:"wait",created_at:new Date()});A.jump=true;view();
  const r=await sb.rpc("ai_ask",Object.assign({q,kpi:(typeof STATE!=="undefined"&&STATE.aiKpi)||null},att?{att}:{}));
  if(r.error){A.busy=null;await load();A.msgs.push({id:1e15+2,kind:"chat",role:"assistant",status:"err",content:r.error.message,created_at:new Date()});view();return}
  poll()}
async function report(){if(A.busy)return;A.busy="rep";view();const r=await sb.rpc("ai_report",{what:null});if(r.error){A.busy=null;toast("Chyba: "+r.error.message);view();return}await load();view();poll()}

document.addEventListener("click",e=>{const t=e.target;let x;
  if(t.closest("#aiBtn")){openAI();return}
  if(t.closest("[data-aiplus]")){const f=$("aiFile");if(f){f.value="";f.click()}return}
  if((x=t.closest("[data-aidel]"))){PEND.splice(+x.dataset.aidel,1);pendView();return}
  if((x=t.closest("[data-aicb]"))){copyTxt(CB[+x.dataset.aicb]||"",x);return}
  if((x=t.closest("[data-aia]"))){msgAct(x.dataset.aia,x.dataset.id,x);return}
  if(!t.closest("#aiSheet")&&!t.closest(".aidash"))return;
  if((x=t.closest("[data-ai]"))){const a=x.dataset.ai;if(a==="close")closeAI();else if(a==="rep"){if(!$("aiSheet"))openAI().then(()=>{A.tab="rep";view();report()});else report()}else if(a==="open")openAI();else if(a==="openrep"){openAI().then(()=>{A.tab="rep";view()})}else if(a==="opendocs"){openAI().then(()=>{A.tab="docs";view()})}else if(a==="openfix"){openAI().then(()=>{A.tab="fix";view()})}return}
  if((x=t.closest("[data-aitab]"))){A.tab=x.dataset.aitab;A.jump=true;view();return}
  if((x=t.closest("[data-aiq]"))){ask(x.dataset.aiq);return}
  if((x=t.closest("[data-aidf]"))){A.dflt=x.dataset.aidf;A.sel&&A.sel.clear();view();return}
  if((x=t.closest("[data-aick]"))){const i=+x.dataset.aick;A.sel=A.sel||new Set();x.checked?A.sel.add(i):A.sel.delete(i);view();return}
  if((x=t.closest("[data-aiselall]"))){const f=A.dflt||"",L=(A.docs||[]).filter(d=>!f||(f==="_n"?d.status==="novy":d.driver===f));A.sel=A.sel||new Set();if(L.every(d=>A.sel.has(d.id)))L.forEach(d=>A.sel.delete(d.id));else L.forEach(d=>A.sel.add(d.id));view();return}
  if((x=t.closest("[data-aibulk]"))){bulkSend(x);return}
  if((x=t.closest("[data-aidopen]"))){A.dopen=A.dopen===+x.dataset.aidopen?null:+x.dataset.aidopen;view();return}
  if((x=t.closest("[data-aidst]"))){const [i,st]=x.dataset.aidst.split("|");if(st==="zmazat"&&!confirm("Zmazať dokument z archívu?"))return;sb.rpc("ai_doc_mark",{p_id:+i,p_status:st}).then(async r=>{if(r.error)toast("Chyba: "+r.error.message);await load();view()});return}
  if((x=t.closest("[data-aidismiss]"))){x.disabled=true;sb.rpc("ai_task_dismiss",{t:x.dataset.aidismiss}).then(async r=>{if(r.error)toast(/ai_task_dismiss|function/i.test(r.error.message)?"Najprv spusti SQL na ai.html":"Chyba: "+r.error.message);await load();view()});return}
  if((x=t.closest("[data-airetry]"))){x.disabled=true;x.textContent="Odosielam…";sb.rpc("ai_task_retry",{t:x.dataset.airetry}).then(async r=>{if(r.error)toast("Chyba: "+r.error.message);setTimeout(async()=>{try{await sb.rpc("ai_collect")}catch(e){}await load();view()},4000);await load();view()})}});
document.addEventListener("change",e=>{if(e.target.id==="aiFile"&&e.target.files&&e.target.files.length)addFiles([...e.target.files])});
document.addEventListener("submit",e=>{if(!e.target.closest(".aiin"))return;e.preventDefault();const ta=e.target.querySelector("textarea");const v=ta.value;ta.value="";ta.style.height="";ask(v)});
document.addEventListener("input",e=>{if(e.target.matches(".aiin textarea")){e.target.style.height="auto";e.target.style.height=Math.min(140,e.target.scrollHeight)+"px"}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("aiSheet"))closeAI();if(e.key==="Enter"&&!e.shiftKey&&e.target.matches(".aiin textarea")&&window.innerWidth>700){e.preventDefault();e.target.form.requestSubmit()}});

// Dashboard karta
async function fillDash(el){el.classList.add("ok");if(A.ready!=="ok")await load();
  if(A.ready==="setup"){el.innerHTML=`<div class="h"><div class="aiorb"></div><b>ERNTE AI</b></div><div class="txt"><p>AI kontrola obchodov, flotily a trhov ešte nie je zapnutá.</p></div><div class="row"><button type="button" class="p" onclick="location.href='ai.html'">Zapnúť AI Podporu</button></div>`;return}
  if(A.ready!=="ok"){el.remove();return}
  const R=A.msgs.filter(x=>x.kind==="report"&&x.role==="assistant"&&x.status==="ok").pop();
  const F=A.msgs.filter(x=>x.kind==="fix").slice(-3).reverse();const W=A.tasks.filter(t=>t.status==="odoslana"||t.status==="nova").length;const ER=A.tasks.filter(t=>t.status==="chyba").length;const ND=(A.docs||[]).filter(d=>d.status==="novy").length;
  el.innerHTML=`<div class="h"><div class="aiorb"></div><b>AI prehľad</b><small>${R?tm(R.created_at):"zatiaľ žiadny"}</small></div>
   <div class="txt">${R?md(R.content):"<p>Prvý prehľad (trhy, obchody, flotila, čo robiť) si vytvor tlačidlom nižšie – potom príde sám každé ráno.</p>"}</div>
   ${F.length||W||ER||ND?`<div class="fx">${ND?`<div style="background:rgba(250,204,21,.12);border-color:rgba(250,204,21,.5)" data-ai="opendocs">📁 <span>${ND} ${ND===1?"neodoslaný dokument":ND<5?"neodoslané dokumenty":"neodoslaných dokumentov"} (upozornenia vodičom) – ťukni</span></div>`:""}${ER?`<div style="background:rgba(239,68,68,.14);border-color:rgba(255,107,129,.5)" data-ai="openfix">❌ <span>${ER} ${ER===1?"úprava sa nepodarila odoslať":"úpravy sa nepodarilo odoslať"} – ťukni pre detail</span></div>`:""}${W?`<div>⏳ <span>${W} ${W===1?"úprava sa práve robí":"úpravy sa práve robia"}</span></div>`:""}${F.map(f=>`<div>✅ <span>${esc(String(f.content||"").replace(/\*\*/g,"").split("\n")[0].slice(0,140))}</span></div>`).join("")}</div>`:""}
   <div class="row">${R?`<button type="button" data-ai="openrep">Celý prehľad</button>`:`<button type="button" class="p" data-ai="rep">✦ Urobiť prehľad</button>`}<button type="button" class="p" data-ai="open">✦ Opýtať sa AI</button></div>`}
function refreshDash(){document.querySelectorAll(".aidash.ok").forEach(e=>{e.classList.remove("ok");fillDash(e)})}
new MutationObserver(()=>{document.querySelectorAll(".aidash:not(.ok)").forEach(fillDash)}).observe(document.body,{childList:true,subtree:true});

let kpiAt=0,kpiFull=false;window.aiSaveKpi=function(){if(typeof ROLE==="undefined"||ROLE!=="owner"||typeof STATE==="undefined"||!STATE.aiKpi||FPER!=="m")return;const full=STATE.aiKpi.mzdy_eur!=null;if(!full&&kpiAt)return;if(full&&kpiFull&&Date.now()-kpiAt<5*60e3)return;kpiAt=Date.now();kpiFull=full;
  sb.from("ai_state").upsert({key:"kpi",value:STATE.aiKpi,updated_at:new Date().toISOString()}).then(()=>{},()=>{})};
// Diagnostika dát (Nastavenia flotily)
const DL={udalosti_spolu:"Udalosti flotily spolu",udalosti_posledna:"Posledná udalosť",udalosti_podla_typu_30_dni:"Udalosti za 30 dní",dvor_nastaveny:"Dvor Medovská nastavený",miesta:"Miesta",miesta_s_notifikaciou:"Miesta s notifikáciou do mobilu",miesta_s_problemom:"Miesta s upozornením (problém)",miesta_problemy_podla_dovodu:"Upozornenia miest podľa dôvodu",ntfy_tema_nastavena:"Upozornenia ntfy",funkcie:"Zapnuté kontroly",cron_ulohy:"Automatické úlohy",cron_posledne_behy:"Behy za 15 min",cron_chyby_24h:"Chyby úloh za 24 h",commander_posledne:"Commander – posledné načítanie",poloha_zapis:"Zápis polôh (sync)",commander_backfill:"Nočné načítanie histórie (backfill)",aut_spolu:"Áut v Commanderi",auta_s_polohou_do_30_min:"Autá s čerstvou polohou (30 min)",najnovsia_poloha:"Najnovšia poloha",najstarsia_poloha:"Najstaršia poloha",auta_na_mieste_teraz:"Autá teraz na mieste (dvor, čerpačka…)",kontroly_stav:"Kontroly – stav a chyby",auta_bez_jazd_tento_mesiac:"Autá bez jázd tento mesiac",auta_malo_dat_pod_100km:"Autá s málo dátami (< 100 km)",jazdy_mesiac:"Jazdy tento mesiac",jazdy_s_tankovanim_mesiac:"Jazdy s tankovaním",tankovanie_bez_ceny_mesiac:"Tankovania bez ceny",farmari:"Farmári",obchodov_spolu:"Obchodov spolu",poziadaviek_spolu:"Požiadaviek spolu",poziadaviek_novych:"Nových požiadaviek",ai_ulohy:"AI úpravy",auto_zmeny_db:"Automatické zmeny databázy",github_token_ulozeny:"GitHub token uložený"};
const FN={yard_check:"dvor",place_check:"miesta",stop_check:"odchod po státí",fuel_check:"ochrana nafty",osm_sync:"čerpačky OSM",ride_events:"udalosti z jázd",cmd_sync_pos:"zápis polôh",cmd_sync_rides:"zápis jázd",cmd_sync_vehicles:"zoznam áut"};
function dv(k,v){if(v&&typeof v==="object"&&v.chyba)return `<span style="color:#ffc2cb">chyba: ${esc(v.chyba)}</span>`;
  if(v===true)return `<b style="color:#b6ff3b">áno</b>`;if(v===false)return `<b style="color:#ff8a9a">nie</b>`;if(v==null||v==="")return `<span style="color:#fde68a">nezadané</span>`;
  if(k==="funkcie")return Object.entries(v).map(([a,b])=>`${FN[a]||a}: ${b?"✅":"❌"}`).join(" · ");
  if(k==="cron_ulohy")return v.length?v.map(j=>`${esc(j.uloha)} ${j.zapnuta?"✅":"⏸"}`).join(" · "):`<span style="color:#ff8a9a">žiadne</span>`;
  if(k==="cron_posledne_behy")return v.length?v.slice(0,6).map(j=>`${esc(j.uloha)} ${j.status==="succeeded"?"✅":"❌ "+esc(j.sprava||"")} ${esc(j.kedy)}`).join("<br>"):`<span style="color:#ff8a9a">žiadne behy</span>`;
  if(k==="cron_chyby_24h")return v.length?v.map(j=>`❌ ${esc(j.uloha)}: ${j.chyb}× – ${esc(j.posledna||"")}`).join("<br>"):`<b style="color:#b6ff3b">žiadne</b>`;
  if(k==="commander_posledne")return v.length?v.map(j=>`${esc(j.kind)}: ${esc(j.posledne)}${j.kod&&j.kod!==200?" (kód "+j.kod+")":""}`).join(" · "):`<span style="color:#ff8a9a">nič</span>`;
  if(k==="auto_zmeny_db")return v.length?v.map(j=>`${j.stav==="ok"?"✅":j.stav==="stahuje"?"⏳":"❌"} ${esc(j.subor.replace(/\.sql\.asc$/,""))} · ${esc(j.kedy||"")}${j.chyba?` <span style="color:#ff8a9a">${esc(j.chyba)}</span>`:""}`).join("<br>"):"zatiaľ žiadne";
  if(k==="kontroly_stav")return v.length?v.map(j=>`${FN[j.kontrola]||esc(j.kontrola)}: ${j.chyba?`<span style="color:#ff8a9a">❌ ${esc(j.chyba)} (${esc(j.chyba_kedy||"")})</span>`:`✅ ${esc(j.posledny_ok||"")} · udalostí ${j.udalosti}`}`).join("<br>"):`<span style="color:#fde68a">ešte nebežali – skús o 3 min</span>`;
  if(k==="commander_backfill")return v.length?v.map(j=>`${/OK/.test(j.stav)?"✅":/čaká/.test(j.stav)?"⏳":/starý/.test(j.stav)?"•":"❌"} ${esc(j.den)} · ${esc(j.stav)}${j.pokusov>1?" · pokus "+j.pokusov:""}`).join("<br>"):"zatiaľ nič";
  if(k==="poloha_zapis")return [["zaver",""],["posledne_nacitanie","posledné"],["posledny_zapis_do_aut","zápis do áut"],["najnovsia_gps","najnovšia GPS"],["chyba_zapisu","chyba"]].filter(([a])=>v[a]).map(([a,l])=>a==="zaver"?`<b>${esc(v[a])}</b>`:a==="chyba_zapisu"?`<span style="color:#ff8a9a">${l}: ${esc(v[a])}</span>`:`${l}: ${esc(v[a])}`).join("<br>");
  if(k==="miesta_s_problemom")return v?`<b style="color:#fde68a">${v}</b>`:`<b style="color:#b6ff3b">žiadne</b>`;
  if(k==="auta_malo_dat_pod_100km")return v.length?v.map(j=>`${esc(j.auto)} (${j.km??0} km, ${j.l??0} l)`).join(", "):"žiadne";
  if(Array.isArray(v))return v.length?v.map(x=>esc(typeof x==="object"?JSON.stringify(x):x)).join(", "):"žiadne";
  if(typeof v==="object"){const e=Object.entries(v);return e.length?e.map(([a,b])=>`${esc(a)}: ${esc(b)}`).join(" · "):`<span style="color:#fde68a">žiadne</span>`}
  return esc(v)}
async function fillDiag(el,run){el.classList.add("ok");
  if(!run){el.innerHTML=`<div class="aicard" style="margin:12px 0"><h3>🩺 Diagnostika dát</h3><div class="s">Skontroluje, či bežia automatické úlohy, či sa zapisujú udalosti a alarmy, ktoré autá nemajú dáta, a koľko je farmárov a obchodov.</div><button type="button" class="aibig" data-aidiag="1">Spustiť diagnostiku</button></div>`;return}
  el.innerHTML=`<div class="aicard" style="margin:12px 0"><h3>🩺 Diagnostika dát</h3><span class="aitype"><i></i><i></i><i></i>&nbsp;kontrolujem…</span></div>`;
  const r=await sb.rpc("ai_diag");
  if(r.error){el.innerHTML=`<div class="aicard" style="margin:12px 0"><h3>🩺 Diagnostika dát</h3><div class="s">${/ai_diag|function/i.test(r.error.message)?'Najprv spusti aktualizáciu SQL na stránke <a href="ai.html">ai.html</a> (polia nechaj prázdne).':esc(r.error.message)}</div></div>`;return}
  const d=r.data||{};el.innerHTML=`<div class="aicard" style="margin:12px 0"><h3>🩺 Diagnostika dát · ${new Date().toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}</h3>${Object.keys(DL).filter(k=>k in d).map(k=>`<div style="display:grid;grid-template-columns:minmax(0,42%) 1fr;gap:8px;font-size:.8rem;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)"><span style="color:rgba(255,255,255,.6)">${DL[k]}</span><span>${dv(k,d[k])}</span></div>`).join("")}<button type="button" class="aibig" data-aidiag="1">Znova</button></div>`}
document.addEventListener("click",e=>{const b=e.target.closest("[data-aidiag]");if(b){const el=b.closest(".aidiag");if(el)fillDiag(el,true)}});
new MutationObserver(()=>{document.querySelectorAll(".aidiag:not(.ok)").forEach(el=>fillDiag(el,false))}).observe(document.body,{childList:true,subtree:true});

window.aiInit=function(){const b=$("aiBtn");if(!b)return;b.hidden=ROLE!=="owner";if(ROLE==="owner")load()};
try{if(typeof ROLE!=="undefined"&&ROLE)window.aiInit()}catch(e){}
})();

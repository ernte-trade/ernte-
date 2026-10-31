async()=>{const out={ov:[],clip:[],wide:[]};const W=innerWidth,H=innerHeight;
const isFixed=e=>{for(let x=e;x&&x!==document.body;x=x.parentElement){const p=getComputedStyle(x).position;if(p==="fixed"||p==="sticky")return true}return false};
const app=document.getElementById("app");if(!app)return out;
const total=document.documentElement.scrollHeight;
for(let y=0;y<total;y+=Math.floor(H*0.7)){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));
  const tw=document.createTreeWalker(app,NodeFilter.SHOW_TEXT);let n;
  while(n=tw.nextNode()){const t=n.textContent.trim();if(!t)continue;const e=n.parentElement;if(!e||isFixed(e))continue;const r=document.createRange();r.selectNodeContents(n);
    for(const b of r.getClientRects()){if(b.width<4||b.height<4)continue;const cx=b.left+b.width/2,cy=b.top+b.height/2;if(cy<70||cy>H-110||cx<0||cx>W)continue;
      const h=document.elementFromPoint(cx,cy);if(!h||h===e||e.contains(h)||h.contains(e))continue;if(isFixed(h))continue;
      const cs=getComputedStyle(e);if(cs.visibility==="hidden"||+cs.opacity<0.1)continue;
      out.ov.push(t.slice(0,28)+" ⟵ "+(h.className||h.tagName).toString().slice(0,30)+":"+(h.textContent||"").trim().slice(0,20))}}}
scrollTo(0,0);
app.querySelectorAll("button,h1,h2,h3,b,.t,label,a").forEach(e=>{if(isFixed(e)||!e.offsetParent)return;const cs=getComputedStyle(e);if(cs.textOverflow==="ellipsis")return;
  if(e.scrollWidth>e.clientWidth+2&&e.clientWidth>0&&(cs.overflowX!=="visible"))out.clip.push((e.className||e.tagName)+": "+e.textContent.trim().slice(0,40))});
if(document.documentElement.scrollWidth>W+1)out.wide.push("page "+document.documentElement.scrollWidth);
out.ov=[...new Set(out.ov)].slice(0,10);out.clip=[...new Set(out.clip)].slice(0,10);return out}

// 🧪 Automatický test – vizuálne porovnanie snímok novej verzie (main) so schválenou verziou (farmar/STABLE).
// node compare.mjs <dir nové> <dir schválené> → JSON [{shot, pct}] na stdout (prah 2 % rieši workflow)
import fs from "node:fs"; import path from "node:path";
import { PNG } from "pngjs"; import pixelmatch from "pixelmatch";
const [A, B] = process.argv.slice(2); const out = [];
for (const f of fs.existsSync(A) ? fs.readdirSync(A).filter(x => x.endsWith(".png")) : []) {
  const fb = path.join(B, f); if (!fs.existsSync(fb)) continue;
  try {
    const a = PNG.sync.read(fs.readFileSync(path.join(A, f))), b = PNG.sync.read(fs.readFileSync(fb));
    if (a.width !== b.width || a.height !== b.height) { out.push({ shot: f, pct: 100 }); continue; }
    const n = pixelmatch(a.data, b.data, null, a.width, a.height, { threshold: 0.15 });
    out.push({ shot: f, pct: Math.round(1000 * n / (a.width * a.height)) / 10 });
  } catch (e) { out.push({ shot: f, err: String(e.message || e).slice(0, 80) }); }
}
console.log(JSON.stringify(out));

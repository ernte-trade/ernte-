// Pošle Web Push upozornenie podľa jednorazovej úlohy z databázy. Do logu nevypisuje obsah ani kľúče.
import fs from "node:fs";
import webpush from "web-push";
const cfg = fs.readFileSync("../../farmar/config.js", "utf8");
const URL_ = cfg.match(/SUPABASE_URL:\s*"([^"]+)"/)[1], KEY = cfg.match(/SUPABASE_KEY:\s*"([^"]+)"/)[1];
const id = String(process.env.JOB_ID || "");
if (!/^[0-9a-f-]{36}$/i.test(id)) { console.log("bez ID"); process.exit(0); }
const rpc = async (fn, body) => {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text(); if (!r.ok) throw new Error(fn + " " + r.status); return t ? JSON.parse(t) : null;
};
const job = await rpc("push_job_take", { p_id: id });
if (!job) { console.log("úloha už vybavená alebo neplatná"); process.exit(0); }
const v = job.vapid, P = job.payload;
webpush.setVapidDetails(v.subject || "mailto:ernte@ernte.sk", v.pub, v.priv);
const data = JSON.stringify({ title: P.title, body: P.body, url: P.url, tag: P.tag, prio: P.prio });
let sent = 0; const gone = []; let err = null;
for (const s of job.subs || []) {
  try { await webpush.sendNotification(s, data, { TTL: 3600, urgency: P.prio >= 4 ? "high" : "normal" }); sent++; }
  catch (e) { if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.endpoint); else err = String(e.statusCode || "") + " " + String(e.body || e.message || "").slice(0, 200); }
}
await rpc("push_job_done", { p_id: id, p_sent: sent, p_gone: gone.length ? gone : null, p_err: err });
console.log(`odoslané ${sent}, neplatné ${gone.length}${err ? ", chyba" : ""}`);

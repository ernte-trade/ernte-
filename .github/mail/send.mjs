// Pošle e-mail podľa jednorazovej úlohy z databázy (mail_job_take). Do logu nevypisuje adresy, obsah ani heslá.
import fs from "node:fs";
import nodemailer from "nodemailer";
const cfg = fs.readFileSync("../../farmar/config.js", "utf8");
const URL_ = cfg.match(/SUPABASE_URL:\s*"([^"]+)"/)[1], KEY = cfg.match(/SUPABASE_KEY:\s*"([^"]+)"/)[1];
const id = (String(process.env.JOB_ID || "").match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i) || [""])[0];
if (!id) { console.log("bez ID"); process.exit(0); }
const rpc = async (fn, body) => {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const t = await r.text(); if (!r.ok) throw new Error(fn + " " + r.status); return t ? JSON.parse(t) : null;
};
let job = null;
for (let i = 0; i < 4; i++) { try { job = await rpc("mail_job_take", { p_id: id }); break; } catch (e) { console.log("databáza nedostupná (pokus " + (i + 1) + ")"); await new Promise(r => setTimeout(r, 4000)); } }
if (!job) { console.log("úloha už vybavená alebo neplatná"); process.exit(0); }
const s = job.smtp || {};
try {
  const port = +s.port || 465;
  const tr = nodemailer.createTransport({ host: s.host, port, secure: port === 465, auth: { user: s.user, pass: s.pass } });
  const att = job.att ? [{ filename: job.att_name || "Dokument.pdf", content: Buffer.from(String(job.att).replace(/^data:[^,]+,/, ""), "base64"), contentType: "application/pdf" }] : [];
  await tr.sendMail({ from: { name: s.name || "ERNTE spol. s r.o.", address: s.from || s.user }, replyTo: s.from || s.user, to: job.to, subject: job.subject || "ERNTE", text: job.body || "", attachments: att });
  await rpc("mail_job_done", { p_id: id, p_ok: true, p_err: null });
  console.log("odoslané");
} catch (e) {
  const msg = String(e && (e.response || e.message) || e).replace(/[\w.+-]+@[\w.-]+/g, "…").slice(0, 280);
  await rpc("mail_job_done", { p_id: id, p_ok: false, p_err: msg }).catch(() => {});
  console.log("chyba odoslania");
}

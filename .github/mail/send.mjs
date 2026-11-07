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
const sleep = ms => new Promise(r => setTimeout(r, ms));
let job = null;
if (process.env.MODE === "comment") {
  // ID je vo verejnom komentári → heslo dostane iba tento beh: zverejní jednorazový kód ako github-actions[bot], databáza to overí na GitHube
  const gh = async (method, path, body) => { const r = await fetch("https://api.github.com" + path, { method, headers: { Authorization: "Bearer " + process.env.GH_TOKEN, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "ernte-mail" }, body: body ? JSON.stringify(body) : undefined }); return r.status === 204 ? null : r.json(); };
  let nonce = null;
  for (let i = 0; i < 4 && !nonce; i++) { try { nonce = await rpc("mail_job_claim", { p_id: id }); if (!nonce) break; } catch (e) { console.log("databáza nedostupná (pokus " + (i + 1) + ")"); await sleep(4000); } }
  if (!nonce) { console.log("úloha už vybavená alebo neplatná"); process.exit(0); }
  const c = await gh("POST", `/repos/${process.env.REPO}/issues/51/comments`, { body: "ernte-mail-ok " + nonce });
  try {
    for (let i = 0; i < 30 && c && c.id; i++) {
      await sleep(2000);
      let v = null; try { v = await rpc("mail_job_verify", { p_id: id, p_nonce: nonce, p_cid: c.id }); } catch (e) { continue; }
      if (v && v.ok) { job = v; break; }
      if (!v) break;
      if (v.err) console.log("overenie: " + v.err);
    }
  } finally { if (c && c.id) await gh("DELETE", `/repos/${process.env.REPO}/issues/comments/${c.id}`).catch(() => {}); }
  if (!job) { console.log("overenie nevyšlo"); process.exit(0); }
} else {
  for (let i = 0; i < 4; i++) { try { job = await rpc("mail_job_take", { p_id: id }); break; } catch (e) { console.log("databáza nedostupná (pokus " + (i + 1) + ")"); await sleep(4000); } }
}
if (!job) { console.log("úloha už vybavená alebo neplatná"); process.exit(0); }
const s = job.smtp || {};
// Microsoft Graph (OAuth 2.0 client credentials, Mail.Send obmedzené na odosielaciu schránku) – Microsoft 365 má SMTP AUTH vypnuté
async function graphSend() {
  const tk = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(s.tenant)}/oauth2/v2.0/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: s.client_id, client_secret: s.secret, scope: "https://graph.microsoft.com/.default" }) });
  const tj = await tk.json().catch(() => ({}));
  if (!tk.ok || !tj.access_token) throw new Error("Graph token " + tk.status + ": " + (tj.error || "") + " " + String(tj.error_description || "").split("\r\n")[0]);
  const H = { Authorization: "Bearer " + tj.access_token, "Content-Type": "application/json" };
  const G = async (method, path, body) => { const r = await fetch("https://graph.microsoft.com/v1.0" + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
    const t = await r.text(); if (!r.ok) { let e = {}; try { e = JSON.parse(t).error || {} } catch (x) {} throw new Error("Graph " + r.status + " " + (e.code || "") + ": " + (e.message || t.slice(0, 160))); } return t ? JSON.parse(t) : null; };
  const me = "/users/" + encodeURIComponent(s.from);
  const rt = job.reply_to || s.from;
  const msg = { subject: job.subject || "ERNTE", body: { contentType: "Text", content: job.body || "" }, toRecipients: [{ emailAddress: { address: job.to } }],
    replyTo: rt ? [{ emailAddress: { address: rt } }] : [] };
  const b64 = job.att ? String(job.att).replace(/^data:[^,]+,/, "") : null, buf = b64 ? Buffer.from(b64, "base64") : null, name = job.att_name || "Dokument.pdf";
  if (!buf || buf.length < 3000000) {
    if (buf) msg.attachments = [{ "@odata.type": "#microsoft.graph.fileAttachment", name, contentType: "application/pdf", contentBytes: b64 }];
    await G("POST", me + "/sendMail", { message: msg, saveToSentItems: true });
    return;
  }
  // veľká príloha (≥ 3 MB): koncept → nahratie po častiach → odoslanie
  const d = await G("POST", me + "/messages", msg);
  const up = await G("POST", me + "/messages/" + d.id + "/attachments/createUploadSession", { AttachmentItem: { attachmentType: "file", name, size: buf.length, contentType: "application/pdf" } });
  const CH = 3 * 1024 * 1024;
  for (let o = 0; o < buf.length; o += CH) {
    const part = buf.subarray(o, Math.min(o + CH, buf.length));
    const r = await fetch(up.uploadUrl, { method: "PUT", headers: { "Content-Length": String(part.length), "Content-Range": `bytes ${o}-${o + part.length - 1}/${buf.length}` }, body: part });
    if (!r.ok) throw new Error("Graph príloha " + r.status);
  }
  await G("POST", me + "/messages/" + d.id + "/send");
}
try {
  if (s.kind === "graph") await graphSend();
  else {
    const port = +s.port || 465;
    const tr = nodemailer.createTransport({ host: s.host, port, secure: port === 465, auth: { user: s.user, pass: s.pass } });
    const att = job.att ? [{ filename: job.att_name || "Dokument.pdf", content: Buffer.from(String(job.att).replace(/^data:[^,]+,/, ""), "base64"), contentType: "application/pdf" }] : [];
    await tr.sendMail({ from: { name: job.from_name || s.name || "ERNTE spol. s r.o.", address: s.from || s.user }, replyTo: job.reply_to || s.from || s.user, to: job.to, subject: job.subject || "ERNTE", text: job.body || "", attachments: att });
  }
  await rpc("mail_job_done", { p_id: id, p_ok: true, p_err: null });
  console.log("odoslané");
} catch (e) {
  const msg = String(e && (e.response || e.message) || e).replace(/[\w.+-]+@[\w.-]+/g, "…").slice(0, 280);
  await rpc("mail_job_done", { p_id: id, p_ok: false, p_err: msg }).catch(() => {});
  console.log("chyba odoslania");
}

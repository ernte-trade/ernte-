// Hľadá skutočné fotky s voľnou licenciou na Wikimedia Commons (CC0 / public domain / CC BY / CC BY-SA)
// a ukladá náhľady + autora a licenciu (pre povinné uvedenie zdroja) do vetvy img-candidates.
import fs from "node:fs";
const Q = JSON.parse(process.env.QUERIES || "{}");
const OK = /^(cc0|public domain|no restrictions|pd|cc by(-sa)? ?\d(\.\d)?|cc-by(-sa)?-\d(\.\d)?)/i;
const strip = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
fs.mkdirSync("out", { recursive: true });
const meta = {}; const dbg = [];
// videá (role začína "vid"): Commons filetype:video → odvodená verzia VP9 480p/720p (WebM), max 14 MB
for (const [role, list] of Object.entries(Q).filter(([r]) => r.startsWith("vid"))) {
  fs.mkdirSync("out/" + role, { recursive: true }); meta[role] = []; let n = 0; const seen = new Set();
  for (const q of list) {
    const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=30&gsrsearch=" + encodeURIComponent("filetype:video " + q) + "&prop=videoinfo&viprop=url|size|extmetadata|derivatives|mediatype";
    let j; try { j = await (await fetch(u, { headers: { "User-Agent": "ERNTE-app-image-finder/1.0 (report.valko@gmail.com)" } })).json(); } catch (e) { continue; }
    for (const p of Object.values((j.query || {}).pages || {})) {
      const vi = (p.videoinfo || [])[0]; if (!vi || seen.has(p.title)) continue; const em = vi.extmetadata || {}; const lic = strip(em.LicenseShortName && em.LicenseShortName.value);
      if (!OK.test(lic) || /nc|nd/i.test(lic)) continue;
      const d = (vi.derivatives || []).filter(x => /webm/.test(x.type || "") && /vp9/.test(x.type || x.transcodekey || "") && x.height >= 360 && x.height <= 720).sort((a, b) => b.height - a.height)[0];
      if (!d) continue; seen.add(p.title); n++; if (n > 6) break;
      try { const r = await fetch(d.src, { headers: { "User-Agent": "ERNTE-app-image-finder/1.0" } }); const b = Buffer.from(await r.arrayBuffer()); if (b.length > 14e6 || b.length < 2e4) { n--; continue } fs.writeFileSync(`out/${role}/${n}.webm`, b); } catch (e) { n--; continue; }
      meta[role].push({ n, q, title: p.title, page: vi.descriptionurl, w: d.width, h: d.height, dur: vi.duration, license: lic, author: strip(em.Artist && em.Artist.value).slice(0, 120), desc: strip(em.ImageDescription && em.ImageDescription.value).slice(0, 200) });
    }
    if (n > 6) break;
  }
  console.log(role, n);
}
for (const [role, list] of Object.entries(Q).filter(([r]) => !r.startsWith("vid"))) {
  fs.mkdirSync("out/" + role, { recursive: true }); meta[role] = []; const seen = new Set(); let n = 0;
  for (const q of list) {
    const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch=" + encodeURIComponent("filetype:bitmap " + q) + "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1400";
    let j; try { j = await (await fetch(u, { headers: { "User-Agent": "ERNTE-app-image-finder/1.0 (report.valko@gmail.com)" } })).json(); } catch (e) { console.log("chyba", q, e.message); continue; }
    const pages = Object.values((j.query || {}).pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    dbg.push({ q, keys: Object.keys(j), err: j.error && j.error.info, n: pages.length, lic: pages.slice(0, 6).map(p => { const ii = (p.imageinfo || [])[0] || {}; return [strip(((ii.extmetadata || {}).LicenseShortName || {}).value), ii.width, ii.height, (ii.url || "").slice(-12)] }) });
    for (const p of pages) {
      const ii = (p.imageinfo || [])[0]; if (!ii || seen.has(p.title)) continue;
      const em = ii.extmetadata || {}; const lic = strip(em.LicenseShortName && em.LicenseShortName.value);
      if (!OK.test(lic) || /nc|nd/i.test(lic)) continue;
      if ((ii.width || 0) < 1500 || (ii.height || 0) < 900) continue;
      if (!/\.(jpe?g|png|webp)$/i.test(new URL(ii.url).pathname)) continue;
      seen.add(p.title); n++; if (n > 18) break;
      try { const b = Buffer.from(await (await fetch(ii.thumburl, { headers: { "User-Agent": "ERNTE-app-image-finder/1.0" } })).arrayBuffer()); fs.writeFileSync(`out/${role}/${n}.jpg`, b); } catch (e) { n--; continue; }
      meta[role].push({ n, q, title: p.title, page: ii.descriptionurl, w: ii.width, h: ii.height, license: lic, licenseUrl: strip(em.LicenseUrl && em.LicenseUrl.value), author: strip(em.Artist && em.Artist.value).slice(0, 120), credit: strip(em.Credit && em.Credit.value).slice(0, 120), desc: strip(em.ImageDescription && em.ImageDescription.value).slice(0, 200) });
    }
    if (n > 18) break;
  }
  console.log(role, n);
}
fs.writeFileSync("out/meta.json", JSON.stringify(meta, null, 1)); fs.writeFileSync("out/debug.json", JSON.stringify(dbg, null, 1));

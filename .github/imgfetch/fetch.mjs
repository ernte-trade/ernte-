// Hľadá skutočné fotky s voľnou licenciou na Wikimedia Commons (CC0 / public domain / CC BY / CC BY-SA)
// a ukladá náhľady + autora a licenciu (pre povinné uvedenie zdroja) do vetvy img-candidates.
import fs from "node:fs";
const Q = JSON.parse(process.env.QUERIES || "{}");
const OK = /^(cc0|public domain|pd|cc by(-sa)? ?\d(\.\d)?|cc-by(-sa)?-\d(\.\d)?)/i;
const strip = s => String(s || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
fs.mkdirSync("out", { recursive: true });
const meta = {};
for (const [role, list] of Object.entries(Q)) {
  fs.mkdirSync("out/" + role, { recursive: true }); meta[role] = []; const seen = new Set(); let n = 0;
  for (const q of list) {
    const u = "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=40&gsrsearch=" + encodeURIComponent("filetype:bitmap " + q) + "&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1400";
    let j; try { j = await (await fetch(u, { headers: { "User-Agent": "ERNTE-app-image-finder/1.0 (report.valko@gmail.com)" } })).json(); } catch (e) { console.log("chyba", q, e.message); continue; }
    const pages = Object.values((j.query || {}).pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    for (const p of pages) {
      const ii = (p.imageinfo || [])[0]; if (!ii || seen.has(p.title)) continue;
      const em = ii.extmetadata || {}; const lic = strip(em.LicenseShortName && em.LicenseShortName.value);
      if (!OK.test(lic) || /nc|nd/i.test(lic)) continue;
      if ((ii.width || 0) < 1500 || (ii.height || 0) < 900) continue;
      if (!/\.(jpe?g|png|webp)$/i.test(ii.url)) continue;
      seen.add(p.title); n++; if (n > 14) break;
      try { const b = Buffer.from(await (await fetch(ii.thumburl, { headers: { "User-Agent": "ERNTE-app-image-finder/1.0" } })).arrayBuffer()); fs.writeFileSync(`out/${role}/${n}.jpg`, b); } catch (e) { n--; continue; }
      meta[role].push({ n, q, title: p.title, page: ii.descriptionurl, w: ii.width, h: ii.height, license: lic, licenseUrl: strip(em.LicenseUrl && em.LicenseUrl.value), author: strip(em.Artist && em.Artist.value).slice(0, 120), credit: strip(em.Credit && em.Credit.value).slice(0, 120), desc: strip(em.ImageDescription && em.ImageDescription.value).slice(0, 200) });
    }
    if (n > 14) break;
  }
  console.log(role, n);
}
fs.writeFileSync("out/meta.json", JSON.stringify(meta, null, 1));

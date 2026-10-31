// =====================================================================
//  Reads the goals out of an uploaded plan (Word .docx, same template as the site's plan):
//    "الهدف العام للخطة: …"  ->  general goal
//    "الهدف طويل المدى (n): …" ->  long-term goal
//    goals table: first column "الأهداف قصيرة المدى" (one row per STG), last column "التقييم"
//  Also reads start / end dates and the file number from the header table (to catch a wrong file).
//  Everything happens in the browser; the therapist reviews the result before it is saved.
// =====================================================================
(function () {
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

  // --- minimal .zip reader (central directory + deflate via DecompressionStream)
  async function unzipEntry(buf, wanted) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("not a zip");
    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    for (let k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      if (name === wanted) {
        const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
        const data = u8.subarray(start, start + csize);
        if (method === 0) return dec.decode(data);
        if (method !== 8 || typeof DecompressionStream === "undefined") throw new Error("unsupported");
        const out = await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
        return dec.decode(out);
      }
      p += 46 + nlen + elen + clen;
    }
    throw new Error("missing " + wanted);
  }

  const norm = (s) => String(s || "").replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/\s+/g, " ").trim();
  const pText = (p) => [...p.getElementsByTagNameNS(W, "t")].map((t) => t.textContent).join("");
  const textOf = (el) => (el.localName === "p" ? pText(el) : [...el.getElementsByTagNameNS(W, "p")].map(pText).join(" ")).replace(/\s+/g, " ").trim();
  const toIso = (s) => { const m = String(s || "").match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
  const afterColon = (s) => String(s).replace(/^[^:：]*[:：]\s*/, "").replace(/\*+/g, "").trim();

  function evalOf(txt) {
    const t = norm(txt);
    if (!t) return {};
    const pct = (t.match(/(\d{1,3})\s*%/) || [])[1];
    if (/انجاز\s*\d|جزء|partial/i.test(t) || (pct && !/^100/.test(pct))) return { eval: "partial", pct: pct ? Number(pct) : "" };
    if (/انجز|تحقق|achieved/i.test(t)) return { eval: "achieved" };
    if (/جار|in progress|training/i.test(t)) return { eval: "training" };
    if (/لم يتم البدء|not started/i.test(t)) return { eval: "not_started" };
    return {};
  }

  async function parse(file) {
    if (!/\.docx$/i.test(file.name)) return { ok: false, reason: "word-only" };
    let xml;
    try { xml = await unzipEntry(await file.arrayBuffer(), "word/document.xml"); }
    catch (e) { return { ok: false, reason: e.message === "unsupported" ? "browser" : "bad-file" }; }
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const body = doc.getElementsByTagNameNS(W, "body")[0];
    if (!body) return { ok: false, reason: "bad-file" };
    const blocks = [], info = {};
    let general = "", ltg = "", cur = null;
    const newBlock = () => { cur = { general_text: general, ltg: { ar: ltg }, stgs: [] }; blocks.push(cur); };
    for (const el of [...body.children]) {
      if (el.localName === "p") {
        const t = textOf(el), n = norm(t);
        if (/^(الهدف العام|general goal)/i.test(n)) { general = afterColon(t); ltg = ""; cur = null; }
        else if (/^(الهدف طويل المدى|long-term goal)/i.test(n)) { ltg = afterColon(t); cur = null; }
        continue;
      }
      if (el.localName !== "tbl") continue;
      const rows = [...el.children].filter((r) => r.localName === "tr").map((r) => [...r.children].filter((c) => c.localName === "tc").map(textOf));
      if (!rows.length) continue;
      const head = rows[0].map(norm);
      const gi = head.findIndex((h) => /اهداف قصيرة المدى|الهدف قصير المدى|short-term goal/i.test(h));
      if (gi >= 0) {
        const ei = head.findIndex((h) => /^التقييم$|^evaluation$/i.test(h));
        if (!cur || cur.stgs.length && (cur.general_text !== general || cur.ltg.ar !== ltg)) newBlock();
        rows.slice(1).forEach((r) => { const txt = (r[gi] || "").trim(); if (txt) cur.stgs.push({ ar: txt, ...(ei >= 0 ? evalOf(r[ei]) : {}) }); });
        cur = null;   // the next table (or the next goal heading) starts a new block
        continue;
      }
      // header table: label / value pairs
      rows.forEach((r) => r.forEach((c, i) => {
        const k = norm(c), v = r[i + 1] || "";
        if (/^(تاريخ بدء الخطة|plan start date)$/i.test(k)) info.start = toIso(v);
        else if (/^(تاريخ انتهاء الخطة|plan end date)$/i.test(k)) info.end = toIso(v);
        else if (/^(رقم الملف|file no\.?)$/i.test(k)) info.file_no = v.trim();
      }));
    }
    const kept = blocks.filter((b) => b.stgs.length);
    return { ok: true, blocks: kept, count: kept.reduce((s, b) => s + b.stgs.length, 0), info };
  }

  const REASON = { "word-only": "قراءة الأهداف تلقائياً تعمل مع ملفات Word (.docx) فقط. لملف PDF أو صورة، أضف الأهداف كتابةً في ملاحظة الجلسة.",
    browser: "المتصفح قديم ولا يدعم قراءة الملف. حدّث المتصفح أو استخدم Chrome.", "bad-file": "تعذّر قراءة الملف. تأكد أنه ملف Word سليم." };

  // Editable review list. blocks is changed in place.
  function review(box, blocks, esc) {
    const draw = () => {
      const n = blocks.reduce((s, b) => s + b.stgs.length, 0);
      box.innerHTML = !n ? `<div class="hint">لم يتم العثور على أهداف في جدول «الأهداف قصيرة المدى».</div>` :
        `<div class="hint" style="margin-bottom:6px">راجع الأهداف المستخرجة (${n}) وصحّح أي خطأ قبل الحفظ:</div>` + blocks.map((b, bi) => `<div class="pi-block">
          ${b.general_text ? `<div class="hint"><strong>الهدف العام:</strong> ${esc(b.general_text)}</div>` : ""}${b.ltg && b.ltg.ar ? `<div class="hint"><strong>طويل المدى:</strong> ${esc(b.ltg.ar)}</div>` : ""}
          ${b.stgs.map((s, si) => `<div class="pi-row"><input class="input sm" data-pi="${bi}.${si}" value="${esc(s.ar)}">${s.eval === "achieved" ? '<span class="pill ok">أُنجز</span>' : s.eval === "partial" ? `<span class="pill info">${s.pct || ""}%</span>` : ""}<button type="button" class="btn sm danger" data-pidel="${bi}.${si}">✕</button></div>`).join("")}</div>`).join("");
    };
    box.oninput = (e) => { const k = e.target.dataset.pi; if (!k) return; const [bi, si] = k.split(".").map(Number); blocks[bi].stgs[si].ar = e.target.value; };
    box.onclick = (e) => { const b = e.target.closest("[data-pidel]"); if (!b) return; const [bi, si] = b.dataset.pidel.split(".").map(Number); blocks[bi].stgs.splice(si, 1); draw(); };
    draw();
  }
  const clean = (blocks) => blocks.map((b) => ({ ...b, stgs: b.stgs.filter((s) => String(s.ar || "").trim()) })).filter((b) => b.stgs.length);

  window.PlanImport = { parse, review, clean, REASON };
})();

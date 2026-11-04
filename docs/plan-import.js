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

  const REASON = { "word-only": "القراءة التلقائية تعمل مع ملفات Word (.docx) فقط. ملف PDF أو صورة يُحفظ كمرفق كما هو.",
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

  // =====================================================================
  //  Any report made with the site's templates (Word): the document becomes the site's markup text
  //  (headings, bullets, data tables, tables), and every section whose heading matches a text field of
  //  the report form is copied into that field ("يتفرغ بالبنود").
  // =====================================================================
  const attr = (el, name) => (el ? el.getAttributeNS(W, name) || el.getAttribute("w:" + name) : null);
  const first = (el, tag) => (el ? el.getElementsByTagNameNS(W, tag)[0] : null);
  function runsOf(p) {
    return [...p.getElementsByTagNameNS(W, "r")].map((r) => {
      const rp = first(r, "rPr"), t = [...r.getElementsByTagNameNS(W, "t")].map((x) => x.textContent).join("") + (first(r, "tab") ? " " : "");
      const b = first(rp, "b"), u = first(rp, "u"), sz = first(rp, "sz");
      return { t, b: !!b && attr(b, "val") !== "false" && attr(b, "val") !== "0", u: !!u && attr(u, "val") !== "none", sz: sz ? Number(attr(sz, "val")) : 0 };
    }).filter((r) => r.t);
  }
  function paraLine(p, isFirstHeading) {
    const runs = runsOf(p);
    const text = runs.map((r) => r.t).join("").replace(/\s+/g, " ").trim();
    if (!text) return "";
    const ppr = first(p, "pPr"), jc = attr(first(ppr, "jc"), "val"), center = jc === "center";
    const allB = runs.every((r) => r.b || !r.t.trim()), anyU = runs.some((r) => r.u), sz = Math.max(0, ...runs.map((r) => r.sz));
    // inline bold -> **…**
    let inl = "", open = false;
    runs.forEach((r) => { if (r.b && !open && r.t.trim()) { inl += "**"; open = true; } else if (!r.b && open) { inl = inl.replace(/\s+$/, "") + "** "; open = false; } inl += r.t; });
    if (open) inl = inl.replace(/\s+$/, "") + "**";
    inl = inl.replace(/\s+/g, " ").trim();
    if (/^[•·▪◦]/.test(text)) return "- " + inl.replace(/^[•·▪◦]\s*/, "");
    if (first(ppr, "numPr")) return "- " + inl;
    if (allB && center && (sz >= 28 || isFirstHeading)) return "# " + text;
    if (allB && center) return "^^ " + text;
    if (allB && anyU) return "### " + text;
    if (allB && (sz >= 26 || /[:：]$/.test(text) || text.length < 70)) return "## " + text;
    return inl;
  }
  const shaded = (tc) => { const f = attr(first(first(tc, "tcPr"), "shd"), "fill"); return !!f && !/^(auto|FFFFFF)$/i.test(f); };
  const cellTxt = (c) => textOf(c).replace(/\|/g, "/");
  function tableLines(tbl) {
    const trs = [...tbl.children].filter((r) => r.localName === "tr");
    const rows = trs.map((r) => [...r.children].filter((c) => c.localName === "tc"));
    if (!rows.length) return [];
    const n = Math.max(...rows.map((r) => r.length));
    // label | value | label | value  (shaded labels) -> ::info4
    if (n === 4 && rows.every((r) => r.length === 4) && shaded(rows[0][0]) && shaded(rows[0][2]) && !shaded(rows[0][1]))
      return ["::info4", ...rows.flatMap((r) => [`${cellTxt(r[0])}: ${cellTxt(r[1])}`, `${cellTxt(r[2])}: ${cellTxt(r[3])}`]), ""];
    // 2 cells of "Label: value" -> ::info2 (shaded) / ::grid2
    if (n === 2 && rows.every((r) => r.every((c) => !cellTxt(c) || /[:：]/.test(cellTxt(c)))))
      return [shaded(rows[0][0]) ? "::info2" : "::grid2", ...rows.flatMap((r) => r.map(cellTxt).filter(Boolean)), ""];
    const txt = rows.map((r) => r.map(cellTxt));
    const sigCol = txt[0].findIndex((c) => /التوقيع|Signature/i.test(c));
    if (sigCol >= 0) txt.slice(1).forEach((r) => { if (/النطق|Speech/i.test(r[0] + " " + (r[1] || "")) && !(r[sigCol] || "").trim()) r[sigCol] = "[[SIG]]"; });
    return [...txt.map((r) => "| " + Array.from({ length: n }, (_, k) => r[k] || "").join(" | ") + " |"), ""];
  }
  function docToMarkup(body) {
    const out = []; let headed = false;
    for (const el of [...body.children]) {
      if (el.localName === "p") {
        const l = paraLine(el, !headed);
        if (/^# /.test(l)) headed = true;
        if (/^#{1,4} /.test(l) && out.length && out[out.length - 1] !== "") out.push("");
        out.push(l);
      } else if (el.localName === "tbl") { if (out.length && out[out.length - 1] !== "") out.push(""); out.push(...tableLines(el)); }
    }
    let txt = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (!/\[\[SIG\]\]/.test(txt)) txt += "\n[[SIG]]";
    return txt;
  }
  // heading / "**label:** value" -> section text
  function sectionsOf(markup) {
    const secs = []; let cur = null;
    markup.split("\n").forEach((line) => {
      const t = line.trim();
      const h = t.match(/^#{1,4}\s+(.*)$/);
      const lab = t.match(/^(?:-\s+)?\*\*([^*]{2,80}?)[:：]?\*\*\s*[:：]?\s*(.*)$/);
      if (h) { cur = { head: h[1], lines: [] }; secs.push(cur); }
      else if (lab) { secs.push({ head: lab[1], lines: lab[2] ? [lab[2]] : [] }); if (!lab[2]) cur = secs[secs.length - 1]; else cur = null; }
      else if (t && cur && !/^(::|\||\^\^|\[\[)/.test(t)) cur.lines.push(t.replace(/^-\s+/, ""));
    });
    return secs;
  }
  const core = (s) => norm(String(s || "").replace(/\(.*?\)/g, "").replace(/[—–-].*$/, "").replace(/[:：.]/g, "")).replace(/^(ال)/, "");
  function mapFields(markup, form, pc) {
    const fields = [];
    (form.sections || []).forEach((sec) => (sec.fields || []).forEach((f) => { if (["textarea", "list", "text"].includes(f.type) && f.label && f.label.ar) fields.push(f); }));
    const out = {}, mapped = [];
    sectionsOf(markup).forEach((s) => {
      if (!s.lines.length) return;
      const h = core(s.head);
      if (h.length < 3) return;
      let best = null, score = 0;
      fields.forEach((f) => {
        const l = core(f.label.ar);
        if (l.length < 3) return;
        const sc = h === l ? 100 : (h.includes(l) || l.includes(h)) ? Math.min(h.length, l.length) : 0;
        if (sc > score) { score = sc; best = f; }
      });
      if (!best || score < 4 || out[best.id]) return;
      out[best.id] = best.type === "list" ? s.lines.join("\n") : s.lines.join(" ");
      mapped.push({ id: best.id, label: best.label.ar, text: out[best.id] });
    });
    // multiple-choice questions: an option whose sentence appears in the document is selected
    if (pc && window.FC) {
      const doc = norm(markup.replace(/\*\*/g, ""));
      (form.sections || []).forEach((sec) => (sec.fields || []).forEach((f) => {
        if (!["single", "multi"].includes(f.type) || !f.options || out[f.id] != null) return;
        const hits = f.options.filter((o) => [o.ar, o.s && o.s.ar].some((x) => { const t = norm(window.FC.gx(x || "", pc)).replace(/[.،]$/, ""); return t.length >= 8 && doc.includes(t); }));
        if (!hits.length) return;
        if (f.type === "single") { if (hits.length !== 1) return; out[f.id] = hits[0].v; }
        else out[f.id] = hits.map((o) => o.v);
        mapped.push({ id: f.id, label: (f.label && f.label.ar) || f.id, text: hits.map((o) => window.FC.gx(o.ar, pc)).join(" / ") });
      }));
    }
    // skill tables (initial scanning): a skill listed under "observed / emerging / not shown / follow" headings
    if (pc && window.FC) {
      const lines = markup.split("\n"); let state = "";
      const stateOf = (h) => { const n = norm(h); return /بوضوح|بدت سليمة|clearly observed|appeared typical/i.test(n) ? "ok" : /بدات بالظهور|starting to appear/i.test(n) ? "emerging" : /لم تظهر|did not see/i.test(n) ? "not" : /نحتاج لمتابعتها|will follow/i.test(n) ? "bad" : ""; };
      (form.sections || []).forEach((sec) => (sec.fields || []).forEach((f) => {
        if (f.type !== "matrix" || !f.tone) return;
        const opts = (f.groups[0] || {}).options || [], has = (v) => opts.some((o) => o.v === v);
        let n = 0; state = "";
        lines.forEach((l) => {
          const t = l.trim();
          if (/^#{1,4} /.test(t)) { state = stateOf(t); return; }
          if (!state || !/^- /.test(t)) return;
          const item = t.slice(2), r = f.rows.find((row) => norm(item).startsWith(norm(window.FC.gx(row.ar, pc))));
          if (!r) return;
          let v = state === "ok" ? (has("ok") ? "ok" : "shown") : state === "bad" ? (has("bad") ? "bad" : "not") : state;
          if (!has(v)) return;
          out[f.id] = out[f.id] || {}; out[f.id][r.v] = { s: v };
          if (v === "bad") { const note = item.slice(window.FC.gx(r.ar, pc).length).replace(/^\s*[:：]\s*/, "").replace(/\.$/, ""); if (note) out[f.id][r.v].note = note; }
          n++;
        });
        if (n) mapped.push({ id: f.id, label: (sec.title && sec.title.ar) || f.id, text: `${n} مهارة` });
      }));
    }
    return { values: out, mapped };
  }
  function infoOf(markup) {
    const info = {};
    markup.split("\n").forEach((l) => {
      const m = l.match(/^([^:：|]{2,40})[:：]\s*(.+)$/); if (!m) return;
      const k = norm(m[1]);
      if (/^(تاريخ (اعداد )?التقرير|تاريخ الجلسة|تاريخ التقييم|report date|session date)$/i.test(k) && !info.date) info.date = toIso(m[2]) || (m[2].match(/\d{4}-\d{2}-\d{2}/) || [])[0] || "";
      if (/^(رقم الملف|file no\.?)$/i.test(k)) info.file_no = m[2].trim();
    });
    return info;
  }
  async function parseReport(file, form, pc) {
    if (!/\.docx$/i.test(file.name)) return { ok: false, reason: "word-only" };
    let xml;
    try { xml = await unzipEntry(await file.arrayBuffer(), "word/document.xml"); }
    catch (e) { return { ok: false, reason: e.message === "unsupported" ? "browser" : "bad-file" }; }
    const body = new DOMParser().parseFromString(xml, "application/xml").getElementsByTagNameNS(W, "body")[0];
    if (!body) return { ok: false, reason: "bad-file" };
    const markup = docToMarkup(body);
    const ar = (markup.match(/[؀-ۿ]/g) || []).length, en = (markup.match(/[A-Za-z]/g) || []).length;
    const m = form ? mapFields(markup, form, pc) : { values: {}, mapped: [] };
    return { ok: true, markup, lang: en > ar ? "en" : "ar", values: m.values, mapped: m.mapped, info: infoOf(markup) };
  }

  window.PlanImport = { parse, review, clean, REASON, parseReport, docToMarkup, mapFields };
})();

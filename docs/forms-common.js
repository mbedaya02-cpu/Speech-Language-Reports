// =====================================================================
//  Shared helpers for all forms (evaluation, initial, plan, progress…)
//
//  Text placeholders inside option / sentence strings:
//    {N}        child's first name
//    {FULL}     child's full name
//    {C}        "الطفل/الطفلة/الطالب/الطالبة" (ar) or first name (en)
//    {AGE}      chronological age in words
//    {a|b}      a for male, b for female  (e.g. {يستطيع|تستطيع}, {he|she})
//    {ت}        text added only for female (e.g. تعرّف{ت})
// =====================================================================
(function () {
  const L = (ar, en) => ({ ar, en });
  // Every option / suggestion pair is registered, so Arabic text that came from a suggestion
  // (or was pre-filled from one) can be put back into English for English documents.
  const PAIRS = [];
  const O = (v, ar, en, extra) => { const o = Object.assign({ v, ar, en }, extra || {}); if (ar && en) PAIRS.push(o); return o; };
  const S = (ar, en, extra) => { const o = Object.assign({ ar, en }, extra || {}); if (ar && en) PAIRS.push(o); return o; };

  function joinList(items, lang) {
    items = items.filter(Boolean);
    if (items.length <= 1) return items.join("");
    if (lang === "ar") return items.slice(0, -1).join("، ") + " و" + items[items.length - 1];
    if (items.length === 2) return items.join(" and ");
    return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
  }

  function ageParts(dobIso, atIso) {
    if (!dobIso) return null;
    const d = new Date(String(dobIso).slice(0, 10) + "T00:00:00Z");
    const a = new Date(String(atIso || new Date().toISOString()).slice(0, 10) + "T00:00:00Z");
    let months = (a.getUTCFullYear() - d.getUTCFullYear()) * 12 + (a.getUTCMonth() - d.getUTCMonth());
    if (a.getUTCDate() < d.getUTCDate()) months--;
    if (months < 0 || isNaN(months)) return null;
    return { y: Math.floor(months / 12), m: months % 12, total: months };
  }

  function ageString(dobIso, atIso, lang, totalMonths) {
    const p = totalMonths != null ? { y: Math.floor(totalMonths / 12), m: totalMonths % 12 } : ageParts(dobIso, atIso);
    if (!p) return "";
    const { y, m } = p;
    if (lang === "ar") {
      const yW = y === 0 ? "" : y === 1 ? "سنة" : y === 2 ? "سنتان" : y <= 10 ? `${y} سنوات` : `${y} سنة`;
      const mW = m === 0 ? "" : m === 1 ? "شهر" : m === 2 ? "شهران" : m <= 10 ? `${m} أشهر` : `${m} شهراً`;
      return [yW, mW].filter(Boolean).join(" و") || "أقل من شهر";
    }
    const yW = y ? `${y} year${y === 1 ? "" : "s"}` : "", mW = m ? `${m} month${m === 1 ? "" : "s"}` : "";
    return [yW, mW].filter(Boolean).join(" and ") || "less than a month";
  }

  // Common nationalities (stored in Arabic, translated for English documents).
  const NATIONALITIES = [
    ["الإماراتية", "Emirati"], ["السعودية", "Saudi"], ["العمانية", "Omani"], ["القطرية", "Qatari"], ["البحرينية", "Bahraini"], ["الكويتية", "Kuwaiti"],
    ["اليمنية", "Yemeni"], ["الأردنية", "Jordanian"], ["السورية", "Syrian"], ["اللبنانية", "Lebanese"], ["الفلسطينية", "Palestinian"], ["العراقية", "Iraqi"],
    ["المصرية", "Egyptian"], ["السودانية", "Sudanese"], ["الليبية", "Libyan"], ["التونسية", "Tunisian"], ["الجزائرية", "Algerian"], ["المغربية", "Moroccan"],
    ["الصومالية", "Somali"], ["الموريتانية", "Mauritanian"], ["الهندية", "Indian"], ["الباكستانية", "Pakistani"], ["البنغلاديشية", "Bangladeshi"],
    ["الفلبينية", "Filipino"], ["الإيرانية", "Iranian"], ["التركية", "Turkish"], ["البريطانية", "British"], ["الأمريكية", "American"], ["الكندية", "Canadian"],
    ["الإيطالية", "Italian"], ["الفرنسية", "French"], ["الألمانية", "German"], ["الأفغانية", "Afghan"], ["السريلانكية", "Sri Lankan"], ["الإريترية", "Eritrean"], ["الإثيوبية", "Ethiopian"], ["الجزر القمرية", "Comorian"], ["الكاميرونية", "Cameroonian"],
  ];
  // stored value may be Arabic ("السورية", "سوري", "سوريا") or English ("Syrian"); returns it in the document's language
  const natStem = (x) => String(x || "").trim().replace(/^ال/, "").replace(/(ية|يه|ي|ة|ه|ا)$/, "").replace(/(ي|ا)$/, "");
  const nationality = (val, lang) => {
    val = String(val || "").trim(); if (!val) return "";
    const n = NATIONALITIES.find((x) => x[0] === val || x[1].toLowerCase() === val.toLowerCase() || (AR_NAT.test(val) && natStem(x[0]) === natStem(val)));
    return n ? (lang === "ar" ? n[0] : n[1]) : val;
  };
  const AR_NAT = /[\u0600-\u06FF]/;

  // Builds the substitution context for a patient.
  function personCtx(patient, lang, atIso) {
    const female = (patient && patient.gender) === "أنثى";
    const full = lang === "ar" ? (patient.full_name || "") : (patient.full_name_en || patient.full_name || "");
    const first = full.split(/\s+/)[0] || (lang === "ar" ? (female ? "الطفلة" : "الطفل") : "the child");
    const age = ageParts(patient.dob, atIso);
    const student = age && age.y >= 6;
    const C = lang === "ar" ? (student ? (female ? "الطالبة" : "الطالب") : (female ? "الطفلة" : "الطفل")) : first;
    return { female, first, full, C, age: ageString(patient.dob, atIso, lang), months: age ? age.total : null };
  }

  // Replace placeholders in a template string.
  function gx(str, pc) {
    if (str == null) return "";
    return String(str)
      .replace(/\{N\}/g, pc.first).replace(/\{FULL\}/g, pc.full).replace(/\{C\}/g, pc.C).replace(/\{AGE\}/g, pc.age)
      .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_, a, b) => (pc.female ? b : a))
      .replace(/\{([^{}|NCA][^{}|]*)\}/g, (_, x) => (pc.female ? x : ""));
  }

  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const lines = (s) => String(s || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const optOf = (opts, v) => (opts || []).find((o) => o.v === v);
  const lbl = (opts, v, lang, pc) => { const o = optOf(opts, v); return o ? gx(o[lang] || o.ar, pc) : ""; };
  const lblMany = (opts, arr, lang, pc) => (arr || []).map((v) => lbl(opts, v, lang, pc)).filter(Boolean);
  const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && !v.length) || (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
  const d10 = (s) => (s ? String(s).slice(0, 10) : "");
  const dmy = (s) => { s = d10(s); if (!s) return ""; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
  const cell = (s) => String(s == null ? "" : s).replace(/\|/g, "/").replace(/\r?\n/g, " ");
  const AR_ORD = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];
  const EN_ORD = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const AR_COUNT = { 1: "جلسة واحدة", 2: "جلستين", 3: "ثلاث جلسات", 4: "أربع جلسات", 5: "خمس جلسات", 6: "ست جلسات" };
  const EN_COUNT = { 1: "one session", 2: "two sessions", 3: "three sessions", 4: "four sessions", 5: "five sessions", 6: "six sessions" };

  // Signature line used at the end of reports.
  const endOfReport = (ctx) => ctx.lang === "ar"
    ? ["", "^^ - انتهى التقرير -", "", "**اختصاصي النطق واللغة**", ctx.therapistName || "", "[[SIG]]"]
    : ["", "^^ - End of Report -", "", "**Speech and Language Pathologist**", ctx.therapistName || "", "[[SIG]]"];

  // Document in one language: replace any line, table cell or sentence that is a known suggestion / option
  // written in the other language with its twin (Arabic -> English for an English document, English -> Arabic
  // for an Arabic one). Text the therapist typed freely stays as it is (see foreignLines / isForeign).
  const AR_RE = /[؀-ۿ]/;
  // Latin words allowed inside an Arabic document (abbreviations, file numbers, phonetic symbols, placeholders)
  const LATIN_OK = /\[\[(SIG|SUP)\]\]|TMP-\d+|\b(VFSS|FEES|ASD|ADHD|ABA|AAC|PECS|SOAP|PDF|OT|ENT|IQ|PLS|CELF|DOH|ID|WhatsApp)\b|\/[^/\s]{1,6}\/|https?:\S+|\S+@\S+/gi;
  const latinShare = (t) => { const x = String(t).replace(LATIN_OK, ""); const la = (x.match(/[A-Za-z]/g) || []).length, ar = (x.match(/[؀-ۿ]/g) || []).length; return la + ar ? la / (la + ar) : 0; };
  // true when a piece of text is (mostly) in the other language for a document in `lang`
  const isForeign = (t, lang) => { t = String(t || ""); if (!t.trim()) return false; return lang === "en" ? AR_RE.test(t) : latinShare(t) > 0.5 && /[A-Za-z]{3,}/.test(t.replace(LATIN_OK, "")); };
  const MARKUP = /^\s*(::\w+|\|?[\s:|-]*\|?)\s*$/;
  // lines of a document still in the other language (markup lines such as ::info2 are ignored)
  const foreignLines = (text, lang) => String(text || "").split("\n").filter((l) => l.trim() && !MARKUP.test(l) && isForeign(l, lang));

  function translate(text, toLang, pcAr, pcEn) {
    const en = toLang === "en";
    const norm = (x) => String(x).replace(/\*\*/g, "").replace(/[\s.،,:؛!؟?]+$/, "").replace(/\s+/g, " ").trim().toLowerCase();
    const map = new Map();
    PAIRS.forEach((p) => {
      const from = en ? gx(p.ar, pcAr) : gx(p.en, pcEn), to = en ? gx(p.en, pcEn) : gx(p.ar, pcAr);
      const k = norm(from); if (k && !map.has(k)) map.set(k, to);
    });
    const needs = (x) => (en ? AR_RE.test(x) : /[A-Za-z]{2,}/.test(x));
    const stop = en ? /(?<=[.!؟?])\s+/ : /(?<=[.!?])\s+/;
    const dot = (orig, v) => (/[.]\s*$/.test(orig) && !/[.!?؟]$/.test(v) ? v + "." : v);
    const seg = (x) => {
      if (!needs(x)) return x;
      const k = norm(x);
      if (map.has(k)) return dot(x, map.get(k));
      const parts = x.split(stop);
      if (parts.length > 1) return parts.map((y) => { const kk = norm(y); return map.has(kk) ? dot(y, map.get(kk)) : y; }).join(" ");
      return x;
    };
    return String(text || "").split("\n").map((line) => {
      if (!needs(line) || /^\s*::\w+\s*$/.test(line)) return line;
      if (line.trim().startsWith("|")) return line.split("|").map((c) => (c.trim() ? " " + seg(c.trim()) + " " : c)).join("|");
      const m = line.match(/^(\s*(?:#{1,4}\s+(?:\{[gab]\}\s*)?|[-•]\s+|\d+[.)]\s+|\^\^\s+)?)(.*)$/);
      let pre = m[1], body = m[2];
      // keep a "Label: " prefix that is already in the document's language
      const lm = en ? body.match(/^((?:\*\*)?[A-Za-z][^:]{0,60}:(?:\*\*)?\s*)(.*)$/) : body.match(/^((?:\*\*)?[؀-ۿ][^:]{0,60}:(?:\*\*)?\s*)(.*)$/);
      if (lm) { pre += lm[1]; body = lm[2]; }
      return pre + seg(body);
    }).join("\n");
  }
  const toEnglish = (text, pcAr, pcEn) => translate(text, "en", pcAr, pcEn);
  const arabicLines = (text) => String(text || "").split("\n").filter((l) => AR_RE.test(l)).length;

  window.FC = { S, toEnglish, translate, isForeign, foreignLines, arabicLines, L, O, joinList, ageParts, ageString, NATIONALITIES, nationality, personCtx, gx, cap, lines, optOf, lbl, lblMany, isEmpty, d10, dmy, cell,
    AR_ORD, EN_ORD, AR_COUNT, EN_COUNT, endOfReport };
  window.Forms = window.Forms || {};
})();

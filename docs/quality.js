// =====================================================================
//  الجودة والتدقيق — Clinical documentation quality & therapist performance audits
//
//  Admins (auditors / quality) create and edit monthly audits; a therapist only reads his own
//  submitted audits, his trend against the department average, and his corrective actions.
//
//  Scoring: every criterion has a max score (default 0–4) or N/A. A category % = points / max of the
//  applicable criteria (N/A left out of the denominator; blank is NOT N/A and blocks submission).
//  Overall % = weighted average of the categories that have applicable criteria.
//  Automated alignment alerts are only suggestions: they count after the auditor confirms each session.
// =====================================================================
(function () {
  const X = () => window.APPX;
  const t = (ar, en) => (X().UI === "en" ? en : ar);
  const esc = (s) => X().esc(s);
  const r1 = (n) => Math.round(n * 10) / 10;
  const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const PALETTE = ["#2F7D4A", "#8A3E78", "#3B6EA5", "#B7791F", "#5A6B7B", "#1F8A8A", "#7A5C2E", "#A23B5A"];
  const AR_M = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const EN_M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mLabel = (m, short) => { if (!m) return ""; const [y, mo] = m.split("-").map(Number); if (short) return `${String(mo).padStart(2, "0")}/${String(y).slice(2)}`; return X().UI === "en" ? `${EN_M[mo - 1]} ${y}` : `${AR_M[mo - 1]} ${y}`; };
  const curMonth = () => X().today().slice(0, 7);
  const shiftMonth = (m, n) => { let [y, mo] = m.split("-").map(Number); mo += n; while (mo < 1) { mo += 12; y--; } while (mo > 12) { mo -= 12; y++; } return `${y}-${String(mo).padStart(2, "0")}`; };
  const monthsBack = (n) => { const out = []; for (let i = n - 1; i >= 0; i--) out.push(shiftMonth(curMonth(), -i)); return out; };
  const L = (o) => (o ? (X().UI === "en" && o.en ? o.en : o.ar) : "");

  // ------------------------------------------------------------------ default audit template
  const C = (id, ar, en) => ({ id, ar, en, max: 4, na: true });
  const DEFAULT_TPL = {
    version: 1,
    department: "النطق واللغة",
    sample: { files: 5, sessions: 10 },
    cats: [
      { id: "tp", ar: "جودة الخطط العلاجية", en: "Treatment plan quality", w: 25, crit: [
        C("tp1", "أهداف SMART: محددة، قابلة للقياس، واقعية، ذات صلة، ومحددة بزمن", "SMART goals: specific, measurable, achievable, relevant, time-bound"),
        C("tp2", "الأهداف مرتبطة بنتائج التقييم", "Goals linked to assessment results"),
        C("tp3", "خط أساس واضح لكل هدف", "Clear baseline for each goal"),
        C("tp4", "استراتيجيات تدخل مناسبة", "Appropriate intervention strategies"),
        C("tp5", "معايير قياس مناسبة", "Appropriate measurement criteria"),
        C("tp6", "معايير إتقان محددة", "Defined mastery criteria"),
        C("tp7", "أولويات علاجية مناسبة", "Appropriate treatment priorities"),
        C("tp8", "أهداف فردية وليست قوالب عامة", "Individualized goals, not generic templates"),
        C("tp9", "مواعيد مراجعة وإعادة تقييم مناسبة", "Appropriate review and reassessment dates"),
        C("tp10", "اتساق الخطة مع التشخيص والاحتياجات الوظيفية", "Consistent with diagnosis and functional needs"),
      ] },
      { id: "sn", ar: "جودة ملاحظات الجلسات اليومية", en: "Daily session notes quality", w: 25, crit: [
        C("sn1", "تحديد واضح للأهداف المستهدفة في الجلسة", "Targeted goals clearly identified"),
        C("sn2", "وصف الأنشطة والتدخلات", "Activities and interventions described"),
        C("sn3", "توثيق استجابة الطفل", "Child's response documented"),
        C("sn4", "بيانات أداء موضوعية", "Objective performance data"),
        C("sn5", "مستويات التلقين والمساعدة", "Prompting and assistance levels"),
        C("sn6", "وصف التقدم أو الصعوبات", "Progress or difficulties described"),
        C("sn7", "مصطلحات سريرية مناسبة", "Appropriate clinical terminology"),
        C("sn8", "توثيق فردي غير مكرر", "Individualized documentation"),
        C("sn9", "اتساق الملاحظة مع الجلسة الفعلية", "Consistent with the actual session"),
        C("sn10", "الإنجاز في الوقت المحدد وتوثيق هوية الأخصائي", "Timely completion and therapist authentication"),
      ] },
      { id: "al", ar: "توافق الجلسات مع الخطة العلاجية", en: "Treatment plan–session alignment", w: 25, crit: [
        C("al1", "صحة الهدف: الهدف المختار موجود في الخطة المعتمدة السارية", "Goal validity: selected goal exists in the active approved plan"),
        C("al2", "صلة النشاط بالهدف المختار", "Activity relevance to the selected goal"),
        C("al3", "اتساق التوثيق: الملاحظة تصف عملاً على الهدف فعلاً", "Documentation consistency with the goal"),
        C("al4", "توثيق أداء الطفل على الهدف", "Performance on the goal documented"),
        C("al5", "اتساق القياس مع معيار الهدف", "Measurement consistent with the goal's criterion"),
        C("al6", "توثيق مستوى التلقين", "Prompting level documented"),
        C("al7", "استمرارية متابعة الهدف عبر الجلسات (تغطية الأهداف)", "Goal continuity across sessions (goal coverage)"),
      ] },
      { id: "pr", ar: "توثيق التقدم السريري", en: "Clinical progress documentation", w: 15, crit: [
        C("pr1", "المقارنة مع الأداء في خط الأساس", "Comparison with baseline performance"),
        C("pr2", "الأداء عبر عدة جلسات", "Performance across multiple sessions"),
        C("pr3", "تغيّر مستويات التلقين", "Changes in prompting levels"),
        C("pr4", "التقدم نحو معيار الإتقان", "Progress toward mastery criteria"),
        C("pr5", "تحديد المعيقات", "Barriers identified"),
        C("pr6", "تعديل استراتيجيات التدخل عند الحاجة السريرية", "Strategies modified when clinically needed"),
        C("pr7", "توصيات مناسبة بالاستمرار أو التعديل أو الخروج", "Appropriate continue / modify / discharge recommendations"),
      ] },
      { id: "ps", ar: "معايير التوثيق المهني", en: "Professional documentation standards", w: 10, crit: [
        C("ps1", "اكتمال بيانات تعريف الطفل في كل مستند", "Child identifiers complete on every document"),
        C("ps2", "التوقيع والختم والتاريخ", "Signature, stamp and date"),
        C("ps3", "لغة مهنية واضحة وخالية من الأخطاء", "Clear, professional, error-free language"),
        C("ps4", "اكتمال الحقول المطلوبة في النماذج", "Required form fields completed"),
        C("ps5", "حفظ المستندات في ملف الطفل في الوقت المحدد", "Documents filed in the child's record on time"),
        C("ps6", "الالتزام بالخصوصية وعدم نسخ بيانات أطفال آخرين", "Privacy kept; no other children's data copied"),
      ] },
    ],
    cls: [
      { min: 95, ar: "ممتاز", en: "Excellent", color: "#2F7D4A" },
      { min: 85, ar: "جيد جداً", en: "Very good", color: "#3B8A5A" },
      { min: 75, ar: "مُرضٍ", en: "Satisfactory", color: "#3B6EA5" },
      { min: 65, ar: "يحتاج إلى تحسين", en: "Needs improvement", color: "#B7791F" },
      { min: 0, ar: "يحتاج إلى تحسين عاجل", en: "Critical improvement required", color: "#A23B5A" },
    ],
  };
  const tplNow = () => { const s = X().S.settings || {}; return clone(s.qa_template && s.qa_template.cats ? s.qa_template : DEFAULT_TPL); };
  const ALERTS = {
    ALIGNED: { ar: "متوافق", en: "Aligned", cls: "ok" },
    UNLINKED: { ar: "هدف غير موجود في الخطة", en: "Unlinked goal", cls: "danger" },
    MISSING: { ar: "توثيق غير كافٍ", en: "Missing documentation", cls: "warn" },
    INACTIVE: { ar: "هدف غير نشط (منجز/متوقف)", en: "Inactive goal", cls: "warn" },
    ADDITIONAL: { ar: "هدف سريري إضافي", en: "Additional clinical goal", cls: "info" },
  };
  const ACT_ST = { open: { ar: "مفتوح", en: "Open", cls: "warn" }, progress: { ar: "قيد التنفيذ", en: "In progress", cls: "info" }, done: { ar: "مكتمل", en: "Completed", cls: "ok" } };
  const overdue = (a) => a.status !== "done" && a.due_date && String(a.due_date).slice(0, 10) < X().today();
  const actPill = (a) => overdue(a) ? `<span class="pill danger">${t("متأخر", "Overdue")}</span>` : `<span class="pill ${ACT_ST[a.status] ? ACT_ST[a.status].cls : ""}">${esc(L(ACT_ST[a.status]))}</span>`;

  // ------------------------------------------------------------------ scoring engine
  function score(tpl, scores) {
    const cat = {}, prog = {}; let wsum = 0, acc = 0, blank = 0, done = 0;
    tpl.cats.forEach((c) => {
      let got = 0, max = 0, b = 0, n = 0;
      c.crit.forEach((k) => {
        const v = (scores[k.id] || {}).s;
        if (v === "na") { n++; return; }
        if (v === "" || v == null) { b++; return; }
        got += Number(v); max += Number(k.max); n++;
      });
      blank += b; done += n; prog[c.id] = { b, n: c.crit.length };
      if (!max) { cat[c.id] = null; return; }
      const p = r1((got / max) * 100); cat[c.id] = p; wsum += Number(c.w); acc += Number(c.w) * p;
    });
    return { cat, prog, total: wsum ? r1(acc / wsum) : null, blank, complete: blank === 0 };
  }
  const clsOf = (tpl, total) => (total == null ? null : [...tpl.cls].sort((a, b) => b.min - a.min).find((c) => total >= c.min) || null);
  const clsPill = (tpl, total) => { const c = clsOf(tpl, total); return c ? `<span class="pill" style="background:${c.color};color:#fff;border-color:${c.color}">${esc(L(c))}</span>` : ""; };
  const pct = (v) => (v == null ? "—" : `${v}%`);

  // ------------------------------------------------------------------ goals & sessions (alignment)
  const INACTIVE_EVAL = ["achieved", "discontinued"];
  function suggestStatus(a, s) {
    const snap = a.plan_snap[s.plan];
    if ((!s.goals || !s.goals.length) && s.extra) return "ADDITIONAL";
    if (!s.goals || !s.goals.length) return "UNLINKED";
    if (!snap) return "UNLINKED";
    const goals = s.goals.map((k) => snap.goals.find((g) => g.key === k)).filter(Boolean);
    if (goals.length < s.goals.length) return "UNLINKED";
    if (goals.some((g) => INACTIVE_EVAL.includes(g.eval))) return "INACTIVE";
    if (s.perf === "no" || s.prompt === "no") return "MISSING";
    return "ALIGNED";
  }
  // near-duplicate notes (3-word shingles, Jaccard >= 0.8): review alert only, never a verdict
  function shingles(txt) { const w = String(txt || "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean); const s = new Set(); for (let i = 0; i + 2 < w.length; i++) s.add(w.slice(i, i + 3).join(" ")); return { s, n: w.length }; }
  function similar(a) {
    const out = {}; const sh = a.sessions.map((s) => shingles(s.text));
    for (let i = 0; i < sh.length; i++) for (let j = i + 1; j < sh.length; j++) {
      if (sh[i].n < 8 || sh[j].n < 8) continue;
      let inter = 0; sh[i].s.forEach((x) => { if (sh[j].s.has(x)) inter++; });
      const jac = inter / (sh[i].s.size + sh[j].s.size - inter || 1);
      if (jac >= 0.8) { (out[i] = out[i] || []).push(j); (out[j] = out[j] || []).push(i); }
    }
    return out;
  }
  function metrics(a) {
    const conf = a.sessions.filter((s) => s.confirmed && s.status);
    const by = {}; Object.keys(ALERTS).forEach((k) => { by[k] = conf.filter((s) => s.status === k).length; });
    const aligned = conf.length ? r1((by.ALIGNED / conf.length) * 100) : null;
    let active = 0, addressed = 0, documented = 0, excluded = 0;
    const perPlan = (a.plans || []).filter((pid) => a.plan_snap[pid]).map((pid) => {
      const snap = a.plan_snap[pid];
      const rows = snap.goals.map((g) => {
        const ss = conf.filter((s) => s.plan === pid && (s.goals || []).includes(g.key));
        const alg = ss.filter((s) => s.status === "ALIGNED");
        const doc = alg.filter((s) => s.perf === "yes" && s.prompt === "yes");
        const inactive = INACTIVE_EVAL.includes(g.eval);
        const reason = ((a.excl || {})[pid + ":" + g.key] || "").trim();
        const state = inactive ? "inactive" : alg.length ? "covered" : reason ? "excluded" : "missed";
        if (!inactive) { if (state === "excluded") excluded++; else { active++; if (alg.length) addressed++; if (doc.length) documented++; } }
        return { g, n: ss.length, alg: alg.length, doc: doc.length, state, reason };
      });
      return { pid, snap, rows };
    });
    return { conf: conf.length, total: a.sessions.length, by, aligned, coverage: active ? r1((addressed / active) * 100) : null,
      docPct: active ? r1((documented / active) * 100) : null, active, addressed, documented, excluded, perPlan, sim: similar(a),
      unconfirmed: a.sessions.filter((s) => !s.confirmed || !s.status).length };
  }

  // ------------------------------------------------------------------ small charts (no libraries)
  function lineChart(series, months, opts = {}) {
    const W = 680, H = 260, pl = 34, pr = 12, pt = 12, pb = 34, w = W - pl - pr, h = H - pt - pb;
    const x = (i) => pl + (months.length < 2 ? w / 2 : (i * w) / (months.length - 1)), y = (v) => pt + h - (v / 100) * h;
    const grid = [0, 25, 50, 65, 75, 85, 100].map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 65 || v === 75 || v === 85 ? "#E2D3B5" : "#ECEFF1"}" stroke-dasharray="${v === 65 || v === 75 || v === 85 ? "4 3" : ""}"/><text x="${pl - 6}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="#7A867F">${v}</text>`).join("");
    const xl = months.map((m, i) => `<text x="${x(i)}" y="${H - 12}" font-size="10" text-anchor="middle" fill="#7A867F">${esc(mLabel(m, true))}</text>`).join("");
    const lines = series.map((s, si) => {
      const col = s.color || PALETTE[si % PALETTE.length];
      const pts = months.map((m, i) => (s.values[m] == null ? null : [x(i), y(s.values[m]), s.values[m], m])).filter(Boolean);
      const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
      return `<path d="${path}" fill="none" stroke="${col}" stroke-width="${s.dash ? 2 : 2.5}" ${s.dash ? 'stroke-dasharray="6 4"' : ""}/>` +
        pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${col}"><title>${esc(s.name)} — ${esc(mLabel(p[3]))}: ${p[2]}%</title></circle>`).join("");
    }).join("");
    const legend = series.map((s, si) => `<span class="lg"><i style="background:${s.color || PALETTE[si % PALETTE.length]}${s.dash ? ";opacity:.6" : ""}"></i>${esc(s.name)}</span>`).join("");
    const empty = !series.some((s) => Object.keys(s.values).some((m) => months.includes(m) && s.values[m] != null));
    return `<div class="qa-chart">${empty ? `<div class="empty">${t("لا توجد تدقيقات معتمدة في هذه الفترة بعد.", "No submitted audits in this period yet.")}</div>` :
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || "")}" style="width:100%;height:auto;direction:ltr">${grid}${xl}${lines}</svg><div class="legend">${legend}</div>`}</div>`;
  }
  // rows: [{label, values:[{v, color, name}]}] — horizontal bars 0..100
  function barChart(rows, opts = {}) {
    if (!rows.length) return `<div class="empty">${t("لا توجد بيانات بعد.", "No data yet.")}</div>`;
    const max = opts.max || 100;
    return `<div class="qa-bars">${rows.map((r) => `<div class="qb-row"><div class="qb-l" title="${esc(r.label)}">${esc(r.label)}</div><div class="qb-b">${r.values.map((v) =>
      `<div class="qb-t"><div class="qb-f" style="width:${v.v == null ? 0 : Math.max(1.5, (v.v / max) * 100)}%;background:${v.color || PALETTE[0]}" title="${esc(v.name || "")}: ${v.v == null ? "—" : v.v}${opts.unit ?? "%"}"></div><span class="qb-v">${v.v == null ? "—" : v.v + (opts.unit ?? "%")}</span></div>`).join("")}</div></div>`).join("")}
      ${opts.legend ? `<div class="legend">${opts.legend.map((l) => `<span class="lg"><i style="background:${l.color}"></i>${esc(l.name)}</span>`).join("")}</div>` : ""}</div>`;
  }

  // ------------------------------------------------------------------ data
  const tName = (id) => { const u = (X().S.therapists || []).find((x) => x.id === id); return u ? (X().UI === "en" && u.name_en ? u.name_en : u.name) : t("(غير معروف)", "(unknown)"); };
  async function loadAudits(filter) { return X().pb.collection("qa_audits").getFullList({ sort: "-month", filter: filter || "" }); }
  async function loadActions(filter) { return X().pb.collection("qa_actions").getFullList({ sort: "due_date", filter: filter || "" }); }
  const inCenter = (a) => !X().S.centerFilter || a.center === X().S.centerFilter;

  // ------------------------------------------------------------------ router
  async function route(h) {
    const A = X();
    const sub = h[0] || "";
    if (!A.isAdmin()) {
      if (sub === "a" && h[1]) return pageView(h[1]);
      return pageProfile(A.S.me.id);
    }
    if (!sub) return pageDashboard();
    if (sub === "a" && h[1] === "new") return pageEdit(null);
    if (sub === "a" && h[1]) return A.qs().edit ? pageEdit(h[1]) : pageView(h[1]);
    if (sub === "t" && h[1]) return pageProfile(h[1]);
    if (sub === "me") return pageProfile(A.S.me.id);
    if (sub === "actions") return pageActions();
    if (sub === "settings") return pageSettings();
    if (sub === "reports") return pageReports();
    return pageDashboard();
  }
  const tabs = (active) => `<div class="qa-tabs">${[["", t("لوحة الأداء", "Dashboard")], ["a/new", t("+ تدقيق جديد", "+ New audit")], ["reports", t("التقارير الشهرية", "Monthly reports")], ["actions", t("الإجراءات التصحيحية", "Corrective actions")], ["settings", t("معايير التدقيق", "Audit criteria")]]
    .map(([k, l]) => `<a class="btn sm ${k === active ? "primary" : ""}" href="#/quality${k ? "/" + k : ""}">${l}</a>`).join("")}</div>`;

  // ------------------------------------------------------------------ dashboard (admin)
  async function pageDashboard() {
    const A = X(), S = A.S, q = A.qs();
    const main = A.shell("quality", `<div class="empty">${t("جاري التحميل…", "Loading…")}</div>`);
    const [audits, actions] = await Promise.all([loadAudits(), loadActions()]);
    const period = Number(q.p) || 6, ther = q.th || "";
    const months = monthsBack(period);
    const tpl = tplNow();
    const therapists = (S.therapists || []).filter((u) => !S.centerFilter || (u.centers || []).includes(S.centerFilter));
    const sub = audits.filter((a) => a.status === "submitted" && inCenter(a) && months.includes(a.month) && (!ther || a.therapist === ther));
    const drafts = audits.filter((a) => a.status === "draft" && inCenter(a) && (!ther || a.therapist === ther));
    const avg = (xs) => { xs = xs.filter((v) => typeof v === "number"); return xs.length ? r1(xs.reduce((s, v) => s + v, 0) / xs.length) : null; };
    const latestBy = {}; audits.filter((a) => a.status === "submitted" && inCenter(a)).forEach((a) => { if (!latestBy[a.therapist] || latestBy[a.therapist].month < a.month) latestBy[a.therapist] = a; });
    const needLimit = (tpl.cls.find((c) => /مُرضٍ|Satisf/i.test(c.en + c.ar)) || { min: 75 }).min;
    const needImp = Object.values(latestBy).filter((a) => a.total < needLimit && (!ther || a.therapist === ther));
    const actsF = actions.filter((x) => (!ther || x.therapist === ther) && (!S.centerFilter || therapists.some((u) => u.id === x.therapist)));
    const od = actsF.filter(overdue);
    const kpi = (v, l, cls) => `<div class="panel kpi ${cls || ""}"><div class="panel-body"><div class="kv">${v}</div><div class="kl">${l}</div></div></div>`;
    const catAvg = (id) => avg(sub.map((a) => (a.cat || {})[id]));
    // charts
    const shown = ther ? therapists.filter((u) => u.id === ther) : therapists.filter((u) => sub.some((a) => a.therapist === u.id));
    const trend = shown.map((u) => { const v = {}; sub.filter((a) => a.therapist === u.id).forEach((a) => { v[a.month] = a.total; }); return { name: tName(u.id), values: v }; });
    const deptLine = {}; months.forEach((m) => { const v = avg(sub.filter((a) => a.month === m).map((a) => a.total)); if (v != null) deptLine[m] = v; });
    if (!ther && shown.length > 1) trend.push({ name: t("متوسط القسم", "Department average"), values: deptLine, color: "#26332C", dash: true });
    const perT = shown.map((u) => { const xs = sub.filter((a) => a.therapist === u.id); return { u, total: avg(xs.map((a) => a.total)), tp: avg(xs.map((a) => (a.cat || {}).tp)), sn: avg(xs.map((a) => (a.cat || {}).sn)), cov: avg(xs.map((a) => (a.metrics || {}).coverage)), al: avg(xs.map((a) => (a.metrics || {}).aligned)) }; })
      .sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
    const dist = [...tpl.cls].sort((a, b) => b.min - a.min).map((c) => ({ c, n: Object.values(latestBy).filter((a) => (!ther || a.therapist === ther) && clsOf(tpl, a.total) === c).length }));
    const allCov = avg(sub.map((a) => (a.metrics || {}).coverage));
    main.innerHTML = `
      <div class="page-head"><div class="grow"><h1>${t("الجودة والتدقيق", "Quality & audits")}</h1><div class="muted">${t("تدقيق شهري لجودة توثيق الخطط والجلسات. كل رقم هنا محسوب من تدقيقات معتمدة فعلاً.", "Monthly audits of plan and session documentation. Every number comes from submitted audits.")}</div></div></div>
      ${tabs("")}
      <div class="panel" style="margin:12px 0"><div class="panel-body qa-filters">
        <label>${t("الفترة", "Period")} <select class="input" id="fp"><option value="6" ${period === 6 ? "selected" : ""}>${t("آخر 6 أشهر", "Last 6 months")}</option><option value="12" ${period === 12 ? "selected" : ""}>${t("آخر 12 شهراً", "Last 12 months")}</option></select></label>
        <label>${t("الأخصائي", "Therapist")} <select class="input" id="ft"><option value="">${t("الكل", "All")}</option>${therapists.map((u) => `<option value="${u.id}" ${ther === u.id ? "selected" : ""}>${esc(tName(u.id))}</option>`).join("")}</select></label>
        <span class="hint">${t("المركز من القائمة أعلى الصفحة.", "Center: use the selector at the top.")}</span></div></div>
      <div class="qa-kpis">
        ${kpi(therapists.length, t("عدد الأخصائيين", "Therapists"))}
        ${kpi(sub.length, t("تدقيقات معتمدة في الفترة", "Submitted audits (period)"))}
        ${kpi(pct(avg(sub.map((a) => a.total))), t("متوسط النتيجة الكلية", "Average overall score"))}
        ${kpi(pct(catAvg("tp")), t("جودة الخطط", "Plan quality"))}
        ${kpi(pct(catAvg("sn")), t("جودة ملاحظات الجلسات", "Session notes quality"))}
        ${kpi(pct(catAvg("al")), t("توافق الجلسات مع الخطة", "Plan–session alignment"))}
        ${kpi(pct(catAvg("pr")), t("توثيق التقدم السريري", "Progress documentation"))}
        ${kpi(drafts.length, t("تدقيقات قيد الإعداد (مسودات)", "Pending audits (drafts)"), drafts.length ? "warn" : "")}
        ${kpi(needImp.length, t(`أخصائيون تحت ${needLimit}% (آخر تدقيق)`, `Therapists below ${needLimit}% (latest)`), needImp.length ? "warn" : "")}
        ${kpi(od.length, t("إجراءات تصحيحية متأخرة", "Overdue corrective actions"), od.length ? "danger" : "")}
      </div>
      <div class="grid cols-2" style="margin-top:14px">
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("اتجاه الأداء الشهري", "Monthly performance trend")}</h2></div><div class="panel-body">${lineChart(trend, months, { label: "trend" })}<div class="hint">${t("الخطوط المتقطعة الخفيفة: حدود التصنيف 65 / 75 / 85.", "Light dashed lines: classification limits 65 / 75 / 85.")}</div></div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("مقارنة الأخصائيين (نفس المعايير)", "Therapist comparison (same criteria)")}</h2></div><div class="panel-body">${barChart(perT.map((x) => ({ label: tName(x.u.id), values: [{ v: x.total, color: (clsOf(tpl, x.total) || {}).color || PALETTE[0], name: t("النتيجة", "Score") }] })))}</div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("جودة التوثيق: الخطط مقابل ملاحظات الجلسات", "Documentation: plans vs session notes")}</h2></div><div class="panel-body">${barChart(perT.map((x) => ({ label: tName(x.u.id), values: [{ v: x.tp, color: PALETTE[0], name: t("الخطط", "Plans") }, { v: x.sn, color: PALETTE[1], name: t("الجلسات", "Sessions") }] })), { legend: [{ name: t("الخطط", "Plans"), color: PALETTE[0] }, { name: t("ملاحظات الجلسات", "Session notes"), color: PALETTE[1] }] })}</div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("تغطية الأهداف النشطة", "Active goal coverage")}</h2><span class="pill info">${t("المتوسط", "Average")}: ${pct(allCov)}</span></div><div class="panel-body">${barChart(perT.map((x) => ({ label: tName(x.u.id), values: [{ v: x.cov, color: PALETTE[2], name: t("التغطية", "Coverage") }, { v: x.al, color: PALETTE[5], name: t("الجلسات المتوافقة", "Aligned sessions") }] })), { legend: [{ name: t("الأهداف النشطة التي عولجت ووثّقت", "Active goals addressed"), color: PALETTE[2] }, { name: t("الجلسات المتوافقة", "Aligned sessions"), color: PALETTE[5] }] })}</div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("توزيع الأداء (آخر تدقيق لكل أخصائي)", "Performance distribution (latest audit)")}</h2></div><div class="panel-body">${barChart(dist.map((d) => ({ label: L(d.c), values: [{ v: d.n, color: d.c.color }] })), { max: Math.max(1, ...dist.map((d) => d.n)), unit: "" })}</div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("قيد الإعداد والمتابعة", "In progress & follow-up")}</h2></div><div class="panel-body">
          ${drafts.length ? `<div class="hint">${t("مسودات:", "Drafts:")}</div>${drafts.map((a) => `<div><a href="#/quality/a/${a.id}?edit=1">${esc(tName(a.therapist))} — ${esc(mLabel(a.month))}</a></div>`).join("")}` : `<div class="hint">${t("لا توجد مسودات.", "No drafts.")}</div>`}
          ${needImp.length ? `<div class="hint" style="margin-top:10px">${t("يحتاجون تدريباً أو إشرافاً إضافياً:", "Need extra training or supervision:")}</div>${needImp.map((a) => `<div><a href="#/quality/t/${a.therapist}">${esc(tName(a.therapist))}</a> ${clsPill(tpl, a.total)} ${pct(a.total)}</div>`).join("")}` : ""}
          ${od.length ? `<div class="hint" style="margin-top:10px">${t("إجراءات متأخرة:", "Overdue actions:")}</div>${od.slice(0, 6).map((x) => `<div><a href="#/quality/actions">${esc(tName(x.therapist))}: ${esc(String(x.issue).slice(0, 70))}</a></div>`).join("")}` : ""}
        </div></div>
      </div>
      <div class="panel" style="margin-top:14px"><div class="panel-head"><h2 class="grow">${t("كل التدقيقات", "All audits")}</h2></div><div class="table-wrap"><table class="t"><thead><tr><th>${t("الشهر", "Month")}</th><th>${t("الأخصائي", "Therapist")}</th><th>${t("المركز", "Center")}</th><th>${t("النتيجة", "Score")}</th><th>${t("التصنيف", "Class")}</th><th>${t("الحالة", "Status")}</th><th>${t("المدقق", "Auditor")}</th></tr></thead><tbody>
        ${audits.filter(inCenter).filter((a) => !ther || a.therapist === ther).map((a) => `<tr><td><a href="#/quality/a/${a.id}${a.status === "draft" ? "?edit=1" : ""}">${esc(mLabel(a.month))}</a></td><td><a href="#/quality/t/${a.therapist}">${esc(tName(a.therapist))}</a></td><td>${esc(A.shortCenter(A.centerById(a.center), A.UI))}</td><td><strong>${pct(a.total)}</strong></td><td>${a.status === "submitted" ? clsPill(a.tpl || tpl, a.total) : ""}</td>
          <td>${a.status === "submitted" ? `<span class="pill ok">${t("معتمد", "Submitted")}</span>` : `<span class="pill warn">${t("مسودة", "Draft")}</span>`}${(a.history || []).some((x) => x.action === "correction") ? ` <span class="pill info">${t("مُصحَّح", "Corrected")}</span>` : ""}</td><td>${esc(a.auditor_name || "")}</td></tr>`).join("") || `<tr><td colspan="7" class="empty">${t("لا توجد تدقيقات بعد. ابدأ بـ «تدقيق جديد».", "No audits yet. Start with “New audit”.")}</td></tr>`}
      </tbody></table></div></div>`;
    const upd = () => A.go(`#/quality?p=${main.querySelector("#fp").value}&th=${main.querySelector("#ft").value}`);
    main.querySelector("#fp").onchange = upd; main.querySelector("#ft").onchange = upd;
  }

  // ------------------------------------------------------------------ audit editor (admin)
  async function pageEdit(id) {
    const A = X(), S = A.S, pb = A.pb;
    const main = A.shell("quality", `<div class="empty">${t("جاري التحميل…", "Loading…")}</div>`);
    const [patients, plans, rec, others] = await Promise.all([
      pb.collection("patients").getFullList({ sort: "file_no" }),
      pb.collection("plans").getFullList({ sort: "-start_date" }),
      id ? pb.collection("qa_audits").getOne(id) : null,
      loadAudits(),
    ]);
    const a = rec ? clone(rec) : { therapist: "", center: S.centerFilter || (S.centers[0] || {}).id || "", month: curMonth(), status: "draft", audit_date: A.today(), follow_up: A.addMonths(A.today(), 1),
      files: [], plans: [], plan_snap: {}, scores: {}, sessions: [], excl: {}, strengths: "", improvements: "", actions: [], tpl: tplNow() };
    ["files", "plans", "sessions", "actions"].forEach((k) => { a[k] = a[k] || []; }); ["plan_snap", "scores", "excl"].forEach((k) => { a[k] = a[k] || {}; });
    a.tpl = a.tpl || tplNow();
    const locked = rec && rec.status === "submitted";
    const tpl = a.tpl;
    A.setDirty(false);
    const dirty = () => A.setDirty(true);
    const pById = (pid) => patients.find((p) => p.id === pid) || {};
    const plById = (pid) => plans.find((p) => p.id === pid);
    const monthStart = () => a.month + "-01", monthEnd = () => a.month + "-31";
    const therList = () => (S.therapists || []).filter((u) => !a.center || (u.centers || []).includes(a.center) || u.id === a.therapist);
    const filesOfTher = () => patients.filter((p) => (p.therapists || []).includes(a.therapist) && (!a.center || p.center === a.center));
    const plansOf = (pid) => plans.filter((p) => p.patient === pid && String(p.start_date).slice(0, 10) <= monthEnd() && String(p.end_date).slice(0, 10) >= monthStart());
    function snapPlan(pl) {
      const p = pById(pl.patient), pc = FC.personCtx(p, "ar");
      const goals = window.Forms.plan.allGoals(pl.plan_data || {}, "ar", pc).map((g) => ({ key: g.key, text: g.text, eval: g.eval || "" }));
      a.plan_snap[pl.id] = { patient: pl.patient, file_no: p.file_no || "", start: String(pl.start_date).slice(0, 10), end: String(pl.end_date).slice(0, 10), status: pl.status, updated: pl.updated || "", goals };
    }

    main.innerHTML = `
      <div class="crumbs"><a href="#/quality">${t("الجودة والتدقيق", "Quality")}</a> / ${id ? t("تدقيق", "Audit") : t("تدقيق جديد", "New audit")}</div>
      <div class="page-head"><h1 class="grow">${t("تدقيق جودة التوثيق الشهري", "Monthly documentation audit")}</h1>${locked ? `<span class="pill ok">${t("معتمد", "Submitted")}</span> <span class="pill warn">${t("وضع التصحيح الموثّق", "Documented correction mode")}</span>` : `<span class="pill warn">${t("مسودة", "Draft")}</span>`}</div>
      ${locked ? `<div class="note-box" style="margin-bottom:12px">${t("هذا التدقيق معتمد ومقفل. أي حفظ هنا يحتاج سبب تصحيح، ويُسجّل في سجل التدقيق مع النتيجة قبل وبعد.", "This audit is submitted and locked. Saving needs a correction reason, recorded in the audit trail with the score before and after.")}</div>` : ""}
      <div class="qa-layout"><div id="qa-main">
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">1</span>${t("بيانات التدقيق", "Audit details")}</h2></div><div class="panel-body" id="b-head"></div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">2</span>${t("الملفات والخطط المراجعة", "Reviewed files and plans")}</h2></div><div class="panel-body" id="b-files"></div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">3</span>${t("الجلسات المراجعة وربطها بأهداف الخطة", "Reviewed sessions linked to plan goals")}</h2></div><div class="panel-body" id="b-sess"></div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">4</span>${t("تحليل تغطية الأهداف", "Goal coverage analysis")}</h2></div><div class="panel-body" id="b-cov"></div></div>
        ${tpl.cats.map((c, i) => `<div class="panel" id="cat-${c.id}"><div class="panel-head"><h2 class="grow"><span class="n">${i + 5}</span>${esc(L(c))} <span class="hint">(${c.w}%)</span></h2><span class="pill" data-catpct="${c.id}"></span></div><div class="panel-body" data-cat="${c.id}"></div></div>`).join("")}
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">${tpl.cats.length + 5}</span>${t("الخلاصة: نقاط القوة ومجالات التحسين", "Summary: strengths and areas to improve")}</h2></div><div class="panel-body" id="b-sum"></div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">${tpl.cats.length + 6}</span>${t("خطة الإجراءات التصحيحية والوقائية (CAPA)", "Corrective and preventive actions (CAPA)")}</h2></div><div class="panel-body" id="b-act"></div></div>
      </div>
      <aside class="qa-side"><div class="panel"><div class="panel-body" id="b-res"></div></div></aside></div>`;
    const $ = (s) => main.querySelector(s);

    function renderHead() {
      $("#b-head").innerHTML = `<div class="grid cols-3">
        <div class="field"><label class="f">${t("المركز (الفرع)", "Center (branch)")}</label><select class="input" data-k="center">${S.centers.map((c) => `<option value="${c.id}" ${a.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
        <div class="field"><label class="f">${t("الأخصائي", "Therapist")} *</label><select class="input" data-k="therapist"><option value="">—</option>${therList().map((u) => `<option value="${u.id}" ${a.therapist === u.id ? "selected" : ""}>${esc(tName(u.id))}</option>`).join("")}</select></div>
        <div class="field"><label class="f">${t("شهر التدقيق", "Audit month")} *</label><input class="input" type="month" data-k="month" value="${esc(a.month)}"></div>
        <div class="field"><label class="f">${t("القسم", "Department")}</label><input class="input" value="${esc(tpl.department || "")}" disabled></div>
        <div class="field"><label class="f">${t("تاريخ التدقيق", "Audit date")}</label><input class="input" type="date" data-k="audit_date" value="${esc(a.audit_date || "")}"></div>
        <div class="field"><label class="f">${t("موعد المتابعة", "Follow-up date")}</label><input class="input" type="date" data-k="follow_up" value="${esc(a.follow_up || "")}"></div>
      </div><div id="dupWarn"></div>`;
      const dup = a.therapist && others.find((o) => o.id !== id && o.therapist === a.therapist && o.month === a.month);
      $("#dupWarn").innerHTML = dup ? `<div class="note-box">${t("يوجد تدقيق آخر لنفس الأخصائي ونفس الشهر:", "Another audit exists for this therapist and month:")} <a href="#/quality/a/${dup.id}">${t("فتح", "open")}</a></div>` : "";
    }
    function renderFiles() {
      if (!a.therapist) { $("#b-files").innerHTML = `<div class="hint">${t("اختر الأخصائي أولاً.", "Choose the therapist first.")}</div>`; return; }
      const fs = filesOfTher();
      $("#b-files").innerHTML = `<div class="qa-filters" style="margin-bottom:8px"><span class="hint">${t(`ملفات الأخصائي في هذا المركز: ${fs.length}`, `Therapist's files in this center: ${fs.length}`)}</span>
          <label>${t("حجم العينة", "Sample size")} <input class="input" type="number" min="1" id="sn" value="${esc(Math.min(fs.length, (tpl.sample || {}).files || 5))}" style="width:80px"></label>
          <button class="btn sm" id="rnd">${t("عينة عشوائية", "Random sample")}</button><button class="btn sm" id="clr">${t("إلغاء التحديد", "Clear")}</button></div>
        ${fs.length ? `<div class="qa-files">${fs.map((p) => {
          const on = a.files.includes(p.id), pls = plansOf(p.id);
          return `<div class="qa-file ${on ? "on" : ""}"><label><input type="checkbox" data-file="${p.id}" ${on ? "checked" : ""}> <strong class="mono">${esc(p.file_no)}</strong> <span class="hint">${esc(p.full_name || "")}</span></label>
            ${on ? `<div class="qa-plans">${pls.length ? pls.map((pl) => `<label><input type="checkbox" data-plan="${pl.id}" ${a.plans.includes(pl.id) ? "checked" : ""}> ${t("خطة", "Plan")} ${esc(String(pl.start_date).slice(0, 10))} ← ${esc(String(pl.end_date).slice(0, 10))} <span class="hint">(${esc(pl.status)}${a.plan_snap[pl.id] ? " · " + t(`${a.plan_snap[pl.id].goals.length} هدف محفوظ في التدقيق`, `${a.plan_snap[pl.id].goals.length} goals kept in this audit`) : ""})</span></label>`).join("") : `<div class="hint">${t("لا توجد خطة سارية خلال شهر التدقيق.", "No plan active in the audit month.")}</div>`}</div>` : ""}</div>`;
        }).join("")}</div>` : `<div class="hint">${t("لا توجد ملفات مسندة لهذا الأخصائي في هذا المركز.", "No files assigned to this therapist in this center.")}</div>`}
        <p class="hint">${t("أهداف الخطة تُحفظ داخل التدقيق كما كانت وقت المراجعة، فلو تعدّلت الخطة لاحقاً يبقى التدقيق مرتبطاً بالنسخة التي رُوجعت.", "Plan goals are copied into the audit as they were when reviewed, so later plan edits do not change the audit.")}</p>`;
      const rnd = $("#rnd"); if (rnd) rnd.onclick = () => {
        const n = Math.max(1, Number($("#sn").value) || 1), pool = fs.slice();
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        a.files = pool.slice(0, n).map((p) => p.id); a.plans = []; a.files.forEach((pid) => plansOf(pid).slice(0, 1).forEach((pl) => { a.plans.push(pl.id); snapPlan(pl); }));
        dirty(); renderFiles(); renderSess(); renderCov(); renderRes();
      };
      const clr = $("#clr"); if (clr) clr.onclick = () => { a.files = []; a.plans = []; dirty(); renderFiles(); renderSess(); renderCov(); renderRes(); };
    }
    function goalChips(s, i) {
      const snap = a.plan_snap[s.plan];
      if (!snap) return `<span class="hint">${t("اختر الخطة", "Choose the plan")}</span>`;
      return `<div class="chips">${snap.goals.map((g, gi) => `<button type="button" class="chip ${(s.goals || []).includes(g.key) ? "on" : ""} ${INACTIVE_EVAL.includes(g.eval) ? "muted-chip" : ""}" data-sgoal="${i}" data-key="${esc(g.key)}" title="${esc(g.text)}">G${gi + 1}${INACTIVE_EVAL.includes(g.eval) ? " ✓" : ""}</button>`).join("")}</div>
        <div class="hint" style="margin-top:4px">${(s.goals || []).map((k) => { const gi = snap.goals.findIndex((g) => g.key === k); return gi < 0 ? "" : `G${gi + 1}: ${esc(snap.goals[gi].text.slice(0, 110))}`; }).filter(Boolean).join("<br>")}</div>`;
    }
    function renderSess() {
      const sim = similar(a);
      const yn = (i, k, v) => `<select class="input sm" data-sk="${i}.${k}"><option value="">—</option><option value="yes" ${v === "yes" ? "selected" : ""}>${t("نعم", "Yes")}</option><option value="no" ${v === "no" ? "selected" : ""}>${t("لا", "No")}</option></select>`;
      const filePlans = a.plans.filter((pid) => a.plan_snap[pid]);
      $("#b-sess").innerHTML = `<p class="hint">${t("سجّل كل ملاحظة جلسة راجعتها: اختر الطفل والخطة والأهداف التي اشتغل عليها الأخصائي حسب الملاحظة. النظام يقترح حالة التوافق، وأنت تعتمدها بعد المراجعة — التنبيه لا يدخل في الحساب قبل اعتمادك.", "Log each session note you reviewed: child, plan and the goals the note says were worked on. The system suggests an alignment status; it counts only after you confirm it.")}</p>
        ${a.sessions.map((s, i) => {
          const sug = suggestStatus(a, s);
          return `<div class="qa-sess ${s.confirmed && s.status ? "conf" : ""}"><div class="qa-sess-h"><strong>#${i + 1}</strong>
            <select class="input sm" data-sk="${i}.plan"><option value="">${t("الطفل / الخطة", "Child / plan")}</option>${filePlans.map((pid) => `<option value="${pid}" ${s.plan === pid ? "selected" : ""}>${esc(a.plan_snap[pid].file_no)} — ${esc(a.plan_snap[pid].start)}</option>`).join("")}</select>
            <input class="input sm" type="date" data-sk="${i}.date" value="${esc(s.date || "")}">
            <label class="hint">${t("أداء الطفل موثّق؟", "Performance documented?")} ${yn(i, "perf", s.perf)}</label>
            <label class="hint">${t("مستوى التلقين موثّق؟", "Prompting documented?")} ${yn(i, "prompt", s.prompt)}</label>
            <span class="grow"></span><button class="btn sm danger" data-sdel="${i}">✕</button></div>
            <div class="qa-sess-b"><div><div class="hint">${t("الأهداف المختارة من الخطة:", "Goals selected from the plan:")}</div>${goalChips(s, i)}</div>
            <div><textarea class="input" rows="2" data-sk="${i}.text" placeholder="${t("نص الملاحظة (اختياري — لكشف التكرار)", "Note text (optional, for repetition check)")}">${esc(s.text || "")}</textarea>
              ${sim[i] ? `<div class="pill warn" style="margin-top:4px">⚠ ${t("تشابه كبير مع الجلسة", "Very similar to session")} ${sim[i].map((j) => "#" + (j + 1)).join("، ")} — ${t("للمراجعة البشرية فقط", "for human review only")}</div>` : ""}</div></div>
            <div class="qa-sess-f"><span class="hint">${t("الاقتراح:", "Suggested:")}</span> <span class="pill ${ALERTS[sug].cls}">${esc(L(ALERTS[sug]))}</span>
              <select class="input sm" data-sk="${i}.status"><option value="">${t("قرار المدقق…", "Auditor decision…")}</option>${Object.keys(ALERTS).map((k) => `<option value="${k}" ${s.status === k ? "selected" : ""}>${esc(L(ALERTS[k]))}</option>`).join("")}</select>
              ${!s.status ? `<button class="btn sm" data-saccept="${i}">${t("اعتماد الاقتراح", "Accept suggestion")}</button>` : ""}
              <label class="hint"><input type="checkbox" data-sconf="${i}" ${s.confirmed ? "checked" : ""}> ${t("تمت المراجعة", "Reviewed")}</label>
              <input class="input sm grow" data-sk="${i}.comment" value="${esc(s.comment || "")}" placeholder="${t("تعليق المدقق", "Auditor comment")}"></div></div>`;
        }).join("")}
        <button class="btn primary" id="impS" ${a.therapist ? "" : "disabled"}>⬇ ${t("استيراد ملاحظات الجلسات (SOAP) لهذا الشهر", "Import this month's SOAP notes")}</button>
        <button class="btn" id="addS" ${filePlans.length ? "" : "disabled"}>+ ${t("إضافة جلسة مراجعة", "Add reviewed session")}</button> ${filePlans.length ? "" : `<span class="hint">${t("اختر ملفات وخططاً أولاً.", "Select files and plans first.")}</span>`}`;
      const imp = $("#impS"); if (imp) imp.onclick = async () => {
        imp.disabled = true;
        try {
          const notes = await pb.collection("soap_notes").getFullList({ filter: pb.filter("therapist = {:t} && date >= {:a} && date <= {:b}", { t: a.therapist, a: monthStart(), b: monthEnd() }), sort: "date" });
          const onlyFiles = a.files.length ? notes.filter((n) => a.files.includes(n.patient)) : notes;
          let added = 0;
          onlyFiles.forEach((n) => {
            if (a.sessions.some((s) => s.soap === n.id)) return;
            if (!a.files.includes(n.patient)) a.files.push(n.patient);
            const pl = n.plan && plById(n.plan);
            if (pl && !a.plans.includes(pl.id)) { a.plans.push(pl.id); snapPlan(pl); }
            const gs = (n.goals || []).filter((g) => !g.custom);
            const absent = n.attendance !== "attended";
            a.sessions.push({ id: uid(), soap: n.id, plan: pl ? pl.id : "", date: n.date, goals: gs.map((g) => g.key), extra: (n.goals || []).some((g) => g.custom),
              perf: absent ? "" : ((n.goals || []).every((g) => g.acc !== "" && g.acc != null) ? "yes" : "no"), prompt: absent ? "" : ((n.goals || []).every((g) => g.prompt) ? "yes" : "no"),
              text: [n.note, n.text].filter(Boolean).join("\n"), status: "", confirmed: false, comment: absent ? t("جلسة غياب / إلغاء", "Absent / cancelled session") : "" });
            added++;
          });
          dirty(); renderFiles(); renderSess(); renderCov(); renderRes();
          A.toast(added ? t(`تم استيراد ${added} ملاحظة جلسة. راجع كل جلسة واعتمدها.`, `Imported ${added} session notes. Review and confirm each.`) : t("لا توجد ملاحظات جلسات جديدة لهذا الأخصائي في هذا الشهر.", "No new session notes for this therapist and month."), !added);
        } catch (err) { A.toast(A.errText(err), true); }
        imp.disabled = false;
      };
      const add = $("#addS"); if (add) add.onclick = () => { a.sessions.push({ id: uid(), plan: filePlans[0] || "", date: "", goals: [], perf: "", prompt: "", text: "", status: "", confirmed: false, comment: "" }); dirty(); renderSess(); renderCov(); renderRes(); };
    }
    function renderCov() {
      const m = metrics(a);
      const ST = { covered: [t("عولج", "Addressed"), "ok"], missed: [t("لم يُعالج", "Not addressed"), "warn"], excluded: [t("مستثنى بمبرر", "Justified exclusion"), "info"], inactive: [t("غير نشط", "Inactive"), ""] };
      $("#b-cov").innerHTML = `<div class="qa-kpis small">
          <div class="kpi"><div class="kv">${m.conf}/${m.total}</div><div class="kl">${t("جلسات معتمدة المراجعة", "Sessions confirmed")}</div></div>
          <div class="kpi"><div class="kv">${pct(m.aligned)}</div><div class="kl">${t("جلسات متوافقة", "Aligned sessions")}</div></div>
          <div class="kpi"><div class="kv">${pct(m.coverage)}</div><div class="kl">${t("تغطية الأهداف النشطة", "Active goal coverage")} (${m.addressed}/${m.active})</div></div>
          <div class="kpi"><div class="kv">${pct(m.docPct)}</div><div class="kl">${t("أهداف موثّقة بالكامل", "Goals fully documented")}</div></div></div>
        <div class="chips" style="margin:8px 0">${Object.keys(ALERTS).map((k) => `<span class="pill ${ALERTS[k].cls}">${esc(L(ALERTS[k]))}: ${m.by[k]}</span>`).join(" ")}${m.unconfirmed ? ` <span class="pill">${t("بانتظار المراجعة", "Awaiting review")}: ${m.unconfirmed}</span>` : ""}</div>
        <p class="hint">${t("التغطية تُحسب على مستوى الشهر وليس الجلسة الواحدة: عدم العمل على هدف في جلسة واحدة لا يُحسب على الأخصائي. الهدف غير المعالج بمبرر سريري موثّق يُستثنى من المقام.", "Coverage is judged over the month, not per session. A goal postponed for a documented clinical reason is excluded from the denominator.")}</p>
        ${m.perPlan.map((pp) => `<div class="table-wrap"><table class="t"><thead><tr><th colspan="5">${t("ملف", "File")} <span class="mono">${esc(pp.snap.file_no)}</span> — ${t("خطة", "plan")} ${esc(pp.snap.start)} ← ${esc(pp.snap.end)}</th></tr><tr><th>${t("الهدف", "Goal")}</th><th>${t("جلسات", "Sessions")}</th><th>${t("موثّق", "Documented")}</th><th>${t("الحالة", "State")}</th><th>${t("مبرر عدم المعالجة", "Reason if not addressed")}</th></tr></thead><tbody>
          ${pp.rows.map((r, gi) => `<tr><td><strong>G${gi + 1}</strong> ${esc(r.g.text)}</td><td>${r.alg}/${r.n}</td><td>${r.doc}</td><td><span class="pill ${ST[r.state][1]}">${ST[r.state][0]}</span></td>
            <td>${r.state === "covered" || r.state === "inactive" ? "" : `<input class="input sm" data-excl="${esc(pp.pid + ":" + r.g.key)}" value="${esc(r.reason)}" placeholder="${t("مثال: أولوية مؤجلة سريرياً", "e.g. clinically postponed")}">`}</td></tr>`).join("") || `<tr><td colspan="5" class="hint">${t("لا توجد أهداف في هذه الخطة.", "This plan has no goals.")}</td></tr>`}
        </tbody></table></div>`).join("") || `<div class="hint">${t("اختر خططاً للمراجعة.", "Select plans to review.")}</div>`}`;
    }
    function renderCat(c) {
      const box = main.querySelector(`[data-cat="${c.id}"]`);
      const m = c.id === "al" ? metrics(a) : null;
      box.innerHTML = (m ? `<div class="note-box" style="margin-bottom:10px">${t("مؤشرات محسوبة من الجلسات المعتمدة (للاسترشاد — الدرجة قرارك):", "Indicators from confirmed sessions (guidance only, the score is your decision):")} ${t("الجلسات المتوافقة", "aligned")} ${pct(m.aligned)} · ${t("التغطية", "coverage")} ${pct(m.coverage)} · ${t("الأهداف الموثّقة", "documented goals")} ${pct(m.docPct)}</div>` : "") +
        `<p class="hint">${t(`الدرجة من 0 إلى الحد الأعلى. «لا ينطبق» تُستثنى من المقام؛ الخانة الفارغة ليست «لا ينطبق».`, `Score from 0 to max. “N/A” is left out of the denominator; blank is not N/A.`)}</p>` +
        c.crit.map((k) => {
          const v = a.scores[k.id] || {};
          const opts = []; for (let i = 0; i <= k.max; i++) opts.push(String(i));
          return `<div class="qa-crit"><div class="qa-crit-h"><div class="grow">${esc(L(k))} <span class="hint">/${k.max}</span></div>
            <div class="chips">${opts.map((o) => `<button type="button" class="chip ${v.s === o ? "on" : ""}" data-crit="${k.id}" data-v="${o}">${o}</button>`).join("")}${k.na ? `<button type="button" class="chip ${v.s === "na" ? "on" : ""}" data-crit="${k.id}" data-v="na">${t("لا ينطبق", "N/A")}</button>` : ""}</div></div>
            <details ${v.c || v.e || v.r ? "open" : ""}><summary class="hint">${t("ملاحظات، دليل، توصية", "Comment, evidence, recommendation")}</summary><div class="grid cols-3">
              <input class="input sm" data-ck="${k.id}.c" value="${esc(v.c || "")}" placeholder="${t("ملاحظة المدقق", "Auditor comment")}">
              <input class="input sm" data-ck="${k.id}.e" value="${esc(v.e || "")}" placeholder="${t("الدليل / المرجع (مثل رقم الملف وتاريخ الجلسة)", "Evidence / reference (file no., session date)")}">
              <input class="input sm" data-ck="${k.id}.r" value="${esc(v.r || "")}" placeholder="${t("توصية التحسين", "Improvement recommendation")}"></div></details></div>`;
        }).join("");
    }
    function renderSum() {
      const weak = []; tpl.cats.forEach((c) => c.crit.forEach((k) => { const v = (a.scores[k.id] || {}).s; if (v !== "" && v != null && v !== "na" && Number(v) / k.max <= 0.5) weak.push(L(k)); }));
      const strong = []; tpl.cats.forEach((c) => c.crit.forEach((k) => { const v = (a.scores[k.id] || {}).s; if (v !== "" && v != null && v !== "na" && Number(v) === Number(k.max)) strong.push(L(k)); }));
      $("#b-sum").innerHTML = `<div class="grid cols-2">
        <div class="field"><label class="f">${t("نقاط القوة", "Strengths")}</label><textarea class="input" rows="4" data-k="strengths">${esc(a.strengths || "")}</textarea>
          ${strong.length ? `<div class="chips sugg-row">${strong.slice(0, 8).map((s) => `<button type="button" class="chip sugg" data-add="strengths" data-text="${esc(s)}">+ ${esc(s)}</button>`).join("")}</div>` : ""}</div>
        <div class="field"><label class="f">${t("مجالات تحتاج إلى تحسين", "Areas requiring improvement")}</label><textarea class="input" rows="4" data-k="improvements">${esc(a.improvements || "")}</textarea>
          ${weak.length ? `<div class="chips sugg-row">${weak.slice(0, 8).map((s) => `<button type="button" class="chip sugg" data-add="improvements" data-text="${esc(s)}">+ ${esc(s)}</button>`).join("")}</div>` : ""}</div></div>`;
    }
    function renderAct() {
      const crits = tpl.cats.flatMap((c) => c.crit.map((k) => ({ id: k.id, l: `${L(c)} — ${L(k)}` })));
      $("#b-act").innerHTML = locked ? `<div class="hint">${t("بعد الاعتماد تُتابَع الإجراءات من صفحة «الإجراءات التصحيحية».", "After submission, actions are followed in the Corrective actions page.")} <a href="#/quality/actions?audit=${id}">${t("فتح", "Open")}</a></div>` :
        `${a.actions.map((x, i) => `<div class="qa-act"><div class="grid cols-3">
          <input class="input sm" data-ak="${i}.issue" value="${esc(x.issue || "")}" placeholder="${t("المشكلة المحددة *", "Identified issue *")}">
          <select class="input sm" data-ak="${i}.crit"><option value="">${t("المعيار المرتبط", "Related criterion")}</option>${crits.map((c) => `<option value="${c.id}" ${x.crit === c.id ? "selected" : ""}>${esc(c.l)}</option>`).join("")}</select>
          <input class="input sm" data-ak="${i}.action" value="${esc(x.action || "")}" placeholder="${t("الإجراء المطلوب", "Required action")}">
          <select class="input sm" data-ak="${i}.kind"><option value="corrective" ${x.kind !== "training" ? "selected" : ""}>${t("إجراء تصحيحي", "Corrective action")}</option><option value="training" ${x.kind === "training" ? "selected" : ""}>${t("تدريب", "Training")}</option></select>
          <input class="input sm" data-ak="${i}.supervisor" value="${esc(x.supervisor || "")}" placeholder="${t("المشرف المسؤول", "Assigned supervisor")}">
          <label class="hint">${t("الموعد", "Due")} <input class="input sm" type="date" data-ak="${i}.due_date" value="${esc(x.due_date || "")}"></label></div>
          <button class="btn sm danger" data-adel="${i}">✕</button></div>`).join("")}
        <button class="btn" id="addA">+ ${t("إضافة إجراء", "Add action")}</button>
        <p class="hint">${t("الإجراءات تُرسل للأخصائي عند اعتماد التدقيق، ويتابعها المدير من صفحة الإجراءات التصحيحية.", "Actions reach the therapist when the audit is submitted; admins follow them in the actions page.")}</p>`;
      const add = $("#addA"); if (add) add.onclick = () => { a.actions.push({ issue: "", crit: "", action: "", kind: "corrective", supervisor: "", due_date: a.follow_up || "" }); dirty(); renderAct(); };
    }
    function renderRes() {
      const sc = score(tpl, a.scores), m = metrics(a);
      tpl.cats.forEach((c) => { const el = main.querySelector(`[data-catpct="${c.id}"]`); if (el) el.textContent = `${pct(sc.cat[c.id])} · ${sc.prog[c.id].n - sc.prog[c.id].b}/${sc.prog[c.id].n}`; });
      $("#b-res").innerHTML = `<div class="hint">${t("النتيجة الكلية", "Overall score")}${sc.complete ? "" : " " + t("(مؤقتة)", "(provisional)")}</div>
        <div class="qa-big">${pct(sc.total)}</div>${sc.complete ? clsPill(tpl, sc.total) : ""}
        <table class="t mini">${tpl.cats.map((c) => `<tr><td>${esc(L(c))}</td><td>${c.w}%</td><td><strong>${pct(sc.cat[c.id])}</strong></td></tr>`).join("")}</table>
        <div class="hint" style="margin-top:6px">${t("الملفات", "Files")}: ${a.files.length} · ${t("الخطط", "Plans")}: ${a.plans.length} · ${t("الجلسات", "Sessions")}: ${a.sessions.length}</div>
        ${sc.blank ? `<div class="hint" style="color:#B7791F">${t(`معايير بدون درجة: ${sc.blank}`, `Unscored criteria: ${sc.blank}`)}</div>` : ""}
        ${m.unconfirmed ? `<div class="hint" style="color:#B7791F">${t(`جلسات بانتظار مراجعتك: ${m.unconfirmed}`, `Sessions awaiting review: ${m.unconfirmed}`)}</div>` : ""}
        <div class="qa-btns">
          <button class="btn" id="saveD">${locked ? t("حفظ التصحيح", "Save correction") : t("حفظ كمسودة", "Save draft")}</button>
          ${locked ? "" : `<button class="btn primary" id="submitA">${t("اعتماد التدقيق", "Submit audit")}</button>`}
          ${id ? `<a class="btn" href="#/quality/a/${id}">${t("عرض التقرير", "View report")}</a>` : ""}
          ${id && !locked ? `<button class="btn danger" id="delA">${t("حذف المسودة", "Delete draft")}</button>` : ""}</div>`;
      $("#saveD").onclick = () => save(false);
      if ($("#submitA")) $("#submitA").onclick = () => save(true);
      if ($("#delA")) $("#delA").onclick = async () => { if (!confirm(t("حذف هذه المسودة نهائياً؟", "Delete this draft?"))) return; await pb.collection("qa_audits").delete(id); A.setDirty(false); A.toast(t("تم الحذف", "Deleted")); A.go("#/quality"); };
    }
    function renderAll() { renderHead(); renderFiles(); renderSess(); renderCov(); tpl.cats.forEach(renderCat); renderSum(); renderAct(); renderRes(); }
    renderAll();

    // ----- events
    main.addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.k) {
        a[el.dataset.k] = el.value; dirty();
        if (el.dataset.k === "center") { renderHead(); renderFiles(); }
        if (el.dataset.k === "therapist") { a.files = []; a.plans = []; renderHead(); renderFiles(); renderSess(); renderCov(); }
        if (el.dataset.k === "month") { renderHead(); renderFiles(); }
        renderRes(); return;
      }
      if (el.dataset.file) {
        const pid = el.dataset.file;
        if (el.checked) { if (!a.files.includes(pid)) a.files.push(pid); plansOf(pid).slice(0, 1).forEach((pl) => { if (!a.plans.includes(pl.id)) { a.plans.push(pl.id); snapPlan(pl); } }); }
        else { a.files = a.files.filter((x) => x !== pid); a.plans = a.plans.filter((x) => (a.plan_snap[x] || {}).patient !== pid); }
        dirty(); renderFiles(); renderSess(); renderCov(); renderRes(); return;
      }
      if (el.dataset.plan) {
        const pl = plById(el.dataset.plan);
        if (el.checked) { if (!a.plans.includes(pl.id)) a.plans.push(pl.id); snapPlan(pl); } else a.plans = a.plans.filter((x) => x !== pl.id);
        dirty(); renderFiles(); renderSess(); renderCov(); renderRes(); return;
      }
      if (el.dataset.sk) {
        const [i, k] = el.dataset.sk.split("."); a.sessions[i][k] = el.value;
        if (k === "plan") a.sessions[i].goals = [];
        dirty(); if (k !== "comment" && k !== "text") { renderSess(); renderCov(); renderCat(tpl.cats.find((c) => c.id === "al") || tpl.cats[0]); renderRes(); } else if (k === "text") renderSess();
        return;
      }
      if (el.dataset.sconf) { a.sessions[el.dataset.sconf].confirmed = el.checked; if (el.checked && !a.sessions[el.dataset.sconf].status) a.sessions[el.dataset.sconf].status = suggestStatus(a, a.sessions[el.dataset.sconf]); dirty(); renderSess(); renderCov(); renderRes(); return; }
      if (el.dataset.excl) { a.excl[el.dataset.excl] = el.value; dirty(); renderCov(); renderRes(); return; }
      if (el.dataset.ak) { const [i, k] = el.dataset.ak.split("."); a.actions[i][k] = el.value; dirty(); return; }
    });
    main.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.ck) { const [k, f] = el.dataset.ck.split("."); a.scores[k] = a.scores[k] || {}; a.scores[k][f] = el.value; dirty(); }
      else if (el.dataset.k && el.tagName === "TEXTAREA") { a[el.dataset.k] = el.value; dirty(); }
      else if (el.dataset.ak) { const [i, k] = el.dataset.ak.split("."); a.actions[i][k] = el.value; dirty(); }
      else if (el.dataset.sk && /\.(comment|text)$/.test(el.dataset.sk)) { const [i, k] = el.dataset.sk.split("."); a.sessions[i][k] = el.value; dirty(); }
    });
    main.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.crit) { const k = b.dataset.crit; a.scores[k] = a.scores[k] || {}; a.scores[k].s = a.scores[k].s === b.dataset.v ? "" : b.dataset.v; dirty(); renderCat(tpl.cats.find((c) => c.crit.some((x) => x.id === k))); renderSum(); renderRes(); return; }
      if (b.dataset.sgoal != null) { const s = a.sessions[b.dataset.sgoal]; s.goals = s.goals || []; const i = s.goals.indexOf(b.dataset.key); if (i >= 0) s.goals.splice(i, 1); else s.goals.push(b.dataset.key); if (s.confirmed) s.status = ""; s.confirmed = false; dirty(); renderSess(); renderCov(); renderRes(); return; }
      if (b.dataset.saccept != null) { const s = a.sessions[b.dataset.saccept]; s.status = suggestStatus(a, s); s.confirmed = true; dirty(); renderSess(); renderCov(); renderRes(); return; }
      if (b.dataset.sdel != null) { a.sessions.splice(Number(b.dataset.sdel), 1); dirty(); renderSess(); renderCov(); renderRes(); return; }
      if (b.dataset.adel != null) { a.actions.splice(Number(b.dataset.adel), 1); dirty(); renderAct(); return; }
      if (b.dataset.add) { const k = b.dataset.add; a[k] = ((a[k] || "").trim() ? a[k].trim() + "\n" : "") + "- " + b.dataset.text; dirty(); renderSum(); return; }
    });

    async function save(submit) {
      const sc = score(tpl, a.scores), m = metrics(a);
      if (!a.therapist || !a.month) { A.toast(t("اختر الأخصائي وشهر التدقيق.", "Choose the therapist and month."), true); return; }
      if (submit || locked) {
        const miss = [];
        if (!a.files.length) miss.push(t("ملف واحد على الأقل", "at least one file"));
        if (!sc.complete) miss.push(t(`درجة لكل معيار أو «لا ينطبق» (${sc.blank} ناقص)`, `a score or N/A for every criterion (${sc.blank} missing)`));
        if (m.unconfirmed) miss.push(t(`مراجعة كل الجلسات (${m.unconfirmed})`, `review every session (${m.unconfirmed})`));
        if (submit && a.actions.some((x) => !String(x.issue || "").trim())) miss.push(t("المشكلة لكل إجراء تصحيحي", "the issue of each corrective action"));
        if (miss.length) { A.toast(t("قبل الاعتماد ينقص: ", "Before submitting, missing: ") + miss.join(" · "), true); return; }
      }
      let reason = "";
      if (locked) {
        reason = await new Promise((res) => {
          const md = A.modal(t("سبب التصحيح", "Correction reason"), `<p class="hint">${t("التدقيق معتمد. اكتب سبب التصحيح، وسيُحفظ في سجل التدقيق.", "This audit is submitted. Write the reason; it is kept in the audit trail.")}</p><textarea class="input" rows="3" id="why"></textarea>`,
            { okText: t("حفظ التصحيح", "Save correction"), onOk: (r) => { const v = r.querySelector("#why").value.trim(); if (!v) { A.toast(t("السبب مطلوب", "Reason required"), true); return false; } res(v); } });
          md.querySelectorAll("[data-x]").forEach((x) => x.addEventListener("click", () => res("")));
        });
        if (!reason) return;
      }
      if (submit && !confirm(t("بعد الاعتماد يُقفل التدقيق ويظهر للأخصائي، وأي تعديل لاحق يحتاج سبب تصحيح موثّق. اعتماد؟", "After submission the audit is locked and shown to the therapist; later changes need a documented reason. Submit?"))) return;
      const cls = clsOf(tpl, sc.total);
      const payload = { therapist: a.therapist, center: a.center, month: a.month, audit_date: a.audit_date, follow_up: a.follow_up, files: a.files, plans: a.plans, plan_snap: Object.fromEntries(a.plans.map((p) => [p, a.plan_snap[p]]).filter((x) => x[1])),
        scores: a.scores, sessions: a.sessions, excl: a.excl, strengths: a.strengths, improvements: a.improvements, actions: locked ? (rec.actions || []) : a.actions, tpl,
        total: sc.total, cat: sc.cat, cls: cls ? cls.ar : "", status: submit || locked ? "submitted" : "draft",
        metrics: { aligned: m.aligned, coverage: m.coverage, docPct: m.docPct, by: m.by, sessions: m.total, active: m.active, addressed: m.addressed, excluded: m.excluded },
        counts: { files: a.files.length, plans: a.plans.length, sessions: a.sessions.length } };
      if (reason) payload.correction_reason = reason;
      try {
        const saved = id ? await pb.collection("qa_audits").update(id, payload) : await pb.collection("qa_audits").create(payload);
        if (submit) {
          for (const x of a.actions) await pb.collection("qa_actions").create({ audit: saved.id, therapist: a.therapist, issue: x.issue, crit: x.crit, action: x.action, kind: x.kind || "corrective", supervisor: x.supervisor, due_date: x.due_date, status: "open", month: a.month });
        }
        A.setDirty(false);
        A.toast(submit ? t("تم اعتماد التدقيق ✓", "Audit submitted ✓") : locked ? t("تم حفظ التصحيح وتسجيله ✓", "Correction saved and logged ✓") : t("تم حفظ المسودة ✓", "Draft saved ✓"));
        A.go(submit || locked ? `#/quality/a/${saved.id}` : `#/quality/a/${saved.id}?edit=1`);
      } catch (err) { A.toast(A.errText(err), true); }
    }
  }

  // ------------------------------------------------------------------ read-only audit view (admin + the therapist himself)
  async function pageView(id) {
    const A = X(), pb = A.pb;
    const main = A.shell("quality", `<div class="empty">${t("جاري التحميل…", "Loading…")}</div>`);
    const a = await pb.collection("qa_audits").getOne(id);
    const [acts, prevList] = await Promise.all([loadActions(pb.filter("audit = {:a}", { a: id })), loadAudits(pb.filter("therapist = {:t} && status = \"submitted\"", { t: a.therapist }))]);
    const tpl = a.tpl || tplNow();
    const prev = prevList.filter((x) => x.month < a.month).sort((x, y) => (x.month < y.month ? 1 : -1))[0];
    const diff = prev && a.total != null ? r1(a.total - prev.total) : null;
    const m = a.metrics || {};
    const scoreCell = (k) => { const v = (a.scores || {})[k.id] || {}; return v.s === "na" ? t("لا ينطبق", "N/A") : v.s === "" || v.s == null ? "—" : `${v.s}/${k.max}`; };
    main.innerHTML = `
      <div class="crumbs">${A.isAdmin() ? `<a href="#/quality">${t("الجودة والتدقيق", "Quality")}</a> / <a href="#/quality/t/${a.therapist}">${esc(tName(a.therapist))}</a>` : `<a href="#/quality/me">${t("نتائج التدقيق", "My audit results")}</a>`} / ${esc(mLabel(a.month))}</div>
      <div class="page-head"><h1 class="grow">${t("تقرير التدقيق الشهري", "Monthly audit report")} — ${esc(tName(a.therapist))}</h1>
        ${a.status === "submitted" ? `<span class="pill ok">${t("معتمد", "Submitted")}</span>` : `<span class="pill warn">${t("مسودة", "Draft")}</span>`}
        <button class="btn" id="pdfB">PDF</button>${A.isAdmin() ? `<button class="btn" id="docB">Word</button>` : ""}
        ${A.isAdmin() ? `<a class="btn ${a.status === "draft" ? "primary" : ""}" href="#/quality/a/${id}?edit=1">${a.status === "draft" ? t("متابعة التدقيق", "Continue audit") : t("تصحيح موثّق", "Documented correction")}</a>` : ""}</div>
      <div class="qa-kpis">
        <div class="panel kpi"><div class="panel-body"><div class="kv">${pct(a.total)}</div><div class="kl">${t("النتيجة الكلية", "Overall score")}</div><div>${clsPill(tpl, a.total)}</div></div></div>
        <div class="panel kpi"><div class="panel-body"><div class="kv">${prev ? pct(prev.total) : "—"}</div><div class="kl">${t("الشهر السابق", "Previous audit")}${prev ? ` (${esc(mLabel(prev.month))})` : ""}</div></div></div>
        <div class="panel kpi ${diff == null ? "" : diff >= 0 ? "ok" : "warn"}"><div class="panel-body"><div class="kv">${diff == null ? "—" : (diff > 0 ? "+" : "") + diff}</div><div class="kl">${t("التغيّر", "Change")}</div></div></div>
        <div class="panel kpi"><div class="panel-body"><div class="kv">${(a.counts || {}).files || 0} / ${(a.counts || {}).plans || 0} / ${(a.counts || {}).sessions || 0}</div><div class="kl">${t("ملفات / خطط / جلسات مراجعة", "Files / plans / sessions reviewed")}</div></div></div>
      </div>
      <div class="grid cols-2" style="margin-top:14px">
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("النتيجة حسب المحور", "Score by category")}</h2></div><div class="panel-body">${barChart(tpl.cats.map((c) => ({ label: `${L(c)} (${c.w}%)`, values: [{ v: (a.cat || {})[c.id], color: (clsOf(tpl, (a.cat || {})[c.id]) || {}).color }] })))}</div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("توافق الجلسات مع الخطة", "Plan–session alignment")}</h2></div><div class="panel-body">
          <div>${t("الجلسات المتوافقة", "Aligned sessions")}: <strong>${pct(m.aligned)}</strong> · ${t("تغطية الأهداف النشطة", "Active goal coverage")}: <strong>${pct(m.coverage)}</strong> (${m.addressed || 0}/${m.active || 0}) · ${t("موثّقة بالكامل", "fully documented")}: <strong>${pct(m.docPct)}</strong></div>
          <div class="chips" style="margin-top:8px">${Object.keys(ALERTS).map((k) => `<span class="pill ${ALERTS[k].cls}">${esc(L(ALERTS[k]))}: ${(m.by || {})[k] || 0}</span>`).join(" ")}</div>
          <div class="hint" style="margin-top:6px">${t("كل تنبيه هنا راجعه المدقق واعتمده قبل احتسابه.", "Every alert here was reviewed and confirmed by the auditor.")}</div></div></div>
      </div>
      ${tpl.cats.map((c) => `<div class="panel" style="margin-top:14px"><div class="panel-head"><h2 class="grow">${esc(L(c))}</h2><span class="pill">${pct((a.cat || {})[c.id])}</span></div><div class="table-wrap"><table class="t"><thead><tr><th>${t("المعيار", "Criterion")}</th><th>${t("الدرجة", "Score")}</th><th>${t("ملاحظة المدقق", "Auditor comment")}</th><th>${t("الدليل", "Evidence")}</th><th>${t("التوصية", "Recommendation")}</th></tr></thead><tbody>
        ${c.crit.map((k) => { const v = (a.scores || {})[k.id] || {}; return `<tr><td>${esc(L(k))}</td><td class="nowrap"><strong>${scoreCell(k)}</strong></td><td>${esc(v.c || "")}</td><td>${esc(v.e || "")}</td><td>${esc(v.r || "")}</td></tr>`; }).join("")}</tbody></table></div></div>`).join("")}
      <div class="grid cols-2" style="margin-top:14px">
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("نقاط القوة", "Strengths")}</h2></div><div class="panel-body pre">${esc(a.strengths || "—")}</div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("مجالات تحتاج إلى تحسين", "Areas requiring improvement")}</h2></div><div class="panel-body pre">${esc(a.improvements || "—")}</div></div></div>
      <div class="panel" style="margin-top:14px"><div class="panel-head"><h2 class="grow">${t("خطة الإجراءات التصحيحية", "Corrective action plan")}</h2>${A.isAdmin() ? `<a class="btn sm" href="#/quality/actions">${t("إدارة الإجراءات", "Manage actions")}</a>` : ""}</div><div class="table-wrap"><table class="t"><thead><tr><th>${t("المشكلة", "Issue")}</th><th>${t("الإجراء المطلوب", "Required action")}</th><th>${t("المشرف", "Supervisor")}</th><th>${t("الموعد", "Due")}</th><th>${t("الحالة", "Status")}</th></tr></thead><tbody>
        ${(acts.length ? acts : (a.actions || []).map((x) => ({ ...x, status: "open" }))).map((x) => `<tr><td>${esc(x.issue)}</td><td>${esc(x.action || "")}</td><td>${esc(x.supervisor || "")}</td><td class="nowrap">${esc(String(x.due_date || "").slice(0, 10))}</td><td>${actPill(x)}</td></tr>`).join("") || `<tr><td colspan="5" class="hint">${t("لا توجد إجراءات.", "No actions.")}</td></tr>`}</tbody></table></div></div>
      <div class="panel" style="margin-top:14px"><div class="panel-body hint">${t("المدقق", "Auditor")}: ${esc(a.auditor_name || "")} · ${t("تاريخ التدقيق", "Audit date")}: ${esc(a.audit_date || "")} · ${t("موعد المتابعة", "Follow-up")}: ${esc(a.follow_up || "")}
        ${(a.history || []).length ? `<div style="margin-top:8px"><strong>${t("سجل التدقيق", "Audit trail")}:</strong>${a.history.map((h) => `<div>• ${esc(String(h.at || "").slice(0, 16).replace("T", " "))} — ${esc(h.by)}: ${h.action === "submit" ? t("اعتماد", "submitted") + ` (${pct(h.total)})` : t("تصحيح", "correction") + ` «${esc(h.reason)}» (${pct(h.before)} ← ${pct(h.after)})`}</div>`).join("")}</div>` : ""}</div></div>`;
    const doExport = (fmt) => A.exportDoc(fmt, reportText(a, prev, prevList, acts), A.UI, a.center, `Audit_${tName(a.therapist)}_${a.month}`, { collection: "qa_audits", id: a.id });
    main.querySelector("#pdfB").onclick = () => doExport("pdf");
    if (main.querySelector("#docB")) main.querySelector("#docB").onclick = () => doExport("docx");
  }

  // report markup for Word / PDF (center letterhead + auditor signature). File numbers only, no child names.
  function reportText(a, prev, hist, acts) {
    const A = X(), en = A.UI === "en", tpl = a.tpl || tplNow(), m = a.metrics || {};
    const c = A.centerById(a.center) || {};
    const cls = clsOf(tpl, a.total);
    const u = (A.S.therapists || []).find((x) => x.id === a.therapist) || {};
    const cell = (s) => String(s == null ? "" : s).replace(/\|/g, "/").replace(/\r?\n/g, " ");
    const sc = (k) => { const v = (a.scores || {})[k.id] || {}; return v.s === "na" ? (en ? "N/A" : "لا ينطبق") : v.s === "" || v.s == null ? "—" : `${v.s}/${k.max}`; };
    const o = [];
    o.push("# " + (en ? "Monthly Documentation Audit Report" : "تقرير التدقيق الشهري لجودة التوثيق"));
    o.push("^^ " + (en ? (c.name_en || c.name_ar || "") : (c.name_ar || "")), "", "::info4");
    o.push(`${en ? "Therapist" : "الأخصائي"}: ${tName(a.therapist)}`, `${en ? "Department / branch" : "القسم / الفرع"}: ${tpl.department || ""} / ${A.shortCenter(c, A.UI)}`,
      `${en ? "Audit month" : "شهر التدقيق"}: ${mLabel(a.month)}`, `${en ? "Auditor" : "المدقق"}: ${a.auditor_name || ""}`,
      `${en ? "Audit date" : "تاريخ التدقيق"}: ${a.audit_date || ""}`, `${en ? "Follow-up date" : "موعد المتابعة"}: ${a.follow_up || ""}`,
      `${en ? "Overall score" : "النتيجة الكلية"}: ${pct(a.total)}${cls ? " — " + L(cls) : ""}`, `${en ? "Previous audit" : "التدقيق السابق"}: ${prev ? `${pct(prev.total)} (${mLabel(prev.month)})` : "—"}`,
      `${en ? "Change" : "التغيّر"}: ${prev && a.total != null ? ((a.total - prev.total > 0 ? "+" : "") + r1(a.total - prev.total)) : "—"}`, `${en ? "Employee ID" : "الرقم الوظيفي"}: ${u.employee_id || ""}`);
    o.push("", "## " + (en ? "Performance by category" : "النتيجة حسب المحور"));
    o.push(en ? "| Category | Weight | Score |" : "| المحور | الوزن | النتيجة |");
    tpl.cats.forEach((cc) => o.push(`| ${cell(L(cc))} | ${cc.w}% | ${pct((a.cat || {})[cc.id])} |`));
    o.push(`| **${en ? "Overall (weighted)" : "المجموع (موزون)"}** | 100% | **${pct(a.total)}** |`);
    o.push("", "## " + (en ? "Scope of review" : "نطاق المراجعة"));
    o.push(`- ${en ? "Files reviewed" : "عدد الملفات المراجعة"}: ${(a.counts || {}).files || 0}`, `- ${en ? "Treatment plans reviewed" : "عدد الخطط المراجعة"}: ${(a.counts || {}).plans || 0}`, `- ${en ? "Session notes reviewed" : "عدد ملاحظات الجلسات المراجعة"}: ${(a.counts || {}).sessions || 0}`);
    const files = Object.values(a.plan_snap || {}).map((p) => p.file_no).filter(Boolean);
    if (files.length) o.push(`- ${en ? "File numbers" : "أرقام الملفات"}: ${[...new Set(files)].join(", ")}`);
    tpl.cats.forEach((cc) => {
      o.push("", `## ${L(cc)} — ${pct((a.cat || {})[cc.id])}`);
      if (cc.id === "al") o.push(en ? `Aligned sessions ${pct(m.aligned)} · active goal coverage ${pct(m.coverage)} (${m.addressed || 0}/${m.active || 0}) · fully documented goals ${pct(m.docPct)}. Alerts (auditor-confirmed): ${Object.keys(ALERTS).map((k) => `${ALERTS[k].en} ${(m.by || {})[k] || 0}`).join(", ")}.`
        : `الجلسات المتوافقة ${pct(m.aligned)} · تغطية الأهداف النشطة ${pct(m.coverage)} (${m.addressed || 0}/${m.active || 0}) · أهداف موثّقة بالكامل ${pct(m.docPct)}. التنبيهات (معتمدة من المدقق): ${Object.keys(ALERTS).map((k) => `${ALERTS[k].ar} ${(m.by || {})[k] || 0}`).join("، ")}.`);
      o.push(en ? "| Criterion | Score | Findings | Recommendation |" : "| المعيار | الدرجة | الملاحظات | التوصية |");
      cc.crit.forEach((k) => { const v = (a.scores || {})[k.id] || {}; o.push(`| ${cell(L(k))} | ${sc(k)} | ${cell([v.c, v.e && (en ? "Evidence: " : "الدليل: ") + v.e].filter(Boolean).join(" — "))} | ${cell(v.r || "")} |`); });
    });
    const lines = (s) => String(s || "").split(/\r?\n/).map((x) => x.replace(/^[-•]\s*/, "").trim()).filter(Boolean);
    o.push("", "## " + (en ? "Strengths" : "نقاط القوة")); (lines(a.strengths).length ? lines(a.strengths) : ["—"]).forEach((x) => o.push("- " + x));
    o.push("", "## " + (en ? "Areas requiring improvement" : "مجالات تحتاج إلى تحسين")); (lines(a.improvements).length ? lines(a.improvements) : ["—"]).forEach((x) => o.push("- " + x));
    const al = acts && acts.length ? acts : (a.actions || []).map((x) => ({ ...x, status: "open" }));
    o.push("", "## " + (en ? "Corrective action plan" : "خطة الإجراءات التصحيحية"));
    if (al.length) {
      o.push(en ? "| Issue | Required action | Supervisor | Due | Status |" : "| المشكلة | الإجراء المطلوب | المشرف | الموعد | الحالة |");
      al.forEach((x) => o.push(`| ${cell(x.issue)} | ${cell(x.action)} | ${cell(x.supervisor)} | ${String(x.due_date || "").slice(0, 10)} | ${overdue(x) ? (en ? "Overdue" : "متأخر") : L(ACT_ST[x.status] || ACT_ST.open)} |`));
    } else o.push(en ? "No corrective actions required." : "لا توجد إجراءات تصحيحية مطلوبة.");
    const h = (hist || []).filter((x) => x.month <= a.month).sort((x, y) => (x.month < y.month ? -1 : 1)).slice(-12);
    if (h.length) { o.push("", "## " + (en ? "Historical performance" : "الأداء التاريخي"), "::bars"); h.forEach((x) => o.push(`${mLabel(x.month)}: ${x.total ?? 0}`)); }
    o.push("", en ? "| Role | Name | Signature |" : "| الصفة | الاسم | التوقيع |");
    o.push(en ? `| Auditor | ${a.auditor_name || ""} | [[SIG]] |` : `| المدقق | ${a.auditor_name || ""} | [[SIG]] |`);
    o.push(en ? `| Therapist (acknowledged) | ${tName(a.therapist)} |  |` : `| الأخصائي (اطّلع) | ${tName(a.therapist)} |  |`);
    return o.join("\n");
  }

  // ------------------------------------------------------------------ therapist performance profile
  async function pageProfile(uid) {
    const A = X(), pb = A.pb, me = A.S.me;
    const self = uid === me.id;
    const main = A.shell("quality", `<div class="empty">${t("جاري التحميل…", "Loading…")}</div>`);
    const [audits, acts, stats, user] = await Promise.all([
      loadAudits(pb.filter("therapist = {:t}", { t: uid })), loadActions(pb.filter("therapist = {:t}", { t: uid })),
      pb.qaStats(A.isAdmin() ? { therapist: uid } : {}), pb.collection("users").getOne(uid).catch(() => ({})),
    ]);
    const q = A.qs(), period = Number(q.p) || 12, months = monthsBack(period);
    const sub = audits.filter((a) => a.status === "submitted").sort((x, y) => (x.month < y.month ? -1 : 1));
    const tpl = (sub[sub.length - 1] || {}).tpl || tplNow();
    const last = sub[sub.length - 1], prev = sub[sub.length - 2];
    const own = {}, dept = {}; sub.forEach((a) => { own[a.month] = a.total; }); Object.keys(stats.dept || {}).forEach((m) => { dept[m] = stats.dept[m].avg; });
    // repeated issues: criteria at or below 50% in 2+ submitted audits
    const rep = {}; sub.forEach((a) => (a.tpl || tpl).cats.forEach((c) => c.crit.forEach((k) => { const v = ((a.scores || {})[k.id] || {}).s; if (v !== "" && v != null && v !== "na" && Number(v) / k.max <= 0.5) { rep[k.id] = rep[k.id] || { l: L(k), n: 0, months: [] }; rep[k.id].n++; rep[k.id].months.push(a.month); } })));
    const repeated = Object.values(rep).filter((x) => x.n >= 2).sort((x, y) => y.n - x.n);
    const open = acts.filter((x) => x.status !== "done"), training = acts.filter((x) => x.kind === "training" && x.status === "done");
    const diff = last && prev ? r1(last.total - prev.total) : null;
    const deptLast = last ? (stats.dept[last.month] || {}).cats || {} : {};
    // before / after a completed action: category score in its audit vs the next audit after completion
    const beforeAfter = acts.filter((x) => x.status === "done").map((x) => {
      const base = sub.find((a) => a.id === x.audit), cat = (tpl.cats.find((c) => c.crit.some((k) => k.id === x.crit)) || {}).id;
      const after = sub.find((a) => a.month > (base ? base.month : "") && (!x.completed_at || a.month >= String(x.completed_at).slice(0, 7)));
      const sc = (a) => (a ? (cat ? (a.cat || {})[cat] : a.total) : null);
      return { x, before: sc(base), after: sc(after), am: after && after.month };
    });
    main.innerHTML = `
      ${A.isAdmin() ? `<div class="crumbs"><a href="#/quality">${t("الجودة والتدقيق", "Quality")}</a> / ${esc(tName(uid))}</div>` : ""}
      <div class="page-head"><div class="grow"><h1>${self && !A.isAdmin() ? t("نتائج التدقيق الخاصة بي", "My audit results") : t("ملف الأداء", "Performance profile") + " — " + esc(tName(uid))}</h1>
        <div class="muted">${[user.job_title, user.department || tpl.department, user.employee_id && t("الرقم الوظيفي ", "ID ") + user.employee_id, user.join_date && t("التحق ", "joined ") + String(user.join_date).slice(0, 10), user.supervisor_name && t("المشرف: ", "Supervisor: ") + user.supervisor_name, user.employment_status].filter(Boolean).map(esc).join(" · ")}</div></div>
        <select class="input" id="fp" style="width:auto"><option value="6" ${period === 6 ? "selected" : ""}>${t("آخر 6 أشهر", "Last 6 months")}</option><option value="12" ${period === 12 ? "selected" : ""}>${t("آخر 12 شهراً", "Last 12 months")}</option></select></div>
      ${!A.isAdmin() ? `<div class="note-box" style="margin-bottom:12px">${t("هذه الصفحة لك وحدك: نتائجك، ملاحظات المدقق، والإجراءات المطلوبة منك. المقارنة مع القسم بالمتوسط فقط ولا تظهر نتائج أي زميل. أي تعديل على التدقيق يتم من الإدارة.", "This page is yours only: your results, the auditor's feedback and your actions. The department comparison is an average only; no colleague's results are shown. Audits are edited by admins only.")}</div>` : ""}
      ${sub.length ? `<div class="qa-kpis">
        <div class="panel kpi"><div class="panel-body"><div class="kv">${pct(last.total)}</div><div class="kl">${t("آخر نتيجة", "Latest score")} (${esc(mLabel(last.month))})</div><div>${clsPill(tpl, last.total)}</div></div></div>
        <div class="panel kpi ${diff == null ? "" : diff >= 0 ? "ok" : "warn"}"><div class="panel-body"><div class="kv">${diff == null ? "—" : (diff > 0 ? "▲ +" : diff < 0 ? "▼ " : "") + diff}</div><div class="kl">${t("مقارنة بالتدقيق السابق", "vs previous audit")}</div></div></div>
        <div class="panel kpi"><div class="panel-body"><div class="kv">${pct((stats.dept[last.month] || {}).avg)}</div><div class="kl">${t("متوسط القسم لنفس الشهر", "Department average, same month")}</div></div></div>
        <div class="panel kpi ${open.some(overdue) ? "danger" : open.length ? "warn" : ""}"><div class="panel-body"><div class="kv">${open.length}</div><div class="kl">${t("إجراءات مطلوبة لم تكتمل", "Outstanding actions")}</div></div></div></div>` :
        `<div class="panel empty">${t("لا توجد تدقيقات معتمدة بعد.", "No submitted audits yet.")}</div>`}
      ${sub.length ? `<div class="grid cols-2" style="margin-top:14px">
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("اتجاه النتيجة", "Score trend")}</h2></div><div class="panel-body">${lineChart([{ name: self && !A.isAdmin() ? t("نتيجتي", "My score") : tName(uid), values: own }, { name: t("متوسط القسم", "Department average"), values: dept, color: "#5A6B7B", dash: true }], months)}</div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("آخر تدقيق حسب المحور مقابل متوسط القسم", "Latest audit by category vs department")}</h2></div><div class="panel-body">${barChart(tpl.cats.map((c) => ({ label: L(c), values: [{ v: (last.cat || {})[c.id], color: PALETTE[0], name: t("النتيجة", "Score") }, { v: deptLast[c.id] ?? null, color: "#A9B4BD", name: t("القسم", "Department") }] })), { legend: [{ name: self && !A.isAdmin() ? t("نتيجتي", "Mine") : tName(uid), color: PALETTE[0] }, { name: t("متوسط القسم", "Department average"), color: "#A9B4BD" }] })}</div></div></div>` : ""}
      <div class="grid cols-2" style="margin-top:14px">
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("ملاحظات متكررة", "Repeated documentation issues")}</h2></div><div class="panel-body">${repeated.length ? repeated.map((r) => `<div>• ${esc(r.l)} <span class="pill warn">${r.n}×</span> <span class="hint">${r.months.map((m) => esc(mLabel(m))).join("، ")}</span></div>`).join("") : `<div class="hint">${t("لا توجد ملاحظات تكررت في أكثر من تدقيق.", "No issue repeated across audits.")}</div>`}</div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow">${t("الإجراءات والتدريب", "Actions and training")}</h2></div><div class="panel-body">
          ${acts.length ? acts.map((x) => `<div style="margin-bottom:6px">${actPill(x)} ${x.kind === "training" ? `<span class="pill info">${t("تدريب", "Training")}</span>` : ""} <strong>${esc(x.issue)}</strong>${x.action ? ` — ${esc(x.action)}` : ""} <span class="hint">${t("الموعد", "due")} ${esc(String(x.due_date || "").slice(0, 10))}</span></div>`).join("") : `<div class="hint">${t("لا توجد إجراءات.", "No actions.")}</div>`}
          ${training.length ? `<div class="hint" style="margin-top:6px">${t("تدريبات مكتملة:", "Completed training:")} ${training.map((x) => esc(x.action || x.issue)).join("، ")}</div>` : ""}
          ${beforeAfter.length ? `<div style="margin-top:10px"><strong>${t("قبل وبعد الإجراء", "Before & after")}</strong>${beforeAfter.map((b) => `<div class="hint">• ${esc(b.x.issue)}: ${pct(b.before)} ← ${b.after == null ? t("بانتظار التدقيق التالي", "awaiting next audit") : pct(b.after) + ` (${esc(mLabel(b.am))})`}</div>`).join("")}</div>` : ""}</div></div></div>
      <div class="panel" style="margin-top:14px"><div class="panel-head"><h2 class="grow">${t("سجل التدقيقات", "Audit history")}</h2></div><div class="table-wrap"><table class="t"><thead><tr><th>${t("الشهر", "Month")}</th><th>${t("النتيجة", "Score")}</th>${tpl.cats.map((c) => `<th>${esc(L(c))}</th>`).join("")}<th>${t("التصنيف", "Class")}</th></tr></thead><tbody>
        ${(A.isAdmin() ? audits : sub).slice().sort((x, y) => (x.month < y.month ? 1 : -1)).map((a) => `<tr><td><a href="#/quality/a/${a.id}">${esc(mLabel(a.month))}</a>${a.status === "draft" ? ` <span class="pill warn">${t("مسودة", "Draft")}</span>` : ""}</td><td><strong>${pct(a.total)}</strong></td>${tpl.cats.map((c) => `<td>${pct((a.cat || {})[c.id])}</td>`).join("")}<td>${a.status === "submitted" ? clsPill(a.tpl || tpl, a.total) : ""}</td></tr>`).join("") || `<tr><td colspan="${tpl.cats.length + 3}" class="empty">—</td></tr>`}</tbody></table></div></div>`;
    main.querySelector("#fp").onchange = (e) => A.go(`#/quality/${A.isAdmin() && !self ? "t/" + uid : "me"}?p=${e.target.value}`);
  }

  // ------------------------------------------------------------------ corrective actions (CAPA)
  async function pageActions() {
    const A = X(), pb = A.pb, q = A.qs();
    const main = A.shell("quality", `<div class="empty">${t("جاري التحميل…", "Loading…")}</div>`);
    const [acts, audits] = await Promise.all([loadActions(), loadAudits('status = "submitted"')]);
    const st = q.s || "", th = q.th || "";
    const rows = acts.filter((x) => (!st || (st === "overdue" ? overdue(x) : x.status === st)) && (!th || x.therapist === th) && (!q.audit || x.audit === q.audit))
      .filter((x) => !A.S.centerFilter || (A.S.therapists.find((u) => u.id === x.therapist) || { centers: [] }).centers.includes(A.S.centerFilter));
    const nextAfter = (x) => { const base = audits.find((a) => a.id === x.audit); return audits.filter((a) => a.therapist === x.therapist && base && a.month > base.month).sort((a, b) => (a.month < b.month ? -1 : 1))[0]; };
    main.innerHTML = `<div class="page-head"><h1 class="grow">${t("الإجراءات التصحيحية والوقائية", "Corrective & preventive actions")}</h1></div>${tabs("actions")}
      <div class="panel" style="margin:12px 0"><div class="panel-body qa-filters">
        <label>${t("الحالة", "Status")} <select class="input" id="fs"><option value="">${t("الكل", "All")}</option>${Object.keys(ACT_ST).map((k) => `<option value="${k}" ${st === k ? "selected" : ""}>${esc(L(ACT_ST[k]))}</option>`).join("")}<option value="overdue" ${st === "overdue" ? "selected" : ""}>${t("متأخر", "Overdue")}</option></select></label>
        <label>${t("الأخصائي", "Therapist")} <select class="input" id="ft"><option value="">${t("الكل", "All")}</option>${(A.S.therapists || []).map((u) => `<option value="${u.id}" ${th === u.id ? "selected" : ""}>${esc(tName(u.id))}</option>`).join("")}</select></label></div></div>
      <div class="panel"><div class="table-wrap"><table class="t"><thead><tr><th>${t("الأخصائي", "Therapist")}</th><th>${t("المشكلة", "Issue")}</th><th>${t("الإجراء", "Action")}</th><th>${t("المشرف", "Supervisor")}</th><th>${t("الموعد", "Due")}</th><th>${t("الحالة", "Status")}</th><th>${t("دليل الإنجاز", "Evidence")}</th><th>${t("نتيجة المتابعة", "Follow-up result")}</th><th></th></tr></thead><tbody>
      ${rows.map((x) => { const base = audits.find((a) => a.id === x.audit), nx = nextAfter(x); return `<tr class="${overdue(x) ? "row-bad" : ""}"><td><a href="#/quality/t/${x.therapist}">${esc(tName(x.therapist))}</a>${base ? `<div class="hint"><a href="#/quality/a/${base.id}">${esc(mLabel(base.month))}</a></div>` : ""}</td><td>${esc(x.issue)}${x.kind === "training" ? ` <span class="pill info">${t("تدريب", "Training")}</span>` : ""}</td><td>${esc(x.action || "")}</td><td>${esc(x.supervisor || "")}</td>
        <td class="nowrap">${esc(String(x.due_date || "").slice(0, 10))}</td><td>${actPill(x)}</td><td>${esc(x.evidence || "")}</td><td>${esc(x.follow_result || "")}${base && nx ? `<div class="hint">${t("قبل", "before")} ${pct(base.total)} ← ${t("بعد", "after")} ${pct(nx.total)}</div>` : ""}</td><td><button class="btn sm" data-ed="${x.id}">${t("تعديل", "Edit")}</button></td></tr>`; }).join("") || `<tr><td colspan="9" class="empty">${t("لا توجد إجراءات.", "No actions.")}</td></tr>`}
      </tbody></table></div></div>`;
    const upd = () => A.go(`#/quality/actions?s=${main.querySelector("#fs").value}&th=${main.querySelector("#ft").value}`);
    main.querySelector("#fs").onchange = upd; main.querySelector("#ft").onchange = upd;
    main.querySelectorAll("[data-ed]").forEach((b) => b.onclick = () => {
      const x = acts.find((y) => y.id === b.dataset.ed);
      A.modal(t("تعديل الإجراء", "Edit action"), `<div class="grid cols-2">
        <div class="field" style="grid-column:span 2"><label class="f">${t("المشكلة", "Issue")}</label><input class="input" name="issue" value="${esc(x.issue)}"></div>
        <div class="field" style="grid-column:span 2"><label class="f">${t("الإجراء المطلوب", "Required action")}</label><input class="input" name="action" value="${esc(x.action || "")}"></div>
        <div class="field"><label class="f">${t("المشرف", "Supervisor")}</label><input class="input" name="supervisor" value="${esc(x.supervisor || "")}"></div>
        <div class="field"><label class="f">${t("الموعد", "Due")}</label><input class="input" type="date" name="due_date" value="${esc(String(x.due_date || "").slice(0, 10))}"></div>
        <div class="field"><label class="f">${t("الحالة", "Status")}</label><select class="input" name="status">${Object.keys(ACT_ST).map((k) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${esc(L(ACT_ST[k]))}</option>`).join("")}</select></div>
        <div class="field"><label class="f">${t("النوع", "Type")}</label><select class="input" name="kind"><option value="corrective">${t("إجراء تصحيحي", "Corrective")}</option><option value="training" ${x.kind === "training" ? "selected" : ""}>${t("تدريب", "Training")}</option></select></div>
        <div class="field" style="grid-column:span 2"><label class="f">${t("دليل الإنجاز", "Evidence of completion")}</label><input class="input" name="evidence" value="${esc(x.evidence || "")}"></div>
        <div class="field" style="grid-column:span 2"><label class="f">${t("نتيجة تدقيق المتابعة", "Follow-up audit result")}</label><input class="input" name="follow_result" value="${esc(x.follow_result || "")}"></div></div>`, {
        onOk: async (r) => {
          const v = (n) => r.querySelector(`[name="${n}"]`).value.trim();
          const data = { issue: v("issue"), action: v("action"), supervisor: v("supervisor"), due_date: v("due_date"), status: v("status"), kind: v("kind"), evidence: v("evidence"), follow_result: v("follow_result") };
          if (data.status === "done" && x.status !== "done") data.completed_at = A.today();
          await pb.collection("qa_actions").update(x.id, data); A.toast(t("تم الحفظ", "Saved")); A.route();
        },
      });
    });
  }

  // ------------------------------------------------------------------ monthly reports (one per therapist)
  async function pageReports() {
    const A = X(), q = A.qs();
    const main = A.shell("quality", `<div class="empty">${t("جاري التحميل…", "Loading…")}</div>`);
    const audits = await loadAudits();
    const month = q.m || shiftMonth(curMonth(), 0);
    const rows = audits.filter((a) => a.month === month && inCenter(a));
    const ther = (A.S.therapists || []).filter((u) => !A.S.centerFilter || (u.centers || []).includes(A.S.centerFilter));
    main.innerHTML = `<div class="page-head"><h1 class="grow">${t("التقارير الشهرية", "Monthly reports")}</h1></div>${tabs("reports")}
      <div class="panel" style="margin:12px 0"><div class="panel-body qa-filters"><label>${t("الشهر", "Month")} <input class="input" type="month" id="fm" value="${esc(month)}"></label></div></div>
      <div class="panel"><div class="table-wrap"><table class="t"><thead><tr><th>${t("الأخصائي", "Therapist")}</th><th>${t("الحالة", "Status")}</th><th>${t("النتيجة", "Score")}</th><th>${t("التقرير", "Report")}</th></tr></thead><tbody>
      ${ther.map((u) => { const a = rows.find((x) => x.therapist === u.id); return `<tr><td><a href="#/quality/t/${u.id}">${esc(tName(u.id))}</a></td><td>${!a ? `<span class="pill">${t("لم يُدقَّق", "Not audited")}</span>` : a.status === "submitted" ? `<span class="pill ok">${t("معتمد", "Submitted")}</span>` : `<span class="pill warn">${t("مسودة", "Draft")}</span>`}</td><td>${a ? pct(a.total) : "—"}</td>
        <td>${a ? `<a class="btn sm" href="#/quality/a/${a.id}">${t("فتح / PDF", "Open / PDF")}</a>` : `<a class="btn sm" href="#/quality/a/new">${t("بدء تدقيق", "Start audit")}</a>`}</td></tr>`; }).join("")}</tbody></table></div></div>`;
    main.querySelector("#fm").onchange = (e) => A.go(`#/quality/reports?m=${e.target.value}`);
  }

  // ------------------------------------------------------------------ audit criteria & weights (admin)
  async function pageSettings() {
    const A = X(), S = A.S;
    const tpl = tplNow();
    const main = A.shell("quality", "");
    const render = () => {
      const wsum = tpl.cats.reduce((s, c) => s + Number(c.w || 0), 0);
      main.innerHTML = `<div class="page-head"><h1 class="grow">${t("معايير التدقيق والأوزان", "Audit criteria and weights")}</h1><button class="btn" id="reset">${t("استرجاع الافتراضي", "Restore default")}</button><button class="btn primary" id="saveT">${t("حفظ", "Save")}</button></div>${tabs("settings")}
        <div class="note-box" style="margin:12px 0">${t("التعديل هنا ينطبق على التدقيقات الجديدة فقط. كل تدقيق يحتفظ بنسخة المعايير التي قُيّم بها، فلا تتغير نتائج سابقة.", "Changes apply to new audits only. Every audit keeps the criteria version it was scored with.")}</div>
        <div class="panel"><div class="panel-body grid cols-3">
          <div class="field"><label class="f">${t("القسم", "Department")}</label><input class="input" data-t="department" value="${esc(tpl.department || "")}"></div>
          <div class="field"><label class="f">${t("حجم عينة الملفات الافتراضي", "Default file sample size")}</label><input class="input" type="number" min="1" data-t="sample.files" value="${esc((tpl.sample || {}).files || 5)}"></div>
          <div class="field"><label class="f">${t("مجموع الأوزان", "Weights total")}</label><div class="input ${wsum === 100 ? "" : "row-bad"}">${wsum}%</div></div></div></div>
        <div class="panel" style="margin-top:12px"><div class="panel-head"><h2 class="grow">${t("التصنيفات", "Classifications")}</h2></div><div class="panel-body">${tpl.cls.map((c, i) => `<div class="qa-filters"><label>${t("من", "From")} <input class="input" type="number" min="0" max="100" data-cl="${i}.min" value="${c.min}" style="width:80px">%</label><input class="input" data-cl="${i}.ar" value="${esc(c.ar)}"><input class="input" dir="ltr" data-cl="${i}.en" value="${esc(c.en)}"><input type="color" data-cl="${i}.color" value="${esc(c.color)}"></div>`).join("")}</div></div>
        ${tpl.cats.map((c, ci) => `<div class="panel" style="margin-top:12px"><div class="panel-head"><input class="input grow" data-c="${ci}.ar" value="${esc(c.ar)}"><input class="input" dir="ltr" data-c="${ci}.en" value="${esc(c.en)}"><label>${t("الوزن", "Weight")} <input class="input" type="number" min="0" max="100" data-c="${ci}.w" value="${c.w}" style="width:80px">%</label></div><div class="panel-body">
          ${c.crit.map((k, ki) => `<div class="qa-filters"><input class="input grow" data-k="${ci}.${ki}.ar" value="${esc(k.ar)}"><input class="input grow" dir="ltr" data-k="${ci}.${ki}.en" value="${esc(k.en)}"><label>${t("الحد الأعلى", "Max")} <input class="input" type="number" min="1" max="10" data-k="${ci}.${ki}.max" value="${k.max}" style="width:70px"></label><label><input type="checkbox" data-kna="${ci}.${ki}" ${k.na ? "checked" : ""}> ${t("يسمح بـ«لا ينطبق»", "Allow N/A")}</label><button class="btn sm danger" data-kdel="${ci}.${ki}">✕</button></div>`).join("")}
          <button class="btn sm" data-kadd="${ci}">+ ${t("معيار", "Criterion")}</button></div></div>`).join("")}`;
    };
    render();
    main.addEventListener("input", (e) => {
      const el = e.target, num = (v) => (el.type === "number" ? Number(v) : v);
      if (el.dataset.t) { if (el.dataset.t === "sample.files") tpl.sample = { ...(tpl.sample || {}), files: Number(el.value) }; else tpl[el.dataset.t] = el.value; }
      else if (el.dataset.cl) { const [i, k] = el.dataset.cl.split("."); tpl.cls[i][k] = num(el.value); }
      else if (el.dataset.c) { const [i, k] = el.dataset.c.split("."); tpl.cats[i][k] = num(el.value); }
      else if (el.dataset.k) { const [i, j, k] = el.dataset.k.split("."); tpl.cats[i].crit[j][k] = num(el.value); }
      else if (el.dataset.kna) { const [i, j] = el.dataset.kna.split("."); tpl.cats[i].crit[j].na = el.checked; }
      A.setDirty(true);
    });
    main.addEventListener("change", (e) => { if (e.target.dataset.kna) { const [i, j] = e.target.dataset.kna.split("."); tpl.cats[i].crit[j].na = e.target.checked; } if (e.target.dataset.c && /\.w$/.test(e.target.dataset.c)) render(); });
    main.addEventListener("click", async (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.kadd != null) { const c = tpl.cats[b.dataset.kadd]; c.crit.push({ id: c.id + "_" + uid(), ar: "", en: "", max: 4, na: true }); A.setDirty(true); render(); }
      else if (b.dataset.kdel) { const [i, j] = b.dataset.kdel.split("."); tpl.cats[i].crit.splice(j, 1); A.setDirty(true); render(); }
      else if (b.id === "reset") { if (!confirm(t("استرجاع المعايير الافتراضية؟", "Restore the default criteria?"))) return; Object.assign(tpl, clone(DEFAULT_TPL)); A.setDirty(true); render(); }
      else if (b.id === "saveT") {
        const wsum = tpl.cats.reduce((s, c) => s + Number(c.w || 0), 0);
        if (wsum !== 100) { A.toast(t(`مجموع الأوزان لازم يكون 100% (حالياً ${wsum}%)`, `Weights must total 100% (now ${wsum}%)`), true); return; }
        if (tpl.cats.some((c) => c.crit.some((k) => !k.ar.trim()))) { A.toast(t("في معيار بدون نص.", "A criterion has no text."), true); return; }
        tpl.version = (Number(tpl.version) || 1) + 1;
        try { S.settings = await A.pb.collection("app_settings").update(S.settings.id, { qa_template: tpl }); A.setDirty(false); A.toast(t("تم حفظ المعايير ✓", "Criteria saved ✓")); render(); }
        catch (err) { A.toast(A.errText(err), true); }
      }
    });
  }

  window.QA = { route, score, metrics, DEFAULT_TPL };
})();

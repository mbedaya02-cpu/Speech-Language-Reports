/* Speech and Language Reports — main app (vanilla JS, Arabic RTL UI) */
(function () {
  "use strict";
  // Backend URL: ?api=… in the address (this tab), or chosen on the connect screen (this browser), or config.js.
  const API_KEY = "sr_api_url";
  const qApi = new URLSearchParams(location.search).get("api");
  if (qApi) { try { sessionStorage.setItem(API_KEY, qApi); } catch (_) {} history.replaceState(null, "", location.pathname + location.hash); }
  const stored = (st) => { try { return st.getItem(API_KEY) || ""; } catch (_) { return ""; } };
  let API_URL = qApi || stored(sessionStorage) || stored(localStorage) || (window.APP_CONFIG && window.APP_CONFIG.apiUrl) || "";
  const pb = new GasPB(API_URL);
  pb.autoCancellation(false);

  const FC = window.FC, X = window.DocExport;
  const A = { ageString: FC.ageString };
  const app = document.getElementById("app");
  const S = { me: null, centers: [], settings: null, therapists: [], centerFilter: "" };
  try { S.centerFilter = localStorage.getItem("centerFilter") || ""; } catch (_) {}

  const APP_NAME = "تقارير قسم النطق واللغة", APP_NAME_EN = "Speech and Language Reports";
  // Interface language (ar / en). Documents keep their own language toggle.
  const UI = window.I18N ? I18N.lang : "ar";
  const CREDIT = `<footer class="credit" data-notr dir="ltr">CREATED BY: MAHMOUD AHMAD JABER, 2026</footer>`;
  const tx = (o) => (o ? ((UI === "en" && o.en) ? o.en : (o.ar || o.en || "")) : "");
  const ROLE = { admin: "مدير النظام", therapist: "أخصائي نطق", reception: "استقبال" };
  // report_type -> form kind
  const KIND = { "تقرير الملاحظة الأولية": "scanning", "تقرير التقييم الأولي": "initial", "تقرير تقييم": "evaluation", "تقرير إعادة تقييم": "evaluation", "تقرير تقييم مرحلي": "progress", "تقرير خروج": "discharge", "تقرير لجهة خارجية": "external" };
  const REPORT_TYPES = Object.keys(KIND);
  const REPORT_HINT = { "تقرير الملاحظة الأولية": "Initial Scanning — انطباع الجلسة الأولى للأهل", "تقرير التقييم الأولي": "نموذج مختصر (ST_IA)", "تقرير تقييم": "التقييم الشامل بالعربي أو الإنجليزي", "تقرير إعادة تقييم": "نفس نموذج التقييم الشامل", "تقرير تقييم مرحلي": "تقرير التقدم المرتبط بالخطة", "تقرير خروج": "عند إنهاء العلاج", "تقرير لجهة خارجية": "مدرسة / تأمين / طبيب" };
  const PLAN_STATUS = ["سارية", "تم التجديد", "منتهية", "ملغاة"];
  const PATIENT_STATUS = ["نشط", "متوقف مؤقتاً", "مُخرَّج"];

  // ------------------------------------------------------------------ utils
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const d10 = (s) => (s ? String(s).slice(0, 10) : "");
  const toPb = (d) => (d ? d + " 00:00:00.000Z" : "");
  const pad = (n) => String(n).padStart(2, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const addMonths = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); };
  const daysLeft = (iso) => Math.round((new Date(d10(iso) + "T00:00:00Z") - new Date(today() + "T00:00:00Z")) / 86400000);
  const isAdmin = () => S.me && S.me.role === "admin";
  const isTherapist = () => S.me && S.me.role === "therapist";
  const canClinical = () => isAdmin() || isTherapist();
  const remindBefore = () => (S.settings && S.settings.remind_before != null ? S.settings.remind_before : 1);
  const remindAfter = () => (S.settings && S.settings.remind_after != null ? S.settings.remind_after : 5);
  const reminderDays = () => remindBefore();
  const deepClone = (o) => JSON.parse(JSON.stringify(o ?? null));
  // Clinician name for documents: English name for English documents when available.
  const clinicianName = (u, lang) => { u = u || S.me; return (lang === "en" && u.name_en) ? u.name_en : (u.name || u.email); };
  function warnEnglish(patient, lang) {
    if (lang !== "en") return;
    const miss = [];
    if (!patient.full_name_en) miss.push("اسم المريض بالإنجليزي");
    if (!S.me.name_en) miss.push("اسمك بالإنجليزي (من المستخدمين)");
    if (miss.length) toast("للتقرير الإنجليزي ينقص: " + miss.join(" و "), true);
  }

  function toast(msg, err) {
    let box = document.querySelector(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast" + (err ? " err" : "");
    t.setAttribute("role", "status");
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), err ? 5000 : 2600);
  }
  function errText(e) {
    const data = e && e.response && e.response.data;
    if (data && typeof data === "object") {
      const parts = Object.entries(data).map(([k, v]) => `${k}: ${v && v.message ? v.message : v}`);
      if (parts.length) return parts.join(" | ");
    }
    if (e && e.status === 403) return "ليس لديك صلاحية لهذا الإجراء.";
    if (e && e.status === 404) return "غير موجود أو لا تملك صلاحية الوصول إليه.";
    return (e && e.message) || "حدث خطأ";
  }
  function duePill(days) {
    if (days < 0) return `<span class="pill danger">متأخر ${-days} يوم</span>`;
    if (days === 0) return `<span class="pill danger">اليوم</span>`;
    if (days <= 7) return `<span class="pill warn">بعد ${days} يوم</span>`;
    return `<span class="pill">بعد ${days} يوم</span>`;
  }
  function statusPill(s) {
    const map = { "سارية": "ok", "نشط": "ok", "نهائي": "ok", "مسودة": "warn", "تم التجديد": "info", "متوقف مؤقتاً": "warn", "مُخرَّج": "", "منتهية": "", "ملغاة": "" };
    return `<span class="pill ${map[s] || ""}">${esc(s || "—")}</span>`;
  }
  const centerById = (id) => S.centers.find((c) => c.id === id);
  // therapists are classified by center (users.centers)
  const inCenterOf = (u, centerId) => !!(u && centerId && (u.centers || []).includes(centerId));
  function centerTag(id) {
    const c = centerById(id);
    if (!c) return "";
    return `<span class="nowrap"><span class="center-dot" style="background:${esc(c.color || "#999")}"></span>${esc(c.name_ar)}</span>`;
  }
  function qs() {
    const h = location.hash.split("?")[1] || "";
    return Object.fromEntries(new URLSearchParams(h));
  }
  const go = (h) => { location.hash = h; };
  const centerFilterExpr = (path) => (S.centerFilter ? pb.filter(`${path} = {:c}`, { c: S.centerFilter }) : "");
  const andF = (...xs) => xs.filter(Boolean).map((x) => `(${x})`).join(" && ");

  // dirty-state guard for editors (off in the forms preview sandbox)
  let dirty = false, sandbox = false;
  window.addEventListener("beforeunload", (e) => { if (dirty && !sandbox) { e.preventDefault(); e.returnValue = ""; } });
  let lastHash = location.hash;
  window.addEventListener("hashchange", () => {
    if (dirty && !sandbox && !confirm("لديك تغييرات غير محفوظة. هل تريد المغادرة دون حفظ؟")) {
      history.replaceState(null, "", lastHash); return;
    }
    dirty = false; lastHash = location.hash; route();
  });

  // path helpers for data binding ("answers.referral.reason", "goals.0.ar")
  function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj); }
  function setPath(obj, path, val) {
    const ks = path.split("."); let o = obj;
    ks.slice(0, -1).forEach((k, i) => { if (o[k] == null || typeof o[k] !== "object") o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; });
    o[ks[ks.length - 1]] = val;
  }

  // Binds chips + inputs inside root to obj. onChange called after each change.
  function bind(root, obj, onChange) {
    root.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip[data-path]");
      if (!chip || !root.contains(chip)) return;
      const path = chip.dataset.path, v = chip.dataset.v, multi = chip.dataset.mode === "multi";
      if (multi) {
        const arr = Array.isArray(getPath(obj, path)) ? getPath(obj, path).slice() : [];
        const i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1); else arr.push(v);
        setPath(obj, path, arr);
      } else {
        setPath(obj, path, getPath(obj, path) === v ? "" : v);
      }
      root.querySelectorAll(`.chip[data-path="${CSS.escape(path)}"]`).forEach((c) => {
        const cur = getPath(obj, path);
        c.classList.toggle("on", multi ? (cur || []).includes(c.dataset.v) : cur === c.dataset.v);
      });
      dirty = true; onChange && onChange(path);
    });
    root.addEventListener("input", (e) => {
      const el = e.target.closest("[data-path]");
      if (!el || el.classList.contains("chip") || !root.contains(el)) return;
      setPath(obj, el.dataset.path, el.type === "number" ? (el.value === "" ? "" : Number(el.value)) : el.value);
      dirty = true; onChange && onChange(el.dataset.path);
    });
  }
  function chipsHtml(path, options, value, mode, lang = "ar") {
    const cur = value ?? (mode === "multi" ? [] : "");
    return `<div class="chips">${options.map((o) => {
      const on = mode === "multi" ? (cur || []).includes(o.v) : cur === o.v;
      return `<button type="button" class="chip${on ? " on" : ""}" data-path="${esc(path)}" data-v="${esc(o.v)}" data-mode="${mode}" title="${esc(o.en || "")}">${esc((lang && o[lang]) || tx(o))}</button>`;
    }).join("")}</div>`;
  }
  function specQ(path, spec, value, extraLabel) {
    return `<div class="q"><div class="q-label">${esc(tx(spec.label))}${spec.type === "multi" ? '<span class="tag">اختيار متعدد</span>' : ""}${extraLabel || ""}</div>${chipsHtml(path, spec.options, value, spec.type || "single")}</div>`;
  }

  // ------------------------------------------------------------------ modal
  function modal(title, bodyHtml, { okText = "حفظ", onOk, wide } = {}) {
    const back = document.createElement("div");
    back.className = "modal-back";
    back.innerHTML = `<div class="modal" style="${wide ? "width:min(900px,100%)" : ""}" role="dialog" aria-modal="true">
      <div class="panel-head"><h2 class="grow">${esc(title)}</h2><button class="btn sm" data-x>✕</button></div>
      <div class="panel-body">${bodyHtml}</div>
      ${onOk ? `<div class="modal-foot"><button class="btn" data-x>إلغاء</button><button class="btn primary" data-ok>${esc(okText)}</button></div>` : ""}</div>`;
    const close = () => back.remove();
    back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-x]")) close(); });
    if (onOk) back.querySelector("[data-ok]").addEventListener("click", async (e) => {
      e.target.disabled = true;
      try { if ((await onOk(back)) !== false) close(); } catch (err) { toast(errText(err), true); }
      e.target.disabled = false;
    });
    document.body.appendChild(back);
    const first = back.querySelector("input,select,textarea");
    if (first) first.focus();
    return back;
  }
  const val = (root, name) => { const el = root.querySelector(`[name="${name}"]`); return el ? el.value.trim() : ""; };

  // ------------------------------------------------------------------ shell
  // Language switch button (works on every screen: delegated click below)
  const langBtn = () => `<button type="button" class="btn sm lang-btn" data-notr data-uilang="${UI === "en" ? "ar" : "en"}" title="${UI === "en" ? "العربية" : "English"}">${UI === "en" ? "عربي" : "English"}</button>`;
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-uilang]"); if (!b) return;
    if (dirty && !confirm("لديك تغييرات غير محفوظة. هل تريد المغادرة دون حفظ؟")) return;
    dirty = false; I18N.setLang(b.dataset.uilang);
  });

  function shell(active, html) {
    const links = [
      ["#/", "الرئيسية", "home"],
      ["#/patients", "المرضى", "patients"],
      ["#/forms", "النماذج", "forms"],
      ...(isAdmin() ? [["#/docs", "آخر المستندات", "docs"], ["#/quality", "الجودة والتدقيق", "quality"], ["#/users", "المستخدمون", "users"], ["#/audit", "سجل الحركات", "audit"], ["#/settings", "الإعدادات", "settings"]] : []),
      ...(isTherapist() ? [["#/quality/me", "نتائج التدقيق", "quality"]] : []),
      ["#/me", "ملفي", "me"],
    ];
    const centerOpts = [`<option value="">كل المراكز</option>`, ...S.centers.map((c) => `<option value="${c.id}" ${S.centerFilter === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`)].join("");
    app.innerHTML = `
      <header class="topbar">
        <a class="brand" href="#/"><span class="brand-mark">${UI === "en" ? "S" : "ن"}</span>${esc(UI === "en" ? APP_NAME_EN : ((S.settings && S.settings.system_name) || APP_NAME))}</a>
        <nav class="nav">${links.map(([h, t, k]) => `<a href="${h}" class="${k === active ? "active" : ""}">${t}</a>`).join("")}</nav>
        <div class="spacer"></div>
        <select class="input" id="centerFilter" style="width:auto" aria-label="المركز">${centerOpts}</select>
        ${langBtn()}
        <div class="userbox"><span>${esc(UI === "en" && S.me.name_en ? S.me.name_en : (S.me.name || S.me.email))} · ${ROLE[S.me.role] || ""}</span><button class="btn sm" id="logout">خروج</button></div>
      </header>
      <main>${html}</main>${CREDIT}`;
    app.querySelector("#logout").onclick = () => { if (dirty && !confirm("تغييرات غير محفوظة. الخروج؟")) return; dirty = false; pb.authStore.clear(); history.replaceState(null, "", location.pathname + "#/"); lastHash = "#/"; renderLogin(); };
    app.querySelector("#centerFilter").onchange = (e) => {
      S.centerFilter = e.target.value;
      try { localStorage.setItem("centerFilter", S.centerFilter); } catch (_) {}
      route();
    };
    return app.querySelector("main");
  }

  // ------------------------------------------------------------------ login
  function renderLogin(msg) {
    app.innerHTML = `<div class="login-wrap"><div class="panel login"><div class="panel-body">
      <div class="brand" style="margin-bottom:14px"><span class="brand-mark">${UI === "en" ? "S" : "ن"}</span><span>${UI === "en" ? APP_NAME_EN : APP_NAME}<div class="hint" style="font-weight:500">${UI === "en" ? APP_NAME : APP_NAME_EN}</div></span>${langBtn()}</div>
      <h1>تسجيل الدخول</h1><p class="muted" style="margin:4px 0 18px">ادخل بحسابك الخاص. لا تشارك كلمة المرور مع أحد.</p>
      ${msg ? `<div class="err-box">${esc(msg)}</div>` : ""}
      <form id="lf">
        <div class="field"><label class="f" for="em">اسم المستخدم</label><input class="input mono" id="em" type="text" required autocomplete="username" autocapitalize="off" spellcheck="false"></div>
        <div class="field"><label class="f" for="pw">كلمة المرور</label><input class="input" id="pw" type="password" required autocomplete="current-password"></div>
        <button class="btn primary" style="width:100%" type="submit">دخول</button>
      </form>
      <div style="margin-top:14px;text-align:center"><a href="javascript:void 0" id="chgSrv" class="hint">تغيير رابط الخادم</a></div></div></div>${CREDIT}</div>`;
    app.querySelector("#chgSrv").onclick = () => window.__changeServer();
    app.querySelector("#lf").onsubmit = async (e) => {
      e.preventDefault();
      const b = e.target.querySelector("button"); b.disabled = true;
      try {
        await pb.collection("users").authWithPassword(app.querySelector("#em").value.trim(), app.querySelector("#pw").value);
        await afterLogin();
      } catch (err) {
        renderLogin(err.status === 400 ? "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير مفعّل." : (err.status === 0 ? err.message : errText(err)));
      }
    };
  }

  async function afterLogin() {
    S.me = pb.authStore.record;
    const [centers, settings, therapists] = await Promise.all([
      pb.collection("centers").getFullList({ sort: "code" }),
      pb.collection("app_settings").getFirstListItem("").catch(() => null),
      pb.collection("users").getFullList({ filter: '(role = "therapist" || role = "admin") && active = true', sort: "name" }),
    ]);
    S.centers = centers; S.settings = settings; S.therapists = therapists;
    if (UI === "en") {
      // data that has an English twin: center names, nationalities
      const m = {};
      centers.forEach((c) => { if (c.name_ar && c.name_en) m[c.name_ar] = c.name_en; });
      FC.NATIONALITIES.forEach(([ar, en]) => { m[ar] = en; });
      I18N.add(m);
    }
    if (S.centerFilter && !centerById(S.centerFilter)) S.centerFilter = "";
    if (!location.hash || location.hash === "#") location.hash = "#/";
    route();
  }

  // ------------------------------------------------------------------ router
  async function route() {
    if (!pb.authStore.isValid || !pb.authStore.record || pb.authStore.record.collectionName !== "users") return renderLogin();
    lastHash = location.hash;
    const h = (location.hash.slice(1).split("?")[0] || "/").split("/").filter(Boolean);
    try {
      if (!h.length) return await pageDashboard();
      sandbox = false;
      if (h[0] === "patients") return await pagePatients();
      if (h[0] === "forms") return pageForms();
      if (h[0] === "try" && h[1] === "plan") return await pageDoc("plans", "new", true);
      if (h[0] === "try" && h[1] === "report") return await pageDoc("reports", "new", true);
      if (h[0] === "patient" && h[1]) return await pagePatient(h[1]);
      if (h[0] === "plan" && h[1]) return await pageDoc("plans", h[1]);
      if (h[0] === "report" && h[1]) return await pageDoc("reports", h[1]);
      if (h[0] === "users" && isAdmin()) return await pageUsers();
      if (h[0] === "me") return await pageMe();
      if (h[0] === "docs" && isAdmin()) return await pageDocs();
      if (h[0] === "import" && (isAdmin() || S.me.role === "reception")) return pageImport();
      if (h[0] === "audit" && isAdmin()) return await pageAudit();
      if (h[0] === "settings" && isAdmin()) return await pageSettings();
      if (h[0] === "soap" && window.SOAP && h[1]) { sandbox = false; return await window.SOAP.route(h.slice(1)); }
      if (h[0] === "quality" && window.QA && (isAdmin() || isTherapist())) { sandbox = false; return await window.QA.route(h.slice(1)); }
      shell("", `<div class="panel empty">الصفحة غير موجودة.</div>`);
    } catch (err) {
      if (err && err.status === 401) { pb.authStore.clear(); return renderLogin("انتهت الجلسة، الرجاء تسجيل الدخول مجدداً."); }
      console.error(err);
      shell("", `<div class="panel empty">تعذر تحميل الصفحة: ${esc(errText(err))}</div>`);
    }
  }

  // ------------------------------------------------------------------ dashboard
  // Loads every active plan / pending report due within `ahead` days (overdue included).
  async function loadDueItems(ahead) {
    const limit = addDays(today(), ahead) + " 23:59:59.999Z";
    const cf = centerFilterExpr("patient.center");
    const notDischarged = 'patient.status != "مُخرَّج"';
    const [plans, reports] = await Promise.all([
      pb.collection("plans").getFullList({ filter: andF(pb.filter('status = "سارية" && end_date <= {:l}', { l: limit }), notDischarged, cf), sort: "end_date", expand: "patient,therapist" }),
      pb.collection("reports").getFullList({ filter: andF(pb.filter('followed_up = false && next_due != "" && next_due <= {:l}', { l: limit }), notDischarged, cf), sort: "next_due", expand: "patient,therapist" }),
    ]);
    const nextType = (t) => (["تقرير خروج", "تقرير لجهة خارجية"].includes(t) ? t : "تقرير تقييم مرحلي");
    // mandatory progress report every 6 months (same rule as progressDue_ in Reminders.gs)
    const [actPlans, progs] = await Promise.all([
      pb.collection("plans").getFullList({ filter: andF('status = "سارية"', notDischarged, cf), expand: "patient,therapist" }),
      pb.collection("reports").getFullList({ filter: andF('report_type = "تقرير تقييم مرحلي"', cf), sort: "-report_date", fields: "patient,report_date" }),
    ]);
    const lastProg = {}; progs.forEach((r) => { const d = d10(r.report_date); if (!lastProg[r.patient] || d > lastProg[r.patient]) lastProg[r.patient] = d; });
    const covered = new Set(reports.map((r) => r.patient));
    const progDue = [];
    actPlans.forEach((pl) => {
      if (covered.has(pl.patient)) return;
      const start = d10(pl.start_date), base = lastProg[pl.patient] && lastProg[pl.patient] > start ? lastProg[pl.patient] : start;
      const due = addMonths(base, 6);
      if (due > d10(limit) || due >= d10(pl.end_date)) return;
      covered.add(pl.patient);
      progDue.push({ kind: "progress", rec: pl, due, what: "تقرير تقييم مرحلي إلزامي (كل 6 أشهر)", next: "تقرير تقييم مرحلي", p: pl.expand && pl.expand.patient });
    });
    return [...progDue,
      ...plans.map((r) => ({ kind: "plan", rec: r, due: d10(r.end_date), what: `تجديد الخطة / إعادة التقييم`, p: r.expand && r.expand.patient })),
      ...reports.map((r) => ({ kind: "report", rec: r, due: d10(r.next_due), what: `تقرير مستحق (بعد ${r.report_type})`, next: nextType(r.report_type), p: r.expand && r.expand.patient })),
    ].map((i) => ({ ...i, days: daysLeft(i.due) })).sort((a, b) => a.days - b.days);
  }

  function dueRows(items) {
    return items.map((i) => `<tr>
        <td>${duePill(i.days)}${i.days < -remindAfter() ? ' <span class="pill danger">تجاوز مهلة التذكير</span>' : ""}</td>
        <td class="mono">${esc(i.p ? i.p.file_no : "")}</td>
        <td><a href="#/patient/${i.p ? i.p.id : ""}">${esc(i.p ? i.p.full_name : "")}</a></td>
        <td>${esc(i.what)}</td>
        <td class="nowrap">${esc(i.due)}</td>
        <td>${i.p ? centerTag(i.p.center) : ""}</td>
        <td>${esc(i.rec.expand && i.rec.expand.therapist ? i.rec.expand.therapist.name : "")}</td>
        <td class="nowrap">${canClinical() && i.p ? (i.kind === "progress" ? `<a class="btn sm primary" href="#/report/new?patient=${i.p.id}&type=${encodeURIComponent(i.next)}&soap=1">كتابة التقرير من الملاحظات</a>` : i.kind === "plan"
          ? `<a class="btn sm primary" href="#/plan/new?patient=${i.p.id}&renew=${i.rec.id}">تجديد الخطة</a>`
          : `<a class="btn sm primary" href="#/report/new?patient=${i.p.id}&type=${encodeURIComponent(i.next)}&prev=${i.rec.id}">كتابة التقرير</a>`) : ""}
          <a class="btn sm" href="#/${i.kind === "progress" ? "plan" : i.kind}/${i.rec.id}">فتح</a></td></tr>`).join("");
  }
  const dueTable = (items) => `<div class="table-wrap"><table class="t"><thead><tr><th>الموعد</th><th>رقم الملف</th><th>المريض</th><th>المطلوب</th><th>التاريخ</th><th>المركز</th><th>الأخصائي</th><th></th></tr></thead><tbody>${dueRows(items)}</tbody></table></div>`;

  async function pageDashboard() {
    const main = shell("home", `<div class="empty">جاري التحميل…</div>`);
    const cf = centerFilterExpr("center");
    const [all, active, drafts] = await Promise.all([
      loadDueItems(30),
      pb.collection("patients").getList(1, 1, { filter: andF('status = "نشط"', cf), fields: "id" }),
      pb.collection("reports").getList(1, 50, { filter: andF('status = "مسودة"', isTherapist() ? pb.filter("therapist = {:me}", { me: S.me.id }) : "", centerFilterExpr("patient.center")), sort: "-updated", expand: "patient" }),
    ]);
    const now = all.filter((i) => i.days <= remindBefore());
    const later = all.filter((i) => i.days > remindBefore());
    const overdue = now.filter((i) => i.days < 0).length;
    main.innerHTML = `
      <div class="page-head"><div class="grow"><h1>مرحباً ${esc(((UI === "en" && S.me.name_en) || S.me.name || "").split(" ")[0])}</h1><div class="muted">${today()} · التذكير يبدأ قبل ${remindBefore()} يوم من الموعد ويستمر حتى ${remindAfter()} أيام بعده</div></div>
        <a class="btn" href="#/patients">قائمة المرضى</a></div>
      <div class="grid cols-4">
        <div class="panel stat danger"><div class="num">${overdue}</div><div class="lbl">متأخرة (فات موعدها)</div></div>
        <div class="panel stat warn"><div class="num">${now.length - overdue}</div><div class="lbl">مستحقة اليوم / غداً</div></div>
        <div class="panel stat"><div class="num">${later.length}</div><div class="lbl">قادمة خلال 30 يوماً</div></div>
        <div class="panel stat ok"><div class="num">${active.totalItems}</div><div class="lbl">مرضى نشطون</div></div>
      </div>
      <div class="panel" style="margin-top:16px"><div class="panel-head"><h2 class="grow">مطلوب الآن: تجديدات وتقارير مستحقة أو متأخرة</h2></div>
        ${now.length ? dueTable(now) : `<div class="empty">لا يوجد شيء مستحق الآن. 👌</div>`}</div>
      ${later.length ? `<div class="panel"><details><summary class="panel-head" style="cursor:pointer"><h2 class="grow">قادمة خلال 30 يوماً (${later.length})</h2></summary>${dueTable(later)}</details></div>` : ""}
      ${drafts.items.length ? `<div class="panel"><div class="panel-head"><h2 class="grow">تقارير مسودة لم تُعتمد</h2></div><div class="table-wrap"><table class="t"><tbody>
        ${drafts.items.map((r) => `<tr class="click" data-go="#/report/${r.id}"><td>${esc(r.report_type)}</td><td>${esc(r.expand && r.expand.patient ? r.expand.patient.full_name : "")}</td><td class="nowrap">${d10(r.report_date)}</td><td>${statusPill(r.status)}</td></tr>`).join("")}
      </tbody></table></div></div>` : ""}`;
    main.querySelectorAll("[data-go]").forEach((tr) => tr.onclick = () => go(tr.dataset.go));
  }

  // ------------------------------------------------------------------ patients
  async function pagePatients() {
    const q = qs();
    const main = shell("patients", "");
    main.innerHTML = `
      <div class="page-head"><h1 class="grow">المرضى</h1>${isAdmin() || S.me.role === "reception" ? `<a class="btn" href="#/import">⬆ استيراد من Excel</a>` : ""}${isAdmin() || S.me.role === "reception" || isTherapist() ? `<button class="btn primary" id="newP">+ مريض جديد</button>` : ""}</div>
      <div class="panel"><div class="panel-head" style="flex-wrap:wrap">
        <input class="input" id="q" placeholder="بحث بالاسم أو رقم الملف…" value="${esc(q.q || "")}" style="max-width:320px">
        <select class="input" id="st" style="width:auto"><option value="">كل الحالات</option>${PATIENT_STATUS.map((s) => `<option ${q.st === s ? "selected" : ""}>${s}</option>`).join("")}</select>
        <span class="grow"></span><span class="muted" id="count"></span></div>
        <div id="list"><div class="empty">جاري التحميل…</div></div></div>`;
    const load = async () => {
      const term = main.querySelector("#q").value.trim(), st = main.querySelector("#st").value;
      const f = andF(
        term ? pb.filter("full_name ~ {:t} || file_no ~ {:t} || full_name_en ~ {:t} || phone ~ {:t}", { t: term }) : "",
        st ? pb.filter("status = {:s}", { s: st }) : "",
        centerFilterExpr("center"));
      const res = await pb.collection("patients").getList(1, 200, { filter: f, sort: "-updated", expand: "therapists" });
      main.querySelector("#count").textContent = `${res.totalItems} مريض`;
      main.querySelector("#list").innerHTML = res.items.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>رقم الملف</th><th>الاسم</th><th>العمر</th><th>التشخيص</th><th>الأخصائي</th><th>المركز</th><th>الحالة</th></tr></thead><tbody>
        ${res.items.map((p) => `<tr class="click" data-go="#/patient/${p.id}"><td class="mono">${esc(p.file_no)}</td><td><strong>${esc(p.full_name)}</strong>${p.full_name_en ? `<div class="hint">${esc(p.full_name_en)}</div>` : ""}</td>
          <td class="nowrap">${esc(A.ageString(p.dob, today(), UI))}</td><td>${esc(p.diagnosis)}</td>
          <td>${esc(((p.expand && p.expand.therapists) || []).map((t) => t.name).join("، "))}</td><td>${centerTag(p.center)}</td><td>${isAdmin()
            ? `<select class="input status-sel" data-pst="${p.id}" style="width:auto;padding:4px 8px">${PATIENT_STATUS.map((st) => `<option value="${st}" ${p.status === st ? "selected" : ""}>${st}</option>`).join("")}</select>`
            : statusPill(p.status)}</td></tr>`).join("")}
        </tbody></table></div>` : `<div class="empty">لا يوجد مرضى مطابقون.</div>`;
      main.querySelectorAll("[data-go]").forEach((tr) => tr.onclick = (e) => { if (e.target.closest(".status-sel")) return; go(tr.dataset.go); });
      // admin: change a child's status right from the list
      main.querySelectorAll("[data-pst]").forEach((sel) => {
        sel.onclick = (e) => e.stopPropagation();
        sel.onchange = async () => {
          sel.disabled = true;
          try { await pb.collection("patients").update(sel.dataset.pst, { status: sel.value }); toast("تم تغيير الحالة"); }
          catch (err) { toast(errText(err), true); }
          sel.disabled = false;
        };
      });
    };
    let timer;
    main.querySelector("#q").oninput = () => { clearTimeout(timer); timer = setTimeout(load, 250); };
    main.querySelector("#st").onchange = load;
    const nb = main.querySelector("#newP"); if (nb) nb.onclick = () => patientModal(null, (p) => go(`#/patient/${p.id}`));
    await load();
  }

  function patientModal(p, done) {
    // A therapist adds patients only to their own centers, and is assigned to them automatically.
    const myCenters = isTherapist() && (S.me.centers || []).length ? S.centers.filter((c) => S.me.centers.includes(c.id)) : S.centers;
    const defCenter = myCenters.some((c) => c.id === S.centerFilter) ? S.centerFilter : (myCenters[0] && myCenters[0].id);
    p = p || { status: "نشط", center: defCenter, therapists: [] };
    const canAssign = isAdmin() || S.me.role === "reception";
    const body = `<div class="grid cols-2">
      <div class="field"><label class="f">المركز *</label><select class="input" name="center">${(p.id ? S.centers : myCenters).map((c) => `<option value="${c.id}" ${p.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
      <div class="field"><label class="f">رقم الملف *</label><input class="input mono" name="file_no" value="${esc(p.file_no)}"></div>
      <div class="field"><label class="f">الاسم بالعربي *</label><input class="input" name="full_name" value="${esc(p.full_name)}"></div>
      <div class="field"><label class="f">الاسم بالإنجليزي (للتقارير الإنجليزية)</label><input class="input" dir="ltr" name="full_name_en" value="${esc(p.full_name_en)}"></div>
      <div class="field"><label class="f">تاريخ الميلاد</label><input class="input" type="date" name="dob" value="${d10(p.dob)}"></div>
      <div class="field"><label class="f">الجنس *</label><select class="input" name="gender"><option></option>${["ذكر", "أنثى"].map((g) => `<option ${p.gender === g ? "selected" : ""}>${g}</option>`).join("")}</select></div>
      <div class="field"><label class="f">الجنسية</label><input class="input" name="nationality" list="natList" value="${esc(p.nationality)}">
        <datalist id="natList">${FC.NATIONALITIES.map((n) => `<option value="${n[0]}">`).join("")}</datalist></div>
      <div class="field"><label class="f">اسم ولي الأمر</label><input class="input" name="guardian_name" value="${esc(p.guardian_name)}"></div>
      <div class="field"><label class="f">رقم الهاتف</label><input class="input mono" name="phone" value="${esc(p.phone)}"></div>
      <div class="field"><label class="f">شركة التأمين</label><input class="input" name="insurance_company" list="insList" value="${esc(p.insurance_company)}">
        <datalist id="insList"><option>Thiqa</option><option>Daman Enhanced</option><option>Daman Basic</option><option>ADNIC</option><option>نقدي (بدون تأمين)</option></datalist></div>
      <div class="field"><label class="f">رقم بطاقة التأمين</label><input class="input mono" name="insurance_no" value="${esc(p.insurance_no)}"></div>
      <div class="field"><label class="f">التشخيص المبدئي</label><input class="input" name="diagnosis" value="${esc(p.diagnosis)}"></div>
      <div class="field"><label class="f">تاريخ بدء العلاج</label><input class="input" type="date" name="start_date" value="${d10(p.start_date)}"></div>
      <div class="field"><label class="f">الحالة</label><select class="input" name="status">${PATIENT_STATUS.map((s) => `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
    </div>
    ${canAssign ? `<div class="field"><label class="f">الأخصائي/ون المسؤولون <span class="hint">(أخصائيو المركز المختار)</span></label><div class="chips" id="thr"></div></div>` : ""}
    <div class="field"><label class="f">ملاحظات</label><textarea class="input" name="notes">${esc(p.notes)}</textarea></div>`;
    const m = modal(p.id ? "تعديل بيانات المريض" : "مريض جديد", body, {
      wide: true,
      onOk: async (root) => {
        const data = {};
        ["center", "file_no", "full_name", "full_name_en", "gender", "nationality", "guardian_name", "phone", "insurance_company", "insurance_no", "diagnosis", "status", "notes"].forEach((k) => data[k] = val(root, k));
        data.dob = toPb(val(root, "dob")); data.start_date = toPb(val(root, "start_date"));
        if (canAssign) data.therapists = [...root.querySelectorAll("#thr .chip.on")].map((c) => c.dataset.id);
        if (!data.file_no || !data.full_name || !data.gender) { toast("رقم الملف والاسم والجنس مطلوبة (الجنس يحدد صياغة التقارير)", true); return false; }
        const rec = p.id ? await pb.collection("patients").update(p.id, data) : await pb.collection("patients").create(data);
        toast("تم الحفظ"); done && done(rec);
      },
    });
    const thr = m.querySelector("#thr");
    if (thr) {
      // Only the therapists of the selected center (plus anyone already assigned).
      const drawThr = () => {
        const center = val(m, "center");
        const on = new Set(thr.children.length ? [...thr.querySelectorAll(".chip.on")].map((c) => c.dataset.id) : (p.therapists || []));
        const list = S.therapists.filter((t) => (t.centers || []).includes(center) || on.has(t.id));
        thr.innerHTML = list.map((t) => `<button type="button" class="chip ${on.has(t.id) ? "on" : ""}" data-id="${t.id}">${esc(t.name)}${(t.centers || []).includes(center) ? "" : ' <span class="hint">(مركز آخر)</span>'}</button>`).join("")
          || '<span class="hint">لا يوجد أخصائيون لهذا المركز — أضف المركز للأخصائي من صفحة المستخدمين.</span>';
      };
      drawThr();
      m.querySelector('[name="center"]').addEventListener("change", drawThr);
      thr.onclick = (e) => { const c = e.target.closest(".chip"); if (c) c.classList.toggle("on"); };
    }
  }

  async function pagePatient(id) {
    const main = shell("patients", `<div class="empty">جاري التحميل…</div>`);
    const tab = qs().tab || "plans";
    const p = await pb.collection("patients").getOne(id, { expand: "therapists" });
    const [plans, reports, soaps] = await Promise.all([
      pb.collection("plans").getFullList({ filter: pb.filter("patient = {:id}", { id }), sort: "-start_date", expand: "therapist" }),
      pb.collection("reports").getFullList({ filter: pb.filter("patient = {:id}", { id }), sort: "-report_date", expand: "therapist" }),
      pb.collection("soap_notes").getFullList({ filter: pb.filter("patient = {:id}", { id }), sort: "-date", expand: "therapist" }).catch(() => []),
    ]);
    const info = [
      ["رقم الملف", `<span class="mono">${esc(p.file_no)}</span>`], ["المركز", centerTag(p.center)],
      ["تاريخ الميلاد", `${d10(p.dob) || "—"} <span class="muted">(${esc(A.ageString(p.dob, today(), UI)) || "—"})</span>`],
      ["الجنس", esc(p.gender || "—")], ["الجنسية", esc(p.nationality || "—")], ["ولي الأمر", esc(p.guardian_name || "—")], ["الهاتف", `<span class="mono">${esc(p.phone || "—")}</span>`],
      ["التأمين", esc([p.insurance_company, p.insurance_no].filter(Boolean).join(" · ") || "—")], ["التشخيص", esc(p.diagnosis || "—")],
      ["بدء العلاج", d10(p.start_date) || "—"], ["الأخصائي", esc(((p.expand && p.expand.therapists) || []).map((t) => t.name).join("، ") || "—")],
    ];
    const planRows = plans.map((r) => {
      const dl = daysLeft(r.end_date);
      return `<tr><td><a href="#/plan/${r.id}"><strong>${esc(r.plan_type)}</strong></a></td><td class="nowrap">${d10(r.start_date)} ← ${d10(r.end_date)}</td>
        <td>${statusPill(r.status)} ${r.status === "سارية" && dl <= 30 ? duePill(dl) : ""}</td><td>${centerTag(r.center)}</td>
        <td>${esc(r.expand && r.expand.therapist ? r.expand.therapist.name : "")}</td>
        <td class="nowrap"><div class="btn-row">${r.uploaded ? (r.files || []).slice(0, 1).map((f) => `<button class="btn sm" data-upfile="${r.id}" data-name="${esc(f)}">📎 فتح الملف</button>`).join("") : docButtons("plan", r)}${r.status === "سارية" && canClinical() ? `<a class="btn sm" href="#/plan/new?patient=${p.id}&renew=${r.id}">تجديد</a>` : ""}</div></td></tr>`;
    }).join("");
    const reportRows = reports.map((r) => `<tr><td><a href="#/report/${r.id}"><strong>${esc(r.report_type)}</strong></a></td><td class="nowrap">${d10(r.report_date)}</td>
        <td>${statusPill(r.status)}</td><td class="nowrap">${r.next_due ? (r.followed_up ? `<span class="pill info">تمت المتابعة</span>` : `${d10(r.next_due)} ${duePill(daysLeft(r.next_due))}`) : "—"}</td>
        <td>${centerTag(r.center)}</td><td>${esc(r.expand && r.expand.therapist ? r.expand.therapist.name : "")}</td>
        <td class="nowrap"><div class="btn-row">${docButtons("report", r)}</div></td></tr>`).join("");
    main.innerHTML = `
      <div class="crumbs"><a href="#/patients">المرضى</a> / ${esc(p.file_no)}</div>
      <div class="page-head"><div class="grow"><h1>${esc(p.full_name)} ${statusPill(p.status)}</h1>${p.full_name_en ? `<div class="muted" dir="ltr" style="text-align:right">${esc(p.full_name_en)}</div>` : ""}</div>
        <button class="btn" id="editP">تعديل البيانات</button>
        ${isAdmin() ? `<button class="btn danger" id="delP">حذف</button>` : ""}</div>
      <div class="panel"><div class="panel-body"><div class="grid cols-4">${info.map(([k, v]) => `<div><div class="hint">${k}</div><div>${v}</div></div>`).join("")}</div>
        ${p.notes ? `<div class="note-box" style="margin-top:14px">${esc(p.notes)}</div>` : ""}</div></div>
      <div class="panel">
        <div class="tabs"><button data-tab="plans" class="${tab === "plans" ? "on" : ""}">الخطط العلاجية (${plans.length})</button><button data-tab="reports" class="${tab === "reports" ? "on" : ""}">التقارير (${reports.length})</button><button data-tab="soap" class="${tab === "soap" ? "on" : ""}">ملاحظات الجلسات SOAP (${soaps.length})</button></div>
        <div data-pane="plans" class="${tab === "plans" ? "" : "hidden"}">
          <div class="panel-head"><span class="grow muted">الخطة التربوية الفردية للنطق واللغة</span>${canClinical() ? `<button class="btn" id="upPlan">⬆ رفع خطة جاهزة (ملف)</button> <a class="btn primary" href="#/plan/new?patient=${p.id}">+ خطة جديدة</a>` : ""}</div>
          ${plans.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>النوع</th><th>الفترة</th><th>الحالة</th><th>المركز</th><th>الأخصائي</th><th></th></tr></thead><tbody>${planRows}</tbody></table></div>` : `<div class="empty">لا توجد خطط بعد.</div>`}
        </div>
        <div data-pane="reports" class="${tab === "reports" ? "" : "hidden"}">
          <div class="panel-head"><span class="grow muted">تقييم أولي، تقرير تقييم، إعادة تقييم، تقييم مرحلي، خروج، أو تقرير لجهة خارجية</span>${canClinical() ? `<button class="btn primary" id="newR">+ تقرير جديد</button>` : ""}</div>
          ${reports.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>النوع</th><th>التاريخ</th><th>الحالة</th><th>التقرير التالي</th><th>المركز</th><th>الأخصائي</th><th></th></tr></thead><tbody>${reportRows}</tbody></table></div>` : `<div class="empty">لا توجد تقارير بعد.</div>`}
        </div>
        <div data-pane="soap" class="${tab === "soap" ? "" : "hidden"}">${window.SOAP ? window.SOAP.listHtml(soaps, p, canClinical()) : ""}</div>
      </div>`;
    main.querySelectorAll("[data-tab]").forEach((b) => b.onclick = () => {
      main.querySelectorAll("[data-tab]").forEach((x) => x.classList.toggle("on", x === b));
      main.querySelectorAll("[data-pane]").forEach((x) => x.classList.toggle("hidden", x.dataset.pane !== b.dataset.tab));
      history.replaceState(null, "", `#/patient/${id}?tab=${b.dataset.tab}`); lastHash = location.hash;
    });
    main.querySelectorAll('[data-pane="soap"] [data-go]').forEach((tr) => tr.onclick = (e) => { if (!e.target.closest("a")) go(tr.dataset.go); });
    main.querySelector("#editP").onclick = () => patientModal(p, () => route());
    const del = main.querySelector("#delP");
    if (del) del.onclick = async () => {
      if (!confirm(`حذف ملف ${p.full_name} نهائياً مع كل خططه وتقاريره؟ لا يمكن التراجع.`)) return;
      try { await pb.collection("patients").delete(p.id); toast("تم الحذف"); go("#/patients"); } catch (e) { toast(errText(e), true); }
    };
    main.querySelectorAll("[data-upfile]").forEach((b) => b.onclick = async () => {
      const r = plans.find((x) => x.id === b.dataset.upfile);
      try { toast("جاري فتح الملف…"); await pb.files.download(r, b.dataset.name); } catch (err) { toast(errText(err), true); }
    });
    const up = main.querySelector("#upPlan");
    if (up) up.onclick = () => uploadPlanModal(p);
    const nr = main.querySelector("#newR");
    if (nr) nr.onclick = () => modal("نوع التقرير", `<div id="types" class="bank" style="max-height:none">${REPORT_TYPES.map((t) => `<button class="chip" data-t="${esc(t)}" style="text-align:start"><strong>${esc(t)}</strong><div class="hint">${esc(REPORT_HINT[t])}</div></button>`).join("")}</div>`, {})
      .querySelector("#types").addEventListener("click", (e) => {
        const c = e.target.closest(".chip"); if (!c) return;
        document.querySelector(".modal-back").remove();
        go(`#/report/new?patient=${p.id}&type=${encodeURIComponent(c.dataset.t)}`);
      });
    bindDocButtons(main, { plans, reports, patient: p });
  }

  function docButtons(kind, r) {
    return `<button class="btn sm" data-doc="${kind}:${r.id}:docx" title="تنزيل Word">Word</button><button class="btn sm" data-doc="${kind}:${r.id}:pdf" title="طباعة / حفظ PDF">PDF</button>`;
  }
  // ----- therapist chooser used by the "upload a ready plan" form (same center rule as the editor)
  function thChooserHtml(centerId, cur) {
    const list = (S.therapists || []).filter((t) => inCenterOf(t, centerId));
    if (!isAdmin() && inCenterOf(S.me, centerId)) return `<div class="input" style="background:#f6f6f6">${esc(S.me.name)}</div><input type="hidden" name="therapist" value="${S.me.id}">`;
    const def = cur && list.some((t) => t.id === cur) ? cur : (isAdmin() ? S.me.id : "");
    return `<select class="input" name="therapist"><option value="">— اختر أخصائياً من معالجي هذا المركز —</option>${isAdmin() && !list.some((t) => t.id === S.me.id) ? `<option value="${S.me.id}" ${def === S.me.id ? "selected" : ""}>${esc(S.me.name)}</option>` : ""}${list.map((t) => `<option value="${t.id}" ${t.id === def ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select>
      ${!isAdmin() ? `<div class="hint" style="color:#a15c07">أنت غير مصنّف على هذا المركز، فالخطة لازم تكون باسم أحد معالجيه.</div>` : ""}`;
  }

  // ----- upload a ready-made plan (PDF / Word / image) into the child's file
  function uploadPlanModal(p, rec) {
    const isNew = !rec; rec = rec || { center: p.center, status: "سارية", start_date: toPb(today()), end_date: toPb(addMonths(today(), 6)), plan_type: "الخطة التربوية الفردية" };
    const m = modal(isNew ? "رفع خطة علاجية جاهزة" : "بيانات الخطة المرفوعة", `<div class="grid cols-2">
      ${isNew ? `<div class="field" style="grid-column:span 2"><label class="f">ملف الخطة (PDF / Word / صورة) *</label><input class="input" type="file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"></div>` : ""}
      <div class="field"><label class="f">المركز</label><select class="input" name="center">${S.centers.map((c) => `<option value="${c.id}" ${rec.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
      <div class="field"><label class="f">الأخصائي/ة</label><div id="thBox">${thChooserHtml(rec.center, rec.therapist)}</div></div>
      <div class="field"><label class="f">نوع الخطة</label><input class="input" name="plan_type" value="${esc(rec.plan_type)}"></div>
      <div class="field"><label class="f">حالة الخطة</label><select class="input" name="status">${PLAN_STATUS.map((t) => `<option ${rec.status === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label class="f">تاريخ البداية *</label><input class="input" type="date" name="start_date" value="${d10(rec.start_date)}"></div>
      <div class="field"><label class="f">تاريخ الانتهاء / إعادة التقييم *</label><input class="input" type="date" name="end_date" value="${d10(rec.end_date)}"></div></div>
      ${isNew ? `<div class="field"><label class="f">أهداف الخطة</label><div id="piBox" class="hint">اختر ملف Word (.docx) بنفس نموذج الموقع، وبتنقرأ الأهداف لحالها.</div></div>` : ""}
      <p class="hint">الخطة المرفوعة تُحفظ في ملف الطفل، ويصل تذكير تجديدها قبل تاريخ الانتهاء متل باقي الخطط.</p>`, {
      okText: isNew ? "رفع وحفظ" : "حفظ",
      onOk: async (root) => {
        const f = isNew ? root.querySelector('[name="file"]').files[0] : null;
        const data = { patient: p.id, center: val(root, "center"), therapist: val(root, "therapist"), plan_type: val(root, "plan_type") || "الخطة التربوية الفردية", status: val(root, "status"),
          start_date: toPb(val(root, "start_date")), end_date: toPb(val(root, "end_date")), uploaded: true };
        if (isNew && !f) { toast("اختر ملف الخطة", true); return false; }
        if (!data.therapist) { toast("اختر اسم الأخصائي من معالجي هذا المركز.", true); return false; }
        if (!data.start_date || !data.end_date) { toast("حدد تاريخ البداية والانتهاء", true); return false; }
        if (f) data["files+"] = [f];
        if (isNew && parsed && parsed.ok) { const blocks = window.PlanImport.clean(parsed.blocks); if (blocks.length) data.plan_data = { blocks, imported: true }; }
        if (isNew) await pb.collection("plans").create(data); else await pb.collection("plans").update(rec.id, data);
        toast(isNew ? "تم رفع الخطة إلى ملف الطفل ✓" : "تم الحفظ ✓"); route();
      },
    });
    m.querySelector('[name="center"]').onchange = (e) => { m.querySelector("#thBox").innerHTML = thChooserHtml(e.target.value, ""); };
    // read the goals (and dates) out of a Word plan
    let parsed = null;
    const fi = m.querySelector('[name="file"]');
    if (fi && window.PlanImport) fi.onchange = async () => {
      const box = m.querySelector("#piBox"), f = fi.files[0]; parsed = null;
      if (!f) return;
      box.textContent = "جاري قراءة الأهداف من الملف…";
      parsed = await window.PlanImport.parse(f);
      if (!parsed.ok) { box.innerHTML = `<div class="note-box">${esc(window.PlanImport.REASON[parsed.reason] || "")}</div>`; return; }
      const inf = parsed.info, warn = [];
      if (inf.start) m.querySelector('[name="start_date"]').value = inf.start;
      if (inf.end) m.querySelector('[name="end_date"]').value = inf.end;
      if (inf.file_no && String(inf.file_no).trim() !== String(p.file_no).trim()) warn.push(`⚠ رقم الملف داخل الخطة (${inf.file_no}) لا يطابق ملف هذا الطفل (${p.file_no}). تأكد إنك رافع الخطة الصحيحة.`);
      box.innerHTML = (warn.length ? `<div class="note-box" style="margin-bottom:8px;color:#a15c07">${esc(warn.join(" "))}</div>` : "") + (inf.start || inf.end ? `<div class="hint">تمت قراءة التواريخ من الملف.</div>` : "") + `<div id="piList"></div>`;
      window.PlanImport.review(box.querySelector("#piList"), parsed.blocks, esc);
    };
  }

  // an uploaded plan opens as its details + file(s) instead of the plan editor
  function pageUploadedPlan(rec, patient) {
    const main = shell("patients", "");
    main.innerHTML = `<div class="crumbs"><a href="#/patients">المرضى</a> / <a href="#/patient/${patient.id}?tab=plans">${esc(patient.full_name)}</a> / خطة مرفوعة</div>
      <div class="page-head"><h1 class="grow">${esc(rec.plan_type)} — ${esc(patient.full_name)}</h1>${statusPill(rec.status)}<span class="pill info">ملف مرفوع</span></div>
      <div class="panel"><div class="panel-body"><div class="grid cols-4">
        <div><div class="hint">المركز</div>${centerTag(rec.center)}</div><div><div class="hint">الفترة</div>${d10(rec.start_date)} ← ${d10(rec.end_date)}</div>
        <div><div class="hint">الأخصائي</div>${esc(rec.expand && rec.expand.therapist ? rec.expand.therapist.name : "")}</div><div><div class="hint">الحالة</div>${esc(rec.status)}</div></div>
        <div style="margin-top:14px"><div class="hint"><strong>أهداف الخطة (تظهر للاختيار في ملاحظات الجلسات):</strong></div>
          ${((rec.plan_data || {}).blocks || []).length ? `<ol style="margin:6px 0">${window.Forms.plan.allGoals(rec.plan_data, "ar", FC.personCtx(patient, "ar")).map((g) => `<li>${esc(g.text)}</li>`).join("")}</ol>` : `<div class="hint">لا توجد أهداف مقروءة لهذه الخطة.</div>`}
          ${canClinical() && (rec.files || []).some((f) => /\.docx$/i.test(f)) ? `<button class="btn sm" id="reread">⟳ قراءة الأهداف من ملف Word</button>` : ""}<div id="piBox2" style="margin-top:8px"></div></div>
        <div style="margin-top:14px" id="fb">${filesBlock(rec, "plans")}</div>
        ${canClinical() ? `<div class="btn-row" style="margin-top:12px"><button class="btn" id="edU">تعديل البيانات</button><button class="btn primary" id="svF">حفظ المرفقات</button>${isAdmin() ? `<button class="btn danger" id="delU">حذف</button>` : ""}</div>` : ""}</div></div>`;
    const st = {};
    bindFiles(main, rec, "plans", st);
    const ed = main.querySelector("#edU"); if (ed) ed.onclick = () => uploadPlanModal(patient, rec);
    const rr = main.querySelector("#reread"); if (rr) rr.onclick = async () => {
      const name = rec.files.find((f) => /\.docx$/i.test(f));
      rr.disabled = true;
      try {
        const r = await pb.call({ action: "fileData", token: pb.authStore.token, collection: "plans", id: rec.id, name });
        const bytes = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
        const res = await window.PlanImport.parse(new File([bytes], r.name || "plan.docx"));
        const box = main.querySelector("#piBox2");
        if (!res.ok) { box.innerHTML = `<div class="note-box">${esc(window.PlanImport.REASON[res.reason] || "")}</div>`; rr.disabled = false; return; }
        box.innerHTML = `<div id="piList"></div><button class="btn sm primary" id="piSave" style="margin-top:6px">حفظ الأهداف</button>`;
        window.PlanImport.review(box.querySelector("#piList"), res.blocks, esc);
        box.querySelector("#piSave").onclick = async () => {
          const blocks = window.PlanImport.clean(res.blocks);
          if (!blocks.length) { toast("ما في أهداف للحفظ.", true); return; }
          try { await pb.collection("plans").update(rec.id, { therapist: rec.therapist, center: rec.center, plan_data: { blocks, imported: true } }); toast("تم حفظ أهداف الخطة ✓"); route(); } catch (e) { toast(errText(e), true); }
        };
      } catch (e) { toast(errText(e), true); }
      rr.disabled = false;
    };
    const sv = main.querySelector("#svF"); if (sv) sv.onclick = async () => {
      try { await pb.collection("plans").update(rec.id, filePayload(main, st, { therapist: rec.therapist, center: rec.center })); dirty = false; toast("تم الحفظ ✓"); route(); } catch (e) { toast(errText(e), true); }
    };
    const del = main.querySelector("#delU"); if (del) del.onclick = async () => {
      if (!confirm("حذف هذه الخطة المرفوعة نهائياً؟")) return;
      await pb.collection("plans").delete(rec.id); toast("تم الحذف"); go(`#/patient/${patient.id}?tab=plans`);
    };
  }

  function bindDocButtons(root, { plans, reports, patient }) {
    root.querySelectorAll("[data-doc]").forEach((b) => b.onclick = async () => {
      const [kind, id, fmt] = b.dataset.doc.split(":");
      const r = (kind === "plan" ? plans : reports).find((x) => x.id === id);
      if (r.uploaded && (r.files || []).length) { try { await pb.files.download(r, r.files[0]); } catch (e) { toast(errText(e), true); } return; }
      const text = kind === "plan" ? r.plan_text : r.report_text;
      if (!text) { toast("لم يتم توليد نص بعد. افتح المستند واضغط «توليد النص» ثم احفظ.", true); return; }
      const lang = (kind === "plan" ? r.plan_lang : r.report_lang) || "ar";
      const name = `${patient.file_no}_${kind === "plan" ? r.plan_type : r.report_type}_${d10(kind === "plan" ? r.start_date : r.report_date)}`;
      await exportDoc(fmt, text, lang, r.center || patient.center, name, { collection: kind + "s", id: r.id });
    });
  }

  // sigFrom: { collection, id } (saved plan/report -> its therapist) or { user } ; null = no signature
  async function exportDoc(fmt, text, lang, centerId, fileName, sigFrom) {
    const c = centerById(centerId);
    const logoUrl = c && c.logo ? pb.files.getURL(c, c.logo) : "";
    let sig = {}, sup = {};
    const wantSig = sigFrom && /\[\[SIG\]\]/.test(text);
    const wantSup = c && (c.sup_has_signature || c.sup_has_stamp) && /\[\[SUP\]\]|المشرف السريري|Clinical supervisor/i.test(text);
    const [rs, rp] = await Promise.all([
      wantSig ? pb.getSignature(sigFrom).catch(() => null) : null,
      wantSup ? pb.getSignature({ center: c.id }).catch(() => null) : null,
    ]);
    if (rs) sig = await X.loadSig({ sign: rs.signature, stamp: rs.stamp });
    if (rp) sup = await X.loadSig({ sign: rp.signature, stamp: rp.stamp });
    const opts = { lang, center: c, logoUrl, sig, sup, fileName: fileName.replace(/[\\/:*?"<>|]+/g, "-"), docTitle: fileName };
    try {
      if (fmt === "docx") { await X.exportDocx(text, opts); toast("تم تنزيل ملف Word"); }
      else X.exportPdf(text, opts);
    } catch (e) { console.error(e); toast("تعذر إنشاء الملف: " + e.message, true); }
  }

  // ------------------------------------------------------------------ attachments
  function filesBlock(rec, collection) {
    const files = (rec && rec.files) || [];
    return `<div class="field"><label class="f">المرفقات (نسخة موقعة، تقارير خارجية…) — PDF / Word / صور</label>
      <div class="files" id="fileList">${files.map((f) => `<span><a href="#" data-file="${esc(f)}">📎 ${esc(String(f).split("__").slice(1).join("__") || f)}</a> <button class="btn sm danger" data-rmfile="${esc(f)}" title="حذف">✕</button></span>`).join("") || '<span class="hint">لا توجد مرفقات</span>'}</div>
      <input type="file" id="newFiles" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="margin-top:8px"></div>`;
  }
  function bindFiles(root, rec, collection, state) {
    root.querySelectorAll("[data-file]").forEach((a) => a.onclick = async (e) => {
      e.preventDefault();
      try { toast("جاري فتح الملف…"); await pb.files.download(rec, a.dataset.file); } catch (err) { toast(errText(err), true); }
    });
    root.querySelectorAll("[data-rmfile]").forEach((b) => b.onclick = () => {
      state.removeFiles = state.removeFiles || [];
      state.removeFiles.push(b.dataset.rmfile);
      b.parentElement.style.opacity = .35; b.disabled = true; dirty = true;
    });
    const inp = root.querySelector("#newFiles");
    if (inp) inp.onchange = () => { dirty = true; };
  }
  function filePayload(root, state, data) {
    const inp = root.querySelector("#newFiles");
    if (inp && inp.files.length) data["files+"] = [...inp.files];
    if (state.removeFiles && state.removeFiles.length) data["files-"] = state.removeFiles;
    return data;
  }

  // ------------------------------------------------------------------ document editor (plans + all report types)
  const shortCenter = (c, lang) => (!c ? "" : lang === "ar" ? String(c.name_ar || "").replace(/^مركز\s+/, "") : (c.name_en || c.name_ar));
  const fullCenter = (c, lang) => (!c ? "" : lang === "ar" ? c.name_ar : (c.name_en || c.name_ar));

  async function pageDoc(coll, id, sb) {
    const q = qs();
    const isPlan = coll === "plans";
    sandbox = !!sb;
    let rec, patient;
    if (id === "new") {
      patient = sb ? samplePatient(q.g) : await pb.collection("patients").getOne(q.patient);
      if (isPlan) {
        const start = today();
        rec = { patient: patient.id, center: patient.center, plan_type: "الخطة التربوية الفردية", status: "سارية", start_date: toPb(start), end_date: toPb(addMonths(start, 6)), plan_lang: "ar", plan_text: "" };
        if (q.renew) {
          const prev = await pb.collection("plans").getOne(q.renew);
          const pd = deepClone(prev.plan_data) || {};
          const ns = d10(prev.end_date) || start;
          (pd.blocks || []).forEach((b) => (b.stgs || []).forEach((s) => { delete s.start; delete s.end; if (s.eval !== "achieved") s.eval = "training"; }));
          rec = { ...rec, center: prev.center || rec.center, plan_type: prev.plan_type, plan_lang: prev.plan_lang || "ar", previous: prev.id, plan_data: pd,
            start_date: toPb(ns), end_date: toPb(addMonths(ns, Number(pd.months) || 6)), sessions_approved: prev.sessions_approved };
        }
      } else {
        const type = q.type || "تقرير تقييم";
        const kind = KIND[type];
        rec = { patient: patient.id, center: patient.center, report_type: type, report_date: toPb(today()), status: "مسودة", report_lang: "ar", report_text: "",
          next_due: ["initial", "evaluation", "progress"].includes(kind) ? toPb(addMonths(today(), 6)) : "" };
        if (q.prev) rec.previous = q.prev;
      }
    } else {
      rec = await pb.collection(coll).getOne(id, { expand: "therapist" });
      patient = await pb.collection("patients").getOne(rec.patient);
      if (isPlan && rec.uploaded) return pageUploadedPlan(rec, patient);
    }
    const kind = isPlan ? "plan" : KIND[rec.report_type] || "external";
    const form = window.Forms[kind];
    let lang = (isPlan ? rec.plan_lang : rec.report_lang) || "ar";
    const pcAr = FC.personCtx(patient, "ar", today());
    const pcFor = (l) => FC.personCtx(patient, l, d10(isPlan ? rec.start_date : rec.report_date) || today());
    const pcUi = UI === "en" ? pcFor("en") : pcAr;
    const gxUi = (o) => FC.gx(tx(o), pcUi);
    const field = isPlan ? "plan_data" : "assessment";
    let restored = null;
    if (S.restoreDraft) {
      const k = S.restoreDraft; S.restoreDraft = null;
      try { restored = JSON.parse(localStorage.getItem(k) || "null"); } catch (_) {}
      if (restored) { Object.assign(rec, restored.rec || {}); rec[field] = restored.data; if (isPlan) rec.plan_text = restored.text; else rec.report_text = restored.text; lang = (isPlan ? rec.plan_lang : rec.report_lang) || lang; dirty = true; }
    }
    const data = (rec[field] && Object.keys(rec[field]).length) ? rec[field] : Object.assign(form.defaults(pcAr), rec[field] || {});
    if (isPlan) data.blocks = data.blocks || [];
    const fstate = {};
    const readonly = !canClinical();

    // Linked plan (progress / discharge / external)
    let plans = [];
    if (form.usesPlan) {
      plans = sb ? [samplePlan(patient)] : await pb.collection("plans").getFullList({ filter: pb.filter("patient = {:p}", { p: patient.id }), sort: "-start_date" });
      if (plans.length && !rec.plan && !q.plan && q.soap === "1" && !sb) {
        // a report built from session notes links to the plan those notes were written on
        const lastNote = await pb.collection("soap_notes").getFirstListItem(pb.filter("patient = {:p} && plan != ''", { p: patient.id }), { sort: "-date" }).catch(() => null);
        if (lastNote && plans.some((p) => p.id === lastNote.plan)) rec.plan = lastNote.plan;
      }
      if (plans.length && !rec.plan) rec.plan = (q.plan && plans.find((p) => p.id === q.plan) ? q.plan : (plans.find((p) => p.status === "سارية") || plans[0]).id);
    }
    const planRec = () => plans.find((p) => p.id === rec.plan);
    const planGoals = (l) => { const p = planRec(); return p && p.plan_data ? window.Forms.plan.allGoals(p.plan_data, l, pcFor(l)) : []; };
    // plan: parent / guardian name comes from the patient file when it is empty
    if (isPlan && !(data.guardian || "").trim() && patient.guardian_name) data.guardian = patient.guardian_name;
    if (kind === "progress" && id === "new" && !data.prev_level) {
      const pd = (planRec() || {}).plan_data || {};
      data.prev_level = [pd.r_receptive, pd.r_expressive, pd.r_articulation].filter(Boolean).map((t) => FC.gx(t, pcAr)).join(" ");
    }
    // progress report built from the session (SOAP) notes: on request (?soap=1 / button) — period = since the last progress report (or plan start)
    let soapInfo = "";
    if (kind === "progress" && !sb && window.SOAP && ((id === "new" && q.soap === "1") || S.soapFillFor === id)) {
      S.soapFillFor = null;
      const p = planRec();
      if (p) {
        const [notes, progsP] = await Promise.all([
          pb.collection("soap_notes").getFullList({ filter: pb.filter("patient = {:p} && plan = {:pl}", { p: patient.id, pl: p.id }), sort: "date" }),
          pb.collection("reports").getFullList({ filter: pb.filter("patient = {:p} && report_type = {:t}", { p: patient.id, t: "تقرير تقييم مرحلي" }), sort: "-report_date" }),
        ]);
        const to = d10(rec.report_date) || today();
        const prevR = progsP.find((r) => r.id !== rec.id && d10(r.report_date) < to);
        const after = prevR && d10(prevR.report_date) > d10(p.start_date) ? d10(prevR.report_date) : addDays(d10(p.start_date), -1);  // notes strictly after this date
        const from = addDays(after, 1);
        const goals = window.Forms.plan.allGoals(p.plan_data || {}, "ar", pcAr);
        const res = window.SOAP.progressFromNotes(notes, goals, after, to);
        data.gs = data.gs || {};
        res.rows.forEach((r) => { if (r.n) data.gs[r.g.key] = { s: r.s, pct: r.last }; });
        data.current_level = window.SOAP.progressSummary(res, from, to, pcFor(lang), lang);
        data.soap_period = { from, to, sessions: res.total, attended: res.attended };
        soapInfo = res.total ? `<div class="note-box" style="margin-bottom:12px">تمت تعبئة حالة الأهداف والمستوى الحالي من ${res.total} ملاحظة جلسة (${from} ← ${to}). راجعها قبل الحفظ.</div>`
          : `<div class="note-box" style="margin-bottom:12px">لا توجد ملاحظات جلسات (SOAP) لهذه الخطة بعد ${from}. أضف ملاحظات الجلسات من ملف الطفل أولاً.</div>`;
        dirty = true;
      }
    }

    // ----- field renderer
    const optLabel = (f, o) => (f.chipLabel === "short" && o.short && UI !== "en" ? o.short : gxUi(o));
    const fieldsById = {};
    function renderField(f) {
      fieldsById[f.id] = f;
      const hidden = f.show && !f.show(data) ? " hidden" : "";
      const lab = f.label && f.label.ar ? `<div class="q-label">${esc(tx(f.label))}${f.type === "multi" ? '<span class="tag">اختيار متعدد</span>' : ""}</div>` : "";
      const sugg = (f.suggest || []).length ? `<div class="chips sugg-row">${f.suggest.map((s, i) => `<button type="button" class="chip sugg" data-sugg="${f.id}" data-i="${i}" title="${esc(FC.gx(UI === "en" ? s.ar : (s.en || ""), UI === "en" ? pcAr : pcFor("en")))}">+ ${esc(gxUi(s))}</button>`).join("")}</div>` : "";
      const v = data[f.id];
      let inner = "";
      switch (f.type) {
        case "single": case "multi":
          inner = `<div class="chips">${f.options.map((o) => {
            const on = f.type === "multi" ? (v || []).includes(o.v) : v === o.v;
            return `<button type="button" class="chip${on ? " on" : ""}" data-path="${f.id}" data-v="${esc(o.v)}" data-mode="${f.type}" title="${esc(FC.gx(UI === "en" ? o.ar : (o.en || ""), UI === "en" ? pcAr : pcFor("en")))}">${esc(optLabel(f, o))}</button>`;
          }).join("")}</div>`; break;
        case "text": inner = `<input class="input" data-path="${f.id}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" ${f.ltr ? 'dir="ltr"' : ""}>` + sugg; break;
        case "number": inner = `<input class="input" type="number" min="0" data-path="${f.id}" value="${esc(v)}" style="max-width:180px">`; break;
        case "textarea": inner = `<textarea class="input" data-path="${f.id}" rows="3">${esc(v)}</textarea>` + sugg; break;
        case "list": inner = `<textarea class="input" data-path="${f.id}" rows="4" placeholder="سطر لكل بند">${esc(v)}</textarea>` + sugg + (f.suggestFrom ? `<div class="chips sugg-row" data-dyn="${f.suggestFrom}" data-for="${f.id}"></div>` : ""); break;
        case "matrix":
          inner = `<div class="table-wrap"><table class="t matrix${f.tone ? " tone" : ""}"><tbody>${f.rows.map((r) => `<tr><td class="mlabel">${esc(f.rowLabel === "short" && r.short && UI !== "en" ? r.short : gxUi(r))}</td>
            ${f.groups.map((g) => `<td>${g.label ? `<div class="hint">${esc(g.label)}</div>` : ""}<div class="chips">${g.options.map((o) => {
              const cur = ((v || {})[r.v] || {})[g.key];
              return `<button type="button" class="chip${cur === o.v ? " on" : ""}" data-path="${f.id}.${r.v}.${g.key}" data-v="${esc(o.v)}" data-mode="single">${esc(tx(o))}</button>`;
            }).join("")}</div></td>`).join("")}
            ${f.note ? `<td style="min-width:180px"><input class="input" placeholder="ملاحظة" data-path="${f.id}.${r.v}.note" value="${esc(((v || {})[r.v] || {}).note)}"></td>` : ""}
            ${f.noteWhen ? `<td style="min-width:200px"><input class="input mnote${((v || {})[r.v] || {}).s === f.noteWhen ? "" : " hidden"}" data-mnote="${f.id}.${r.v}" placeholder="${esc(tx(f.notePlaceholder) || "ملاحظة")}" data-path="${f.id}.${r.v}.note" value="${esc(((v || {})[r.v] || {}).note)}"></td>` : ""}</tr>`).join("")}</tbody></table></div>`; break;
        case "goals": inner = `<div id="goalsEditor"></div>`; break;
        case "plangoals": inner = `<div id="planGoals"></div>`; break;
      }
      return `<div class="q${hidden}" data-fid="${f.id}">${lab}${inner}</div>`;
    }

    const sections = form.sections;
    const sideHtml = sections.map((s, i) => `<a href="javascript:void 0" data-jump="${s.id}"><span>${esc(tx(s.title))}</span><span class="cnt" data-cnt="${s.id}"></span></a>`).join("") + `<a href="javascript:void 0" data-jump="doc"><span>النص النهائي والتصدير</span></a>`;
    const formHtml = sections.map((s, i) => `<div class="panel" id="s-${s.id}"><div class="panel-head"><h2 class="section-title grow"><span class="n">${i + 1}</span>${esc(tx(s.title))}</h2>${s.title.en && UI !== "en" ? `<span class="hint" dir="ltr">${esc(s.title.en)}</span>` : ""}</div>
      <div class="panel-body">${s.fields.map(renderField).join("")}</div></div>`).join("");

    const title = isPlan ? (id === "new" ? (rec.previous ? "تجديد الخطة التربوية الفردية" : "خطة تربوية فردية جديدة") : "الخطة التربوية الفردية") : rec.report_type;
    const topFields = isPlan ? `
        <div class="field"><label class="f">المركز (الترويسة)</label><select class="input" data-path="center">${S.centers.map((c) => `<option value="${c.id}" ${rec.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
        <div class="field"><label class="f">نوع الخطة</label><select class="input" data-path="plan_type">${["الخطة التربوية الفردية", "أخرى"].map((t) => `<option ${rec.plan_type === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label class="f">حالة الخطة</label><select class="input" data-path="status">${PLAN_STATUS.map((t) => `<option ${rec.status === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        <div class="field"><label class="f">تاريخ بدء الخطة</label><input class="input" type="date" id="sd" value="${d10(rec.start_date)}"></div>
        <div class="field"><label class="f">تاريخ انتهاء الخطة / إعادة التقييم</label><input class="input" type="date" id="ed" value="${d10(rec.end_date)}"><div class="hint">يُحسب تلقائياً من مدة الخطة ويمكن تعديله.</div></div>
        <div class="field"><label class="f">عدد الجلسات الموافق عليها (تأمين)</label><input class="input" type="number" min="0" data-path="sessions_approved" value="${esc(rec.sessions_approved ?? "")}"></div>
        <div class="field" id="thField"></div>`
      : `
        <div class="field"><label class="f">المركز (الترويسة)</label><select class="input" data-path="center">${S.centers.map((c) => `<option value="${c.id}" ${rec.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
        <div class="field"><label class="f">${esc(form.dateLabel ? tx(form.dateLabel) : "تاريخ التقرير")}</label><input class="input" type="date" id="rd" value="${d10(rec.report_date)}"></div>
        <div class="field"><label class="f">حالة التقرير</label><select class="input" data-path="status">${["مسودة", "نهائي"].map((t) => `<option ${rec.status === t ? "selected" : ""}>${t}</option>`).join("")}</select></div>
        ${form.noNextDue ? "" : `<div class="field"><label class="f">موعد التقرير التالي (للتذكير)</label><input class="input" type="date" id="nd" value="${d10(rec.next_due)}"><div class="hint">فارغ = لا يوجد تقرير لاحق. الافتراضي بعد 6 أشهر.</div></div>`}
        <div class="field" id="thField"></div>
        ${form.usesPlan ? `<div class="field" style="grid-column: span 2"><label class="f">الخطة المرتبطة</label>${plans.length ? `<select class="input" id="planSel">${plans.map((p) => `<option value="${p.id}" ${p.id === rec.plan ? "selected" : ""}>${esc(p.plan_type)}: ${d10(p.start_date)} ← ${d10(p.end_date)} (${esc(p.status)})</option>`).join("")}</select>` : `<div class="note-box">لا توجد خطة محفوظة لهذا المريض.</div>`}</div>` : ""}`;

    const main = shell(sb ? "forms" : "patients", "");
    main.innerHTML = `
      ${sb ? `<div class="note-box" style="margin-bottom:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><strong>وضع المعاينة:</strong> هذا النموذج كما يراه الأخصائي، على مريض تجريبي. جرّب الخيارات و«توليد النص» وWord وPDF — لا يُحفظ أي شيء.
        <span class="grow" style="flex:1"></span>المريض التجريبي:
        <a class="btn sm ${patient.gender === "ذكر" ? "primary" : ""}" href="${location.hash.replace(/[?&]g=[^&]*/, "").replace(/\?$/, "")}${location.hash.includes("?") ? "&" : "?"}g=m">طفل</a>
        <a class="btn sm ${patient.gender === "أنثى" ? "primary" : ""}" href="${location.hash.replace(/[?&]g=[^&]*/, "").replace(/\?$/, "")}${location.hash.includes("?") ? "&" : "?"}g=f">طفلة</a>
        <a class="btn sm" href="#/forms">← كل النماذج</a></div>` : ""}
      <div class="crumbs">${sb ? `<a href="#/forms">النماذج</a> / ${esc(title)}` : `<a href="#/patients">المرضى</a> / <a href="#/patient/${patient.id}?tab=${isPlan ? "plans" : "reports"}">${esc(patient.full_name)}</a> / ${esc(title)}`}</div>
      <div class="page-head"><h1 class="grow">${esc(title)} — ${esc(patient.full_name)}</h1>${rec.status ? statusPill(rec.status) : ""}
        ${rec.previous && id === "new" && isPlan ? `<span class="pill info">الأهداف منسوخة من الخطة السابقة</span>` : ""}</div>
      <div class="editor">
        <aside class="side panel"><div class="panel-body side-nav">${sideHtml}</div></aside>
        <div id="root">
          ${soapInfo}${kind === "progress" && !sb ? `<div style="margin-bottom:10px"><button class="btn" id="soapFill" type="button">⟳ تعبئة من ملاحظات الجلسات (SOAP)</button></div>` : ""}
          <div class="panel" id="topPanel"><div class="panel-head"><h2 class="grow">بيانات ${isPlan ? "الخطة" : "التقرير"}</h2></div><div class="panel-body"><div class="grid cols-3">${topFields}</div></div></div>
          <div id="formRoot">${formHtml}</div>
          <div class="panel" id="s-doc"><div class="panel-head"><h2 class="grow">النص النهائي والتصدير</h2><span class="hint">راجع النص وعدّله بحرية قبل الحفظ</span></div><div class="panel-body">
            <details class="hint" style="margin-bottom:8px"><summary>رموز التنسيق في النص</summary># عنوان · ## عنوان قسم · ### عنوان فرعي مسطّر · - نقطة · 1. ترقيم · **عريض** · ^^ سطر في الوسط · | جدول | · ::info2 / ::info4 / ::grid2 جداول البيانات · ::box فقرة بخلفية خفيفة · ### {g} / {a} / {b} عنوان ملوّن (أخضر / كهرماني / أزرق رمادي)</details>
            <textarea class="input doc" id="docText" placeholder="اختر الإجابات أعلاه ثم اضغط «توليد النص»…">${esc(isPlan ? rec.plan_text : rec.report_text)}</textarea>
            ${id !== "new" ? filesBlock(rec, coll) : ""}
          </div>
          ${readonly && !sb ? "" : `<div class="sticky-actions">
            <div class="lang-toggle" id="langT"><button data-l="ar">عربي</button><button data-l="en">English</button></div>
            <button class="btn" id="gen">${kind === "scanning" ? "إنشاء التقرير" : "توليد النص"}</button>
            <button class="btn" id="copyBtn" title="نسخ النص">نسخ النص</button><span class="grow"></span>
            <button class="btn" id="wordBtn">Word</button><button class="btn" id="pdfBtn">PDF</button>
            ${sb ? `<span class="pill warn">معاينة — لا يوجد حفظ</span>` : `<button class="btn primary" id="save">${kind === "scanning" ? "حفظ في ملف الطفل" : "حفظ"}</button>`}
            ${!isPlan && !sb && kind === "scanning" ? `<a class="btn" id="newForm" href="#/report/new?patient=${patient.id}&type=${encodeURIComponent(rec.report_type)}">نموذج جديد</a>` : ""}</div>`}
          </div>
        </div>
      </div>`;

    const root = main.querySelector("#root"), formRoot = main.querySelector("#formRoot"), top = main.querySelector("#topPanel");
    const docText = main.querySelector("#docText");
    bind(top, rec);
    bind(formRoot, data, (path) => { refreshShow(); updateCounts(); if (path.startsWith("gs.")) refreshDyn(); if (isPlan && path === "months") syncEnd(); });
    main.querySelectorAll("[data-jump]").forEach((a) => a.onclick = () => main.querySelector("#s-" + a.dataset.jump).scrollIntoView({ behavior: "smooth", block: "start" }));

    function refreshShow() {
      Object.values(fieldsById).forEach((f) => { if (!f.show) return; const el = formRoot.querySelector(`[data-fid="${f.id}"]`); if (el) el.classList.toggle("hidden", !f.show(data)); });
      // matrix rows with a note box that opens only for one answer (e.g. "غير سليم")
      Object.values(fieldsById).forEach((f) => { if (!f.noteWhen) return; f.rows.forEach((r) => {
        const el = formRoot.querySelector(`[data-mnote="${f.id}.${r.v}"]`); if (!el) return;
        const open = ((data[f.id] || {})[r.v] || {}).s === f.noteWhen, was = !el.classList.contains("hidden");
        el.classList.toggle("hidden", !open); if (open && !was) el.focus();
      }); });
    }
    function updateCounts() {
      sections.forEach((s) => {
        const el = main.querySelector(`[data-cnt="${s.id}"]`); if (!el) return;
        const fs = s.fields.filter((f) => !["goals", "plangoals"].includes(f.type) && (!f.show || f.show(data)));
        if (!fs.length) { el.textContent = ""; return; }
        const n = fs.filter((f) => !FC.isEmpty(data[f.id])).length;
        el.textContent = `${n}/${fs.length}`; el.classList.toggle("done", n === fs.length);
      });
    }
    updateCounts();

    // suggestions (append text in the current document language)
    formRoot.addEventListener("click", (e) => {
      const b = e.target.closest(".chip.sugg"); if (!b) return;
      const f = fieldsById[b.dataset.sugg]; if (!f) return;
      const s = b.dataset.dyn ? { ar: b.dataset.text, en: b.dataset.text } : f.suggest[+b.dataset.i];
      const txt = FC.gx(s[lang] || s.ar, pcFor(lang));
      const el = formRoot.querySelector(`[data-path="${f.id}"]`);
      if (f.replace || f.type === "text") el.value = f.replace ? txt : (el.value ? el.value + "، " + txt : txt);
      else if (f.type === "list") el.value = (el.value.trim() ? el.value.replace(/\s+$/, "") + "\n" : "") + txt;
      else el.value = (el.value.trim() ? el.value.replace(/\s+$/, "") + " " : "") + txt;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // dynamic suggestions: open goals of the linked plan
    function refreshDyn() {
      formRoot.querySelectorAll("[data-dyn]").forEach((box) => {
        const gl = planGoals(lang).filter((g) => ((data.gs || {})[g.key] || {}).s !== "achieved");
        box.innerHTML = gl.length ? `<span class="hint" style="width:100%">أهداف من الخطة لم تتحقق بعد:</span>` + gl.map((g) => `<button type="button" class="chip sugg" data-sugg="${box.dataset.for}" data-dyn="1" data-text="${esc(g.text)}">+ ${esc(g.text.length > 90 ? g.text.slice(0, 90) + "…" : g.text)}</button>`).join("") : "";
      });
    }

    // plan-linked goals with status chips (progress / discharge)
    function renderPlanGoals() {
      const box = formRoot.querySelector("#planGoals"); if (!box) return;
      const f = Object.values(fieldsById).find((x) => x.type === "plangoals");
      const gl = planGoals("ar");
      data.gs = data.gs || {};
      if (!gl.length) { box.innerHTML = `<div class="note-box">${planRec() ? "الخطة المختارة لا تحتوي على أهداف قصيرة المدى." : "لا توجد خطة مرتبطة — سيُكتب التقرير بدون قائمة أهداف."}</div>`; refreshDyn(); return; }
      let last = -1;
      box.innerHTML = gl.map((g) => {
        const head = g.block !== last ? `<h3 style="margin:12px 0 6px">${esc(g.ltg || g.general)}</h3>` : ""; last = g.block;
        const cur = data.gs[g.key] || {};
        return `${head}<div class="goal-row"><div style="margin-bottom:6px">${esc(g.text)} ${g.eval ? `<span class="hint">(في الخطة: ${esc(evalLabel(g))})</span>` : ""}</div>
          <div class="chips">${f.statuses.map((o) => `<button type="button" class="chip${cur.s === o.v ? " on" : ""}" data-path="gs.${g.key}.s" data-v="${o.v}" data-mode="single">${esc(tx(o))}</button>`).join("")}
          ${f.pct ? `<input class="input" type="number" min="0" max="100" data-path="gs.${g.key}.pct" value="${esc(cur.pct)}" placeholder="% الإنجاز" style="width:120px">` : ""}</div></div>`;
      }).join("");
      refreshDyn();
    }
    const evalLabel = (g) => window.Forms.plan.evalText(g, UI);
    renderPlanGoals();
    const ps = main.querySelector("#planSel");
    if (ps) ps.onchange = () => { rec.plan = ps.value; data.gs = {}; dirty = true; renderPlanGoals(); };

    // ----- plan: goals editor
    const PF = window.Forms.plan;
    function renderGoalsEditor() {
      const box = formRoot.querySelector("#goalsEditor"); if (!box) return;
      const pc = pcFor(lang);
      const txt = (o) => (o ? (o[lang] || o[lang === "ar" ? "en" : "ar"] || "") : "");
      box.innerHTML = (data.blocks.length ? "" : `<div class="note-box" style="margin-bottom:10px">ابدأ بإضافة هدف عام (مجال)، ثم اختر الهدف طويل المدى، ثم أضف الأهداف قصيرة المدى من البنك أو اكتبها.</div>`)
        + (() => { let dom = 0, n = 0; return data.blocks.map((b, bi) => {
          // Several long-term goals can sit under one general goal (consecutive blocks with the same domain).
          const first = bi === 0 || data.blocks[bi - 1].general !== b.general;
          const last = bi === data.blocks.length - 1 || data.blocks[bi + 1].general !== b.general;
          if (first) { dom++; n = 0; } n++;
          const skills = PF.LTG_SKILLS[b.general] || [];
          const bank = PF.STG_BANK[b.general] || [];
          const used = new Set(data.blocks.filter((x) => x.general === b.general).map((x) => ((x.ltg || {}).ar || "").trim()));
          return `${first ? `<div class="domain-head"><span class="section-title"><span class="n">${dom}</span></span><strong>الهدف العام:</strong>
              <select class="input" data-b="${bi}" data-k="general" style="width:auto">${PF.DOMAINS.map((o) => `<option value="${o.v}" ${b.general === o.v ? "selected" : ""}>${esc(tx(o))}</option>`).join("")}</select></div>` : ""}
            <div class="goal-block panel ltg-block" style="box-shadow:none;margin-bottom:14px"><div class="panel-head" style="flex-wrap:wrap">
              <span class="pill info">الهدف طويل المدى ${dom}.${n}</span>
              <span class="grow"></span><button class="btn sm" data-bmv="${bi}:-1" title="تحريك لفوق">↑</button><button class="btn sm" data-bmv="${bi}:1" title="تحريك لتحت">↓</button><button class="btn sm danger" data-brm="${bi}">حذف هذا الهدف</button></div>
            <div class="panel-body">
              <label class="f">الهدف طويل المدى</label>
              <textarea class="input" rows="2" data-b="${bi}" data-k="ltg" dir="${lang === "ar" ? "rtl" : "ltr"}">${esc(txt(b.ltg))}</textarea>
              ${skills.length ? `<details class="ltg-bank" ${!txt(b.ltg).trim() || last ? "open" : ""}><summary class="hint" style="cursor:pointer">اقتراحات أهداف طويلة المدى لهذا المجال (${skills.length}) — إذا الخانة معبّاية، الاقتراح بينضاف كهدف طويل جديد تحت نفس الهدف العام</summary>
                <div class="chips sugg-row">${skills.map((s, i) => { const done = used.has(PF.ltgText(s, "ar", pcFor("ar")).trim()); return `<button type="button" class="chip sugg${done ? " on" : ""}" data-ltg="${bi}:${i}" ${done ? 'title="مستخدم"' : ""}>${done ? "" : "+ "}${esc(tx(s))}</button>`; }).join("")}</div></details>` : ""}
              <h3 style="margin:14px 0 8px">الأهداف قصيرة المدى</h3>
              ${(b.stgs || []).map((s, si) => {
                const t = txt(s); const noNum = t && !/\d/.test(t);
                const mc = (key, opts) => `<div class="chips">${opts.map((o) => `<button type="button" class="chip${(s[key] || []).includes(o.v) ? " on" : ""}" data-gchip="${bi}:${si}:${key}" data-v="${o.v}">${esc(tx(o))}</button>`).join("")}</div>`;
                return `<div class="goal-row">
                  <div class="top"><span class="num">${si + 1}</span><span class="grow" style="flex:1"></span>${noNum ? `<span class="pill warn" title="بند C9: كل هدف قصير المدى يحتاج معياراً رقمياً">⚠ بدون معيار رقمي</span>` : ""}
                    <button class="btn sm" data-smv="${bi}:${si}:-1">↑</button><button class="btn sm" data-smv="${bi}:${si}:1">↓</button><button class="btn sm danger" data-srm="${bi}:${si}">حذف</button></div>
                  <textarea class="input" rows="2" data-b="${bi}" data-s="${si}" data-k="text" dir="${lang === "ar" ? "rtl" : "ltr"}" placeholder="أن ${pc.C === "الطالبة" || pc.C === "الطفلة" ? "تـ…" : "يـ…"} ${esc(pc.C)} … بعدد 4 مرات صحيحة من أصل 5 محاولات">${esc(t)}</textarea>
                  <div class="chips sugg-row"><button type="button" class="chip sugg" data-crit="${bi}:${si}">+ ${lang === "ar" ? PF.CRIT_AR : PF.CRIT_EN}</button><button type="button" class="chip sugg" data-crit2="${bi}:${si}">+ ${lang === "ar" ? "بنسبة إتقان 80%" : "with 80% accuracy"}</button></div>
                  <div class="grid cols-2" style="margin-top:8px">
                    <div><label class="f">المواد والأدوات اللازمة</label>${mc("materials", PF.MATERIALS)}</div>
                    <div><label class="f">الاستراتيجيات التدريبية</label>${mc("strategies", PF.STRATEGIES)}</div>
                    <div><label class="f">التعزيز</label>${mc("reinf", PF.REINF)}</div>
                    <div><label class="f">التقييم</label><div class="chips">${PF.EVAL.map((o) => `<button type="button" class="chip${s.eval === o.v ? " on" : ""}" data-geval="${bi}:${si}" data-v="${o.v}">${esc(tx(o))}</button>`).join("")}
                      ${s.eval === "partial" ? `<input class="input" type="number" min="1" max="99" data-b="${bi}" data-s="${si}" data-k="pct" value="${esc(s.pct)}" placeholder="%" style="width:90px">` : ""}</div></div>
                    <div><label class="f">تاريخ البدء</label><input class="input" type="date" data-b="${bi}" data-s="${si}" data-k="start" value="${esc(s.start || d10(rec.start_date))}"></div>
                    <div><label class="f">تاريخ الانتهاء</label><input class="input" type="date" data-b="${bi}" data-s="${si}" data-k="end" value="${esc(s.end || d10(rec.end_date))}"></div>
                  </div></div>`;
              }).join("")}
              <div class="btn-row"><button class="btn" data-sadd="${bi}">+ هدف قصير فارغ</button></div>
              ${bank.length ? `<details style="margin-top:10px" open><summary class="f" style="cursor:pointer">بنك الأهداف لهذا المجال (اضغط لإضافة — استبدل X بالرقم أو الصوت)</summary><div class="bank" style="margin-top:6px">${bank.map((g, i) => `<button type="button" data-bank="${bi}:${i}">+ ${esc(gxUi(g))}</button>`).join("")}</div></details>` : ""}
            </div></div>
            ${last ? `<div class="btn-row" style="margin:-4px 0 18px"><button class="btn" data-ltgadd="${bi}">+ هدف طويل المدى آخر تحت نفس الهدف العام</button></div>` : ""}`;
        }).join(""); })()
        + `<div class="btn-row"><select class="input" id="newDomain" style="width:auto">${PF.DOMAINS.map((o) => `<option value="${o.v}">${esc(tx(o))}</option>`).join("")}</select><button class="btn primary" id="addBlock">+ إضافة هدف عام</button></div>`;
    }
    function goalsHandlers() {
      const box = formRoot.querySelector("#goalsEditor"); if (!box) return;
      const get = (s) => s.split(":").map(Number);
      box.addEventListener("input", (e) => {
        const el = e.target.closest("[data-b]"); if (!el || el.tagName === "SELECT") return;
        const b = data.blocks[+el.dataset.b]; const k = el.dataset.k;
        if (el.dataset.s == null) { if (k === "ltg") { b.ltg = b.ltg || {}; b.ltg[lang] = el.value; } }
        else { const s = b.stgs[+el.dataset.s]; if (k === "text") s[lang] = el.value; else s[k] = el.value; }
        dirty = true;
      });
      box.addEventListener("change", (e) => {
        const el = e.target.closest("select[data-b]"); if (!el) return;
        // the general-goal select sits on the first block of a run: change the whole run
        const bi = +el.dataset.b, old = data.blocks[bi].general;
        for (let k = bi; k < data.blocks.length && data.blocks[k].general === old; k++) data.blocks[k].general = el.value;
        dirty = true; renderGoalsEditor();
      });
      box.addEventListener("click", (e) => {
        const t = e.target.closest("button"); if (!t) return;
        const pc = pcFor(lang), pcA = pcFor("ar"), pcE = pcFor("en");
        const ds = t.dataset;
        if (t.id === "addBlock") { data.blocks.push({ general: box.querySelector("#newDomain").value, ltg: {}, stgs: [] }); }
        else if (ds.brm != null) { if (!confirm("حذف هذا الهدف طويل المدى مع أهدافه القصيرة؟")) return; data.blocks.splice(+ds.brm, 1); }
        else if (ds.ltgadd != null) { const bi = +ds.ltgadd; data.blocks.splice(bi + 1, 0, { general: data.blocks[bi].general, ltg: {}, stgs: [] }); }
        else if (ds.bmv) { const [i, dd] = get(ds.bmv); const j = i + dd; if (j < 0 || j >= data.blocks.length) return; [data.blocks[i], data.blocks[j]] = [data.blocks[j], data.blocks[i]]; }
        else if (ds.ltg) {
          const [bi, i] = get(ds.ltg); const b = data.blocks[bi]; const sk = PF.LTG_SKILLS[b.general][i];
          const ltg = { ar: PF.ltgText(sk, "ar", pcA), en: PF.ltgText(sk, "en", pcE) };
          if (!((b.ltg || {})[lang] || "").trim()) b.ltg = ltg;
          else {
            // this one is filled: add the suggestion as a NEW long-term goal at the end of the same general goal
            let end = bi; while (end + 1 < data.blocks.length && data.blocks[end + 1].general === b.general) end++;
            data.blocks.splice(end + 1, 0, { general: b.general, ltg, stgs: [] });
            toast("انضاف هدف طويل المدى جديد تحت نفس الهدف العام");
          }
        }
        else if (ds.sadd != null) { const b = data.blocks[+ds.sadd]; b.stgs = b.stgs || []; b.stgs.push({ ar: "", en: "", materials: [], strategies: ["verbal", "repetition"], reinf: ["tangible", "social"], eval: "not_started" }); }
        else if (ds.bank) { const [bi, i] = get(ds.bank); const g = PF.STG_BANK[data.blocks[bi].general][i]; const b = data.blocks[bi]; b.stgs = b.stgs || [];
          b.stgs.push({ ar: FC.gx(g.ar, pcA), en: FC.gx(g.en, pcE), materials: ["toys"], strategies: ["verbal", "physical", "repetition"], reinf: ["tangible", "social"], eval: "not_started" }); toast("تمت إضافة الهدف — عدّل X إن وجد"); }
        else if (ds.srm) { const [bi, si] = get(ds.srm); data.blocks[bi].stgs.splice(si, 1); }
        else if (ds.smv) { const [bi, si, dd] = get(ds.smv); const a = data.blocks[bi].stgs; const j = si + dd; if (j < 0 || j >= a.length) return; [a[si], a[j]] = [a[j], a[si]]; }
        else if (ds.gchip) { const [bi, si] = get(ds.gchip); const key = ds.gchip.split(":")[2]; const s = data.blocks[bi].stgs[si]; s[key] = s[key] || []; const k = s[key].indexOf(ds.v); if (k >= 0) s[key].splice(k, 1); else s[key].push(ds.v); }
        else if (ds.geval) { const [bi, si] = get(ds.geval); const s = data.blocks[bi].stgs[si]; s.eval = s.eval === ds.v ? "" : ds.v; }
        else if (ds.crit || ds.crit2) { const [bi, si] = get(ds.crit || ds.crit2); const s = data.blocks[bi].stgs[si]; const add = ds.crit ? (lang === "ar" ? PF.CRIT_AR : PF.CRIT_EN) : (lang === "ar" ? "بنسبة إتقان 80%" : "with 80% accuracy"); s[lang] = ((s[lang] || "").trim() + " " + add).trim(); }
        else return;
        dirty = true; renderGoalsEditor();
      });
    }
    if (isPlan) { renderGoalsEditor(); goalsHandlers(); }

    // ----- dates
    if (isPlan) {
      const sd = main.querySelector("#sd"), ed = main.querySelector("#ed");
      sd.oninput = () => { rec.start_date = toPb(sd.value); syncEnd(); dirty = true; };
      ed.oninput = () => { rec.end_date = toPb(ed.value); dirty = true; };
      var syncEnd = function () { if (sd.value && data.months) { ed.value = addMonths(sd.value, Number(data.months)); rec.end_date = toPb(ed.value); renderGoalsEditor(); } };
    } else {
      main.querySelector("#rd").oninput = (e) => { rec.report_date = toPb(e.target.value); dirty = true; };
      const ndEl = main.querySelector("#nd");
      if (ndEl) ndEl.oninput = (e) => { rec.next_due = toPb(e.target.value); dirty = true; };
    }

    // ----- the therapist whose name / signature goes on the document (classified by center)
    // In your own center the document is in your name. For a center you are not classified on,
    // you choose a therapist of that center. Admins may choose any therapist of the center.
    const thField = main.querySelector("#thField");
    const renderTh = () => {
      if (!thField) return;
      const cur = rec.therapist || (rec.expand && rec.expand.therapist && rec.expand.therapist.id) || "";
      const curU = (S.therapists || []).find((t) => t.id === cur);
      const list = (S.therapists || []).filter((t) => inCenterOf(t, rec.center));
      if (!sb) {
        if (curU && inCenterOf(curU, rec.center)) rec.therapist = cur;                       // keep (own or colleague's document)
        else if (isAdmin() || inCenterOf(S.me, rec.center)) rec.therapist = S.me.id;            // your name by default
        else rec.therapist = "";                                                              // must choose
      }
      const locked = sb || (!isAdmin() && inCenterOf(S.me, rec.center));
      const name = (u) => esc((UI === "en" && u.name_en) || u.name || u.username || "");
      thField.innerHTML = `<label class="f">الأخصائي/ة (يظهر اسمه وتوقيعه على المستند)</label>` + (locked
        ? `<div class="input" style="background:#f6f6f6">${name(therapistRec())}</div>`
        : `<select class="input" id="thSel"><option value="">— اختر أخصائياً من معالجي هذا المركز —</option>${list.map((t) => `<option value="${t.id}" ${t.id === rec.therapist ? "selected" : ""}>${name(t)}</option>`).join("")}</select>
           ${!isAdmin() && !inCenterOf(S.me, rec.center) ? `<div class="hint" style="color:#a15c07">أنت غير مصنّف على هذا المركز، فالمستند لازم يكون باسم أحد معالجيه.</div>` : `<div class="hint">القائمة حسب المركز المختار.</div>`}`);
      const sel = thField.querySelector("#thSel");
      if (sel) sel.onchange = () => {
        rec.therapist = sel.value; rec.expand = Object.assign({}, rec.expand, { therapist: (S.therapists || []).find((t) => t.id === sel.value) || null }); dirty = true;
        if (docText.value.trim()) toast("تغيّر اسم الأخصائي: اضغط «توليد النص» ليظهر الاسم الجديد في المستند.");
      };
    };
    const cSel = top.querySelector('[data-path="center"]');
    if (cSel) cSel.addEventListener("change", () => setTimeout(renderTh, 0));

    // ----- language toggle
    const langT = main.querySelector("#langT");
    function setLang(l) {
      lang = l; if (isPlan) rec.plan_lang = l; else rec.report_lang = l;
      if (langT) langT.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.l === l));
      docText.dir = l === "ar" ? "rtl" : "ltr";
      if (isPlan) renderGoalsEditor();
      refreshDyn();
    }
    // Switching the document language rewrites the text in that language right away.
    if (langT) langT.onclick = (e) => {
      const b = e.target.closest("button"); if (!b || b.dataset.l === lang) return;
      setLang(b.dataset.l); dirty = true;
      if (!docText.value.trim() || confirm(b.dataset.l === "en" ? "كتابة النص من جديد بالإنجليزي؟ (أي تعديل يدوي على النص الحالي رح ينمسح)" : "كتابة النص من جديد بالعربي؟ (أي تعديل يدوي على النص الحالي رح ينمسح)")) {
        docText.value = genText();
        toast(b.dataset.l === "en" ? "لغة المستند: English — تمت كتابة النص بالإنجليزي" : "لغة المستند: العربية — تمت كتابة النص بالعربي");
      } else toast("تم تغيير لغة المستند. اضغط «توليد النص» لما تكون جاهز.");
    };
    setLang(lang);

    // ----- generation & export
    const therapistRec = () => (rec.therapist && ((S.therapists || []).find((t) => t.id === rec.therapist) || (rec.expand && rec.expand.therapist && rec.expand.therapist.id === rec.therapist && rec.expand.therapist)))
      || (sandbox || rec.therapist === undefined ? S.me : { id: "", name: "" });
    renderTh();
    const ctxFor = (l) => {
      const c = centerById(rec.center); const p = planRec();
      return { lang: l, pc: pcFor(l), patient, therapistName: clinicianName(therapistRec(), l), reportDate: d10(isPlan ? rec.start_date : rec.report_date),
        startDate: d10(rec.start_date), endDate: d10(rec.end_date), centerShort: shortCenter(c, l), centerFull: fullCenter(c, l), supervisor: c ? ((l === "en" && c.supervisor_name_en) || c.supervisor_name) : "",
        reeval: rec.report_type === "تقرير إعادة تقييم", planGoals: planGoals(l), planStart: p ? d10(p.start_date) : "", planEnd: p ? d10(p.end_date) : "", planData: p ? p.plan_data : null };
    };
    const genText = () => {
      if (lang === "en") {
        const miss = [];
        if (!patient.full_name_en) miss.push("اسم المريض بالإنجليزي");
        if (!therapistRec().name_en) miss.push("اسم الأخصائي بالإنجليزي");
        if (miss.length) toast("للمستند الإنجليزي ينقص: " + miss.join(" و "), true);
      }
      if (!sandbox && !rec.therapist) { toast("اختر اسم الأخصائي أولاً (من معالجي مركز المستند).", true); return docText.value; }
      let out = form.generate(data, ctxFor(lang));
      if (lang === "en") {
        out = FC.toEnglish(out, pcAr, pcFor("en"));
        const left = FC.arabicLines(out);
        if (left) toast(`تنبيه: ${left} سطر بالنص لسا بالعربي (نص مكتوب يدوياً). ترجمه بنفسك قبل التنزيل.`, true);
      }
      return out;
    };
    const gen = main.querySelector("#gen");
    if (gen) gen.onclick = () => {
      if (docText.value.trim() && !confirm("سيتم استبدال النص الحالي بنص جديد مولّد من الخيارات. متابعة؟")) return;
      docText.value = genText(); dirty = true; docText.scrollIntoView({ behavior: "smooth" });
    };
    docText.oninput = () => { dirty = true; };
    const ensureText = () => {
      if (!docText.value.trim()) { docText.value = genText(); dirty = true; }
      else {
        // English document but the text is still mostly Arabic (written before switching): offer to rewrite it.
        const total = docText.value.split("\n").filter((x) => x.trim()).length || 1;
        const arabic = FC.arabicLines(docText.value);
        if (lang === "en" && arabic / total > 0.3 && confirm("لغة المستند إنجليزي بس النص لسا عربي. كتابة النص بالإنجليزي قبل التنزيل؟")) { docText.value = genText(); dirty = true; }
        if (lang === "ar" && arabic / total < 0.3 && confirm("لغة المستند عربي بس النص إنجليزي. كتابة النص بالعربي قبل التنزيل؟")) { docText.value = genText(); dirty = true; }
      }
      return docText.value;
    };
    const fname = () => `${patient.file_no}_${isPlan ? rec.plan_type : rec.report_type}_${d10(isPlan ? rec.start_date : rec.report_date)}`;
    if (main.querySelector("#wordBtn")) {
      // Saved document -> signature of its therapist; new/unsaved -> the therapist who is writing it.
      const sigFrom = () => (rec.id && !sandbox ? { collection: coll, id: rec.id } : { user: therapistRec().id || S.me.id });
      // Word / PDF only for a saved document with no unsaved changes (the preview page has no saving, so it stays free).
      const canExport = () => {
        if (sandbox) return true;
        if (id === "new" || dirty) { toast(kind === "scanning" ? "احفظ التقرير في ملف الطفل أولاً، بعدها نزّل Word أو PDF." : "احفظ أولاً، بعدها نزّل Word أو PDF.", true); const sv = main.querySelector("#save"); if (sv) { sv.classList.remove("pulse"); void sv.offsetWidth; sv.classList.add("pulse"); } return false; }
        if (!docText.value.trim()) { toast("النص فارغ: اضغط «" + (kind === "scanning" ? "إنشاء التقرير" : "توليد النص") + "» ثم احفظ، بعدها نزّل الملف.", true); return false; }
        return true;
      };
      const exText = () => (sandbox ? ensureText() : docText.value);
      main.querySelector("#wordBtn").onclick = () => { if (canExport()) exportDoc("docx", exText(), lang, rec.center, fname(), sigFrom()); };
      main.querySelector("#pdfBtn").onclick = () => { if (canExport()) exportDoc("pdf", exText(), lang, rec.center, fname(), sigFrom()); };
      main.querySelector("#wordBtn").title = main.querySelector("#pdfBtn").title = sandbox ? "" : "التنزيل متاح بعد الحفظ";
    }

    // ----- progress: (re)fill from SOAP notes
    const sfb = main.querySelector("#soapFill");
    if (sfb) sfb.onclick = () => {
      if (!rec.plan) { toast("اختر الخطة المرتبطة أولاً.", true); return; }
      if (!confirm("تعبئة حالة الأهداف والمستوى الحالي من ملاحظات الجلسات؟ (القيم الحالية لهذين الحقلين ستُستبدل)")) return;
      if (id === "new") { const u = new URLSearchParams(location.hash.split("?")[1] || ""); u.set("soap", "1"); u.set("plan", rec.plan); dirty = false; history.replaceState(null, "", "#/report/new?" + u.toString()); route(); }
      else { if (dirty) { toast("احفظ تعديلاتك أولاً، بعدها اضغط التعبئة من الملاحظات.", true); return; } S.soapFillFor = id; route(); }
    };

    // ----- copy text
    const copyBtn = main.querySelector("#copyBtn");
    if (copyBtn) copyBtn.onclick = async () => {
      if (!docText.value.trim()) { docText.value = genText(); dirty = true; }
      try { await navigator.clipboard.writeText(docText.value); toast("تم نسخ النص ✓"); }
      catch (_) { docText.focus(); docText.select(); try { document.execCommand("copy"); toast("تم نسخ النص ✓"); } catch (e) { toast("انسخ النص يدوياً (Ctrl+C)", true); } }
    };

    // ----- auto-saved draft (this browser only) so nothing is lost while filling
    const DRAFT_KEYS = ["center", "report_date", "next_due", "status", "therapist", "report_lang", "plan_lang", "start_date", "end_date", "plan_type", "sessions_approved", "plan"];
    const draftKey = sb || readonly ? "" : `draft:${coll}:${id === "new" ? `new:${patient.id}:${isPlan ? "plan" : rec.report_type}` : id}`;
    const writeDraft = () => {
      if (!draftKey || !dirty) return;
      const r = {}; DRAFT_KEYS.forEach((k) => { if (rec[k] !== undefined) r[k] = rec[k]; });
      try { localStorage.setItem(draftKey, JSON.stringify({ t: Date.now(), data, rec: r, text: docText.value })); } catch (_) {}
    };
    let draftTimer = 0;
    const schedDraft = () => { clearTimeout(draftTimer); draftTimer = setTimeout(writeDraft, 700); };
    if (draftKey) { main.addEventListener("input", schedDraft); main.addEventListener("click", schedDraft); main.addEventListener("change", schedDraft); }
    const clearDraft = () => { clearTimeout(draftTimer); if (draftKey) try { localStorage.removeItem(draftKey); } catch (_) {} };
    if (draftKey) {
      let dr = null; try { dr = JSON.parse(localStorage.getItem(draftKey) || "null"); } catch (_) {}
      const savedAt = rec.updated ? new Date(String(rec.updated).replace(" ", "T")).getTime() : 0;
      if (dr && dr.t > savedAt) {
        const bar = document.createElement("div");
        bar.className = "note-box"; bar.style.cssText = "margin-bottom:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap";
        bar.innerHTML = `<strong>يوجد مسودة غير محفوظة</strong> <span class="hint">(${esc(new Date(dr.t).toLocaleString(UI === "en" ? "en-GB" : "ar-EG"))})</span><span style="flex:1"></span><button class="btn sm primary" id="drRestore">استرجاع المسودة</button><button class="btn sm" id="drDrop">تجاهل</button>`;
        main.querySelector(".page-head").after(bar);
        bar.querySelector("#drRestore").onclick = () => { S.restoreDraft = draftKey; dirty = false; route(); };
        bar.querySelector("#drDrop").onclick = () => { clearDraft(); bar.remove(); };
      } else if (dr) clearDraft();
    }

    // ----- save
    const save = main.querySelector("#save");
    if (save) save.onclick = async () => {
      if (!isPlan && rec.status === "نهائي" && !docText.value.trim()) { toast("لا يمكن اعتماد تقرير بدون نص. اضغط «توليد النص» أولاً.", true); return; }
      if (isPlan && (!rec.start_date || !rec.end_date)) { toast("حدد تاريخ البداية والانتهاء", true); return; }
      if (!rec.therapist) { toast("اختر اسم الأخصائي من معالجي هذا المركز قبل الحفظ.", true); thField && thField.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      if (isPlan) {
        const noCrit = (data.blocks || []).flatMap((b) => b.stgs || []).filter((s) => { const t = s[lang] || s.ar || s.en || ""; return t.trim() && !/\d/.test(t); });
        if (noCrit.length && !confirm(`يوجد ${noCrit.length} هدف قصير المدى بدون معيار رقمي (بند C9 حرج). الحفظ على أي حال؟`)) return;
      }
      save.disabled = true;
      try {
        let payload;
        if (isPlan) {
          payload = { patient: patient.id, center: rec.center, plan_type: rec.plan_type, status: rec.status, start_date: rec.start_date, end_date: rec.end_date,
            sessions_approved: rec.sessions_approved === "" || rec.sessions_approved == null ? null : rec.sessions_approved, plan_lang: lang, plan_data: data, plan_text: docText.value,
            goals: PF.allGoals(data, lang, pcFor(lang)).map((g, i) => `${i + 1}. ${g.text}`).join("\n") };
        } else {
          payload = { patient: patient.id, center: rec.center, report_type: rec.report_type, report_date: rec.report_date, next_due: rec.next_due || "",
            status: rec.status, report_lang: lang, assessment: data, report_text: docText.value, plan: rec.plan || "" };

        }
        payload.therapist = rec.therapist;
        payload = filePayload(root, fstate, payload);
        if (id === "new" && rec.previous) payload.previous = rec.previous;
        const saved = id === "new" ? await pb.collection(coll).create(payload) : await pb.collection(coll).update(id, payload);
        clearDraft(); dirty = false; toast("تم الحفظ ✓");
        if (id === "new") { history.replaceState(null, "", `#/${isPlan ? "plan" : "report"}/${saved.id}`); lastHash = location.hash; }
        route();
      } catch (e) { toast(errText(e), true); }
      save.disabled = false;
    };
    if (id !== "new") bindFiles(root, rec, coll, fstate);
    if (readonly && !sb) root.querySelectorAll("input,select,textarea,.chip,.btn").forEach((el) => el.disabled = true);
  }

  // ------------------------------------------------------------------ forms preview (sandbox)
  function samplePatient(g) {
    const female = g === "f";
    const c = centerById(S.centerFilter) || S.centers.find((x) => x.code === "BEDAYA") || S.centers[0] || {};
    return { id: "sample", center: c.id, file_no: "0000", gender: female ? "أنثى" : "ذكر", nationality: "الإماراتية",
      full_name: female ? "سارة محمد (تجريبي)" : "أحمد محمد (تجريبي)", full_name_en: female ? "Sara Mohammad (sample)" : "Ahmad Mohammad (sample)",
      dob: toPb(addMonths(today(), -50)), start_date: toPb(addMonths(today(), -6)) };
  }
  function samplePlan(patient) {
    const PF = window.Forms.plan, pa = FC.personCtx(patient, "ar"), pe = FC.personCtx(patient, "en");
    const d = PF.defaults(pa);
    d.speech_dx = "تأخر لغوي استقبالي وتعبيري"; d.r_receptive = FC.gx("{يستطيع|تستطيع} اتباع الأوامر البسيطة المكوّنة من خطوة واحدة.", pa);
    d.r_expressive = FC.gx("{يعتمد|تعتمد} على الكلمات المفردة.", pa);
    const stg = (dom, i, ev) => ({ ar: FC.gx(PF.STG_BANK[dom][i].ar, pa).replace("X", "5"), en: FC.gx(PF.STG_BANK[dom][i].en, pe).replace("X", "5"), materials: ["toys", "cards"], strategies: ["verbal", "modeling"], reinf: ["tangible", "social"], eval: ev });
    d.blocks = [
      { general: "receptive", ltg: { ar: PF.ltgText(PF.LTG_SKILLS.receptive[0], "ar", pa), en: PF.ltgText(PF.LTG_SKILLS.receptive[0], "en", pe) }, stgs: [stg("receptive", 1, "achieved"), stg("receptive", 4, "training")] },
      { general: "expressive", ltg: { ar: PF.ltgText(PF.LTG_SKILLS.expressive[0], "ar", pa), en: PF.ltgText(PF.LTG_SKILLS.expressive[0], "en", pe) }, stgs: [stg("expressive", 0, "partial"), stg("expressive", 4, "not_started")] },
    ];
    return { id: "sample-plan", plan_type: "الخطة التربوية الفردية", status: "سارية", start_date: toPb(addMonths(today(), -6)), end_date: toPb(today()), plan_data: d };
  }

  function pageForms() {
    const main = shell("forms", "");
    const card = (href, title, hint, src) => `<a class="panel form-card" href="${href}"><div class="panel-body"><h3>${esc(title)}</h3><div class="hint" style="margin-top:4px">${esc(hint)}</div>${src ? `<div class="pill" style="margin-top:10px">${esc(src)}</div>` : ""}</div></a>`;
    const T = (t) => `#/try/report?type=${encodeURIComponent(t)}`;
    main.innerHTML = `
      <div class="page-head"><div class="grow"><h1>النماذج</h1><div class="muted">افتح أي نموذج لتراه كما يستخدمه الأخصائي — على مريض تجريبي، ولا يتم حفظ أي شيء.</div></div></div>
      <div class="grid cols-3">
        ${card("#/try/plan", "الخطة التربوية الفردية للنطق واللغة", "بيانات الخطة، ملخص التقييم، الأهداف وجداولها، المتابعة والاعتماد", "نموذج ST_TP")}
        ${card(T("تقرير تقييم"), "تقرير تقييم", "التقييم الشامل بالعربي أو الإنجليزي", "Evaluation Report")}
        ${card(T("تقرير الملاحظة الأولية"), "تقرير الملاحظة الأولية", "انطباع الجلسة الأولى للأهل: تقييم المهارات بأزرار وتقرير دافئ جاهز", "Initial Scanning")}
        ${card(T("تقرير التقييم الأولي"), "تقرير التقييم الأولي", "النموذج المختصر", "نموذج ST_IA")}
        ${card(T("تقرير تقييم مرحلي"), "تقرير تقييم مرحلي", "مرتبط بأهداف الخطة (خطة تجريبية جاهزة للمعاينة)", "نموذج PRO_REP")}
        ${card(T("تقرير إعادة تقييم"), "تقرير إعادة تقييم", "نفس نموذج التقييم الشامل بعنوان إعادة تقييم", "")}
        ${card(T("تقرير خروج"), "تقرير خروج", "عند إنهاء العلاج", "")}
        ${card(T("تقرير لجهة خارجية"), "تقرير لجهة خارجية", "مدرسة / تأمين / طبيب", "")}
      </div>
      <p class="hint" style="margin-top:14px">للعمل الحقيقي: المرضى ← افتح ملف المريض ← تبويب «الخطط» أو «التقارير».</p>`;
  }

  // ------------------------------------------------------------------ users (admin)
  async function pageUsers() {
    const main = shell("users", `<div class="empty">جاري التحميل…</div>`);
    const users = await pb.collection("users").getFullList({ sort: "role,name" });
    main.innerHTML = `<div class="page-head"><h1 class="grow">المستخدمون</h1><button class="btn primary" id="newU">+ مستخدم جديد</button></div>
      <div class="panel"><div class="table-wrap"><table class="t"><thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>المراكز</th><th>التوقيع / الختم</th><th>الحالة</th><th></th></tr></thead><tbody>
      ${users.map((u) => `<tr><td><strong>${esc(u.name)}</strong>${u.name_en ? `<div class="hint" dir="ltr" style="text-align:right">${esc(u.name_en)}</div>` : ""}</td><td class="mono">${esc(u.username)}${u.email ? `<div class="hint">${esc(u.email)}</div>` : ""}</td><td>${esc(ROLE[u.role] || u.role)}</td>
        <td>${(u.centers || []).map(centerTag).join(" ")}</td><td>${u.has_signature ? '<span class="pill ok">توقيع</span>' : ""} ${u.has_stamp ? '<span class="pill ok">ختم</span>' : ""}${!u.has_signature && !u.has_stamp ? '<span class="hint">—</span>' : ""}</td><td>${u.active ? '<span class="pill ok">مفعّل</span>' : '<span class="pill danger">موقوف</span>'}</td>
        <td class="nowrap"><button class="btn sm" data-u="${u.id}">تعديل</button> <button class="btn sm" data-sig="${u.id}">✍ التوقيع / الختم</button></td></tr>`).join("")}</tbody></table></div></div>
      <p class="hint" style="margin-top:10px">إيقاف الحساب يمنع الدخول فوراً مع الإبقاء على سجلاته. الأخصائي يرى فقط المرضى المسندين إليه.</p>`;
    main.querySelector("#newU").onclick = () => userModal(null);
    main.querySelectorAll("[data-u]").forEach((b) => b.onclick = () => userModal(users.find((u) => u.id === b.dataset.u)));
    main.querySelectorAll("[data-sig]").forEach((b) => b.onclick = () => {
      const u = users.find((x) => x.id === b.dataset.sig);
      const m = modal(`التوقيع والختم — ${u.name || u.username}`, `<div id="sigBox"></div>`, { wide: true });
      m.querySelector("[data-x]").addEventListener("click", () => route());
      m.addEventListener("click", (e) => { if (e.target === m) route(); });
      sigEditor(m.querySelector("#sigBox"), u.id);
    });
  }
  function userModal(u) {
    const isNew = !u; u = u || { role: "therapist", active: true, centers: S.centers.map((c) => c.id) };
    const m = modal(isNew ? "مستخدم جديد" : "تعديل مستخدم", `<div class="grid cols-2">
      <div class="field"><label class="f">الاسم الكامل (يظهر في التقارير)</label><input class="input" name="name" value="${esc(u.name)}"></div>
      <div class="field"><label class="f">الاسم بالإنجليزي (للتقارير الإنجليزية)</label><input class="input" dir="ltr" name="name_en" value="${esc(u.name_en)}"></div>
      <div class="field"><label class="f">اسم المستخدم (للدخول) *</label><input class="input mono" name="username" dir="ltr" autocapitalize="off" value="${esc(u.username)}"></div>
      <div class="field"><label class="f">البريد الإلكتروني (لاستلام التذكيرات — اختياري)</label><input class="input mono" name="email" type="email" value="${esc(u.email)}"></div>
      <div class="field"><label class="f">الدور</label><select class="input" name="role">${Object.entries(ROLE).map(([k, v]) => `<option value="${k}" ${u.role === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label class="f">الحالة</label><select class="input" name="active"><option value="1" ${u.active ? "selected" : ""}>مفعّل</option><option value="0" ${!u.active ? "selected" : ""}>موقوف</option></select></div>
      <div class="field"><label class="f">${isNew ? "كلمة المرور" : "كلمة مرور جديدة (اتركها فارغة لعدم التغيير)"}</label><input class="input" name="password" type="password" autocomplete="new-password" minlength="8"></div>
    </div>
    <details class="field" ${u.employee_id || u.job_title ? "open" : ""}><summary class="f" style="cursor:pointer">بيانات الملف الوظيفي (لصفحة الأداء والتدقيق)</summary><div class="grid cols-2" style="margin-top:8px">
      <div class="field"><label class="f">الرقم الوظيفي</label><input class="input mono" name="employee_id" value="${esc(u.employee_id)}"></div>
      <div class="field"><label class="f">المسمى الوظيفي</label><input class="input" name="job_title" value="${esc(u.job_title)}"></div>
      <div class="field"><label class="f">القسم</label><input class="input" name="department" value="${esc(u.department || "النطق واللغة")}"></div>
      <div class="field"><label class="f">تاريخ الالتحاق</label><input class="input" type="date" name="join_date" value="${esc(String(u.join_date || "").slice(0, 10))}"></div>
      <div class="field"><label class="f">المشرف المسؤول</label><input class="input" name="supervisor_name" value="${esc(u.supervisor_name)}"></div>
      <div class="field"><label class="f">الحالة الوظيفية</label><input class="input" name="employment_status" value="${esc(u.employment_status || "على رأس العمل")}"></div>
    </div></details>
    <div class="field"><label class="f">المراكز</label><div class="chips" id="uc">${S.centers.map((c) => `<button type="button" class="chip ${(u.centers || []).includes(c.id) ? "on" : ""}" data-id="${c.id}">${esc(c.name_ar)}</button>`).join("")}</div></div>
    <p class="hint">كلمة المرور 8 أحرف على الأقل. أعطها للموظف شخصياً واطلب منه تغييرها.</p>
    ${isNew ? '<p class="note-box">بعد حفظ المستخدم، افتحه مرة ثانية (تعديل) لرفع توقيعه أو ختمه.</p>' : `<div class="field"><label class="f">التوقيع والختم (يظهران في التقارير والخطط)</label><div id="sigBox"></div></div>`}`, {
      onOk: async (root) => {
        const data = { name: val(root, "name"), name_en: val(root, "name_en"), username: val(root, "username").toLowerCase(), email: val(root, "email"), role: val(root, "role"), active: val(root, "active") === "1",
          centers: [...root.querySelectorAll("#uc .chip.on")].map((c) => c.dataset.id), emailVisibility: true,
          employee_id: val(root, "employee_id"), job_title: val(root, "job_title"), department: val(root, "department"), join_date: val(root, "join_date"), supervisor_name: val(root, "supervisor_name"), employment_status: val(root, "employment_status") };
        const pw = root.querySelector('[name="password"]').value;
        if (isNew && pw.length < 8) { toast("كلمة المرور 8 أحرف على الأقل", true); return false; }
        if (pw) { data.password = pw; data.passwordConfirm = pw; }
        if (isNew) { data.verified = true; await pb.collection("users").create(data); } else await pb.collection("users").update(u.id, data);
        S.therapists = await pb.collection("users").getFullList({ filter: '(role = "therapist" || role = "admin") && active = true', sort: "name" });
        toast("تم الحفظ"); route();
      },
    });
    m.querySelector("#uc").onclick = (e) => { const c = e.target.closest(".chip"); if (c) c.classList.toggle("on"); };
    if (!isNew) sigEditor(m.querySelector("#sigBox"), u.id);
  }

  // ------------------------------------------------------------------ signature & stamp
  // Image file -> resized PNG data URL; optionally turns the white/paper background transparent.
  function prepImage(file, maxW, maxH, removeWhite) {
    return new Promise((resolve, reject) => {
      if (!/^image\/(png|jpeg)$/.test(file.type)) return reject(new Error("الصورة يجب أن تكون PNG أو JPG"));
      const url = URL.createObjectURL(file), im = new Image();
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("تعذر قراءة الصورة")); };
      im.onload = () => {
        URL.revokeObjectURL(url);
        let scale = Math.min(1, maxW / im.width, maxH / im.height);
        for (let tries = 0; tries < 4; tries++) {
          const w = Math.max(1, Math.round(im.width * scale)), h = Math.max(1, Math.round(im.height * scale));
          const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
          const g = cv.getContext("2d"); g.drawImage(im, 0, 0, w, h);
          if (removeWhite) {
            const px = g.getImageData(0, 0, w, h), d = px.data;
            for (let i = 0; i < d.length; i += 4) {
              const light = Math.min(d[i], d[i + 1], d[i + 2]);
              if (light > 225) d[i + 3] = 0;
              else if (light > 180) d[i + 3] = Math.round(d[i + 3] * (225 - light) / 45);
            }
            g.putImageData(px, 0, 0);
          }
          const out = cv.toDataURL("image/png");
          if (out.length < 650000) return resolve(out);
          scale *= 0.7;
        }
        reject(new Error("الصورة كبيرة جداً — جرّب صورة أصغر"));
      };
      im.src = url;
    });
  }

  // Signature + stamp boxes for one user (used in «ملفي» and in the admin's user window).
  // target: a user id, or { center } for the center's clinical supervisor
  async function sigEditor(box, target, onChange) {
    const who = typeof target === "string" ? { user: target } : target, userId = who.user;
    box.innerHTML = `<div class="empty">جاري التحميل…</div>`;
    let cur;
    try { cur = await pb.getSignature(who); } catch (e) { box.innerHTML = `<div class="err-box">${esc(errText(e))}</div>`; return; }
    const KINDS = [["signature", "التوقيع", "صورة واضحة للتوقيع بقلم أزرق أو أسود على ورقة بيضاء.", 600, 240], ["stamp", "الختم", "صورة الختم (مقصوصة على حدود الختم).", 420, 420]];
    const draw = () => {
      box.innerHTML = `<div class="grid cols-2">${KINDS.map(([k, t, hint]) => `<div class="goal-row" data-k="${k}">
          <div class="top"><strong>${t}</strong><span style="flex:1"></span>${cur[k] ? '<span class="pill ok">مرفوع</span>' : '<span class="pill">غير مرفوع</span>'}</div>
          <div class="sig-prev">${cur[k] ? `<img src="${esc(cur[k])}" alt="${t}">` : `<span class="hint">لا يوجد ${t}</span>`}</div>
          <div class="hint" style="margin:6px 0">${hint}</div>
          <input type="file" accept="image/png,image/jpeg" data-file="${k}">
          <label class="hint" style="display:block;margin-top:6px"><input type="checkbox" data-white="${k}" checked> إزالة الخلفية البيضاء</label>
          <div class="btn-row" style="margin-top:8px"><button type="button" class="btn primary sm" data-up="${k}">رفع ${t}</button>${cur[k] ? `<button type="button" class="btn danger sm" data-del="${k}">حذف</button>` : ""}</div>
        </div>`).join("")}</div>
        ${who.center ? `<p class="hint">يظهر تلقائياً في خانة «التوقيع» بسطر «المشرف السريري» في كل خطط هذا المركز — حتى الخطط القديمة — عند تنزيلها Word / PDF.</p>` : `<p class="hint">يظهر التوقيع والختم مكان <bdi class="mono" dir="ltr">[[SIG]]</bdi> في نص التقرير أو الخطة عند التنزيل (Word / PDF). احذف <bdi class="mono" dir="ltr">[[SIG]]</bdi> من النص إذا لم ترده في مستند معيّن.</p>`}`;
      box.querySelectorAll("[data-up]").forEach((b) => b.onclick = async () => {
        const k = b.dataset.up, spec = KINDS.find((x) => x[0] === k);
        const f = box.querySelector(`[data-file="${k}"]`).files[0];
        if (!f) { toast("اختر صورة أولاً", true); return; }
        b.disabled = true;
        try {
          const dataUrl = await prepImage(f, spec[3], spec[4], box.querySelector(`[data-white="${k}"]`).checked);
          await pb.setSignature({ ...who, [k]: dataUrl });
          cur[k] = dataUrl; toast(`تم رفع ${spec[1]}`); afterSig(userId); onChange && onChange(cur); draw();
        } catch (e) { toast(e.status ? errText(e) : e.message, true); b.disabled = false; }
      });
      box.querySelectorAll("[data-del]").forEach((b) => b.onclick = async () => {
        const k = b.dataset.del, spec = KINDS.find((x) => x[0] === k);
        if (!confirm(`حذف ${spec[1]}؟`)) return;
        try { await pb.setSignature({ ...who, [k]: "" }); cur[k] = ""; toast("تم الحذف"); afterSig(userId); onChange && onChange(cur); draw(); } catch (e) { toast(errText(e), true); }
      });
    };
    draw();
  }
  function afterSig(userId) {
    if (userId && S.me && S.me.id === userId) pb.collection("users").authRefresh().then((r) => { S.me = r.record; }).catch(() => {});
  }

  // ------------------------------------------------------------------ latest documents (admin)
  async function pageDocs() {
    const q = qs();
    const main = shell("docs", `<div class="empty">جاري التحميل…</div>`);
    const cf = centerFilterExpr("patient.center");
    const [plans, reports, users] = await Promise.all([
      pb.collection("plans").getList(1, 400, { filter: cf, sort: "-updated", expand: "patient,therapist" }),
      pb.collection("reports").getList(1, 400, { filter: cf, sort: "-updated", expand: "patient,therapist" }),
      pb.collection("users").getFullList({ sort: "name" }),
    ]);
    const all = [
      ...plans.items.map((r) => ({ kind: "plan", coll: "plans", r, type: r.plan_type, date: d10(r.start_date), text: r.plan_text, lang: r.plan_lang || "ar" })),
      ...reports.items.map((r) => ({ kind: "report", coll: "reports", r, type: r.report_type, date: d10(r.report_date), text: r.report_text, lang: r.report_lang || "ar" })),
    ].map((x) => ({ ...x, p: (x.r.expand && x.r.expand.patient) || {}, t: (x.r.expand && x.r.expand.therapist) || null }))
      .sort((a, b) => String(b.r.updated).localeCompare(String(a.r.updated)));
    const ther = users.filter((u) => all.some((x) => x.r.therapist === u.id));
    const types = [...new Set(all.map((x) => x.type).filter(Boolean))];
    const statuses = [...new Set(all.map((x) => x.r.status).filter(Boolean))];
    const opt = (v, t, sel) => `<option value="${esc(v)}" ${sel === v ? "selected" : ""}>${esc(t)}</option>`;
    main.innerHTML = `<div class="page-head"><div class="grow"><h1>آخر المستندات</h1><div class="muted">كل الخطط والتقارير — الأحدث تعديلاً أولاً${plans.totalItems + reports.totalItems > all.length ? ` (آخر ${all.length})` : ""}. لتغيير المركز استخدم القائمة في الأعلى.</div></div></div>
      <div class="panel"><div class="panel-head" style="flex-wrap:wrap;gap:8px">
        <select class="input" id="fk" style="width:auto">${opt("", "خطط وتقارير", q.k)}${opt("plan", "الخطط فقط", q.k)}${opt("report", "التقارير فقط", q.k)}</select>
        <select class="input" id="ft" style="width:auto">${opt("", "كل المعالجين", q.t)}${ther.map((u) => opt(u.id, u.name || u.username, q.t)).join("")}</select>
        <select class="input" id="fy" style="width:auto">${opt("", "كل الأنواع", q.y)}${types.map((t) => opt(t, t, q.y)).join("")}</select>
        <select class="input" id="fs" style="width:auto">${opt("", "كل الحالات", q.s)}${statuses.map((t) => opt(t, t, q.s)).join("")}</select>
        <input class="input" id="fq" placeholder="بحث بالاسم أو رقم الملف…" value="${esc(q.q || "")}" style="max-width:240px">
        <span class="grow"></span><span class="muted" id="cnt"></span></div><div id="list"></div></div>`;
    const draw = () => {
      const k = main.querySelector("#fk").value, t = main.querySelector("#ft").value, y = main.querySelector("#fy").value, st = main.querySelector("#fs").value;
      const term = main.querySelector("#fq").value.trim().toLowerCase();
      const items = all.filter((x) => (!k || x.kind === k) && (!t || x.r.therapist === t) && (!y || x.type === y) && (!st || x.r.status === st)
        && (!term || [x.p.full_name, x.p.full_name_en, x.p.file_no].some((v) => String(v || "").toLowerCase().includes(term))));
      main.querySelector("#cnt").textContent = `${items.length} مستند`;
      main.querySelector("#list").innerHTML = items.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>آخر تعديل</th><th>المستند</th><th>التاريخ</th><th>رقم الملف</th><th>المريض</th><th>المركز</th><th>المعالج</th><th>الحالة</th><th></th></tr></thead><tbody>
        ${items.map((x) => `<tr><td class="nowrap mono hint">${esc(String(x.r.updated || "").slice(0, 16).replace("T", " "))}</td>
          <td><span class="pill ${x.kind === "plan" ? "info" : ""}">${x.kind === "plan" ? "خطة" : "تقرير"}</span> ${esc(x.type)}</td><td class="nowrap">${esc(x.date)}</td>
          <td class="mono">${esc(x.p.file_no)}</td><td><a href="#/patient/${x.p.id}">${esc(x.p.full_name)}</a></td><td>${centerTag(x.r.center || x.p.center)}</td>
          <td>${esc(x.t ? x.t.name : "")}</td><td>${statusPill(x.r.status)}</td>
          <td class="nowrap"><a class="btn sm" href="#/${x.kind}/${x.r.id}">فتح</a> <button class="btn sm" data-ex="${x.coll}:${x.r.id}:docx">Word</button><button class="btn sm" data-ex="${x.coll}:${x.r.id}:pdf">PDF</button></td></tr>`).join("")}
        </tbody></table></div>` : `<div class="empty">لا توجد مستندات مطابقة.</div>`;
      main.querySelectorAll("[data-ex]").forEach((b) => b.onclick = async () => {
        const [coll, id, fmt] = b.dataset.ex.split(":");
        const x = all.find((i) => i.r.id === id);
        if (x.r.uploaded && (x.r.files || []).length) { try { await pb.files.download(x.r, x.r.files[0]); } catch (e) { toast(errText(e), true); } return; }
        if (!x.text) { toast("لم يتم توليد نص لهذا المستند بعد.", true); return; }
        await exportDoc(fmt, x.text, x.lang, x.r.center || x.p.center, `${x.p.file_no}_${x.type}_${x.date}`, { collection: coll, id });
      });
      history.replaceState(null, "", "#/docs?" + new URLSearchParams({ k, t, y, s: st, q: term }).toString()); lastHash = location.hash;
    };
    ["#fk", "#ft", "#fy", "#fs"].forEach((sel) => main.querySelector(sel).onchange = draw);
    let tm; main.querySelector("#fq").oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 200); };
    draw();
  }

  // ------------------------------------------------------------------ import patients from Excel (admin / reception)
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
      // the copy on our site first; if it is missing, the same version from the jsDelivr CDN
      const tryLoad = (src, next) => {
        const sc = document.createElement("script"); sc.src = src;
        sc.onload = () => (window.XLSX ? resolve(window.XLSX) : next());
        sc.onerror = next;
        document.head.appendChild(sc);
      };
      tryLoad("xlsx.full.min.js", () => tryLoad("https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js", () => reject(new Error("تعذر تحميل مكتبة Excel"))));
    });
  }
  const IMPORT_FIELDS = [
    ["file_no", "رقم الملف *", /رقم\s*الملف|file\s*(no|num|#)|mrn|^file$|ملف/i],
    ["full_name", "الاسم *", /^(الاسم|اسم|اسم الطفل|اسم المريض|الاسم الكامل|الاسم بالعربي|name|patient\s*name|child\s*name|full\s*name)$/i],
    ["full_name_en", "الاسم بالإنجليزي (اختياري)", /(name.*(en|english))|(english.*name)|الاسم.*(الانجليزي|الإنجليزي|انجليزي|إنجليزي)/i],
    ["dob_day", "يوم الميلاد (إذا التاريخ مقسوم على 3 أعمدة)", /(ميلاد|ولادة|birth|dob).*(اليوم|يوم|day)$/i],
    ["dob_month", "شهر الميلاد", /(ميلاد|ولادة|birth|dob).*(الشهر|شهر|month)$/i],
    ["dob_year", "سنة الميلاد", /(ميلاد|ولادة|birth|dob).*(السنة|سنة|year)$/i],
    ["dob", "تاريخ الميلاد", /ميلاد|تاريخ\s*الولادة|dob|birth/i],
    ["nationality", "الجنسية", /جنسية|nationality/i],
    ["gender", "الجنس (اختياري)", /^(الجنس|النوع)(\s|\(|$)|^(gender|sex)\b/i],
    ["phone", "رقم الهاتف", /هاتف|جوال|موبايل|الموبايل|phone|mobile|tel\b|contact/i],
    ["guardian_name", "اسم ولي الأمر", /^(?!.*(هاتف|جوال|موبايل|رقم|phone|mobile|tel)).*(ولي\s*الأمر|ولي\s*الامر|اسم\s*(الأب|الاب|الأم|الام)|guardian|parent|father|mother)/i],
    ["insurance_no", "رقم بطاقة التأمين", /(رقم|no\.?|number|card|id).*(بطاقة|التأمين|التامين|insurance|member)|(بطاقة|insurance)\s*(card|no|number|رقم)|member\s*(id|no)|رقم\s*البطاقة/i],
    ["insurance_company", "شركة التأمين", /^(?!.*(رقم|no\b|number|card|id\b)).*(شركة|التأمين|التامين|insurance|insurer|payer)/i],
    ["diagnosis", "التشخيص", /تشخيص|diagnos|dx\b/i],
    ["start_date", "تاريخ بدء العلاج", /(بدء|بداية)\s*(العلاج|الخدمة|الجلسات)|تاريخ\s*(الالتحاق|التسجيل|القبول|الدخول)|start\s*date|admission|enrol/i],
  ];
  const pad2 = (n) => String(n).padStart(2, "0");
  function toIsoDate(v) {
    if (v == null || v === "") return "";
    if (v instanceof Date && !isNaN(v)) return `${v.getFullYear()}-${pad2(v.getMonth() + 1)}-${pad2(v.getDate())}`;
    if (typeof v === "number" && v > 1000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return d.toISOString().slice(0, 10); }
    const s = String(v).trim().replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c));
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/); if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) { let y = +m[3]; if (y < 100) y += y > 50 ? 1900 : 2000; return `${y}-${pad2(m[2])}-${pad2(m[1])}`; } // day/month/year (UAE)
    return "";
  }
  function fromParts(d, m, y) {
    const n = (x) => parseInt(String(x == null ? "" : x).replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c)), 10);
    let dd = n(d), mm = n(m), yy = n(y);
    if (!dd || !mm || !yy) return "";
    if (yy < 100) yy += yy > 50 ? 1900 : 2000;
    if (mm > 12 || dd > 31) return "";
    return `${yy}-${pad2(mm)}-${pad2(dd)}`;
  }
  function normNationality(v) {
    const s = String(v || "").replace(/\s+/g, " ").trim(); if (!s) return "";
    // compare a simple base form: no "ال", plain alef, no final ة/ه, masculine = feminine
    const base = (x) => String(x).trim().toLowerCase().replace(/^ال/, "").replace(/[أإآ]/g, "ا").replace(/[ةه]$/, "").replace(/ى$/, "ي");
    const ALIAS = { "فلسطين": "الفلسطينية", "جزر القمر": "الجزر القمرية", "كاميرون": "الكاميرونية", "الكاميرون": "الكاميرونية", "الامارات": "الإماراتية", "مصر": "المصرية", "سوريا": "السورية", "الاردن": "الأردنية", "الهند": "الهندية", "باكستان": "الباكستانية", "السودان": "السودانية", "اليمن": "اليمنية", "لبنان": "اللبنانية", "العراق": "العراقية", "السعودية": "السعودية", "عمان": "العمانية" };
    const al = ALIAS[s.replace(/[أإآ]/g, "ا")] || ALIAS[s];
    if (al) return al;
    const b = base(s), low = s.toLowerCase();
    const hit = FC.NATIONALITIES.find(([ar, en]) => base(ar) === b || en.toLowerCase() === low
      || (low === "uae" && en === "Emirati") || (low.startsWith("emira") && en === "Emirati")
      || (low.length > 3 && /^[a-z]/.test(low) && en.toLowerCase().startsWith(low.slice(0, 4))));
    return hit ? hit[0] : s;
  }
  function normGender(v) {
    const s = String(v || "").trim().toLowerCase();
    if (/^(ذكر|m|male|boy|ولد)$/.test(s)) return "ذكر";
    if (/^(أنثى|انثى|f|female|girl|بنت)$/.test(s)) return "أنثى";
    return "";
  }

  function pageImport() {
    const main = shell("patients", "");
    const center0 = S.centerFilter || (S.centers[0] && S.centers[0].id);
    main.innerHTML = `<div class="page-head"><div class="grow"><h1>استيراد المرضى من Excel</h1><div class="muted">يُؤخذ من الملف كل ما يطابق خانات ملف المريض: رقم الملف، الاسم، الميلاد، الجنس، الجنسية، ولي الأمر، الهاتف، التأمين، التشخيص، تاريخ البدء. باقي الأعمدة (مثل رقم الهوية) تُتجاهل.</div></div><a class="btn" href="#/patients">رجوع</a></div>
      <div class="panel"><div class="panel-body">
        <div class="grid cols-3">
          <div class="field"><label class="f">١. ملف Excel (xlsx / xls / csv)</label><input type="file" id="xf" accept=".xlsx,.xls,.csv"></div>
          <div class="field"><label class="f">٢. المركز *</label><select class="input" id="xc">${S.centers.map((c) => `<option value="${c.id}" ${c.id === center0 ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
          <div class="field"><label class="f">الأخصائي المسؤول (اختياري — لكل المستوردين)</label><select class="input" id="xt"></select></div>
        </div>
        <div id="xmap"></div>
      </div></div>
      <div id="xprev"></div>`;
    const drawTher = () => {
      const c = main.querySelector("#xc").value;
      main.querySelector("#xt").innerHTML = `<option value="">— بدون —</option>` + S.therapists.filter((t) => (t.centers || []).includes(c)).map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
    };
    drawTher();
    let wb = null, rows = [], headers = [];
    const readSheet = (name) => {
      const ws = wb.Sheets[name];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
      // header row = first row with at least 2 non-empty text cells
      let hi = aoa.findIndex((r) => r.filter((c) => String(c).trim()).length >= 2);
      if (hi < 0) hi = 0;
      headers = (aoa[hi] || []).map((h) => String(h).replace(/\s+/g, " ").trim());
      // Two-row header (e.g. «تاريخ الميلاد» over «اليوم | الشهر | السنة»): join them and skip the second row.
      const SUB = /^(اليوم|الشهر|السنة|يوم|شهر|سنة|day|month|year)$/i;
      const sub = aoa[hi + 1] || [];
      let start = hi + 1;
      if (sub.some((c) => SUB.test(String(c).trim()))) {
        let parent = "";
        const width = Math.max(headers.length, sub.length);
        const joined = [];
        for (let j = 0; j < width; j++) {
          const h = headers[j] || "", su = String(sub[j] == null ? "" : sub[j]).replace(/\s+/g, " ").trim();
          if (h) parent = h;
          joined.push(su ? `${h || parent} ${su}`.trim() : h);
        }
        headers = joined; start = hi + 2;
      }
      rows = aoa.slice(start).map((r, i) => ({ cells: r, _row: start + i + 1 })).filter((r) => r.cells.some((c) => String(c).trim()));
    };
    const guess = () => {
      const used = new Set(), found = {};
      const dayMonthYear = () => found.dob_day >= 0 && found.dob_month >= 0 && found.dob_year >= 0;
      return Object.fromEntries(IMPORT_FIELDS.map(([k, , re]) => {
        let idx = headers.findIndex((h, i) => !used.has(i) && re.test(h));
        if (k === "full_name" && idx < 0) idx = headers.findIndex((h, i) => !used.has(i) && /اسم|name/i.test(h) && !/(en|english|انجليزي|إنجليزي|ولي|parent|guardian|mother|father|أم|أب|therap|أخصائي|معالج)/i.test(h));
        if (k === "dob" && dayMonthYear()) idx = -1;
        if (idx >= 0) used.add(idx);
        found[k] = idx;
        return [k, idx];
      }));
    };
    const drawMap = () => {
      const g = guess();
      const sheets = wb.SheetNames;
      main.querySelector("#xmap").innerHTML = `
        ${sheets.length > 1 ? `<div class="field"><label class="f">الورقة (Sheet)</label><select class="input" id="xs" style="width:auto">${sheets.map((n) => `<option>${esc(n)}</option>`).join("")}</select></div>` : ""}
        <label class="f">٣. تأكد من الأعمدة (تم اختيارها تلقائياً — غيّرها إذا لزم)</label>
        <div class="grid cols-3">${IMPORT_FIELDS.map(([k, t]) => `<div class="field"><label class="f">${t}</label><select class="input" data-col="${k}"><option value="-1">— لا يوجد —</option>${headers.map((h, i) => `<option value="${i}" ${g[k] === i ? "selected" : ""}>${esc(h || "عمود " + (i + 1))}</option>`).join("")}</select></div>`).join("")}</div>
        <label class="hint" style="display:block;margin:6px 0"><input type="checkbox" id="xauto" ${g.file_no < 0 ? "checked" : ""}> الملف ما فيه رقم ملف: أعطِ كل مريض رقم ملف مؤقت (TMP-…) وعدّله لاحقاً من ملف المريض.</label>
        <label class="hint" style="display:block;margin:6px 0"><input type="checkbox" id="xu"> المرضى الموجودين مسبقاً: عبّي الخانات الفاضية عندهم بس من الملف (أي شي ضفته أو عدّلته بالموقع ما بيتغيّر). بدون هذا الخيار يتم تخطيهم.</label>`;
      const xs = main.querySelector("#xs");
      if (xs) xs.value = curSheet, xs.onchange = () => { curSheet = xs.value; readSheet(curSheet); drawMap(); };
      main.querySelectorAll("[data-col]").forEach((el) => el.onchange = drawPrev);
      main.querySelector("#xauto").onchange = drawPrev;
      drawPrev();
    };
    let curSheet = "";
    const mapped = () => {
      const col = Object.fromEntries([...main.querySelectorAll("[data-col]")].map((el) => [el.dataset.col, +el.value]));
      const get = (r, k) => (col[k] >= 0 ? r.cells[col[k]] : "");
      return { col, list: rows.map((r) => {
        let name = String(get(r, "full_name") || "").trim(), en = String(get(r, "full_name_en") || "").trim();
        if (name && !/[\u0600-\u06FF]/.test(name) && !en) en = name; // English-only name: keep it as the English name too
        const auto = col.file_no < 0 && main.querySelector("#xauto") && main.querySelector("#xauto").checked;
        return { _row: r._row, file_no: auto ? `TMP-${pad2(r._row).padStart(4, "0")}` : String(get(r, "file_no") ?? "").trim(), full_name: name, full_name_en: en,
          dob: toIsoDate(get(r, "dob")) || fromParts(get(r, "dob_day"), get(r, "dob_month"), get(r, "dob_year")), dobRaw: get(r, "dob") || [get(r, "dob_day"), get(r, "dob_month"), get(r, "dob_year")].filter((x) => String(x).trim()).join("/"), nationality: normNationality(get(r, "nationality")), gender: normGender(get(r, "gender")),
          guardian_name: String(get(r, "guardian_name") ?? "").trim(), phone: String(get(r, "phone") ?? "").trim(),
          insurance_company: String(get(r, "insurance_company") ?? "").trim(), insurance_no: String(get(r, "insurance_no") ?? "").trim(),
          diagnosis: String(get(r, "diagnosis") ?? "").trim(), start_date: toIsoDate(get(r, "start_date")) };
      }) };
    };
    const drawPrev = () => {
      const { col, list } = mapped();
      const box = main.querySelector("#xprev");
      const autoOn = main.querySelector("#xauto") && main.querySelector("#xauto").checked;
      if (col.full_name < 0 || (col.file_no < 0 && !autoOn)) { box.innerHTML = `<div class="panel"><div class="panel-body"><div class="err-box">اختر عمود «الاسم»، وعمود «رقم الملف» أو علّم «رقم ملف مؤقت».</div></div></div>`; return; }
      const bad = list.filter((x) => !x.file_no || !x.full_name);
      const noDob = list.filter((x) => x.dobRaw !== "" && x.dobRaw != null && !x.dob);
      const ok = list.length - bad.length;
      box.innerHTML = `<div class="panel"><div class="panel-head"><h2 class="grow">٤. معاينة (${ok} صف صالح${bad.length ? ` · ${bad.length} ناقص` : ""})</h2>
          <button class="btn primary" id="xgo" ${ok ? "" : "disabled"}>استيراد ${ok} مريض</button></div>
        ${noDob.length ? `<div class="panel-body" style="padding-bottom:0"><div class="note-box">${noDob.length} تاريخ ميلاد لم يُفهم (مثال: «${esc(noDob[0].dobRaw)}»). الصيغة المتوقعة يوم/شهر/سنة. سيُستورد بدون تاريخ.</div></div>` : ""}
        <div class="table-wrap"><table class="t"><thead><tr><th>صف</th><th>رقم الملف</th><th>الاسم</th><th>بالإنجليزي</th><th>تاريخ الميلاد</th><th>العمر</th><th>الجنسية</th><th>الجنس</th><th>ولي الأمر</th><th>الهاتف</th><th>التأمين</th><th>التشخيص</th></tr></thead><tbody>
        ${list.slice(0, 300).map((x) => `<tr class="${!x.file_no || !x.full_name ? "row-bad" : ""}"><td class="hint">${x._row}</td><td class="mono">${esc(x.file_no)}</td><td>${esc(x.full_name)}</td><td dir="ltr">${esc(x.full_name_en)}</td>
          <td class="nowrap">${esc(x.dob)}</td><td class="nowrap">${x.dob ? esc(A.ageString(x.dob + " 00:00:00.000Z", today(), UI)) : ""}</td><td>${esc(x.nationality)}</td><td>${esc(x.gender)}</td><td>${esc(x.guardian_name)}</td><td class="mono">${esc(x.phone)}</td><td>${esc([x.insurance_company, x.insurance_no].filter(Boolean).join(" · "))}</td><td>${esc(x.diagnosis)}</td></tr>`).join("")}
        </tbody></table>${list.length > 300 ? `<div class="hint" style="padding:8px">… يظهر أول 300 صف فقط في المعاينة، وسيتم استيراد الكل.</div>` : ""}</div></div>`;
      const go2 = box.querySelector("#xgo");
      if (go2) go2.onclick = async () => {
        const good = list.filter((x) => x.file_no && x.full_name).map(({ dobRaw, ...x }) => x);
        go2.disabled = true;
        const tot = { added: 0, updated: 0, skipped: 0, errors: [] };
        try {
          for (let i = 0; i < good.length; i += 300) {
            go2.textContent = `جاري الاستيراد… ${Math.min(i + 300, good.length)} / ${good.length}`;
            const r = await pb.importPatients({ center: main.querySelector("#xc").value, therapist: main.querySelector("#xt").value, update: main.querySelector("#xu").checked, rows: good.slice(i, i + 300) });
            tot.added += r.added; tot.updated += r.updated; tot.skipped += r.skipped; tot.errors.push(...r.errors);
          }
          box.innerHTML = `<div class="panel"><div class="panel-body"><h2>تم الاستيراد ✅</h2>
            <p>جديد: <strong>${tot.added}</strong> · تحديث: <strong>${tot.updated}</strong> · تم تخطيه (موجود مسبقاً): <strong>${tot.skipped}</strong>${tot.errors.length ? ` · أخطاء: <strong>${tot.errors.length}</strong>` : ""}</p>
            ${tot.added ? `<p class="note-box">انتبه: «الجنس» مطلوب لصياغة التقارير. افتح ملف كل مريض ليس له جنس وحدّده.</p>` : ""}
            <div class="btn-row"><a class="btn primary" href="#/patients">عرض المرضى</a></div></div></div>`;
        } catch (e) { toast(errText(e), true); go2.disabled = false; go2.textContent = "إعادة المحاولة"; }
      };
    };
    main.querySelector("#xc").onchange = drawTher;
    main.querySelector("#xf").onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      main.querySelector("#xmap").innerHTML = `<div class="empty">جاري قراءة الملف…</div>`;
      try {
        await loadXlsx();
        wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: false });
        curSheet = wb.SheetNames[0]; readSheet(curSheet); drawMap();
      } catch (err) { main.querySelector("#xmap").innerHTML = `<div class="err-box">تعذر قراءة الملف: ${esc(err.message)}</div>`; }
    };
  }

  // ------------------------------------------------------------------ my profile (everyone)
  async function pageMe() {
    const main = shell("me", "");
    const me = S.me;
    main.innerHTML = `<div class="page-head"><div class="grow"><h1>ملفي</h1><div class="muted">${esc(me.username || "")} · ${esc(ROLE[me.role] || "")}</div></div></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">بياناتي</h2></div><div class="panel-body">
        <div class="grid cols-3">
          <div class="field"><label class="f">الاسم الكامل (يظهر في التقارير)</label><input class="input" name="name" value="${esc(me.name)}"></div>
          <div class="field"><label class="f">الاسم بالإنجليزي (للتقارير الإنجليزية)</label><input class="input" dir="ltr" name="name_en" value="${esc(me.name_en)}"></div>
          <div class="field"><label class="f">البريد الإلكتروني (لاستلام التذكيرات)</label><input class="input mono" type="email" name="email" value="${esc(me.email)}"></div>
        </div>
        <div class="btn-row"><button class="btn primary" id="saveMe">حفظ</button></div>
      </div></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">التوقيع والختم</h2><span class="hint">يظهران تلقائياً في تقاريرك وخططك</span></div><div class="panel-body" id="sigBox"></div></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">تغيير كلمة المرور</h2></div><div class="panel-body">
        <div class="grid cols-3">
          <div class="field"><label class="f">كلمة المرور الجديدة</label><input class="input" type="password" name="pw1" autocomplete="new-password" minlength="8"></div>
          <div class="field"><label class="f">تأكيد كلمة المرور</label><input class="input" type="password" name="pw2" autocomplete="new-password"></div>
        </div>
        <div class="btn-row"><button class="btn" id="savePw">تغيير كلمة المرور</button></div>
      </div></div>`;
    main.querySelector("#saveMe").onclick = async () => {
      try {
        S.me = await pb.collection("users").update(me.id, { name: val(main, "name"), name_en: val(main, "name_en"), email: val(main, "email") });
        toast("تم الحفظ"); route();
      } catch (e) { toast(errText(e), true); }
    };
    main.querySelector("#savePw").onclick = async () => {
      const a = main.querySelector('[name="pw1"]').value, b = main.querySelector('[name="pw2"]').value;
      if (a.length < 8) { toast("كلمة المرور 8 أحرف على الأقل", true); return; }
      if (a !== b) { toast("كلمتا المرور غير متطابقتين", true); return; }
      try { await pb.collection("users").update(me.id, { password: a, passwordConfirm: a }); toast("تم تغيير كلمة المرور"); main.querySelector('[name="pw1"]').value = main.querySelector('[name="pw2"]').value = ""; }
      catch (e) { toast(errText(e), true); }
    };
    sigEditor(main.querySelector("#sigBox"), me.id);
  }

  // ------------------------------------------------------------------ audit (admin)
  async function pageAudit() {
    const main = shell("audit", `<div class="empty">جاري التحميل…</div>`);
    const res = await pb.collection("audit_log").getList(1, 300, { sort: "-created" });
    const COL = { patients: "مريض", plans: "خطة", reports: "تقرير", users: "مستخدم", app_settings: "إعدادات" };
    main.innerHTML = `<div class="page-head"><h1 class="grow">سجل الحركات</h1><span class="muted">آخر ${res.items.length} من ${res.totalItems}</span></div>
      <div class="panel"><div class="table-wrap"><table class="t"><thead><tr><th>الوقت</th><th>المستخدم</th><th>الإجراء</th><th>النوع</th><th>التفاصيل</th><th>IP</th></tr></thead><tbody>
      ${res.items.map((a) => `<tr><td class="nowrap mono">${esc(new Date(a.created.replace(" ", "T")).toLocaleString("en-GB"))}</td><td>${esc(a.user_name)}</td><td>${esc(a.action)}</td><td>${esc(COL[a.collection_name] || a.collection_name)}</td><td>${esc(a.label)}</td><td class="mono hint">${esc(a.ip)}</td></tr>`).join("")}
      </tbody></table></div></div>`;
  }

  // ------------------------------------------------------------------ settings (admin)
  async function pageSettings() {
    const main = shell("settings", "");
    const s = S.settings || {};
    main.innerHTML = `<div class="page-head"><h1 class="grow">الإعدادات</h1></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">التذكيرات</h2></div><div class="panel-body">
        <div class="grid cols-4">
          <div class="field"><label class="f">اسم النظام</label><input class="input" id="sn" value="${esc(s.system_name)}"></div>
          <div class="field"><label class="f">يبدأ التذكير قبل الموعد بـ (يوم)</label><input class="input" id="rb" type="number" min="0" max="60" value="${esc(remindBefore())}"></div>
          <div class="field"><label class="f">ويستمر بعد الموعد حتى (أيام)</label><input class="input" id="ra" type="number" min="0" max="60" value="${esc(remindAfter())}"></div>
          <div class="field"><label class="f">إرسال تذكير لكل أخصائي بمرضاه</label><select class="input" id="et"><option value="1" ${s.email_therapists ? "selected" : ""}>نعم</option><option value="0" ${!s.email_therapists ? "selected" : ""}>لا</option></select></div>
        </div>
        <div class="field"><label class="f">إيميلات تستلم الملخص اليومي الكامل (افصل بفاصلة)</label><input class="input mono" id="ne" value="${esc(s.notify_emails)}" placeholder="manager@example.com, head.slp@example.com"></div>
        <div class="btn-row"><button class="btn primary" id="saveS">حفظ</button><button class="btn" id="sendNow">إرسال التذكيرات الآن</button></div>
        <p class="note-box" style="margin-top:12px">ترسل التذكيرات تلقائياً كل يوم الساعة 8:00 صباحاً (من حساب Gmail الذي نشر Apps Script) لكل خطة أو تقرير يقع موعده ضمن هذه الفترة. يستلم كل أخصائي تذكير مرضاه إذا كان له بريد في صفحة المستخدمين.</p>
      </div></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">الخادم</h2></div><div class="panel-body">
        <div class="field"><label class="f">رابط Apps Script الحالي</label><div class="mono hint" style="word-break:break-all">${esc(API_URL)}</div></div>
        <button class="btn" onclick="window.__changeServer()">تغيير رابط الخادم</button>
      </div></div>
      <div class="panel"><div class="panel-head"><h2 class="grow">المراكز والترويسة</h2><span class="hint">تظهر في رأس كل تقرير وخطة (Word و PDF)</span></div><div class="panel-body" id="centers"></div></div>`;
    main.querySelector("#saveS").onclick = async () => {
      try {
        S.settings = await pb.collection("app_settings").update(s.id, { system_name: main.querySelector("#sn").value,
          remind_before: Number(main.querySelector("#rb").value) || 0, remind_after: Number(main.querySelector("#ra").value) || 0,
          email_therapists: main.querySelector("#et").value === "1", notify_emails: main.querySelector("#ne").value });
        toast("تم الحفظ"); route();
      } catch (e) { toast(errText(e), true); }
    };
    main.querySelector("#sendNow").onclick = async (e) => {
      e.target.disabled = true;
      try {
        const r = await pb.send("/api/bedaya/send-reminders", { method: "POST" });
        toast(r.smtpEnabled ? `تم: ${r.items} عنصر مستحق، أُرسلت ${r.emailsSent} رسالة` : `${r.items} عنصر مستحق — الإيميل غير مفعّل بعد (أدخل إعدادات SMTP)`);
      } catch (err) { toast(errText(err), true); }
      e.target.disabled = false;
    };
    const box = main.querySelector("#centers");
    box.innerHTML = S.centers.map((c) => `<div class="goal-row" data-c="${c.id}">
      <div class="top"><span class="center-dot" style="background:${esc(c.color)}"></span><strong>${esc(c.name_ar)}</strong><span class="mono hint">${esc(c.code)}</span>
        <span style="flex:1"></span>${c.logo ? `<img src="${pb.files.getURL(c, c.logo)}" alt="" style="height:40px">` : '<span class="hint">لا يوجد شعار</span>'}</div>
      <div class="grid cols-3">
        <div><label class="f">الاسم بالعربي</label><input class="input" name="name_ar" value="${esc(c.name_ar)}"></div>
        <div><label class="f">الاسم بالإنجليزي</label><input class="input" dir="ltr" name="name_en" value="${esc(c.name_en)}"></div>
        <div><label class="f">لون الترويسة</label><input class="input" type="color" name="color" value="${esc(c.color || "#0f766e")}" style="height:40px;padding:3px"></div>
        <div><label class="f">العنوان</label><input class="input" name="address" value="${esc(c.address)}"></div>
        <div><label class="f">الهاتف</label><input class="input mono" name="phone" value="${esc(c.phone)}"></div>
        <div><label class="f">البريد</label><input class="input mono" name="email" value="${esc(c.email)}"></div>
        <div><label class="f">واتساب</label><input class="input mono" name="whatsapp" value="${esc(c.whatsapp)}"></div>
        <div><label class="f">المشرف السريري (يظهر في اعتماد الخطة)</label><input class="input" name="supervisor_name" value="${esc(c.supervisor_name)}"></div>
        <div><label class="f">اسم المشرف السريري بالإنجليزي</label><input class="input" dir="ltr" name="supervisor_name_en" value="${esc(c.supervisor_name_en)}"></div>
        <div><label class="f">رقم الترخيص</label><input class="input mono" name="license_no" value="${esc(c.license_no)}"></div>
        <div><label class="f">ملاحظة التذييل</label><input class="input" name="footer_note" value="${esc(c.footer_note)}" placeholder="مثال: سري – للاستخدام الطبي فقط"></div>
        <div><label class="f">الشعار (PNG أو JPG)</label><input type="file" name="logo" accept="image/png,image/jpeg"></div>
      </div>
      <div class="btn-row" style="margin-top:10px"><button class="btn primary sm" data-savec="${c.id}">حفظ المركز</button></div>
      <div class="field" style="margin-top:14px"><label class="f">توقيع وختم المشرف السريري${c.supervisor_name ? ` (${esc(c.supervisor_name)})` : ""}</label><div data-supbox="${c.id}"></div></div></div>`).join("");
    box.querySelectorAll("[data-supbox]").forEach((el) => sigEditor(el, { center: el.dataset.supbox }, async () => { S.centers = await pb.collection("centers").getFullList({ sort: "code" }); }));
    box.querySelectorAll("[data-savec]").forEach((b) => b.onclick = async () => {
      const row = box.querySelector(`[data-c="${b.dataset.savec}"]`);
      const fd = new FormData();
      ["name_ar", "name_en", "color", "address", "phone", "whatsapp", "supervisor_name", "supervisor_name_en", "email", "license_no", "footer_note"].forEach((k) => fd.append(k, row.querySelector(`[name="${k}"]`).value));
      const f = row.querySelector('[name="logo"]').files[0]; if (f) fd.append("logo", f);
      try {
        await pb.collection("centers").update(b.dataset.savec, fd);
        S.centers = await pb.collection("centers").getFullList({ sort: "code" });
        toast("تم حفظ المركز"); route();
      } catch (e) { toast(errText(e), true); }
    });
  }

  // ------------------------------------------------------------------ server connection
  function renderConnect(msg) {
    app.innerHTML = `<div class="login-wrap"><div class="panel login"><div class="panel-body">
      <div class="brand" style="margin-bottom:14px"><span class="brand-mark">${UI === "en" ? "S" : "ن"}</span><span>${UI === "en" ? APP_NAME_EN : APP_NAME}<div class="hint" style="font-weight:500">${UI === "en" ? APP_NAME : APP_NAME_EN}</div></span>${langBtn()}</div>
      <h1>ربط الخادم</h1><p class="muted" style="margin:4px 0 18px">الصق رابط Apps Script (Web app) الذي ينتهي بـ <span class="mono">/exec</span>. يُحفظ في هذا المتصفح.</p>
      ${msg ? `<div class="err-box">${esc(msg)}</div>` : ""}
      <form id="cf"><div class="field"><label class="f" for="api">رابط الخادم</label><input class="input mono" id="api" dir="ltr" required placeholder="https://script.google.com/macros/s/…/exec" value="${esc(API_URL)}"></div>
      <button class="btn primary" style="width:100%" type="submit">اتصال</button></form></div></div>${CREDIT}</div>`;
    app.querySelector("#cf").onsubmit = async (e) => {
      e.preventDefault();
      const url = app.querySelector("#api").value.trim();
      if (!/^https:\/\/script\.google(usercontent)?\.com\/.+/.test(url) && !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(url)) return renderConnect("الرابط غير صحيح. يجب أن يبدأ بـ https://script.google.com/");
      const b = e.target.querySelector("button"); b.disabled = true; b.textContent = "جاري الفحص…";
      try {
        const r = await fetch(url, { method: "POST", body: JSON.stringify({ action: "ping" }), headers: { "Content-Type": "text/plain;charset=utf-8" } });
        let j = null; try { j = await r.json(); } catch (_) {}
        if (!j) return renderConnect(r.status === 404 ? "الرابط غير موجود (404). انسخ رابط Web app من Deploy ← Manage deployments، وتأكد أنه ينتهي بـ /exec." : "الرابط لا يعمل. تأكد أن Who has access = Anyone ثم أعد النشر.");
      } catch (_) { return renderConnect("تعذر الوصول للرابط. تأكد منه وأعد المحاولة."); }
      try { localStorage.setItem(API_KEY, url); } catch (_) {}
      location.reload();
    };
  }
  window.__changeServer = () => { try { localStorage.removeItem(API_KEY); sessionStorage.removeItem(API_KEY); } catch (_) {} pb.authStore.clear(); window.__forceConnect = true; renderConnect(); };

  // ------------------------------------------------------------------ helpers shared with quality.js (documentation audits)
  window.APPX = {
    get S() { return S; }, pb, UI, esc, toast, modal, shell, go, qs, errText, today, d10, toPb, addMonths, addDays, isAdmin, isTherapist,
    centerById, shortCenter, exportDoc, statusPill, route: () => route(),
    setDirty: (v) => { dirty = !!v; }, isDirty: () => dirty,
  };

  // ------------------------------------------------------------------ boot
  (async function boot() {
    if (!API_URL) return renderConnect();
    if (!pb.authStore.isValid || !pb.authStore.record || pb.authStore.record.collectionName !== "users") return renderLogin();
    try { await pb.collection("users").authRefresh(); await afterLogin(); }
    catch (_) { pb.authStore.clear(); renderLogin("انتهت الجلسة، الرجاء تسجيل الدخول مجدداً."); }
  })();
})();

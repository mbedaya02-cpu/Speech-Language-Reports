// =====================================================================
//  ملاحظات الجلسات (SOAP) — one note per session, per child.
//  The therapist ticks the plan's short-term goals worked on today and answers the rest as MCQ
//  (S, O per goal, A, P). The note cannot be saved without the therapist's own written note.
//  Notes feed the quality audit (sessions are imported) and the progress report (auto-fill).
// =====================================================================
(function () {
  const X = () => window.APPX;
  const esc = (s) => X().esc(s);
  const { O } = window.FC;
  const tx = (o) => (o ? (X().UI === "en" && o.en ? o.en : o.ar) : "");

  const ATT = [O("attended", "حضر", "Attended"), O("absent", "غاب", "Absent"), O("cancelled", "أُلغيت الجلسة", "Cancelled")];
  const DUR = [O("30", "30 دقيقة", "30 min"), O("45", "45 دقيقة", "45 min"), O("60", "60 دقيقة", "60 min")];
  const WITH = [O("mother", "الأم", "Mother"), O("father", "الأب", "Father"), O("parents", "الوالدان", "Parents"), O("companion", "مرافق", "Companion"), O("alone", "بدون مرافق في الجلسة", "No companion in session")];
  const MOOD = [O("coop", "{متعاون|متعاونة}", "cooperative"), O("active", "{نشيط|نشيطة} {ومتحمس|ومتحمسة}", "active and motivated"), O("calm", "{هادئ|هادئة}", "calm"),
    O("tired", "{متعب|متعبة} أو {نعسان|نعسانة}", "tired or sleepy"), O("anxious", "{قلق|قلقة} في البداية", "anxious at first"), O("attn", "صعوبة في الانتباه", "difficulty attending"), O("refuse", "{رافض|رافضة} للمشاركة أحياناً", "refused to participate at times")];
  const PARENT = [O("none", "لا جديد", "Nothing new"), O("better", "تحسن ملحوظ في المنزل", "Noticeable improvement at home"), O("new", "صعوبات جديدة", "New difficulties"), O("ill", "مرض أو ظرف طارئ", "Illness or unusual circumstance")];
  const PROMPT = [O("ind", "مستقل", "Independent"), O("gest", "إيماء", "Gestural"), O("verbal", "لفظي", "Verbal"), O("model", "نمذجة", "Modeling"), O("ppart", "جسدي جزئي", "Partial physical"), O("pfull", "جسدي كامل", "Full physical")];
  const ACT = [O("play", "لعب تفاعلي", "Interactive play"), O("cards", "بطاقات صور", "Picture cards"), O("books", "كتب وقصص", "Books and stories"), O("motor", "أنشطة حركية", "Motor activities"),
    O("songs", "أغانٍ وأناشيد", "Songs"), O("tablet", "تطبيق / جهاز لوحي", "App / tablet"), O("talk", "محادثة", "Conversation"), O("oral", "تمارين فموية", "Oral-motor exercises")];
  const TREND = [O("up", "تحسّن", "Improved"), O("same", "ثابت", "Stable"), O("down", "تراجع", "Declined"), O("first", "أول تدريب عليه", "First time")];
  const OVERALL = [O("good", "تقدم ملحوظ", "Noticeable progress"), O("gradual", "تقدم تدريجي", "Gradual progress"), O("same", "ثبات في الأداء", "Stable performance"), O("down", "تراجع", "Decline")];
  const PLAN = [O("cont", "الاستمرار على نفس الأهداف", "Continue the same goals"), O("harder", "رفع مستوى الصعوبة", "Increase difficulty"), O("fade", "تقليل التلقين", "Fade prompts"),
    O("strategy", "تعديل الاستراتيجية", "Change strategy"), O("newgoal", "البدء بهدف جديد من الخطة", "Start a new plan goal"), O("home", "تدريب منزلي", "Home practice"), O("guide", "إرشاد الأهل", "Parent guidance")];
  const ACC_QUICK = [0, 20, 40, 60, 80, 100];
  const lbl = (opts, v) => { const o = opts.find((x) => x.v === v); return o ? tx(o) : ""; };
  const lblAr = (opts, v, pc) => { const o = opts.find((x) => x.v === v); return o ? FC.gx(o.ar, pc) : ""; };

  // ------------------------------------------------------------------ helpers
  const goalsOfPlan = (plan, patient) => (plan && plan.plan_data ? window.Forms.plan.allGoals(plan.plan_data, "ar", FC.personCtx(patient, "ar")) : []);
  const activePlans = (plans) => plans.filter((p) => p.status === "سارية").concat(plans.filter((p) => p.status !== "سارية"));

  // SOAP text (Arabic; the form keeps the codes, so it can be re-generated)
  function soapText(n, patient) {
    const pc = FC.personCtx(patient, "ar"), G = (s) => FC.gx(s, pc);
    const out = [];
    if (n.attendance !== "attended") {
      out.push(`S/O: ${lblAr(ATT, n.attendance, pc)}.`);
    } else {
      const mood = (n.mood || []).map((m) => lblAr(MOOD, m, pc)).filter(Boolean);
      out.push("S: " + [G(`حضر{ت} {الطفل|الطفلة}`) + (n.with ? ` مع ${lblAr(WITH, n.with, pc)}`.replace(" مع بدون مرافق في الجلسة", " بدون مرافق") : "") + (n.duration ? `، مدة الجلسة ${n.duration} دقيقة` : "") + ".",
        mood.length ? G(`حالة {الطفل|الطفلة} في الجلسة: `) + mood.join("، ") + "." : "", n.parent && n.parent !== "none" ? `ذكر الأهل: ${lblAr(PARENT, n.parent, pc)}${n.parent_note ? " — " + n.parent_note : ""}.` : (n.parent_note ? `ذكر الأهل: ${n.parent_note}.` : "")].filter(Boolean).join(" "));
      out.push("O:");
      (n.goals || []).forEach((g, i) => {
        const bits = [];
        if (g.acc !== "" && g.acc != null) bits.push(`الدقة ${g.acc}%${g.trials ? ` من ${g.trials} محاولات` : ""}`);
        if (g.prompt) bits.push(`مستوى التلقين: ${lblAr(PROMPT, g.prompt, pc)}`);
        if ((g.act || []).length) bits.push(`الأنشطة: ${g.act.map((a) => lblAr(ACT, a, pc)).join("، ")}`);
        out.push(`- ${g.text}${bits.length ? " — " + bits.join("، ") : ""}.`);
      });
      out.push("A: " + [(n.goals || []).filter((g) => g.trend).map((g, i) => `${lblAr(TREND, g.trend, pc)} في الهدف ${i + 1}`).join("، "), n.overall ? `التقييم العام: ${lblAr(OVERALL, n.overall, pc)}` : ""].filter(Boolean).join(". ") + ".");
      out.push("P: " + ((n.plan_next || []).map((p) => lblAr(PLAN, p, pc)).join("، ") || "الاستمرار حسب الخطة") + "." + (n.home ? ` التدريب المنزلي: ${n.home}` : ""));
    }
    out.push(`ملاحظة الأخصائي: ${n.note || ""}`);
    return out.join("\n");
  }

  // ------------------------------------------------------------------ list (patient page tab)
  function listHtml(notes, patient, canWrite) {
    const A = X();
    return `<div class="panel-head"><span class="grow muted">ملاحظة لكل جلسة: الأهداف التي عملت عليها اليوم + الأداء + ملاحظتك. منها يُبنى التقرير المرحلي.</span>
        ${canWrite ? `<a class="btn" href="#/report/new?patient=${patient.id}&type=${encodeURIComponent("تقرير تقييم مرحلي")}&soap=1">تقرير مرحلي من الملاحظات</a> <a class="btn primary" href="#/soap/new?patient=${patient.id}">+ ملاحظة جلسة</a>` : ""}</div>
      ${notes.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>التاريخ</th><th>الحضور</th><th>الأهداف</th><th>متوسط الدقة</th><th>الأخصائي</th><th>الملاحظة</th></tr></thead><tbody>
        ${notes.map((n) => { const accs = (n.goals || []).map((g) => Number(g.acc)).filter((x) => !isNaN(x) && x !== null && String(x) !== ""); const avg = accs.length ? Math.round(accs.reduce((s, x) => s + x, 0) / accs.length) : null;
          return `<tr class="click" data-go="#/soap/${n.id}"><td class="nowrap"><a href="#/soap/${n.id}">${esc(A.d10(n.date))}</a></td><td>${n.attendance === "attended" ? '<span class="pill ok">حضر</span>' : `<span class="pill warn">${esc(lbl(ATT, n.attendance))}</span>`}</td>
          <td>${(n.goals || []).length}</td><td>${avg == null ? "—" : avg + "%"}</td><td>${esc(n.expand && n.expand.therapist ? n.expand.therapist.name : "")}</td><td>${esc(String(n.note || "").slice(0, 90))}</td></tr>`; }).join("")}
      </tbody></table></div>` : `<div class="empty">لا توجد ملاحظات جلسات بعد.</div>`}`;
  }

  // ------------------------------------------------------------------ editor
  async function route(h) {
    const A = X(), pb = A.pb, S = A.S, q = A.qs();
    const id = h[0] || "new";
    const main = A.shell("patients", `<div class="empty">جاري التحميل…</div>`);
    let n, patient;
    if (id === "new") {
      patient = await pb.collection("patients").getOne(q.patient);
      n = { patient: patient.id, center: patient.center, date: A.today(), attendance: "attended", duration: "45", with: "", mood: [], parent: "", parent_note: "", plan: "", goals: [], overall: "", plan_next: [], home: "", note: "" };
    } else {
      n = await pb.collection("soap_notes").getOne(id, { expand: "therapist" });
      patient = await pb.collection("patients").getOne(n.patient);
    }
    const [plans, last, progs] = await Promise.all([
      pb.collection("plans").getFullList({ filter: pb.filter("patient = {:p}", { p: patient.id }), sort: "-start_date" }),
      pb.collection("soap_notes").getFullList({ filter: pb.filter("patient = {:p}", { p: patient.id }), sort: "-date" }),
      pb.collection("reports").getFullList({ filter: pb.filter("patient = {:p} && report_type = {:t}", { p: patient.id, t: "تقرير تقييم مرحلي" }), sort: "-report_date" }),
    ]);
    const canEdit = A.isAdmin() || (A.isTherapist() && (id === "new" || n.therapist === S.me.id));
    if (id === "new" && !n.plan) { const p0 = activePlans(plans).find((p) => goalsOfPlan(p, patient).length) || activePlans(plans)[0]; n.plan = p0 ? p0.id : ""; }
    // the 6-month progress report is mandatory: warn when it is due / overdue
    const act = plans.find((p) => p.status === "سارية");
    let progWarn = "";
    if (act) {
      const base = [A.d10(act.start_date), progs[0] ? A.d10(progs[0].report_date) : ""].sort().pop();
      const due = A.addMonths(base, 6), left = Math.round((new Date(due) - new Date(A.today())) / 86400000);
      if (left <= 14 && due < A.d10(act.end_date)) progWarn = `<div class="note-box" style="margin-bottom:12px">${left < 0 ? `⚠ التقرير المرحلي الإلزامي متأخر منذ ${-left} يوم (كان مستحقاً ${due}).` : `التقرير المرحلي الإلزامي مستحق بتاريخ ${due}.`} <a href="#/report/new?patient=${patient.id}&type=${encodeURIComponent("تقرير تقييم مرحلي")}&soap=1">كتابته الآن من ملاحظات الجلسات</a></div>`;
    }
    let dirty = false; const setD = () => { dirty = true; A.setDirty(true); };
    const plan = () => plans.find((p) => p.id === n.plan);
    const prevFor = (key) => { const p = last.find((x) => x.id !== n.id && x.plan === n.plan && x.date <= (n.date + " 23") && (x.goals || []).some((g) => g.key === key)); return p ? (p.goals.find((g) => g.key === key) || null) : null; };

    main.innerHTML = `<div class="crumbs"><a href="#/patients">المرضى</a> / <a href="#/patient/${patient.id}?tab=soap">${esc(patient.full_name)}</a> / ملاحظة جلسة (SOAP)</div>
      <div class="page-head"><h1 class="grow">ملاحظة جلسة — ${esc(patient.full_name)} <span class="mono hint">${esc(patient.file_no)}</span></h1>${n.id ? `<span class="hint">${esc(n.expand && n.expand.therapist ? n.expand.therapist.name : "")}</span>` : ""}</div>
      ${progWarn}${!canEdit ? `<div class="note-box" style="margin-bottom:12px">هذه الملاحظة كتبها أخصائي آخر — للعرض فقط.</div>` : ""}
      <div id="soapRoot"></div>`;
    const root = main.querySelector("#soapRoot");
    const chips = (path, opts, cur, multi, pc) => `<div class="chips">${opts.map((o) => `<button type="button" class="chip ${multi ? ((cur || []).includes(o.v) ? "on" : "") : (cur === o.v ? "on" : "")}" data-ch="${path}" data-v="${esc(o.v)}" data-m="${multi ? 1 : 0}">${esc(FC.gx(tx(o), pc || FC.personCtx(patient, "ar")))}</button>`).join("")}</div>`;
    function render() {
      const pl = plan(), goals = goalsOfPlan(pl, patient), att = n.attendance === "attended";
      root.innerHTML = `
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">1</span>بيانات الجلسة</h2></div><div class="panel-body">
          <div class="grid cols-3">
            <div class="field"><label class="f">تاريخ الجلسة</label><input class="input" type="date" data-f="date" value="${esc(n.date)}"></div>
            <div class="field"><label class="f">المركز</label><select class="input" data-f="center">${S.centers.map((c) => `<option value="${c.id}" ${n.center === c.id ? "selected" : ""}>${esc(c.name_ar)}</option>`).join("")}</select></div>
            <div class="field"><label class="f">الخطة</label><select class="input" data-f="plan"><option value="">— بدون خطة —</option>${plans.map((p) => `<option value="${p.id}" ${n.plan === p.id ? "selected" : ""}>${esc(A.d10(p.start_date))} ← ${esc(A.d10(p.end_date))} (${esc(p.status)})${p.uploaded ? " · ملف مرفوع" : ""}</option>`).join("")}</select></div></div>
          <div class="q"><div class="q-label">الحضور</div>${chips("attendance", ATT, n.attendance)}</div>
          ${att ? `<div class="q"><div class="q-label">مدة الجلسة</div>${chips("duration", DUR, n.duration)}</div>` : ""}</div></div>
        ${att ? `
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">S</span>المعطيات الذاتية (Subjective)</h2></div><div class="panel-body">
          <div class="q"><div class="q-label">الحضور مع ${patient.gender === "أنثى" ? "الطفلة" : "الطفل"}</div>${chips("with", WITH, n.with)}</div>
          <div class="q"><div class="q-label">حالة ${patient.gender === "أنثى" ? "الطفلة" : "الطفل"} في الجلسة <span class="tag">اختيار متعدد</span></div>${chips("mood", MOOD, n.mood, true)}</div>
          <div class="q"><div class="q-label">ما ذكره الأهل</div>${chips("parent", PARENT, n.parent)}<input class="input" data-f="parent_note" value="${esc(n.parent_note || "")}" placeholder="تفاصيل (اختياري)" style="margin-top:6px"></div></div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">O</span>الأهداف التي عملت عليها اليوم (Objective)</h2></div><div class="panel-body">
          ${pl && pl.uploaded ? `<div class="note-box">هذه الخطة مرفوعة كملف، فأهدافها غير متاحة للاختيار. أضف الأهداف كتابةً بالأسفل.</div>` : ""}
          ${goals.length ? `<div class="q-label">اختر الأهداف قصيرة المدى (STGs) من الخطة:</div><div class="soap-goals">${goals.map((g, gi) => {
            const on = (n.goals || []).some((x) => x.key === g.key);
            return `<label class="soap-g ${on ? "on" : ""}"><input type="checkbox" data-goal="${esc(g.key)}" ${on ? "checked" : ""}> <strong>STG ${gi + 1}</strong> ${esc(g.text)}${g.eval === "achieved" ? ' <span class="pill ok">أُنجز</span>' : ""}</label>`; }).join("")}</div>` : (pl ? "" : `<div class="hint">لا توجد خطة سارية لهذا الطفل. اختر خطة أو أضف الهدف كتابةً.</div>`)}
          <div class="qa-filters" style="margin-top:8px"><input class="input grow" id="customG" placeholder="هدف غير موجود في الخطة (اختياري)"><button class="btn sm" id="addCustom" type="button">+ إضافة هدف</button></div>
          ${(n.goals || []).map((g, i) => { const prev = g.custom ? null : prevFor(g.key); return `<div class="soap-goal">
            <div class="soap-goal-h"><strong>${i + 1}.</strong> ${esc(g.text)} ${g.custom ? '<span class="pill info">خارج الخطة</span>' : ""}${prev && prev.acc !== "" && prev.acc != null ? `<span class="hint">الجلسة السابقة: ${esc(prev.acc)}%${prev.prompt ? " · " + esc(lbl(PROMPT, prev.prompt)) : ""}</span>` : ""}</div>
            <div class="grid cols-2">
              <div class="q"><div class="q-label">نسبة الدقة %</div><div class="chips">${ACC_QUICK.map((v) => `<button type="button" class="chip ${String(g.acc) === String(v) ? "on" : ""}" data-acc="${i}" data-v="${v}">${v}%</button>`).join("")}
                <input class="input sm" type="number" min="0" max="100" data-gf="${i}.acc" value="${esc(g.acc ?? "")}" style="width:80px" placeholder="%"></div>
                <label class="hint">عدد المحاولات <input class="input sm" type="number" min="0" data-gf="${i}.trials" value="${esc(g.trials ?? "")}" style="width:70px"></label></div>
              <div class="q"><div class="q-label">مستوى التلقين</div>${chips(`goals.${i}.prompt`, PROMPT, g.prompt)}</div>
              <div class="q"><div class="q-label">الأنشطة المستخدمة <span class="tag">اختيار متعدد</span></div>${chips(`goals.${i}.act`, ACT, g.act, true)}</div>
              <div class="q"><div class="q-label">مقارنة بالجلسة السابقة (Assessment)</div>${chips(`goals.${i}.trend`, TREND, g.trend)}</div></div></div>`; }).join("")}
        </div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">A</span>التقييم (Assessment)</h2></div><div class="panel-body">
          <div class="q"><div class="q-label">التقييم العام للجلسة</div>${chips("overall", OVERALL, n.overall)}</div></div></div>
        <div class="panel"><div class="panel-head"><h2 class="grow"><span class="n">P</span>الخطة للجلسة القادمة (Plan)</h2></div><div class="panel-body">
          <div class="q"><div class="q-label">الخطوة القادمة <span class="tag">اختيار متعدد</span></div>${chips("plan_next", PLAN, n.plan_next, true)}</div>
          <div class="field"><label class="f">التدريب المنزلي (اختياري)</label><input class="input" data-f="home" value="${esc(n.home || "")}"></div></div></div>` : ""}
        <div class="panel"><div class="panel-head"><h2 class="grow">ملاحظة الأخصائي عن الجلسة <span style="color:#b42318">*</span></h2><span class="hint">إلزامية — لا يتم الحفظ بدونها</span></div><div class="panel-body">
          <textarea class="input" rows="4" data-f="note" placeholder="اكتب ملاحظتك عن الجلسة بكلماتك…">${esc(n.note || "")}</textarea>
          <details style="margin-top:10px"><summary class="hint">معاينة نص SOAP</summary><pre class="soap-pre" id="soapPrev">${esc(soapText(n, patient))}</pre></details></div></div>
        ${canEdit ? `<div class="sticky-actions"><span class="grow"></span>${n.id ? `<button class="btn" id="pdfS">PDF</button>` : ""}${A.isAdmin() && n.id ? `<button class="btn danger" id="delS">حذف</button>` : ""}<button class="btn primary" id="saveS">حفظ ملاحظة الجلسة</button></div>` : (n.id ? `<div class="sticky-actions"><span class="grow"></span><button class="btn" id="pdfS">PDF</button></div>` : "")}`;
      if (!canEdit) root.querySelectorAll("input,select,textarea,.chip,#addCustom").forEach((el) => { el.disabled = true; });
      bindBtns();
    }
    const refreshPrev = () => { const p = root.querySelector("#soapPrev"); if (p) p.textContent = soapText(n, patient); };
    root.addEventListener("click", (e) => {
      const b = e.target.closest(".chip"); if (!b || b.disabled) return;
      if (b.dataset.acc != null) { n.goals[b.dataset.acc].acc = Number(b.dataset.v); setD(); render(); return; }
      if (!b.dataset.ch) return;
      const path = b.dataset.ch.split("."), multi = b.dataset.m === "1";
      let o = n; path.slice(0, -1).forEach((k) => { o = o[k]; }); const k = path[path.length - 1];
      if (multi) { o[k] = o[k] || []; const i = o[k].indexOf(b.dataset.v); if (i >= 0) o[k].splice(i, 1); else o[k].push(b.dataset.v); }
      else o[k] = o[k] === b.dataset.v ? "" : b.dataset.v;
      setD(); render();
    });
    root.addEventListener("change", (e) => {
      const el = e.target;
      if (el.dataset.goal) {
        const key = el.dataset.goal, g = goalsOfPlan(plan(), patient).find((x) => x.key === key);
        if (el.checked) n.goals.push({ key, text: g.text, acc: "", trials: "", prompt: "", act: [], trend: "" }); else n.goals = n.goals.filter((x) => x.key !== key);
        setD(); render(); return;
      }
      if (el.dataset.f === "plan") { n.plan = el.value; n.goals = n.goals.filter((g) => g.custom); setD(); render(); return; }
      if (el.dataset.f === "center" || el.dataset.f === "date") { n[el.dataset.f] = el.value; setD(); return; }
    });
    root.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.f && el.dataset.f !== "plan") { n[el.dataset.f] = el.value; setD(); refreshPrev(); }
      if (el.dataset.gf) { const [i, k] = el.dataset.gf.split("."); n.goals[i][k] = el.value === "" ? "" : Math.max(0, Math.min(k === "acc" ? 100 : 9999, Number(el.value))); setD(); refreshPrev(); }
    });
    function bindBtns() {
      const add = root.querySelector("#addCustom");
      if (add) add.onclick = () => { const t = root.querySelector("#customG").value.trim(); if (!t) return; n.goals.push({ key: "c_" + Math.random().toString(36).slice(2, 8), custom: true, text: t, acc: "", trials: "", prompt: "", act: [], trend: "" }); setD(); render(); };
      const sv = root.querySelector("#saveS"); if (sv) sv.onclick = save;
      const pdf = root.querySelector("#pdfS"); if (pdf) pdf.onclick = () => {
        if (dirty) { A.toast("احفظ الملاحظة أولاً، بعدها نزّل PDF.", true); return; }
        const txt = ["# ملاحظة جلسة (SOAP)", "::info4", `الاسم: ${patient.full_name}`, `رقم الملف: ${patient.file_no}`, `تاريخ الجلسة: ${n.date}`, `الأخصائي: ${n.expand && n.expand.therapist ? n.expand.therapist.name : ""}`, "",
          ...soapText(n, patient).split("\n").map((l) => (/^(S|O|A|P|S\/O):/.test(l) ? "**" + l.replace(/^([A-Z/]+):/, "$1:**") : l)), "", "**الأخصائي**", n.expand && n.expand.therapist ? n.expand.therapist.name : "", "[[SIG]]"].join("\n");
        A.exportDoc("pdf", txt, "ar", n.center, `${patient.file_no}_SOAP_${n.date}`, { user: n.therapist });
      };
      const del = root.querySelector("#delS"); if (del) del.onclick = async () => { if (!confirm("حذف ملاحظة الجلسة نهائياً؟")) return; await pb.collection("soap_notes").delete(n.id); A.setDirty(false); A.toast("تم الحذف"); A.go(`#/patient/${patient.id}?tab=soap`); };
    }
    async function save() {
      const miss = [];
      if (!n.date) miss.push("تاريخ الجلسة");
      if (n.attendance === "attended") {
        if (!n.goals.length) miss.push("هدف واحد على الأقل عملت عليه اليوم");
        n.goals.forEach((g, i) => { if (g.acc === "" || g.acc == null) miss.push(`نسبة الدقة للهدف ${i + 1}`); if (!g.prompt) miss.push(`مستوى التلقين للهدف ${i + 1}`); });
      }
      if (String(n.note || "").trim().length < 5) miss.push("ملاحظتك عن الجلسة");
      if (miss.length) { A.toast("لا يمكن الحفظ قبل إكمال: " + miss.join("، "), true); const t = root.querySelector('[data-f="note"]'); if (t && String(n.note || "").trim().length < 5) t.focus(); return; }
      if (n.attendance !== "attended") { n.goals = []; }
      const payload = { patient: n.patient, center: n.center, date: n.date, attendance: n.attendance, duration: n.duration, with: n.with, mood: n.mood, parent: n.parent, parent_note: n.parent_note,
        plan: n.plan, goals: n.goals, overall: n.overall, plan_next: n.plan_next, home: n.home, note: n.note.trim(), text: soapText(n, patient) };
      try {
        const saved = n.id ? await pb.collection("soap_notes").update(n.id, payload) : await pb.collection("soap_notes").create(payload);
        dirty = false; A.setDirty(false); A.toast("تم حفظ ملاحظة الجلسة ✓"); A.go(`#/soap/${saved.id}`); if (n.id) A.route();
      } catch (err) { A.toast(A.errText(err), true); }
    }
    render();
  }

  // ------------------------------------------------------------------ progress report from notes
  // Per plan goal: sessions, first / latest accuracy, latest prompt -> status + % for the progress form.
  function progressFromNotes(notes, goals, from, to) {
    const inRange = notes.filter((n) => n.attendance === "attended" && n.date > from && n.date <= to).sort((a, b) => (a.date < b.date ? -1 : 1));
    const all = notes.filter((n) => n.date > from && n.date <= to);
    const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
    const rows = goals.map((g) => {
      const pts = inRange.map((n) => ({ d: n.date, g: (n.goals || []).find((x) => x.key === g.key) })).filter((x) => x.g && x.g.acc !== "" && x.g.acc != null);
      if (!pts.length) return { g, n: 0 };
      const first = avg(pts.slice(0, 2).map((x) => Number(x.g.acc))), lastv = avg(pts.slice(-3).map((x) => Number(x.g.acc)));
      const prompt = pts[pts.length - 1].g.prompt;
      const s = lastv >= 80 && ["ind", "gest"].includes(prompt) ? "achieved" : lastv - first >= 15 ? "progress" : lastv > first ? "partial" : "not";
      return { g, n: pts.length, first, last: lastv, prompt, s };
    });
    return { rows, attended: inRange.length, total: all.length };
  }
  function progressSummary(res, from, to, pc, lang) {
    const ar = lang !== "en";
    const head = ar ? FC.gx(`خلال الفترة من ${FC.dmy(from)} إلى ${FC.dmy(to)}: عدد الجلسات الموثّقة ${res.total}، {حضر|حضرت} {C} منها ${res.attended}.`, pc)
      : `Between ${FC.dmy(from)} and ${FC.dmy(to)}, ${res.total} sessions were documented; the child attended ${res.attended}.`;
    const lines = res.rows.filter((r) => r.n).map((r) => ar ? `${r.g.text}: تطورت نسبة الدقة من ${r.first}% إلى ${r.last}% (عدد الجلسات: ${r.n})، ومستوى التلقين الحالي: ${lblAr(PROMPT, r.prompt, pc) || "—"}.`
      : `${r.g.text}: from ${r.first}% to ${r.last}% over ${r.n} sessions; current prompting level: ${(PROMPT.find((o) => o.v === r.prompt) || {}).en || "—"}.`);
    const none = res.rows.filter((r) => !r.n).length;
    return [head, ...lines, none ? (ar ? `لم يُوثّق العمل على ${none} من أهداف الخطة خلال هذه الفترة.` : `${none} plan goal(s) were not documented in this period.`) : ""].filter(Boolean).join("\n");
  }

  window.SOAP = { route, listHtml, soapText, progressFromNotes, progressSummary, PROMPT };
})();

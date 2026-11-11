// =====================================================================
//  "نموذج تحويل (Referral)" — short, explicit referral from the speech department to another specialty.
//  The receiver must see in seconds: who is referred, to whom, why, and exactly what is asked of them.
// =====================================================================
(function () {
  const { L, O, gx, lbl, lblMany, lines, dmy, nationality, joinList } = window.FC;

  const TO = [
    O("audio", "أخصائي سمعيات (فحص سمع)", "Audiologist (hearing test)"),
    O("ent", "طبيب أنف وأذن وحنجرة", "ENT physician"),
    O("peds", "طبيب أطفال", "Pediatrician"),
    O("devped", "طبيب نمو وتطور الطفل", "Developmental pediatrician"),
    O("neuro", "طبيب أعصاب أطفال", "Pediatric neurologist"),
    O("psychiatry", "طبيب نفسي أطفال", "Child psychiatrist"),
    O("psych", "أخصائي نفسي", "Psychologist"),
    O("ot", "أخصائي علاج وظيفي", "Occupational therapist"),
    O("pt", "أخصائي علاج طبيعي", "Physiotherapist"),
    O("sped", "أخصائي تربية خاصة", "Special education specialist"),
    O("aba", "أخصائي تحليل سلوك تطبيقي (ABA)", "Behavior analyst (ABA)"),
    O("dental", "طبيب أسنان / تقويم", "Dentist / orthodontist"),
    O("nutrition", "أخصائي تغذية", "Dietitian"),
    O("other", "جهة أخرى", "Other"),
  ];
  const REQUEST = [
    O("assess", "تقييم وتشخيص", "assessment and diagnosis"),
    O("test", "إجراء فحص محدد", "a specific test"),
    O("consult", "استشارة ورأي تخصصي", "specialist consultation"),
    O("treat", "بدء علاج / تأهيل", "starting treatment / therapy"),
    O("followup", "متابعة", "follow-up"),
    O("second", "رأي ثانٍ", "a second opinion"),
  ];
  const URGENCY = [O("routine", "روتيني", "Routine"), O("soon", "عاجل (خلال أسبوعين)", "Soon (within 2 weeks)"), O("urgent", "طارئ", "Urgent")];
  // what made us refer (by specialty, but every option is available)
  const SIGNS = [
    O("noresp", "ضعف الاستجابة للأصوات أو للمناداة بالاسم", "Reduced response to sounds or to name"),
    O("earinf", "التهابات أذن متكررة أو سوائل خلف الطبلة", "Recurrent ear infections or middle-ear fluid"),
    O("regress", "تراجع في مهارات لغوية أو تواصلية كانت موجودة", "Loss of language or communication skills that were present"),
    O("slowprog", "تقدم أبطأ من المتوقع رغم الانتظام في الجلسات", "Slower progress than expected despite regular attendance"),
    O("social", "صعوبات في التفاعل الاجتماعي والتواصل البصري", "Difficulties in social interaction and eye contact"),
    O("repetitive", "سلوكيات نمطية أو اهتمامات محدودة", "Repetitive behaviors or restricted interests"),
    O("attention", "صعوبة ملحوظة في الانتباه والتركيز أو فرط حركة", "Marked attention difficulties or hyperactivity"),
    O("behavior", "سلوكيات تؤثر على المشاركة في الجلسات", "Behaviors that limit participation in sessions"),
    O("motor", "صعوبات حركية دقيقة أو كبيرة", "Fine or gross motor difficulties"),
    O("sensory", "استجابات حسية غير معتادة", "Unusual sensory responses"),
    O("feeding", "صعوبات في البلع أو المضغ أو الأكل", "Swallowing, chewing or feeding difficulties"),
    O("oral", "ملاحظات في تركيب الفم أو الأسنان أو اللسان", "Oral structure, dental or tongue findings"),
    O("voice", "بحة أو تغيرات مستمرة في الصوت", "Persistent hoarseness or voice changes"),
    O("snoring", "شخير أو تنفس من الفم", "Snoring or mouth breathing"),
    O("seizure", "نوبات أو حركات غير إرادية مُبلغ عنها", "Reported seizures or involuntary movements"),
    O("cognitive", "مؤشرات صعوبات تعلم أو قدرات معرفية", "Signs of learning or cognitive difficulties"),
    O("emotional", "قلق أو انسحاب أو صعوبات انفعالية", "Anxiety, withdrawal or emotional difficulties"),
  ];
  const ATTACH = [O("eval", "تقرير التقييم", "Evaluation report"), O("plan", "الخطة العلاجية الحالية", "Current therapy plan"), O("progress", "آخر تقرير مرحلي", "Latest progress report"), O("none", "لا يوجد", "None")];
  const RETURN = [O("report", "تقرير مكتوب بالنتائج والتشخيص", "A written report of findings and diagnosis"), O("recs", "توصيات تساعدنا في خطة النطق واللغة", "Recommendations for our speech and language plan"),
    O("call", "تواصل مع الأخصائي المحوِّل لمناقشة الحالة", "A call with the referring therapist to discuss the case")];

  const CONTACT = [O("c_phone", "هاتف المركز", "Center phone"), O("c_whatsapp", "واتساب المركز", "Center WhatsApp"), O("c_email", "إيميل المركز", "Center email"),
    O("c_address", "عنوان المركز", "Center address"), O("t_email", "إيميل الأخصائي", "Therapist email"), O("guardian", "هاتف ولي الأمر", "Guardian phone")];

  const form = {
    kind: "referral",
    noNextDue: true,
    dateLabel: L("تاريخ التحويل", "Referral date"),
    sections: [
      { id: "to", title: L("إلى مين التحويل؟", "Referred to"), fields: [
        { id: "to", type: "single", label: L("التخصص المحوَّل إليه", "Specialty"), options: TO },
        { id: "to_other", type: "text", label: L("حدّد الجهة", "Specify"), show: (d) => d.to === "other" },
        { id: "to_name", type: "text", label: L("اسم الطبيب / المستشفى / المركز (اختياري)", "Doctor / hospital / center name (optional)") },
        { id: "urgency", type: "single", label: L("درجة الأولوية", "Priority"), options: URGENCY },
      ] },
      { id: "why", title: L("المطلوب من التحويل", "What we are asking for"), fields: [
        { id: "request", type: "multi", label: L("نوع الطلب", "Request"), options: REQUEST },
        { id: "test_name", type: "text", label: L("الفحص المطلوب بالتحديد (مثال: Audiogram، ABR، Tympanometry)", "The exact test (e.g. Audiogram, ABR, Tympanometry)"), show: (d) => (d.request || []).includes("test") },
        { id: "question", type: "textarea", label: L("السؤال المحدد للجهة المحوَّل إليها (سطر أو سطرين) *", "The specific question for the receiver (one or two lines) *") },
      ] },
      { id: "case", title: L("ملخص الحالة (مختصر)", "Case summary (brief)"), fields: [
        { id: "dx", type: "text", label: L("التشخيص / سبب المتابعة لدينا", "Our diagnosis / reason for therapy") },
        { id: "signs", type: "multi", label: L("الملاحظات التي دعت للتحويل", "Findings that led to this referral"), options: SIGNS },
        { id: "signs_more", type: "textarea", label: L("ملاحظات إضافية مختصرة (اختياري)", "Brief additional findings (optional)") },
        { id: "done", type: "textarea", label: L("ما تم لدينا حتى الآن (مدة العلاج، التقييمات) — اختياري", "What we have done so far (therapy duration, assessments) — optional") },
      ] },
      { id: "close", title: L("المرفقات والرد", "Attachments and reply"), fields: [
        { id: "attach", type: "multi", label: L("المرفقات", "Attached"), options: ATTACH },
        { id: "reply", type: "multi", label: L("نرجو إعادة", "Please send back"), options: RETURN },
      ] },
      { id: "contact", title: L("بيانات التواصل", "Contact details"), fields: [
        { id: "contact", type: "multi", label: L("اللي بيطلع بالتحويل (تنسحب من بيانات المركز وملف الطفل)", "Shown on the referral (taken from the center and the child's file)"), options: CONTACT },
        { id: "contact_direct", type: "text", label: L("رقم مباشر / تحويلة للأخصائي (اختياري)", "Direct number / extension for the therapist (optional)") },
        { id: "contact_hours", type: "text", label: L("أوقات التواصل (اختياري)", "Contact hours (optional)"), suggest: [L("الأحد – الخميس، 8 صباحاً – 4 مساءً", "Sunday – Thursday, 8 am – 4 pm")] },
      ] },
    ],

    defaults() { return { urgency: "routine", request: ["assess"], attach: ["eval"], reply: ["report", "recs"], contact: ["c_phone", "c_email", "t_email", "guardian"] }; },

    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, p = ctx.patient, G = (s) => gx(s, pc);
      const to = d.to === "other" ? (d.to_other || "") : lbl(TO, d.to, lang, pc);
      const toFull = [to, (d.to_name || "").trim()].filter(Boolean).join(" — ");
      const req = lblMany(REQUEST, d.request || [], lang, pc).map((r, i) => ((d.request || [])[i] === "test" && d.test_name ? `${r} (${d.test_name})` : r));
      const out = ["# " + (ar ? "نموذج تحويل (Referral)" : "Referral Form")];
      if (ctx.centerFull) out.push("^^ " + ctx.centerFull + (ar ? " — قسم النطق واللغة" : " — Speech and Language Department"));
      out.push("", "::info4");
      if (ar) out.push(`الاسم: ${pc.full}`, `رقم الملف: ${p.file_no || ""}`, `تاريخ الميلاد: ${dmy(p.dob)}`, `العمر: ${pc.age}`,
        `تاريخ التحويل: ${dmy(ctx.reportDate)}`, `الأولوية: ${lbl(URGENCY, d.urgency, lang, pc)}`, `من: ${ctx.therapistName || ""} (قسم النطق واللغة)`, `إلى: ${toFull}`);
      else out.push(`Name: ${pc.full}`, `File no.: ${p.file_no || ""}`, `Date of birth: ${dmy(p.dob)}`, `Age: ${pc.age}`,
        `Referral date: ${dmy(ctx.reportDate)}`, `Priority: ${lbl(URGENCY, d.urgency, lang, pc)}`, `From: ${ctx.therapistName || ""} (Speech and Language Department)`, `To: ${toFull}`);

      // the request first, in one clear sentence + the exact question
      out.push("", "## " + (ar ? "المطلوب من هذا التحويل" : "Reason for referral"));
      if (req.length) out.push(G(ar ? `نحوّل إليكم {FULL} لطلب **${joinList(req, "ar")}**.` : `We refer {FULL} to you for **${joinList(req, "en")}**.`));
      if ((d.question || "").trim()) out.push(`**${ar ? "السؤال المحدد" : "Specific question"}:** ${G(d.question.trim())}`);

      const dx = (d.dx || "").trim() || (ar ? (p.diagnosis || "") : "");
      const signs = lblMany(SIGNS, d.signs || [], lang, pc);
      const more = lines(d.signs_more).map(G);
      if (dx || signs.length || more.length || (d.done || "").trim()) {
        out.push("", "## " + (ar ? "ملخص الحالة" : "Case summary"));
        if (dx) out.push(`- **${ar ? "سبب المتابعة لدينا" : "Followed with us for"}:** ${G(dx)}`);
        if (signs.length || more.length) out.push(`- **${ar ? "ما دعا للتحويل" : "Findings leading to referral"}:** ${[...signs, ...more].join(ar ? "؛ " : "; ")}`);
        if ((d.done || "").trim()) out.push(`- **${ar ? "ما تم حتى الآن" : "Done so far"}:** ${G(d.done.trim())}`);
      }

      const att = (d.attach || []).filter((v) => v !== "none");
      const rep = lblMany(RETURN, d.reply || [], lang, pc);
      if (att.length || rep.length) {
        out.push("", "## " + (ar ? "المرفقات والرد المطلوب" : "Attachments and requested reply"));
        if (att.length) out.push(`- **${ar ? "مرفق" : "Attached"}:** ${lblMany(ATTACH, att, lang, pc).join(ar ? "، " : ", ")}`);
        if (rep.length) out.push(`- **${ar ? "نرجو إعادة" : "Please send back"}:** ${rep.join(ar ? "، " : ", ")}`);
      }

      // contact details
      const cc = ctx.contact || {}, sel = d.contact || [], rows = [];
      // keep phone numbers left-to-right inside Arabic lines (+971 56 … would otherwise flip)
      const ltr = (v) => String(v || "").replace(/[+]?[\d][\d\s()-]{5,}[\d]/g, (m) => "\u202A" + m + "\u202C");
      const add = (k, label, v) => { if (sel.includes(k) && String(v || "").trim()) rows.push(`${label}: ${ltr(v)}`); };
      add("c_phone", ar ? "هاتف المركز" : "Center phone", cc.phone);
      add("c_whatsapp", ar ? "واتساب المركز" : "Center WhatsApp", cc.whatsapp);
      add("c_email", ar ? "إيميل المركز" : "Center email", cc.email);
      add("t_email", ar ? "إيميل الأخصائي" : "Therapist email", ctx.therapistEmail);
      if ((d.contact_direct || "").trim()) rows.push(`${ar ? "رقم الأخصائي المباشر" : "Therapist direct line"}: ${ltr(d.contact_direct.trim())}`);
      add("guardian", ar ? "هاتف ولي الأمر" : "Guardian phone", [p.guardian_name, p.phone].filter(Boolean).join(" — ") && p.phone ? `${p.phone}${p.guardian_name ? ` (${p.guardian_name})` : ""}` : "");
      add("c_address", ar ? "عنوان المركز" : "Center address", cc.address);
      if ((d.contact_hours || "").trim()) rows.push(`${ar ? "أوقات التواصل" : "Contact hours"}: ${G(d.contact_hours.trim())}`);
      if (rows.length) out.push("", "## " + (ar ? "بيانات التواصل" : "Contact details"), "::grid2", ...rows);

      out.push("", ar ? "شاكرين تعاونكم، ونرحب بالتواصل لأي استفسار." : "Thank you for your cooperation; please contact us with any questions.");
      // signatures side by side: referring therapist on the right, center manager on the left (Arabic)
      out.push("", "::sign2",
        ar ? `الأخصائي المحوِّل | ${ctx.therapistName || ""} | [[SIG]]` : `Referring therapist | ${ctx.therapistName || ""} | [[SIG]]`,
        ar ? "مدير المركز | ................................ | التوقيع والختم: ......................" : "Center manager | ................................ | Signature & stamp: ......................");
      return out.join("\n");
    },
  };
  window.Forms.referral = form;
})();

// =====================================================================
//  "تقرير الملاحظة الأولية" — Initial Scanning (first-session impression for parents)
//
//  Each skill is rated: shown / emerging / not shown / not rated (default).
//  "Not rated" never appears in the report. Single-choice questions turn into ready,
//  gentle sentences. Wording avoids diagnostic terms and alarming words on purpose.
// =====================================================================
(function () {
  const { L, O, gx, lines, d10 } = window.FC;

  const R4 = [O("shown", "ظهرت", "Shown"), O("emerging", "بدأت تظهر", "Emerging"), O("not", "لم تظهر", "Not shown"), O("na", "لم تُقيَّم", "Not rated")];
  const NA = O("na", "لم تُقيَّم", "Not rated");

  // ---- skills (written as nouns, so they read the same for boys and girls)
  const SK = {
    interact: [
      O("sep", "تقبّل الانفصال عن الأهل أو البقاء في الغرفة بارتياح", "Separating from parents or staying in the room comfortably"),
      O("adapt", "التكيّف مع المكان والأشخاص الجدد", "Adapting to the new place and people"),
      O("table", "الجلوس والمشاركة في نشاط على الطاولة", "Sitting and joining a table-top activity"),
      O("routine", "اتباع روتين الجلسة والانتقال بين الأنشطة", "Following the session routine and moving between activities"),
      O("init", "المبادرة بالتفاعل مع الأخصائي", "Initiating interaction with the therapist"),
    ],
    pre: [
      O("eye", "التواصل البصري أثناء اللعب والتفاعل", "Eye contact during play and interaction"),
      O("name", "الاستجابة عند المناداة بالاسم", "Responding to name"),
      O("joint", "الانتباه المشترك", "Joint attention"),
      O("point", "الإشارة بالإصبع للطلب أو لفت الانتباه", "Pointing to request or to share attention"),
      O("gest", "استخدام الإيماءات (التلويح، هزّ الرأس، مدّ اليدين)", "Using gestures (waving, nodding or shaking the head, reaching)"),
      O("imitm", "تقليد الحركات والأفعال", "Imitating movements and actions"),
      O("imits", "تقليد الأصوات أو المقاطع", "Imitating sounds or syllables"),
      O("turn", "تبادل الأدوار في اللعب", "Turn-taking in play"),
      O("func", "اللعب الوظيفي", "Functional play"),
      O("pretend", "اللعب التخيلي", "Pretend play"),
    ],
    receptive: [
      O("no", "فهم «لا»", "Understanding \"no\""),
      O("obj", "التعرّف على أشياء مألوفة عند تسميتها", "Identifying familiar objects when named"),
      O("body", "التعرّف على أجزاء الجسم", "Identifying body parts"),
      O("cmd1", "تنفيذ أوامر من خطوة واحدة", "Following one-step directions"),
      O("cmd2", "تنفيذ أوامر من خطوتين", "Following two-step directions"),
      O("wh", "فهم الأسئلة البسيطة (وين؟ شو؟ مين؟)", "Understanding simple questions (where? what? who?)"),
      O("concepts", "فهم مفاهيم بسيطة (كبير/صغير، فوق/تحت)", "Understanding simple concepts (big/small, up/down)"),
    ],
    expressive: [
      O("babble", "إصدار الأصوات والمناغاة", "Vocalizing and babbling"),
      O("words", "كلمات مفردة ذات معنى", "Meaningful single words"),
      O("two", "تركيب كلمتين", "Two-word combinations"),
      O("short", "جمل قصيرة", "Short sentences"),
      O("label", "تسمية الأشياء والصور", "Naming objects and pictures"),
      O("request", "طلب ما يريده (بالكلام أو الإشارة)", "Requesting what is wanted (with words or gestures)"),
      O("answer", "الإجابة عن الأسئلة البسيطة", "Answering simple questions"),
    ],
    speech: [
      O("lips", "حركة الشفاه (ضمّ، فتح، نفخ)", "Lip movements (rounding, opening, blowing)"),
      O("tongue", "حركة اللسان (إخراج، رفع، تحريك جانبي)", "Tongue movements (protruding, lifting, side to side)"),
      O("sounds", "إنتاج أصوات متنوعة", "Producing a variety of sounds"),
      O("fluency", "سلاسة الكلام", "Smooth, fluent speech"),
      O("voice", "جودة الصوت", "Voice quality"),
    ],
  };

  // ---- single-choice questions: option label + the gentle sentence it becomes in the report
  const Q = {
    attention: { label: L("مدة الانتباه للنشاط الواحد", "Attention span for one activity"), options: [
      O("lt1", "أقل من دقيقة", "Under a minute", { s: L("كان {انتباهه|انتباهها} للنشاط الواحد قصيراً، وهذا مألوف في الجلسة الأولى.", "{His|Her} attention to a single activity was short, which is common in a first session.") }),
      O("1to3", "1–3 دقائق", "1–3 minutes", { s: L("{استطاع|استطاعت} الانتباه للنشاط الواحد مدة تتراوح بين دقيقة وثلاث دقائق تقريباً.", "{He|She} was able to attend to one activity for about one to three minutes.") }),
      O("gt3", "أكثر من 3 دقائق", "More than 3 minutes", { s: L("{حافظ|حافظت} على {انتباهه|انتباهها} للنشاط الواحد أكثر من ثلاث دقائق، وهذا جميل في اللقاء الأول.", "{He|She} kept {his|her} attention on one activity for more than three minutes, which is lovely to see in a first meeting.") }),
      NA] },
    mode: { label: L("الطريقة الأساسية للتواصل", "Main way of communicating"), options: [
      O("speech", "الكلام", "Speech", { s: L("{يعتمد|تعتمد} على الكلام بشكل أساسي للتواصل.", "{He|She} mainly uses speech to communicate.") }),
      O("wordsgest", "كلمات + إشارة", "Words + gestures", { s: L("{يجمع|تجمع} بين الكلمات والإشارة للتعبير عن {احتياجاته|احتياجاتها}.", "{He|She} combines words and gestures to express {his|her} needs.") }),
      O("gest", "إشارة وإيماءات", "Gestures", { s: L("{يعبّر|تعبّر} عن {احتياجاته|احتياجاتها} بالإشارة والإيماءات بشكل أساسي.", "{He|She} mainly expresses {his|her} needs with gestures.") }),
      O("sounds", "أصوات", "Sounds", { s: L("{يستخدم|تستخدم} الأصوات للتعبير عن {رغباته|رغباتها} ولفت الانتباه.", "{He|She} uses sounds to express {his|her} wishes and to get attention.") }),
      O("pull", "سحب اليد", "Pulling an adult's hand", { s: L("{يعبّر|تعبّر} عمّا {يريده|تريده} غالباً بسحب يد الشخص الكبير نحو ما {يريد|تريد}.", "{He|She} often shows what {he|she} wants by leading an adult's hand to it.") }),
      NA] },
    vocab: { label: L("الحصيلة التعبيرية التقريبية", "Approximate expressive vocabulary"), options: [
      O("none", "لا كلمات بعد", "No words yet", { s: L("لم نسمع كلمات واضحة خلال هذه الجلسة، وسنتعرّف أكثر على كلمات {طفلكم|طفلتكم} من ملاحظاتكم في المنزل.", "We did not hear clear words during this session; your observations at home will help us learn more about {his|her} words.") }),
      O("lt10", "أقل من 10", "Fewer than 10", { s: L("تبدو حصيلة {طفلكم|طفلتكم} من الكلمات المنطوقة أقل من عشر كلمات تقريباً.", "{His|Her} spoken vocabulary seems to be fewer than ten words.") }),
      O("10to50", "10–50", "10–50", { s: L("تبدو حصيلة {طفلكم|طفلتكم} من الكلمات المنطوقة بين عشر وخمسين كلمة تقريباً.", "{His|Her} spoken vocabulary seems to be between ten and fifty words.") }),
      O("gt50", "أكثر من 50", "More than 50", { s: L("تبدو حصيلة {طفلكم|طفلتكم} من الكلمات المنطوقة أكثر من خمسين كلمة تقريباً.", "{His|Her} spoken vocabulary seems to be more than fifty words.") }),
      NA] },
    intell: { label: L("وضوح الكلام", "Speech clarity"), options: [
      O("napp", "غير منطبق", "Not applicable", { s: L("سنتابع وضوح الكلام مع ازدياد الكلمات المنطوقة.", "We will follow speech clarity as spoken words increase.") }),
      O("clear", "واضح غالباً", "Mostly clear", { s: L("كان {كلامه|كلامها} واضحاً في أغلب الأوقات.", "{His|Her} speech was clear most of the time.") }),
      O("partial", "واضح جزئياً", "Partly clear", { s: L("كان جزء من {كلامه|كلامها} واضحاً، وبعض الكلمات احتاجت توضيحاً من الأهل.", "Part of {his|her} speech was clear, and some words needed help from the parents to understand.") }),
      O("family", "مفهوم للأهل أكثر من الغرباء", "Understood by family more than by others", { s: L("{كلامه|كلامها} مفهوم للأهل أكثر من الأشخاص الجدد، وسنعمل على دعم وضوحه مع الجميع.", "{His|Her} speech is easier for family to understand than for new people; we will work on making it clearer for everyone.") }),
      NA] },
    drool: { label: L("سيلان اللعاب", "Drooling"), options: [
      O("none", "غير ملاحظ", "Not observed", { s: L("لم نلاحظ سيلاناً للعاب خلال الجلسة.", "We did not observe drooling during the session.") }),
      O("some", "أحياناً", "Sometimes", { s: L("لاحظنا سيلاناً للعاب في بعض الأوقات خلال الجلسة.", "We noticed some drooling at times during the session.") }),
      O("often", "متكرر", "Frequent", { s: L("لاحظنا سيلاناً متكرراً للعاب خلال الجلسة، وسنتابع ذلك ضمن مهارات الفم.", "We noticed frequent drooling during the session, and we will follow this as part of oral skills.") }),
      NA] },
  };

  const ATTEND = [O("mother", "الأم", "Mother"), O("father", "الأب", "Father"), O("parents", "الوالدان", "Both parents"), O("companion", "مرافق", "Companion")];
  const FREQ = [O("1", "جلسة", "1 session"), O("2", "جلستان", "2 sessions"), O("3", "ثلاث", "3 sessions")];
  const FREQ_TXT = { "1": L("جلسة واحدة", "one session"), "2": L("جلستين", "two sessions"), "3": L("ثلاث جلسات", "three sessions") };
  const RECS = [
    O("comp", "إجراء تقييم لغوي شامل بمقياس معياري خلال الجلسات القادمة", "A comprehensive language assessment with a standardized tool in the coming sessions"),
    O("therapy", "البدء بجلسات علاج النطق واللغة (حدّد العدد أسبوعياً)", "Starting speech and language therapy sessions (choose how many per week)"),
    O("obs", "جلسات ملاحظة إضافية لاستكمال الصورة", "Additional observation sessions to complete the picture"),
    O("home", "تطبيق برنامج منزلي بسيط بالتعاون مع الأخصائي", "A simple home program in partnership with the therapist"),
    O("guide", "جلسة إرشاد للأهل حول طرق تحفيز الكلام في المنزل", "A parent guidance session on ways to encourage talking at home"),
    O("screen", "تقليل وقت الشاشات واستبداله باللعب التفاعلي", "Less screen time, replaced with interactive play"),
    O("hearing", "إجراء فحص سمع للاطمئنان", "A hearing test for reassurance"),
    O("ot", "استشارة أخصائي العلاج الوظيفي", "A consultation with an occupational therapist"),
    O("dev", "تقييم نمائي/نفسي شامل للاطمئنان", "A comprehensive developmental/psychological assessment for reassurance"),
    O("oral", "تقييم المهارات الفموية والتغذية", "An assessment of oral and feeding skills"),
    O("ped", "مراجعة طبيب الأطفال لمتابعة النمو العام", "A visit to the pediatrician to follow general development"),
  ];

  // Report sections: id, title, matrix field, single-choice fields, note field
  const PARTS = [
    { id: "interact", title: L("التفاعل والسلوك العام", "Interaction and general behavior"), singles: ["attention"] },
    { id: "pre", title: L("مهارات ما قبل اللغة", "Pre-linguistic skills"), singles: [] },
    { id: "receptive", title: L("اللغة الاستقبالية (الفهم)", "Receptive language (understanding)"), singles: [] },
    { id: "expressive", title: L("اللغة التعبيرية", "Expressive language"), singles: ["mode", "vocab"] },
    { id: "speech", title: L("النطق والكلام", "Articulation and speech"), singles: ["intell", "drool"] },
  ];

  const matrixField = (p) => ({ id: p.id, type: "matrix", tone: true, label: L("قيّم كل مهارة (لم تُقيَّم = لا تظهر في التقرير)", "Rate each skill (not rated = left out of the report)"),
    rows: SK[p.id], groups: [{ key: "s", options: R4 }] });
  const singleField = (k) => ({ id: k, type: "single", label: Q[k].label, options: Q[k].options });
  const noteField = (p) => ({ id: p.id + "_note", type: "textarea", label: L("ملاحظة الأخصائي لهذا القسم (اختياري — تظهر كما هي)", "Therapist note for this section (optional, shown as written)") });

  const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const longDate = (iso, ar) => { iso = d10(iso); if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return ar ? `${d} ${AR_MONTHS[m - 1]} ${y}` : `${d} ${EN_MONTHS[m - 1]} ${y}`; };

  const form = {
    kind: "scanning",
    noNextDue: true,
    dateLabel: L("تاريخ الجلسة", "Session date"),
    sections: [
      { id: "session", title: L("بيانات الجلسة", "Session details"), fields: [
        { id: "attendees", type: "single", label: L("الحضور مع الطفل", "Attending with the child"), options: ATTEND },
        { id: "reason", type: "textarea", label: L("سبب الزيارة كما ذكره الأهل", "Reason for the visit, in the parents' words") },
      ] },
      ...PARTS.map((p) => ({ id: "p_" + p.id, title: p.title, fields: [matrixField(p), ...p.singles.map(singleField), noteField(p)] })),
      { id: "recs", title: L("التوصيات الأولية", "Initial recommendations"), fields: [
        { id: "recs", type: "multi", label: L("اختر التوصيات المناسبة", "Choose the recommendations that fit"), options: RECS },
        { id: "freq", type: "single", label: L("عدد جلسات العلاج أسبوعياً", "Therapy sessions per week"), options: FREQ, show: (d) => (d.recs || []).includes("therapy") },
        { id: "recs_extra", type: "textarea", label: L("توصيات أو ملاحظات إضافية (اختياري)", "Additional recommendations or notes (optional)") },
      ] },
    ],

    defaults() {
      const d = { recs: [], freq: "2" };
      PARTS.forEach((p) => { d[p.id] = {}; SK[p.id].forEach((r) => { d[p.id][r.v] = { s: "na" }; }); p.singles.forEach((k) => { d[k] = "na"; }); });
      return d;
    },

    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, G = (s) => gx(s, pc), T = (o) => G(o[lang] || o.ar);
      const kid = ar ? (pc.female ? "الطفلة" : "الطفل") : "the child";
      const att = ATTEND.find((o) => o.v === d.attendees);
      const out = ["# " + (ar ? "تقرير الملاحظة الأولية" : "Initial Scanning Report")];
      if (ctx.centerFull) out.push("^^ " + ctx.centerFull);
      out.push("^^ " + (ar ? "قسم النطق واللغة" : "Speech and Language Department"), "", "::info4");
      if (ar) out.push(`الاسم: ${pc.full}`, `رقم الملف: ${ctx.patient.file_no || ""}`, `العمر: ${pc.age}`, `تاريخ الجلسة: ${longDate(ctx.reportDate, true)}`,
        `الأخصائي/ة: ${ctx.therapistName || ""}`, `الحضور مع ${kid}: ${att ? att.ar : ""}`);
      else out.push(`Name: ${pc.full}`, `File no.: ${ctx.patient.file_no || ""}`, `Age: ${pc.age}`, `Session date: ${longDate(ctx.reportDate, false)}`,
        `Therapist: ${ctx.therapistName || ""}`, `Attending with the child: ${att ? att.en : ""}`);

      out.push("", "::box");
      out.push(G(ar
        ? "الأهل الكرام، نشكركم على ثقتكم وعلى حضوركم مع {طفلكم|طفلتكم} {N}. يقدّم هذا التقرير انطباعاً أولياً عمّا لاحظناه خلال الجلسة الأولى، وهو ليس تقييماً نهائياً ولا تشخيصاً. ومن الطبيعي أن {يُظهر|تُظهر} {الطفل|الطفلة} جزءاً من {مهاراته|مهاراتها} فقط في اللقاء الأول، لأن المكان والأشخاص جديدون {عليه|عليها}."
        : "Dear parents, thank you for your trust and for coming with {N}. This report shares our first impressions from the first session; it is not a final assessment or a diagnosis. It is natural for a child to show only part of {his|her} skills at a first meeting, because the place and the people are new to {him|her}."));

      const reason = String(d.reason || "").trim();
      if (reason) out.push("", "## " + (ar ? "سبب الزيارة" : "Reason for the visit"), ...lines(reason));

      let anyNot = false, n = 0;
      PARTS.forEach((p) => {
        const m = d[p.id] || {};
        const by = (s) => SK[p.id].filter((r) => (m[r.v] || {}).s === s).map(T);
        const shown = by("shown"), emerging = by("emerging"), not = by("not");
        const sent = p.singles.map((k) => { const o = Q[k].options.find((x) => x.v === d[k]); return o && o.s ? T(o.s) : ""; }).filter(Boolean);
        const note = String(d[p.id + "_note"] || "").trim();
        if (!shown.length && !emerging.length && !not.length && !sent.length && !note) return;
        n++;
        out.push("", `## ${n}. ${p.title[lang]}`);
        if (sent.length) out.push(sent.join(" "));
        const list = (tone, head, items) => { if (items.length) out.push(`### {${tone}} ${head}`, ...items.map((x) => "- " + x)); };
        list("g", ar ? "مهارات لاحظناها بوضوح:" : "Skills we clearly observed:", shown);
        list("a", ar ? "مهارات بدأت بالظهور ونعمل على تعزيزها:" : "Skills that are starting to appear, which we will build on:", emerging);
        list("b", ar ? "مهارات لم تظهر خلال هذه الجلسة، وسنتابع ملاحظتها لاحقاً:" : "Skills we did not see in this session, which we will keep observing:", not);
        if (not.length) anyNot = true;
        if (note) out.push(...lines(note).map(G));
      });

      if (anyNot) {
        out.push("", "::box", G(ar
          ? "عدم ظهور بعض المهارات خلال هذه الجلسة لا يعني بالضرورة أنها غير موجودة لدى {طفلكم|طفلتكم}؛ فكثير من الأطفال يحتاجون وقتاً ليألفوا المكان والأشخاص قبل أن يُظهروا ما يعرفونه. سنتأكد من هذه المهارات خلال الجلسات القادمة، ونسعد بملاحظاتكم عمّا {يفعله|تفعله} {طفلكم|طفلتكم} في المنزل."
          : "Not seeing a skill in this session does not necessarily mean it is missing; many children need time to get used to a new place and new people before they show what they know. We will check these skills in the coming sessions, and we would love to hear what you notice at home."));
      }

      const recs = RECS.filter((o) => (d.recs || []).includes(o.v)).map((o) => {
        if (o.v !== "therapy") return T(o);
        const f = FREQ_TXT[d.freq] || FREQ_TXT["2"];
        return ar ? `البدء بجلسات علاج النطق واللغة بمعدل ${f.ar} أسبوعياً` : `Starting speech and language therapy, ${f.en} per week`;
      });
      const extra = lines(d.recs_extra).map(G);
      if (recs.length || extra.length) {
        out.push("", "## " + (ar ? "التوصيات الأولية والخطوات القادمة" : "Initial recommendations and next steps"));
        recs.forEach((r) => out.push("- " + r + "."));
        if (extra.length) out.push(...extra);
      }

      out.push("", G(ar
        ? "دوركم أساسي في رحلة {طفلكم|طفلتكم}، وتعاونكم معنا في المنزل يصنع فرقاً حقيقياً. نسعد بالإجابة عن أي استفسار في أي وقت."
        : "Your role is central to {his|her} journey, and working together at home makes a real difference. We are happy to answer any question at any time."));
      out.push("", ar ? "**أخصائي/ة النطق واللغة**" : "**Speech and Language Pathologist**", ctx.therapistName || "", "[[SIG]]");
      return out.join("\n");
    },
  };
  window.Forms.scanning = form;
})();

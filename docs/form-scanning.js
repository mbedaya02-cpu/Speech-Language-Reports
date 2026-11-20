// =====================================================================
//  "تقرير الملاحظة الأولية" — Initial Scanning (first-session impression), for every age group:
//  infants, preschool, school age, adolescents, adults and older adults (each with its own skills).
//
//  Each skill is rated: shown / emerging / not shown / not rated (default).
//  "Not rated" never appears in the report. Single-choice questions turn into ready,
//  gentle sentences. Wording avoids diagnostic terms and alarming words on purpose.
// =====================================================================
(function () {
  const { L, O, gx, lines, d10 } = window.FC;

  const R4 = [O("shown", "ظهرت", "Shown"), O("emerging", "بدأت تظهر", "Emerging"), O("not", "لم تظهر", "Not shown"), O("na", "لم تُقيَّم", "Not rated")];
  const NA = O("na", "لم تُقيَّم", "Not rated");
  // Articulation and speech: typical / atypical (+ a note box that opens for atypical) / not rated
  const OK3 = [O("ok", "سليم", "Typical"), O("bad", "غير سليم", "Atypical"), O("na", "لم تُقيَّم", "Not rated")];

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

  // ---- single-choice questions used by the other age groups
  Object.assign(Q, {
    attn2: { label: L("الانتباه والتركيز خلال الجلسة", "Attention and focus during the session"), options: [
      O("good", "جيد", "Good", { s: L("{حافظ|حافظت} على انتباه جيد خلال معظم الجلسة.", "{He|She} kept good attention through most of the session.") }),
      O("vary", "متذبذب", "Variable", { s: L("كان {انتباهه|انتباهها} متذبذباً، و{احتاج|احتاجت} أحياناً إلى إعادة توجيه.", "{His|Her} attention varied, and {he|she} sometimes needed redirection.") }),
      O("short", "قصير", "Short", { s: L("كان {انتباهه|انتباهها} قصيراً خلال الجلسة، وسنتعرّف أكثر على ذلك في الجلسات القادمة.", "{His|Her} attention was short during the session; we will learn more about this in the coming sessions.") }),
      NA] },
    feedmode: { label: L("طريقة التغذية الحالية", "Current feeding method"), options: [
      O("breast", "رضاعة طبيعية / زجاجة", "Breast / bottle", { s: L("{يعتمد|تعتمد} حالياً على الرضاعة (الطبيعية أو بالزجاجة).", "{He|She} currently feeds mainly by breast or bottle.") }),
      O("mixed", "رضاعة + أطعمة مهروسة", "Milk + purées", { s: L("{يتناول|تتناول} الحليب مع أطعمة مهروسة أو طرية.", "{He|She} takes milk along with puréed or soft foods.") }),
      O("family", "طعام العائلة المقطّع", "Chopped family food", { s: L("{يتناول|تتناول} طعام العائلة المقطّع.", "{He|She} eats chopped family food.") }),
      NA] },
  });

  // ---- skills of the other age groups (preschool keeps the original lists above)
  const SK2 = {
    infant_interact: [
      O("calm", "الهدوء وتقبّل التهدئة عند الانزعاج", "Settling and accepting comfort when upset"),
      O("smile", "الابتسامة الاجتماعية والاهتمام بالوجوه", "Social smiling and interest in faces"),
      O("adapt", "تقبّل المكان الجديد والتعامل مع الأخصائي", "Accepting the new place and handling by the therapist"),
      O("toys", "الاهتمام بالألعاب واستكشافها", "Interest in and exploration of toys"),
    ],
    infant_pre: [
      O("eye", "التواصل البصري", "Eye contact"),
      O("sound", "الالتفات نحو الأصوات", "Turning toward sounds"),
      O("name", "الاستجابة عند المناداة بالاسم", "Responding to name"),
      O("joint", "الانتباه المشترك", "Joint attention"),
      O("point", "الإشارة بالإصبع", "Pointing"),
      O("gest", "الإيماءات (التلويح، مدّ اليدين)", "Gestures (waving, reaching)"),
      O("imitm", "تقليد الحركات", "Imitating actions"),
      O("imits", "تقليد الأصوات", "Imitating sounds"),
      O("turn", "تبادل الأدوار الصوتي واللعب التبادلي", "Vocal turn-taking and back-and-forth play"),
      O("cause", "لعب السبب والنتيجة", "Cause-and-effect play"),
    ],
    infant_receptive: [
      O("tone", "الاستجابة لنبرة الصوت", "Responding to tone of voice"),
      O("no", "فهم «لا»", "Understanding \"no\""),
      O("fam", "فهم كلمات مألوفة (ماما، بابا، باي)", "Understanding familiar words (mama, dada, bye)"),
      O("obj", "التعرّف على أشياء مألوفة عند تسميتها", "Identifying familiar objects when named"),
      O("cmdg", "تنفيذ طلب بسيط مع الإشارة", "Following a simple request with a gesture"),
    ],
    infant_expressive: [
      O("coo", "الهديل وإصدار الأصوات", "Cooing and vocalizing"),
      O("babble", "المناغاة المتكررة (با-با، ما-ما)", "Repetitive babbling (ba-ba, ma-ma)"),
      O("jargon", "مناغاة متنوعة تشبه الكلام", "Varied, speech-like babbling"),
      O("words", "الكلمات الأولى ذات المعنى", "First meaningful words"),
      O("request", "الطلب بالأصوات أو الإشارة", "Requesting with sounds or gestures"),
    ],
    infant_oral: [
      O("suck", "المص والرضاعة", "Sucking and feeding from breast or bottle"),
      O("lips", "إغلاق الشفاه وحركتها", "Lip closure and movement"),
      O("tongue", "حركة اللسان", "Tongue movement"),
      O("chew", "التعامل مع القوامات المناسبة للعمر (المهروس / الطري)", "Managing age-appropriate textures (purée / soft)"),
      O("swallow", "البلع دون سعال أو اختناق", "Swallowing without coughing or choking"),
      O("cry", "جودة الصوت والبكاء", "Voice and cry quality"),
    ],

    school_interact: [
      O("adapt", "التكيّف مع الأخصائي والمكان", "Adapting to the therapist and the room"),
      O("task", "الجلوس وإتمام المهام", "Sitting and completing tasks"),
      O("rules", "اتباع تعليمات الجلسة وقواعدها", "Following session instructions and rules"),
      O("init", "المبادرة بالحديث والتفاعل", "Initiating talk and interaction"),
      O("frustr", "تقبّل المهام الصعبة دون إحباط واضح", "Coping with harder tasks without marked frustration"),
    ],
    school_receptive: [
      O("multi", "تنفيذ تعليمات متعددة الخطوات", "Following multi-step directions"),
      O("why", "فهم الأسئلة (لماذا؟ كيف؟)", "Understanding why / how questions"),
      O("concepts", "فهم المفاهيم الزمنية والمكانية (قبل/بعد، بين)", "Understanding time and space concepts (before/after, between)"),
      O("story", "فهم قصة أو فقرة مسموعة", "Understanding a story or paragraph heard"),
      O("vocab", "فهم المفردات المدرسية", "Understanding school vocabulary"),
    ],
    school_expressive: [
      O("sent", "بناء جمل كاملة", "Building complete sentences"),
      O("gram", "استخدام القواعد بشكل مناسب (الضمائر، الأزمنة، الجمع)", "Using grammar appropriately (pronouns, tenses, plurals)"),
      O("narr", "سرد قصة أو حدث بتسلسل واضح", "Telling a story or event in a clear sequence"),
      O("describe", "الوصف والشرح", "Describing and explaining"),
      O("wf", "إيجاد الكلمة المناسبة بسهولة", "Finding the right word easily"),
    ],
    school_social: [
      O("conv", "بدء المحادثة والاستمرار فيها", "Starting and keeping up a conversation"),
      O("topic", "الالتزام بموضوع الحديث", "Staying on topic"),
      O("turns", "تبادل الأدوار في الحديث", "Taking turns in conversation"),
      O("nonverb", "فهم تعابير الوجه ولغة الجسد", "Reading facial expressions and body language"),
      O("clarify", "طلب المساعدة أو التوضيح", "Asking for help or clarification"),
    ],
    school_literacy: [
      O("syll", "تقطيع الكلمات إلى مقاطع", "Splitting words into syllables"),
      O("rhyme", "تمييز الكلمات المتشابهة في الإيقاع (السجع)", "Recognizing rhyming words"),
      O("letters", "ربط الحرف بصوته", "Matching letters to their sounds"),
      O("read", "قراءة كلمات بسيطة", "Reading simple words"),
      O("write", "كتابة كلمات بسيطة", "Writing simple words"),
    ],
    school_speech: [
      O("artic", "نطق الأصوات", "Speech sound production"),
      O("oral", "حركات الشفاه واللسان", "Lip and tongue movements"),
      O("fluency", "طلاقة الكلام", "Speech fluency"),
      O("voice", "جودة الصوت", "Voice quality"),
    ],

    teen_interact: [
      O("coop", "التعاون مع الأخصائي", "Cooperation with the therapist"),
      O("aware", "الوعي بالصعوبة والرغبة في تحسينها", "Awareness of the difficulty and motivation to work on it"),
      O("confid", "الثقة بالنفس أثناء الحديث", "Confidence while speaking"),
      O("task", "إتمام المهام المطلوبة", "Completing the tasks given"),
    ],
    teen_receptive: [
      O("complex", "فهم التعليمات والجمل المعقّدة", "Understanding complex instructions and sentences"),
      O("infer", "الاستنتاج وفهم المعاني الضمنية", "Inferencing and understanding implied meanings"),
      O("figur", "فهم التعابير المجازية والأمثال", "Understanding figurative language and proverbs"),
      O("text", "فهم نص مسموع أو مقروء بمستوى دراسي", "Understanding grade-level spoken or written text"),
    ],
    teen_expressive: [
      O("complex", "استخدام جمل مركّبة", "Using complex sentences"),
      O("summ", "التلخيص وإعادة الصياغة", "Summarizing and rephrasing"),
      O("opinion", "التعبير عن الرأي وتبريره", "Expressing and justifying an opinion"),
      O("organize", "تنظيم الأفكار أثناء الحديث", "Organizing ideas while speaking"),
      O("wf", "إيجاد الكلمة المناسبة بسهولة", "Finding the right word easily"),
    ],
    teen_social: [
      O("conv", "إدارة المحادثة (البدء، الاستمرار، الإنهاء)", "Managing a conversation (start, maintain, close)"),
      O("persp", "مراعاة وجهة نظر المستمع", "Taking the listener's perspective"),
      O("adapt", "تكييف اللغة حسب الموقف والشخص", "Adapting language to the situation and the listener"),
      O("humor", "فهم الدعابة والتلميح", "Understanding humor and hints"),
      O("nonverb", "فهم لغة الجسد ونبرة الصوت", "Reading body language and tone of voice"),
    ],
    teen_speech: [
      O("artic", "نطق الأصوات", "Speech sound production"),
      O("fluency", "طلاقة الكلام", "Speech fluency"),
      O("rate", "سرعة الكلام وإيقاعه", "Speech rate and rhythm"),
      O("voice", "جودة الصوت", "Voice quality"),
    ],

    adult_cog: [
      O("orient", "الانتباه والتوجّه (الزمان، المكان، الأشخاص)", "Attention and orientation (time, place, person)"),
      O("aware", "الوعي بالصعوبات", "Awareness of difficulties"),
      O("memory", "تذكّر المعلومات الحديثة", "Remembering recent information"),
      O("problem", "حل المشكلات اليومية البسيطة", "Solving simple everyday problems"),
      O("organize", "تنظيم الأفكار وتسلسلها", "Organizing and sequencing ideas"),
    ],
    adult_comp: [
      O("conv", "فهم المحادثة اليومية", "Understanding everyday conversation"),
      O("yesno", "الإجابة بنعم/لا بشكل موثوق", "Answering yes/no reliably"),
      O("complex", "فهم التعليمات المعقّدة", "Understanding complex instructions"),
      O("read", "فهم المقروء", "Reading comprehension"),
    ],
    adult_expr: [
      O("naming", "التسمية وإيجاد الكلمات", "Naming and word finding"),
      O("sent", "تكوين الجمل", "Forming sentences"),
      O("conv", "الكلام في المحادثة", "Conversational speech"),
      O("repeat", "الإعادة (التكرار)", "Repetition"),
      O("write", "الكتابة", "Writing"),
    ],
    adult_speech: [
      O("artic", "وضوح النطق", "Articulation clarity"),
      O("motor", "تنسيق حركات الكلام", "Coordination of speech movements"),
      O("oral", "قوة وحركة الشفاه واللسان والوجه", "Strength and movement of lips, tongue and face"),
      O("fluency", "طلاقة الكلام", "Speech fluency"),
      O("voice", "جودة الصوت", "Voice quality"),
      O("loud", "علو الصوت", "Voice loudness"),
      O("reson", "الرنين (الخنّة)", "Resonance (nasality)"),
    ],
    adult_swallow: [
      O("lips", "إغلاق الشفاه أثناء الأكل والشرب", "Lip closure while eating and drinking"),
      O("chew", "المضغ", "Chewing"),
      O("liquid", "بلع السوائل", "Swallowing liquids"),
      O("solid", "بلع الأطعمة الصلبة", "Swallowing solid foods"),
      O("signs", "عدم وجود سعال أو تغيّر في الصوت بعد البلع", "No coughing or voice change after swallowing"),
    ],
  };
  // older adults: the adult lists, plus hearing during conversation
  ["cog", "comp", "expr", "speech", "swallow"].forEach((k) => { SK2["older_" + k] = SK2["adult_" + k].slice(); });
  SK2.older_cog.push(O("hear", "السمع أثناء المحادثة", "Hearing during conversation"));

  // Rating scale for school-age, teens and adults: adequate / mild difficulty / clear difficulty
  const RA = [O("shown", "مناسب", "Adequate"), O("emerging", "صعوبة بسيطة", "Mild difficulty"), O("not", "صعوبة واضحة", "Clear difficulty"), NA];

  // ---- age groups: each has its own sections. Preschool keeps the original field ids (older saved reports open as preschool).
  const GROUPS = [
    { v: "infant", ar: "رضّع ودارجون (0 – سنتين)", en: "Infants and toddlers (0–2 years)", scale: "dev", aud: "young", parts: [
      { id: "interact", title: L("التفاعل والتنظيم", "Interaction and regulation"), singles: [] },
      { id: "pre", title: L("التواصل المبكر وما قبل اللغة", "Early communication and pre-linguistic skills"), singles: [] },
      { id: "receptive", title: L("الفهم المبكر", "Early understanding"), singles: [] },
      { id: "expressive", title: L("الأصوات والتعبير المبكر", "Sounds and early expression"), singles: ["mode"] },
      { id: "oral", title: L("المهارات الفموية والتغذية", "Oral skills and feeding"), singles: ["feedmode", "drool"], okBad: true },
    ] },
    { v: "preschool", ar: "ما قبل المدرسة (2 – 5 سنوات)", en: "Preschool (2–5 years)", scale: "dev", aud: "young", parts: [
      { id: "interact", title: L("التفاعل والسلوك العام", "Interaction and general behavior"), singles: ["attention"] },
      { id: "pre", title: L("مهارات ما قبل اللغة", "Pre-linguistic skills"), singles: [] },
      { id: "receptive", title: L("اللغة الاستقبالية (الفهم)", "Receptive language (understanding)"), singles: [] },
      { id: "expressive", title: L("اللغة التعبيرية", "Expressive language"), singles: ["mode", "vocab"] },
      { id: "speech", title: L("النطق والكلام", "Articulation and speech"), singles: ["intell", "drool"], okBad: true },
    ] },
    { v: "school", ar: "سن المدرسة (6 – 12 سنة)", en: "School age (6–12 years)", scale: "ab", aud: "school", parts: [
      { id: "interact", title: L("التفاعل والسلوك والانتباه", "Interaction, behavior and attention"), singles: ["attn2"] },
      { id: "receptive", title: L("الفهم (اللغة الاستقبالية)", "Understanding (receptive language)"), singles: [] },
      { id: "expressive", title: L("اللغة التعبيرية والسرد", "Expressive language and narration"), singles: [] },
      { id: "social", title: L("التواصل الاجتماعي", "Social communication"), singles: [] },
      { id: "literacy", title: L("الوعي الصوتي ومهارات القراءة والكتابة الأولية", "Phonological awareness and early literacy"), singles: [] },
      { id: "speech", title: L("النطق والطلاقة والصوت", "Articulation, fluency and voice"), singles: ["intell"], okBad: true },
    ] },
    { v: "teen", ar: "مراهقون (13 – 17 سنة)", en: "Adolescents (13–17 years)", scale: "ab", aud: "school", parts: [
      { id: "interact", title: L("التفاعل والدافعية", "Engagement and motivation"), singles: ["attn2"] },
      { id: "receptive", title: L("الفهم واللغة المتقدمة", "Understanding and higher-level language"), singles: [] },
      { id: "expressive", title: L("التعبير وتنظيم الأفكار", "Expression and organizing ideas"), singles: [] },
      { id: "social", title: L("التواصل الاجتماعي واستخدام اللغة", "Social communication and language use"), singles: [] },
      { id: "speech", title: L("النطق والطلاقة والصوت", "Articulation, fluency and voice"), singles: ["intell"], okBad: true },
    ] },
    { v: "adult", ar: "بالغون (18 – 64 سنة)", en: "Adults (18–64 years)", scale: "ab", aud: "adult", parts: [
      { id: "cog", title: L("الانتباه والتواصل المعرفي", "Attention and cognitive-communication"), singles: [] },
      { id: "comp", title: L("الفهم", "Comprehension"), singles: [] },
      { id: "expr", title: L("التعبير اللغوي", "Verbal expression"), singles: [] },
      { id: "speech", title: L("النطق والصوت والطلاقة", "Speech, voice and fluency"), singles: ["intell"], okBad: true },
      { id: "swallow", title: L("البلع", "Swallowing"), singles: [], okBad: true },
    ] },
    { v: "older", ar: "كبار السن (65 سنة فأكثر)", en: "Older adults (65+ years)", scale: "ab", aud: "adult", parts: [
      { id: "cog", title: L("الانتباه والتواصل المعرفي والسمع", "Attention, cognitive-communication and hearing"), singles: [] },
      { id: "comp", title: L("الفهم", "Comprehension"), singles: [] },
      { id: "expr", title: L("التعبير اللغوي", "Verbal expression"), singles: [] },
      { id: "speech", title: L("النطق والصوت والطلاقة", "Speech, voice and fluency"), singles: ["intell"], okBad: true },
      { id: "swallow", title: L("البلع", "Swallowing"), singles: [], okBad: true },
    ] },
  ];
  const AGE_OPTS = GROUPS.map((g) => O(g.v, g.ar, g.en));
  const groupOf = (v) => GROUPS.find((g) => g.v === v);
  // saved reports from before the age groups existed have no age_group: they are preschool
  const grpOf = (d) => (d.age_group === undefined ? "preschool" : d.age_group);
  const groupForMonths = (m) => (m == null ? "" : m < 24 ? "infant" : m < 72 ? "preschool" : m < 156 ? "school" : m < 216 ? "teen" : m < 780 ? "adult" : "older");
  // field ids: preschool keeps "interact", "attention"…; other groups are prefixed ("school_interact", "school_attn2"…)
  const fid = (g, id) => (g === "preschool" ? id : g + "_" + id);
  const rowsOf = (g, id) => (g === "preschool" ? SK[id] : SK2[g + "_" + id]);

  const matrixField = (g, p) => {
    const rows = rowsOf(g.v, p.id);
    return p.okBad
      ? { id: fid(g.v, p.id), type: "matrix", tone: true, label: L("قيّم كل جانب: سليم أو غير سليم، ولو غير سليم اكتب ملاحظتك (لم تُقيَّم = لا يظهر في التقرير)", "Rate each area: typical or atypical; for atypical, write your note (not rated = left out of the report)"),
          rows, groups: [{ key: "s", options: OK3 }], noteWhen: "bad", notePlaceholder: L("اكتب ما لاحظته…", "Describe what you observed…") }
      : { id: fid(g.v, p.id), type: "matrix", tone: true, label: g.scale === "dev" ? L("قيّم كل مهارة (لم تُقيَّم = لا تظهر في التقرير)", "Rate each skill (not rated = left out of the report)")
          : L("قيّم كل جانب: مناسب، صعوبة بسيطة، أو صعوبة واضحة (لم تُقيَّم = لا يظهر في التقرير)", "Rate each area: adequate, mild difficulty or clear difficulty (not rated = left out of the report)"),
          rows, groups: [{ key: "s", options: g.scale === "dev" ? R4 : RA }] };
  };
  const singleField = (g, k) => ({ id: fid(g.v, k), type: "single", label: Q[k].label, options: Q[k].options });
  const noteField = (g, p) => ({ id: fid(g.v, p.id) + "_note", type: "textarea", label: L("ملاحظة الأخصائي لهذا القسم (اختياري — تظهر كما هي)", "Therapist note for this section (optional, shown as written)") });

  const ATTEND = [O("mother", "الأم", "Mother"), O("father", "الأب", "Father"), O("parents", "الوالدان", "Both parents"), O("spouse", "الزوج / الزوجة", "Spouse"),
    O("son", "الابن / الابنة", "Son / daughter"), O("companion", "مرافق", "Companion"), O("alone", "بدون مرافق", "None (attended alone)")];
  const FREQ = [O("1", "جلسة", "1 session"), O("2", "جلستان", "2 sessions"), O("3", "ثلاث", "3 sessions")];
  const FREQ_TXT = { "1": L("جلسة واحدة", "one session"), "2": L("جلستين", "two sessions"), "3": L("ثلاث جلسات", "three sessions") };
  const R_COMP = O("comp", "إجراء تقييم لغوي شامل بمقياس معياري خلال الجلسات القادمة", "A comprehensive language assessment with a standardized tool in the coming sessions");
  const R_THER = O("therapy", "البدء بجلسات علاج النطق واللغة (حدّد العدد أسبوعياً)", "Starting speech and language therapy sessions (choose how many per week)");
  const R_OBS = O("obs", "جلسات ملاحظة إضافية لاستكمال الصورة", "Additional observation sessions to complete the picture");
  const R_HEAR = O("hearing", "إجراء فحص سمع للاطمئنان", "A hearing test for reassurance");
  const R_OT = O("ot", "استشارة أخصائي العلاج الوظيفي", "A consultation with an occupational therapist");
  // recommendations by audience: young children (original list, field "recs"), school-age / teens, adults
  const RECS = [
    R_COMP, R_THER, R_OBS,
    O("home", "تطبيق برنامج منزلي بسيط بالتعاون مع الأخصائي", "A simple home program in partnership with the therapist"),
    O("guide", "جلسة إرشاد للأهل حول طرق تحفيز الكلام في المنزل", "A parent guidance session on ways to encourage talking at home"),
    O("screen", "تقليل وقت الشاشات واستبداله باللعب التفاعلي", "Less screen time, replaced with interactive play"),
    R_HEAR, R_OT,
    O("dev", "تقييم نمائي/نفسي شامل للاطمئنان", "A comprehensive developmental/psychological assessment for reassurance"),
    O("oral", "تقييم المهارات الفموية والتغذية", "An assessment of oral and feeding skills"),
    O("ped", "مراجعة طبيب الأطفال لمتابعة النمو العام", "A visit to the pediatrician to follow general development"),
  ];
  const RECS_SC = [
    R_COMP, R_THER, R_OBS,
    O("home", "تمارين منزلية قصيرة بالتعاون مع الأهل", "Short home practice in partnership with the parents"),
    O("school", "التواصل مع المدرسة لتنسيق الدعم داخل الصف", "Contact with the school to coordinate classroom support"),
    O("literacy", "تقييم مهارات القراءة والكتابة (صعوبات التعلم)", "An assessment of reading and writing skills (learning difficulties)"),
    O("screen", "تنظيم وقت الشاشات واستبداله بأنشطة تفاعلية وقراءة مشتركة", "Managing screen time, replacing it with interactive activities and shared reading"),
    R_HEAR, R_OT,
    O("psych", "تقييم نفسي / تربوي للاطمئنان", "A psychological / educational assessment for reassurance"),
    O("ent", "مراجعة طبيب الأنف والأذن والحنجرة لتقييم الصوت", "An ENT visit to assess the voice"),
  ];
  const RECS_AD = [
    O("comp", "إجراء تقييم شامل للتواصل بأدوات معيارية مناسبة", "A comprehensive communication assessment with suitable standardized tools"),
    R_THER,
    O("home", "برنامج تمارين منزلية", "A home exercise program"),
    O("family", "إرشاد الأسرة حول طرق التواصل الداعمة", "Family guidance on supportive communication strategies"),
    O("swallow", "تقييم أداتي للبلع (VFSS أو FEES) عند الحاجة", "An instrumental swallowing assessment (VFSS or FEES) if needed"),
    O("diet", "تعديل قوام الطعام والسوائل مؤقتاً حسب توصية الأخصائي", "Temporary changes to food and drink textures as advised by the therapist"),
    R_HEAR,
    O("ent", "مراجعة طبيب الأنف والأذن والحنجرة", "An ENT visit"),
    O("neuro", "مراجعة طبيب الأعصاب", "A neurology visit"),
    O("cog", "تقييم معرفي / نفسي عصبي", "A cognitive / neuropsychological assessment"),
    R_OT,
  ];
  const RECS_BY = { young: ["recs", RECS], school: ["recs_sc", RECS_SC], adult: ["recs_ad", RECS_AD] };
  const audOf = (d) => (groupOf(grpOf(d)) || {}).aud;
  const recsField = (aud) => { const [id, opts] = RECS_BY[aud]; return { id, type: "multi", label: L("اختر التوصيات المناسبة", "Choose the recommendations that fit"), options: opts, show: (d) => audOf(d) === aud }; };

  const AR_MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const longDate = (iso, ar) => { iso = d10(iso); if (!iso) return ""; const [y, m, d] = iso.split("-").map(Number); return ar ? `${d} ${AR_MONTHS[m - 1]} ${y}` : `${d} ${EN_MONTHS[m - 1]} ${y}`; };

  // age rounded the way people say it: "3 سنوات ونصف تقريباً", "18 شهراً تقريباً" (adults: whole years)
  function approxAge(dob, at, ar) {
    const p = window.FC.ageParts(dob, at); if (!p) return "";
    if (p.total < 24) return ar ? `${p.total} ${p.total === 1 ? "شهر" : p.total === 2 ? "شهران" : p.total <= 10 ? "أشهر" : "شهراً"} تقريباً` : `about ${p.total} months`;
    let y = p.y, half = false;
    if (y < 18) { if (p.m >= 9) y++; else if (p.m >= 3) half = true; }
    if (!ar) return `about ${y}${half ? "½" : ""} years`;
    const yw = y === 1 ? "سنة" : y === 2 ? "سنتان" : y <= 10 ? `${y} سنوات` : `${y} سنة`;
    return `${yw}${half ? " ونصف" : ""} تقريباً`;
  }

  // the report's wording for each audience
  const TXT = {
    young: {
      intro: L("الأهل الكرام، نشكركم على ثقتكم وعلى حضوركم مع {طفلكم|طفلتكم} {N}. يقدّم هذا التقرير انطباعاً أولياً عمّا لاحظناه خلال الجلسة الأولى، وهو ليس تقييماً نهائياً ولا تشخيصاً. ومن الطبيعي أن {يُظهر|تُظهر} {الطفل|الطفلة} جزءاً من {مهاراته|مهاراتها} فقط في اللقاء الأول، لأن المكان والأشخاص جديدون {عليه|عليها}.",
        "Dear parents, thank you for your trust and for coming with {N}. This report shares our first impressions from the first session; it is not a final assessment or a diagnosis. It is natural for a child to show only part of {his|her} skills at a first meeting, because the place and the people are new to {him|her}."),
      close: L("دوركم أساسي في رحلة {طفلكم|طفلتكم}، وتعاونكم معنا في المنزل يصنع فرقاً حقيقياً. نسعد بالإجابة عن أي استفسار في أي وقت.",
        "Your role is central to {his|her} journey, and working together at home makes a real difference. We are happy to answer any question at any time."),
    },
    school: {
      intro: L("الأهل الكرام، نشكركم على ثقتكم وعلى حضوركم مع {ابنكم|ابنتكم} {N}. يقدّم هذا التقرير انطباعاً أولياً عمّا لاحظناه خلال الجلسة الأولى، وهو ليس تقييماً نهائياً ولا تشخيصاً، وتكتمل الصورة بالتقييم الشامل وبملاحظاتكم وملاحظات المدرسة.",
        "Dear parents, thank you for your trust and for coming with {N}. This report shares our first impressions from the first session; it is not a final assessment or a diagnosis. The full picture comes with the comprehensive assessment and with your observations and the school's."),
      close: L("تعاونكم معنا في المنزل، والتنسيق مع المدرسة، يصنعان فرقاً حقيقياً في تقدّم {ابنكم|ابنتكم}. نسعد بالإجابة عن أي استفسار في أي وقت.",
        "Working together at home, and coordinating with the school, makes a real difference to {his|her} progress. We are happy to answer any question at any time."),
    },
    adult: {
      intro: L("{السيد|السيدة} {N}، نشكرك على ثقتك وحضورك. يقدّم هذا التقرير انطباعاً أولياً عمّا لاحظناه خلال الجلسة الأولى، وهو ليس تقييماً نهائياً ولا تشخيصاً، وتكتمل الصورة بالتقييم الشامل وبالمعلومات الطبية المتوفرة.",
        "Dear {N}, thank you for your trust and for coming in. This report shares our first impressions from the first session; it is not a final assessment or a diagnosis. The full picture comes with the comprehensive assessment and the available medical information."),
      close: L("مشاركتك ومشاركة أسرتك أساسية في خطة العلاج، والتمارين اليومية تصنع فرقاً حقيقياً. نسعد بالإجابة عن أي استفسار في أي وقت.",
        "Your involvement, and your family's, is central to the therapy plan, and daily practice makes a real difference. We are happy to answer any question at any time."),
    },
  };

  const form = {
    kind: "scanning",
    noNextDue: true,
    dateLabel: L("تاريخ الجلسة", "Session date"),
    sections: [
      { id: "session", title: L("بيانات الجلسة", "Session details"), fields: [
        { id: "age_group", type: "single", label: L("الفئة العمرية (تُختار تلقائياً من تاريخ الميلاد — غيّرها إذا لزم)", "Age group (picked from the date of birth; change it if needed)"), options: AGE_OPTS },
        { id: "attendees", type: "single", label: L("الحضور / المرافق", "Attending / companion"), options: ATTEND },
        { id: "age_approx", type: "text", label: L("العمر التقريبي (يُحسب تلقائياً من تاريخ الميلاد — اكتبه هنا فقط إذا تاريخ الميلاد غير معروف)", "Approximate age (calculated from the date of birth; type it only if the date of birth is unknown)") },
        { id: "reason", type: "textarea", label: L("سبب الزيارة كما ذُكر في الجلسة", "Reason for the visit, as described in the session") },
      ] },
      ...GROUPS.flatMap((g) => g.parts.map((p) => ({ id: "p_" + fid(g.v, p.id), title: p.title, show: (d) => grpOf(d) === g.v,
        fields: [matrixField(g, p), ...p.singles.map((k) => singleField(g, k)), noteField(g, p)] }))),
      { id: "recs", title: L("التوصيات الأولية", "Initial recommendations"), show: (d) => !!groupOf(grpOf(d)), fields: [
        recsField("young"), recsField("school"), recsField("adult"),
        { id: "freq", type: "single", label: L("عدد جلسات العلاج أسبوعياً", "Therapy sessions per week"), options: FREQ, show: (d) => { const f = RECS_BY[audOf(d)]; return !!f && (d[f[0]] || []).includes("therapy"); } },
        { id: "recs_extra", type: "textarea", label: L("توصيات أو ملاحظات إضافية (اختياري)", "Additional recommendations or notes (optional)") },
      ] },
    ],

    defaults(pc) {
      const d = { age_group: groupForMonths(pc && pc.months), recs: [], recs_sc: [], recs_ad: [], freq: "2" };
      GROUPS.forEach((g) => g.parts.forEach((p) => {
        const k = fid(g.v, p.id); d[k] = {}; rowsOf(g.v, p.id).forEach((r) => { d[k][r.v] = { s: "na" }; });
        p.singles.forEach((s) => { d[fid(g.v, s)] = "na"; });
      }));
      return d;
    },

    generate(d, ctx) {
      const lang = ctx.lang, ar = lang === "ar", pc = ctx.pc, G = (s) => gx(s, pc), T = (o) => G(o[lang] || o.ar);
      const g = groupOf(grpOf(d));
      if (!g) return ar ? "اختر الفئة العمرية أولاً (قسم «بيانات الجلسة»)، ثم أنشئ التقرير." : "Choose the age group first (Session details), then create the report.";
      const aud = g.aud, tx = TXT[aud];
      const approx = approxAge(ctx.patient.dob, ctx.reportDate, ar) || String(d.age_approx || "").trim();
      const att = ATTEND.find((o) => o.v === d.attendees);
      const out = ["# " + (ar ? "تقرير الملاحظة الأولية" : "Initial Scanning Report")];
      if (ctx.centerFull) out.push("^^ " + ctx.centerFull);
      out.push("^^ " + (ar ? "قسم النطق واللغة" : "Speech and Language Department"), "", "::info4");
      const dob = ctx.patient.dob ? window.FC.dmy(ctx.patient.dob) : "—";
      if (ar) out.push(`الاسم: ${pc.full}`, `رقم الملف: ${ctx.patient.file_no || ""}`, `تاريخ الميلاد: ${dob}`, `العمر التقريبي: ${approx}`,
        `تاريخ الجلسة: ${longDate(ctx.reportDate, true)}`, `الأخصائي/ة: ${ctx.therapistName || ""}`, `الفئة العمرية: ${g.ar}`, `${aud === "young" ? `الحضور مع ${pc.female ? "الطفلة" : "الطفل"}` : "المرافق"}: ${att ? att.ar : ""}`);
      else out.push(`Name: ${pc.full}`, `File no.: ${ctx.patient.file_no || ""}`, `Date of birth: ${dob}`, `Approximate age: ${approx}`,
        `Session date: ${longDate(ctx.reportDate, false)}`, `Therapist: ${ctx.therapistName || ""}`, `Age group: ${g.en}`, `${aud === "young" ? "Attending with the child" : "Companion"}: ${att ? att.en : ""}`);

      out.push("", "::box", T(tx.intro));

      const reason = String(d.reason || "").trim();
      if (reason) out.push("", "## " + (ar ? "سبب الزيارة" : "Reason for the visit"), ...lines(reason));

      const dev = g.scale === "dev";
      const H = dev
        ? { g: L("مهارات لاحظناها بوضوح:", "Skills we clearly observed:"), a: L("مهارات بدأت بالظهور ونعمل على تعزيزها:", "Skills that are starting to appear, which we will build on:"),
            b: L("مهارات لم تظهر خلال هذه الجلسة، وسنتابع ملاحظتها لاحقاً:", "Skills we did not see in this session, which we will keep observing:") }
        : { g: L("جوانب بدت مناسبة:", "Areas that appeared adequate:"), a: L("جوانب فيها صعوبة بسيطة:", "Areas with mild difficulty:"),
            b: L("جوانب فيها صعوبة واضحة، وسنتعمّق في تقييمها:", "Areas with clear difficulty, which we will assess in more depth:") };
      let anyNot = false, anyDiff = false, n = 0;
      g.parts.forEach((p) => {
        const key = fid(g.v, p.id), rows = rowsOf(g.v, p.id), m = d[key] || {};
        const by = (s) => rows.filter((r) => (m[r.v] || {}).s === s).map(T);
        let shown = by("shown"), emerging = by("emerging"), not = by("not"), follow = [];
        if (p.okBad) {
          // typical areas -> green list; atypical areas -> "we will follow" list with the therapist's note
          shown = shown.concat(by("ok"));
          follow = rows.filter((r) => ["bad", "emerging", "not"].includes((m[r.v] || {}).s)).map((r) => {
            const nt = G(String((m[r.v] || {}).note || "").trim().replace(/[.،]\s*$/, ""));
            return T(r) + (nt ? ": " + nt : "");
          });
          emerging = []; not = [];
        }
        const sent = p.singles.map((k) => { const o = Q[k].options.find((x) => x.v === d[fid(g.v, k)]); return o && o.s ? T(o.s) : ""; }).filter(Boolean);
        const note = String(d[key + "_note"] || "").trim();
        if (!shown.length && !emerging.length && !not.length && !follow.length && !sent.length && !note) return;
        n++;
        out.push("", `## ${n}. ${p.title[lang]}`);
        if (sent.length) out.push(sent.join(" "));
        const list = (tone, head, items) => { if (items.length) out.push(`### {${tone}} ${head}`, ...items.map((x) => "- " + x)); };
        list("g", p.okBad ? (ar ? "جوانب بدت سليمة:" : "Areas that appeared typical:") : H.g[lang], shown);
        list("b", ar ? "جوانب نحتاج لمتابعتها في الجلسات القادمة:" : "Areas we will follow in the coming sessions:", follow);
        list("a", H.a[lang], emerging);
        list("b", H.b[lang], not);
        if (not.length) anyNot = true;
        if (not.length || emerging.length || follow.length) anyDiff = true;
        if (note) out.push(...lines(note).map(G));
      });

      if (dev && anyNot) {
        out.push("", "::box", G(ar
          ? "عدم ظهور بعض المهارات خلال هذه الجلسة لا يعني بالضرورة أنها غير موجودة لدى {طفلكم|طفلتكم}؛ فكثير من الأطفال يحتاجون وقتاً ليألفوا المكان والأشخاص قبل أن يُظهروا ما يعرفونه. سنتأكد من هذه المهارات خلال الجلسات القادمة، ونسعد بملاحظاتكم عمّا {يفعله|تفعله} {طفلكم|طفلتكم} في المنزل."
          : "Not seeing a skill in this session does not necessarily mean it is missing; many children need time to get used to a new place and new people before they show what they know. We will check these skills in the coming sessions, and we would love to hear what you notice at home."));
      } else if (!dev && anyDiff) {
        out.push("", "::box", G(ar
          ? "هذه الملاحظات مبنية على جلسة واحدة، وقد يتأثر الأداء بالتعب أو القلق في اللقاء الأول. سنتحقق منها ونتعمّق فيها خلال التقييم الشامل والجلسات القادمة."
          : "These observations come from a single session, and performance can be affected by tiredness or nerves at a first meeting. We will check them and look into them more closely in the comprehensive assessment and the coming sessions."));
      }

      const [rid, ropts] = RECS_BY[aud];
      const recs = ropts.filter((o) => (d[rid] || []).includes(o.v)).map((o) => {
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

      out.push("", T(tx.close));
      out.push("", ar ? "**أخصائي/ة النطق واللغة**" : "**Speech and Language Pathologist**", ctx.therapistName || "", "[[SIG]]");
      return out.join("\n");
    },
  };

  window.Forms.scanning = form;
})();

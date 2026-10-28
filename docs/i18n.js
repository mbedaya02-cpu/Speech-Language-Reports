/* i18n.js — interface language (Arabic / English).
 * The app is written in Arabic. In English mode this file translates the interface on screen:
 * every text node, placeholder, title, toast and confirm box is looked up in the dictionary below
 * (exact match first, then the templates with {0}/{1} placeholders, then known phrases inside longer text).
 * Patient data, document text (textareas), inputs and anything inside [data-notr] are never touched.
 * Generated documents keep their own Arabic/English switch inside the editor.
 */
(function () {
  "use strict";
  let lang = "ar";
  try { lang = localStorage.getItem("ui_lang") === "en" ? "en" : "ar"; } catch (_) {}

  // ------------------------------------------------------------------ exact strings
  const D = {
    // app / roles / navigation
    "تقارير قسم النطق واللغة": "Speech and Language Reports",
    "مدير النظام": "Administrator", "أخصائي نطق": "Speech therapist", "استقبال": "Reception",
    "الرئيسية": "Home", "المرضى": "Patients", "النماذج": "Forms", "آخر المستندات": "Latest documents",
    "المستخدمون": "Users", "سجل الحركات": "Activity log", "الإعدادات": "Settings", "ملفي": "My profile",
    "كل المراكز": "All centers", "المركز": "Center", "خروج": "Log out",
    "مركز بداية للتدريب والتأهيل": "Bedaya Rehabilitation and Training Center", "مركز ألباين الطبي": "Alpine Medical Center",
    // report / plan types and statuses
    "تقرير الملاحظة الأولية": "Initial scanning report", "Initial Scanning — انطباع الجلسة الأولى للأهل": "Initial Scanning — first-session impressions for parents",
    "انطباع الجلسة الأولى للأهل: تقييم المهارات بأزرار وتقرير دافئ جاهز": "First-session impressions for parents: rate skills with buttons, get a warm ready report",
    "تاريخ الجلسة": "Session date", "الأخصائي/ة": "Therapist", "القائمة حسب المركز المختار.": "List follows the selected center.",
    "إنشاء التقرير": "Create report", "نسخ النص": "Copy text", "حفظ في ملف الطفل": "Save to child's file", "نموذج جديد": "New form",
    "تم نسخ النص ✓": "Text copied ✓", "انسخ النص يدوياً (Ctrl+C)": "Copy the text manually (Ctrl+C)",
    "يوجد مسودة غير محفوظة": "There is an unsaved draft", "استرجاع المسودة": "Restore draft", "تجاهل": "Dismiss",
    "ظهرت": "Shown", "بدأت تظهر": "Emerging", "لم تظهر": "Not shown", "لم تُقيَّم": "Not rated",
    "تقرير التقييم الأولي": "Initial assessment report", "تقرير تقييم": "Evaluation report", "تقرير إعادة تقييم": "Re-evaluation report",
    "تقرير تقييم مرحلي": "Progress report", "تقرير خروج": "Discharge report", "تقرير لجهة خارجية": "External report",
    "نموذج مختصر (ST_IA)": "Short form (ST_IA)", "التقييم الشامل بالعربي أو الإنجليزي": "Full evaluation in Arabic or English",
    "نفس نموذج التقييم الشامل": "Same as the full evaluation", "تقرير التقدم المرتبط بالخطة": "Progress report linked to the plan",
    "عند إنهاء العلاج": "When therapy ends", "مدرسة / تأمين / طبيب": "School / insurance / doctor",
    "سارية": "Active", "تم التجديد": "Renewed", "منتهية": "Expired", "ملغاة": "Cancelled",
    "نشط": "Active", "متوقف مؤقتاً": "On hold", "مُخرَّج": "Discharged", "نهائي": "Final", "مسودة": "Draft",
    "الخطة التربوية الفردية": "Individualized Education Plan (IEP)", "الخطة التربوية الفردية للنطق واللغة": "Speech and Language IEP",
    "أخرى": "Other", "خطة": "Plan", "تقرير": "Report", "مستند": "documents",
    // generic
    "حفظ": "Save", "إلغاء": "Cancel", "فتح": "Open", "حذف": "Delete", "تعديل": "Edit", "رجوع": "Back", "نعم": "Yes", "لا": "No",
    "جاري التحميل…": "Loading…", "تم الحفظ": "Saved", "تم الحفظ ✓": "Saved ✓", "تم الحذف": "Deleted", "حدث خطأ": "An error occurred",
    "ليس لديك صلاحية لهذا الإجراء.": "You don't have permission for this action.",
    "غير موجود أو لا تملك صلاحية الوصول إليه.": "Not found, or you don't have access to it.",
    "الصفحة غير موجودة.": "Page not found.", "اختيار متعدد": "multiple choice", "لا يوجد": "None", "ملاحظة": "Note", "ملاحظات": "Notes",
    "اليوم": "Today", "ذكر": "Male", "أنثى": "Female", "طفل": "Boy", "طفلة": "Girl", "عربي": "Arabic",
    "لديك تغييرات غير محفوظة. هل تريد المغادرة دون حفظ؟": "You have unsaved changes. Leave without saving?",
    "تغييرات غير محفوظة. الخروج؟": "Unsaved changes. Log out?",
    // login / connect
    "تسجيل الدخول": "Sign in", "ادخل بحسابك الخاص. لا تشارك كلمة المرور مع أحد.": "Sign in with your own account. Never share your password.",
    "اسم المستخدم": "Username", "كلمة المرور": "Password", "دخول": "Sign in", "تغيير رابط الخادم": "Change server link",
    "اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير مفعّل.": "Wrong username or password, or the account is disabled.",
    "انتهت الجلسة، الرجاء تسجيل الدخول مجدداً.": "Session expired, please sign in again.",
    "ربط الخادم": "Connect the server", "رابط الخادم": "Server link", "اتصال": "Connect", "جاري الفحص…": "Checking…",
    "الرابط غير صحيح. يجب أن يبدأ بـ https://script.google.com/": "Invalid link. It must start with https://script.google.com/",
    "الرابط غير موجود (404). انسخ رابط Web app من Deploy ← Manage deployments، وتأكد أنه ينتهي بـ /exec.": "Link not found (404). Copy the Web app link from Deploy → Manage deployments; it must end with /exec.",
    "الرابط لا يعمل. تأكد أن Who has access = Anyone ثم أعد النشر.": "The link doesn't work. Make sure Who has access = Anyone, then redeploy.",
    "تعذر الوصول للرابط. تأكد منه وأعد المحاولة.": "Couldn't reach the link. Check it and try again.",
    "يُحفظ في هذا المتصفح.": "It is saved in this browser.",
    // dashboard
    "تجديد الخطة / إعادة التقييم": "Plan renewal / re-evaluation", "تجاوز مهلة التذكير": "Reminder window passed",
    "تجديد الخطة": "Renew plan", "كتابة التقرير": "Write report", "الموعد": "Due", "رقم الملف": "File no.", "المريض": "Patient",
    "المطلوب": "Required", "التاريخ": "Date", "الأخصائي": "Therapist", "قائمة المرضى": "Patient list",
    "متأخرة (فات موعدها)": "Overdue", "مستحقة اليوم / غداً": "Due today / tomorrow", "قادمة خلال 30 يوماً": "Coming in 30 days",
    "مرضى نشطون": "Active patients", "مطلوب الآن: تجديدات وتقارير مستحقة أو متأخرة": "Needed now: renewals and reports due or overdue",
    "لا يوجد شيء مستحق الآن. 👌": "Nothing is due right now. 👌", "تقارير مسودة لم تُعتمد": "Draft reports not finalized",
    // patients
    "استيراد من Excel": "Import from Excel", "⬆ استيراد من Excel": "⬆ Import from Excel", "مريض جديد": "New patient", "+ مريض جديد": "+ New patient",
    "بحث بالاسم أو رقم الملف…": "Search by name or file no.…", "كل الحالات": "All statuses", "الاسم": "Name", "العمر": "Age",
    "التشخيص": "Diagnosis", "الحالة": "Status", "لا يوجد مرضى مطابقون.": "No matching patients.",
    "المركز *": "Center *", "رقم الملف *": "File no. *", "الاسم بالعربي *": "Name in Arabic *",
    "الاسم بالإنجليزي (للتقارير الإنجليزية)": "Name in English (for English reports)", "تاريخ الميلاد": "Date of birth",
    "الجنس *": "Gender *", "الجنسية": "Nationality", "اسم ولي الأمر": "Guardian name", "رقم الهاتف": "Phone number",
    "شركة التأمين": "Insurance company", "نقدي (بدون تأمين)": "Cash (no insurance)", "رقم بطاقة التأمين": "Insurance card no.",
    "التشخيص المبدئي": "Initial diagnosis", "تاريخ بدء العلاج": "Therapy start date", "الأخصائي/ون المسؤولون": "Assigned therapist(s)",
    "(أخصائيو المركز المختار)": "(therapists of the selected center)", "(مركز آخر)": "(other center)",
    "لا يوجد أخصائيون لهذا المركز — أضف المركز للأخصائي من صفحة المستخدمين.": "No therapists for this center — add the center to the therapist on the Users page.",
    "تعديل بيانات المريض": "Edit patient", "رقم الملف والاسم والجنس مطلوبة (الجنس يحدد صياغة التقارير)": "File no., name and gender are required (gender sets the report wording)",
    "الجنس": "Gender", "ولي الأمر": "Guardian", "الهاتف": "Phone", "التأمين": "Insurance", "بدء العلاج": "Therapy start",
    "تجديد": "Renew", "تمت المتابعة": "Followed up", "تعديل البيانات": "Edit details",
    "خطة جديدة": "New plan", "+ خطة جديدة": "+ New plan", "النوع": "Type", "الفترة": "Period", "لا توجد خطط بعد.": "No plans yet.",
    "تقييم أولي، تقرير تقييم، إعادة تقييم، تقييم مرحلي، خروج، أو تقرير لجهة خارجية": "Initial assessment, evaluation, re-evaluation, progress, discharge or external report",
    "تقرير جديد": "New report", "+ تقرير جديد": "+ New report", "التقرير التالي": "Next report", "لا توجد تقارير بعد.": "No reports yet.",
    "نوع التقرير": "Report type", "تنزيل Word": "Download Word", "طباعة / حفظ PDF": "Print / save PDF",
    "لم يتم توليد نص بعد. افتح المستند واضغط «توليد النص» ثم احفظ.": "No text generated yet. Open the document, press “Generate text”, then save.",
    "تم تنزيل ملف Word": "Word file downloaded", "المشرف السريري": "Clinical supervisor",
    "المرفقات (نسخة موقعة، تقارير خارجية…) — PDF / Word / صور": "Attachments (signed copy, external reports…) — PDF / Word / images",
    "لا توجد مرفقات": "No attachments", "جاري فتح الملف…": "Opening file…",
    // document editor
    "سطر لكل بند": "One item per line", "النص النهائي والتصدير": "Final text and export",
    "تجديد الخطة التربوية الفردية": "IEP renewal", "خطة تربوية فردية جديدة": "New IEP", "المركز (الترويسة)": "Center (letterhead)",
    "نوع الخطة": "Plan type", "حالة الخطة": "Plan status", "تاريخ بدء الخطة": "Plan start date",
    "تاريخ انتهاء الخطة / إعادة التقييم": "Plan end / re-evaluation date", "يُحسب تلقائياً من مدة الخطة ويمكن تعديله.": "Calculated from the plan duration; you can change it.",
    "عدد الجلسات الموافق عليها (تأمين)": "Approved sessions (insurance)", "تاريخ التقرير": "Report date", "حالة التقرير": "Report status",
    "موعد التقرير التالي (للتذكير)": "Next report due (for reminders)", "فارغ": "Empty", "لا يوجد تقرير لاحق. الافتراضي بعد 6 أشهر.": "No next report. Default is after 6 months.",
    "الخطة المرتبطة": "Linked plan", "لا توجد خطة محفوظة لهذا المريض.": "No saved plan for this patient.",
    "وضع المعاينة:": "Preview mode:", "هذا النموذج كما يراه الأخصائي، على مريض تجريبي. جرّب الخيارات و«توليد النص» وWord وPDF — لا يُحفظ أي شيء.": "This is the form as the therapist sees it, on a sample patient. Try the options, “Generate text”, Word and PDF — nothing is saved.",
    "المريض التجريبي:": "Sample patient:", "كل النماذج": "All forms", "الأهداف منسوخة من الخطة السابقة": "Goals copied from the previous plan",
    "بيانات": "Details", "الخطة": "Plan", "التقرير": "Report", "راجع النص وعدّله بحرية قبل الحفظ": "Review and edit the text freely before saving",
    "رموز التنسيق في النص": "Formatting marks in the text", "جدول": "table", "جداول البيانات": "data tables",
    "اختر الإجابات أعلاه ثم اضغط «توليد النص»…": "Choose the answers above, then press “Generate text”…",
    "توليد النص": "Generate text", "معاينة — لا يوجد حفظ": "Preview — not saved",
    "أهداف من الخطة لم تتحقق بعد:": "Plan goals not yet achieved:", "الخطة المختارة لا تحتوي على أهداف قصيرة المدى.": "The selected plan has no short-term goals.",
    "لا توجد خطة مرتبطة — سيُكتب التقرير بدون قائمة أهداف.": "No linked plan — the report will be written without a goal list.",
    "في الخطة:": "In the plan:", "الإنجاز": "Achievement",
    "ابدأ بإضافة هدف عام (مجال)، ثم اختر الهدف طويل المدى، ثم أضف الأهداف قصيرة المدى من البنك أو اكتبها.": "Start by adding a general goal (domain), choose the long-term goal, then add short-term goals from the bank or write them.",
    "حذف المجال": "Delete domain", "الهدف طويل المدى": "Long-term goal", "الأهداف قصيرة المدى": "Short-term goals",
    "بند C9: كل هدف قصير المدى يحتاج معياراً رقمياً": "Item C9: every short-term goal needs a numeric criterion", "بدون معيار رقمي": "No numeric criterion",
    "المواد والأدوات اللازمة": "Materials and tools", "الاستراتيجيات التدريبية": "Teaching strategies", "التعزيز": "Reinforcement",
    "التقييم": "Evaluation", "تاريخ البدء": "Start date", "تاريخ الانتهاء": "End date", "هدف قصير فارغ": "Empty short-term goal",
    "بنك الأهداف لهذا المجال (اضغط لإضافة — استبدل X بالرقم أو الصوت)": "Goal bank for this domain (click to add — replace X with the number or sound)",
    "إضافة هدف عام": "Add general goal", "+ إضافة هدف عام": "+ Add general goal", "حذف هذا المجال بكل أهدافه؟": "Delete this domain and all its goals?",
    "تمت إضافة الهدف — عدّل X إن وجد": "Goal added — edit X if present",
    "لغة المستند: English — اضغط «توليد النص»": "Document language: English — press “Generate text”",
    "لغة المستند: العربية — اضغط «توليد النص»": "Document language: Arabic — press “Generate text”",
    "اسم الأخصائي بالإنجليزي": "therapist's English name", "اسم المريض بالإنجليزي": "patient's English name", "اسمك بالإنجليزي (من المستخدمين)": "your English name (Users page)",
    "سيتم استبدال النص الحالي بنص جديد مولّد من الخيارات. متابعة؟": "The current text will be replaced by new text generated from the options. Continue?",
    "لا يمكن اعتماد تقرير بدون نص. اضغط «توليد النص» أولاً.": "A report can't be final without text. Press “Generate text” first.",
    "حدد تاريخ البداية والانتهاء": "Set the start and end dates",
    // forms page
    "افتح أي نموذج لتراه كما يستخدمه الأخصائي — على مريض تجريبي، ولا يتم حفظ أي شيء.": "Open any form to see it as the therapist uses it — on a sample patient; nothing is saved.",
    "بيانات الخطة، ملخص التقييم، الأهداف وجداولها، المتابعة والاعتماد": "Plan details, assessment summary, goals and tables, follow-up and approval",
    "نموذج ST_TP": "Form ST_TP", "النموذج المختصر": "Short form", "نموذج ST_IA": "Form ST_IA", "نموذج PRO_REP": "Form PRO_REP",
    "مرتبط بأهداف الخطة (خطة تجريبية جاهزة للمعاينة)": "Linked to plan goals (a sample plan is ready for preview)",
    "نفس نموذج التقييم الشامل بعنوان إعادة تقييم": "Same as the full evaluation, titled re-evaluation",
    "للعمل الحقيقي: المرضى ← افتح ملف المريض ← تبويب «الخطط» أو «التقارير».": "For real work: Patients → open the patient → “Plans” or “Reports” tab.",
    // users
    "مستخدم جديد": "New user", "+ مستخدم جديد": "+ New user", "الدور": "Role", "المراكز": "Centers", "التوقيع / الختم": "Signature / stamp",
    "✍ التوقيع / الختم": "✍ Signature / stamp", "توقيع": "Signature", "ختم": "Stamp", "مفعّل": "Active", "موقوف": "Disabled",
    "إيقاف الحساب يمنع الدخول فوراً مع الإبقاء على سجلاته. الأخصائي يرى فقط المرضى المسندين إليه.": "Disabling an account blocks sign-in immediately and keeps its records. A therapist sees only the patients assigned to them.",
    "تعديل مستخدم": "Edit user", "الاسم الكامل (يظهر في التقارير)": "Full name (shown on reports)", "الاسم بالإنجليزي (للتقارير الإنجليزية)": "Name in English (for English reports)",
    "اسم المستخدم (للدخول) *": "Username (for sign-in) *", "البريد الإلكتروني (لاستلام التذكيرات — اختياري)": "Email (for reminders — optional)",
    "كلمة مرور جديدة (اتركها فارغة لعدم التغيير)": "New password (leave empty to keep it)",
    "كلمة المرور 8 أحرف على الأقل. أعطها للموظف شخصياً واطلب منه تغييرها.": "Password: at least 8 characters. Give it to the employee in person and ask them to change it.",
    "بعد حفظ المستخدم، افتحه مرة ثانية (تعديل) لرفع توقيعه أو ختمه.": "After saving the user, open it again (Edit) to upload their signature or stamp.",
    "التوقيع والختم (يظهران في التقارير والخطط)": "Signature and stamp (shown on reports and plans)", "كلمة المرور 8 أحرف على الأقل": "Password must be at least 8 characters",
    // signatures
    "الصورة يجب أن تكون PNG أو JPG": "The image must be PNG or JPG", "تعذر قراءة الصورة": "Couldn't read the image",
    "الصورة كبيرة جداً — جرّب صورة أصغر": "Image too large — try a smaller one", "التوقيع": "Signature", "الختم": "Stamp",
    "صورة واضحة للتوقيع بقلم أزرق أو أسود على ورقة بيضاء.": "A clear photo of the signature in blue or black pen on white paper.",
    "صورة الختم (مقصوصة على حدود الختم).": "A photo of the stamp (cropped to its edges).",
    "مرفوع": "Uploaded", "غير مرفوع": "Not uploaded", "إزالة الخلفية البيضاء": "Remove white background", "اختر صورة أولاً": "Choose an image first",
    "يظهر تلقائياً في خانة «التوقيع» بسطر «المشرف السريري» في كل خطط هذا المركز — حتى الخطط القديمة — عند تنزيلها Word / PDF.": "Appears automatically in the “Signature” cell of the “Clinical supervisor” row on every plan of this center — old plans too — when downloaded as Word / PDF.",
    "يظهر التوقيع والختم مكان": "The signature and stamp appear in place of", "في نص التقرير أو الخطة عند التنزيل (Word / PDF). احذف": "in the report or plan text when downloaded (Word / PDF). Delete",
    "من النص إذا لم ترده في مستند معيّن.": "from the text if you don't want it on a document.",
    "التوقيع والختم": "Signature and stamp", "يظهران تلقائياً في تقاريرك وخططك": "Shown automatically on your reports and plans",
    "توقيع وختم المشرف السريري": "Clinical supervisor signature and stamp",
    // latest documents
    "كل الخطط والتقارير — الأحدث تعديلاً أولاً": "All plans and reports — most recently changed first", "لتغيير المركز استخدم القائمة في الأعلى.": "To change the center use the menu at the top.",
    "خطط وتقارير": "Plans and reports", "الخطط فقط": "Plans only", "التقارير فقط": "Reports only", "كل المعالجين": "All therapists",
    "كل الأنواع": "All types", "آخر تعديل": "Last change", "المستند": "Document", "المعالج": "Therapist",
    "لا توجد مستندات مطابقة.": "No matching documents.", "لم يتم توليد نص لهذا المستند بعد.": "No text has been generated for this document yet.",
    // import
    "تعذر تحميل مكتبة Excel": "Couldn't load the Excel library", "استيراد المرضى من Excel": "Import patients from Excel",
    "يُؤخذ من الملف كل ما يطابق خانات ملف المريض: رقم الملف، الاسم، الميلاد، الجنس، الجنسية، ولي الأمر، الهاتف، التأمين، التشخيص، تاريخ البدء. باقي الأعمدة (مثل رقم الهوية) تُتجاهل.": "Everything that matches a patient-file field is taken: file no., name, birth date, gender, nationality, guardian, phone, insurance, diagnosis, start date. Other columns (such as ID numbers) are ignored.",
    "١. ملف Excel (xlsx / xls / csv)": "1. Excel file (xlsx / xls / csv)", "٢. المركز *": "2. Center *",
    "الأخصائي المسؤول (اختياري — لكل المستوردين)": "Assigned therapist (optional — for all imported)", "— بدون —": "— none —", "— لا يوجد —": "— none —",
    "الورقة (Sheet)": "Sheet", "٣. تأكد من الأعمدة (تم اختيارها تلقائياً — غيّرها إذا لزم)": "3. Check the columns (chosen automatically — change if needed)",
    "رقم الملف *": "File no. *", "الاسم *": "Name *", "الاسم بالإنجليزي (اختياري)": "Name in English (optional)", "الجنس (اختياري)": "Gender (optional)",
    "المرضى الموجودين مسبقاً: عبّي الخانات الفاضية عندهم بس من الملف (أي شي ضفته أو عدّلته بالموقع ما بيتغيّر). بدون هذا الخيار يتم تخطيهم.": "Existing patients: only fill their EMPTY fields from the file (anything you added or edited on the site is kept). Without this option they are skipped.",
    "اختر عمود «رقم الملف» وعمود «الاسم».": "Choose the “File no.” and “Name” columns.", "صف": "Row", "بالإنجليزي": "English",
    "الصيغة المتوقعة يوم/شهر/سنة. سيُستورد بدون تاريخ.": "Expected format day/month/year. It will be imported without a date.",
    "يظهر أول 300 صف فقط في المعاينة، وسيتم استيراد الكل.": "Only the first 300 rows are shown in the preview; all will be imported.",
    "تم الاستيراد ✅": "Import complete ✅", "انتبه: «الجنس» مطلوب لصياغة التقارير. افتح ملف كل مريض ليس له جنس وحدّده.": "Note: “Gender” is needed for report wording. Open each patient without a gender and set it.",
    "عرض المرضى": "View patients", "إعادة المحاولة": "Try again", "جاري قراءة الملف…": "Reading file…",
    // profile
    "بياناتي": "My details", "البريد الإلكتروني (لاستلام التذكيرات)": "Email (for reminders)", "تغيير كلمة المرور": "Change password",
    "كلمة المرور الجديدة": "New password", "تأكيد كلمة المرور": "Confirm password", "كلمتا المرور غير متطابقتين": "Passwords don't match",
    "تم تغيير كلمة المرور": "Password changed",
    // audit
    "الوقت": "Time", "المستخدم": "User", "الإجراء": "Action", "التفاصيل": "Details", "مستخدم": "User", "إعدادات": "Settings",
    "تسجيل دخول": "Sign-in", "عرض": "View", "إضافة": "Add", "استيراد من Excel ": "Import from Excel",
    "تعديل التوقيع/الختم": "Signature/stamp changed", "تعديل توقيع المشرف السريري": "Supervisor signature changed",
    // settings
    "التذكيرات": "Reminders", "اسم النظام": "System name", "يبدأ التذكير قبل الموعد بـ (يوم)": "Reminders start before the due date (days)",
    "ويستمر بعد الموعد حتى (أيام)": "and continue after it for (days)", "إرسال تذكير لكل أخصائي بمرضاه": "Email each therapist about their patients",
    "إيميلات تستلم الملخص اليومي الكامل (افصل بفاصلة)": "Emails receiving the full daily summary (comma separated)", "إرسال التذكيرات الآن": "Send reminders now",
    "ترسل التذكيرات تلقائياً كل يوم الساعة 8:00 صباحاً (من حساب Gmail الذي نشر Apps Script) لكل خطة أو تقرير يقع موعده ضمن هذه الفترة. يستلم كل أخصائي تذكير مرضاه إذا كان له بريد في صفحة المستخدمين.": "Reminders are sent automatically every day at 8:00 AM (from the Gmail account that deployed Apps Script) for every plan or report due within this window. Each therapist gets their patients' reminders if they have an email on the Users page.",
    "الخادم": "Server", "رابط Apps Script الحالي": "Current Apps Script link", "المراكز والترويسة": "Centers and letterhead",
    "تظهر في رأس كل تقرير وخطة (Word و PDF)": "Shown at the top of every report and plan (Word and PDF)", "لا يوجد شعار": "No logo",
    "الاسم بالإنجليزي": "Name in English", "لون الترويسة": "Letterhead color", "العنوان": "Address", "البريد": "Email", "واتساب": "WhatsApp",
    "المشرف السريري (يظهر في اعتماد الخطة)": "Clinical supervisor (shown in plan approval)", "رقم الترخيص": "License no.", "ملاحظة التذييل": "Footer note",
    "مثال: سري – للاستخدام الطبي فقط": "e.g. Confidential – medical use only", "الشعار (PNG أو JPG)": "Logo (PNG or JPG)", "حفظ المركز": "Save center",
    "تم حفظ المركز": "Center saved", "تم تغيير الحالة": "Status changed", "الهدف العام:": "General goal:", "حذف هذا الهدف": "Delete this goal",
    "+ هدف طويل المدى آخر تحت نفس الهدف العام": "+ Another long-term goal under the same general goal",
    "حذف هذا الهدف طويل المدى مع أهدافه القصيرة؟": "Delete this long-term goal with its short-term goals?",
    "انضاف هدف طويل المدى جديد تحت نفس الهدف العام": "A new long-term goal was added under the same general goal", "يوم الميلاد (إذا التاريخ مقسوم على 3 أعمدة)": "Birth day (if the date is split in 3 columns)", "شهر الميلاد": "Birth month", "سنة الميلاد": "Birth year",
    "الملف ما فيه رقم ملف: أعطِ كل مريض رقم ملف مؤقت (TMP-…) وعدّله لاحقاً من ملف المريض.": "The file has no file numbers: give each patient a temporary number (TMP-…) and edit it later.",
    "اختر عمود «الاسم»، وعمود «رقم الملف» أو علّم «رقم ملف مؤقت».": "Choose the “Name” column, and the “File no.” column or tick “temporary file number”.", "اسم المشرف السريري بالإنجليزي": "Clinical supervisor name in English",
    "كتابة النص من جديد بالإنجليزي؟ (أي تعديل يدوي على النص الحالي رح ينمسح)": "Rewrite the text in English? (manual edits to the current text will be lost)",
    "كتابة النص من جديد بالعربي؟ (أي تعديل يدوي على النص الحالي رح ينمسح)": "Rewrite the text in Arabic? (manual edits to the current text will be lost)",
    "لغة المستند: English — تمت كتابة النص بالإنجليزي": "Document language: English — the text was written in English",
    "لغة المستند: العربية — تمت كتابة النص بالعربي": "Document language: Arabic — the text was written in Arabic",
    "تم تغيير لغة المستند. اضغط «توليد النص» لما تكون جاهز.": "Document language changed. Press “Generate text” when ready.",
    "لغة المستند إنجليزي بس النص لسا عربي. كتابة النص بالإنجليزي قبل التنزيل؟": "The document language is English but the text is Arabic. Rewrite it in English before downloading?",
    "لغة المستند عربي بس النص إنجليزي. كتابة النص بالعربي قبل التنزيل؟": "The document language is Arabic but the text is English. Rewrite it in Arabic before downloading?", "لا يمكنك إضافة مريض لمركز غير مسجل لك.": "You can't add a patient to a center you are not registered in.", "مريض": "Patient", "بيانات الخطة": "Plan details", "بيانات التقرير": "Report details", "التعرّف": "Identification", "التسمية": "Naming", "% الإنجاز": "% achieved",
    "فارغ = لا يوجد تقرير لاحق. الافتراضي بعد 6 أشهر.": "Empty = no next report. Default is after 6 months.",
    "# عنوان · ## عنوان قسم · ### عنوان فرعي مسطّر · - نقطة · 1. ترقيم · **عريض** · ^^ سطر في الوسط ·": "# title · ## section · ### underlined sub-heading · - bullet · 1. numbering · **bold** · ^^ centered line ·",
    "أُنجز الهدف": "Goal achieved", "جار التدريب": "In training", "تم إنجاز جزء من الهدف": "Partially achieved", "لم يتم البدء في الهدف": "Not started", "الاسم بالعربي": "Name in Arabic",
  };

  // ------------------------------------------------------------------ templates ({0}, {1} = any text, translated too)
  const TPL = [
    ["{0} مريض", "{0} patients"], ["{0} مستند", "{0} documents"],
    ["متأخر {0} يوم", "{0} days overdue"], ["بعد {0} يوم", "in {0} days"],
    ["مرحباً {0}", "Welcome {0}"], ["مرحباً", "Welcome"],
    ["تقرير مستحق (بعد {0})", "Report due (after {0})"],
    ["قادمة خلال 30 يوماً ({0})", "Coming in 30 days ({0})"], ["الخطط العلاجية ({0})", "Treatment plans ({0})"], ["التقارير ({0})", "Reports ({0})"],
    ["حذف ملف {0} نهائياً مع كل خططه وتقاريره؟ لا يمكن التراجع.", "Permanently delete {0}'s file with all plans and reports? This can't be undone."],
    ["التوقيع والختم — {0}", "Signature and stamp — {0}"], ["لا يوجد {0}", "No {0}"], ["رفع {0}", "Upload {0}"], ["تم رفع {0}", "{0} uploaded"], ["حذف {0}؟", "Delete {0}?"],
    ["آخر {0} من {1}", "latest {0} of {1}"], ["(آخر {0})", "(latest {0})"],
    ["٤. معاينة ({0} صف صالح · {1} ناقص)", "4. Preview ({0} valid rows · {1} incomplete)"], ["٤. معاينة ({0} صف صالح)", "4. Preview ({0} valid rows)"],
    ["استيراد {0} مريض", "Import {0} patients"], ["جاري الاستيراد… {0}", "Importing… {0}"],
    ["{0} تاريخ ميلاد لم يُفهم (مثال: «{1}»).", "{0} dates of birth couldn't be read (e.g. “{1}”)."],
    ["جديد: {0}", "New: {0}"], ["عمود {0}", "Column {0}"],
    ["تعذر تحميل الصفحة: {0}", "Couldn't load the page: {0}"], ["تعذر إنشاء الملف: {0}", "Couldn't create the file: {0}"], ["تعذر قراءة الملف: {0}", "Couldn't read the file: {0}"],
    ["للتقرير الإنجليزي ينقص: {0}", "Missing for the English report: {0}"], ["للمستند الإنجليزي ينقص: {0}", "Missing for the English document: {0}"],
    ["{0} و {1}", "{0} and {1}"], ["الهدف طويل المدى {0}", "Long-term goal {0}"],
    ["اقتراحات أهداف طويلة المدى لهذا المجال ({0}) — إذا الخانة معبّاية، الاقتراح بينضاف كهدف طويل جديد تحت نفس الهدف العام", "Long-term goal suggestions for this domain ({0}) — if the box is filled, the suggestion is added as a new long-term goal"], ["تنبيه: {0} سطر بالنص لسا بالعربي (نص مكتوب يدوياً). ترجمه بنفسك قبل التنزيل.", "Note: {0} line(s) are still in Arabic (typed by hand). Translate them before downloading."], ["(في الخطة: {0})", "(In the plan: {0})"],
    ["يوجد {0} هدف قصير المدى بدون معيار رقمي (بند C9 حرج). الحفظ على أي حال؟", "{0} short-term goal(s) have no numeric criterion (critical item C9). Save anyway?"],
    ["تم: {0} عنصر مستحق، أُرسلت {1} رسالة", "Done: {0} items due, {1} emails sent"],
    ["{0} عنصر مستحق — الإيميل غير مفعّل بعد (أدخل إعدادات SMTP)", "{0} items due — email is not enabled yet"],
    ["{0} · التذكير يبدأ قبل {1} يوم من الموعد ويستمر حتى {2} أيام بعده", "{0} · Reminders start {1} day(s) before the due date and continue {2} day(s) after"],
    ["التذكير يبدأ قبل {0} يوم من الموعد ويستمر حتى {1} أيام بعده", "Reminders start {0} day(s) before the due date and continue {1} day(s) after"],
    ["الصق رابط Apps Script (Web app) الذي ينتهي بـ {0}", "Paste the Apps Script (Web app) link that ends with {0}"],
  ].map(([ar, en]) => {
    const keys = [];
    const re = new RegExp("^" + ar.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{(\d)\}/g, (_, n) => { keys.push(+n); return "(.+?)"; }) + "$");
    return { re, keys, en };
  });

  // Phrases that may appear inside longer text (longest first). Only multi-word phrases, to keep data safe.
  let PHRASES = null;
  function phrases() {
    if (PHRASES) return PHRASES;
    PHRASES = Object.keys(D).filter((k) => /\s/.test(k.trim()) && k.length >= 6).sort((a, b) => b.length - a.length);
    return PHRASES;
  }

  const AR = /[؀-ۿ]/;
  function t(str) {
    if (lang !== "en" || str == null) return str;
    const s = String(str);
    if (!AR.test(s)) return s;
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim();
    if (D[core] !== undefined) return lead + D[core] + trail;
    for (const tp of TPL) {
      const m = core.match(tp.re);
      if (m) {
        let out = tp.en;
        tp.keys.forEach((k, i) => { out = out.replace("{" + k + "}", t(m[i + 1])); });
        return lead + out + trail;
      }
    }
    // known phrases inside longer text (e.g. "Error: …", "… · Reminders …"), and single words in brackets "(سارية)"
    let out = core.replace(/\(([^()]+)\)/g, (m, w) => (D[w.trim()] !== undefined ? "(" + D[w.trim()] + ")" : m));
    for (const p of phrases()) if (out.indexOf(p) >= 0) out = out.split(p).join(D[p]);
    return lead + out + trail;
  }

  // ------------------------------------------------------------------ DOM
  const SKIP = "textarea, script, style, [data-notr], [contenteditable]";
  const ATTRS = ["placeholder", "title", "aria-label", "alt"];
  function fixAttrs(el) {
    if (el.closest("[data-notr]")) return;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && AR.test(v)) { const w = t(v); if (w !== v) el.setAttribute(a, w); } }
  }
  function fixNode(n) {
    if (n.nodeType === 3) {
      const p = n.parentElement;
      if (!p || p.closest(SKIP) || !AR.test(n.nodeValue)) return;
      // <option> without value: keep the Arabic value before translating its text
      if (p.tagName === "OPTION" && !p.hasAttribute("value")) p.setAttribute("value", p.textContent);
      const v = t(n.nodeValue);
      if (v !== n.nodeValue) n.nodeValue = v;
      return;
    }
    if (n.nodeType !== 1 || n.closest("[data-notr]")) return;
    if (n.matches(SKIP)) { fixAttrs(n); return; }
    for (const a of ATTRS) {
      const v = n.getAttribute && n.getAttribute(a);
      if (v && AR.test(v)) { const w = t(v); if (w !== v) n.setAttribute(a, w); }
    }
    const walker = document.createTreeWalker(n, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (x) => (x.nodeType === 1 && x.matches(SKIP) ? (fixAttrs(x), NodeFilter.FILTER_REJECT) : NodeFilter.FILTER_ACCEPT),
    });
    let x = walker.nextNode();
    const list = [];
    while (x) { list.push(x); x = walker.nextNode(); }
    list.forEach((y) => {
      if (y.nodeType === 3) fixNode(y);
      else for (const a of ATTRS) { const v = y.getAttribute(a); if (v && AR.test(v)) { const w = t(v); if (w !== v) y.setAttribute(a, w); } }
    });
  }

  function start() {
    if (lang !== "en") return;
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
    const run = (muts) => muts.forEach((m) => {
      if (m.type === "characterData") fixNode(m.target);
      else if (m.type === "attributes") fixNode(m.target);
      else m.addedNodes.forEach(fixNode);
    });
    new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    if (document.body) fixNode(document.body);
    const c = window.confirm.bind(window), al = window.alert.bind(window);
    window.confirm = (m) => c(t(m));
    window.alert = (m) => al(t(m));
  }

  window.I18N = {
    get lang() { return lang; },
    t,
    add(map) { Object.assign(D, map); PHRASES = null; },
    setLang(l) { try { localStorage.setItem("ui_lang", l); } catch (_) {} location.reload(); },
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

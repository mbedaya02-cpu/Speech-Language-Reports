/**
 * Rules.gs — who can see / change what, validation, defaults and side effects.
 * Same rules as the PocketBase version (see DEVELOPER_SPEC.md §6).
 */

var COLLECTIONS = ['users', 'centers', 'patients', 'plans', 'reports', 'audit_log', 'app_settings', 'qa_audits', 'qa_actions', 'soap_notes'];
var PROTECTED_KEYS = ['author', 'last_editor', 'last_edit_at', 'id', 'created', 'updated', 'passHash', 'salt', 'expand', 'collectionName', 'collectionId', 'password', 'passwordConfirm', 'files+', 'files-', 'verified', 'emailVisibility', 'has_signature', 'has_stamp', 'sup_has_signature', 'sup_has_stamp'];

var Rules = (function () {
  function isAdmin(u) { return u && u.role === 'admin'; }
  function isTher(u) { return u && u.role === 'therapist'; }
  function ownsPatient(u, patientId) {
    var p = patientId && Db.get('patients', patientId);
    return !!(p && (p.therapists || []).indexOf(u.id) >= 0);
  }

  // Plans and reports for a therapist: the documents HE wrote (on any center), plus documents in his name
  // written by an admin, by a colleague of his own center, or before the author was recorded.
  // A document he put in the name of a therapist of the other center is seen only by him and the admins:
  // the named therapist does not see it.
  function sharesCenter(a, b) {
    var ca = a.centers || [], cb = b.centers || [];
    if (!ca.length || !cb.length) return true;
    return ca.some(function (c) { return cb.indexOf(c) >= 0; });
  }
  function seesDoc(u, rec) {
    if (rec.author === u.id) return true;
    if (rec.therapist !== u.id || !ownsPatient(u, rec.patient)) return false;
    if (!rec.author) return true;
    var a = Db.get('users', rec.author);
    return !a || a.role === 'admin' || sharesCenter(a, u);
  }

  function canView(coll, rec, u) {
    switch (coll) {
      case 'users': case 'centers': case 'app_settings': return true;
      case 'audit_log': return isAdmin(u);
      case 'patients': return !isTher(u) || (rec.therapists || []).indexOf(u.id) >= 0;
      case 'plans': case 'reports': return !isTher(u) || seesDoc(u, rec);
      case 'soap_notes': return !isTher(u) || ownsPatient(u, rec.patient);
      // quality audits: admins see all; a therapist sees only his own, and only after submission
      case 'qa_audits': return isAdmin(u) || (isTher(u) && rec.therapist === u.id && rec.status === 'submitted');
      case 'qa_actions':
        if (isAdmin(u)) return true;
        if (!isTher(u) || rec.therapist !== u.id) return false;
        var au = rec.audit && Db.get('qa_audits', rec.audit);
        return !au || au.status === 'submitted';
    }
    return false;
  }
  function canCreate(coll, data, u) {
    switch (coll) {
      case 'qa_audits': case 'qa_actions': return isAdmin(u);
      case 'soap_notes': return isAdmin(u) || (isTher(u) && ownsPatient(u, data.patient));
      case 'users': case 'centers': return isAdmin(u);
      case 'patients': return isAdmin(u) || u.role === 'reception' || isTher(u);
      case 'plans': case 'reports': return isAdmin(u) || (isTher(u) && ownsPatient(u, data.patient));
    }
    return false;
  }
  function canUpdate(coll, old, data, u) {
    switch (coll) {
      case 'qa_audits': case 'qa_actions': return isAdmin(u);
      // a session note is edited only by the therapist who wrote it (or an admin)
      case 'soap_notes': return isAdmin(u) || (isTher(u) && old.therapist === u.id && ownsPatient(u, old.patient) && (!data.patient || data.patient === old.patient));
      case 'users': return isAdmin(u) || (old.id === u.id && !('role' in data) && !('active' in data) && !('centers' in data) && !('username' in data)
        && !['employee_id', 'job_title', 'department', 'join_date', 'supervisor_name', 'employment_status'].some(function (k) { return k in data; }));
      case 'centers': case 'app_settings': return isAdmin(u);
      case 'patients': return isAdmin(u) || u.role === 'reception' || (isTher(u) && (old.therapists || []).indexOf(u.id) >= 0 && !('therapists' in data));
      case 'plans': case 'reports':
        if (isAdmin(u)) return true;
        return isTher(u) && seesDoc(u, old) && (!data.patient || data.patient === old.patient || ownsPatient(u, data.patient));
    }
    return false;
  }
  function canDelete(coll, rec, u) {
    // a submitted audit is a permanent record: it can be corrected (with a reason) but never deleted
    if (coll === 'qa_audits') return isAdmin(u) && rec.status !== 'submitted';
    if (coll === 'qa_actions' || coll === 'soap_notes') return isAdmin(u);
    return ['users', 'centers', 'patients', 'plans', 'reports'].indexOf(coll) >= 0 && isAdmin(u);
  }

  function req(errs, data, field, msg) {
    var v = data[field];
    if (v === undefined || v === null || String(v).trim() === '') errs[field] = { message: msg || 'Cannot be blank.' };
  }
  function validate(coll, rec, isNew) {
    var errs = {};
    switch (coll) {
      case 'users':
        req(errs, rec, 'username', 'اسم المستخدم مطلوب');
        if (['admin', 'therapist', 'reception'].indexOf(rec.role) < 0) errs.role = { message: 'دور غير صالح' };
        if (rec.username) {
          var dup = Db.all('users').some(function (x) { return x.id !== rec.id && String(x.username || '').toLowerCase() === String(rec.username).toLowerCase(); });
          if (dup) errs.username = { message: 'اسم المستخدم مستخدم من قبل' };
        }
        if (isNew && !rec.passHash) errs.password = { message: 'كلمة المرور مطلوبة' };
        break;
      case 'centers': req(errs, rec, 'code'); req(errs, rec, 'name_ar'); break;
      case 'patients':
        req(errs, rec, 'center', 'المركز مطلوب'); req(errs, rec, 'file_no', 'رقم الملف مطلوب'); req(errs, rec, 'full_name', 'الاسم مطلوب'); req(errs, rec, 'status');
        if (rec.center && rec.file_no) {
          var d = Db.all('patients').some(function (x) { return x.id !== rec.id && x.center === rec.center && String(x.file_no).trim() === String(rec.file_no).trim(); });
          if (d) errs.file_no = { message: 'رقم الملف موجود مسبقاً في هذا المركز' };
        }
        break;
      case 'plans': req(errs, rec, 'patient'); req(errs, rec, 'plan_type'); req(errs, rec, 'start_date'); req(errs, rec, 'end_date'); req(errs, rec, 'status'); break;
      case 'reports': req(errs, rec, 'patient'); req(errs, rec, 'report_type'); req(errs, rec, 'report_date'); req(errs, rec, 'status'); break;
      case 'soap_notes':
        req(errs, rec, 'patient'); req(errs, rec, 'date', 'تاريخ الجلسة مطلوب');
        if (['attended', 'absent', 'cancelled'].indexOf(rec.attendance) < 0) errs.attendance = { message: 'حدد حضور الجلسة' };
        if (String(rec.note || '').trim().length < 5) errs.note = { message: 'ملاحظة الأخصائي عن الجلسة مطلوبة' };
        if (rec.attendance === 'attended' && !(rec.goals || []).length) errs.goals = { message: 'اختر الأهداف التي عملت عليها في الجلسة' };
        break;
      case 'qa_audits':
        req(errs, rec, 'therapist', 'الأخصائي مطلوب'); req(errs, rec, 'month', 'شهر التدقيق مطلوب');
        if (['draft', 'submitted'].indexOf(rec.status) < 0) errs.status = { message: 'حالة غير صالحة' };
        if (rec.month && !/^\d{4}-\d{2}$/.test(rec.month)) errs.month = { message: 'صيغة الشهر YYYY-MM' };
        break;
      case 'qa_actions':
        req(errs, rec, 'therapist'); req(errs, rec, 'issue', 'المشكلة مطلوبة');
        if (['open', 'progress', 'done'].indexOf(rec.status) < 0) errs.status = { message: 'حالة غير صالحة' };
        break;
    }
    if (Object.keys(errs).length) throw apiError(400, isNew ? 'Failed to create record.' : 'Failed to update record.', errs);
  }

  function label(coll, r) {
    if (!r) return '';
    if (coll === 'patients') return (r.file_no || '') + ' - ' + (r.full_name || '');
    if (coll === 'plans') return (r.plan_type || '') + ' (' + String(r.end_date || '').slice(0, 10) + ')';
    if (coll === 'reports') return (r.report_type || '') + ' (' + String(r.report_date || '').slice(0, 10) + ')';
    if (coll === 'users') return (r.name || '') + ' <' + (r.username || '') + '>';
    if (coll === 'qa_audits') { var t = Db.get('users', r.therapist); return 'تدقيق ' + (r.month || '') + ' - ' + (t ? t.name : ''); }
    if (coll === 'qa_actions') return String(r.issue || '').slice(0, 120);
    if (coll === 'soap_notes') { var pp = Db.get('patients', r.patient); return 'ملاحظة جلسة ' + String(r.date || '').slice(0, 10) + ' - ' + (pp ? pp.file_no : ''); }
    return '';
  }
  function audit(u, action, coll, id, lbl) {
    var entry = { user: u ? u.id : '', user_name: u ? (u.name || u.username) : '', action: action, collection_name: coll, record_id: id || '', label: String(lbl || '').slice(0, 300), ip: '', created: Db.now() };
    try {
      // Write requests already hold the lock and have the sheet open: write directly.
      // Read requests queue the entry in the cache; it is written in batches (see flushAuditQueue).
      if (REQUEST_HAS_LOCK) Db.insert('audit_log', entry);
      else AuditQueue.push(entry);
    } catch (e) { console.log('audit failed: ' + e); }
  }

  return { canView: canView, canCreate: canCreate, canUpdate: canUpdate, canDelete: canDelete, validate: validate, label: label, audit: audit };
})();

/** Strip secrets before sending a record to the browser. */
function publicRecord(coll, rec) {
  var out = {};
  Object.keys(rec).forEach(function (k) { if (k !== 'passHash' && k !== 'salt') out[k] = rec[k]; });
  out.collectionName = coll;
  if (coll === 'users') out.hasPassword = !!rec.passHash;
  return out;
}

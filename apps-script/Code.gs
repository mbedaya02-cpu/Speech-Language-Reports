/**
 * Code.gs — JSON API for the Speech and Language Reports website.
 *
 * Deploy as a Web App: Execute as "Me", Who has access "Anyone".
 * The website (GitHub Pages) sends POST requests with a JSON body:
 *   { action, token, collection, id, data, filter, sort, expand, page, perPage, ... }
 * and receives { ok:true, result } or { ok:false, error:{ status, message, data } }.
 */

function doGet() {
  return json({ ok: true, result: { app: 'speech-language-reports', version: 2, time: new Date().toISOString() } });
}

function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json({ ok: false, error: { status: 400, message: 'Invalid JSON.' } }); }
  Db.reset();
  var lock = null;
  REQUEST_HAS_LOCK = false;
  try {
    var write = WRITE_ACTIONS.indexOf(body.action) >= 0;
    if (write) { lock = LockService.getScriptLock(); lock.waitLock(25000); REQUEST_HAS_LOCK = true; }
    if (body.action === 'batch') return json({ ok: true, result: batch(body) });
    return json({ ok: true, result: handle(body) });
  } catch (err) {
    return json({ ok: false, error: errorOut(err) });
  } finally {
    if (lock) try { lock.releaseLock(); } catch (_) {}
    REQUEST_HAS_LOCK = false;
  }
}

var REQUEST_HAS_LOCK = false;
var WRITE_ACTIONS = ['create', 'update', 'delete', 'sendReminders', 'setSignature', 'importPatients'];
var BATCH_ACTIONS = ['list', 'one', 'refresh', 'fileData', 'signature', 'qaStats'];

function errorOut(err) {
  var status = err.status || 500;
  if (status === 500) console.error(err && err.stack || err);
  return { status: status, message: status === 500 ? 'Server error: ' + err.message : err.message, data: err.data || {} };
}

/** Several read requests in one round trip: { action:'batch', token, calls:[{action,...}] } */
function batch(b) {
  var calls = (b.calls || []).slice(0, 20);
  return calls.map(function (c) {
    try {
      if (BATCH_ACTIONS.indexOf(c.action) < 0) throw apiError(400, 'Action not allowed in batch.');
      c.token = b.token;
      return { ok: true, result: handle(c) };
    } catch (err) { return { ok: false, error: errorOut(err) }; }
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handle(b) {
  if (b.action === 'auth') {
    var res = Auth.login(b.identity, b.password);
    Rules.audit(res.user, 'تسجيل دخول', 'users', res.user.id, Rules.label('users', res.user));
    return { token: res.token, record: publicRecord('users', res.user) };
  }

  var u = Auth.userFromToken(b.token);
  if (!u) throw apiError(401, 'The request requires valid authorization.');

  switch (b.action) {
    case 'refresh': return { token: b.token, record: publicRecord('users', u) };
    case 'logout': Auth.logout(b.token); return true;
    case 'list': return list(u, b);
    case 'one': return one(u, b);
    case 'create': return create(u, b);
    case 'update': return update(u, b);
    case 'delete': return remove(u, b);
    case 'fileData': return fileData(u, b);
    case 'signature': return getSignature(u, b);
    case 'setSignature': return setSignature(u, b);
    case 'importPatients': return importPatients(u, b);
    case 'qaStats': return qaStats(u, b);
    case 'sendReminders':
      if (u.role !== 'admin') throw apiError(403, 'للمدير فقط.');
      return sendReminders();
  }
  throw apiError(400, 'Unknown action.');
}

function checkColl(c) { if (COLLECTIONS.indexOf(c) < 0) throw apiError(400, 'Unknown collection.'); return c; }

// ------------------------------------------------------------------ read
function list(u, b) {
  var coll = checkColl(b.collection);
  if (coll === 'audit_log' && u.role === 'admin') { AuditQueue.flush(); Db.reset(); }
  var match = Filter.compile(b.filter);
  var items = Db.all(coll).filter(function (r) { return Rules.canView(coll, r, u) && match(coll, r); });
  sortRecords(items, b.sort);
  var total = items.length;
  var perPage = Math.max(1, Math.min(Number(b.perPage) || 100000, 100000));
  var page = Math.max(1, Number(b.page) || 1);
  items = items.slice((page - 1) * perPage, page * perPage);
  return {
    page: page, perPage: perPage, totalItems: total, totalPages: Math.ceil(total / perPage),
    items: items.map(function (r) { return withExpand(coll, r, b.expand, u); }),
  };
}

function one(u, b) {
  var coll = checkColl(b.collection);
  var r = Db.get(coll, b.id);
  if (!r || !Rules.canView(coll, r, u)) throw apiError(404, "The requested resource wasn't found.");
  if (['patients', 'plans', 'reports'].indexOf(coll) >= 0) Rules.audit(u, 'عرض', coll, r.id, Rules.label(coll, r));
  return withExpand(coll, r, b.expand, u);
}

function sortRecords(items, sort) {
  if (!sort) return;
  var keys = String(sort).split(',').map(function (s) { s = s.trim(); return s.charAt(0) === '-' ? { k: s.slice(1), d: -1 } : { k: s.replace(/^\+/, ''), d: 1 }; });
  items.sort(function (a, b) {
    for (var i = 0; i < keys.length; i++) {
      var x = a[keys[i].k], y = b[keys[i].k];
      x = x === undefined || x === null ? '' : x; y = y === undefined || y === null ? '' : y;
      if (typeof x !== 'number' || typeof y !== 'number') { x = String(x); y = String(y); }
      if (x < y) return -1 * keys[i].d;
      if (x > y) return 1 * keys[i].d;
    }
    return 0;
  });
}

function withExpand(coll, r, expand, u) {
  var out = publicRecord(coll, r);
  if (!expand) return out;
  out.expand = {};
  String(expand).split(',').forEach(function (f) {
    f = f.trim();
    var rel = RELATIONS[coll] && RELATIONS[coll][f];
    if (!rel || !r[f]) return;
    if (Array.isArray(r[f])) {
      out.expand[f] = r[f].map(function (id) { return Db.get(rel, id); }).filter(Boolean).map(function (x) { return publicRecord(rel, x); });
    } else {
      var x = Db.get(rel, r[f]);
      if (x) out.expand[f] = publicRecord(rel, x);
    }
  });
  return out;
}

// ------------------------------------------------------------------ write
function cleanData(data) {
  var out = {};
  Object.keys(data || {}).forEach(function (k) { if (PROTECTED_KEYS.indexOf(k) < 0) out[k] = data[k]; });
  return out;
}

function create(u, b) {
  var coll = checkColl(b.collection);
  var data = b.data || {};
  var rec = cleanData(data);
  if (!Rules.canCreate(coll, rec, u)) throw apiError(400, 'Failed to create record.');

  if (coll === 'users') {
    if (rec.active === undefined) rec.active = true;
    Auth.setPassword(rec, data.password);
  }
  if (coll === 'patients' && !rec.status) rec.status = 'نشط';
  // no file number -> next temporary number in the shared sequence (all centers, all patients)
  if (coll === 'patients' && !String(rec.file_no || '').trim()) rec.file_no = nextTmpNo_();
  if (coll === 'patients' && u.role === 'therapist') {
    // A therapist who adds a patient is assigned to them (otherwise they could not see the file).
    // He may add the patient to either center (Bedaya or Alpine): he chooses it on the form.
    rec.therapists = (Array.isArray(rec.therapists) ? rec.therapists : []).filter(function (t) { return t !== u.id; }).concat([u.id]);
  }
  if (coll === 'plans' || coll === 'reports') {
    if (!rec.center) { var p = Db.get('patients', rec.patient); if (p) rec.center = p.center; }
    rec.author = u.id;   // who actually wrote it (the document may carry another therapist's name, see docTherapist)
    rec.therapist = docTherapist(u, rec);
    rec.files = [];
    applyFiles(rec, data);
  }
  if (coll === 'centers') checkLogo(rec);
  if (coll === 'soap_notes') {
    var sp = Db.get('patients', rec.patient);
    if (!rec.center && sp) rec.center = sp.center;
    if (u.role !== 'admin' || !rec.therapist) rec.therapist = u.id;   // the note belongs to the therapist who held the session
  }
  if (coll === 'qa_audits') {
    delete rec.history; delete rec.correction_reason;
    rec.auditor = u.id; rec.auditor_name = u.name || u.username;
    if (rec.status === 'submitted') { rec.submitted_at = Db.now(); rec.history = [{ at: rec.submitted_at, by: rec.auditor_name, action: 'submit', total: rec.total }]; }
  }
  Rules.validate(coll, rec, true);
  Db.insert(coll, rec);

  // renewal chaining
  if (rec.previous && coll === 'plans') { var pp = Db.get('plans', rec.previous); if (pp) { pp.status = 'تم التجديد'; Db.update('plans', pp); } }
  if (rec.previous && coll === 'reports') { var pr = Db.get('reports', rec.previous); if (pr) { pr.followed_up = true; Db.update('reports', pr); } }

  Rules.audit(u, 'إضافة', coll, rec.id, Rules.label(coll, rec));
  return withExpand(coll, rec, '', u);
}

function update(u, b) {
  var coll = checkColl(b.collection);
  var old = Db.get(coll, b.id);
  if (!old || !Rules.canView(coll, old, u)) throw apiError(404, "The requested resource wasn't found.");
  var data = b.data || {};
  var changes = cleanData(data);
  if (!Rules.canUpdate(coll, old, changes, u)) {
    if (coll === 'users' && data.password && old.id === u.id && Object.keys(changes).length === 0) { /* password-only self change */ }
    else throw apiError(403, 'ليس لديك صلاحية لهذا الإجراء.');
  }
  if (coll === 'qa_audits') qaGuard(u, old, changes);
  // deleting anything (attachments included) is for admins only
  if ((data['files-'] || []).length && u.role !== 'admin') throw apiError(403, 'حذف المرفقات للمدير فقط.');
  var rec = JSON.parse(JSON.stringify(old));
  Object.keys(changes).forEach(function (k) { rec[k] = changes[k]; });
  if (coll === 'users' && data.password) Auth.setPassword(rec, data.password);
  if (coll === 'plans' || coll === 'reports') { if ('therapist' in changes || 'center' in changes) rec.therapist = docTherapist(u, rec, old.therapist); applyFiles(rec, data); rec.last_editor = u.id; rec.last_edit_at = Db.now(); }
  if (coll === 'centers') checkLogo(rec);
  // a patient saved without a file number gets the next temporary number (TMP-…)
  if (coll === 'patients' && !String(rec.file_no || '').trim()) rec.file_no = nextTmpNo_();
  Rules.validate(coll, rec, false);
  Db.update(coll, rec);
  Rules.audit(u, 'تعديل', coll, rec.id, Rules.label(coll, rec));
  return withExpand(coll, rec, '', u);
}

function remove(u, b) {
  var coll = checkColl(b.collection);
  var rec = Db.get(coll, b.id);
  if (!rec || !Rules.canView(coll, rec, u)) throw apiError(404, "The requested resource wasn't found.");
  if (!Rules.canDelete(coll, rec, u)) throw apiError(403, 'ليس لديك صلاحية لهذا الإجراء.');
  if (coll === 'patients') {
    ['plans', 'reports', 'soap_notes'].forEach(function (c) {
      Db.all(c).filter(function (x) { return x.patient === rec.id; }).forEach(function (x) { trashFiles(x.files); Db.remove(c, x.id); });
    });
  }
  if (coll === 'plans' || coll === 'reports') trashFiles(rec.files);
  Db.remove(coll, rec.id);
  Rules.audit(u, 'حذف', coll, rec.id, Rules.label(coll, rec));
  return true;
}

function checkLogo(rec) {
  if (rec.logo && (String(rec.logo).indexOf('data:image/') !== 0 || String(rec.logo).length > 4000000)) {
    throw apiError(400, 'Invalid logo.', { logo: { message: 'الشعار يجب أن يكون صورة PNG/JPG أقل من 3MB' } });
  }
}

// ------------------------------------------------------------------ attachments (Google Drive)
function filesFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FILES_FOLDER_ID');
  if (id) try { return DriveApp.getFolderById(id); } catch (_) {}
  var f = DriveApp.createFolder('Speech and Language Reports - Attachments');
  props.setProperty('FILES_FOLDER_ID', f.getId());
  return f;
}

function applyFiles(rec, data) {
  rec.files = rec.files || [];
  var remove = data['files-'] || [];
  if (remove.length) {
    rec.files = rec.files.filter(function (n) { return remove.indexOf(n) < 0; });
    trashFiles(remove);
  }
  var add = data['files+'] || [];
  if (add.length) {
    if (rec.files.length + add.length > 5) throw apiError(400, 'Too many files.', { files: { message: 'الحد الأقصى 5 مرفقات' } });
    var allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    var folder = filesFolder();
    add.forEach(function (f) {
      if (allowed.indexOf(f.mime) < 0) throw apiError(400, 'File type not allowed.', { files: { message: 'نوع الملف غير مسموح: ' + f.name } });
      var bytes = Utilities.base64Decode(f.base64);
      if (bytes.length > 20 * 1024 * 1024) throw apiError(400, 'File too large.', { files: { message: 'الملف أكبر من 20MB: ' + f.name } });
      var file = folder.createFile(Utilities.newBlob(bytes, f.mime, f.name));
      rec.files.push(file.getId() + '__' + String(f.name).replace(/__/g, '_'));
    });
  }
}

function trashFiles(names) {
  (names || []).forEach(function (n) {
    try { DriveApp.getFileById(String(n).split('__')[0]).setTrashed(true); } catch (_) {}
  });
}

function fileData(u, b) {
  var coll = checkColl(b.collection);
  var rec = Db.get(coll, b.id);
  if (!rec || !Rules.canView(coll, rec, u) || (rec.files || []).indexOf(b.name) < 0) throw apiError(404, "The requested resource wasn't found.");
  var file = DriveApp.getFileById(String(b.name).split('__')[0]);
  var blob = file.getBlob();
  return { name: String(b.name).split('__').slice(1).join('__'), mime: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

// ------------------------------------------------------------------ signatures & stamps
// Stored in their own sheet ("signatures"), one row per user: { user, signature, stamp } as PNG/JPG data URLs.
// The users table only carries the flags has_signature / has_stamp, so logins and lists stay fast.
var SIG_MAX = 700000; // characters per image (~500 KB)

function sigRow_(userId) {
  return Db.all('signatures').filter(function (x) { return x.user === userId; })[0] || null;
}

/**
 * { action:'signature', user }            -> admin, or the user himself
 * { action:'signature', collection, id }  -> the signature of the therapist of that plan/report (anyone who can view it)
 */
function getSignature(u, b) {
  var userId;
  if (b.center) {
    // Clinical supervisor of a center: every signed-in user may read it (it is printed on all plans).
    if (!Db.get('centers', b.center)) throw apiError(404, "The requested resource wasn't found.");
    userId = 'center_' + b.center;
  } else if (b.collection) {
    var coll = b.collection;
    if (coll !== 'plans' && coll !== 'reports' && coll !== 'qa_audits') throw apiError(400, 'Unknown collection.');
    var rec = Db.get(coll, b.id);
    if (!rec || !Rules.canView(coll, rec, u)) throw apiError(404, "The requested resource wasn't found.");
    userId = coll === 'qa_audits' ? rec.auditor : rec.therapist;  // audit reports are signed by the auditor
  } else {
    userId = b.user || u.id;
    if (userId !== u.id && u.role !== 'admin') throw apiError(403, 'ليس لديك صلاحية لهذا الإجراء.');
  }
  var row = userId ? sigRow_(userId) : null;
  return { user: userId || '', signature: (row && row.signature) || '', stamp: (row && row.stamp) || '' };
}

/** { action:'setSignature', user, signature?, stamp? }  ('' removes the image). Admin, or the user himself. */
function setSignature(u, b) {
  var userId, target, coll = 'users';
  if (b.center) {
    if (u.role !== 'admin') throw apiError(403, 'ليس لديك صلاحية لهذا الإجراء.');
    coll = 'centers'; target = Db.get('centers', b.center); userId = 'center_' + b.center;
  } else {
    userId = b.user || u.id;
    if (userId !== u.id && u.role !== 'admin') throw apiError(403, 'ليس لديك صلاحية لهذا الإجراء.');
    target = Db.get('users', userId);
  }
  if (!target) throw apiError(404, "The requested resource wasn't found.");
  ['signature', 'stamp'].forEach(function (k) {
    if (b[k] === undefined || b[k] === null || b[k] === '') return;
    var v = String(b[k]);
    if (!/^data:image\/(png|jpeg);base64,/.test(v)) throw apiError(400, 'Invalid image.', { image: { message: 'الصورة يجب أن تكون PNG أو JPG' } });
    if (v.length > SIG_MAX) throw apiError(400, 'Image too large.', { image: { message: 'الصورة كبيرة جداً (الحد 500KB)' } });
  });
  var row = sigRow_(userId), isNew = !row;
  row = row || { user: userId, signature: '', stamp: '' };
  if (b.signature !== undefined) row.signature = String(b.signature || '');
  if (b.stamp !== undefined) row.stamp = String(b.stamp || '');
  row.has_signature = !!row.signature; row.has_stamp = !!row.stamp;
  if (isNew) Db.insert('signatures', row); else Db.update('signatures', row);
  if (coll === 'centers') {
    target.sup_has_signature = row.has_signature; target.sup_has_stamp = row.has_stamp;
    Db.update('centers', target);
    Rules.audit(u, 'تعديل توقيع المشرف السريري', 'centers', target.id, target.name_ar || '');
  } else {
    target.has_signature = row.has_signature; target.has_stamp = row.has_stamp;
    Db.update('users', target);
    Rules.audit(u, 'تعديل التوقيع/الختم', 'users', target.id, Rules.label('users', target));
  }
  return { user: userId, has_signature: row.has_signature, has_stamp: row.has_stamp };
}

// ------------------------------------------------------------------ import patients (from Excel, parsed in the browser)
/**
 * { action:'importPatients', center, therapist?, update?, rows:[{ file_no, full_name, full_name_en?, dob?, nationality?, gender?,
 *     guardian_name?, phone?, insurance_company?, insurance_no?, diagnosis?, start_date? }] }
 * New file numbers are added; existing ones (same center + file no.) are skipped, or updated when update = true.
 */
function importPatients(u, b) {
  if (u.role !== 'admin' && u.role !== 'reception') throw apiError(403, 'ليس لديك صلاحية لهذا الإجراء.');
  var center = Db.get('centers', b.center);
  if (!center) throw apiError(400, 'اختر المركز.');
  var ther = b.therapist ? Db.get('users', b.therapist) : null;
  var rows = (b.rows || []).slice(0, 500);
  // Match existing patients by file no., or (if the file no. was changed on the site, e.g. a TMP number
  // replaced by the real one) by the same name + date of birth. Existing data is never erased.
  var existing = {}, byNameDob = {};
  var nk = function (name, dob) { return String(name || '').replace(/\s+/g, ' ').trim() + '|' + String(dob || '').slice(0, 10); };
  Db.all('patients').forEach(function (p) {
    if (p.center !== center.id) return;
    existing[String(p.file_no).trim().toLowerCase()] = p;
    if (p.dob) byNameDob[nk(p.full_name, p.dob)] = p;
  });
  var FIELDS = ['full_name', 'full_name_en', 'dob', 'nationality', 'gender', 'guardian_name', 'phone', 'insurance_company', 'insurance_no', 'diagnosis', 'start_date'];
  var str = function (x) { return String(x == null ? '' : x).trim().slice(0, 300); };
  var added = [], updated = 0, skipped = 0, errors = [];
  rows.forEach(function (r, i) {
    var fileNo = String(r.file_no || '').trim(), name = String(r.full_name || '').trim();
    if (!name) { errors.push({ row: r._row || i + 1, message: 'الاسم فارغ' }); return; }
    var autoNo = !fileNo;   // no file number: matched by name + date of birth, or given the next TMP number
    if (autoNo) fileNo = '\u0000';
    var key = fileNo.toLowerCase();
    var rec = { center: center.id, file_no: fileNo, full_name: name, full_name_en: String(r.full_name_en || '').trim(),
      dob: r.dob ? String(r.dob).slice(0, 10) + ' 00:00:00.000Z' : '', nationality: String(r.nationality || '').trim(),
      gender: r.gender === 'ذكر' || r.gender === 'أنثى' ? r.gender : '',
      guardian_name: str(r.guardian_name), phone: str(r.phone), insurance_company: str(r.insurance_company),
      insurance_no: str(r.insurance_no), diagnosis: str(r.diagnosis),
      start_date: r.start_date ? String(r.start_date).slice(0, 10) + ' 00:00:00.000Z' : '' };
    var old = (autoNo ? null : existing[key]) || (rec.dob ? byNameDob[nk(rec.full_name, rec.dob)] : null);
    if (old) {
      if (!b.update) { skipped++; return; }
      // Only fill fields that are EMPTY on the site: anything added or corrected on the site is kept.
      var changed = false;
      FIELDS.forEach(function (f) {
        var cur = old[f];
        if (rec[f] && (cur === undefined || cur === null || String(cur).trim() === '')) { old[f] = rec[f]; changed = true; }
      });
      if (ther && (old.therapists || []).indexOf(ther.id) < 0) { old.therapists = (old.therapists || []).concat([ther.id]); changed = true; }
      if (changed) { Db.update('patients', old); updated++; } else skipped++;
      return;
    }
    if (autoNo) { rec.file_no = nextTmpNo_(added); key = rec.file_no.toLowerCase(); }
    rec.status = 'نشط'; rec.therapists = ther ? [ther.id] : [];
    rec.id = Db.newId(); rec.created = rec.updated = Db.now();
    existing[key] = rec;
    if (rec.dob) byNameDob[nk(rec.full_name, rec.dob)] = rec;
    added.push(rec);
  });
  if (added.length) Db.insertMany('patients', added);
  Rules.audit(u, 'استيراد من Excel', 'patients', '', center.name_ar + ': ' + added.length + ' جديد، ' + updated + ' تحديث');
  return { added: added.length, updated: updated, skipped: skipped, errors: errors };
}

// ------------------------------------------------------------------ quality audits
/**
 * A submitted audit is locked: it can only be changed through a documented correction
 * (data.correction_reason), which is appended to its history together with the old and new totals.
 * The history itself is written only here, never by the browser.
 */
function qaGuard(u, old, changes) {
  var reason = String(changes.correction_reason || '').trim();
  delete changes.correction_reason; delete changes.history; delete changes.auditor; delete changes.submitted_at;
  var hist = (old.history || []).slice();
  if (old.status === 'submitted') {
    if (changes.status && changes.status !== 'submitted') throw apiError(400, 'لا يمكن إرجاع تدقيق معتمد إلى مسودة.');
    if (!reason) throw apiError(400, 'التدقيق معتمد ومقفل. أي تعديل يحتاج سبب تصحيح موثّق.');
    var keys = Object.keys(changes).filter(function (k) { return JSON.stringify(changes[k]) !== JSON.stringify(old[k]); });
    hist.push({ at: Db.now(), by: u.name || u.username, action: 'correction', reason: reason.slice(0, 1000), fields: keys, before: old.total, after: changes.total != null ? changes.total : old.total });
  } else if (changes.status === 'submitted') {
    changes.submitted_at = Db.now();
    hist.push({ at: changes.submitted_at, by: u.name || u.username, action: 'submit', total: changes.total != null ? changes.total : old.total });
  }
  changes.history = hist;
}

/**
 * { action:'qaStats', therapist? } -> department averages per month (submitted audits only),
 * plus the therapist's own monthly totals. A therapist gets only averages, never other people's records.
 */
function qaStats(u, b) {
  if (u.role !== 'admin' && u.role !== 'therapist') throw apiError(403, 'ليس لديك صلاحية.');
  var who = u.role === 'admin' && b.therapist ? b.therapist : u.id;
  var dept = {}, own = {};
  Db.all('qa_audits').forEach(function (a) {
    if (a.status !== 'submitted' || typeof a.total !== 'number') return;
    var d = dept[a.month] || (dept[a.month] = { sum: 0, n: 0, cats: {} });
    d.sum += a.total; d.n++;
    Object.keys(a.cat || {}).forEach(function (k) {
      if (typeof a.cat[k] !== 'number') return;
      var c = d.cats[k] || (d.cats[k] = { sum: 0, n: 0 }); c.sum += a.cat[k]; c.n++;
    });
    if (a.therapist === who) own[a.month] = { total: a.total, cat: a.cat || {}, id: a.id };
  });
  var out = {};
  Object.keys(dept).forEach(function (m) {
    var d = dept[m], cats = {};
    Object.keys(d.cats).forEach(function (k) { cats[k] = Math.round(d.cats[k].sum / d.cats[k].n * 10) / 10; });
    out[m] = { avg: Math.round(d.sum / d.n * 10) / 10, n: d.n, cats: cats };
  });
  return { dept: out, own: own };
}

/**
 * The therapist whose name (and signature / stamp) goes on a plan or report.
 * Therapists are classified by center (users.centers). If the writer belongs to the document's center,
 * the document is in his name. If not (e.g. an Alpine therapist writing for a Bedaya file), he must choose
 * a therapist who belongs to that center. Admins may choose any therapist of that center (or themselves).
 */
function docTherapist(u, rec, oldTherapist) {
  // a user who is not classified on any center yet counts for every center (so saving is never blocked)
  var inCenter = function (usr) { return usr && usr.active !== false && (usr.role === 'therapist' || usr.role === 'admin') && (!(usr.centers || []).length || usr.centers.indexOf(rec.center) >= 0); };
  var chosen = rec.therapist ? Db.get('users', rec.therapist) : null;
  if (u.role === 'admin') {
    if (!chosen) return u.id;
    if (chosen.id !== u.id && !inCenter(chosen)) throw apiError(400, 'الأخصائي المختار غير مصنّف على مركز هذا المستند.', { therapist: { message: 'اختر أخصائياً من معالجي هذا المركز' } });
    return chosen.id;
  }
  // editing a colleague's document of the same center keeps his name
  if (chosen && oldTherapist && chosen.id === oldTherapist && inCenter(chosen)) return chosen.id;
  if (inCenter(u)) return u.id;
  if (!Db.all('users').some(inCenter)) return u.id;   // nobody is classified on that center yet
  if (!chosen || !inCenter(chosen)) throw apiError(400, 'أنت غير مصنّف على مركز هذا المستند: اختر اسم أخصائي من معالجي هذا المركز.', { therapist: { message: 'اختر أخصائياً من معالجي هذا المركز' } });
  return chosen.id;
}

/** Next temporary file number (TMP-0001, TMP-0002…), one sequence for every patient of every center. */
function nextTmpNo_(pending) {
  var max = 0;
  Db.all('patients').concat(pending || []).forEach(function (p) {
    var m = /^TMP-(\d+)$/i.exec(String(p.file_no || '').trim());
    if (m && Number(m[1]) > max) max = Number(m[1]);
  });
  var n = String(max + 1);
  while (n.length < 4) n = '0' + n;
  return 'TMP-' + n;
}

/**
 * Db.gs — Google Sheets as a simple document store, with a shared cache.
 *
 * Each collection is one sheet. Row 1 = headers:
 *   id | created | updated | <readable columns…> | _json1 | _json2 | …
 * The readable columns are for humans browsing the sheet only.
 * The full record (source of truth) is JSON, split over the _json columns
 * (a Sheets cell holds max 50,000 characters).
 *
 * Speed: every table is also kept in CacheService (shared by all requests for 6 h).
 * Reads normally never open the spreadsheet. Every write bumps the table's version,
 * so the next read reloads it from the sheet.
 * Edited the sheet by hand? Run clearCache() from the editor.
 */

var SCHEMA = {
  users:        ['username', 'name', 'name_en', 'email', 'role', 'active', 'centers'],
  centers:      ['code', 'name_ar', 'name_en', 'phone', 'email'],
  patients:     ['center', 'file_no', 'full_name', 'full_name_en', 'dob', 'gender', 'nationality', 'phone', 'insurance_company', 'status', 'therapists'],
  plans:        ['patient', 'center', 'plan_type', 'status', 'start_date', 'end_date', 'therapist'],
  reports:      ['patient', 'center', 'report_type', 'report_date', 'next_due', 'status', 'therapist'],
  audit_log:    ['user_name', 'action', 'collection_name', 'record_id', 'label', 'ip'],
  app_settings: ['system_name', 'remind_before', 'remind_after', 'notify_emails'],
  signatures:   ['user', 'has_signature', 'has_stamp'],  // therapist signature / stamp images (not exposed through the generic API)
};
var CHUNK = 45000;          // characters per _json cell
var CACHE_PIECE = 25000;    // characters per CacheService value (limit 100 KB)
var CACHE_TTL = 21600;      // 6 hours
var FIXED = ['id', 'created', 'updated'];

var Db = (function () {
  var mem = {};   // per-request: name -> { sheet?, header, jsonCols, rows:[{rec,row}], byId }
  var ssObj = null;

  function ss() {
    if (ssObj) return ssObj;
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (id) return (ssObj = SpreadsheetApp.openById(id));
    var active = SpreadsheetApp.getActiveSpreadsheet && SpreadsheetApp.getActiveSpreadsheet();
    if (active) return (ssObj = active);
    throw new Error('Spreadsheet not configured. Run setup() first.');
  }

  function sheet(name) {
    var s = ss().getSheetByName(name);
    if (!s) {
      s = ss().insertSheet(name);
      s.getRange(1, 1, 1, FIXED.length + SCHEMA[name].length + 1).setValues([FIXED.concat(SCHEMA[name]).concat(['_json1'])]);
      s.setFrozenRows(1);
    }
    return s;
  }
  function sheetOf(t, name) { return t.sheet || (t.sheet = sheet(name)); }

  // ---------------- shared cache
  function sc() { return CacheService.getScriptCache(); }
  function version(name) {
    var v = sc().get('dbv_' + name);
    if (!v) { v = String(Date.now()) + Math.floor(Math.random() * 1000); sc().put('dbv_' + name, v, CACHE_TTL); }
    return v;
  }
  function bump(name) {
    try { sc().put('dbv_' + name, String(Date.now()) + Math.floor(Math.random() * 1000), CACHE_TTL); } catch (_) {}
  }
  function fromCache(name) {
    try {
      var v = version(name), base = 'db_' + name + '_' + v + '_';
      var n = sc().get(base + 'n');
      if (!n) return null;
      var keys = []; for (var i = 0; i < Number(n); i++) keys.push(base + i);
      var got = sc().getAll(keys), txt = '';
      for (var j = 0; j < keys.length; j++) { if (got[keys[j]] == null) return null; txt += got[keys[j]]; }
      var t = JSON.parse(txt);
      index(t);
      return t;
    } catch (e) { return null; }
  }
  function toCache(name, t) {
    try {
      var v = version(name), base = 'db_' + name + '_' + v + '_';
      var txt = JSON.stringify({ header: t.header, jsonCols: t.jsonCols, rows: t.rows });
      var o = {}, n = 0;
      for (var i = 0; i < txt.length; i += CACHE_PIECE) o[base + (n++)] = txt.slice(i, i + CACHE_PIECE);
      o[base + 'n'] = String(n);
      sc().putAll(o, CACHE_TTL);
    } catch (e) { console.log('cache put skipped: ' + e); }
  }
  function index(t) { t.byId = {}; t.rows.forEach(function (x, i) { t.byId[x.rec.id] = i; }); }

  function load(name) {
    if (mem[name]) return mem[name];
    var t = fromCache(name);
    if (!t) {
      var s = sheet(name);
      var values = s.getDataRange().getValues();
      var header = values[0] || [];
      var jsonCols = [];
      header.forEach(function (h, i) { if (/^_json\d+$/.test(h)) jsonCols.push(i); });
      var rows = [];
      for (var r = 1; r < values.length; r++) {
        var v = values[r];
        if (!v[0]) continue;
        var txt = jsonCols.map(function (c) { return v[c] || ''; }).join('');
        var rec;
        try { rec = txt ? JSON.parse(txt) : {}; } catch (e) { rec = {}; }
        rec.id = String(v[0]);
        rows.push({ rec: rec, row: r + 1 });
      }
      t = { sheet: s, header: header, jsonCols: jsonCols, rows: rows };
      index(t);
      toCache(name, t);
    }
    mem[name] = t;
    return t;
  }

  function rowValues(name, t, rec) {
    var json = JSON.stringify(rec);
    var chunks = [];
    for (var i = 0; i < json.length; i += CHUNK) chunks.push(json.slice(i, i + CHUNK));
    if (!chunks.length) chunks.push('{}');
    while (t.jsonCols.length < chunks.length) {
      var col = t.header.length + 1;
      sheetOf(t, name).getRange(1, col).setValue('_json' + (t.jsonCols.length + 1));
      t.header.push('_json' + (t.jsonCols.length + 1));
      t.jsonCols.push(col - 1);
    }
    return t.header.map(function (h, i) {
      var j = t.jsonCols.indexOf(i);
      if (j >= 0) return chunks[j] || '';
      var v = rec[h];
      if (v === undefined || v === null) return '';
      if (typeof v === 'object') v = JSON.stringify(v);
      v = String(v);
      return v.length > 2000 ? v.slice(0, 2000) + '…' : v;
    });
  }

  function newId() {
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '';
    for (var i = 0; i < 15; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }
  function now() { return new Date().toISOString().replace('T', ' '); }

  function prepare(rec) {
    rec.id = rec.id || newId();
    rec.created = rec.created || now();
    rec.updated = now();
    return rec;
  }

  return {
    reset: function () { mem = {}; ssObj = null; },
    all: function (name) { return load(name).rows.map(function (x) { return x.rec; }); },
    get: function (name, id) {
      var t = load(name), i = t.byId[id];
      return i === undefined ? null : t.rows[i].rec;
    },
    insert: function (name, rec) { return Db.insertMany(name, [rec])[0]; },
    insertMany: function (name, recs) {
      if (!recs.length) return recs;
      var t = load(name), s = sheetOf(t, name);
      recs.forEach(prepare);
      var vals = recs.map(function (r) { return rowValues(name, t, r); });
      var width = t.header.length;
      vals = vals.map(function (v) { while (v.length < width) v.push(''); return v; });
      var start = s.getLastRow() + 1;
      s.getRange(start, 1, vals.length, width).setValues(vals);
      recs.forEach(function (r, i) { t.rows.push({ rec: r, row: start + i }); t.byId[r.id] = t.rows.length - 1; });
      bump(name);
      return recs;
    },
    update: function (name, rec) {
      var t = load(name), i = t.byId[rec.id];
      if (i === undefined) throw apiError(404, 'Record not found.');
      rec.updated = now();
      var vals = rowValues(name, t, rec);
      sheetOf(t, name).getRange(t.rows[i].row, 1, 1, vals.length).setValues([vals]);
      t.rows[i].rec = rec;
      bump(name);
      return rec;
    },
    remove: function (name, id) {
      var t = load(name), i = t.byId[id];
      if (i === undefined) return false;
      var row = t.rows[i].row;
      sheetOf(t, name).deleteRow(row);
      t.rows.splice(i, 1);
      t.rows.forEach(function (x) { if (x.row > row) x.row--; });
      index(t);
      bump(name);
      return true;
    },
    ensureSheets: function () { Object.keys(SCHEMA).forEach(sheet); },
    clearAllCaches: function () { Object.keys(SCHEMA).forEach(bump); },
    spreadsheet: ss,
    newId: newId,
    now: now,
  };
})();

/** Run from the editor if you edited the Google Sheet by hand. */
function clearCache() { Db.clearAllCaches(); console.log('Cache cleared.'); }

function apiError(status, message, data) {
  var e = new Error(message);
  e.status = status;
  e.data = data || {};
  return e;
}

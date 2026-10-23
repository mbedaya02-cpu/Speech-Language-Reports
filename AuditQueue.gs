/**
 * AuditQueue.gs — "viewed a file" audit entries are queued in the cache and written
 * to the audit_log sheet in batches, so opening a patient/report stays fast.
 * The queue is flushed by the keepWarm trigger (every 5 minutes), when it gets large,
 * and whenever someone opens the audit log page.
 */
var AuditQueue = {
  KEY: 'audit_queue',
  push: function (entry) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(3000)) { // busy: write directly rather than lose the entry
      Db.insert('audit_log', entry); return;
    }
    try {
      var c = CacheService.getScriptCache();
      var q = JSON.parse(c.get(AuditQueue.KEY) || '[]');
      q.push(entry);
      if (q.length >= 40) { Db.insertMany('audit_log', q); q = []; }
      c.put(AuditQueue.KEY, JSON.stringify(q), 21600);
    } finally { lock.releaseLock(); }
  },
  flush: function () {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return 0;
    try {
      var c = CacheService.getScriptCache();
      var q = JSON.parse(c.get(AuditQueue.KEY) || '[]');
      if (q.length) Db.insertMany('audit_log', q);
      c.put(AuditQueue.KEY, '[]', 21600);
      return q.length;
    } finally { lock.releaseLock(); }
  },
};

/** Trigger (every 5 minutes): keeps the script warm and writes queued audit entries. */
function keepWarm() {
  Db.reset();
  AuditQueue.flush();
  Db.all('users'); Db.all('centers'); Db.all('app_settings'); // refresh the cache
}

/** Installs both triggers: daily reminders at 08:00 and keepWarm every 5 minutes. */
function installTriggers() {
  installReminderTrigger();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'keepWarm') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('keepWarm').timeBased().everyMinutes(5).create();
  console.log('Triggers installed.');
}

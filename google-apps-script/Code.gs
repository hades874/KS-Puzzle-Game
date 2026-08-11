// Deploy: open the target Google Sheet > Extensions > Apps Script > paste this
// file's contents as Code.gs > Deploy > New deployment > type "Web app" >
// Execute as "Me", Who has access "Anyone" > Deploy.
//
// Copy the resulting /exec URL into js/puzzle-sheet.js's SHEET_API_URL constant.
//
// This script is container-bound: it always reads/writes the first sheet tab
// of whichever Spreadsheet it's attached to, creating the header row on first use.

var HEADERS = ['Timestamp', 'Name', 'School', 'Phone', 'TimeMs', 'TimeFormatted'];
var MAX_ATTEMPTS = 5;
var PHONE_RE = /^01[3-9]\d{8}$/;

function getSheet_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function readRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values.map(function (row) {
    // Defensive: recover a leading 0 lost by Sheets auto-number-parsing on any
    // pre-existing row that predates the text-forcing apostrophe in doPost.
    var phone = String(row[3]);
    if (/^[1-9]\d{9}$/.test(phone)) phone = '0' + phone;
    return {
      timestamp: row[0],
      name: row[1],
      school: row[2],
      phone: phone,
      timeMs: row[4],
      timeFormatted: row[5],
    };
  });
}

function attemptsForPhone_(sheet, phone) {
  return readRows_(sheet)
    .filter(function (r) { return r.phone === phone; })
    .sort(function (a, b) { return a.timeMs - b.timeMs; })
    .map(function (r) {
      return { timeMs: r.timeMs, timeFormatted: r.timeFormatted, timestamp: r.timestamp };
    });
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// GET {url}?phone=01XXXXXXXXX -> { ok:true, count, attempts:[{timeMs,timeFormatted,timestamp}] }
// fastest-first. Or { ok:false, error:'invalid_input' } if phone is malformed.
function doGet(e) {
  var phone = String((e && e.parameter && e.parameter.phone) || '').trim();
  if (!PHONE_RE.test(phone)) {
    return jsonOutput_({ ok: false, error: 'invalid_input' });
  }
  var sheet = getSheet_();
  var attempts = attemptsForPhone_(sheet, phone);
  return jsonOutput_({ ok: true, count: attempts.length, attempts: attempts });
}

// POST body (text/plain, JSON-encoded): { name, school, phone, timeMs, timeFormatted }
// -> { ok:true, count } on success
// -> { ok:false, error:'limit_reached', count, attempts } if phone already has MAX_ATTEMPTS rows
// -> { ok:false, error:'invalid_input' } on a malformed payload
function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonOutput_({ ok: false, error: 'invalid_input' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      return jsonOutput_({ ok: false, error: 'invalid_input' });
    }

    var name = String(body.name || '').trim().slice(0, 60);
    var school = String(body.school || '').trim().slice(0, 120);
    var phone = String(body.phone || '').trim();
    var timeMs = Number(body.timeMs);
    var timeFormatted = String(body.timeFormatted || '').trim();

    if (!name || !school || !PHONE_RE.test(phone) || !isFinite(timeMs) || timeMs <= 0) {
      return jsonOutput_({ ok: false, error: 'invalid_input' });
    }

    var sheet = getSheet_();
    var attempts = attemptsForPhone_(sheet, phone);

    if (attempts.length >= MAX_ATTEMPTS) {
      return jsonOutput_({ ok: false, error: 'limit_reached', count: attempts.length, attempts: attempts });
    }

    // Leading apostrophe forces Sheets to store the phone as text - otherwise it's
    // auto-parsed as a number and the leading 0 (e.g. 01799999999 -> 1799999999) is lost,
    // which silently breaks every phone lookup above.
    sheet.appendRow([new Date().toISOString(), name, school, "'" + phone, timeMs, timeFormatted]);

    return jsonOutput_({ ok: true, count: attempts.length + 1 });
  } finally {
    lock.releaseLock();
  }
}

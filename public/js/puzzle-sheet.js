(function (global) {
  var SHEET_API_URL = 'https://script.google.com/macros/s/AKfycbwHlwL3aq4MvlY2-1LGWIBGyoYKKZURtuh8B-3XzGLDknI_tgq_FOXGmKoqJXAmCTdSRg/exec';

  var PHONE_RE = /^01[3-9]\d{8}$/;

  function isValidPhone(phone) {
    return PHONE_RE.test(String(phone || '').trim());
  }

  // cb(err, data) where data is the parsed JSON response ({ ok, count, attempts, error }).
  function checkAttempts(phone, cb) {
    var url = SHEET_API_URL + '?phone=' + encodeURIComponent(phone);
    global.fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) { cb(null, data); })
      .catch(function (err) { cb(err, null); });
  }

  // payload: { name, school, phone, timeMs, timeFormatted }. cb(err, data) as above.
  // text/plain avoids a CORS preflight that the Apps Script Web App can't answer.
  function saveAttempt(payload, cb) {
    cb = cb || function () {};
    global.fetch(SHEET_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) { cb(null, data); })
      .catch(function (err) { cb(err, null); });
  }

  global.PuzzleSheet = {
    SHEET_API_URL: SHEET_API_URL,
    isValidPhone: isValidPhone,
    checkAttempts: checkAttempts,
    saveAttempt: saveAttempt,
  };
})(window);

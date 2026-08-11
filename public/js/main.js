(function () {
  var screens = {
    start: document.getElementById('screen-start'),
    game: document.getElementById('screen-game'),
    win: document.getElementById('screen-win'),
    leaderboard: document.getElementById('screen-leaderboard'),
  };

  function show(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
  }

  var board = document.getElementById('board');
  var tray = document.getElementById('tray');
  var progressCount = document.getElementById('progress-count');
  var progressTotal = document.getElementById('progress-total');
  var nameInput = document.getElementById('player-name');
  var schoolInput = document.getElementById('player-school');
  var phoneInput = document.getElementById('player-phone');
  var formErrorEl = document.getElementById('form-error');
  var saveNoteEl = document.getElementById('save-note');
  var btnStart = document.getElementById('btn-start');
  var timerValueEl = document.getElementById('timer-value');
  var winTimeValueEl = document.getElementById('win-time-value');
  var leaderboardListEl = document.getElementById('leaderboard-list');
  var leaderboardEmptyEl = document.getElementById('leaderboard-empty');

  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(n) {
    return String(n).split('').map(function (ch) {
      return /[0-9]/.test(ch) ? BN_DIGITS[+ch] : ch;
    }).join('');
  }

  var REGISTRATION_KEY = 'ks-puzzle.registration.v1';

  function loadRegistration() {
    try {
      var raw = window.localStorage.getItem(REGISTRATION_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      return {};
    }
  }
  function saveRegistration(reg) {
    try {
      window.localStorage.setItem(REGISTRATION_KEY, JSON.stringify(reg));
    } catch (e) {}
  }

  var savedRegistration = loadRegistration();
  nameInput.value = savedRegistration.name || '';
  schoolInput.value = savedRegistration.school || '';
  phoneInput.value = savedRegistration.phone || '';

  var timer = window.PuzzleTimer.createTimer({
    onTick: function (elapsedMs) {
      timerValueEl.textContent = toBn(window.PuzzleTimer.formatMMSS(elapsedMs));
    },
  });

  // Captured at the moment a round is allowed to start, so onComplete always
  // saves against the registration that round was actually checked/started with.
  var activeRegistration = null;

  function renderWinResult(elapsedMs) {
    winTimeValueEl.textContent = toBn(window.PuzzleTimer.formatMMSS(elapsedMs));
  }

  function renderAttempts(attempts) {
    attempts = attempts || [];
    leaderboardListEl.innerHTML = '';
    leaderboardEmptyEl.hidden = attempts.length > 0;
    attempts.forEach(function (entry, index) {
      var item = document.createElement('li');
      item.className = 'leaderboard-item' + (index === 0 ? ' is-first' : '');

      var rankEl = document.createElement('span');
      rankEl.className = 'leaderboard-rank bn';
      rankEl.textContent = toBn(index + 1);

      var timeEl = document.createElement('span');
      timeEl.className = 'leaderboard-time bn';
      timeEl.textContent = toBn(window.PuzzleTimer.formatMMSS(entry.timeMs));

      item.appendChild(rankEl);
      item.appendChild(timeEl);
      leaderboardListEl.appendChild(item);
    });
  }

  var PUZZLE_IMAGE_SRC = 'assets/puzzle-medal.png';

  var startCanvas = document.getElementById('start-medal-canvas');
  var winCanvas   = document.getElementById('win-medal-canvas');
  var ghostCanvas = document.getElementById('ghost-canvas');

  var sourceCanvas = null;
  var sourceFailed = false;
  var sourceCallbacks = [];

  function getSource(cb) {
    if (sourceCanvas) { cb(sourceCanvas); return; }
    if (sourceFailed) { cb(null); return; }
    sourceCallbacks.push(cb);
  }

  function drawInto(canvas, source) {
    canvas.width = source.width;
    canvas.height = source.height;
    canvas.getContext('2d').drawImage(source, 0, 0);
  }

  (function loadSource() {
    var image = new Image();
    image.onload = function () {
      sourceCanvas = window.PuzzleRender.normalizeSource(image);
      drawInto(startCanvas, sourceCanvas);
      drawInto(winCanvas, sourceCanvas);
      drawInto(ghostCanvas, sourceCanvas);
      sourceCallbacks.forEach(function (cb) { cb(sourceCanvas); });
      sourceCallbacks = [];
    };
    image.onerror = function () {
      sourceFailed = true;
      sourceCallbacks.forEach(function (cb) { cb(null); });
      sourceCallbacks = [];
    };
    image.src = PUZZLE_IMAGE_SRC;
  })();

  var game = null;
  function ensureGame() {
    if (game) return game;
    game = window.PuzzleGame.initGame({
      boardEl: board,
      trayEl: tray,
      getSource: getSource,
      onProgress: function (count, total) {
        progressCount.textContent = toBn(count);
        progressTotal.textContent = toBn(total);
        if (count === 0) {
          timer.reset();
          timer.start();
        }
      },
      onComplete: function () {
        timer.stop();
        var elapsedMs = timer.getElapsedMs();
        renderWinResult(elapsedMs);
        saveAttemptWithRetry(elapsedMs, 2);
      },
      onWin: function () {
        show('win');
        var canvas = document.getElementById('confetti-canvas');
        window.Confetti.burst(canvas);
      },
    });
    return game;
  }

  function saveAttemptWithRetry(elapsedMs, retriesLeft) {
    saveNoteEl.hidden = true;
    if (!activeRegistration) return;
    window.PuzzleSheet.saveAttempt({
      name: activeRegistration.name,
      school: activeRegistration.school,
      phone: activeRegistration.phone,
      timeMs: elapsedMs,
      timeFormatted: window.PuzzleTimer.formatMMSS(elapsedMs),
    }, function (err, data) {
      var ok = !err && data && data.ok === true;
      if (ok) return;
      if (retriesLeft > 0) {
        window.setTimeout(function () { saveAttemptWithRetry(elapsedMs, retriesLeft - 1); }, 1500);
        return;
      }
      saveNoteEl.hidden = false;
    });
  }

  function setFormError(message) {
    formErrorEl.textContent = message || '';
    formErrorEl.hidden = !message;
  }

  function setStartBusy(busy) {
    btnStart.disabled = busy;
    btnStart.textContent = busy ? 'যাচাই করা হচ্ছে...' : 'শুরু করো';
  }

  function attemptStart() {
    var name = (nameInput.value || '').trim();
    var school = (schoolInput.value || '').trim();
    var phone = (phoneInput.value || '').trim();

    setFormError('');

    if (!name) {
      setFormError('তোমার নাম লেখো।');
      return;
    }
    if (!school) {
      setFormError('তোমার স্কুলের নাম লেখো।');
      return;
    }
    if (!window.PuzzleSheet.isValidPhone(phone)) {
      setFormError('সঠিক ফোন নম্বর লেখো (উদাহরণ: 01XXXXXXXXX)।');
      return;
    }

    saveRegistration({ name: name, school: school, phone: phone });
    setStartBusy(true);

    window.PuzzleSheet.checkAttempts(phone, function (err, data) {
      setStartBusy(false);
      var ok = !err && data && data.ok === true;
      if (!ok) {
        setFormError('যাচাই করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করো।');
        return;
      }
      if (data.count >= 5) {
        renderAttempts(data.attempts);
        show('leaderboard');
        return;
      }
      activeRegistration = { name: name, school: school, phone: phone };
      show('game');
      ensureGame().start();
    });
  }

  document.getElementById('btn-start').addEventListener('click', attemptStart);

  document.getElementById('btn-replay').addEventListener('click', function () {
    show('start');
    attemptStart();
  });

  document.getElementById('btn-leaderboard-back').addEventListener('click', function () {
    show('start');
  });

  document.getElementById('btn-share').addEventListener('click', function () {
    var shareData = {
      title: 'কৃতী শিক্ষার্থী ২০২৫ — মেডেল পাজল',
      text: 'আমি ১০ মিনিট স্কুলের কৃতী শিক্ষার্থী মেডেল পাজল সম্পূর্ণ করেছি! তুমিও ট্রাই করো।',
      url: window.location.href,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareData.url).then(function () {
        var toast = document.getElementById('share-toast');
        toast.hidden = false;
        setTimeout(function () { toast.hidden = true; }, 2200);
      }).catch(function () {});
    }
  });
})();

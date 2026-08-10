(function () {
  var screens = {
    start: document.getElementById('screen-start'),
    game: document.getElementById('screen-game'),
    win: document.getElementById('screen-win'),
  };

  function show(name) {
    Object.keys(screens).forEach(function (key) {
      screens[key].hidden = key !== name;
    });
  }

  var board = document.getElementById('board');
  var tray = document.getElementById('tray');
  var ghostImg = document.getElementById('ghost-image');
  var progressCount = document.getElementById('progress-count');
  var progressTotal = document.getElementById('progress-total');

  var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  function toBn(n) {
    return String(n).split('').map(function (ch) {
      return /[0-9]/.test(ch) ? BN_DIGITS[+ch] : ch;
    }).join('');
  }

  var game = null;
  function ensureGame() {
    if (game) return game;
    game = window.PuzzleGame.initGame({
      boardEl: board,
      trayEl: tray,
      ghostImg: ghostImg,
      onProgress: function (count, total) {
        progressCount.textContent = toBn(count);
        progressTotal.textContent = toBn(total);
      },
      onWin: function () {
        show('win');
        var canvas = document.getElementById('confetti-canvas');
        window.Confetti.burst(canvas);
      },
    });
    return game;
  }

  document.getElementById('btn-start').addEventListener('click', function () {
    show('game');
    ensureGame().start();
  });

  document.getElementById('btn-replay').addEventListener('click', function () {
    show('game');
    ensureGame().reset();
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

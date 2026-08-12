(function (global) {
  var S = global.PuzzleShapes;

  var TRAY_COLS_MOBILE = 3;
  var TRAY_COLS_DESKTOP = 4;
  var TRAY_DESKTOP_MIN_WIDTH = 640; // must match .tray's CSS breakpoint
  var TRAY_GAP = 10; // must match .tray's CSS `gap`
  var TRAY_SLACK = 1; // px of headroom per row, against sub-pixel rounding

  function trayCols() {
    return global.innerWidth >= TRAY_DESKTOP_MIN_WIDTH ? TRAY_COLS_DESKTOP : TRAY_COLS_MOBILE;
  }

  function initGame(opts) {
    var boardEl = opts.boardEl;
    var trayEl = opts.trayEl;
    var getSource = opts.getSource;
    var onProgress = opts.onProgress || function () {};
    var onWin = opts.onWin || function () {};
    var onComplete = opts.onComplete || function () {};

    var grid = null;
    var scale = 1;
    var trayScale = 1;
    var lockedCount = 0;
    var pieces = [];
    var dragLayer = null;

    function ensureDragLayer() {
      if (dragLayer) return dragLayer;
      dragLayer = document.createElement('div');
      dragLayer.className = 'drag-layer';
      document.body.appendChild(dragLayer);
      return dragLayer;
    }

    // The board's padding box: the containing block placed pieces are positioned
    // against, and the box the ghost canvas fills. Every image->screen mapping
    // has to go through this. getBoundingClientRect() alone reports the border
    // box, so any border on .board would put the pieces on a different scale
    // from the ghost and leave a seam sliver beside each placed piece.
    function boardInnerRect() {
      var rect = boardEl.getBoundingClientRect();
      var cs = global.getComputedStyle(boardEl);
      var bl = parseFloat(cs.borderLeftWidth) || 0;
      var bt = parseFloat(cs.borderTopWidth) || 0;
      var br = parseFloat(cs.borderRightWidth) || 0;
      var bb = parseFloat(cs.borderBottomWidth) || 0;
      return {
        left: rect.left + bl,
        top: rect.top + bt,
        width: rect.width - bl - br,
        height: rect.height - bt - bb,
      };
    }

    function computeScale() {
      scale = boardInnerRect().width / S.IMG_W;
    }

    function layoutBoardSize() {
      var wrap = boardEl.parentElement;
      var cs = global.getComputedStyle(wrap);
      var availW = wrap.clientWidth  - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      var availH = wrap.clientHeight - parseFloat(cs.paddingTop)  - parseFloat(cs.paddingBottom);
      if (!(availW > 0) || !(availH > 0)) return;   // screen hidden / zero-size: leave as-is

      var w = Math.min(availW, 380);                 // keep the existing 380px cap
      var h = w * (S.IMG_H / S.IMG_W);
      if (h > availH) { h = availH; w = h * (S.IMG_W / S.IMG_H); }

      boardEl.style.width = w + 'px';
      boardEl.style.height = h + 'px';
    }

    // Sized independently from the board: always fits exactly trayCols()
    // pieces per row, regardless of board scale or piece count.
    function computeTrayScale(bboxW) {
      var cs = global.getComputedStyle(trayEl);
      var availW = trayEl.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (!(availW > 0) || !bboxW) { trayScale = scale; return; }
      var cols = trayCols();
      // A hair of slack: sizing the row to fit exactly leaves sub-pixel rounding
      // free to wrap the last piece of a row onto the next one.
      var perPieceW = (availW - TRAY_GAP * (cols - 1) - TRAY_SLACK) / cols;
      trayScale = perPieceW / bboxW;
    }

    function placeTrayStyle(p) {
      p.canvas.style.width = (p.bbox.w * trayScale) + 'px';
      p.canvas.style.height = (p.bbox.h * trayScale) + 'px';
    }

    function attachDrag(p) {
      var canvas = p.canvas;
      var startX = 0, startY = 0, originLeft = 0, originTop = 0;
      p.dragging = false;

      canvas.addEventListener('pointerdown', function (e) {
        if (p.locked) return;
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var layer = ensureDragLayer();
        layer.appendChild(canvas);
        canvas.style.position = 'fixed';
        canvas.style.left = rect.left + 'px';
        canvas.style.top = rect.top + 'px';
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        canvas.classList.add('dragging');
        // capture must be (re)acquired after reparenting, otherwise Chromium can
        // silently drop it and subsequent pointermove/pointerup never reach this element
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        originLeft = rect.left;
        originTop = rect.top;
        startX = e.clientX;
        startY = e.clientY;
        p.dragging = true;
      });

      canvas.addEventListener('pointermove', function (e) {
        if (!p.dragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        canvas.style.left = (originLeft + dx) + 'px';
        canvas.style.top = (originTop + dy) + 'px';
      });

      function endDrag() {
        if (!p.dragging) return;
        p.dragging = false;
        canvas.classList.remove('dragging');
        tryDropOrReturn(p);
      }

      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
    }

    function tryDropOrReturn(p) {
      var canvas = p.canvas;
      var pieceRect = canvas.getBoundingClientRect();
      var pieceCenterX = pieceRect.left + pieceRect.width / 2;
      var pieceCenterY = pieceRect.top + pieceRect.height / 2;

      // Derive drop targets from the same inner box and `scale` the rendering
      // uses, so a piece snaps to exactly where it will be drawn.
      computeScale();
      var inner = boardInnerRect();
      var cellWpx = S.CELL_W * scale;
      var cellHpx = S.CELL_H * scale;
      var targetCenterX = inner.left + (p.col + 0.5) * cellWpx;
      var targetCenterY = inner.top + (p.row + 0.5) * cellHpx;

      var dist = Math.hypot(pieceCenterX - targetCenterX, pieceCenterY - targetCenterY);
      var tolerance = Math.min(cellWpx, cellHpx) * 0.38;

      if (dist <= tolerance) {
        snapToBoard(p);
      } else {
        returnToTray(p);
      }
    }

    function snapToBoard(p) {
      computeScale();
      var canvas = p.canvas;
      canvas.style.position = 'absolute';
      canvas.style.left = (p.bbox.x * scale) + 'px';
      canvas.style.top = (p.bbox.y * scale) + 'px';
      canvas.style.width = (p.bbox.w * scale) + 'px';
      canvas.style.height = (p.bbox.h * scale) + 'px';
      canvas.classList.add('locked');
      boardEl.appendChild(canvas);
      p.locked = true;
      lockedCount++;
      onProgress(lockedCount, pieces.length);
      if (lockedCount === pieces.length) {
        onComplete();
        global.setTimeout(onWin, 420);
      }
    }

    function returnToTray(p) {
      var canvas = p.canvas;
      canvas.style.position = '';
      canvas.style.left = '';
      canvas.style.top = '';
      placeTrayStyle(p);
      trayEl.appendChild(canvas);
    }

    function shuffleArray(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    }

    function clearPieces() {
      pieces.forEach(function (p) { if (p.canvas && p.canvas.parentNode) p.canvas.parentNode.removeChild(p.canvas); });
      pieces = [];
      lockedCount = 0;
    }

    function build() {
      layoutBoardSize();
      computeScale();
      grid = S.buildGrid((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);

      getSource(function (source) {
        if (!source) {
          var msg = document.createElement('p');
          msg.className = 'tray-error bn';
          msg.setAttribute('role', 'alert');
          msg.textContent = 'ছবিটি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে নিয়ে পেজটি আবার লোড করো।';
          trayEl.appendChild(msg);
          return;
        }
        var ghostCanvas = boardEl.querySelector('.ghost-image');
        if (ghostCanvas) global.PuzzleRender.drawGhostGrid(ghostCanvas, source, grid);

        var rawPieces = global.PuzzleRender.renderPieces(source, grid);
        computeTrayScale(rawPieces[0].bbox.w);
        var order = shuffleArray(rawPieces.map(function (_, i) { return i; }));
        order.forEach(function (idx) {
          var p = rawPieces[idx];
          p.locked = false;
          p.canvas.className = 'piece';
          p.canvas.dataset.row = p.row;
          p.canvas.dataset.col = p.col;
          placeTrayStyle(p);
          trayEl.appendChild(p.canvas);
          attachDrag(p);
          pieces.push(p);
        });
        onProgress(0, pieces.length);
      });
    }

    function start() {
      clearPieces();
      trayEl.innerHTML = '';
      build();
    }

    function reset() {
      start();
    }

    global.addEventListener('resize', function () {
      // the game screen (and its ancestor .board-wrap) is display:none while on the
      // start/win screens; its rect is all-zero then, so skip relayout entirely —
      // start()/reset() already lay everything out fresh before the screen is shown again
      var wrapRect = boardEl.parentElement.getBoundingClientRect();
      if (!wrapRect.width || !wrapRect.height) return;

      layoutBoardSize();
      computeScale();
      if (pieces.length) computeTrayScale(pieces[0].bbox.w);
      pieces.forEach(function (p) {
        if (p.dragging) return; // leave an in-progress drag alone; it uses fresh rects on drop
        if (p.locked) {
          p.canvas.style.left = (p.bbox.x * scale) + 'px';
          p.canvas.style.top = (p.bbox.y * scale) + 'px';
          p.canvas.style.width = (p.bbox.w * scale) + 'px';
          p.canvas.style.height = (p.bbox.h * scale) + 'px';
        } else {
          placeTrayStyle(p);
        }
      });
    });

    return { start: start, reset: reset };
  }

  global.PuzzleGame = { initGame: initGame };
})(window);

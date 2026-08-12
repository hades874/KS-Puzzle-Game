(function (global) {
  var S = global.PuzzleShapes;

  function buildPath2D(segments, offsetX, offsetY) {
    var p = new Path2D();
    segments.forEach(function (seg) {
      if (seg.type === 'M') p.moveTo(seg.x - offsetX, seg.y - offsetY);
      else if (seg.type === 'L') p.lineTo(seg.x - offsetX, seg.y - offsetY);
      else if (seg.type === 'C') {
        p.bezierCurveTo(
          seg.x1 - offsetX, seg.y1 - offsetY,
          seg.x2 - offsetX, seg.y2 - offsetY,
          seg.x - offsetX, seg.y - offsetY
        );
      }
    });
    p.closePath();
    return p;
  }

  // Visible widths of the cut edge, in image-space units. They scale with the
  // piece, which is what we want: a smaller tray piece should carry a
  // proportionally finer edge, not a constant screen-pixel one.
  var PIECE_HALO_W = 2.5;  // dark band, keeps the cut readable over bright gold
  var PIECE_EDGE_W = 1.1;  // light line right at the silhouette

  function renderPieces(image, grid) {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var pieces = [];
    for (var row = 0; row < S.ROWS; row++) {
      for (var col = 0; col < S.COLS; col++) {
        var bbox = S.getPieceBBox(row, col);
        var segments = S.getPieceSegments(grid, row, col);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(bbox.w * dpr);
        canvas.height = Math.round(bbox.h * dpr);
        canvas.style.width = bbox.w + 'px';
        canvas.style.height = bbox.h + 'px';

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        var path = buildPath2D(segments, bbox.x, bbox.y);

        // Both strokes stay inside the clip, at double width so the visible
        // band is the intended weight. That is what keeps the seams even: each
        // piece paints only its own half of a shared cut, and since the two
        // halves are geometrically identical they butt together into one line
        // instead of overlapping and compounding their alpha.
        ctx.save();
        ctx.clip(path);
        ctx.drawImage(image, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = PIECE_HALO_W * 2;
        ctx.stroke(path);
        ctx.strokeStyle = 'rgba(255,255,255,0.60)';
        ctx.lineWidth = PIECE_EDGE_W * 2;
        ctx.stroke(path);
        ctx.restore();

        pieces.push({ row: row, col: col, bbox: bbox, canvas: canvas });
      }
    }
    return pieces;
  }

  // image: HTMLImageElement (loaded). Returns a canvas exactly S.IMG_W x S.IMG_H,
  // with the source drawn centred and contain-fit (no crop) and transparency intact —
  // the source asset is already a straight, background-removed cutout.
  function normalizeSource(image) {
    var canvas = document.createElement('canvas');
    canvas.width = S.IMG_W;
    canvas.height = S.IMG_H;
    var ctx = canvas.getContext('2d');

    var nw = image.naturalWidth || image.width, nh = image.naturalHeight || image.height;
    if (!nw || !nh) return canvas;

    var s = Math.min(S.IMG_W / nw, S.IMG_H / nh);
    var dw = nw * s, dh = nh * s;
    ctx.drawImage(image, (S.IMG_W - dw) / 2, (S.IMG_H - dh) / 2, dw, dh);

    return canvas;
  }

  var GHOST_IMAGE_ALPHA = 0.22; // the dimmed picture behind the seams
  var GHOST_LINE_ALPHA  = 0.42; // seams sit above it, readable but not loud
  var GHOST_HALO_W      = 2.5;  // mirrors the placed pieces' dark halo
  var GHOST_LINE_W      = 1;

  function appendOpenPath(path, segments) {
    segments.forEach(function (seg) {
      if (seg.type === 'M') path.moveTo(seg.x, seg.y);
      else if (seg.type === 'L') path.lineTo(seg.x, seg.y);
      else path.bezierCurveTo(seg.x1, seg.y1, seg.x2, seg.y2, seg.x, seg.y);
    });
  }

  // Redraws `canvas` as the board's ghost hint: the dimmed picture plus the
  // jigsaw seams for `grid`, so the outline matches the real piece shapes.
  // Each interior seam is stroked exactly once — stroking the 20 closed piece
  // paths instead would draw every seam twice and double the line weight.
  // Alpha is baked in rather than left to CSS so the seams can stay legible
  // while the picture underneath stays faint.
  function drawGhostGrid(canvas, source, grid) {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.round(S.IMG_W * dpr);
    canvas.height = Math.round(S.IMG_H * dpr);

    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, S.IMG_W, S.IMG_H);

    ctx.globalAlpha = GHOST_IMAGE_ALPHA;
    ctx.drawImage(source, 0, 0, S.IMG_W, S.IMG_H);
    ctx.globalAlpha = 1;

    var seams = new Path2D();
    for (var r = 1; r < S.ROWS; r++) {
      for (var c = 0; c < S.COLS; c++) {
        appendOpenPath(seams, S.getEdgeSegments(grid, 'h', r, c));
      }
    }
    for (var c2 = 1; c2 < S.COLS; c2++) {
      for (var r2 = 0; r2 < S.ROWS; r2++) {
        appendOpenPath(seams, S.getEdgeSegments(grid, 'v', r2, c2));
      }
    }

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = GHOST_HALO_W;
    ctx.stroke(seams);
    ctx.strokeStyle = 'rgba(255,255,255,' + GHOST_LINE_ALPHA + ')';
    ctx.lineWidth = GHOST_LINE_W;
    ctx.stroke(seams);
  }

  global.PuzzleRender = { renderPieces: renderPieces, normalizeSource: normalizeSource, drawGhostGrid: drawGhostGrid };
})(window);

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

        ctx.save();
        ctx.clip(path);
        ctx.drawImage(image, -bbox.x, -bbox.y, S.IMG_W, S.IMG_H);
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 2.5;
        ctx.stroke(path);
        ctx.restore();

        pieces.push({ row: row, col: col, bbox: bbox, canvas: canvas });
      }
    }
    return pieces;
  }

  global.PuzzleRender = { renderPieces: renderPieces };
})(window);

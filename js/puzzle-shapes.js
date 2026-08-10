(function (global) {
  var ROWS = 4;
  var COLS = 3;
  var IMG_W = 1080;
  var IMG_H = 1600;
  var CELL_W = IMG_W / COLS; // 360
  var CELL_H = IMG_H / ROWS; // 400

  function mulberry32(seed) {
    var s = seed >>> 0;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeEdgeData(rand) {
    return {
      sign: rand() < 0.5 ? -1 : 1,
      t: 0.46 + rand() * 0.08,   // knob center, 0.46-0.54
      amp: 0.18 + rand() * 0.04, // amplitude as fraction of edge length
    };
  }

  function buildGrid(seed) {
    var rand = mulberry32(seed);
    var hEdges = []; // [ROWS+1][COLS] horizontal edges, canonical dir = left->right
    for (var r = 0; r <= ROWS; r++) {
      var hrow = [];
      for (var c = 0; c < COLS; c++) {
        hrow.push((r === 0 || r === ROWS) ? null : makeEdgeData(rand));
      }
      hEdges.push(hrow);
    }
    var vEdges = []; // [ROWS][COLS+1] vertical edges, canonical dir = top->bottom
    for (var r2 = 0; r2 < ROWS; r2++) {
      var vrow = [];
      for (var c2 = 0; c2 <= COLS; c2++) {
        vrow.push((c2 === 0 || c2 === COLS) ? null : makeEdgeData(rand));
      }
      vEdges.push(vrow);
    }
    return { hEdges: hEdges, vEdges: vEdges };
  }

  // Catmull-Rom spline through points -> cubic bezier segments (excludes the first point/moveTo)
  function catmullRomToBezier(points) {
    var segs = [];
    var n = points.length;
    for (var i = 0; i < n - 1; i++) {
      var p0 = points[Math.max(0, i - 1)];
      var p1 = points[i];
      var p2 = points[i + 1];
      var p3 = points[Math.min(n - 1, i + 2)];
      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;
      segs.push({ type: 'C', x1: cp1x, y1: cp1y, x2: cp2x, y2: cp2y, x: p2.x, y: p2.y });
    }
    return segs;
  }

  // anchor points in local (u, v) space: u = fraction along edge (0..1), v = fraction of amplitude (signed shape)
  // (u offset from center t is added at build time for the middle ones)
  function buildAnchorsUV(t) {
    return [
      [0, 0],
      [t - 0.28, 0],
      [t - 0.13, 0.55],
      [t - 0.20, 0.85],
      [t, 1.05],
      [t + 0.20, 0.85],
      [t + 0.13, 0.55],
      [t + 0.28, 0],
      [1, 0],
    ];
  }

  function edgeSegments(x0, y0, x1, y1, edge, orientation) {
    if (!edge) {
      return [{ type: 'L', x: x1, y: y1 }];
    }
    var length = orientation === 'h' ? (x1 - x0) : (y1 - y0); // signed
    var amp = edge.amp * Math.abs(length) * edge.sign;
    var anchors = buildAnchorsUV(edge.t);
    var pts = anchors.map(function (uv) {
      var u = uv[0], v = uv[1];
      var along = u * length;
      var perp = v * amp;
      if (orientation === 'h') {
        return { x: x0 + along, y: y0 + perp };
      }
      return { x: x0 + perp, y: y0 + along };
    });
    return catmullRomToBezier(pts);
  }

  function getPieceSegments(grid, row, col) {
    var x0 = col * CELL_W, y0 = row * CELL_H;
    var x1 = (col + 1) * CELL_W, y1 = (row + 1) * CELL_H;
    var segments = [{ type: 'M', x: x0, y: y0 }];
    // top: left -> right
    segments.push.apply(segments, edgeSegments(x0, y0, x1, y0, grid.hEdges[row][col], 'h'));
    // right: top -> bottom
    segments.push.apply(segments, edgeSegments(x1, y0, x1, y1, grid.vEdges[row][col + 1], 'v'));
    // bottom: right -> left (reversed)
    segments.push.apply(segments, edgeSegments(x1, y1, x0, y1, grid.hEdges[row + 1][col], 'h'));
    // left: bottom -> top (reversed)
    segments.push.apply(segments, edgeSegments(x0, y1, x0, y0, grid.vEdges[row][col], 'v'));
    return segments;
  }

  function getPieceBBox(row, col) {
    var overhangX = CELL_W * 0.34;
    var overhangY = CELL_H * 0.34;
    return {
      x: col * CELL_W - overhangX,
      y: row * CELL_H - overhangY,
      w: CELL_W + 2 * overhangX,
      h: CELL_H + 2 * overhangY,
    };
  }

  global.PuzzleShapes = {
    ROWS: ROWS,
    COLS: COLS,
    IMG_W: IMG_W,
    IMG_H: IMG_H,
    CELL_W: CELL_W,
    CELL_H: CELL_H,
    buildGrid: buildGrid,
    getPieceSegments: getPieceSegments,
    getPieceBBox: getPieceBBox,
  };
})(window);

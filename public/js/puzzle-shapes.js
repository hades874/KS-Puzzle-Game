(function (global) {
  var ROWS = 5;
  var COLS = 4;
  var IMG_W = 450;
  var IMG_H = 600;
  var CELL_W = IMG_W / COLS; // 112.5
  var CELL_H = IMG_H / ROWS; // 120

  // Knob geometry is keyed to a single reference length rather than to each
  // edge's own length, so a knob is the same size and shape whether it sits on
  // a horizontal or a vertical seam. Cells are not square (112.5 x 120), so
  // keying off the edge would make vertical-seam knobs ~7% larger.
  var KNOB_REF     = Math.min(CELL_W, CELL_H); // 112.5
  var KNOB_AMP_MIN = 0.18;
  var KNOB_AMP_MAX = 0.22;
  var KNOB_PEAK    = 1.05;  // tallest anchor, in units of amp
  var KNOB_HALF_W  = 0.28;  // half knob width, as a fraction of KNOB_REF

  // Farthest a knob reaches past its cell edge. The spline runs through its peak
  // anchor without overshooting it (measured: -0.11px), so this is a tight bound
  // rather than an estimate — the same on both axes now that knobs are uniform.
  var KNOB_REACH = KNOB_PEAK * KNOB_AMP_MAX * KNOB_REF; // 25.99
  var OVERHANG   = Math.ceil(KNOB_REACH) + 2;           // 28

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
      t: 0.46 + rand() * 0.08, // knob center, 0.46-0.54
      amp: KNOB_AMP_MIN + rand() * (KNOB_AMP_MAX - KNOB_AMP_MIN), // fraction of KNOB_REF
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

  // Anchor points in local (u, v) space: u = fraction along the edge (0..1),
  // v = fraction of amplitude (signed). `k` = KNOB_REF / edge length, which
  // rescales the u offsets so the knob is the same width in px on every edge
  // instead of the same fraction of a varying edge length.
  function buildAnchorsUV(t, k) {
    var w  = KNOB_HALF_W * k; // base of the tab
    var nk = 0.13 * k;        // neck, pulled inwards to undercut the tab
    var sh = 0.20 * k;        // shoulder, flaring back out above the neck
    return [
      [0, 0],
      [t - w,  0],
      [t - nk, 0.55],
      [t - sh, 0.85],
      [t,      KNOB_PEAK],
      [t + sh, 0.85],
      [t + nk, 0.55],
      [t + w,  0],
      [1, 0],
    ];
  }

  // Anchor points for one edge, always built in the canonical direction
  // (h: left->right, v: top->bottom) so the two pieces sharing an edge derive
  // it from identical inputs. Building it from the traversal direction instead
  // would mirror the knob to (1 - t), leaving the pieces misaligned by
  // |1 - 2t| * cell — up to ~8% of a cell — and drawing the seam twice.
  function edgeAnchorPoints(x0, y0, x1, y1, edge, orientation) {
    var length = orientation === 'h' ? (x1 - x0) : (y1 - y0); // positive: canonical
    var amp = edge.amp * KNOB_REF * edge.sign; // absolute, so orientation cannot skew it
    return buildAnchorsUV(edge.t, KNOB_REF / length).map(function (uv) {
      var along = uv[0] * length;
      var perp = uv[1] * amp;
      if (orientation === 'h') {
        return { x: x0 + along, y: y0 + perp };
      }
      return { x: x0 + perp, y: y0 + along };
    });
  }

  // Segments running from (x0,y0) to (x1,y1). When that traversal opposes the
  // canonical direction, the canonical curve is built and then reversed, so the
  // resulting geometry is identical either way.
  function edgeSegments(x0, y0, x1, y1, edge, orientation, reversed) {
    if (!edge) {
      return [{ type: 'L', x: x1, y: y1 }];
    }
    var pts = reversed
      ? edgeAnchorPoints(x1, y1, x0, y0, edge, orientation).reverse()
      : edgeAnchorPoints(x0, y0, x1, y1, edge, orientation);
    return catmullRomToBezier(pts);
  }

  function getPieceSegments(grid, row, col) {
    var x0 = col * CELL_W, y0 = row * CELL_H;
    var x1 = (col + 1) * CELL_W, y1 = (row + 1) * CELL_H;
    var segments = [{ type: 'M', x: x0, y: y0 }];
    // top: left -> right
    segments.push.apply(segments, edgeSegments(x0, y0, x1, y0, grid.hEdges[row][col], 'h', false));
    // right: top -> bottom
    segments.push.apply(segments, edgeSegments(x1, y0, x1, y1, grid.vEdges[row][col + 1], 'v', false));
    // bottom: right -> left (reversed)
    segments.push.apply(segments, edgeSegments(x1, y1, x0, y1, grid.hEdges[row + 1][col], 'h', true));
    // left: bottom -> top (reversed)
    segments.push.apply(segments, edgeSegments(x0, y1, x0, y0, grid.vEdges[row][col], 'v', true));
    return segments;
  }

  // One interior seam, in canonical direction — used to draw the board's cut
  // lines exactly once each, instead of twice via the adjacent pieces.
  function getEdgeSegments(grid, orientation, row, col) {
    if (orientation === 'h') {
      var hx0 = col * CELL_W, hy = row * CELL_H, hx1 = (col + 1) * CELL_W;
      return [{ type: 'M', x: hx0, y: hy }]
        .concat(edgeSegments(hx0, hy, hx1, hy, grid.hEdges[row][col], 'h', false));
    }
    var vx = col * CELL_W, vy0 = row * CELL_H, vy1 = (row + 1) * CELL_H;
    return [{ type: 'M', x: vx, y: vy0 }]
      .concat(edgeSegments(vx, vy0, vx, vy1, grid.vEdges[row][col], 'v', false));
  }

  // The drawing box for a piece: its cell plus just enough room for a knob to
  // reach out of any side. Padding is OVERHANG on both axes because knobs are
  // now uniform; deriving it from each cell dimension would pad the wrong axis,
  // since horizontal reach comes from the *vertical* edges and vice versa.
  function getPieceBBox(row, col) {
    return {
      x: col * CELL_W - OVERHANG,
      y: row * CELL_H - OVERHANG,
      w: CELL_W + 2 * OVERHANG,
      h: CELL_H + 2 * OVERHANG,
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
    getEdgeSegments: getEdgeSegments,
    getPieceBBox: getPieceBBox,
  };
})(window);

(function (global) {
  function burst(canvas, opts) {
    opts = opts || {};
    var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = canvas.clientWidth, H = canvas.clientHeight;
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var ctx = canvas.getContext('2d');
    if (reduceMotion || !W || !H) return;

    var colors = ['#E8001D', '#1CAB55', '#FFD600', '#274FE3', '#F14545'];
    var count = opts.count || 90;
    var particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: W / 2,
        y: H * 0.32,
        vx: (Math.random() - 0.5) * 9,
        vy: -Math.random() * 9 - 3,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 0,
      });
    }

    function tick() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var alive = false;
      particles.forEach(function (p) {
        p.life++;
        p.vy += 0.28;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.life < 150) alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - p.life / 150);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      if (alive) {
        global.requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    }
    tick();
  }

  global.Confetti = { burst: burst };
})(window);

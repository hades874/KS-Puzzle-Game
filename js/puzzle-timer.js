(function (global) {
  var TICK_MS = 250;

  function createTimer(opts) {
    opts = opts || {};
    var onTick = opts.onTick || function () {};

    var running = false;
    var startTime = 0;
    var accumulatedMs = 0;
    var intervalId = null;
    var lastSeconds = -1;

    function getElapsedMs() {
      if (!running) return accumulatedMs;
      return accumulatedMs + (Date.now() - startTime);
    }

    function tick() {
      var seconds = Math.floor(getElapsedMs() / 1000);
      if (seconds !== lastSeconds) {
        lastSeconds = seconds;
        onTick(getElapsedMs());
      }
    }

    function start() {
      if (running) return;
      running = true;
      startTime = Date.now();
      lastSeconds = -1;
      tick();
      intervalId = global.setInterval(tick, TICK_MS);
    }

    function stop() {
      if (!running) return;
      accumulatedMs = getElapsedMs();
      running = false;
      global.clearInterval(intervalId);
      intervalId = null;
    }

    function reset() {
      stop();
      accumulatedMs = 0;
      lastSeconds = -1;
    }

    return { start: start, stop: stop, reset: reset, getElapsedMs: getElapsedMs };
  }

  function pad2(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function formatMMSS(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return pad2(minutes) + ':' + pad2(seconds);
  }

  global.PuzzleTimer = { createTimer: createTimer, formatMMSS: formatMMSS };
})(window);

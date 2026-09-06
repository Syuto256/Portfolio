/* ===========================================================
   深夜遊戯 共通スクリプト
   - 設定パネル（走査線／タイプライター／高コントラスト）
   - システム時刻
   設定は保存しない（localStorage不使用）
   =========================================================== */
(function () {
  var root = document.documentElement;

  /* ---- システム時刻 ---- */
  var hm = document.getElementById('hm');
  var ymd = document.getElementById('ymd');
  if (hm && ymd) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    var tick = function () {
      var d = new Date();
      var w = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
      hm.textContent = p(d.getHours()) + ':' + p(d.getMinutes());
      ymd.textContent = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + w;
    };
    tick();
    setInterval(tick, 15000);
  }

  /* ---- 設定パネル ---- */
  var btn = document.getElementById('cfgBtn');
  var cfg = document.getElementById('cfg');
  if (btn && cfg) {
    btn.addEventListener('click', function () {
      var open = cfg.classList.toggle('open');
      cfg.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  var optScan = document.getElementById('optScan');
  if (optScan) {
    optScan.addEventListener('change', function () {
      root.classList.toggle('scan-on', this.checked);
    });
  }

  var optHc = document.getElementById('optHc');
  if (optHc) {
    optHc.addEventListener('change', function () {
      root.classList.toggle('hc', this.checked);
    });
  }

  /* ---- タイプライター（デフォルトOFF） ---- */
  var say = document.querySelector('[data-typewriter]');
  var optTw = document.getElementById('optTw');
  if (say && optTw) {
    var lines = [].map.call(say.children, function (el) { return el.textContent; });
    var timer = null;

    var stop = function () {
      if (timer) { clearInterval(timer); timer = null; }
      [].forEach.call(say.children, function (el, i) {
        el.textContent = lines[i];
        el.classList.remove('tw');
      });
    };

    optTw.addEventListener('change', function () {
      if (!this.checked) { stop(); return; }
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || window.innerWidth < 768) { return; }

      [].forEach.call(say.children, function (el) {
        el.textContent = '';
        el.classList.add('tw', 'done');
      });

      var li = 0, ci = 0;
      timer = setInterval(function () {
        if (li >= lines.length) { stop(); return; }
        say.children[li].textContent = lines[li].slice(0, ++ci);
        if (ci >= lines[li].length) { li++; ci = 0; }
      }, 28);
    });

    /* 画面のどこをクリックしても全文を即座に表示する */
    document.addEventListener('click', function () { if (timer) stop(); });
  }
})();

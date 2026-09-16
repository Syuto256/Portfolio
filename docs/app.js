/* ===========================================================
   Poro 共通スクリプト
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
    var showcaseTimer = null;

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

  /* ---- ホームの展示ケース ---- */
  var showcase = document.getElementById('showcase');
  if (showcase) {
    var slides = [].slice.call(showcase.querySelectorAll('[data-showcase-slide]'));
    var selectors = [].slice.call(showcase.querySelectorAll('[data-showcase-select]'));
    var count = document.getElementById('showcase-count');
    var status = document.getElementById('showcase-status');
    var pause = document.getElementById('showcase-pause');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var current = 0;
    var timer = null;
    var stopped = reduceMotion.matches;
    var hovering = false;

    function renderShowcase(announce) {
      slides.forEach(function (slide, index) {
        var active = index === current;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', active ? 'false' : 'true');
        if ('inert' in slide) slide.inert = !active;
      });
      selectors.forEach(function (button, index) {
        button.setAttribute('aria-pressed', index === current ? 'true' : 'false');
      });
      count.textContent = String(current + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      if (announce) status.textContent = '展示を選択しました';
    }

    function scheduleShowcase() {
      if (showcaseTimer) { clearTimeout(showcaseTimer); showcaseTimer = null; }
      pause.textContent = stopped ? '自動切替を開始' : '自動切替を停止';
      status.textContent = stopped ? '自動切替は停止中' : hovering ? '閲覧中は一時停止' : '12秒ごとに切り替え';
      if (stopped || hovering || document.hidden) return;
      showcaseTimer = setTimeout(function () {
        current = (current + 1) % slides.length;
        renderShowcase(false);
        scheduleShowcase();
      }, 12000);
    }

    function selectShowcase(index) {
      stopped = true;
      current = (index + slides.length) % slides.length;
      renderShowcase(true);
      scheduleShowcase();
    }

    selectors.forEach(function (button, index) {
      button.addEventListener('click', function () { selectShowcase(index); });
    });
    document.getElementById('showcase-prev').addEventListener('click', function () { selectShowcase(current - 1); });
    document.getElementById('showcase-next').addEventListener('click', function () { selectShowcase(current + 1); });
    pause.addEventListener('click', function () { stopped = !stopped; scheduleShowcase(); });
    showcase.addEventListener('pointerenter', function (event) { if (event.pointerType === 'mouse') { hovering = true; scheduleShowcase(); } });
    showcase.addEventListener('pointerleave', function () { hovering = false; scheduleShowcase(); });
    showcase.addEventListener('focusin', function (event) { if (event.target !== pause) { stopped = true; scheduleShowcase(); } });
    document.addEventListener('visibilitychange', scheduleShowcase);
    reduceMotion.addEventListener('change', function (event) { if (event.matches) stopped = true; scheduleShowcase(); });
    window.addEventListener('pagehide', function () { if (showcaseTimer) clearTimeout(showcaseTimer); });
    renderShowcase(false);
    scheduleShowcase();
  }
})();

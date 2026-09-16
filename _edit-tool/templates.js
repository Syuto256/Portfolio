'use strict';
/*
 * Poroサイトの静的HTMLをコンテンツJSONから生成するテンプレート集。
 * 既存の手書きページ(index.html / proposal-001.html / analysis-001.html /
 * works.html / profile.html / faq.html / recovered.html / recovered-001.html /
 * license.html)のマークアップ・クラス名を1つも変えずに文字列化している。
 * 「ポートフォリオ改修ガイド」の変更禁止事項(色/フォント/角丸/影/演出/ナビ構成)は
 * ここに固定で埋め込まれており、編集画面からは変更できない。
 */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 1行の入力を<p>段落に分割する(空行区切り)。改行のみの場合は1段落として扱う。
function paragraphs(text) {
  var blocks = String(text || '').split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
  if (!blocks.length) return '';
  return blocks.map(function (b) {
    return '<p>' + esc(b).replace(/\n/g, '<br>') + '</p>';
  }).join('\n        ');
}

var FILE_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1h7l3 3v11H3zM4 2v12h8V5H9V2z"/></svg>';

var FONT_LINK = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=DotGothic16&family=JetBrains+Mono:wght@400;500&family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet">\n<link rel="stylesheet" href="style.css">';

function head(title, description) {
  return [
    '<!DOCTYPE html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + esc(title) + '</title>',
    '<meta name="description" content="' + esc(description) + '">',
    '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 fill=%27%23234f73%27/%3E%3Cpath d=%27M16 5 27 16 16 27 5 16Z%27 fill=%27none%27 stroke=%27%23e8f1f5%27 stroke-width=%272%27/%3E%3C/svg%3E">',
    FONT_LINK,
    '</head>',
    '<body>',
    '',
    '<div class="scan" aria-hidden="true"></div>',
    ''
  ].join('\n');
}

var NAV_ITEMS = [
  { key: 'proposal', href: 'proposals.html', label: '企画書' },
  { key: 'analysis', href: 'analysis-001.html', label: '分析' },
  { key: 'works', href: 'works.html', label: '作ったゲーム' },
  { key: 'recovered', href: 'recovered.html', label: 'ボツ企画・失敗談' },
  { key: 'profile', href: 'profile.html', label: 'プロフィール' },
  { key: 'faq', href: 'faq.html', label: 'FAQ' }
];

var CFG_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7 1h2v2H7zM7 13h2v2H7zM1 7h2v2H1zM13 7h2v2h-2zM3 3h2v2H3zM11 3h2v2h-2zM3 11h2v2H3zM11 11h2v2h-2zM6 6h4v4H6z"/></svg>';
var MAIL_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1 3h14v10H1zM2 4v1h12V4zM3 6l5 4 5-4v1l-5 4-5-4z"/></svg>';

function headerBar(opts) {
  var contactHref = opts.isProfile ? '#contact' : 'profile.html#contact';
  var navHtml = NAV_ITEMS.map(function (it) {
    var current = it.key === opts.activeKey ? ' aria-current="page"' : '';
    return '    <a href="' + it.href + '"' + current + '>' + it.label + '</a>';
  }).join('\n');
  return [
    '<header class="bar">',
    '  <a class="logo" href="index.html"><span>Poro</span><small>ゲーム制作</small></a>',
    '  <nav class="nav" aria-label="サイト内ナビゲーション">',
    navHtml,
    '  </nav>',
    '  <div class="right">',
    '    <button id="cfgBtn" aria-expanded="false" aria-controls="cfg">',
    '      ' + CFG_ICON + '設定</button>',
    '    <a href="' + contactHref + '">',
    '      ' + MAIL_ICON + '連絡先</a>',
    '  </div>',
    '</header>'
  ].join('\n');
}

function cfgPanel() {
  return [
    '<section class="cfg" id="cfg" hidden>',
    '  <h2>設定</h2>',
    '  <label><input type="checkbox" id="optScan">走査線を表示する</label>',
    '  <label><input type="checkbox" id="optTw">文字を1文字ずつ表示する</label>',
    '  <label><input type="checkbox" id="optHc">高コントラスト表示にする</label>',
    '  <p class="note">設定は保存されません。このページを離れると初期状態に戻ります。</p>',
    '</section>'
  ].join('\n');
}

function footerHtml(profileName, tail) {
  return [
    '<footer>',
    '  <span>&copy; 2026 ' + esc(profileName) + ' ／ Poro</span>',
    '  <span class="mid"><a href="license.html">ライセンス</a><span>更新履歴は準備中</span></span>',
    '  <span class="tail">好きなものの、その奥へ。</span>',
    '</footer>',
    '',
    '<script src="app.js" defer></script>',
    '</body>',
    '</html>'
  ].join('\n');
}

// ---- 書類棚(サイドバー)。全ページで内容が一致するよう、常にここから生成する ----
function titleForFilename(title) {
  return String(title || '').replace(/[。.]+$/, '');
}
function buildDocuments(content) {
  var docs = [];
  content.proposals.forEach(function (p) {
    var no = p.id.split('-')[1];
    docs.push({ href: p.id + '.html', fn: 'proposal_' + no + '_' + titleForFilename(p.title) + '.pdf', date: p.date });
  });
  content.analyses.forEach(function (a) {
    var no = a.id.split('-')[1];
    docs.push({ href: a.id + '.html', fn: 'analysis_' + no + '_' + titleForFilename(a.title) + '.txt', date: a.date });
  });
  content.recovered.forEach(function (r) {
    if (r.detail) docs.push({ href: r.id + '.html', fn: r.filename, date: r.date });
  });
  docs.sort(function (a, b) { return (b.date || '') < (a.date || '') ? -1 : 1; });
  docs.push({ href: 'profile.html', fn: 'profile.dat', date: null, isProfile: true });
  return docs;
}

function filesSidebar(documents, currentHref, shortDate) {
  var items = documents.map(function (d) {
    var current = d.href === currentHref ? ' aria-current="page"' : '';
    var dt = d.date ? (shortDate ? d.date.slice(5) : d.date) : (d.isProfile ? (shortDate ? '08-18' : '2026-08-18') : '');
    return '          <li><a href="' + d.href + '"' + current + '>' + FILE_ICON + '<span class="fn">' + esc(d.fn) + '</span><span class="dt">' + esc(dt) + '</span></a></li>';
  }).join('\n');
  return [
    '      <div class="pane">',
    '        <div class="sec-h"><h2>書類棚</h2><span class="en">/ Documents</span></div>',
    '        <p class="sec-sub">最近の文書</p>',
    '        <ul class="files">',
    items,
    '        </ul>',
    '        <span class="openall">上の書類名から開けます</span>',
    '      </div>'
  ].join('\n');
}

function clockPane() {
  return [
    '      <div class="pane">',
    '        <div class="sec-h"><h2>システム時刻</h2></div>',
    '        <div class="clock">',
    '          <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13"/><path d="M16 8v8l6 3"/></svg>',
    '          <div>',
    '            <div class="hm" id="hm">--:--</div>',
    '            <div class="ymd" id="ymd">---------- ---</div>',
    '          </div>',
    '        </div>',
    '      </div>'
  ].join('\n');
}

function sideColumn(documents, currentHref, shortDate) {
  return [
    '    <div class="side">',
    filesSidebar(documents, currentHref, shortDate),
    '',
    clockPane(),
    '    </div>'
  ].join('\n');
}

function crumb(parts) {
  // 既存表記に合わせる: 中間の階層までは空白区切り、最後(現在地・太字)の前だけ " / " を挟む
  var pieces = parts.map(function (p, i) {
    if (i === parts.length - 1) return '<b>' + esc(p.label) + '</b>';
    return '<a href="' + esc(p.href) + '">' + esc(p.label) + '</a>';
  });
  var last = pieces.pop();
  var head = pieces.join(' ');
  var inner = parts.length >= 3 ? (head + ' / ' + last) : (head + ' ' + last);
  return '      <p class="crumb">' + inner + '</p>';
}

function specTable(rows) {
  var body = rows.map(function (r) {
    return '            <tr><th>' + esc(r.k) + '</th><td>' + esc(r.v) + '</td></tr>';
  }).join('\n');
  return [
    '        <table class="spec">',
    '          <tbody>',
    body,
    '          </tbody>',
    '        </table>'
  ].join('\n');
}

function figureBlock(figure) {
  if (!figure) return '';
  var media = figure.rawSvg
    ? '<svg viewBox="' + esc(figure.viewBox || '0 0 640 160') + '" role="img" aria-label="' + esc(figure.caption || '図') + '">' + figure.rawSvg + '</svg>'
    : (figure.image ? '<img src="' + esc(figure.image) + '" alt="' + esc(figure.caption || '') + '">' : '');
  if (!media) return '';
  return [
    '        <figure class="figure">',
    '          ' + media,
    '          <figcaption>' + esc(figure.caption || '') + '</figcaption>',
    '        </figure>'
  ].join('\n');
}

function sectionsHtml(sections) {
  return (sections || []).map(function (s) {
    return '        <h2>' + esc(s.h) + '</h2>\n        ' + paragraphs(s.p);
  }).join('\n\n');
}

function actionsHtml(actions) {
  if (!actions || !actions.length) return '';
  var links = actions.map(function (a) {
    var cls = 'cta' + (a.sub ? ' sub' : '');
    var target = a.newTab ? ' target="_blank" rel="noopener"' : '';
    return '          <a class="' + cls + '" href="' + esc(a.href) + '"' + target + '>' + esc(a.label) + '</a>';
  }).join('\n');
  return [
    '        <div class="actions">',
    links,
    '        </div>'
  ].join('\n');
}

function proposalPdfHtml(entry) {
  if (!entry.pdf) return '';
  var preview = entry.pdfPreview
    ? '<figure class="proposal-pdf-preview"><img src="' + esc(entry.pdfPreview) + '" alt="' + esc(entry.title) + 'の企画書プレビュー"></figure>'
    : '<div class="proposal-pdf-placeholder" aria-hidden="true"><span>PDF</span><strong>' + esc(titleForFilename(entry.title)) + '</strong></div>';
  return [
    '        <section class="proposal-document" aria-label="企画書PDF">',
    '          ' + preview,
    '          <a class="proposal-file-open" href="' + esc(entry.pdf) + '" target="_blank" rel="noopener">' + esc(entry.pdfLabel || '企画書を開く（PDF）') + ' <span aria-hidden="true">↗</span></a>',
    '        </section>'
  ].join('\n');
}

function relatedHtml(related) {
  if (!related) return '';
  return [
    '        <div class="related">',
    '          <p>' + esc(related.label) + '</p>',
    '          <a href="' + esc(related.href) + '">' + esc(related.text) + '</a>',
    '        </div>'
  ].join('\n');
}

// ================= INDEX =================
function renderPreviousIndex(content) {
  var documents = buildDocuments(content);
  var recent = documents.filter(function (d) { return !d.isProfile; }).slice(0, 3);
  var recentCardsByHref = {};
  content.proposals.forEach(function (p) { recentCardsByHref[p.id + '.html'] = { kind: 'proposal', item: p }; });
  content.analyses.forEach(function (a) { recentCardsByHref[a.id + '.html'] = { kind: 'analysis', item: a }; });
  content.recovered.forEach(function (r) { if (r.detail) recentCardsByHref[r.id + '.html'] = { kind: 'recovered', item: r }; });

  var cards = recent.map(function (d) {
    var m = recentCardsByHref[d.href];
    if (!m) return '';
    var title = m.item.title;
    var lead = m.kind === 'recovered' ? m.item.summary : m.item.lead;
    var img = (m.item.figure && m.item.figure.image) ? m.item.figure.image : (m.item.thumb || null);
    var thumbHtml = img
      ? '<img src="' + esc(img) + '" alt="" style="width:100%;height:100%;object-fit:cover">'
      : '<svg viewBox="0 0 80 44" aria-hidden="true"><rect x="2" y="2" width="76" height="40"/></svg>';
    return [
      '      <article class="card">',
      '        <div class="thumb">' + thumbHtml + '</div>',
      '        <h3>' + esc(title) + '</h3>',
      '        <p class="dt">' + esc(d.date || '') + '</p>',
      '        <p>' + esc(lead) + '</p>',
      '      </article>'
    ].join('\n');
  }).join('\n');

  var p = content.profile;

  return head(p.name + ' ／ Poro', 'ゲームプランナー志望のポートフォリオ。企画書・ゲーム分析・ボツ企画を掲載しています。') + '\n' +
    headerBar({ isIndex: true }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n\n' +
    '  <div class="top">\n' +
    '    <!-- 左：本人 + メニュー -->\n' +
    '    <div class="pane">\n' +
    '      <p class="prompt"><i aria-hidden="true"></i>C:\\&gt; system.ready</p>\n\n' +
    '      <div class="hero">\n' +
    '        <div class="txt">\n' +
    '          <h1 class="name">' + esc(p.name) + '</h1>\n' +
    '          <p class="romaji">' + esc(p.romaji) + '</p>\n' +
    '          <p class="role">' + esc(p.role) + '</p>\n' +
    '          <p class="school">' + esc(p.school) + '</p>\n' +
    '          <hr class="rule">\n' +
    '          <p class="tagline">' + esc(p.tagline) + '</p>\n' +
    '          <p class="brown-say" data-typewriter>\n' +
    '            <span>&gt; 深夜の端末へようこそ。</span>\n' +
    '            <span>&gt; ご用件を選択してください。</span>\n' +
    '          </p>\n' +
    '        </div>\n\n' +
    '        <div class="fig">\n' +
    '          <!-- 差し替え予定：ブラウン（暫定のドット絵。後日デザイナー版に置換） -->\n' +
    '          <svg viewBox="0 0 40 52" shape-rendering="crispEdges" role="img" aria-label="案内プログラム ブラウンのイラスト">\n' +
    '            <rect x="19" y="0" width="2" height="2" fill="#E8EAF0"/><rect x="19" y="2" width="2" height="7" fill="#9AA6BF"/>\n' +
    '            <rect x="7" y="9" width="26" height="19" fill="#E8EAF0"/><rect x="33" y="11" width="2" height="15" fill="#9AA6BF"/>\n' +
    '            <rect x="9" y="11" width="20" height="14" fill="#0E1626"/><rect x="13" y="16" width="3" height="4" fill="#7FE3A8"/>\n' +
    '            <rect x="22" y="16" width="3" height="4" fill="#7FE3A8"/><rect x="16" y="22" width="6" height="1" fill="#7FE3A8"/>\n' +
    '            <rect x="17" y="28" width="6" height="3" fill="#E8EAF0"/><rect x="10" y="31" width="20" height="21" fill="#16223A"/>\n' +
    '            <rect x="17" y="31" width="6" height="11" fill="#E8EAF0"/><rect x="18" y="33" width="4" height="3" fill="#0E1626"/>\n' +
    '            <rect x="19" y="38" width="2" height="2" fill="#4FB8DE"/><rect x="10" y="31" width="1" height="21" fill="#2B3A5C"/>\n' +
    '            <rect x="29" y="31" width="1" height="21" fill="#2B3A5C"/><rect x="14" y="34" width="1" height="18" fill="#2B3A5C"/>\n' +
    '            <rect x="25" y="34" width="1" height="18" fill="#2B3A5C"/><rect x="4" y="38" width="6" height="4" fill="#E8EAF0"/>\n' +
    '            <rect x="3" y="42" width="7" height="10" fill="#E8EAF0"/><rect x="3" y="45" width="7" height="1" fill="#9AA6BF"/>\n' +
    '            <rect x="3" y="48" width="7" height="1" fill="#9AA6BF"/><rect x="30" y="38" width="6" height="4" fill="#E8EAF0"/>\n' +
    '          </svg>\n' +
    '        </div>\n' +
    '      </div>\n\n' +
    '      <nav class="menu" aria-label="メインメニュー">\n' +
    '        <a href="proposals.html"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1h7l3 3v11H3zM4 2v12h8V5H9V2zM5 7h6v1H5zM5 9h6v1H5zM5 11h4v1H5z"/></svg><span class="t">企画書</span><span class="d">ゲーム企画の提案</span></a>\n' +
    '        <a href="analysis-001.html"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 13h12v1H2zM3 8h2v4H3zM6 5h2v7H6zM9 9h2v3H9zM12 3h2v9h-2z"/></svg><span class="t">ゲーム分析</span><span class="d">作品の分析と考察</span></a>\n' +
    '        <a href="works.html"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5h12v7H2zM1 6h1v5H1zM14 6h1v5h-1zM4 7h1v1H4zM3 8h1v1H3zM5 8h1v1H5zM4 9h1v1H4zM10 7h1v1h-1zM12 9h1v1h-1zM11 8h1v1h-1z"/></svg><span class="t">作ったゲーム</span><span class="d">制作したゲーム一覧</span></a>\n' +
    '        <a href="recovered.html"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1h4v1H6zM2 3h12v1H2zM4 5h8v10H4zM5 6v8h6V6zM6 7h1v6H6zM9 7h1v6H9z"/></svg><span class="t">ボツ企画・失敗談</span><span class="d">失敗から学んだこと</span></a>\n' +
    '        <a href="profile.html"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2h4v1H6zM5 3h1v3H5zM10 3h1v3h-1zM6 6h4v1H6zM4 9h8v1H4zM3 10h1v5H3zM12 10h1v5h-1zM4 11h8v4H4z"/></svg><span class="t">プロフィール</span><span class="d">経歴と自己紹介</span></a>\n' +
    '        <a href="faq.html"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1h10v1H3zM2 2h1v12H2zM13 2h1v12h-1zM3 14h10v1H3zM6 4h4v1H6zM9 5h1v2H9zM7 7h2v1H7zM7 8h1v2H7zM7 11h1v1H7z"/></svg><span class="t">FAQ</span><span class="d">よくある質問</span></a>\n' +
    '      </nav>\n' +
    '    </div>\n\n' +
    '    <!-- 右：書類棚 + 時計 -->\n' +
    sideColumn(documents, '', false) + '\n' +
    '  </div>\n\n' +
    '  <!-- 最近の更新（スクロール後） -->\n' +
    '  <section class="updated">\n' +
    '    <div class="head">\n' +
    '      <div class="sec-h"><h2>最近の更新</h2><span class="en">/ Updated</span></div>\n' +
    '      <a href="#">すべて見る　→</a>\n' +
    '    </div>\n' +
    '    <div class="cards">\n' +
    cards + '\n' +
    '    </div>\n' +
    '  </section>\n\n' +
    '</main>\n\n' +
    footerHtml(p.name, 'TOP');
}

// ================= 企画書 / 分析(共通の文書ページ) =================
function renderDoc(entry, opts) {
  // opts: { kind: 'proposal'|'analysis', profileName, documents, breadcrumbLabel }
  var actions = [];
  (entry.extraLinks || []).forEach(function (l) { actions.push({ label: l.label, href: l.href, sub: !!l.sub, newTab: false }); });
  var proposalPdf = opts.kind === 'proposal' ? proposalPdfHtml(entry) : '';

  var crumbParts = [
    { label: 'C:\\>', href: 'index.html' },
    { label: opts.kind === 'proposal' ? 'proposals' : 'analysis', href: 'index.html' },
    { label: entry.id.replace('-', '_') }
  ];

  return head(entry.title + ' ／ ' + (opts.kind === 'proposal' ? '企画書' : 'ゲーム分析') + ' ／ Poro', entry.lead) + '\n' +
    headerBar({ activeKey: opts.kind }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n  <div class="top">\n\n' +
    '    <!-- 本文 -->\n' +
    '    <div class="pane">\n' +
    crumb(crumbParts) + '\n\n' +
    '      <article class="doc">\n' +
    '        <h1 class="doc-title">' + esc(entry.title) + '</h1>\n' +
    '        <p class="doc-lead">' + esc(entry.lead) + '</p>\n\n' +
    (proposalPdf ? proposalPdf + '\n\n' : '') +
    specTable(entry.spec) + '\n\n' +
    (figureBlock(entry.figure) ? figureBlock(entry.figure) + '\n\n' : '') +
    sectionsHtml(entry.sections) + '\n\n' +
    actionsHtml(actions) + '\n\n' +
    relatedHtml(entry.related) + '\n' +
    '      </article>\n' +
    '    </div>\n\n' +
    sideColumn(opts.documents, entry.id + '.html', true) + '\n\n' +
    '  </div>\n</main>\n\n' +
    footerHtml(opts.profileName, entry.id.replace('-', '_'));
}

// ================= 企画書一覧 =================
function renderProposals(content) {
  var cards = content.proposals.map(function (p, index) {
    var genreRow = (p.spec || []).find(function (row) { return /ジャンル/.test(row.k || ''); });
    var thumb = p.pdfPreview || (p.figure && p.figure.image) || '';
    var media = thumb
      ? '<img src="' + esc(thumb) + '" alt="' + esc(p.title) + 'の企画書サムネイル" loading="lazy">'
      : '<div class="proposal-card-placeholder"><span>PLANNING</span><strong>' + esc(p.title) + '</strong></div>';
    return [
      '      <a class="proposal-card" href="' + esc(p.id) + '.html">',
      '        <figure class="proposal-card-media">' + media + '</figure>',
      '        <div class="proposal-card-body">',
      '          <p class="proposal-card-no">PROPOSAL ' + String(index + 1).padStart(2, '0') + (p.date ? ' / ' + esc(p.date) : '') + '</p>',
      '          <h2>' + esc(p.title) + '</h2>',
      (p.lead ? '          <p>' + esc(p.lead) + '</p>' : ''),
      (genreRow ? '          <span>' + esc(genreRow.v) + '</span>' : ''),
      '          <b>企画書の中身を見る →</b>',
      '        </div>',
      '      </a>'
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  return head('企画書一覧 ／ Poro', 'ゲーム企画のタイトル、世界観、企画書を一覧で紹介します。') + '\n' +
    headerBar({ activeKey: 'proposal' }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n' +
    '  <div class="pane">\n' +
    crumb([{ label: 'C:\\>', href: 'index.html' }, { label: 'proposals' }]) + '\n\n' +
    '    <h1 class="doc-title">企画書</h1>\n' +
    '    <p class="doc-lead">企画の入口を並べています。気になった一枚から、考えた背景とPDFの中身へ。</p>\n' +
    '    <p class="brown-note" data-typewriter><span>&gt; ' + content.proposals.length + '件の企画書があります。</span></p>\n\n' +
    '    <div class="proposal-grid">\n' +
    (cards || '      <p>企画書は準備中です。</p>') + '\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</main>\n\n' +
    footerHtml(content.profile.name, 'proposals');
}

// ================= 作ったゲーム =================
function renderWorks(content) {
  var items = content.works.map(function (w) {
    var actionsArr = [];
    if (w.playUrl && w.playUrl !== '#') actionsArr.push('          <a class="cta" href="' + esc(w.playUrl) + '" target="_blank" rel="noopener">' + esc(w.playLabel || '今すぐ遊ぶ') + '</a>');
    else actionsArr.push('          <span class="cta sub is-disabled">' + esc(w.playLabel || '準備中') + '</span>');
    if (w.noteUrl && w.noteUrl !== '#') actionsArr.push('          <a class="cta sub" href="' + esc(w.noteUrl) + '">' + esc(w.noteLabel || '制作メモ') + '</a>');
    var thumb = w.thumb ? ('        <figure class="figure"><img src="' + esc(w.thumb) + '" alt=""></figure>') : '';
    return [
      '      <div class="work">',
      '        <h3>' + esc(w.title) + '</h3>',
      '        <p class="meta">' + esc(w.meta) + '</p>',
      thumb,
      '        <p>' + esc(w.body) + '</p>',
      '        <div class="actions">',
      actionsArr.join('\n'),
      '        </div>',
      '      </div>'
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  return head('作ったゲーム ／ Poro', '公開済みのゲームと実験的な作品。ブラウザで遊べます。') + '\n' +
    headerBar({ activeKey: 'works' }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n' +
    '  <div class="pane">\n' +
    crumb([{ label: 'C:\\>', href: 'index.html' }, { label: 'works' }]) + '\n\n' +
    '    <h1 class="doc-title">作ったゲーム</h1>\n' +
    '    <p class="doc-lead">ダウンロード不要。リンクを開けばその場で遊べます。</p>\n' +
    '    <p class="brown-note" data-typewriter>\n      <span>&gt; 実行可能なファイルが' + content.works.length + '件あります。</span>\n    </p>\n\n' +
    '    <div class="works">\n' +
    items + '\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</main>\n\n' +
    footerHtml(content.profile.name, 'works');
}

// ================= プロフィール =================
function renderProfile(content) {
  var p = content.profile;
  var photoBlock = p.photo
    ? '<img src="' + esc(p.photo) + '" alt="' + esc(p.name) + 'の写真" style="width:100%;height:100%;object-fit:cover">'
    : '顔写真<br>（差し替え予定）';
  var skillsRows = p.skills.map(function (s) {
    return '          <tr><td class="nm">' + esc(s.tool) + '</td><td class="lv' + (s.sub ? ' sub' : '') + '">' + esc(s.level) + '</td><td class="ex">' + esc(s.note) + '</td></tr>';
  }).join('\n');
  var hobbyItems = p.hobby.map(function (h) {
    return '        <li><b>' + esc(h.b) + '</b><span>' + esc(h.t) + '</span></li>';
  }).join('\n');

  return head('プロフィール ／ Poro', 'ゲームプランナー志望。経歴・スキル・連絡先。') + '\n' +
    headerBar({ activeKey: 'profile', isProfile: true }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n' +
    '  <div class="pane">\n' +
    crumb([{ label: 'C:\\>', href: 'index.html' }, { label: 'profile' }]) + '\n\n' +
    '    <div class="doc">\n' +
    '      <div class="pf">\n' +
    '        <div class="photo">' + photoBlock + '</div>\n' +
    '        <div class="who">\n' +
    '          <h1 class="name" style="font-size:28px">' + esc(p.name) + '</h1>\n' +
    '          <p class="romaji">' + esc(p.romaji) + '</p>\n' +
    '          <p class="role">' + esc(p.role) + '</p>\n' +
    '          <p class="school">' + esc(p.school) + '</p>\n' +
    '          <hr class="rule">\n' +
    '          <p class="tagline">' + esc(p.tagline) + '</p>\n' +
    '        </div>\n' +
    '      </div>\n\n' +
    sectionsHtml(p.sections) + '\n\n' +
    '      <h2>スキル</h2>\n' +
    '      <table class="skills">\n' +
    '        <thead><tr><th>ツール</th><th>レベル</th><th>具体例</th></tr></thead>\n' +
    '        <tbody>\n' + skillsRows + '\n        </tbody>\n' +
    '      </table>\n\n' +
    '      <h2>趣味</h2>\n' +
    '      <ul class="hobby">\n' + hobbyItems + '\n      </ul>\n\n' +
    '      <div class="contact" id="contact">\n' +
    '        <h2>連絡先</h2>\n' +
    '        <dl>\n' +
    '          <dt>メール</dt><dd><a href="mailto:' + esc(p.email) + '">' + esc(p.email) + '</a></dd>\n' +
    '          <dt>ポートフォリオ</dt><dd>このサイト</dd>\n' +
    '        </dl>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</main>\n\n' +
    footerHtml(p.name, 'profile');
}

// ================= FAQ =================
function renderFaq(content) {
  var items = content.faq.map(function (f) {
    return '      <details><summary>' + esc(f.q) + '</summary><p class="a">' + esc(f.a) + '</p></details>';
  }).join('\n');
  return head('よくある質問 ／ Poro', 'ポートフォリオについてよくいただく質問への回答。') + '\n' +
    headerBar({ activeKey: 'faq' }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n' +
    '  <div class="pane">\n' +
    crumb([{ label: 'C:\\>', href: 'index.html' }, { label: 'faq' }]) + '\n\n' +
    '    <h1 class="doc-title">よくある質問</h1>\n' +
    '    <p class="doc-lead">質問を選ぶと回答が開きます。</p>\n' +
    '    <p class="brown-note" data-typewriter>\n      <span>&gt; 回答を用意している質問は' + content.faq.length + '件です。</span>\n    </p>\n\n' +
    '    <div class="faq">\n' + items + '\n    </div>\n\n' +
    '    <p class="doc-lead" style="margin-top:24px;font-size:12px;color:#9AA6BF">\n' +
    '      ここにない質問は、<a href="profile.html#contact">連絡先</a>までお願いします。\n' +
    '    </p>\n' +
    '  </div>\n' +
    '</main>\n\n' +
    footerHtml(content.profile.name, 'faq');
}

// ================= ボツ企画・失敗談(一覧) =================
function renderRecoveredList(content) {
  var drawers = content.recovered.map(function (r) {
    var href = r.detail ? (r.id + '.html') : null;
    return [
      '      <' + (href ? 'a' : 'article') + ' class="drawer"' + (href ? ' href="' + href + '"' : '') + '>',
      '        <span class="handle"><i aria-hidden="true"></i><span class="no">' + esc(r.id.replace('-', '_')) + '</span></span>',
      '        <span class="in">',
      '          <h3>' + esc(r.title) + '</h3>',
      '          <p class="fn">' + esc(r.filename) + '</p>',
      '          <p>' + esc(r.summary) + '</p>',
      '          <span class="kind">' + esc(r.kind) + '</span>',
      '        </span>',
      '      </' + (href ? 'a' : 'article') + '>'
    ].join('\n');
  }).join('\n\n');

  return head('ボツ企画・失敗談 ／ Poro', '途中でやめた企画を、判断の記録として残しています。') + '\n' +
    headerBar({ activeKey: 'recovered' }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n' +
    '  <div class="pane">\n' +
    crumb([{ label: 'C:\\>', href: 'index.html' }, { label: 'recovered' }]) + '\n\n' +
    '    <h1 class="doc-title">ボツ企画・失敗談</h1>\n' +
    '    <p class="doc-lead">途中でやめた企画を、反省文ではなく判断の記録として残しています。</p>\n' +
    '    <p class="brown-note" data-typewriter>\n      <span>&gt; 復元されたファイルが' + content.recovered.length + '件あります。</span>\n      <span>&gt; 引き出しを選んでください。</span>\n    </p>\n\n' +
    '    <div class="cabinet">\n' + drawers + '\n    </div>\n' +
    '  </div>\n' +
    '</main>\n\n' +
    footerHtml(content.profile.name, 'recovered');
}

// ================= ボツ企画・失敗談(詳細) =================
function renderRecoveredDetail(entry, opts) {
  var d = entry.detail;
  var actions = [];
  if (d.related) actions.push({ label: d.related.text, href: d.related.href, sub: false, newTab: false });
  actions.push({ label: '書庫に戻る', href: 'recovered.html', sub: true, newTab: false });

  return head(entry.title + ' ／ ボツ企画 ／ Poro', d.lead) + '\n' +
    headerBar({ activeKey: 'recovered' }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n  <div class="top">\n' +
    '    <div class="pane">\n' +
    crumb([{ label: 'C:\\>', href: 'index.html' }, { label: 'recovered', href: 'recovered.html' }, { label: entry.id.replace('-', '_') }]) + '\n\n' +
    '      <article class="doc">\n' +
    '        <h1 class="doc-title">' + esc(entry.title) + '</h1>\n' +
    '        <p class="doc-lead">' + esc(d.lead) + '</p>\n\n' +
    specTable(d.spec) + '\n\n' +
    sectionsHtml(d.sections) + '\n\n' +
    actionsHtml(actions) + '\n' +
    '      </article>\n' +
    '    </div>\n\n' +
    sideColumn(opts.documents, entry.id + '.html', true) + '\n' +
    '  </div>\n</main>\n\n' +
    footerHtml(opts.profileName, entry.id.replace('-', '_'));
}

// ================= ライセンス =================
function renderLicense(content) {
  var fontRows = content.license.fonts.map(function (f) {
    return '          <tr><td class="nm">' + esc(f.name) + '</td><td>' + esc(f.license) + '</td><td>' + esc(f.use) + '</td></tr>';
  }).join('\n');
  var assetRows = content.license.assets.map(function (a) {
    return '          <tr><td class="nm">' + esc(a.name) + '</td><td>' + esc(a.method) + '</td><td>' + esc(a.status) + '</td></tr>';
  }).join('\n');

  return head('ライセンス ／ Poro', '使用しているフォント・素材と、その出所の表記。') + '\n' +
    headerBar({ activeKey: null }) + '\n\n' +
    cfgPanel() + '\n\n' +
    '<main class="wrap">\n' +
    '  <div class="pane">\n' +
    crumb([{ label: 'C:\\>', href: 'index.html' }, { label: 'license' }]) + '\n\n' +
    '    <div class="doc">\n' +
    '      <h1 class="doc-title">ライセンス</h1>\n' +
    '      <p class="doc-lead">このサイトで使用している素材と、その出所です。</p>\n\n' +
    '      <h2>フォント</h2>\n' +
    '      <table class="lic">\n' +
    '        <thead><tr><th>名称</th><th>ライセンス</th><th>用途</th></tr></thead>\n' +
    '        <tbody>\n' + fontRows + '\n        </tbody>\n' +
    '      </table>\n\n' +
    '      <h2>イラスト・アイコン・画像</h2>\n' +
    '      <table class="lic">\n' +
    '        <thead><tr><th>対象</th><th>制作方法</th><th>状態</th></tr></thead>\n' +
    '        <tbody>\n' + assetRows + '\n        </tbody>\n' +
    '      </table>\n\n' +
    '      <h2>このサイトについて</h2>\n' +
    '      <p>訪問者の情報を取得する仕組み（アクセス解析、Cookie、フォーム送信）は使用していません。設定パネルで変更した表示設定も保存されず、ページを離れると初期状態に戻ります。</p>\n' +
    '      <p>掲載している企画書・分析・図版はすべて本人が作成したものです。既存タイトルのスクリーンショットや、第三者の権利物は使用していません。</p>\n\n' +
    '      <div class="actions">\n' +
    '        <a class="cta sub" href="index.html">トップに戻る</a>\n' +
    '      </div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    '</main>\n\n' +
    footerHtml(content.profile.name, 'license');
}

// ================= サイト全体を再生成 =================
function redirectHtml(title, href) {
  return [
    '<!doctype html>',
    '<html lang="ja">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta http-equiv="refresh" content="0; url=' + esc(href) + '">',
    '<title>' + esc(title) + '</title>',
    '</head>',
    '<body><p><a href="' + esc(href) + '">企画書を開く</a></p></body>',
    '</html>'
  ].join('\n');
}

function renderSite(content) {
  var documents = buildDocuments(content);
  var files = {};
  var firstProposalHref = content.proposals.length ? content.proposals[0].id + '.html' : 'index.html';
  var firstAnalysisHref = content.analyses.length ? content.analyses[0].id + '.html' : 'index.html';

  // 追加・削除で連番が変わっても、共通ナビゲーションは現在の先頭ページを指す。
  NAV_ITEMS.forEach(function (item) {
    if (item.key === 'proposal') item.href = 'proposals.html';
    if (item.key === 'analysis') item.href = firstAnalysisHref;
  });

  files['index.html'] = renderIndex(content);
  files['proposals.html'] = renderProposals(content);
  files['works.html'] = renderWorks(content);
  files['profile.html'] = renderProfile(content);
  files['faq.html'] = renderFaq(content);
  files['recovered.html'] = renderRecoveredList(content);
  files['license.html'] = renderLicense(content);

  content.proposals.forEach(function (p) {
    files[p.id + '.html'] = renderDoc(p, { kind: 'proposal', profileName: content.profile.name, documents: documents });
  });
  // 古いブックマークやローカルの file:// URLを壊さないための入口。
  if (!files['proposal-001.html'] && content.proposals.length) {
    files['proposal-001.html'] = redirectHtml('企画書へ移動します', firstProposalHref);
  }
  content.analyses.forEach(function (a) {
    files[a.id + '.html'] = renderDoc(a, { kind: 'analysis', profileName: content.profile.name, documents: documents });
  });
  content.recovered.forEach(function (r) {
    if (r.detail) {
      files[r.id + '.html'] = renderRecoveredDetail(r, { profileName: content.profile.name, documents: documents });
    }
  });

  return files;
}

module.exports = { renderSite: renderSite, esc: esc };

function renderIndex(content) {
  var p=content.profile;
  var games=content.works || [];
  var feature=games.find(function(w){return !!w.thumb;}) || games[0] || null;
  var proposal=(content.proposals || [])[0] || null;
  var analysis=(content.analyses || [])[0] || null;
  function valid(u){return u && u!=='#' && !/^\s*(javascript|data):/i.test(u);}
  var gameMedia=feature && feature.thumb
    ? '<img src="'+esc(feature.thumb)+'" alt="'+esc(feature.title)+'のゲーム画面" width="1280" height="720" loading="eager">'
    : '<div class="game-placeholder"><strong>GAME SCREEN</strong><span>画像は編集ツールから追加できます</span></div>';
  var gameActions=feature && valid(feature.playUrl)
    ? '<a class="showcase-primary" href="'+esc(feature.playUrl)+'" target="_blank" rel="noopener">ブラウザで遊ぶ ↗</a>'
    : '<span class="showcase-muted">プレイ版は準備中です</span>';
  var proposalTitle=proposal ? proposal.title : '企画書を準備しています';
  var proposalLead=proposal ? proposal.lead : 'タイトルと世界観が伝わる表紙から、遊びのアイデアへ。';
  var analysisTitle=analysis ? analysis.title : 'ゲーム分析を準備しています';
  var analysisLead=analysis ? analysis.lead : '画面で確認できることから、遊びの仕組みを読み解きます。';
  var slideGame='<article class="showcase-slide is-active" data-showcase-slide="0" aria-hidden="false"><div class="showcase-media">'+gameMedia+'</div><div class="showcase-copy"><p class="showcase-kicker">PLAY / 作ったゲーム</p><h2>'+esc(feature ? feature.title : '制作したゲーム')+'</h2><p>'+esc(feature ? feature.body : '作品を準備しています。')+'</p><p class="showcase-meta">'+esc(feature ? feature.meta : '')+'</p><div class="showcase-actions">'+gameActions+'<a href="works.html">作品一覧を見る →</a></div></div></article>';
  var slideProposal='<article class="showcase-slide" data-showcase-slide="1" aria-hidden="true"><div class="showcase-media"><div class="proposal-cover"><small>PLANNING / COVER</small><strong>'+esc(proposalTitle)+'</strong><span>企画の表紙と世界観</span></div></div><div class="showcase-copy"><p class="showcase-kicker">PLANNING / 企画書</p><h2>'+esc(proposalTitle)+'</h2><p>'+esc(proposalLead)+'</p><div class="showcase-actions"><a class="showcase-primary" href="proposals.html">企画書一覧を見る →</a></div></div></article>';
  var slideAnalysis='<article class="showcase-slide" data-showcase-slide="2" aria-hidden="true"><div class="showcase-media"><div class="analysis-board"><small>ANALYSIS NOTE</small><strong>'+esc(analysisTitle)+'</strong><span>観察 → 仮説 → 自分なら</span></div></div><div class="showcase-copy"><p class="showcase-kicker">ANALYSIS / ゲーム分析</p><h2>'+esc(analysisTitle)+'</h2><p>'+esc(analysisLead)+'</p><div class="showcase-actions">'+(analysis?'<a class="showcase-primary" href="'+esc(analysis.id)+'.html">分析を読む →</a>':'')+'</div></div></article>';
  var icon=p.photo?'<img src="'+esc(p.photo)+'" alt="'+esc(p.name)+'のアイコン">':'<span>MY<br>ICON</span>';
  var homeLinks=[
    ['works.html','作ったゲーム','遊べる作品と制作内容'],
    ['proposals.html','企画書','世界観と遊びの設計'],
    [analysis?analysis.id+'.html':'#','ゲーム分析','遊びを読み解く記録'],
    ['recovered.html','没企画・失敗談','判断と学びの記録'],
    ['profile.html','プロフィール','経歴と制作への思い'],
    ['faq.html','FAQ','よくある質問']
  ].map(function(item){return '<a href="'+esc(item[0])+'"><strong>'+esc(item[1])+'</strong><span>'+esc(item[2])+'</span></a>';}).join('');
  var main='<main class="studio-home">'+
    '<section class="home-intro"><p>PORTFOLIO / '+esc(p.role)+'</p><h1>ゲームをつくっています。</h1><span>作ったものと、その背景にある考えを。</span></section>'+
    '<section class="showcase" id="showcase" aria-roledescription="カルーセル" aria-label="制作の展示ケース"><div class="showcase-head"><strong>制作の展示ケース</strong><span id="showcase-status">12秒ごとに切り替え</span></div><div class="showcase-stage">'+slideGame+slideProposal+slideAnalysis+'</div><div class="showcase-controls"><div role="group" aria-label="展示を選ぶ"><button type="button" data-showcase-select="0" aria-pressed="true">ゲーム</button><button type="button" data-showcase-select="1" aria-pressed="false">企画書</button><button type="button" data-showcase-select="2" aria-pressed="false">ゲーム分析</button></div><div><button type="button" id="showcase-prev">← 前へ</button><span id="showcase-count">01 / 03</span><button type="button" id="showcase-next">次へ →</button><button type="button" id="showcase-pause">自動切替を停止</button></div></div></section>'+
    '<section class="creator-signoff" aria-label="制作者からの一言"><div class="creator-icon">'+icon+'</div><div><p>'+esc(p.name)+' / この部屋の持ち主</p><strong>プレイヤーに、どんな思いをしてほしいか。<br>そこからゲームを考えています。</strong></div><a href="profile.html">プロフィールへ →</a></section>'+
    '<nav class="home-links" aria-label="ポートフォリオの内容">'+homeLinks+'</nav>'+
    '</main>';
  return head(p.name+' ／ ゲーム制作ポートフォリオ','制作したゲーム、企画書、ゲーム分析、失敗から得た学びを紹介します。')+'\n'+headerBar({isIndex:true})+'\n\n'+cfgPanel()+'\n\n'+main+'\n\n'+footerHtml(p.name,'TOP');
}

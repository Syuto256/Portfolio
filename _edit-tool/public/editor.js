(function () {
  'use strict';
  var state = { content: null, tab: 'proposals' };
  var app = document.getElementById('app');
  var tabsEl = document.getElementById('tabs');
  var toastEl = document.getElementById('toast');

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function escAttr(s) { return esc(s).replace(/"/g, '&quot;'); }

  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className = 'toast' + (isError ? ' error' : '');
    toastEl.hidden = false;
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.hidden = true; }, 4000);
  }

  function load() {
    fetch('/api/content').then(function (r) { return r.json(); }).then(function (c) {
      state.content = c; render();
    }).catch(function () { toast('コンテンツの読み込みに失敗しました。編集ツールが起動しているか確認してください。', true); });
  }

  function render() {
    Array.prototype.forEach.call(tabsEl.querySelectorAll('button'), function (b) {
      b.classList.toggle('active', b.dataset.tab === state.tab);
    });
    app.innerHTML = '';
    ({
      proposals: renderProposalsList,
      analyses: renderAnalysesList,
      works: renderWorksList,
      recovered: renderRecoveredList,
      profile: renderProfileForm,
      faq: renderFaqEditor,
      license: renderLicenseView
    }[state.tab])();
  }

  tabsEl.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-tab]');
    if (!b) return;
    state.tab = b.dataset.tab;
    render();
  });

  // ---------------- 共通: 繰り返し項目エディタ ----------------
  function repeater(container, items, fields, addLabel) {
    function rowHtml(item, idx) {
      var inner = fields.map(function (f) {
        var val = item[f.key] || '';
        if (f.type === 'textarea') {
          return '<div class="field"><label>' + esc(f.label) + '</label><textarea data-key="' + f.key + '" placeholder="' + escAttr(f.placeholder || '') + '">' + esc(val) + '</textarea></div>';
        }
        return '<div class="field"><label>' + esc(f.label) + '</label><input type="text" data-key="' + f.key + '" value="' + escAttr(val) + '" placeholder="' + escAttr(f.placeholder || '') + '"></div>';
      }).join('');
      return '<div class="section-block" data-idx="' + idx + '">' + inner + '<button type="button" class="btn small danger rm" data-remove>削除</button></div>';
    }
    function renderRows() {
      container.querySelector('.rows').innerHTML = items.map(rowHtml).join('') || '<p class="empty">まだありません</p>';
    }
    container.innerHTML = '<div class="rows"></div><button type="button" class="btn small" data-add>＋ ' + esc(addLabel) + '</button>';
    renderRows();
    container.querySelector('[data-add]').addEventListener('click', function () {
      var blank = {}; fields.forEach(function (f) { blank[f.key] = ''; });
      items.push(blank);
      renderRows();
    });
    container.addEventListener('input', function (e) {
      var block = e.target.closest('.section-block');
      if (!block) return;
      var idx = parseInt(block.dataset.idx, 10);
      var key = e.target.dataset.key;
      if (key) items[idx][key] = e.target.value;
    });
    container.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-remove')) {
        var block = e.target.closest('.section-block');
        items.splice(parseInt(block.dataset.idx, 10), 1);
        renderRows();
      }
    });
  }

  function submitEntry(type, id, payload, fileInputs) {
    var fd = new FormData();
    fd.append('type', type);
    fd.append('id', id || '');
    fd.append('payload', JSON.stringify(payload));
    Object.keys(fileInputs || {}).forEach(function (key) {
      var inputEl = fileInputs[key];
      if (inputEl && inputEl.files && inputEl.files[0]) fd.append(key, inputEl.files[0]);
    });
    return fetch('/api/entry', { method: 'POST', body: fd }).then(function (r) { return r.json(); });
  }
  function deleteEntry(type, id) {
    return fetch('/api/entry/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, id: id })
    }).then(function (r) { return r.json(); });
  }

  function afterSave(promise, onOk) {
    promise.then(function (res) {
      if (res.ok) { toast('保存しました。サイトのファイルを更新しました。'); load(); if (onOk) onOk(); }
      else { toast('保存できませんでした: ' + res.error, true); }
    }).catch(function () { toast('通信エラーが発生しました。', true); });
  }

  // ================= 企画書 =================
  function renderProposalsList() {
    var items = state.content.proposals;
    var html = '<div class="card"><h2>企画書 <button class="btn primary small" data-action="new">＋ 新規追加</button></h2><div class="list">';
    html += items.length ? items.map(function (p) {
      return '<div class="list-item"><div class="info"><div class="t">' + esc(p.title) + '</div><div class="m">' + esc(p.date || '') + '</div></div><div class="ops">' +
        '<button class="btn small" data-action="edit" data-id="' + p.id + '">編集</button>' +
        '<button class="btn small danger" data-action="del" data-id="' + p.id + '">削除</button></div></div>';
    }).join('') : '<p class="empty">まだ企画書がありません</p>';
    html += '</div></div>';
    app.innerHTML = html;
    app.querySelector('[data-action="new"]').addEventListener('click', function () { renderProposalForm(null); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-action="edit"]'), function (b) {
      b.addEventListener('click', function () { renderProposalForm(b.dataset.id); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-action="del"]'), function (b) {
      b.addEventListener('click', function () {
        if (!confirm('この企画書を削除しますか？(元のファイルはバックアップに残ります)')) return;
        afterSave(deleteEntry('proposal', b.dataset.id));
      });
    });
  }

  function renderProposalForm(id) {
    var entry = id ? state.content.proposals.find(function (p) { return p.id === id; }) : {
      title: '', lead: '', spec: [
        { k: 'ジャンル', v: '' }, { k: '想定ハード', v: '' }, { k: '1プレイ時間', v: '' },
        { k: '対象', v: '' }, { k: '想定価格', v: '' }, { k: '制作期間', v: '' }
      ], sections: [{ h: '', p: '' }], figure: null, pdf: null, pdfLabel: '企画書を読む(PDF)', related: null
    };
    var spec = (entry.spec || []).map(function (r) { return { k: r.k, v: r.v }; });
    var sections = (entry.sections || []).map(function (s) { return { h: s.h, p: s.p }; });
    var recoveredOptions = state.content.recovered.filter(function (r) { return r.detail; });

    app.innerHTML = '<div class="card">' +
      '<h2>' + (id ? '企画書を編集' : '企画書を新規追加') + (entry.protected ? '<span class="tag">既存ページ</span>' : '') + '</h2>' +
      (entry.protected ? '<p class="protected-note">この企画書は最初から入っていたサンプルです。編集して保存すると、図版の色付き強調などの一部装飾は失われます(数値・文章はそのまま残ります)。</p>' : '') +
      '<div class="field"><label>タイトル</label><input type="text" id="f-title" value="' + escAttr(entry.title) + '"></div>' +
      '<div class="field"><label>企画書PDF</label>' +
      (entry.pdf ? '<p class="protected-note">現在のPDF: ' + esc(entry.pdf) + '</p>' : '<p class="protected-note">PDFはまだ登録されていません。</p>') +
      '<input type="file" id="f-pdf" accept="application/pdf">' +
      '<p class="hint">PDFは5MBまで。PowerPointの場合は先に「エクスポート → PDF/XPSドキュメントの作成」でPDF化してください。</p>' +
      '<input type="text" id="f-pdflabel" style="margin-top:8px" placeholder="公開ページに表示する文言" value="' + escAttr(entry.pdfLabel || '企画書を開く（PDF）') + '"></div>' +
      '<div class="field"><label>一言解説</label><textarea id="f-lead">' + esc(entry.lead) + '</textarea></div>' +
      '<div class="field"><label>PDFのスクリーンショット(1枚)</label>' +
      (entry.pdfPreview ? '<p class="protected-note">現在の画像: ' + esc(entry.pdfPreview) + '</p>' : '<p class="protected-note">公開ページのPDFボタン上に表示する画像です。</p>') +
      '<input type="file" id="f-pdfpreview" accept="image/png,image/jpeg,image/webp">' +
      '<p class="hint">PNG・JPEG・WebP、3MBまで。PDFの表紙や内容が伝わる1ページを選んでください。</p></div>' +
      '<div class="field"><label>基本情報</label><div id="f-spec"></div></div>' +
      '<div class="field"><label>本文(見出し＋文章を追加できます)</label><div id="f-sections"></div></div>' +
      '<div class="field"><label>図版画像(任意・省略可)</label>' +
      (entry.figure && entry.figure.image ? '<p class="protected-note">現在の画像: ' + esc(entry.figure.image) + '</p>' : (entry.figure && entry.figure.rawSvg ? '<p class="protected-note">現在は手描きの図が表示されています。画像をアップロードすると置き換わります。</p>' : '')) +
      '<input type="file" id="f-figure" accept="image/png,image/jpeg,image/webp">' +
      '<div class="row2" style="margin-top:8px"><input type="text" id="f-figcaption" placeholder="図のキャプション" value="' + escAttr(entry.figure ? entry.figure.caption : '') + '">' +
      '<select id="f-figsource"><option value="self">本人が作成</option><option value="ai">生成AIで制作</option></select></div></div>' +
      '<div class="field"><label>関連するボツ企画(任意)</label><select id="f-related">' +
      '<option value="">関連なし</option>' +
      recoveredOptions.map(function (r) { return '<option value="' + r.id + '.html" ' + (entry.related && entry.related.href === r.id + '.html' ? 'selected' : '') + '>' + esc(r.title) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-actions"><button class="btn primary" id="f-save">保存する</button><button class="btn" id="f-cancel">キャンセル</button></div>' +
      '</div>';

    repeater(app.querySelector('#f-spec'), spec, [{ key: 'k', label: '項目名', placeholder: '例: ジャンル' }, { key: 'v', label: '内容', placeholder: '例: パズルアクション' }], '項目を追加');
    repeater(app.querySelector('#f-sections'), sections, [{ key: 'h', label: '見出し', placeholder: '例: なぜ今これか' }, { key: 'p', label: '文章', type: 'textarea' }], '文章ブロックを追加');

    app.querySelector('#f-cancel').addEventListener('click', renderProposalsList);
    app.querySelector('#f-save').addEventListener('click', function () {
      var relHref = app.querySelector('#f-related').value;
      var payload = {
        title: app.querySelector('#f-title').value.trim(),
        lead: app.querySelector('#f-lead').value.trim(),
        spec: spec.filter(function (r) { return r.k || r.v; }),
        sections: sections.filter(function (s) { return s.h || s.p; }),
        pdfLabel: app.querySelector('#f-pdflabel').value.trim(),
        pdfPreviewSource: 'self',
        figureCaption: app.querySelector('#f-figcaption').value.trim(),
        figureSource: app.querySelector('#f-figsource').value,
        related: relHref ? { label: 'この企画のもとになった失敗', href: relHref, text: recoveredOptions.find(function (r) { return r.id + '.html' === relHref; }).filename + '　→' } : null
      };
      if (!payload.title) { toast('タイトルを入力してください。', true); return; }
      var figInput = app.querySelector('#f-figure');
      if (figInput.files[0]) payload.figure = { caption: payload.figureCaption };
      afterSave(submitEntry('proposal', id, payload, { pdfPreview: app.querySelector('#f-pdfpreview'), figureImage: figInput, pdfFile: app.querySelector('#f-pdf') }), renderProposalsList);
    });
  }

  // ================= ゲーム分析 =================
  function renderAnalysesList() {
    var items = state.content.analyses;
    var html = '<div class="card"><h2>ゲーム分析 <button class="btn primary small" data-action="new">＋ 新規追加</button></h2><div class="list">';
    html += items.length ? items.map(function (a) {
      return '<div class="list-item"><div class="info"><div class="t">' + esc(a.title) + '</div><div class="m">' + esc(a.date || '') + '</div></div><div class="ops">' +
        '<button class="btn small" data-action="edit" data-id="' + a.id + '">編集</button>' +
        '<button class="btn small danger" data-action="del" data-id="' + a.id + '">削除</button></div></div>';
    }).join('') : '<p class="empty">まだ分析がありません</p>';
    html += '</div></div>';
    app.innerHTML = html;
    app.querySelector('[data-action="new"]').addEventListener('click', function () { renderAnalysisForm(null); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-action="edit"]'), function (b) {
      b.addEventListener('click', function () { renderAnalysisForm(b.dataset.id); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-action="del"]'), function (b) {
      b.addEventListener('click', function () {
        if (!confirm('この分析を削除しますか？(元のファイルはバックアップに残ります)')) return;
        afterSave(deleteEntry('analysis', b.dataset.id));
      });
    });
  }

  function renderAnalysisForm(id) {
    var entry = id ? state.content.analyses.find(function (a) { return a.id === id; }) : {
      title: '', lead: '', spec: [
        { k: '対象', v: '' }, { k: 'プレイ時間', v: '' }, { k: '何を選ばせるか', v: '' }, { k: '立場', v: '' }, { k: 'タグ', v: '' }
      ], sections: [{ h: '', p: '' }], figure: null, related: null, extraLinks: [{ label: 'トップに戻る', href: 'index.html', sub: false }]
    };
    var spec = (entry.spec || []).map(function (r) { return { k: r.k, v: r.v }; });
    var sections = (entry.sections || []).map(function (s) { return { h: s.h, p: s.p }; });
    var proposalOptions = state.content.proposals;

    app.innerHTML = '<div class="card">' +
      '<h2>' + (id ? '分析を編集' : '分析を新規追加') + (entry.protected ? '<span class="tag">既存ページ</span>' : '') + '</h2>' +
      (entry.protected ? '<p class="protected-note">このページは最初から入っていたサンプルです。編集して保存すると、図版の色付き強調などの一部装飾は失われます(数値・文章はそのまま残ります)。</p>' : '') +
      '<div class="field"><label>タイトル</label><input type="text" id="f-title" value="' + escAttr(entry.title) + '"></div>' +
      '<div class="field"><label>リード文</label><textarea id="f-lead">' + esc(entry.lead) + '</textarea></div>' +
      '<div class="field"><label>基本情報</label><div id="f-spec"></div></div>' +
      '<div class="field"><label>本文(見出し＋文章を追加できます)</label><div id="f-sections"></div></div>' +
      '<div class="field"><label>図版画像(任意)</label>' +
      (entry.figure && entry.figure.image ? '<p class="protected-note">現在の画像: ' + esc(entry.figure.image) + '</p>' : (entry.figure && entry.figure.rawSvg ? '<p class="protected-note">現在は手描きの図が表示されています。画像をアップロードすると置き換わります。</p>' : '')) +
      '<input type="file" id="f-figure" accept="image/png,image/jpeg,image/webp">' +
      '<div class="row2" style="margin-top:8px"><input type="text" id="f-figcaption" placeholder="図のキャプション" value="' + escAttr(entry.figure ? entry.figure.caption : '') + '">' +
      '<select id="f-figsource"><option value="self">本人が作成</option><option value="ai">生成AIで制作</option></select></div></div>' +
      '<div class="field"><label>関連する企画書(任意)</label><select id="f-related">' +
      '<option value="">関連なし</option>' +
      proposalOptions.map(function (p) { return '<option value="' + p.id + '.html" ' + (entry.related && entry.related.href === p.id + '.html' ? 'selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-actions"><button class="btn primary" id="f-save">保存する</button><button class="btn" id="f-cancel">キャンセル</button></div>' +
      '</div>';

    repeater(app.querySelector('#f-spec'), spec, [{ key: 'k', label: '項目名' }, { key: 'v', label: '内容' }], '項目を追加');
    repeater(app.querySelector('#f-sections'), sections, [{ key: 'h', label: '見出し' }, { key: 'p', label: '文章', type: 'textarea' }], '文章ブロックを追加');

    app.querySelector('#f-cancel').addEventListener('click', renderAnalysesList);
    app.querySelector('#f-save').addEventListener('click', function () {
      var relHref = app.querySelector('#f-related').value;
      var no = relHref ? relHref.replace('.html', '').split('-')[1] : null;
      var payload = {
        title: app.querySelector('#f-title').value.trim(),
        lead: app.querySelector('#f-lead').value.trim(),
        spec: spec.filter(function (r) { return r.k || r.v; }),
        sections: sections.filter(function (s) { return s.h || s.p; }),
        figureCaption: app.querySelector('#f-figcaption').value.trim(),
        figureSource: app.querySelector('#f-figsource').value,
        extraLinks: entry.extraLinks || [{ label: 'トップに戻る', href: 'index.html', sub: false }],
        related: relHref ? { label: 'この視点でつくった企画', href: relHref, text: 'proposal_' + no + '_' + proposalOptions.find(function (p) { return p.id + '.html' === relHref; }).title.replace(/[。.]+$/, '') + '.pdf　→' } : null
      };
      if (!payload.title) { toast('タイトルを入力してください。', true); return; }
      var figInput = app.querySelector('#f-figure');
      if (figInput.files[0]) payload.figure = { caption: payload.figureCaption };
      afterSave(submitEntry('analysis', id, payload, { figureImage: figInput }), renderAnalysesList);
    });
  }

  // ================= 作ったゲーム =================
  function renderWorksList() {
    var items = state.content.works;
    var html = '<div class="card"><h2>作ったゲーム <button class="btn primary small" data-action="new">＋ 新規追加</button></h2><div class="list">';
    html += items.map(function (w) {
      return '<div class="list-item"><div class="info"><div class="t">' + esc(w.title) + '</div><div class="m">' + esc(w.meta || '') + '</div></div><div class="ops">' +
        '<button class="btn small" data-action="edit" data-id="' + w.id + '">編集</button>' +
        '<button class="btn small danger" data-action="del" data-id="' + w.id + '">削除</button></div></div>';
    }).join('');
    html += '</div></div>';
    app.innerHTML = html;
    app.querySelector('[data-action="new"]').addEventListener('click', function () { renderWorkForm(null); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-action="edit"]'), function (b) {
      b.addEventListener('click', function () { renderWorkForm(b.dataset.id); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-action="del"]'), function (b) {
      b.addEventListener('click', function () {
        if (!confirm('削除しますか？(バックアップに残ります)')) return;
        afterSave(deleteEntry('work', b.dataset.id));
      });
    });
  }

  function renderWorkForm(id) {
    var entry = id ? state.content.works.find(function (w) { return w.id === id; }) : { title: '', meta: '', body: '', playUrl: '', playLabel: '今すぐ遊ぶ', noteUrl: '', noteLabel: '制作メモ', thumb: null };
    app.innerHTML = '<div class="card"><h2>' + (id ? 'ゲームを編集' : 'ゲームを新規追加') + '</h2>' +
      '<div class="field"><label>タイトル</label><input type="text" id="f-title" value="' + escAttr(entry.title) + '"></div>' +
      '<div class="field"><label>メタ情報(例: Unity / WebGL ／ 1プレイ 3分 ／ 個人 ／ 2026-08)</label><input type="text" id="f-meta" value="' + escAttr(entry.meta) + '"></div>' +
      '<div class="field"><label>紹介文</label><textarea id="f-body">' + esc(entry.body) + '</textarea></div>' +
      '<div class="row2">' +
      '<div class="field"><label>遊べるURL(空欄なら「準備中」と表示)</label><input type="text" id="f-playurl" value="' + escAttr(entry.playUrl || '') + '"></div>' +
      '<div class="field"><label>プレイボタンの文言</label><input type="text" id="f-playlabel" value="' + escAttr(entry.playLabel || '今すぐ遊ぶ') + '"></div>' +
      '</div><div class="row2">' +
      '<div class="field"><label>制作メモURL(任意)</label><input type="text" id="f-noteurl" value="' + escAttr(entry.noteUrl || '') + '"></div>' +
      '<div class="field"><label>制作メモボタンの文言</label><input type="text" id="f-notelabel" value="' + escAttr(entry.noteLabel || '制作メモ') + '"></div>' +
      '</div>' +
      '<div class="field"><label>サムネイル画像(任意)</label>' +
      (entry.thumb ? '<p class="protected-note">現在の画像: ' + esc(entry.thumb) + '</p>' : '') +
      '<input type="file" id="f-thumb" accept="image/png,image/jpeg,image/webp">' +
      '<select id="f-thumbsource" style="margin-top:8px"><option value="self">本人が作成</option><option value="ai">生成AIで制作</option></select></div>' +
      '<div class="form-actions"><button class="btn primary" id="f-save">保存する</button><button class="btn" id="f-cancel">キャンセル</button></div></div>';

    app.querySelector('#f-cancel').addEventListener('click', renderWorksList);
    app.querySelector('#f-save').addEventListener('click', function () {
      var playUrl = app.querySelector('#f-playurl').value.trim();
      var noteUrl = app.querySelector('#f-noteurl').value.trim();
      var payload = {
        title: app.querySelector('#f-title').value.trim(),
        meta: app.querySelector('#f-meta').value.trim(),
        body: app.querySelector('#f-body').value.trim(),
        playUrl: playUrl || null,
        playLabel: app.querySelector('#f-playlabel').value.trim() || (playUrl ? '今すぐ遊ぶ' : '準備中'),
        noteUrl: noteUrl || null,
        noteLabel: noteUrl ? (app.querySelector('#f-notelabel').value.trim() || '制作メモ') : null,
        thumbSource: app.querySelector('#f-thumbsource').value
      };
      if (!payload.title) { toast('タイトルを入力してください。', true); return; }
      afterSave(submitEntry('work', id, payload, { thumb: app.querySelector('#f-thumb') }), renderWorksList);
    });
  }

  // ================= ボツ企画・失敗談 =================
  function renderRecoveredList() {
    var items = state.content.recovered;
    var html = '<div class="card"><h2>ボツ企画・失敗談 <button class="btn primary small" data-action="new">＋ 新規追加</button></h2><div class="list">';
    html += items.map(function (r) {
      return '<div class="list-item"><div class="info"><div class="t">' + esc(r.title) + (r.detail ? '' : '<span class="tag">詳細未記入</span>') + '</div><div class="m">' + esc(r.kind || '') + '</div></div><div class="ops">' +
        '<button class="btn small" data-action="edit" data-id="' + r.id + '">編集</button>' +
        '<button class="btn small danger" data-action="del" data-id="' + r.id + '">削除</button></div></div>';
    }).join('');
    html += '</div></div>';
    app.innerHTML = html;
    app.querySelector('[data-action="new"]').addEventListener('click', function () { renderRecoveredForm(null); });
    Array.prototype.forEach.call(app.querySelectorAll('[data-action="edit"]'), function (b) {
      b.addEventListener('click', function () { renderRecoveredForm(b.dataset.id); });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-action="del"]'), function (b) {
      b.addEventListener('click', function () {
        if (!confirm('削除しますか？(バックアップに残ります)')) return;
        afterSave(deleteEntry('recovered', b.dataset.id));
      });
    });
  }

  function renderRecoveredForm(id) {
    var entry = id ? state.content.recovered.find(function (r) { return r.id === id; }) : { title: '', filename: '', summary: '', kind: '', detail: null };
    var d = entry.detail || { lead: '', reach: '', stop: '', sections: [{ h: '読み違え', p: '' }, { h: '転用先', p: '' }], related: null };
    if (entry.detail) {
      d.reach = (entry.detail.spec.find(function (s) { return s.k === '到達点'; }) || {}).v || '';
      d.stop = (entry.detail.spec.find(function (s) { return s.k === '停止の判断'; }) || {}).v || '';
    }
    var sections = (d.sections || []).map(function (s) { return { h: s.h, p: s.p }; });
    var proposalOptions = state.content.proposals;

    app.innerHTML = '<div class="card"><h2>' + (id ? 'ボツ企画を編集' : 'ボツ企画を新規追加') + '</h2>' +
      '<div class="field"><label>タイトル</label><input type="text" id="f-title" value="' + escAttr(entry.title) + '"></div>' +
      '<div class="field"><label>ファイル名(書庫での表示)</label><input type="text" id="f-filename" value="' + escAttr(entry.filename) + '" placeholder="例: recovered_002_企画名.txt"></div>' +
      '<div class="field"><label>一覧での要約</label><textarea id="f-summary">' + esc(entry.summary) + '</textarea></div>' +
      '<div class="field"><label>失敗の種類</label><input type="text" id="f-kind" value="' + escAttr(entry.kind) + '" placeholder="例: A. 企画の筋"></div>' +
      '<h3 style="margin-top:24px">詳細ページ(空欄のままなら一覧にのみ表示されます)</h3>' +
      '<div class="field"><label>詳細ページのリード文</label><textarea id="f-lead">' + esc(d.lead) + '</textarea></div>' +
      '<div class="row2">' +
      '<div class="field"><label>到達点</label><input type="text" id="f-reach" value="' + escAttr(d.reach) + '"></div>' +
      '<div class="field"><label>停止の判断</label><input type="text" id="f-stop" value="' + escAttr(d.stop) + '"></div>' +
      '</div>' +
      '<div class="field"><label>本文(見出し＋文章)</label><div id="f-sections"></div></div>' +
      '<div class="field"><label>関連する企画書(任意)</label><select id="f-related">' +
      '<option value="">関連なし</option>' +
      proposalOptions.map(function (p) { return '<option value="' + p.id + '.html" ' + (d.related && d.related.href === p.id + '.html' ? 'selected' : '') + '>' + esc(p.title) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-actions"><button class="btn primary" id="f-save">保存する</button><button class="btn" id="f-cancel">キャンセル</button></div></div>';

    repeater(app.querySelector('#f-sections'), sections, [{ key: 'h', label: '見出し' }, { key: 'p', label: '文章', type: 'textarea' }], '文章ブロックを追加');

    app.querySelector('#f-cancel').addEventListener('click', renderRecoveredList);
    app.querySelector('#f-save').addEventListener('click', function () {
      var lead = app.querySelector('#f-lead').value.trim();
      var kind = app.querySelector('#f-kind').value.trim();
      var relHref = app.querySelector('#f-related').value;
      var hasDetail = !!lead;
      var payload = {
        title: app.querySelector('#f-title').value.trim(),
        filename: app.querySelector('#f-filename').value.trim(),
        summary: app.querySelector('#f-summary').value.trim(),
        kind: kind,
        date: entry.date || null,
        detail: hasDetail ? {
          lead: lead,
          spec: [
            { k: '到達点', v: app.querySelector('#f-reach').value.trim() },
            { k: '失敗の種類', v: kind },
            { k: '停止の判断', v: app.querySelector('#f-stop').value.trim() }
          ],
          sections: sections.filter(function (s) { return s.h || s.p; }),
          related: relHref ? { label: null, href: relHref, text: relHref.replace('.html', '').replace('-', '_') + ' を見る' } : null
        } : null
      };
      if (!payload.title) { toast('タイトルを入力してください。', true); return; }
      if (hasDetail && !payload.date) payload.date = new Date().toISOString().slice(0, 10);
      afterSave(submitEntry('recovered', id, payload, {}), renderRecoveredList);
    });
  }

  // ================= プロフィール =================
  function renderProfileForm() {
    var p = state.content.profile;
    var sections = (p.sections || []).map(function (s) { return { h: s.h, p: s.p }; });
    var skills = (p.skills || []).map(function (s) { return { tool: s.tool, level: s.level, note: s.note, sub: s.sub ? '1' : '' }; });
    var hobby = (p.hobby || []).map(function (h) { return { b: h.b, t: h.t }; });

    app.innerHTML = '<div class="card"><h2>プロフィール</h2>' +
      '<div class="row2">' +
      '<div class="field"><label>氏名</label><input type="text" id="f-name" value="' + escAttr(p.name) + '"></div>' +
      '<div class="field"><label>ローマ字表記</label><input type="text" id="f-romaji" value="' + escAttr(p.romaji) + '"></div>' +
      '</div>' +
      '<div class="field"><label>志望職種</label><input type="text" id="f-role" value="' + escAttr(p.role) + '"></div>' +
      '<div class="field"><label>学校・所属</label><input type="text" id="f-school" value="' + escAttr(p.school) + '"></div>' +
      '<div class="field"><label>キャッチコピー</label><textarea id="f-tagline">' + esc(p.tagline) + '</textarea></div>' +
      '<div class="field"><label>顔写真(任意)</label>' +
      (p.photo ? '<p class="protected-note">現在の写真: ' + esc(p.photo) + '</p>' : '') +
      '<input type="file" id="f-photo" accept="image/png,image/jpeg,image/webp"></div>' +
      '<div class="field"><label>本文(見出し＋文章)</label><div id="f-sections"></div></div>' +
      '<div class="field"><label>スキル</label><div id="f-skills"></div></div>' +
      '<div class="field"><label>趣味</label><div id="f-hobby"></div></div>' +
      '<div class="field"><label>連絡先メール</label><input type="text" id="f-email" value="' + escAttr(p.email) + '"></div>' +
      '<div class="form-actions"><button class="btn primary" id="f-save">保存する</button></div></div>';

    repeater(app.querySelector('#f-sections'), sections, [{ key: 'h', label: '見出し' }, { key: 'p', label: '文章', type: 'textarea' }], '文章ブロックを追加');
    repeater(app.querySelector('#f-skills'), skills, [{ key: 'tool', label: 'ツール名' }, { key: 'level', label: 'レベル' }, { key: 'note', label: '具体例' }], 'スキルを追加');
    repeater(app.querySelector('#f-hobby'), hobby, [{ key: 'b', label: '趣味' }, { key: 't', label: '説明' }], '趣味を追加');

    app.querySelector('#f-save').addEventListener('click', function () {
      var payload = {
        name: app.querySelector('#f-name').value.trim(),
        romaji: app.querySelector('#f-romaji').value.trim(),
        role: app.querySelector('#f-role').value.trim(),
        school: app.querySelector('#f-school').value.trim(),
        tagline: app.querySelector('#f-tagline').value.trim(),
        sections: sections.filter(function (s) { return s.h || s.p; }),
        skills: skills.filter(function (s) { return s.tool; }).map(function (s) { return { tool: s.tool, level: s.level, note: s.note, sub: false }; }),
        hobby: hobby.filter(function (h) { return h.b; }),
        email: app.querySelector('#f-email').value.trim(),
        photoSource: 'self'
      };
      if (!payload.name) { toast('氏名を入力してください。', true); return; }
      afterSave(submitEntry('profile', null, payload, { photo: app.querySelector('#f-photo') }));
    });
  }

  // ================= FAQ =================
  function renderFaqEditor() {
    var items = state.content.faq.map(function (f) { return { q: f.q, a: f.a }; });
    app.innerHTML = '<div class="card"><h2>FAQ</h2><div class="field"><div id="f-faq"></div></div>' +
      '<div class="form-actions"><button class="btn primary" id="f-save">保存する</button></div></div>';
    repeater(app.querySelector('#f-faq'), items, [{ key: 'q', label: '質問' }, { key: 'a', label: '回答', type: 'textarea' }], '質問を追加');
    app.querySelector('#f-save').addEventListener('click', function () {
      var faq = items.filter(function (f) { return f.q || f.a; });
      fetch('/api/faq', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faq: faq }) })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.ok) { toast('保存しました。'); load(); } else { toast('保存できませんでした: ' + res.error, true); }
        });
    });
  }

  // ================= ライセンス(参照のみ) =================
  function renderLicenseView() {
    var l = state.content.license;
    var html = '<div class="card"><h2>ライセンス表記(自動管理)</h2>' +
      '<p class="hint">画像やPDFを追加すると、ここに自動で行が追加されます。フォントの表は固定です。</p>' +
      '<table class="lic"><thead><tr><th>フォント</th><th>ライセンス</th><th>用途</th></tr></thead><tbody>' +
      l.fonts.map(function (f) { return '<tr><td>' + esc(f.name) + '</td><td>' + esc(f.license) + '</td><td>' + esc(f.use) + '</td></tr>'; }).join('') +
      '</tbody></table>' +
      '<table class="lic"><thead><tr><th>対象</th><th>制作方法</th><th>状態</th></tr></thead><tbody>' +
      l.assets.map(function (a) { return '<tr><td>' + esc(a.name) + '</td><td>' + esc(a.method) + '</td><td>' + esc(a.status) + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    app.innerHTML = html;
  }

  load();
})();

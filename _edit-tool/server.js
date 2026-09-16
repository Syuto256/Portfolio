'use strict';
/*
 * Poro コンテンツ編集ツール ローカルサーバー
 * 外部npmパッケージは使用しない(Node標準ライブラリのみ)。
 * このサーバーはユーザー自身のPC上でのみ動作する編集専用ツールであり、
 * 公開されるサイト本体(index.html等)は生成後は完全な静的HTMLのまま。
 */
var http = require('http');
var fs = require('fs');
var path = require('path');
var templates = require('./templates.js');

var ROOT = path.join(__dirname, '..', 'docs'); // 公開サイト本体はここ(GitHub Pagesの公開フォルダと合わせている)
var CONTENT_DIR = path.join(__dirname, 'content');
var PUBLIC_DIR = path.join(__dirname, 'public');
var BACKUP_DIR = path.join(__dirname, 'backups');
var ASSETS_IMG = path.join(ROOT, 'assets', 'img');
var ASSETS_PDF = path.join(ROOT, 'assets', 'pdf');
var PORT = 4173;

var MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB(300KBは目安・警告のみ)
var MAX_PDF_BYTES = 5 * 1024 * 1024;   // 5MB(ガイド上限。超過は拒否)

[ASSETS_IMG, ASSETS_PDF, BACKUP_DIR].forEach(function (d) {
  fs.mkdirSync(d, { recursive: true });
});

// ---------------- コンテンツの読み書き ----------------
function loadJSON(name) {
  return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, name), 'utf8'));
}
function saveJSON(name, data) {
  fs.writeFileSync(path.join(CONTENT_DIR, name), JSON.stringify(data, null, 2), 'utf8');
}
function loadContent() {
  return {
    proposals: loadJSON('proposals.json'),
    analyses: loadJSON('analyses.json'),
    works: loadJSON('works.json'),
    recovered: loadJSON('recovered.json'),
    profile: loadJSON('profile.json'),
    faq: loadJSON('faq.json'),
    license: loadJSON('license.json')
  };
}
function saveContent(content) {
  saveJSON('proposals.json', content.proposals);
  saveJSON('analyses.json', content.analyses);
  saveJSON('works.json', content.works);
  saveJSON('recovered.json', content.recovered);
  saveJSON('profile.json', content.profile);
  saveJSON('faq.json', content.faq);
  saveJSON('license.json', content.license);
}

// ---------------- バックアップ ----------------
function timestamp() {
  var d = new Date();
  function p(n) { return String(n).padStart(2, '0'); }
  return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function backupFile(relName) {
  var src = path.join(ROOT, relName);
  if (!fs.existsSync(src)) return;
  var dir = path.join(BACKUP_DIR, timestamp());
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, path.join(dir, relName));
}

// ---------------- サイト全体の再生成 ----------------
function regenerateAll(content) {
  var files = templates.renderSite(content);
  var written = [];
  Object.keys(files).forEach(function (name) {
    var dest = path.join(ROOT, name);
    var next = files[name];
    var prev = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
    if (prev !== next) {
      if (prev !== null) backupFile(name);
      fs.writeFileSync(dest, next, 'utf8');
      written.push(name);
    }
  });
  return written;
}

// 指定した物理ファイルが存在すればバックアップして削除する(エントリ削除時に使用)
function removePhysicalFile(name) {
  var dest = path.join(ROOT, name);
  if (fs.existsSync(dest)) {
    backupFile(name);
    fs.unlinkSync(dest);
  }
}

// ---------------- ID採番 ----------------
function nextId(list, prefix, pad) {
  var max = 0;
  list.forEach(function (e) {
    var m = new RegExp('^' + prefix + '-(\\d+)$').exec(e.id);
    if (m) { var n = parseInt(m[1], 10); if (n > max) max = n; }
  });
  var next = max + 1;
  return prefix + '-' + (pad ? String(next).padStart(3, '0') : String(next));
}

function todayStr() {
  var d = new Date();
  function p(n) { return String(n).padStart(2, '0'); }
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

// ---------------- 最小限のmultipart/form-dataパーサー ----------------
function bufferSplit(buf, delim) {
  var result = [];
  var start = 0;
  while (true) {
    var idx = buf.indexOf(delim, start);
    if (idx === -1) { result.push(buf.slice(start)); break; }
    result.push(buf.slice(start, idx));
    start = idx + delim.length;
  }
  return result;
}
function parseMultipart(buf, boundary) {
  var delim = Buffer.from('--' + boundary);
  var rawParts = bufferSplit(buf, delim);
  var fields = {};
  var files = {};
  for (var i = 1; i < rawParts.length - 1; i++) {
    var part = rawParts[i];
    if (part.length >= 2 && part.slice(0, 2).toString('binary') === '\r\n') part = part.slice(2);
    if (part.length >= 2 && part.slice(-2).toString('binary') === '\r\n') part = part.slice(0, -2);
    var headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    var headerStr = part.slice(0, headerEnd).toString('utf8');
    var body = part.slice(headerEnd + 4);
    var nameMatch = /name="([^"]*)"/.exec(headerStr);
    var filenameMatch = /filename="([^"]*)"/.exec(headerStr);
    var ctMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerStr);
    var name = nameMatch ? nameMatch[1] : null;
    if (!name) continue;
    if (filenameMatch && filenameMatch[1]) {
      files[name] = { filename: filenameMatch[1], contentType: ctMatch ? ctMatch[1].trim() : 'application/octet-stream', data: body };
    } else {
      fields[name] = body.toString('utf8');
    }
  }
  return { fields: fields, files: files };
}

function readBody(req, cb) {
  var chunks = [];
  var total = 0;
  req.on('data', function (c) {
    chunks.push(c);
    total += c.length;
    if (total > 20 * 1024 * 1024) { req.destroy(); }
  });
  req.on('end', function () { cb(Buffer.concat(chunks)); });
}

function safeExt(filename, fallback) {
  var ext = path.extname(filename || '').toLowerCase();
  return ext || fallback;
}
function safeBaseName(filename) {
  return String(filename || 'file').replace(/[^A-Za-z0-9_\-\.ぁ-んァ-ン一-龥]/g, '_');
}
function saveUpload(file, dir, publicPrefix) {
  var name = Date.now() + '_' + safeBaseName(file.filename);
  fs.writeFileSync(path.join(dir, name), file.data);
  return publicPrefix + '/' + name;
}

// 画像追加時、license.htmlの表に自動で行を追記する
function appendLicenseRow(content, name, source) {
  var method = source === 'ai' ? '画像生成AIを使用して制作' : '本人が作成';
  var status = source === 'ai' ? '暫定版' : '―';
  content.license.assets.push({ name: name, method: method, status: status, protected: false });
}

// ---------------- APIハンドラ ----------------
function jsonResponse(res, status, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function handleGetContent(req, res) {
  jsonResponse(res, 200, loadContent());
}

function applyFileUploads(entryData, type, files, content, imgLabelPrefix) {
  if (files.pdfPreview) {
    if (files.pdfPreview.data.length > MAX_IMAGE_BYTES) throw new Error('PDFスクリーンショットが大きすぎます(上限3MB)。圧縮してから再度お試しください。');
    entryData.pdfPreview = saveUpload(files.pdfPreview, ASSETS_IMG, 'assets/img');
    appendLicenseRow(content, imgLabelPrefix + 'PDFプレビュー', entryData.pdfPreviewSource === 'ai' ? 'ai' : 'self');
  }
  if (files.figureImage) {
    if (files.figureImage.data.length > MAX_IMAGE_BYTES) throw new Error('画像が大きすぎます(上限3MB)。圧縮してから再度お試しください。');
    var figPath = saveUpload(files.figureImage, ASSETS_IMG, 'assets/img');
    entryData.figure = entryData.figure || {};
    entryData.figure.image = figPath;
    entryData.figure.rawSvg = null;
    appendLicenseRow(content, imgLabelPrefix + '図版', entryData.figureSource === 'ai' ? 'ai' : 'self');
  }
  if (files.pdfFile) {
    if (files.pdfFile.data.length > MAX_PDF_BYTES) throw new Error('PDFが大きすぎます(上限5MB)。');
    entryData.pdf = saveUpload(files.pdfFile, ASSETS_PDF, 'assets/pdf');
  }
  if (files.thumb) {
    if (files.thumb.data.length > MAX_IMAGE_BYTES) throw new Error('画像が大きすぎます(上限3MB)。圧縮してから再度お試しください。');
    entryData.thumb = saveUpload(files.thumb, ASSETS_IMG, 'assets/img');
    appendLicenseRow(content, imgLabelPrefix + 'サムネイル', entryData.thumbSource === 'ai' ? 'ai' : 'self');
  }
  if (files.photo) {
    if (files.photo.data.length > MAX_IMAGE_BYTES) throw new Error('画像が大きすぎます(上限3MB)。圧縮してから再度お試しください。');
    entryData.photo = saveUpload(files.photo, ASSETS_IMG, 'assets/img');
    appendLicenseRow(content, '顔写真', entryData.photoSource === 'ai' ? 'ai' : 'self');
  }
}

function handleSaveEntry(req, res, body, boundary) {
  var parsed = parseMultipart(body, boundary);
  var type = parsed.fields.type;
  var id = parsed.fields.id;
  var payload = {};
  try { payload = JSON.parse(parsed.fields.payload || '{}'); } catch (e) { }

  var content = loadContent();
  var arrKey, prefix, pad;
  if (type === 'proposal') { arrKey = 'proposals'; prefix = 'proposal'; pad = true; }
  else if (type === 'analysis') { arrKey = 'analyses'; prefix = 'analysis'; pad = true; }
  else if (type === 'work') { arrKey = 'works'; prefix = 'work'; pad = false; }
  else if (type === 'recovered') { arrKey = 'recovered'; prefix = 'recovered'; pad = true; }
  else if (type === 'profile') { arrKey = null; }
  else { jsonResponse(res, 400, { ok: false, error: '不明な種類です: ' + type }); return; }

  try {
    if (type === 'profile') {
      applyFileUploads(payload, type, parsed.files, content, '');
      Object.assign(content.profile, payload);
      if (payload.photo) content.profile.photo = payload.photo;
    } else {
      applyFileUploads(payload, type, parsed.files, content, payload.title ? (payload.title + ' ') : '');
      var list = content[arrKey];
      var existingIdx = id ? list.findIndex(function (e) { return e.id === id; }) : -1;
      if (existingIdx >= 0) {
        payload.id = id;
        payload.protected = list[existingIdx].protected;
        if (!payload.date && list[existingIdx].date) payload.date = list[existingIdx].date;
        list[existingIdx] = Object.assign({}, list[existingIdx], payload);
      } else {
        payload.id = nextId(list, prefix, pad);
        payload.protected = false;
        if ('date' in payload === false && (type === 'proposal' || type === 'analysis' || type === 'recovered')) {
          payload.date = todayStr();
        }
        list.push(payload);
      }
      id = payload.id;
    }

    saveContent(content);
    var written = regenerateAll(content);
    jsonResponse(res, 200, { ok: true, id: id, files: written });
  } catch (err) {
    jsonResponse(res, 400, { ok: false, error: err.message });
  }
}

function handleDeleteEntry(req, res, body) {
  var payload;
  try { payload = JSON.parse(body.toString('utf8')); } catch (e) { jsonResponse(res, 400, { ok: false, error: '不正な要求です' }); return; }
  var type = payload.type, id = payload.id;
  var arrKey = type === 'proposal' ? 'proposals' : type === 'analysis' ? 'analyses' : type === 'work' ? 'works' : type === 'recovered' ? 'recovered' : null;
  if (!arrKey) { jsonResponse(res, 400, { ok: false, error: '不明な種類です' }); return; }

  var content = loadContent();
  var list = content[arrKey];
  var idx = list.findIndex(function (e) { return e.id === id; });
  if (idx === -1) { jsonResponse(res, 404, { ok: false, error: '見つかりません' }); return; }

  if (type === 'proposal' || type === 'analysis') {
    removePhysicalFile(id + '.html');
  } else if (type === 'recovered' && list[idx].detail) {
    removePhysicalFile(id + '.html');
  }
  list.splice(idx, 1);
  saveContent(content);
  var written = regenerateAll(content);
  jsonResponse(res, 200, { ok: true, files: written });
}

function handleSaveFaq(req, res, body) {
  var payload;
  try { payload = JSON.parse(body.toString('utf8')); } catch (e) { jsonResponse(res, 400, { ok: false, error: '不正な要求です' }); return; }
  var content = loadContent();
  content.faq = (payload.faq || []).map(function (f, i) { return { id: f.id || ('faq-' + (i + 1)), q: f.q, a: f.a }; });
  saveContent(content);
  var written = regenerateAll(content);
  jsonResponse(res, 200, { ok: true, files: written });
}

// ---------------- 静的ファイル配信 ----------------
var MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf'
};
function serveFile(res, filePath) {
  fs.readFile(filePath, function (err, data) {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    var ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

var server = http.createServer(function (req, res) {
  var urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (req.method === 'GET' && urlPath === '/api/content') return handleGetContent(req, res);

  if (req.method === 'POST' && urlPath === '/api/entry') {
    var ct = req.headers['content-type'] || '';
    var b = /boundary=(.+)$/.exec(ct);
    if (!b) { jsonResponse(res, 400, { ok: false, error: 'multipart形式ではありません' }); return; }
    return readBody(req, function (body) { handleSaveEntry(req, res, body, b[1]); });
  }
  if (req.method === 'POST' && urlPath === '/api/entry/delete') {
    return readBody(req, function (body) { handleDeleteEntry(req, res, body); });
  }
  if (req.method === 'POST' && urlPath === '/api/faq') {
    return readBody(req, function (body) { handleSaveFaq(req, res, body); });
  }

  if (req.method === 'GET') {
    if (urlPath === '/' || urlPath === '') {
      res.writeHead(302, { Location: '/editor.html' });
      return res.end();
    }
    if (urlPath.indexOf('/site/') === 0) {
      var siteRel = urlPath.replace('/site/', '');
      return serveFile(res, path.join(ROOT, siteRel));
    }
    var pubPath = path.join(PUBLIC_DIR, urlPath);
    if (fs.existsSync(pubPath) && fs.statSync(pubPath).isFile()) {
      return serveFile(res, pubPath);
    }
  }

  res.writeHead(404);
  res.end('Not found');
});

server.on('error', function (err) {
  if (err.code === 'EADDRINUSE') {
    console.log('');
    console.log('■ ポート ' + PORT + ' はすでに使われています。');
    console.log('  他に編集ツールが起動していないか確認し、そちらを閉じてから再度実行してください。');
    console.log('');
  } else {
    console.log('エラーが発生しました: ' + err.message);
  }
});

server.listen(PORT, function () {
  console.log('');
  console.log('=========================================================');
  console.log(' Poro コンテンツ編集ツール が起動しました');
  console.log(' ブラウザで以下のアドレスを開いてください:');
  console.log(' http://localhost:' + PORT + '/editor.html');
  console.log('');
  console.log(' このウィンドウを閉じると編集ツールは終了します。');
  console.log(' 編集が終わったら、このウィンドウを閉じてください。');
  console.log('=========================================================');
  console.log('');
});

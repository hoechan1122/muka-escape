// 偽タイトル「お母さんから逃げろ」と、オープニングの動画(お母さんに追いかけられる → 予告状)
// 本体(index.html)の ctx / W / H / textLines / drawBusaiku などを使う
const OP_FENCE = 1420;      // 主人公が飛び越える柵の位置
const OP_CARD = 760;        // このフレームから予告状を出す
let op = null;
let openingSeen = false;
try { openingSeen = localStorage.getItem('muka-opening') === '1'; } catch (e) {}

function startOpening() {
  mode = 'opening';
  op = { t: 0, hx: 320, hy: 0, hvy: 0, mx: 70, fell: false, jumped: false, skipTease: false };
  clearKeys();
}

function finishOpening() {
  openingSeen = true;
  try { localStorage.setItem('muka-opening', '1'); } catch (e) {}
  op = null;
  loadStage(stageIndex, true); mode = 'play';
  saveGame();
}

// Enter/タップ: 予告状が出ていれば始める。初めて見るときはスキップさせない(煽る)
function openingPress() {
  if (op.t >= OP_CARD + 30) return finishOpening();
  if (openingSeen) { op.t = OP_CARD; return; }
  if (!op.skipTease) { op.skipTease = true; flash = { text: 'スキップできると思いました?\n…それ、固定概念です', t: 150 }; }
}

function updateOpening() {
  const o = op; o.t++;
  const t = o.t;
  if (t > 90 && t < 470) { o.hx += 3.4; }
  if (t > 90 && !o.fell) o.mx += 3.3 + Math.sin(t * 0.13) * 0.5;
  if (!o.jumped && o.hx > OP_FENCE - 70) { o.jumped = true; o.hvy = -9; }
  o.hvy += 0.45; o.hy = Math.min(0, o.hy + o.hvy);
  if (!o.fell && o.mx > OP_FENCE - 50) { o.fell = true; o.mx = OP_FENCE - 50; o.fellT = t; Sound.sfx.bump(); }
  if (t === OP_CARD) Sound.sfx.solve();
}

// お母さん(パーマ・エプロン・手にスリッパ)
function drawMom(x, gy, t, fell, sc = 1.6) {
  ctx.save();
  ctx.translate(x, gy);
  if (fell) { ctx.translate(0, -8); ctx.rotate(-Math.PI / 2); }
  ctx.scale(sc, sc);
  ctx.lineCap = 'round'; ctx.strokeStyle = '#222';
  const run = fell ? 0 : Math.sin(t * 0.4) * 6;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-5 + run, 0); ctx.moveTo(5, -10); ctx.lineTo(5 - run, 0); ctx.stroke();
  // ワンピースとエプロン
  ctx.fillStyle = '#e85d9c'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, -40); ctx.lineTo(9, -40); ctx.lineTo(14, -9); ctx.lineTo(-14, -9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(-7, -32, 14, 20); ctx.strokeRect(-7, -32, 14, 20);
  // スリッパを振り回す腕
  const wave = fell ? 0 : Math.sin(t * 0.5) * 0.6;
  ctx.save(); ctx.translate(8, -36); ctx.rotate(-1.2 + wave);
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, 0); ctx.stroke();
  ctx.fillStyle = '#8d5a2b'; ctx.beginPath(); ctx.ellipse(20, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
  // 顔
  ctx.fillStyle = '#f5d6b8'; ctx.beginPath(); ctx.arc(0, -50, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // パーマ
  ctx.fillStyle = '#7b4ea3';
  [[-10, -58], [-5, -63], [2, -64], [8, -60], [11, -53], [-12, -50]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 5, 0, Math.PI * 2); ctx.fill(); });
  // 怒った目と大きな口
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-7, -55); ctx.lineTo(-2, -52); ctx.moveTo(7, -55); ctx.lineTo(2, -52); ctx.stroke();
  ctx.fillStyle = '#222'; ctx.fillRect(-6, -51, 2, 2); ctx.fillRect(4, -51, 2, 2);
  ctx.fillStyle = '#b3002d'; ctx.beginPath(); ctx.ellipse(0, -44, 4, fell ? 1.5 : 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (fell) { // 目を回している
    ctx.fillStyle = '#ffd84a';
    for (let i = 0; i < 3; i++) { const a = t * 0.1 + i * 2.1; textLines('★', x - 40 + Math.cos(a) * 24, gy - 40 + Math.sin(a) * 8, 16, '#ffd84a'); }
  }
}

function bigBubble(text, cx, bottomY, color = '#fff') {
  const lines = text.split('\n');
  ctx.font = 'bold 18px "Yu Gothic", "Meiryo", "Hiragino Sans", sans-serif';
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 24, h = lines.length * 26 + 14;
  const x = Math.max(8, Math.min(W - w - 8, cx - w / 2)), y = bottomY - h - 12;
  ctx.fillStyle = color; ctx.strokeStyle = '#222'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 8, y + h); ctx.lineTo(cx, y + h + 12); ctx.lineTo(cx + 8, y + h); ctx.fill();
  textLines(text, x + w / 2, y + 8, 18, '#222', 'center', 1.45);
}

function drawOpeningScene() {
  const o = op, t = o.t, gy = 400;
  const cam = Math.max(0, (o.hx + o.mx) / 2 - W / 2);   // 主人公とお母さんが両方見えるように
  // 空・雲・家並み
  const sky = ctx.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, '#9fd8ff'); sky.addColorStop(1, '#fff1d6');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  camX = cam * 0.6; drawClouds();
  for (let i = -1; i < 12; i++) {
    const hx = i * 260 - (cam % 260) + 40;
    ctx.fillStyle = ['#f4c7a1', '#c9e4ff', '#ffe3a3'][((i + Math.floor(cam / 260)) % 3 + 3) % 3];
    ctx.fillRect(hx, gy - 120, 150, 120);
    ctx.fillStyle = '#b5543b'; ctx.beginPath(); ctx.moveTo(hx - 12, gy - 120); ctx.lineTo(hx + 75, gy - 175); ctx.lineTo(hx + 162, gy - 120); ctx.fill();
    ctx.fillStyle = '#7fb8e6'; ctx.fillRect(hx + 22, gy - 90, 34, 30); ctx.fillRect(hx + 94, gy - 90, 34, 30);
  }
  ctx.fillStyle = '#9b9b9b'; ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = '#6d6d6d'; for (let x = -(cam % 60); x < W; x += 60) ctx.fillRect(x, gy + 30, 30, 5);
  // 柵
  const fx = OP_FENCE - cam;
  ctx.fillStyle = '#c98b4a'; ctx.strokeStyle = '#5a3510'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.fillRect(fx + i * 16, gy - 56, 10, 56); ctx.strokeRect(fx + i * 16, gy - 56, 10, 56); }
  ctx.fillRect(fx - 4, gy - 44, 44, 8); ctx.fillRect(fx - 4, gy - 22, 44, 8);

  drawMom(o.mx - cam, gy, t, o.fell);
  drawBusaiku(o.hx - cam, gy - 22 + o.hy, t > 480 ? -1 : 1, false, t < 470 ? t * 3 : 0, 1.4);

  // セリフ
  const momX = o.mx - cam, heroX = o.hx - cam;
  const say = [
    [10, 100, 'm', 'ライオットドリル!!\n宿題は やったの!?'],
    [60, 115, 'h', 'やべっ'],
    [130, 230, 'm', 'ゲームばっかり してるんじゃないの!'],
    [250, 350, 'm', 'ご飯 いらないのね!?'],
    [370, 470, 'm', '待ちなさーーい!!'],
    [490, 600, 'm', 'ドテッ'],
    [540, 640, 'm', '…覚えてなさいよ…'],
    [610, 720, 'h', '逃げ切った…!'],
  ];
  for (const [a, b, who, text] of say) {
    if (t < a || t > b) continue;
    if (who === 'm') bigBubble(text, momX, gy - 110, text === 'ドテッ' ? '#ffd84a' : '#fff');
    else bigBubble(text, heroX, gy - 60);
  }
  textLines(openingSeen ? 'Enter / タップ でスキップ' : '', W - 16, 12, 14, '#555', 'right');
}

// 切り抜き文字(1文字ずつ色・向きがちがう)。同じ文字列なら毎回同じ見た目になる
function cutout(text, cx, y, size) {
  const FONTS = ['"Yu Gothic", "Hiragino Sans", sans-serif', '"Yu Mincho", "Hiragino Mincho ProN", serif', '"Meiryo", sans-serif'];
  const STY = [['#111', '#fff'], ['#fff', '#111'], ['#d7001a', '#fff'], ['#fff', '#d7001a']];
  const items = [];
  let total = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ' ') { items.push(null); total += size * 0.4; continue; }
    const r = Math.abs(Math.sin((i + 1) * 12.9898 + text.length * 78.233)) % 1;
    const s = size * (0.88 + r * 0.24);
    ctx.font = `bold ${s}px ${FONTS[i % 3]}`;
    const w = ctx.measureText(ch).width + s * 0.25;
    items.push({ ch, s, w, font: ctx.font, sty: STY[Math.floor(r * 4) % 4], rot: (r - 0.5) * 0.28 });
    total += w + 4;
  }
  let x = cx - total / 2;
  for (const it of items) {
    if (!it) { x += size * 0.4; continue; }
    ctx.save();
    ctx.translate(x + it.w / 2, y + size / 2); ctx.rotate(it.rot);
    ctx.fillStyle = it.sty[0]; ctx.fillRect(-it.w / 2, -it.s * 0.62, it.w, it.s * 1.2);
    if (it.sty[0] === '#fff') { ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.strokeRect(-it.w / 2, -it.s * 0.62, it.w, it.s * 1.2); }
    ctx.font = it.font; ctx.fillStyle = it.sty[1]; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(it.ch, 0, 0);
    ctx.restore();
    x += it.w + 4;
  }
}

// ゲームの中の予告状
function drawCallingCard(k) {
  ctx.fillStyle = '#d7001a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#a80016';
  for (let i = -4; i < 14; i++) { const x = i * 110; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x - 260, H); ctx.lineTo(x - 300, H); ctx.fill(); }
  ctx.save();
  ctx.translate(W / 2, H / 2 + (1 - k) * 500); ctx.rotate(-0.03 + (1 - k) * 0.4);
  ctx.fillStyle = '#faf8f2'; ctx.fillRect(-330, -225, 660, 450);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 6; ctx.strokeRect(-330, -225, 660, 450);
  ctx.restore();
  if (k < 1) return;
  cutout('予告状', W / 2, 34, 58);
  cutout('タイトルに 騙されてやんの〜', W / 2, 128, 32);
  cutout('これは『お母さんから逃げろ』では ない', W / 2, 190, 22);
  cutout('本当の名前は『むかつく脱出』', W / 2, 236, 24);
  cutout('おまえの 固定概念を いただく', W / 2, 292, 30);
  cutout('ライオットドリル', W / 2 + 120, 356, 22);
  if (op.t % 60 < 40) textLines('Enter / タップ で はじまる', W / 2, 408, 18, '#d7001a');
}

function drawOpening() {
  if (op.t < OP_CARD) drawOpeningScene();
  else drawCallingCard(Math.min(1, (op.t - OP_CARD) / 30));
}

// 偽タイトル画面(オープニングを見たあとは、赤い×とハンコで正体がバレる)
function drawTitleScreen() {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe0ef'); g.addColorStop(1, '#fff6c9');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  camX = ticks * 0.3; drawClouds();
  ctx.font = 'bold 54px "Yu Gothic", "Hiragino Sans", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.lineWidth = 10; ctx.strokeStyle = '#fff'; ctx.strokeText('お母さんから逃げろ!', W / 2, 26);
  ctx.fillStyle = '#e8508f'; ctx.fillText('お母さんから逃げろ!', W / 2, 26);
  textLines('〜 ライオットドリルの ドキドキ夏休み 〜', W / 2, 92, 20, '#b0476f');
  textLines('かんたん! 5分で遊べる ほのぼのアクション♪', W / 2, 122, 16, '#8a6d7a');
  const tt = ticks;
  drawMom(W / 2 - 150 + Math.sin(tt * 0.03) * 20, 262, tt, false, 1.3);
  drawBusaiku(W / 2 + 60 + Math.sin(tt * 0.03) * 20, 244, 1, false, tt * 3, 1.3);
  if (openingSeen) {
    ctx.strokeStyle = '#d7001a'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(W / 2 - 280, 40); ctx.lineTo(W / 2 + 280, 72); ctx.moveTo(W / 2 - 280, 72); ctx.lineTo(W / 2 + 280, 40); ctx.stroke();
    ctx.save(); ctx.translate(W - 170, 200); ctx.rotate(-0.18);
    ctx.strokeStyle = '#d7001a'; ctx.lineWidth = 4; ctx.strokeRect(-130, -38, 260, 76);
    textLines('むかつく脱出', 0, -30, 32, '#d7001a'); textLines('がんばったら1時間で終わるかもねーーん!!', 0, 12, 11, '#d7001a');
    ctx.restore();
  }
  if (menu.title) textLines(menu.title, W / 2, 292, 20, '#d7001a');
  drawMenu(menu.title ? 330 : 305, true);
}

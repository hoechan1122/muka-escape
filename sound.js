// 音(BGMと効果音)。音声ファイルは使わず、Web Audio でその場で鳴らす
// 曲はすべてオリジナル。死んだときの音は「昔のゲームの残念な音」っぽくふざけた感じにしている
const Sound = (() => {
  let ac = null, master = null, bgm = null, nextT = 0, stepI = 0, hold = 0;
  let muted = false;
  try { muted = localStorage.getItem('muka-muted') === '1'; } catch (e) { /* 保存できなくても鳴らす */ }
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  // スマホは「画面を触った瞬間」にしか音を出せないので、最初の操作で呼ぶ
  function init() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = muted ? 0 : 0.3; master.connect(ac.destination);
      } catch (e) { ac = null; return; }
    }
    if (ac.state === 'suspended') ac.resume();
  }

  function note(freq, t, dur, type = 'square', vol = 0.15, slide = null, vib = 0) {
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(slide, t + dur);
    if (vib) {
      const l = ac.createOscillator(), lg = ac.createGain();
      l.frequency.value = 7; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency);
      l.start(t); l.stop(t + dur);
    }
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  // step = 1マスの長さ(秒)。数字は音の高さ(60 = ド)。0 は休み
  const SONGS = {
    // 偽タイトル用: ほのぼのした ウソの曲
    cute: { step: 0.24, type: 'triangle', len: 1.6,
      mel: [72,0,76,0,79,0,76,0, 77,0,81,0,79,0,0,0, 76,0,79,0,84,0,79,0, 77,76,74,0,72,0,0,0],
      bass: [48,0,55,0,48,0,55,0, 53,0,60,0,55,0,59,0, 48,0,55,0,57,0,52,0, 53,0,55,0,48,0,0,0] },
    // ステージ用: ずっこけたサーカス風
    goofy: { step: 0.13, type: 'square', len: 0.8,
      mel: [72,0,71,72, 76,0,72,0, 79,0,78,79, 84,0,79,0, 77,0,76,77, 81,0,77,0, 76,75,74,73, 72,0,67,0,
            72,0,71,72, 76,0,72,0, 79,0,78,79, 84,0,86,0, 84,83,82,81, 80,79,78,77, 76,0,74,0, 72,0,0,0],
      bass: [48,0,55,0, 48,0,55,0, 53,0,60,0, 53,0,60,0, 50,0,57,0, 55,0,59,0, 48,0,55,0, 43,0,47,0] },
    // 追いかけられるとき用: あせる曲
    chase: { step: 0.1, type: 'square', len: 0.8,
      mel: [69,69,72,69, 74,72,69,67, 69,69,72,69, 76,74,72,71, 69,69,72,69, 74,72,69,67, 65,67,69,71, 72,71,69,0],
      bass: [45,0,45,0, 45,0,45,0, 50,0,50,0, 52,0,52,0] },
    // マップ用: のんきな曲
    map: { step: 0.18, type: 'triangle', len: 1.2,
      mel: [67,0,72,0,71,0,69,0, 67,0,64,0,65,67,0,0, 69,0,74,0,72,0,71,0, 69,0,67,0,72,0,0,0],
      bass: [48,0,55,0,53,0,55,0, 48,0,55,0,53,0,55,0] },
  };

  function play(name) {
    if (bgm && bgm.name === name) return;
    bgm = name ? { name, ...SONGS[name] } : null;
    stepI = 0;
    if (ac) nextT = ac.currentTime + 0.05;
  }

  // 毎フレーム呼んで、少し先までの音を予約する
  function tick() {
    if (!ac || !bgm || muted) return;
    if (hold > ac.currentTime) return;   // 死んだときの音が鳴っている間は止める
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.02;
    while (nextT < ac.currentTime + 0.15) {
      const m = bgm.mel[stepI % bgm.mel.length];
      if (m) note(hz(m), nextT, bgm.step * bgm.len, bgm.type, 0.07);
      const b = bgm.bass && bgm.bass[stepI % bgm.bass.length];
      if (b) note(hz(b), nextT, bgm.step * 0.9, 'triangle', 0.12);
      nextT += bgm.step; stepI++;
    }
  }

  const now = () => (ac ? ac.currentTime + 0.01 : 0);
  const sfx = {
    jump() { note(300, now(), 0.14, 'square', 0.06, 720); },
    stomp() { note(200, now(), 0.1, 'square', 0.1, 60); },
    coin() { const t = now(); note(988, t, 0.07, 'square', 0.06); note(1319, t + 0.07, 0.2, 'square', 0.06); },
    bump() { note(130, now(), 0.1, 'triangle', 0.2, 70); },
    warp() { const t = now(); for (let i = 0; i < 3; i++) note(600 - i * 150, t + i * 0.12, 0.12, 'square', 0.06, 300 - i * 80); },
    error() { const t = now(); note(880, t, 0.18, 'sine', 0.12); note(660, t + 0.18, 0.3, 'sine', 0.12); },
    solve() { const t = now(); note(1047, t, 0.25, 'sine', 0.12); note(1319, t + 0.2, 0.5, 'sine', 0.12); },
    // 死んだとき: 「ぷぁ〜ぷぁ〜ぷぁ〜 ぷぁぁぁ〜〜」→「ちーん」
    death() {
      if (!ac) return;
      const t = now(); hold = t + 2.4;
      [55, 54, 53].forEach((n, i) => note(hz(n), t + i * 0.34, 0.32, 'sawtooth', 0.11, null, 3));
      note(hz(52), t + 1.02, 1.1, 'sawtooth', 0.12, hz(50), 9);
      note(1760, t + 2.1, 1.4, 'sine', 0.06);
    },
    // クリア: 張り切ったファンファーレ →最後に音を外して「ぷぅ」
    clear() {
      if (!ac) return;
      const t = now(); hold = t + 2.2;
      [72, 76, 79, 84].forEach((n, i) => note(hz(n), t + i * 0.12, 0.14, 'square', 0.08));
      note(hz(83), t + 0.5, 0.7, 'square', 0.08, null, 4);
      note(95, t + 1.3, 0.5, 'sawtooth', 0.13, 55);
    },
  };

  function toggle() {
    muted = !muted;
    try { localStorage.setItem('muka-muted', muted ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = muted ? 0 : 0.3;
    if (!muted && ac) nextT = ac.currentTime + 0.05;
    return muted;
  }

  return { init, play, tick, sfx, toggle, get muted() { return muted; } };
})();

/* Lenz's Alibi — procedural soundtrack + soft lab ambience (Web Audio, no audio files).
   Music: a slow, warm chord pad in A minor (chill), a soft heartbeat pulse and a gentle delayed arpeggio whose
   strength rises as you verify clues and during field surges (intense). Under it: a very quiet room tone,
   a low accelerator drone near the ring, footsteps and the induction-wand hum. No crackle, no hiss bursts. */
(function () {
  'use strict';
  const A = { on: true };
  const VOL = 0.42; // master level
  let ctx = null, master, comp, muffle, musicBus, amb, sfx, space, BROWN, L = {}, wandG, wandO;
  let nextBar = 0, bar = 0, nextStep = 0, step = 0, lastFoot = 0, inten = 0.25, tIntent = 0.25, chordNow = null;
  try { if (localStorage.getItem('lenz.sound') === '0') A.on = false; } catch (e) { /* storage unavailable */ }

  // ---------------- helpers
  const gain = (v, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const osc = (type, f, to) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (to) o.connect(to); o.start(); return o; };
  const filt = (type, f, q, to) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (to) b.connect(to); return b; };
  const lfo = (f, depth, param) => { const o = osc('sine', f), g = gain(depth); o.connect(g); g.connect(param); return o; };
  const set = (param, v, tc) => param.setTargetAtTime(v, ctx.currentTime, tc || 0.25);
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function brown() { const n = ctx.sampleRate * 4, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } return b; }
  // soft note: sine/triangle with smooth attack and long release (no clicks)
  function note(f, t0, dur, vol, type, to, attack) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.value = f;
    const a = attack || 0.02; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + a); g.gain.setTargetAtTime(0, t0 + a, dur / 4);
    o.connect(g); g.connect(to || sfx); o.start(t0); o.stop(t0 + a + dur * 1.5);
  }
  function glide(f1, f2, t0, dur, vol, to) { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.3); g.gain.linearRampToValueAtTime(0, t0 + dur); o.connect(g); g.connect(to || sfx); o.start(t0); o.stop(t0 + dur + 0.05); }
  // a pad chord that swells in and out
  function chord(midis, t0, dur, vol, to) {
    midis.forEach((m, i) => [0, 7].forEach(cents => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = filt('lowpass', 700 + i * 120, 0.3);
      o.type = 'triangle'; o.frequency.value = hz(m); o.detune.value = cents * (i % 2 ? 1 : -1);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol / midis.length, t0 + dur * 0.35); g.gain.linearRampToValueAtTime(vol / midis.length * 0.8, t0 + dur * 0.8); g.gain.linearRampToValueAtTime(0, t0 + dur + 1.5);
      o.connect(lp); lp.connect(g); g.connect(to); o.start(t0); o.stop(t0 + dur + 1.6);
    }));
  }

  // A minor, chill → a little tension on the last bar
  const PROG = [
    { pad: [45, 52, 55, 59, 60], arp: [57, 60, 64, 67, 71, 67, 64, 60], bass: 33 }, // Am9
    { pad: [41, 48, 52, 57, 60], arp: [57, 60, 64, 65, 69, 65, 64, 60], bass: 29 }, // Fmaj7
    { pad: [48, 55, 59, 62, 64], arp: [60, 64, 67, 71, 74, 71, 67, 64], bass: 36 }, // Cmaj9
    { pad: [40, 47, 50, 55, 59], arp: [59, 62, 64, 67, 71, 68, 64, 62], bass: 28 }  // Em7 → (G#) leading back
  ];
  const BPM = 78, BEAT = 60 / BPM, BAR = BEAT * 4;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); BROWN = brown();
    master = gain(A.on ? VOL : 0, ctx.destination);
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -24; comp.ratio.value = 3; comp.connect(master);
    muffle = filt('lowpass', 12000, 0.3, comp);
    // a soft "room": feedback delay with darkening in the loop
    space = gain(1); const dl = ctx.createDelay(1.5); dl.delayTime.value = BEAT * 0.75; const fb = gain(0.38), dark = filt('lowpass', 1600, 0.3), wet = gain(0.5, muffle);
    space.connect(dl); dl.connect(dark); dark.connect(fb); fb.connect(dl); dark.connect(wet);
    musicBus = gain(0, muffle); musicBus.connect(space);
    amb = gain(0, muffle); sfx = gain(0.7, comp); sfx.connect(space);
    // room tone: very quiet low air + mains hum
    const air = filt('lowpass', 220, 0.5, gain(0.08, amb)); const src = ctx.createBufferSource(); src.buffer = BROWN; src.loop = true; src.connect(air); src.start();
    lfo(0.05, 60, air.frequency);
    osc('sine', 60, gain(0.004, amb)); osc('sine', 120, gain(0.002, amb));
    // accelerator: a low, smooth drone near the ring
    L.ring = gain(0, amb); osc('sine', 55, gain(0.05, L.ring)); osc('sine', 82.4, gain(0.025, L.ring)); lfo(0.12, 0.02, L.ring.gain);
    // cryo: a cold, airy shimmer (sine fifths, no noise)
    L.cryo = gain(0, amb); osc('sine', hz(76), gain(0.006, L.cryo)); osc('sine', hz(83), gain(0.004, L.cryo)); lfo(0.2, 0.004, L.cryo.gain);
    // control room: a low server hum
    L.ctrl = gain(0, amb); osc('triangle', 98, filt('lowpass', 300, 0.5, gain(0.025, L.ctrl)));
    // induction wand: smooth hum, rising with signal
    wandG = gain(0, sfx); wandO = osc('triangle', 180, filt('lowpass', 700, 0.7, wandG)); lfo(5, 0.15, wandG.gain);
    nextBar = ctx.currentTime + 0.3; nextStep = nextBar;
  }

  // schedule music a little ahead of time
  function schedule() {
    const ahead = ctx.currentTime + 0.25;
    while (nextBar < ahead) { chordNow = PROG[bar % PROG.length]; chord(chordNow.pad, nextBar, BAR, 0.09, musicBus);
      note(hz(chordNow.bass), nextBar, BAR * 0.9, 0.05 + 0.04 * inten, 'sine', musicBus, 0.4); bar++; nextBar += BAR; }
    while (nextStep < ahead) { const c = PROG[(bar - 1 + PROG.length) % PROG.length], s = step % 8;
      // heartbeat pulse: two soft thumps per bar, stronger when intense
      if (s === 0 || s === 3) { const v = 0.04 + 0.12 * inten; glide(110, 42, nextStep, 0.28, v, musicBus); }
      // arpeggio: fades in with intensity, every 8th note
      if (inten > 0.3) note(hz(c.arp[s]), nextStep, 0.5, 0.012 + 0.03 * (inten - 0.3), 'sine', musicBus, 0.01);
      // high, slow bell on surges / near the end
      if (inten > 0.7 && s === 6 && step % 16 === 6) note(hz(c.arp[2] + 12), nextStep, 2, 0.015, 'sine', musicBus, 0.05);
      step++; nextStep += BEAT / 2; }
  }

  // s = { game, sheet, cine, x, z, bob, moving, run, tool, wand, surge, progress }
  function update(dt, s) {
    if (!ctx) return;
    set(musicBus.gain, s.game ? (s.sheet ? 0.6 : 1) : 0.0, 0.8);
    set(amb.gain, s.game && !s.cine ? (s.sheet ? 0.4 : 1) : 0, 0.8);
    set(muffle.frequency, s.sheet ? 1400 : 12000, 0.4);
    tIntent = s.cine ? 0.85 : 0.25 + 0.45 * (s.progress || 0) + (s.surge > 0 ? 0.3 : 0);
    inten += (Math.min(1, tIntent) - inten) * Math.min(1, dt * 0.5);
    if (!s.game) { set(wandG.gain, 0, 0.05); return; }
    schedule();
    const d = (x, z) => Math.hypot(s.x - x, s.z - z), near = (dd, r) => Math.max(0, 1 - dd / r);
    set(L.ring.gain, 0.2 + 0.8 * Math.pow(near(d(4, -1), 12), 1.5), 0.5);
    set(L.cryo.gain, Math.max(0, Math.min(1, (s.x - 8) / 3)), 0.6);
    set(L.ctrl.gain, Math.max(0, Math.min(1, (-s.x - 8) / 3)), 0.6);
    const w = !s.cine && !s.sheet && s.tool === 'wand' ? s.wand : 0; set(wandG.gain, w * w * 0.08, 0.08); wandO.frequency.setTargetAtTime(160 + 60 * w, ctx.currentTime, 0.1);
    if (s.cine || s.sheet) return;
    if (s.moving) { const k = Math.floor((s.bob || 0) / Math.PI); if (k !== lastFoot) { lastFoot = k; glide(s.run ? 120 : 100, 50, ctx.currentTime, 0.09, s.run ? 0.07 : 0.05, sfx); } }
  }

  // ---------------- one-shots (all soft, tonal)
  function play(name) {
    if (!ctx || !A.on) return; const t = ctx.currentTime, P = (ms, gap, v, type, len) => ms.forEach((m, i) => note(hz(m), t + i * gap, len || 0.6, v, type || 'sine'));
    switch (name) {
      case 'log': P([81, 88], 0.07, 0.05); break;
      case 'spray': glide(900, 500, t, 0.35, 0.025); break;
      case 'ok': P([69, 72, 76, 81], 0.09, 0.05, 'triangle', 0.9); break;
      case 'bad': P([57, 56], 0.14, 0.05, 'triangle', 0.5); break;
      case 'surge': glide(55, 110, t, 2.2, 0.08); P([57, 64], 0.5, 0.03, 'sine', 2); break;
      case 'open': P([76, 81], 0.06, 0.03); break;
      case 'sting': chord([45, 52, 57, 60, 64], t, 3.5, 0.16, sfx); glide(80, 40, t, 1.6, 0.12); P([81, 84, 88], 0.18, 0.025, 'sine', 1.6); break;
      case 'clank': P([69, 76], 0.3, 0.04, 'triangle', 0.5); glide(160, 70, t, 0.4, 0.06); break;
      case 'thud': glide(110, 40, t, 0.5, 0.12); break;
      case 'hiss': chord([76, 83, 88], t, 2.2, 0.05, sfx); break;
      case 'door': glide(45, 70, t, 2.2, 0.1); glide(90, 50, t + 2, 0.6, 0.1); break;
      case 'siren': for (let i = 0; i < 4; i++) note(hz(i % 2 ? 76 : 79), t + i * 0.6, 0.5, 0.02, 'sine'); break;
      case 'cuffs': P([88, 91], 0.1, 0.03, 'triangle', 0.25); break;
      case 'final': chord([48, 55, 59, 62, 64, 67], t, 5, 0.2, sfx); glide(65.4, 65.4, t, 4.5, 0.08); P([72, 76, 79, 83, 84], 0.16, 0.03, 'triangle', 2); break;
    }
  }
  function setOn(v) { A.on = !!v; try { localStorage.setItem('lenz.sound', A.on ? '1' : '0'); } catch (e) { /* storage unavailable */ } if (ctx) set(master.gain, A.on ? VOL : 0, 0.1); }

  window.LabAudio = { init, update, sfx: play, setOn, toggle() { setOn(!A.on); return A.on; }, get on() { return A.on; } };
})();

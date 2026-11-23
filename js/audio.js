/* Lenz's Alibi — generative "lab ambience" score (Web Audio, no audio files).
   No beat, no loop, no buzz: slowly evolving drones and pad swells in A minor, a long airy reverb, faint distant
   machinery air, soft far-off computer chirps and the odd deep resonant swell. Every few seconds the engine picks
   new notes at random, so it never repeats. Clue progress, surges and the ending make it brighter and tenser. */
(function () {
  'use strict';
  const A = { on: true };
  const VOL = 0.5;
  let ctx = null, master, comp, duck, verb, dry, wet, sfx, BROWN;
  let droneVoices = [], padF, airG, airF, wandG, wandO, tensionG, tensionF;
  let nextPad = 0, nextDrone = 0, nextChirp = 6, nextSwell = 25, nextGlint = 9, inten = 0.2, started = false;
  try { if (localStorage.getItem('lenz.sound') === '0') A.on = false; } catch (e) { /* storage unavailable */ }

  const SCALE = [45, 48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72, 74, 76]; // A minor pentatonic-ish (A C D E G)
  const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 59, 64], [50, 53, 57, 60], [55, 59, 62, 66], [52, 55, 59, 62], [53, 57, 60, 67], [57, 62, 64, 67]];
  const hz = m => 440 * Math.pow(2, (m - 69) / 12), pick = a => a[Math.floor(Math.random() * a.length)], rnd = (a, b) => a + Math.random() * (b - a);

  // ---------------- helpers
  const gain = (v, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const osc = (type, f, to) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (to) o.connect(to); o.start(); return o; };
  const filt = (type, f, q, to) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; if (to) b.connect(to); return b; };
  const set = (param, v, tc) => param.setTargetAtTime(v, ctx.currentTime, tc || 0.25);
  function brown() { const n = ctx.sampleRate * 6, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < n; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; } return b; }
  function impulse(sec) { // big soft hall: stereo noise with a smooth exponential tail, darkened over time
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n, k = 0.08 + 0.9 * t; lp += (Math.random() * 2 - 1 - lp) * (1 - k); d[i] = lp * Math.pow(1 - t, 2.6); } }
    return b;
  }
  // a voice with slow attack and release (seconds), optional slight detune pair
  function swell(f, t0, att, hold, rel, vol, type, to, detune) {
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + att); g.gain.setValueAtTime(vol, t0 + att + hold); g.gain.linearRampToValueAtTime(0, t0 + att + hold + rel); g.connect(to);
    [-(detune || 0), detune || 0].forEach((dc, i) => { if (i && !detune) return; const o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = f; o.detune.value = dc; o.connect(g); o.start(t0); o.stop(t0 + att + hold + rel + 0.1); });
  }
  // soft FM bell (used for chirps, glints and UI sounds)
  function bell(f, t0, dur, vol, to, ratio, index) {
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    c.frequency.value = f; m.frequency.value = f * (ratio || 2.01); mg.gain.setValueAtTime(f * (index || 1.2), t0); mg.gain.exponentialRampToValueAtTime(f * 0.01, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    m.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(to || sfx); c.start(t0); m.start(t0); c.stop(t0 + dur + 0.05); m.stop(t0 + dur + 0.05);
  }
  function glide(f1, f2, t0, dur, vol, to) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.25); g.gain.linearRampToValueAtTime(0, t0 + dur); o.connect(g); g.connect(to || sfx); o.start(t0); o.stop(t0 + dur + 0.05); }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); BROWN = brown();
    master = gain(A.on ? VOL : 0, ctx.destination);
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 2.5; comp.attack.value = 0.05; comp.connect(master);
    duck = filt('lowpass', 14000, 0.3, comp);                  // muffles everything while a terminal is open
    verb = ctx.createConvolver(); verb.buffer = impulse(5.5); wet = gain(0.85, duck); verb.connect(wet);
    dry = gain(0, duck); dry.connect(verb);                     // the score bus (mostly reverb)
    sfx = gain(0.55, comp); const sv = gain(0.35, verb); sfx.connect(sv);
    // drone: three slow sine voices that glide to new notes now and then
    padF = filt('lowpass', 520, 0.4, dry);
    droneVoices = [33, 40, 45].map((m, i) => { const g = gain(0, padF), o = osc(i ? 'triangle' : 'sine', hz(m), g); g.gain.linearRampToValueAtTime([0.16, 0.07, 0.05][i], ctx.currentTime + 6); return { o, g, m }; });
    // distant machinery air (very low, smooth)
    airF = filt('lowpass', 170, 0.5); airG = gain(0.05, dry); airF.connect(airG); const src = ctx.createBufferSource(); src.buffer = BROWN; src.loop = true; src.connect(airF); src.start();
    // tension layer: a soft high cluster that fades in with progress / surges
    tensionF = filt('lowpass', 1800, 0.3, dry); tensionG = gain(0, tensionF); [hz(76), hz(77) * 1.001, hz(83)].forEach(f => osc('sine', f, gain(0.25, tensionG)));
    // induction wand: a clean sine that rises in pitch near the wire (no tremolo, no buzz)
    wandG = gain(0, sfx); wandO = osc('sine', 330, wandG);
    nextPad = ctx.currentTime + 1; nextDrone = ctx.currentTime + 20;
  }

  function evolve(now) {
    // overlapping pad swells — a new random voicing every 9–15 s, each lasting ~20 s
    if (now > nextPad - 0.5) {
      const ch = pick(CHORDS), bright = 0.6 + 0.8 * inten;
      ch.forEach((m, i) => swell(hz(m - (i === 0 ? 12 : 0)), nextPad + i * rnd(0.2, 0.9), rnd(5, 8), rnd(4, 7), rnd(7, 10), 0.028 * bright, 'triangle', padF, 6));
      nextPad += rnd(9, 15);
    }
    // the drone wanders: one voice glides to a new note
    if (now > nextDrone) { const v = pick(droneVoices), choices = v === droneVoices[0] ? [33, 33, 29, 31, 36] : [40, 45, 43, 48, 38, 41]; v.o.frequency.setTargetAtTime(hz(pick(choices)), now, 4); nextDrone = now + rnd(18, 32); }
    // far-off lab life
    if (now > nextChirp) { const f = hz(pick([79, 81, 84, 86, 88])); bell(f, now, rnd(0.25, 0.6), 0.012, dry, pick([2.01, 3.5, 1.5]), 0.6); if (Math.random() < 0.5) bell(f * pick([1.25, 1.5, 0.75]), now + rnd(0.12, 0.3), 0.4, 0.009, dry, 2.01, 0.5); nextChirp = now + rnd(7, 20); }
    if (now > nextGlint) { bell(hz(pick(SCALE) + 24), now, rnd(2, 4), 0.008 + 0.01 * inten, dry, 3.01, 0.4); nextGlint = now + rnd(5, 14) / (0.6 + inten); }
    if (now > nextSwell) { glide(hz(pick([28, 31, 33])), hz(pick([26, 28])), now, rnd(5, 8), 0.12, dry); nextSwell = now + rnd(40, 80); }
  }

  // s = { game, sheet, cine, tool, wand, surge, progress }
  function update(dt, s) {
    if (!ctx) return; const now = ctx.currentTime;
    set(dry.gain, s.game ? (s.sheet ? 0.55 : 1) : 0, 1.2);
    set(duck.frequency, s.sheet ? 1600 : 14000, 0.5);
    const target = s.cine ? 0.9 : 0.15 + 0.5 * (s.progress || 0) + (s.surge > 0 ? 0.35 : 0);
    inten += (Math.min(1, target) - inten) * Math.min(1, dt * 0.3);
    set(padF.frequency, 420 + 1100 * inten, 1.5); set(tensionG.gain, Math.max(0, inten - 0.45) * 0.05, 1.5); set(airG.gain, 0.04 + 0.03 * inten, 2);
    const w = s.game && !s.cine && !s.sheet && s.tool === 'wand' ? s.wand : 0; set(wandG.gain, w > 0.15 ? w * w * 0.045 : 0, 0.12); wandO.frequency.setTargetAtTime(hz(64) + 260 * w, now, 0.15);
    if (s.game) { if (!started) { started = true; nextPad = now + 0.5; } evolve(now); }
  }

  // ---------------- one-shots: soft bells and swells, all through the reverb
  function play(name) {
    if (!ctx || !A.on) return; const t = ctx.currentTime, B = (ms, gap, v, dur) => ms.forEach((m, i) => bell(hz(m), t + i * gap, dur || 1.2, v));
    switch (name) {
      case 'log': B([88], 0, 0.035, 0.5); break;
      case 'spray': glide(1200, 700, t, 0.4, 0.012); break;
      case 'ok': B([69, 76, 81, 88], 0.11, 0.035, 1.6); break;
      case 'bad': B([57, 56], 0.18, 0.03, 0.9); break;
      case 'surge': glide(hz(33), hz(45), t, 3, 0.1, dry); swell(hz(76), t, 1.5, 1, 2.5, 0.02, 'sine', dry); swell(hz(77), t, 1.5, 1, 2.5, 0.02, 'sine', dry); break;
      case 'open': B([81], 0, 0.02, 0.4); break;
      case 'sting': [45, 52, 57, 60, 64].forEach((m, i) => swell(hz(m), t + i * 0.08, 0.8, 1.5, 3, 0.04, 'triangle', dry, 5)); glide(hz(33), hz(28), t, 4, 0.14, dry); B([81, 84, 88], 0.25, 0.02, 2.5); break;
      case 'clank': B([64, 71], 0.25, 0.025, 0.8); glide(140, 70, t, 0.5, 0.05); break;
      case 'thud': glide(90, 40, t, 0.8, 0.1); break;
      case 'hiss': [76, 81, 88].forEach((m, i) => swell(hz(m), t + i * 0.2, 0.6, 0.6, 1.8, 0.012, 'sine', dry)); break;
      case 'door': glide(hz(28), hz(33), t, 2.6, 0.12, dry); glide(80, 45, t + 2.2, 0.8, 0.08); break;
      case 'siren': [76, 79, 76, 79].forEach((m, i) => swell(hz(m), t + i * 0.7, 0.2, 0.3, 0.3, 0.015, 'sine', dry)); break;
      case 'cuffs': B([93, 96], 0.09, 0.02, 0.4); break;
      case 'final': [48, 55, 59, 62, 64, 67].forEach((m, i) => swell(hz(m), t + i * 0.12, 1.2, 2.2, 4, 0.045, 'triangle', dry, 5)); glide(hz(36), hz(36), t, 6, 0.1, dry); B([72, 76, 79, 83, 84], 0.2, 0.025, 3); break;
    }
  }
  function setOn(v) { A.on = !!v; try { localStorage.setItem('lenz.sound', A.on ? '1' : '0'); } catch (e) { /* storage unavailable */ } if (ctx) set(master.gain, A.on ? VOL : 0, 0.1); }

  window.LabAudio = { init, update, sfx: play, setOn, toggle() { setOn(!A.on); return A.on; }, get on() { return A.on; } };
})();

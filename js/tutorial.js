/* Lenz's Alibi — tutorial / guide mode.
   Objective card, glowing floor arrows to the next device (grid A* over the lab's colliders),
   plain-language explainers for every handheld tool and every device, and optional hints. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ------------------------------------------------------------------ explainers
  const TOOLS = {
    mag: { name: 'Magnetometer', key: '1', what: 'Measures field <b>B</b> (µT).', how: '<b>Click</b> to log a reading to the Survey map.' },
    spray: { name: 'Iron-filing spray', key: '2', what: 'Shows field direction on the floor.', how: 'Look down, <b>click</b>. Also goes on the Survey map.' },
    wand: { name: 'Induction wand', key: '3', what: 'Detects hidden live wires.', how: 'Follow the buzz along walls to trace the maglock wire.' }
  };

  const DEVICES = {
    faraday: {
      what: 'Copy the <b class="amb">amber</b> recording with your <b class="cy">cyan</b> run.',
      physics: 'Moving magnet → changing flux → voltage (ε = −N dΦ/dt).',
      steps: ['Top graph above 0 = <b>N</b>, below = <b>S</b>.',
        'Leaves 0 &amp; stays = <b>Plunge in</b> · returns to 0 = <b>Yank out</b> · out &amp; back = <b>Drop through</b>.',
        'Set speed, press <b>Run</b>. Match ~99%.']
    },
    survey: {
      what: 'Find the hidden magnet behind panel <b>P1–P8</b>.',
      physics: 'Fields add up. Closer = much stronger (B ∝ 1/r³).',
      steps: ['Map comes from <b>your</b> magnetometer clicks + filing sprays.', 'Press <b>Subtract known</b> (if shown).', 'Pick the panel where arrows are biggest → <b>Breach</b>. Not sure? Go log more readings there.']
    },
    ampere: {
      what: 'Find how the door lock was switched off.',
      physics: 'Loop around a wire → its current. Solenoid: B = μ₀nI.',
      steps: ['Drag a box around the red <b>MAGLOCK FEED</b>. Enter its current.',
        'Cancel it: I = n<sub>lock</sub>·I<sub>lock</sub> ÷ n<sub>sol</sub>, <b>Opposing</b>.',
        'Find the wire with that same current.', 'Trace it with the <b>wand [3]</b> to its outlet.']
    },
    eddy: {
      what: 'Find the sleeve that slowed the falling magnet.',
      physics: 'Metal + moving magnet → eddy currents → drag.',
      steps: ['Pick material + thickness, press <b>Drop</b>.', 'Too fast → more metal. Too slow → less.', 'Match the logged time.']
    },
    massspec: {
      what: 'Bend the ion beam into the slit.',
      physics: 'r = mv / qB. Stronger B = smaller circle.',
      steps: ['Fire. Wrong way? Flip the <b>field direction</b>.', 'Overshoots → raise B. Short → lower B.', 'Pick the matching isotope.']
    },
    board: {
      what: 'Match your facts to one suspect.',
      physics: 'Facts ↔ log lines (side, circuit, metal, isotope).',
      steps: ['Find the suspect whose logs match <b>every</b> fact.', 'Answer the method from your facts.', 'Pick the panel, press <b>File accusation</b>.']
    }
  };

  // ------------------------------------------------------------------ per-case hints (progressively more specific)
  function hints(id, C) {
    const P = C.puzzles[id];
    if (id === 'faraday') {
      const lab = { insert: 'Plunge in', withdraw: 'Yank out', through: 'Drop through' }[P.motion];
      return ['Top graph above 0 → N. Below → S.', 'Pole: ' + P.pole + '.', 'Motion: ' + lab + '.', 'Speed: ' + P.v.toFixed(1) + ' m/s.'];
    }
    if (id === 'survey') {
      const pan = LAB.PANELS.find(p => p.id === C.hunt.target);
      return ['Log magnetometer readings near every P marker.', C.hunt.decoys.length ? 'Press Subtract known.' : 'No decoys this case.', 'Look in: ' + pan.where.split('·')[0].trim() + '.', 'Breach ' + pan.id + '.'];
    }
    if (id === 'ampere') {
      const feed = P.wires.find(w => w.kind === 'feed'), tap = P.wires.find(w => w.id === P.tap);
      return ['Box only the red wire.', 'Feed: ' + Math.abs(feed.I).toFixed(1) + ' A, ' + (feed.I > 0 ? '⊙ out' : '⊗ in') + '.',
        (P.drift ? 'Counter: ' + P.nL + ' × ' + P.Il.toFixed(1) + ' × (drift %) ÷ ' + P.nC + ', Opposing. Re-check — the drift % keeps falling.' : 'Counter: ' + P.Ic.toFixed(2) + ' A, Opposing.'), 'Supply: ' + tap.tag + '.', 'Wand: start at this panel, follow the buzz.'];
    }
    if (id === 'eddy') {
      const m = LAB.MATS.find(x => x.id === P.mat);
      return ['Try PVC first (fastest).', 'Better metal / thicker = slower.', 'Material: ' + m.name + '.', 'Thickness: ' + P.t + ' mm.'];
    }
    if (id === 'massspec') {
      const iso = LAB.ISOTOPES.find(i => i.id === P.iso), dir = (iso.q > 0) === (P.side === 'up') ? 'in' : 'out';
      const B = Math.sqrt(2.0729e-8 * iso.m * 2000) / (P.D / 2);
      return ['Slit is ' + (P.side === 'up' ? 'above' : 'below') + '.', 'Field: ' + (dir === 'in' ? '⊗ into screen' : '⊙ out of screen') + '.', 'V = 2000 V, B ≈ ' + B.toFixed(3) + ' T.', 'Ion: ' + iso.label + '.'];
    }
    if (id === 'board') {
      const who = C.suspects.find(s => s.id === C.culpritId), pan = LAB.PANELS.find(p => p.id === C.hunt.target);
      return ['Cross out suspects whose logs clash with a fact.', 'Culprit: ' + who.name + '.',
        C.methods.map(m => m.options.find(o => o.v === m.answer).label).join(' · '), 'Panel: ' + pan.id + '.'];
    }
    return [];
  }

  // ------------------------------------------------------------------ path finding (grid A* over World.blocked)
  const GX0 = -18, GZ0 = -13.5, STEP = 0.25, NX = 145, NZ = 83;
  let grid = null;
  function buildGrid() {
    grid = new Uint8Array(NX * NZ);
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) grid[j * NX + i] = World.blocked(GX0 + i * STEP, GZ0 + j * STEP) ? 1 : 0;
  }
  const cellOf = (x, z) => [Math.max(0, Math.min(NX - 1, Math.round((x - GX0) / STEP))), Math.max(0, Math.min(NZ - 1, Math.round((z - GZ0) / STEP)))];
  function nearestFree(i, j) {
    if (!grid[j * NX + i]) return [i, j];
    for (let r = 1; r < 24; r++) { let best = null, bd = 1e9;
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ || grid[b * NX + a]) continue; const d = di * di + dj * dj; if (d < bd) { bd = d; best = [a, b]; } }
      if (best) return best; }
    return [i, j];
  }
  function astar(sx, sz, tx, tz) {
    const s = nearestFree(...cellOf(sx, sz)), t = nearestFree(...cellOf(tx, tz)), S = s[1] * NX + s[0], T = t[1] * NX + t[0];
    const g = new Float32Array(NX * NZ).fill(Infinity), from = new Int32Array(NX * NZ).fill(-1), closed = new Uint8Array(NX * NZ);
    const heap = [], push = (k, f) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const h = k => Math.hypot(k % NX - t[0], ((k / NX) | 0) - t[1]);
    g[S] = 0; push(S, h(S)); let n = 0;
    while (heap.length && n++ < 60000) {
      const k = pop()[1]; if (closed[k]) continue; closed[k] = 1; if (k === T) break;
      const ci = k % NX, cj = (k / NX) | 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue; const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= NX || b >= NZ) continue; const q = b * NX + a; if (grid[q] || closed[q]) continue;
        if (di && dj && (grid[cj * NX + a] || grid[b * NX + ci])) continue; // no corner cutting
        const ng = g[k] + (di && dj ? 1.4142 : 1); if (ng < g[q]) { g[q] = ng; from[q] = k; push(q, ng + h(q)); }
      }
    }
    if (from[T] < 0 && T !== S) return null;
    const cells = []; for (let k = T; k >= 0; k = from[k]) { cells.push([GX0 + (k % NX) * STEP, GZ0 + ((k / NX) | 0) * STEP]); if (k === S) break; }
    cells.reverse();
    // string-pull: keep only the corners we actually need
    const los = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 0.12); for (let i = 1; i < n; i++) if (World.blocked(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n)) return false; return true; };
    const out = [[sx, sz]]; let anchor = [sx, sz], k = 0;
    while (k < cells.length - 1) { let m = k + 1; while (m + 1 < cells.length && los(anchor, cells[m + 1])) m++; if (m === cells.length - 1) break; out.push(cells[m]); anchor = cells[m]; k = m; }
    out.push(cells[cells.length - 1]);
    return out;
  }

  // ------------------------------------------------------------------ state + steps
  const T = { on: false, hidden: false, G: null, steps: [], i: 0, tried: {}, start: null, pathT: 0, lastP: null, near: false, name: {} };

  function stationPos(id) { const s = World.interactables().find(x => x.id === id); return s ? { x: s.x, z: s.z } : null; }
  function build(G) {
    const C = G.C, S = [];
    S.push({ id: 'move', title: 'Walk around', text: 'Click the view. <b>WASD</b> walk, mouse look.',
      done: () => Math.hypot(World.player.x - T.start.x, World.player.z - T.start.z) > 2.2 });
    S.push({ id: 'tools', title: 'Try your three tools', text: () => 'Press ' + ['mag', 'spray', 'wand'].map(t => (T.tried[t] ? '✔' : '') + '<b>' + TOOLS[t].key + '</b>').join(' '),
      done: () => T.tried.mag && T.tried.spray && T.tried.wand });
    const nRead = () => ((C.state.survey || {}).samples || []).filter(q => q.kind !== 'fil').length, NEED = 8;
    C.def.puzzles.forEach(id => {
      S.push({ id, station: id, title: T.name[id], text: () => T.near ? 'Press <b>E</b>.' : 'Follow the <b class="cy">arrows</b>.',
        done: () => (C.state[id] || {}).solved || (id === 'ampere' && (C.state.ampere || {}).stage === 4) });
      if (id === 'ampere') S.push({ id: 'trace', title: 'Trace the wire', text: () => 'Press <b>3</b> (wand). Follow the buzz along the walls to an <b class="amb">outlet</b>.',
        done: () => (C.state.ampere || {}).solved });
    });
    S.push({ id: 'readings', title: 'Map the field', text: () => 'Press <b>1</b>, walk near the <b>P</b> panels and <b>click</b> to log readings (' + Math.min(nRead(), NEED) + '/' + NEED + ').',
      done: () => nRead() >= NEED || (C.state.survey || {}).solved });
    S.push({ id: 'survey', station: 'survey', title: T.name.survey, text: () => T.near ? 'Press <b>E</b>.' : 'Follow the <b class="cy">arrows</b>.',
      done: () => (C.state.survey || {}).solved });
    S.push({ id: 'board', station: 'board', title: 'Solve the case', text: () => 'Press <b>Tab</b>.',
      done: () => G.won });
    return S;
  }


  // ------------------------------------------------------------------ Flux, the floating detective sidekick (sprite + brain in flux.js)
  const B = { el: null, sprite: null, text: '', hold: 0, stepT: 0, sheetT: 0, lastStep: -1, failT: 0, fails: 0, reveal: null, sheetId: null, cd: {}, adviceT: 0 };
  const COACH = {
    faraday: 'Look at the <b>top graph</b>. Above zero? Pick <b>N</b>. Below? Pick <b>S</b>.',
    survey: 'These arrows are the readings <b>you</b> logged. Where are they biggest?',
    ampere: 'Drag a box around the <b>red wire</b> only.',
    eddy: 'Pick a sleeve and press <b>Drop</b>. Watch the time!',
    massspec: 'Press <b>Fire</b> and see where the beam lands.',
    board: 'Find the suspect whose logs match <b>all</b> your facts.'
  };
  const TOOL_LINES = { mag: 'Magnetometer! <b>Click</b> to log a reading — it goes on the Survey map.', spray: 'Filing spray! Look at the floor and <b>click</b>. The pattern goes on the map too.', wand: 'Induction wand! It buzzes near hidden live wires — you\'ll trace one later.' };
  function buddyInit() {
    if (B.el) return; B.el = $('buddy'); if (!B.el) return;
    B.el.innerHTML = '<div class="bd-body" title="Click Flux to show his tips"><canvas class="bd-cv"></canvas><div class="bd-new">💬</div></div>'
      + '<div class="bd-bubble"><button type="button" class="bd-x" title="Hide tips (click Flux to bring them back) [F]">×</button><div class="bd-name">FLUX</div><div class="bd-text"></div></div>';
    // the × hides the speech bubble; clicking Flux himself brings it back
    B.el.querySelector('.bd-x').onclick = e => { e.stopPropagation(); bubble(false); };
    B.el.querySelector('.bd-body').onclick = e => { e.stopPropagation(); bubble(true); };
    B.sprite = FluxSprite(B.el.querySelector('canvas'));
    let last = performance.now();
    (function loop(now) { const dt = Math.min(0.1, (now - last) / 1000); last = now; if (!B.el.classList.contains('hide')) B.sprite.draw(now / 1000, dt); requestAnimationFrame(loop); })(last);
    new MutationObserver(ms => { // react to ✔ / ✘ status lines inside device screens
      if (!T.on || !T.G.sheet) return; const seen = new Set();
      ms.forEach(m => { const n = m.target.nodeType === 1 ? m.target : m.target.parentElement, st = n && n.closest && n.closest('.status'); if (st) seen.add(st); });
      seen.forEach(st => { const txt = st.textContent.trim(); if (!txt) return; if (st.classList.contains('bad')) fail(); else if (st.classList.contains('ok')) say(pickOne(['Yes!! Great work, detective! 🎉', 'Nailed it! 🎉', 'Brilliant deduction! 🎉']), 5, 'wow'); });
    }).observe($('sheet'), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class'] });
  }
  function bubble(open) {
    if (!B.el) return; B.closed = !open; B.el.classList.toggle('quiet', B.closed); B.el.classList.remove('unread');
    if (open && B.sprite) { B.sprite.talk(); const bub = B.el.querySelector('.bd-bubble'); bub.classList.remove('bd-pop'); void bub.offsetWidth; bub.classList.add('bd-pop'); }
  }
  function toggleBubble() { if (T.on && !T.hidden) bubble(!!B.closed); }
  const pickOne = a => a[Math.floor(Math.random() * a.length)];
  function say(html, hold, mood) {
    if (!B.el) return; B.hold = hold || 0;
    B.el.classList.remove('wow', 'oops'); if (mood === 'wow' || mood === 'oops') B.el.classList.add(mood);
    if (B.sprite) B.sprite.setMood(mood);
    if (html === B.text) return; B.text = html; if (B.closed) B.el.classList.add('unread'); else if (B.sprite) B.sprite.talk();
    const t = B.el.querySelector('.bd-text'); t.innerHTML = html;
    const bub = B.el.querySelector('.bd-bubble'); bub.classList.remove('bd-pop'); void bub.offsetWidth; bub.classList.add('bd-pop');
  }
  function advice(explicit) { return B.sheetId ? FluxBrain.advise(B.sheetId, T.G.C, explicit, $('sheet')) : null; }
  function fail() {
    const now = performance.now(); if (now - B.failT < 500) return; B.failT = now; B.fails++;
    const a = advice(B.fails >= 2);
    if (a) { say('Close! ' + a.text, 7, 'oops'); return; }
    const h = B.reveal && B.reveal();
    say(h ? 'Close! 💡 ' + esc(h) : 'So close! Compare carefully and try again.', 7, 'oops');
  }
  function aside(key, cooldown, html, hold, mood) { const now = performance.now() / 1000; if ((B.cd[key] || 0) > now) return false; B.cd[key] = now + cooldown; say(html, hold, mood); return true; }
  function buddyTick(dt) {
    if (!B.el) return;
    const G = T.G, show = T.on && !T.hidden; B.el.classList.toggle('hide', !show); if (!show) return;
    B.el.classList.toggle('insheet', !!G.sheet && G.sheet !== 'brief');
    if (G.sheet) B.sheetT += dt; else B.sheetT = 0;
    if (T.i !== B.lastStep) { B.lastStep = T.i; B.stepT = 0; } else if (!G.sheet) B.stepT += dt;
    if (B.hold > 0) { B.hold -= dt; return; }
    if (!G.sheet && worldAsides()) return;
    let line = ambient(G), mood = '';
    if (typeof line === 'object') { mood = line.mood; line = line.text; }
    B.el.classList.remove('wow', 'oops'); say(line, 0, mood);
  }
  // things Flux notices while you walk around
  function worldAsides() {
    const s = cur(); if (!s || s.id === 'move') return false;
    if (World.tool === 'mag') { const b = World.fieldHere(), m = Math.hypot(b.bx, b.bz); if (m > 25 && aside('mag', 45, 'Whoa — <b>' + m.toFixed(0) + ' µT</b>! A strong magnet is close by.', 4, 'wow')) return true; }
    if (World.tool === 'wand' && World.wandHere() > 0.85 && aside('wand', 45, 'Hear that buzz? A <b>live wire</b> runs inside this wall!', 4, 'wow')) return true;
    if (World.tool === 'spray' && World.sprayLeft === 0 && aside('spray', 999, 'Out of spray! Switch to the magnetometer with <b>1</b>.', 4)) return true;
    return false;
  }
  function ambient(G) {
    if (G.sheet === 'brief') return 'Hi! I\'m <b>Flux</b>, your detective sidekick. Press <b>Start</b> and I\'ll guide you!';
    if (G.sheet === 'term' || G.sheet === 'board') {
      if (B.sheetT < 3) return COACH[B.sheetId] || 'Let\'s look at this together.';
      return advice(B.fails >= 2) || COACH[B.sheetId] || 'Read the steps at the top.';
    }
    const s = cur(); if (!s) return { text: 'Case closed! 🎉', mood: 'wow' };
    const k = B.stepT > 45 ? 2 : B.stepT > 20 ? 1 : 0, pick = a => a[Math.min(k, a.length - 1)];
    const near = World.nearest();
    if (near && !near.active) return 'That one isn\'t part of this case — skip it.';
    if (near && near.active && s.station && near.id !== s.station && near.id !== 'board' && !(T.G.C.state[near.id] || {}).solved) return 'You can open this one too, but the arrows lead to the <b>' + T.name[s.station] + '</b> first.';
    const solved = T.steps.filter(x => x.station && x.id !== 'board' && x.done()).length, total = T.steps.filter(x => x.station && x.id !== 'board').length;
    if (s.id === 'move') return pick(['Hi, I\'m <b>Flux</b>! Click the screen, then walk with <b>W A S D</b>.', 'Move the mouse to look around. <b>W</b> walks forward!', 'Just walk a few steps — any direction!']);
    if (s.id === 'tools') return pick(['Let\'s try your gadgets! Press <b>1</b>, <b>2</b> and <b>3</b>.', 'They\'re the number keys on the top row: <b>1 2 3</b>.']);
    if (s.id === 'readings') return pick(['The Survey Table only shows what <b>you</b> measure! Press <b>1</b> and <b>click</b> near the P panels.', 'Readings in every room help — the magnet could be anywhere.', 'Watch the µT number: when it jumps up, log lots of readings there!']);
    if (s.id === 'trace') { const v = World.tool === 'wand' ? World.wandHere() : 0; return World.tool !== 'wand' ? 'Press <b>3</b> for the wand!' : v > 0.6 ? 'Buzzing! Keep following this wall… 🔊' : pick(['Start at the maglock panel by the blast door, then follow the buzz.', 'Bar dropped? Turn back — the wire went another way.']); }
    if (s.id === 'board') return pick(['All ' + total + ' clues found! Press <b>Tab</b> to open the Case Board.', 'The <b>Tab</b> key is just left of Q.']);
    if (T.near) return 'This is it! Press <b>E</b> to open the <b>' + T.name[s.station] + '</b>.';
    return pick([(solved ? solved + ' of ' + total + ' clues done! ' : '') + 'Follow the <b class="cy">glowing arrows</b> to the <b class="amb">orange marker</b>!', 'Turn until the orange arrow (top-right) points <b>up</b>, then press <b>W</b>.', 'Keep going — follow the arrows on the floor!']);
  }
  function finish() { if (!T.on) return; T.i = T.steps.length; say('We cracked the case! 🎉 You\'re a natural, detective.', 8, 'wow'); B.el && B.el.classList.remove('insheet'); setTimeout(() => { if (!T.on || T.G.won) { B.el && B.el.classList.add('hide'); } }, 8000); stop(true); }

  function begin(G, names) {
    T.on = true; T.G = G; T.name = names; T.i = 0; T.tried = { mag: true }; T.hidden = false; T.start = { x: World.player.x, z: World.player.z }; T.lastP = null; T.pathT = 0;
    buildGrid(); T.steps = build(G); buddyInit(); B.lastStep = -1; B.hold = 0; $('tut').classList.remove('hide'); $('tutTool').classList.remove('hide'); render(); toolBox();
  }
  function stop(keepBuddy) { T.on = false; World.setGuide(null); if (!keepBuddy && B.el) B.el.classList.add('hide'); ['tut', 'tutTool'].forEach(id => $(id) && $(id).classList.add('hide')); }
  function toggle() { if (!T.on) return; T.hidden = !T.hidden; $('tut').classList.toggle('mini', T.hidden); $('tutTool').classList.toggle('hide', T.hidden); if (T.hidden) World.setGuide(null); else T.lastP = null; render(); }

  function cur() { return T.steps[T.i]; }
  function render() {
    const s = cur(), el = $('tut'); if (!el) return;
    if (!s) { el.innerHTML = '<div class="tut-h">DONE</div><div class="tut-t">Case closed!</div>'; return; }
    if (T.hidden) { el.innerHTML = '<div class="tut-h">[H] guide</div>'; return; }
    const txt = typeof s.text === 'function' ? s.text() : s.text;
    el.innerHTML = `<div class="tut-h">STEP ${T.i + 1}/${T.steps.length} <span>[H] hide</span></div>
      <div class="tut-row"><canvas id="tutCmp" width="64" height="64"></canvas><div><div class="tut-t">${s.title}</div><div class="tut-x">${txt}</div><div class="tut-d" id="tutDist"></div></div></div>`;
  }
  function toolBox() {
    const t = TOOLS[World.tool], el = $('tutTool'); if (!el || !t) return;
    el.innerHTML = `<b>${t.key} · ${t.name}</b> — ${t.what} <span class="tut-x">${t.how}</span>`;
  }
  function onTool(t) { if (!T.on) return; T.tried[t] = true; toolBox(); if (!T.hidden) say(TOOL_LINES[t], 4); if (cur() && cur().id === 'tools') render(); }

  function frame(dt) {
    if (!T.on) return;
    buddyTick(dt);
    const s = cur();
    if (s && s.done()) {
      T.i++; T.lastP = null; const n = cur();
      if (n && window.GAME_API) window.GAME_API.toast('✔ Next: ' + n.title);
      if (n) say('Nice! ✔ Next up: <b>' + n.title + '</b>', 3, 'wow');
      render(); if (!n) { World.setGuide(null); return; }
    }
    const st = cur(); if (!st) return;
    const tgt = st.station ? stationPos(st.station) : null, p = World.player;
    const near = !!(tgt && Math.hypot(tgt.x - p.x, tgt.z - p.z) < 2.6);
    if (near !== T.near) { T.near = near; render(); }
    // arrows
    if (T.hidden || !tgt) { World.setGuide(null); T.path = null; }
    else {
      T.pathT -= dt;
      if (T.pathT <= 0 || !T.lastP || Math.hypot(p.x - T.lastP.x, p.z - T.lastP.z) > 0.6) {
        T.pathT = 0.6; T.lastP = { x: p.x, z: p.z };
        T.path = near ? null : astar(p.x, p.z, tgt.x, tgt.z);
        World.setGuide(T.path, tgt);
      } else if (T.path) { T.path[0] = [p.x, p.z]; }
    }
    compass(tgt);
  }
  function compass(tgt) {
    const cv = $('tutCmp'), d = $('tutDist'); if (!cv) return; const g = cv.getContext('2d'); g.clearRect(0, 0, 64, 64);
    g.strokeStyle = '#24343d'; g.lineWidth = 2; g.beginPath(); g.arc(32, 32, 28, 0, 6.283); g.stroke();
    if (!tgt) { g.fillStyle = '#5fe0d0'; g.font = 'bold 22px monospace'; g.textAlign = 'center'; g.fillText(cur() && cur().id === 'tools' ? '⚙' : '✥', 32, 40); if (d) d.textContent = ''; return; }
    const p = World.player, aim = T.path && T.path.length > 1 ? T.path[1] : [tgt.x, tgt.z], dx = aim[0] - p.x, dz = aim[1] - p.z;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), L = Math.hypot(dx, dz) || 1;
    const f = (dx * fx + dz * fz) / L, r = (dx * rx + dz * rz) / L;
    UI.arrow(g, 32 - r * 18, 32 + f * 18, r * 36, -f * 36, '#ffb347', 4);
    if (d) d.textContent = T.near ? '' : Math.hypot(tgt.x - p.x, tgt.z - p.z).toFixed(0) + ' m';
  }

  // a device guide panel injected into a terminal / the case board
  function onSheet(id) {
    if (!T.on) return; const D = DEVICES[id], sheet = $('sheet'), head = sheet && sheet.querySelector('.sheet-h'); if (!D || !head) return;
    const H = hints(id, T.G.C); let shown = 0; B.sheetId = id; B.sheetT = 0; B.hold = 0; B.fails = 0;
    const box = document.createElement('details'); box.className = 'tutdev'; box.open = true;
    box.innerHTML = `<summary>📘 How it works</summary>
      <div class="tutgrid"><div><p><b>${D.what}</b></p><p class="tut-tip">${D.physics}</p></div>
      <div><ol>${D.steps.map(s => '<li>' + s + '</li>').join('')}</ol>
      <div class="hintrow"><button type="button" id="tutHint">Hint</button><ol id="tutHints"></ol></div></div></div>`;
    head.after(box);
    const b = box.querySelector('#tutHint');
    const reveal = () => { if (shown >= H.length) return null; const h = H[shown++], li = document.createElement('li'); li.innerHTML = esc(h); box.querySelector('#tutHints').appendChild(li); b.textContent = shown < H.length ? 'Another hint' : 'No more hints'; b.disabled = shown >= H.length; return h; };
    b.onclick = () => { const h = reveal(); if (h) say('💡 ' + esc(h), 8); };
    B.reveal = reveal;
  }
  function promptExtra(near) {
    if (!T.on || T.hidden || !near) return '';
    return near.active ? '' : '<div class="tut-p">Not used in this case</div>';
  }

  window.Tutorial = { begin, stop, finish, toggle, toggleBubble, frame, onTool, onSheet, promptExtra, get on() { return T.on; }, _astar: (a, b, c, d) => (grid || buildGrid(), astar(a, b, c, d)) };
})();

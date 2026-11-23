/* Lenz's Alibi — forensic terminals 1 & 2: Ghost-Pulse Oscilloscope (Faraday/Lenz) and Maglock Conduit Panel (Ampère/solenoid). */
(function () {
  'use strict';
  const COL = { amber: '#ffb347', cyan: '#5fe0d0', red: '#ff5a4d', dim: '#5c6a72', text: '#d7e0e4', grid: '#1b2a32', bg: '#081014' };
  const UI = {
    COL,
    canvas(parent, w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; parent.appendChild(c); return c; },
    pos(e, cv) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; },
    seg(el, opts, value, cb) {
      el.classList.add('seg'); el.innerHTML = '';
      opts.forEach(o => { const b = document.createElement('button'); b.type = 'button'; b.textContent = o.label; b.className = o.v === value ? 'on' : '';
        b.onclick = () => { el.querySelectorAll('button').forEach(x => x.classList.remove('on')); b.classList.add('on'); cb(o.v); }; el.appendChild(b); });
    },
    arrow(g, x, y, dx, dy, color, w) {
      const l = Math.hypot(dx, dy); if (l < 0.5) return; const ux = dx / l, uy = dy / l, hd = Math.min(6, l * 0.45);
      g.strokeStyle = g.fillStyle = color; g.lineWidth = w || 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx, y + dy); g.stroke();
      g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx - ux * hd - uy * hd * 0.55, y + dy - uy * hd + ux * hd * 0.55); g.lineTo(x + dx - ux * hd + uy * hd * 0.55, y + dy - uy * hd - ux * hd * 0.55); g.fill();
    },
    status(el, msg, kind) { el.textContent = msg; el.className = 'status ' + (kind || ''); }
  };
  const Puzzles = {};

  // =====================================================================
  // 1. GHOST PULSE — Faraday's & Lenz's law
  // =====================================================================
  const A = 0.05, L = 0.30;
  const f = x => Math.pow(1 + (x / A) * (x / A), -1.5);
  const fp = x => -3 * x / (A * A) * Math.pow(1 + (x / A) * (x / A), -2.5);
  function pulse(p, P, t) {
    const T = (p.motion === 'through' ? 2 * L : L) / p.v, tt = Math.min(Math.max(t, 0), T);
    const dir = p.motion === 'withdraw' ? -1 : 1, x = (p.motion === 'withdraw' ? 0 : -L) + dir * p.v * tt, s = p.pole === 'N' ? 1 : -1;
    return { x, T, phi: s * P.phi0 * f(x), emf: (t >= 0 && t < T) ? -P.N * s * P.phi0 * fp(x) * dir * p.v * P.rev : 0 };
  }
  Puzzles.faraday = {
    title: 'Ghost-Pulse Oscilloscope', law: 'Faraday\'s Law · Lenz\'s Law  —  ε = −N dΦ/dt',
    open(ctx) {
      const P = ctx.P, S = ctx.S, n = 240;
      const set = S.set || (S.set = { pole: 'N', motion: 'insert', v: 2 });
      const Twin = pulse(P, P, 0).T * 1.2, tgt = [], peakT = 0.8587 * P.N * P.phi0 * P.v / A;
      for (let i = 0; i < n; i++) tgt.push(pulse(P, P, i / (n - 1) * Twin));
      let live = null, idx = 0, playing = false, score = null;
      const cv = UI.canvas(ctx.left, 720, 480), g = cv.getContext('2d');
      ctx.right.innerHTML = `
        <p class="brief">Match the <b>amber</b> trace.</p>
        <table class="kv"><tr><td>Coil turns N</td><td>${P.N}</td></tr><tr><td>Peak flux per turn Φ₀</td><td>${(P.phi0 * 1e3).toFixed(1)} mWb</td></tr>
        <tr><td>Coil radius a</td><td>5.0 cm</td></tr><tr><td>Travel</td><td>30 cm</td></tr><tr><td>CH1 leads</td><td>${P.rev > 0 ? 'NORMAL' : 'REVERSED'}</td></tr></table>
        <p class="note">N points <b>East</b>.</p>
        <label>Pole facing the coil</label><div id="fPole"></div>
        <label>Motion</label><div id="fMot"></div>
        <label>Speed <output id="fV"></output></label><input type="range" id="fVr" min="0.5" max="4" step="0.5">
        ${ctx.ap ? '<label>AP gate — predicted peak |ε| for your settings (V)</label><input type="number" id="fPred" step="0.01" placeholder="ε_peak = 0.859·N·Φ₀·v / a">' : ''}
        <button class="go" id="fRun">Run reconstruction</button><div class="status" id="fStat"></div>`;
      const $ = id => ctx.right.querySelector('#' + id), stat = $('fStat');
      UI.seg($('fPole'), [{ v: 'N', label: 'N faces coil' }, { v: 'S', label: 'S faces coil' }], set.pole, v => { set.pole = v; reset(); });
      UI.seg($('fMot'), [{ v: 'insert', label: 'Plunge in' }, { v: 'withdraw', label: 'Yank out' }, { v: 'through', label: 'Drop through' }], set.motion, v => { set.motion = v; reset(); });
      $('fVr').value = set.v; $('fV').textContent = set.v.toFixed(1) + ' m/s';
      $('fVr').oninput = e => { set.v = +e.target.value; $('fV').textContent = set.v.toFixed(1) + ' m/s'; reset(); };
      function reset() { live = null; playing = false; score = null; UI.status(stat, ''); draw(); }
      $('fRun').onclick = () => {
        if (ctx.ap) {
          const pk = 0.8587 * P.N * P.phi0 * set.v / A, pr = parseFloat($('fPred').value);
          if (!(Math.abs(pr - pk) / pk < 0.05)) { UI.status(stat, 'Prediction off by >5%.', 'bad'); return; }
        }
        live = []; for (let i = 0; i < n; i++) live.push(pulse(set, P, i / (n - 1) * Twin)); idx = 0; playing = true; score = null; UI.status(stat, 'Recording…');
      };
      function finish() {
        const rms = (k, d) => Math.sqrt(tgt.reduce((s, t, i) => s + Math.pow((d ? live[i][k] : 0) - t[k], 2), 0) / n);
        score = Math.max(0, 1 - Math.max(rms('emf', 1) / rms('emf', 0), rms('phi', 1) / rms('phi', 0)));
        if (score > 0.985) {
          const side = P.pole === 'N' ? 'West' : 'East';
          UI.status(stat, 'Trace match ' + (score * 100).toFixed(0) + '% ✔', 'ok');
          ctx.solve(['Ghost pulse: the ' + P.pole + ' pole faced the coil, so the operator stood on the ' + side.toUpperCase() + ' side of the lab.',
            'Ghost pulse: the magnetic core was ' + LAB.MOTIONS[P.motion] + ' at ' + P.v.toFixed(1) + ' m/s (peak |ε| ≈ ' + peakT.toFixed(2) + ' V).']);
        } else UI.status(stat, 'Trace match ' + (score * 100).toFixed(0) + '%. Adjust and retry.', 'bad');
      }
      function strip(y, h, key, title, unit, scale) {
        const x0 = 50, w = 650; g.fillStyle = COL.bg; g.fillRect(x0, y, w, h); g.strokeStyle = COL.grid; g.lineWidth = 1;
        for (let i = 0; i <= 10; i++) { g.beginPath(); g.moveTo(x0 + w * i / 10, y); g.lineTo(x0 + w * i / 10, y + h); g.stroke(); }
        for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(x0, y + h * i / 4); g.lineTo(x0 + w, y + h * i / 4); g.stroke(); }
        const line = (arr, cnt, col, dash) => { g.strokeStyle = col; g.lineWidth = 2; g.setLineDash(dash || []); g.beginPath();
          for (let i = 0; i < cnt; i++) { const px = x0 + w * i / (n - 1), py = y + h / 2 - Math.max(-1.05, Math.min(1.05, arr[i][key] / scale)) * h * 0.44; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); g.setLineDash([]); };
        line(tgt, n, COL.amber, [6, 4]); if (live) line(live, idx, COL.cyan);
        g.fillStyle = COL.text; g.font = '12px "IBM Plex Mono", monospace'; g.textAlign = 'left'; g.fillText(title, x0 + 6, y + 15);
        g.fillStyle = COL.dim; g.textAlign = 'right'; g.fillText('+' + unit(scale), x0 - 4, y + h * 0.06 + 8); g.fillText('0', x0 - 4, y + h / 2 + 4); g.fillText('−' + unit(scale), x0 - 4, y + h * 0.94);
      }
      function draw() {
        g.fillStyle = '#0b1216'; g.fillRect(0, 0, 720, 480);
        // bench
        const cx = 400, by = 78, cur = live && idx > 0 ? live[Math.min(idx, n) - 1] : pulse(set, P, 0), mx = cx + cur.x * 640;
        g.strokeStyle = '#33444e'; g.lineWidth = 4; g.beginPath(); g.moveTo(60, by + 34); g.lineTo(690, by + 34); g.stroke();
        g.strokeStyle = '#d07a3a'; g.lineWidth = 3; for (let i = -4; i <= 4; i++) { g.beginPath(); g.ellipse(cx + i * 7, by, 9, 38, 0, 0, 6.283); g.stroke(); }
        const front = set.pole, back = front === 'N' ? 'S' : 'N', pc = { N: '#e0483c', S: '#3c7fe0' };
        g.fillStyle = pc[back]; g.fillRect(mx - 44, by - 13, 44, 26); g.fillStyle = pc[front]; g.fillRect(mx, by - 13, 44, 26);
        g.fillStyle = '#fff'; g.font = 'bold 14px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText(back, mx - 22, by + 5); g.fillText(front, mx + 22, by + 5);
        g.fillStyle = COL.dim; g.font = '12px "IBM Plex Mono", monospace';
        g.fillText('◄ ' + (front === 'N' ? 'WEST' : 'EAST') + ' (operator side)', 150, by + 58); g.fillText((front === 'N' ? 'EAST' : 'WEST') + ' ►', 640, by + 58);
        if (live && idx > 0 && Math.abs(cur.emf) > peakT * 0.03) { g.fillStyle = COL.cyan; g.fillText('induced current ' + (cur.emf * P.rev > 0 ? '↻' : '↺') + '  (opposes ΔΦ)', cx, by - 50); }
        const sE = Math.max(peakT, live ? 0.8587 * P.N * P.phi0 * set.v / A : 0) * 1.1;
        strip(160, 140, 'phi', 'Φ(t) per turn   — amber: recorded · cyan: bench', v => (v * 1e3).toFixed(2) + ' mWb', P.phi0 * 1.1);
        strip(318, 150, 'emf', 'ε(t) on CH1', v => (ctx.ap ? '?' : v.toFixed(2)) + ' V', sE);
        g.fillStyle = COL.dim; g.textAlign = 'center'; g.fillText('window ' + (Twin * 1000).toFixed(0) + ' ms', 375, 476);
      }
      ctx.loop(dt => { if (playing) { idx = Math.min(n, idx + Math.ceil(n * dt / 2.2)); if (idx >= n) { playing = false; finish(); } draw(); } });
      draw();
    }
  };

  // =====================================================================
  // 2. MAGLOCK ALIBI CHECK — Ampère's law + counter-solenoid
  // =====================================================================
  Puzzles.ampere = {
    title: 'Maglock Conduit Panel', law: 'Ampère\'s Law · Solenoids  —  ∮B·dℓ = μ₀I_enc ,  B = μ₀nI',
    open(ctx) {
      const P = ctx.P, S = ctx.S, MPP = 0.02 / 60; if (!S.stage) S.stage = 1;
      const cv = UI.canvas(ctx.left, 720, 480), g = cv.getContext('2d');
      const wx = w => w.cx * 60 + 30, wy = w => w.cy * 60 + 30;
      let lasso = S.lasso || null, dragging = false, probe = null, t0 = performance.now();
      function B(x, y) { let bx = 0, by = 0; for (const w of P.wires) { const dx = x - wx(w), dy = y - wy(w), hp = Math.max(Math.hypot(dx, dy), 12), m = 0.2 * w.I / (hp * MPP); bx += m * dy / hp; by += -m * dx / hp; } return { bx, by }; }
      const enc = () => lasso ? P.wires.filter(w => wx(w) > Math.min(lasso.x1, lasso.x2) && wx(w) < Math.max(lasso.x1, lasso.x2) && wy(w) > Math.min(lasso.y1, lasso.y2) && wy(w) < Math.max(lasso.y1, lasso.y2)).reduce((s, w) => s + w.I, 0) : 0;
      const drift = () => P.drift ? 1 - 0.14 * (1 - Math.exp(-(performance.now() - t0) / 50000)) : 1;
      cv.onmousedown = e => { const p = UI.pos(e, cv); lasso = { x1: p.x, y1: p.y, x2: p.x, y2: p.y }; dragging = true; };
      cv.onmousemove = e => { const p = UI.pos(e, cv); probe = p; if (dragging) { lasso.x2 = p.x; lasso.y2 = p.y; } draw(); readout(); };
      cv.onmouseleave = () => { probe = null; draw(); };
      const up = () => { if (dragging) { dragging = false; S.lasso = lasso; readout(); } }; window.addEventListener('mouseup', up); ctx.onClose(() => window.removeEventListener('mouseup', up));

      function draw() {
        g.fillStyle = '#0b1216'; g.fillRect(0, 0, 720, 480); g.strokeStyle = COL.grid; g.lineWidth = 1;
        for (let x = 0; x <= 720; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 480); g.stroke(); }
        for (let y = 0; y <= 480; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(720, y); g.stroke(); }
        if (!ctx.ap) for (let x = 30; x < 720; x += 30) for (let y = 30; y < 480; y += 30) {
          const b = B(x, y), m = Math.hypot(b.bx, b.by), l = Math.min(13, 3 + 4 * Math.log10(1 + m));
          UI.arrow(g, x - b.bx / m * l / 2, y - b.by / m * l / 2, b.bx / m * l, b.by / m * l, 'rgba(95,224,208,' + Math.min(0.85, 0.28 + m / 150) + ')', 1);
        }
        P.wires.forEach(w => {
          const x = wx(w), y = wy(w), feed = w.kind === 'feed';
          g.fillStyle = '#141d22'; g.strokeStyle = feed ? COL.red : '#d07a3a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 13, 0, 6.283); g.fill(); g.stroke();
          g.fillStyle = COL.text; g.font = 'bold 12px "IBM Plex Mono", monospace'; g.textAlign = 'center'; g.fillText(w.tag, x, y + 4);
          g.font = '10px "IBM Plex Mono", monospace'; g.fillStyle = feed ? COL.red : COL.dim; g.fillText(feed ? 'MAGLOCK FEED' : 'into wall →', x, y + 29);
        });
        if (lasso) { g.strokeStyle = COL.amber; g.lineWidth = 2; g.setLineDash([7, 5]); g.strokeRect(lasso.x1, lasso.y1, lasso.x2 - lasso.x1, lasso.y2 - lasso.y1); g.setLineDash([]);
          g.fillStyle = COL.amber; g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'left'; g.fillText('Ampèrian loop ↺', Math.min(lasso.x1, lasso.x2) + 4, Math.min(lasso.y1, lasso.y2) - 5); }
        if (probe) { const b = B(probe.x, probe.y), m = Math.hypot(b.bx, b.by); UI.arrow(g, probe.x, probe.y, b.bx / m * 26, b.by / m * 26, '#fff', 2);
          g.fillStyle = '#fff'; g.font = '12px "IBM Plex Mono", monospace'; g.textAlign = 'left'; g.fillText('|B| = ' + m.toFixed(1) + ' µT', Math.min(probe.x + 12, 600), probe.y - 10); }
        g.fillStyle = COL.dim; g.font = '11px "IBM Plex Mono", monospace'; g.textAlign = 'left'; g.fillText('wall cross-section · 1 square = 2 cm · drag to lasso · hover to probe', 8, 474);
      }
      function readout() {
        const I = enc(), el = ctx.right.querySelector('#aLoop'); if (!el) return;
        el.innerHTML = lasso ? '∮B·dℓ = <b>' + (I * 1.2566).toFixed(2) + ' µT·m</b>' + (ctx.ap ? '' : '<br>I<sub>enc</sub> = <b>' + (I >= 0 ? '+' : '−') + Math.abs(I).toFixed(1) + ' A</b> ' + (Math.abs(I) < 0.05 ? '' : I > 0 ? '(net ⊙ out of wall)' : '(net ⊗ into wall)')) : 'Drag a loop around one or more conduits.';
      }
      function panel() {
        const st = S.stage, feed = P.wires.find(w => w.kind === 'feed');
        let h = `<p class="brief">The lock never lost power. How was it opened?</p><p class="note">⊙ out = + · μ₀ = 1.2566 µT·m/A</p>
          <div class="read" id="aLoop"></div><div class="steps"><span class="${st > 1 ? 'done' : 'cur'}">1 Feed current</span><span class="${st > 2 ? 'done' : st === 2 ? 'cur' : ''}">2 Cancel field</span><span class="${st > 3 ? 'done' : st === 3 ? 'cur' : ''}">3 Find wire</span><span class="${st > 4 ? 'done' : st === 4 ? 'cur' : ''}">4 Wand trace</span></div>`;
        if (st === 1) h += `<label>Current in the MAGLOCK FEED (${feed.tag})</label><div class="row"><input type="number" id="aI" step="0.1" placeholder="A"><select id="aD"><option value="1">⊙ out</option><option value="-1">⊗ in</option></select></div><button class="go" id="aGo">Confirm feed current</button>`;
        if (st === 2) h += `<table class="kv"><tr><td>Maglock winding n</td><td>${P.nL} turns/m</td></tr><tr><td>Maglock current</td><td>${P.Il.toFixed(1)} A</td></tr><tr><td>Portable solenoid n</td><td>${P.nC} turns/m</td></tr>
          ${P.drift ? '<tr><td>Thermal drift</td><td id="aK"></td></tr>' : ''}</table>
          ${P.drift ? '<p class="note warn">Lock field is drifting — keep adjusting.</p>' : ''}
          <label>Counter-solenoid current (A)</label><div class="row"><input type="number" id="aC" step="0.01" min="0" value="${S.ic || ''}"><select id="aP"><option value="-1">Opposing</option><option value="1">Aiding</option></select></div>
          <div class="read" id="aB"></div><button class="go" id="aGo">Test bypass</button>`;
        if (st === 3) h += `<p class="note">Which wire carries <b>${P.Ic.toFixed(1)} A</b>?</p>
          <label>Supply wire</label><select id="aS">${P.wires.filter(w => w.kind === 'circuit').map(w => `<option value="${w.id}">${w.tag}</option>`).join('')}</select><button class="go" id="aGo">Confirm wire</button>`;
        if (st === 4) h += `<p class="note warn">${P.wires.find(x => x.id === P.tap).tag} disappears into the wall. Where does it go?</p>
          <p class="note">Close this panel, hold the <b>induction wand [3]</b> and follow the buzz along the walls to the outlet at the end.</p>`;
        if (st > 4) h += '<p class="note">Done ✔</p>';
        ctx.right.innerHTML = h + '<div class="status" id="aStat"></div>'; readout();
        const $ = id => ctx.right.querySelector('#' + id), stat = $('aStat'), go = $('aGo'); if (!go) return;
        if (st === 2) $('aC').oninput = live;
        go.onclick = () => {
          if (st === 1) {
            if (Math.abs(parseFloat($('aI').value) - Math.abs(feed.I)) < 0.051 && +$('aD').value === Math.sign(feed.I)) { S.stage = 2; t0 = performance.now(); panel(); }
            else { ctx.strike(); UI.status(stat, 'Wrong. Box only ' + feed.tag + '.', 'bad'); }
          } else if (st === 2) {
            const Bl = P.nL * P.Il * drift(), Bc = P.nC * (parseFloat($('aC').value) || 0) * +$('aP').value;
            if (Math.abs(Bl + Bc) / Bl < 0.015) { S.stage = 3; panel(); }
            else UI.status(stat, 'Not cancelled' + (ctx.ap ? '.' : ' (' + (Math.abs(Bl + Bc) / Bl * 100).toFixed(1) + '% left).'), 'bad');
          } else if (st === 3) {
            if ($('aS').value === P.tap) { S.stage = 4; panel(); UI.status(ctx.right.querySelector('#aStat'), 'Right wire! Now trace it with the wand.', 'ok'); }
            else { ctx.strike(); UI.status(stat, 'Wrong wire.', 'bad'); }
          }
        };
      }
      function live() {
        const c = ctx.right.querySelector('#aC'), b = ctx.right.querySelector('#aB'), k = ctx.right.querySelector('#aK'); if (!c) return;
        S.ic = c.value; const d = drift(), Bl = PHYS.MU0 * P.nL * P.Il * d * 1e3, Bc = PHYS.MU0 * P.nC * (parseFloat(c.value) || 0) * +ctx.right.querySelector('#aP').value * 1e3;
        if (k) k.textContent = 'field at ' + (d * 100).toFixed(1) + '% of nominal';
        b.innerHTML = ctx.ap ? 'AP mode: field readouts hidden. Compute I = n<sub>lock</sub>·I<sub>lock</sub>·k / n<sub>sol</sub>.' : 'B<sub>lock</sub> = ' + Bl.toFixed(3) + ' mT<br>B<sub>sol</sub> = ' + Bc.toFixed(3) + ' mT<br>B<sub>net</sub> = <b>' + (Bl + Bc).toFixed(3) + ' mT</b>';
      }
      ctx.loop(() => { if (S.stage === 2) live(); });
      panel(); draw();
    }
  };

  window.UI = UI; window.Puzzles = Puzzles;
})();

/* Lenz's Alibi — terminals 3–5: Cryo-Shaft Drop Rig (eddy braking), Mass Spectrometer (Lorentz force), Field Survey Table (dipole superposition). */
(function () {
  'use strict';
  const COL = UI.COL, FONT = '"IBM Plex Mono", monospace';

  // =====================================================================
  // 3. SMASHED CRYO-PIPE — eddy-current braking
  // =====================================================================
  Puzzles.eddy = {
    title: 'Cryo-Shaft Drop Rig', law: 'Eddy-Current Braking  —  F_drag = k·v ,  k ∝ σ·t·B²',
    open(ctx) {
      const P = ctx.P, S = ctx.S, g9 = 9.81; if (!S.trials) S.trials = []; const set = S.set || (S.set = { mat: 'pvc', t: 2 });
      const cv = UI.canvas(ctx.left, 720, 480), g = cv.getContext('2d');
      const free = PHYS.eddyDrop(P.m, 0, P.h), tMax = Math.max(P.Tlog * 1.35, free.T * 1.6), vMax = free.v * 1.08;
      let run = null;
      const mat = id => LAB.MATS.find(m => m.id === id), kOf = s => PHYS.eddyK(mat(s.mat).sig, s.t, P.B);
      const yv = (k, t) => { if (k < 1e-9) return { y: 0.5 * g9 * t * t, v: g9 * t }; const vt = P.m * g9 / k, tau = P.m / k; return { y: vt * t - vt * tau * (1 - Math.exp(-t / tau)), v: vt * (1 - Math.exp(-t / tau)) }; };
      ctx.right.innerHTML = `
        <p class="brief">Find the sleeve that matches the logged fall.</p>
        <table class="kv"><tr><td>Shaft height h</td><td>${P.h.toFixed(1)} m</td></tr><tr><td>Canister mass m</td><td>${P.m.toFixed(1)} kg</td></tr><tr><td>Magnet surface field B</td><td>${P.B.toFixed(1)} T</td></tr>
        <tr><td>Logged descent time</td><td><b>${P.Tlog.toFixed(2)} s</b></td></tr><tr><td>Seismic trigger</td><td>impact &gt; ${P.vSeis.toFixed(1)} m/s</td></tr></table>
        <p class="note">Rig model: k = 2.0·σ<sub>rel</sub>·(t / 2 mm)·B²  kg/s.  σ<sub>rel</sub>: PVC 0 · slotted Cu 0.3 · Al 0.7 · solid Cu 1.0.  Terminal speed v<sub>t</sub> = mg/k.</p>
        <label>Sleeve material</label><div id="eMat"></div><label>Wall thickness</label><div id="eT"></div>
        ${ctx.ap ? '<label>AP gate — predicted terminal speed v_t (m/s)</label><input type="number" id="ePred" step="0.01" placeholder="mg / k   (blank for PVC)">' : ''}
        <button class="go" id="eGo">Drop canister</button><div class="status" id="eStat"></div><div id="eLog" class="log"></div>`;
      const $ = id => ctx.right.querySelector('#' + id), stat = $('eStat');
      UI.seg($('eMat'), LAB.MATS.map(m => ({ v: m.id, label: m.name })), set.mat, v => { set.mat = v; draw(); });
      UI.seg($('eT'), [2, 4, 6].map(t => ({ v: t, label: t + ' mm' })), set.t, v => { set.t = v; draw(); });
      function log() { $('eLog').innerHTML = S.trials.slice(-6).reverse().map(t => `<div>${mat(t.mat).name} ${t.t} mm → ${t.T.toFixed(2)} s, ${t.v.toFixed(2)} m/s ${t.v > P.vSeis ? '<i class="bad">SEISMIC</i>' : '<i class="ok">quiet</i>'}</div>`).join(''); }
      $('eGo').onclick = () => {
        if (run) return; const k = kOf(set);
        if (ctx.ap && k > 0) { const vt = P.m * g9 / k; if (!(Math.abs(parseFloat($('ePred').value) - vt) / vt < 0.03)) { UI.status(stat, 'Prediction off by >3%.', 'bad'); return; } }
        run = { k, s: { mat: set.mat, t: set.t }, d: PHYS.eddyDrop(P.m, k, P.h), t: 0 }; UI.status(stat, 'Falling…');
      };
      function done() {
        const r = run; run = null; S.trials.push({ mat: r.s.mat, t: r.s.t, T: r.d.T, v: r.d.v }); log();
        if (Math.abs(r.d.T - P.Tlog) < 0.012 && r.s.mat === P.mat && r.s.t === P.t) {
          UI.status(stat, 'Descent ' + r.d.T.toFixed(2) + ' s ✔', 'ok');
          ctx.solve(['Cryo-shaft: the canister was braked by a ' + P.t + ' mm ' + mat(P.mat).name.toUpperCase() + ' sleeve (' + P.Tlog.toFixed(2) + ' s descent, ' + r.d.v.toFixed(2) + ' m/s impact — below the seismic trigger).',
            'Cryo-shaft: that sleeve only exists in stores under "' + LAB.STOCK[P.mat] + '" clearance.']);
        } else UI.status(stat, 'Descent ' + r.d.T.toFixed(2) + ' s, impact ' + r.d.v.toFixed(2) + ' m/s' + (r.d.v > P.vSeis ? ' — too hard!' : ' — ' + (r.d.T > P.Tlog ? 'too slow.' : 'too fast.')), 'bad');
        draw();
      }
      function draw() {
        g.fillStyle = '#0b1216'; g.fillRect(0, 0, 720, 480);
        const m = mat((run ? run.s : set).mat), th = (run ? run.s : set).t, sx = 110, top = 40, H = 400;
        g.fillStyle = '#141d22'; g.fillRect(sx - 34, top, 68, H); g.fillStyle = m.color; g.globalAlpha = 0.85;
        g.fillRect(sx - 34 - th * 2, top, th * 2, H); g.fillRect(sx + 34, top, th * 2, H); g.globalAlpha = 1;
        if (m.id === 'slot') { g.fillStyle = '#0b1216'; for (let y = top + 8; y < top + H; y += 18) { g.fillRect(sx - 34 - th * 2, y, th * 2, 5); g.fillRect(sx + 34, y, th * 2, 5); } }
        g.fillStyle = COL.dim; g.font = '11px ' + FONT; g.textAlign = 'center'; g.fillText('TOP GATE', sx, top - 8); g.fillText('SEISMIC FLOOR', sx, top + H + 16);
        g.fillStyle = COL.red; g.fillRect(sx - 60, top + H, 120, 3);
        const yy = run ? Math.min(P.h, yv(run.k, run.t).y) : 0, my = top + yy / P.h * (H - 30);
        if (run && m.sig > 0) { g.strokeStyle = 'rgba(95,224,208,.7)'; g.lineWidth = 1.5; for (const o of [-10, 40]) { g.beginPath(); g.ellipse(sx, my + o, 46 + th * 2, 6, 0, 0, 6.283); g.stroke(); } }
        g.fillStyle = '#e0483c'; g.fillRect(sx - 22, my, 44, 15); g.fillStyle = '#3c7fe0'; g.fillRect(sx - 22, my + 15, 44, 15);
        // v(t) graph
        const gx = 270, gy = 40, gw = 420, gh = 380; g.fillStyle = COL.bg; g.fillRect(gx, gy, gw, gh); g.strokeStyle = COL.grid; g.lineWidth = 1;
        for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(gx + gw * i / 8, gy); g.lineTo(gx + gw * i / 8, gy + gh); g.stroke(); g.beginPath(); g.moveTo(gx, gy + gh * i / 8); g.lineTo(gx + gw, gy + gh * i / 8); g.stroke(); }
        const X = t => gx + t / tMax * gw, Y = v => gy + gh - v / vMax * gh;
        g.strokeStyle = COL.red; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(gx, Y(P.vSeis)); g.lineTo(gx + gw, Y(P.vSeis)); g.stroke();
        g.strokeStyle = COL.amber; g.beginPath(); g.moveTo(X(P.Tlog), gy); g.lineTo(X(P.Tlog), gy + gh); g.stroke(); g.setLineDash([]);
        g.font = '11px ' + FONT; g.textAlign = 'left'; g.fillStyle = COL.red; g.fillText('seismic trigger', gx + 6, Y(P.vSeis) - 5); g.fillStyle = COL.amber; g.fillText('logged arrival', Math.min(X(P.Tlog) + 5, gx + gw - 100), gy + 14);
        const curve = (k, T, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let i = 0; i <= 80; i++) { const t = T * i / 80; i ? g.lineTo(X(t), Y(yv(k, t).v)) : g.moveTo(X(t), Y(0)); } g.stroke(); };
        if (!ctx.ap || true) S.trials.forEach(t => curve(PHYS.eddyK(mat(t.mat).sig, t.t, P.B), t.T, 'rgba(95,224,208,.25)', 1.5));
        if (run) curve(run.k, Math.min(run.t, run.d.T), COL.cyan, 2.5);
        g.fillStyle = COL.dim; g.textAlign = 'center'; g.fillText('t (s) → ' + tMax.toFixed(1), gx + gw / 2, gy + gh + 18); g.save(); g.translate(gx - 10, gy + gh / 2); g.rotate(-Math.PI / 2); g.fillText('v (m/s) → ' + vMax.toFixed(1), 0, 0); g.restore();
        if (run) { g.fillStyle = COL.text; g.textAlign = 'left'; g.font = '13px ' + FONT; g.fillText('t = ' + Math.min(run.t, run.d.T).toFixed(2) + ' s   v = ' + yv(run.k, Math.min(run.t, run.d.T)).v.toFixed(2) + ' m/s', gx + 8, gy + gh - 10); }
      }
      ctx.loop(dt => { if (run) { run.t += dt * Math.max(1, run.d.T / 5); if (run.t >= run.d.T) done(); else draw(); } });
      log(); draw();
    }
  };

  // =====================================================================
  // 4. ISOTOPE TRACE — Lorentz force / mass spectrometer
  // =====================================================================
  Puzzles.massspec = {
    title: 'Mass Spectrometer', law: 'Lorentz Force  —  qV = ½mv² ,  r = mv / |q|B',
    open(ctx) {
      const P = ctx.P, S = ctx.S, iso = LAB.ISOTOPES.find(i => i.id === P.iso), SC = 440, x0 = 90, cy = 240, xR = 660;
      const set = S.set || (S.set = { V: 2000, B: 0.4, dir: 'in' }); if (!S.traces) S.traces = [];
      const cv = UI.canvas(ctx.left, 720, 480), g = cv.getContext('2d'); let fire = null;
      // Field out of screen pushes a + ion (moving right) downward on screen; into screen pushes it up.
      const shot = s => { const up = (iso.q > 0) === (s.dir === 'in'), r = PHYS.specR(iso.m, s.V, s.B), R = r * SC;
        let end = Math.PI; // stop the arc where it first leaves the chamber
        for (let i = 1; i < 240; i++) { const th = Math.PI * i / 240, px = x0 + R * Math.sin(th), dy = R - R * Math.cos(th); if (px > xR || dy > cy - 8) { end = th; break; } }
        return { up, r, R, end, hit: end === Math.PI && up === (P.side === 'up') && Math.abs(2 * r - P.D) < 0.003 }; };
      const pt = (s, th) => ({ x: x0 + s.R * Math.sin(th), y: s.up ? cy - s.R + s.R * Math.cos(th) : cy + s.R - s.R * Math.cos(th) });
      function panel() {
        ctx.right.innerHTML = `
          <p class="brief">Hit the slit, then name the ion.</p>
          <table class="kv"><tr><td>Slit distance from entry (2r)</td><td>${(P.D * 100).toFixed(0)} cm, ${P.side === 'up' ? 'above' : 'below'}</td></tr><tr><td>Slit width</td><td>±3 mm</td></tr><tr><td>Ion charge</td><td>|q| = e, sign unknown</td></tr></table>
          <label>Accelerating voltage V</label><div id="mV"></div>
          <label>Magnetic field B <output id="mBo"></output></label><input type="range" id="mBr" min="0.05" max="1.2" step="0.001"><input type="number" id="mBn" min="0.05" max="1.2" step="0.001">
          <label>Field direction</label><div id="mD"></div>
          <button class="go" id="mGo">Fire beam</button><div class="status" id="mStat"></div>
          <div id="mId" class="${S.hit ? '' : 'hide'}"><div class="read" id="mMq"></div>
          <p class="note">m = |q|B²r² / 2V.  1 u = 1.6605×10⁻²⁷ kg, e = 1.602×10⁻¹⁹ C.</p>
          <label>Identify the tracer ion</label><select id="mIso">${LAB.ISOTOPES.map(i => `<option value="${i.id}">${i.label}  (${i.m.toFixed(2)} u)</option>`).join('')}</select><button class="go" id="mOk">Log identification</button></div>`;
        const $ = id => ctx.right.querySelector('#' + id), sync = () => { $('mBr').value = set.B; $('mBn').value = set.B.toFixed(3); $('mBo').textContent = set.B.toFixed(3) + ' T'; };
        UI.seg($('mV'), [1000, 1500, 2000, 2500, 3000].map(v => ({ v, label: v + ' V' })), set.V, v => { set.V = v; });
        UI.seg($('mD'), [{ v: 'in', label: '⊗ into screen' }, { v: 'out', label: '⊙ out of screen' }], set.dir, v => { set.dir = v; });
        $('mBr').oninput = e => { set.B = +e.target.value; sync(); }; $('mBn').onchange = e => { set.B = Math.max(0.05, Math.min(1.2, +e.target.value || 0.05)); sync(); }; sync();
        $('mGo').onclick = () => { if (!fire) { fire = { s: shot(set), set: Object.assign({}, set), th: 0 }; UI.status($('mStat'), 'Beam on…'); } };
        if (S.hit) $('mMq').innerHTML = ctx.ap ? 'Detector count registered at V = ' + S.hit.V + ' V, B = ' + S.hit.B.toFixed(3) + ' T. AP mode: compute m yourself.' : 'Detector count registered.<br>m/|q| = <b>' + (S.hit.B * S.hit.B * P.D * P.D / 4 / (2 * S.hit.V) / 1.0365e-8).toFixed(1) + ' u/e</b> · charge sign: <b>' + (iso.q > 0 ? '+' : '−') + '</b>';
        $('mOk').onclick = () => {
          if ($('mIso').value === P.iso) { UI.status($('mStat'), 'Correct ✔', 'ok'); ctx.solve(['Airlock residue: tracer ion is ' + iso.label + ' (m ≈ ' + iso.m.toFixed(1) + ' u) — matches a tagged reagent-locker batch.']); }
          else { ctx.strike(); UI.status($('mStat'), 'Wrong ion.', 'bad'); }
        };
      }
      function done() {
        const s = fire.s; S.traces.push({ s, hit: s.hit }); if (S.traces.length > 6) S.traces.shift();
        const st = ctx.right.querySelector('#mStat');
        if (s.hit) { S.hit = { V: fire.set.V, B: fire.set.B }; fire = null; panel(); UI.status(ctx.right.querySelector('#mStat'), 'Hit! Now pick the ion.', 'ok'); }
        else { UI.status(st, s.up !== (P.side === 'up') ? 'Wrong way — flip the field.' : s.end < Math.PI ? 'Hit the wall — raise B.' : 'Beam landed ' + Math.abs((2 * s.r - P.D) * 100).toFixed(1) + ' cm ' + (2 * s.r > P.D ? 'beyond' : 'short of') + ' the slit.', 'bad'); fire = null; }
        draw();
      }
      function arc(s, end, col, w) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); for (let i = 0; i <= 60; i++) { const p = pt(s, end * i / 60); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); } g.stroke(); }
      function draw() {
        g.fillStyle = '#0b1216'; g.fillRect(0, 0, 720, 480); g.fillStyle = COL.bg; g.fillRect(x0, 8, xR - x0, 464); g.strokeStyle = '#33444e'; g.lineWidth = 3; g.strokeRect(x0, 8, xR - x0, 464);
        g.fillStyle = 'rgba(198,160,255,.35)'; g.font = '14px ' + FONT; g.textAlign = 'center';
        for (let x = x0 + 40; x < xR; x += 60) for (let y = 40; y < 470; y += 60) g.fillText(set.dir === 'in' ? '⊗' : '⊙', x, y);
        g.fillStyle = '#33444e'; g.fillRect(20, cy - 14, 70, 28); g.fillStyle = COL.text; g.font = '11px ' + FONT; g.fillText('ION GUN', 55, cy + 4);
        const sy = P.side === 'up' ? cy - P.D * SC : cy + P.D * SC; g.fillStyle = COL.amber; g.fillRect(x0 - 16, sy - 12, 14, 9); g.fillRect(x0 - 16, sy + 3, 14, 9); g.textAlign = 'right'; g.fillText('DETECTOR', x0 - 20, sy + 4);
        S.traces.forEach((t, i) => arc(t.s, t.s.end, t.hit ? 'rgba(111,255,170,.8)' : 'rgba(95,224,208,' + (0.12 + 0.08 * i) + ')', 1.5));
        if (fire) { arc(fire.s, fire.th, COL.cyan, 2.5); const p = pt(fire.s, fire.th); g.fillStyle = '#fff'; g.beginPath(); g.arc(p.x, p.y, 4, 0, 6.283); g.fill(); }
        g.fillStyle = COL.dim; g.textAlign = 'left'; g.fillText('scale: 44 px = 10 cm', x0 + 8, 464);
      }
      ctx.loop(dt => { if (fire) { fire.th += dt * 2.6; if (fire.th >= fire.s.end) { fire.th = fire.s.end; done(); } else draw(); } else draw(); });
      panel(); draw();
    }
  };

  // =====================================================================
  // 5. FIELD SURVEY TABLE — superposition "magnet hunt"
  // =====================================================================
  Puzzles.survey = {
    title: 'Field Survey Table', law: 'Superposition  —  B_net = Σ B_i   (dipole: B ∝ 1/r³)',
    open(ctx) {
      const H = ctx.C.hunt, S = ctx.S, SC = 20; if (!S.samples) S.samples = []; if (!S.cleared) S.cleared = [];
      const mags = () => S.samples.filter(q => q.kind !== 'fil'), fils = () => S.samples.filter(q => q.kind === 'fil');
      const cv = UI.canvas(ctx.left, 760, 460), g = cv.getContext('2d'); let sel = null;
      const X = x => (x + 19) * SC, Y = z => (z + 14) * SC;
      const read = (x, z) => { const b = PHYS.field(H.sources, x, z); if (S.sub && !ctx.ap) { const d = PHYS.field(H.decoys, x, z); b.bx -= d.bx; b.bz -= d.bz; } return b; };
      function panel() {
        const dec = H.decoys.length ? '<table class="kv small"><tr><td><b>Known source</b></td><td>pos (E, S) m</td><td>m (E, S) A·m²</td></tr>' + H.decoys.map(d => `<tr><td>${d.id}</td><td>${d.x}, ${d.z}</td><td>${d.mx}, ${d.mz}</td></tr>`).join('') + '</table>' : '<p class="note">No decoys.</p>';
        ctx.right.innerHTML = `
          <p class="brief">Find the hidden magnet. This map only shows what <b>you</b> measured out in the lab.</p>
          <div class="read">📍 ${mags().length} magnetometer reading${mags().length === 1 ? '' : 's'} · 🧲 ${fils().length} filing patch${fils().length === 1 ? '' : 'es'}</div>
          ${S.samples.length ? '' : '<p class="note warn">No data yet. Go out with the <b>magnetometer [1]</b> and <b>click</b> to log readings, or spray <b>filings [2]</b> on the floor — they appear here.</p>'}
          ${dec}${ctx.ap ? '' : '<div class="row"><button id="sSub">' + (S.sub ? '☑' : '☐') + ' Subtract known</button></div>'}
          <p class="note">${ctx.ap ? 'AP mode: no arrows. Use the numeric readings and B = (μ₀/4π)[3(m·r̂)r̂ − m]/r³ to subtract each known source by hand. (μ₀/4π = 0.1 µT·m³ per A·m²)' : 'Coloured arrows = your readings (longer = stronger). Grey lines = filings (direction only).'}</p>
          <div id="sList" class="log"></div><div class="read" id="sSel">Click a panel marker (P1–P8) to select it.</div>
          <button class="go" id="sGo" disabled>Breach selected panel</button><div class="status" id="sStat"></div>`;
        const $ = id => ctx.right.querySelector('#' + id);
        if (!ctx.ap) $('sSub').onclick = () => { S.sub = !S.sub; panel(); draw(); };
        $('sGo').onclick = () => {
          if (!sel || S.done) return;
          if (sel.id === H.target) { S.done = true; UI.status($('sStat'), 'Found it behind ' + sel.id + '!', 'ok'); ctx.solve(['Field survey: after subtracting known equipment, the residual dipole source sits behind panel ' + sel.id + ' (' + sel.where + ').']); }
          else { S.cleared.push(sel.id); ctx.strike(); UI.status($('sStat'), sel.id + ': empty.', 'bad'); sel = null; $('sGo').disabled = true; }
          draw();
        };
        list();
      }
      function list() { const el = ctx.right.querySelector('#sList'); if (el) el.innerHTML = mags().slice(-7).reverse().map(s => { const b = read(s.x, s.z); return `<div>(${s.x.toFixed(1)}, ${s.z.toFixed(1)}) → B<sub>E</sub> ${b.bx.toFixed(2)}, B<sub>S</sub> ${b.bz.toFixed(2)} µT</div>`; }).join(''); }
      cv.onclick = e => {
        const p = UI.pos(e, cv), hit = LAB.PANELS.find(q => Math.hypot(X(q.x) - p.x, Y(q.z) - p.y) < 13);
        if (hit) { if (!S.cleared.includes(hit.id)) { sel = hit; ctx.right.querySelector('#sSel').innerHTML = 'Selected <b>' + hit.id + '</b> — ' + hit.where; ctx.right.querySelector('#sGo').disabled = !!S.done; } }
        draw();
      };
      function draw() {
        g.fillStyle = '#0b1216'; g.fillRect(0, 0, 760, 460); g.strokeStyle = COL.grid; g.lineWidth = 1; g.font = '10px ' + FONT; g.fillStyle = COL.dim; g.textAlign = 'center';
        for (let x = -15; x <= 15; x += 5) { g.beginPath(); g.moveTo(X(x), 0); g.lineTo(X(x), 460); g.stroke(); g.fillText(x + ' E', X(x), 456); }
        g.textAlign = 'left'; for (let z = -10; z <= 5; z += 5) { g.beginPath(); g.moveTo(0, Y(z)); g.lineTo(760, Y(z)); g.stroke(); g.fillText(z + ' S', 3, Y(z) - 3); }
        LAB.ROOMS.forEach(r => { g.fillStyle = '#111b21'; g.fillRect(X(r.x1), Y(r.z1), (r.x2 - r.x1) * SC, (r.z2 - r.z1) * SC); g.strokeStyle = '#4a5f6c'; g.lineWidth = 2; g.strokeRect(X(r.x1), Y(r.z1), (r.x2 - r.x1) * SC, (r.z2 - r.z1) * SC);
          g.fillStyle = '#33444e'; g.font = '11px ' + FONT; g.textAlign = 'center'; g.fillText(r.name.toUpperCase(), X((r.x1 + r.x2) / 2), Y(r.z1) + 14); });
        g.fillStyle = '#111b21'; [[0, -7, 1], [10, 0, 0], [-10, 0, 0]].forEach(d => d[2] ? g.fillRect(X(d[0] - 1), Y(d[1]) - 3, 2 * SC, 6) : g.fillRect(X(d[0]) - 3, Y(d[1] - 1), 6, 2 * SC));
        H.decoys.forEach(d => { g.fillStyle = '#ff8a3a'; g.fillRect(X(d.x) - 7, Y(d.z) - 7, 14, 14); UI.arrow(g, X(d.x), Y(d.z), d.mx / d.m * 20, d.mz / d.m * 20, '#ffd0a0', 2); g.font = '10px ' + FONT; g.textAlign = 'center'; g.fillStyle = '#ffb070'; g.fillText(d.id, X(d.x), Y(d.z) + 20); });
        fils().forEach(s => { // iron filings: direction only, the real (un-subtracted) field
          for (let i = 0; i < 9; i++) { const a = i * 2.4, r = i ? 0.35 + 0.11 * i : 0, x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r, b = PHYS.field(H.sources, x, z), m = Math.hypot(b.bx, b.bz) || 1e-9;
            g.strokeStyle = 'rgba(200,210,215,.75)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(x) - b.bx / m * 6, Y(z) - b.bz / m * 6); g.lineTo(X(x) + b.bx / m * 6, Y(z) + b.bz / m * 6); g.stroke(); }
        });
        mags().forEach(s => {
          if (ctx.ap) { g.fillStyle = COL.cyan; g.fillRect(X(s.x) - 2, Y(s.z) - 2, 4, 4); return; }
          const b = read(s.x, s.z), m = Math.hypot(b.bx, b.bz) || 1e-9, l = Math.min(26, 5 + 9 * Math.log10(1 + m));
          UI.arrow(g, X(s.x) - b.bx / m * l / 2, Y(s.z) - b.bz / m * l / 2, b.bx / m * l, b.bz / m * l, 'hsl(' + Math.max(0, 170 - 55 * Math.log10(1 + m)) + ',85%,62%)', 1.6);
        });
        LAB.PANELS.forEach(p => { const cl = S.cleared.includes(p.id), on = sel === p, win = S.done && p.id === H.target;
          g.fillStyle = win ? '#6fffaa' : cl ? '#3a2a2a' : on ? COL.amber : '#9fd8ff'; g.beginPath(); g.arc(X(p.x), Y(p.z), 9, 0, 6.283); g.fill();
          g.fillStyle = '#081014'; g.font = 'bold 10px ' + FONT; g.textAlign = 'center'; g.fillText(cl ? '✕' : p.id, X(p.x), Y(p.z) + 3.5); });
        const pl = World.player; g.fillStyle = '#fff'; g.beginPath(); g.arc(X(pl.x), Y(pl.z), 4, 0, 6.283); g.fill(); g.font = '10px ' + FONT; g.fillText('YOU', X(pl.x), Y(pl.z) - 8);
      }
      panel(); draw();
    }
  };
})();

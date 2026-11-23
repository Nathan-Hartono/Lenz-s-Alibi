/* Lenz's Alibi — menu, HUD, overlay sheets, case board, accusation and lab-instability events. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const G = { C: null, t: 0, sheet: null, loops: [], closers: [], surgeIdx: 0, alertT: 0, wandNoted: false, inited: false };
  const STATION = { faraday: 'Ghost-Pulse Oscilloscope', ampere: 'Maglock Conduit Panel', eddy: 'Cryo-Shaft Drop Rig', massspec: 'Mass Spectrometer', survey: 'Field Survey Table' };
  const TOOLS = [['mag', '1 Magnetometer'], ['spray', '2 Filing spray'], ['wand', '3 Induction wand']];
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const newSeed = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  // ---------------- menu ----------------
  function menu() {
    $('cases').innerHTML = '';
    Object.values(CASES).forEach(d => {
      const b = document.createElement('button'); b.className = 'case';
      b.innerHTML = `<span class="code">${d.code} · ${d.tag}</span><h2>${d.title}</h2><p>${d.blurb}</p><span class="tags">${d.suspects} suspects · ${d.puzzles.length + 1} instruments${d.events ? ' · lab instability' : ''}</span><span class="open">Open case file →</span>`;
      b.onclick = () => start(d.id); $('cases').appendChild(b);
    });
    if (!$('seed').value) $('seed').value = newSeed();
    try { if (localStorage.getItem('lenz.hq') === '0') $('hq').checked = false; } catch (e) { /* storage unavailable */ }
    $('reseed').onclick = () => { $('seed').value = newSeed(); };
    $('tutBtn').onclick = () => start(1, null, { guide: true });
    try { if (localStorage.getItem('lenz.guide') === '1') $('guide').checked = true; } catch (e) { /* storage unavailable */ }
    $('guide').onchange = () => { try { localStorage.setItem('lenz.guide', $('guide').checked ? '1' : '0'); } catch (e) { /* storage unavailable */ } };
  }
  function start(id, seed, opts) {
    if (!window.THREE) { $('nogl').classList.remove('hide'); return; }
    seed = (seed || $('seed').value || newSeed()).toUpperCase().trim(); $('seed').value = seed;
    G.guide = opts && opts.guide != null ? opts.guide : $('guide').checked;
    G.C = generateCase(id, seed, $('ap').checked); G.t = 0; G.surgeIdx = 0; G.wandNoted = false; G.won = false;
    $('menu').classList.add('hide'); $('game').classList.remove('hide');
    World.high = $('hq').checked; try { localStorage.setItem('lenz.hq', World.high ? '1' : '0'); } catch (e) { /* storage unavailable */ }
    if (!G.inited) { World.init($('view')); G.inited = true; World.onFrame = frame; World.onSpray = ok => { if (!ok) toast(World.sprayLeft ? 'Aim at the floor.' : 'Spray empty.', 'info'); }; }
    World.load(G.C); World.visible = true; World.tool = 'mag';
    $('hCase').textContent = G.C.def.code + ' — ' + G.C.def.title; hud();
    if (G.guide) Tutorial.begin(G, Object.assign({ board: 'Case Board' }, STATION)); else Tutorial.stop();
    briefing();
  }
  function toMenu() { Tutorial.stop(); closeSheet(true); World.visible = false; World.unlock(); $('game').classList.add('hide'); $('menu').classList.remove('hide'); $('seed').value = newSeed(); }

  // ---------------- overlay plumbing ----------------
  function openSheet(kind, html) {
    closeSheet(true); G.sheet = kind; World.paused = true; World.unlock();
    $('sheet').innerHTML = html; $('overlay').classList.remove('hide');
    const x = $('xClose'); if (x) x.onclick = () => closeSheet();
  }
  function closeSheet(silent) {
    G.closers.forEach(f => f()); G.closers = []; G.loops = []; G.sheet = null;
    $('overlay').classList.add('hide'); $('sheet').innerHTML = ''; World.keys = {};
    if (!silent) World.paused = false;
  }
  function toast(msg, kind) {
    const d = document.createElement('div'); d.className = 'toast ' + (kind || ''); d.textContent = msg; $('toasts').appendChild(d);
    setTimeout(() => d.remove(), 6500);
  }
  function strike() { G.C.strikes++; hud(); }
  function total() { return G.C.def.puzzles.length + 1; }
  function solvedCount() { return ['survey'].concat(G.C.def.puzzles).filter(id => (G.C.state[id] || {}).solved).length; }
  function hud() {
    const m = Math.floor(G.t / 60), s = Math.floor(G.t % 60);
    $('hMeta').textContent = 'seed ' + G.C.seed + (G.C.ap ? ' · AP MODE' : '') + ' · ' + m + ':' + (s < 10 ? '0' : '') + s + ' · strikes ' + G.C.strikes;
    $('hFacts').textContent = 'Instruments verified ' + solvedCount() + ' / ' + total();
    $('tools').innerHTML = TOOLS.map(t => `<span class="${World.tool === t[0] ? 'on' : ''}">${t[1]}</span>`).join('');
  }

  // ---------------- briefing ----------------
  function briefing() {
    const C = G.C, d = C.def;
    openSheet('brief', `<div class="sheet-h"><h2>${d.code} — ${d.title}</h2><span class="law">seed ${C.seed}${C.ap ? ' · AP' : ''}</span></div><div class="doc">
      <p>Dr. Thorne is gone. The door is locked from inside. ${C.suspects.length} suspects.</p>
      <h3>To do</h3>
      <p>${d.puzzles.map(p => '▸ ' + STATION[p]).join('<br>')}<br>▸ Field Survey Table — find the hidden pod<br>▸ Case Board [Tab] — accuse</p>
      ${G.guide ? '<div class="tutbrief">📘 Follow the <b class="cy">arrows</b>. <b>H</b> hides the guide.</div>' : ''}
      <p class="note">Wrong answers = strike.${d.events ? ' Expect field surges.' : ''}</p>
      <h3>Controls</h3>
      <div class="keys"><span><b>WASD</b> move · <b>Shift</b> run</span><span><b>Mouse</b> look</span><span><b>E</b> inspect</span>
      <span><b>1 2 3</b> tools</span><span><b>Tab</b> case board</span><span><b>Esc</b> close</span></div>
      <div class="row" style="margin-top:20px;max-width:360px"><button class="go" id="bGo">Start</button><button id="bBack">Back</button></div></div>`);
    $('bGo').onclick = () => { closeSheet(); const cv = document.querySelector('#view canvas'); try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* drag-look fallback */ } };
    $('bBack').onclick = toMenu;
  }

  // ---------------- terminals ----------------
  function openTerminal(id) {
    const Pz = Puzzles[id], C = G.C, S = C.state[id] || (C.state[id] = {});
    openSheet('term', `<div class="sheet-h"><h2>${Pz.title}</h2><span class="law">${Pz.law}</span><span class="tagok" id="tagok">${S.solved ? '✔ VERIFIED' : ''}</span><button id="xClose">Close [Esc]</button></div>
      <div class="sheet-b"><div class="left"></div><div class="right"></div></div>`);
    const body = $('sheet');
    Pz.open({
      C, P: C.puzzles[id], S, ap: C.ap, left: body.querySelector('.left'), right: body.querySelector('.right'), strike, toast,
      loop: f => G.loops.push(f), onClose: f => G.closers.push(f),
      solve(facts) {
        if (S.solved) return; S.solved = true;
        facts.forEach(f => C.facts.push({ src: Pz.title, text: f }));
        const t = $('tagok'); if (t) t.textContent = '✔ VERIFIED'; hud();
        toast('✔ Fact added (' + solvedCount() + '/' + total() + ')');
      }
    });
    Tutorial.onSheet(id);
  }

  // ---------------- case board ----------------
  function openBoard() {
    const C = G.C, pending = ['survey'].concat(C.def.puzzles).filter(id => !(C.state[id] || {}).solved);
    const A = C.acc || (C.acc = {});
    const opt = (v, label, cur) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${esc(label)}</option>`;
    openSheet('board', `<div class="sheet-h"><h2>Case Board</h2><span class="law">${C.def.code} · cross-reference physics against people</span><button id="xClose">Close [Tab]</button></div><div class="board">
      <div><h3>Verified physics</h3>${C.facts.map(f => `<div class="fact"><b>${esc(f.src)}</b><br>${esc(f.text)}</div>`).join('') || ''}
        ${pending.map(id => `<div class="pending">Unverified: ${STATION[id]}</div>`).join('')}</div>
      <div><h3>Statements &amp; access logs</h3>${C.suspects.map(s => `<div class="sus" style="border-left-color:${s.color}"><h4>${s.name}</h4><div class="role">${s.role}</div><q>${esc(s.alibi)}</q><ul>${s.log.map(l => '<li>' + esc(l) + '</li>').join('')}</ul></div>`).join('')}</div>
      <div class="acc"><h3>Accusation</h3>
        <label>Who triggered the setup?</label><select id="qWho"><option value="">— select —</option>${C.suspects.map(s => opt(s.id, s.name + ' — ' + s.role, A.who)).join('')}</select>
        ${C.methods.map((m, i) => `<label>${m.q}</label><select id="qM${i}"><option value="">— select —</option>${m.options.map(o => opt(o.v, o.label, (A.m || [])[i])).join('')}</select>`).join('')}
        <label>Where is the pod concealed?</label><select id="qWhere"><option value="">— select —</option>${LAB.PANELS.map(p => opt(p.id, p.id + ' — ' + p.where, A.where)).join('')}</select>
        <button class="go" id="qGo" style="width:100%;margin-top:14px">File accusation</button><div class="status" id="qStat"></div>
        <p class="note" style="margin-top:10px">Wrong accusation = strike.</p></div></div>`);
    Tutorial.onSheet('board');
    const save = () => { A.who = $('qWho').value; A.where = $('qWhere').value; A.m = C.methods.map((m, i) => $('qM' + i).value); };
    $('sheet').querySelectorAll('select').forEach(s => { s.onchange = save; });
    $('qGo').onclick = () => {
      save(); const claims = [A.who === C.culpritId, A.where === C.hunt.target].concat(C.methods.map((m, i) => A.m[i] === m.answer));
      if ([A.who, A.where].concat(A.m).some(v => !v)) { $('qStat').className = 'status bad'; $('qStat').textContent = 'Fill in every line.'; return; }
      const bad = claims.filter(c => !c).length;
      if (!bad) return verdict();
      strike(); $('qStat').className = 'status bad'; $('qStat').textContent = 'Wrong: ' + bad + ' of ' + claims.length + ' answers.';
    };
  }
  function verdict() {
    const C = G.C, who = C.suspects.find(s => s.id === C.culpritId), pan = LAB.PANELS.find(p => p.id === C.hunt.target);
    const rank = C.strikes === 0 ? 'Chief Forensic Physicist' : C.strikes <= 2 ? 'Senior Investigator' : C.strikes <= 5 ? 'Consulting Detective' : 'Consultant, on probation';
    const m = Math.floor(G.t / 60), s = Math.floor(G.t % 60); G.won = true; Tutorial.stop(); $('alert').classList.add('hide'); $('prompt').classList.add('hide');
    openSheet('verdict', `<div class="verdict"><div class="stamp" style="color:var(--green);border-color:var(--green)">CASE CLOSED</div><h2>${who.name}</h2><div class="rank">${who.role} · charged</div>
      <p>${C.methods.map(q => q.options.find(o => o.v === q.answer).label + '.').join(' ')} The containment pod was recovered from behind panel ${pan.id} (${pan.where}). Dr. Thorne is alive, cold, and furious.</p>
      <p>${C.facts.length} physics facts entered in evidence · ${C.strikes} strike${C.strikes === 1 ? '' : 's'} · ${m}:${s < 10 ? '0' : ''}${s} · seed ${C.seed}${C.ap ? ' · AP Exam Mode' : ''}</p>
      <div class="rank">Rating: ${rank}</div>
      <div class="row"><button class="go" id="vNext">${C.def.id < 3 ? 'Next case' : 'Generate another cold case'}</button><button id="vMenu">Back to case files</button></div></div>`);
    $('vNext').onclick = () => { closeSheet(true); start(Math.min(3, C.def.id + 1), newSeed(), { guide: G.guide }); };
    $('vMenu').onclick = toMenu;
  }

  // ---------------- per-frame HUD + events ----------------
  function frame(dt) {
    const C = G.C; if (!C || G.won) return;
    if (G.sheet !== 'brief') G.t += dt;
    if (C.surges[G.surgeIdx] != null && G.t > C.surges[G.surgeIdx]) { G.surgeIdx++; World.startSurge(7); G.alertT = 7; $('alert').textContent = '⚠ FIELD SURGE'; $('alert').classList.remove('hide'); }
    if (G.alertT > 0) { G.alertT -= dt; if (G.alertT <= 0) $('alert').classList.add('hide'); }
    if ((G.hudT = (G.hudT || 0) + dt) > 0.5) { G.hudT = 0; hud(); }
    const near = G.sheet ? null : World.nearest(), pr = $('prompt');
    if (near) { pr.classList.remove('hide'); pr.innerHTML = (near.active ? '<b>[E]</b> ' + near.name : near.name + ' — not used') + Tutorial.promptExtra(near); } else pr.classList.add('hide');
    Tutorial.frame(dt);
    $('resume').classList.toggle('hide', !!G.sheet || World.locked);
    $('room').textContent = World.roomName();
    drawTool();
  }
  function drawTool() {
    const cv = $('toolCv'), g = cv.getContext('2d'), p = World.player, txt = $('toolTxt'); g.clearRect(0, 0, 120, 120);
    g.strokeStyle = '#24343d'; g.lineWidth = 2; g.beginPath(); g.arc(60, 60, 52, 0, 6.283); g.stroke();
    if (World.tool === 'mag') {
      const b = World.fieldHere(), m = Math.hypot(b.bx, b.bz) || 1e-9, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
      const f = (b.bx * fx + b.bz * fz) / m, r = (b.bx * rx + b.bz * rz) / m;
      if (G.C.ap) { g.fillStyle = '#5c6a72'; g.font = '11px monospace'; g.textAlign = 'center'; g.fillText('NEEDLE', 60, 56); g.fillText('LOCKED', 60, 72); }
      else { UI.arrow(g, 60 - r * 40, 60 + f * 40, r * 80, -f * 80, '#5fe0d0', 3); g.fillStyle = '#e0483c'; g.beginPath(); g.arc(60 + r * 40, 60 - f * 40, 5, 0, 6.283); g.fill(); }
      const hd = ((Math.round(-p.yaw * 180 / Math.PI) % 360) + 360) % 360;
      txt.innerHTML = 'MAGNETOMETER<br><b>' + m.toFixed(m < 100 ? 2 : 0) + ' µT</b><br>B<sub>E</sub> ' + b.bx.toFixed(1) + ' · B<sub>S</sub> ' + b.bz.toFixed(1) + '<br>pos (' + p.x.toFixed(1) + ' E, ' + p.z.toFixed(1) + ' S) · hdg ' + hd + '°';
    } else if (World.tool === 'spray') {
      g.fillStyle = '#d7e0e4'; for (let i = 0; i < 40; i++) { const a = i * 2.4, r = 6 + i * 1.1; g.fillRect(60 + Math.cos(a) * r, 60 + Math.sin(a) * r, 5, 1.5); }
      txt.innerHTML = 'FILING SPRAY<br><b>' + World.sprayLeft + ' left</b><br>Click the floor.';
    } else {
      const v = World.wandHere(); g.fillStyle = '#081014'; g.fillRect(40, 14, 40, 92); g.fillStyle = v > 0.7 ? '#ff5a4d' : '#ffb347'; g.fillRect(40, 106 - 92 * v, 40, 92 * v);
      txt.innerHTML = 'INDUCTION WAND<br><b>' + (v * 100).toFixed(0) + '%</b><br>' + (v > 0.7 ? 'Live wire here!' : 'Sweep walls.');
      if (v > 0.85 && !G.wandNoted) { G.wandNoted = true; toast('Live wire in this wall — follow it.', 'info'); }
    }
  }

  // ---------------- keys ----------------
  window.addEventListener('keydown', e => {
    if (!G.C || $('game').classList.contains('hide')) return;
    if (e.code === 'Escape') { if (G.sheet === 'term' || G.sheet === 'board') closeSheet(); return; }
    if (e.code === 'Tab') { if (!G.sheet) { e.preventDefault(); openBoard(); } else if (G.sheet === 'board') { e.preventDefault(); closeSheet(); } return; }
    if (G.sheet) return;
    if (e.code === 'KeyE') { const n = World.nearest(); if (!n) return; if (n.id === 'board') openBoard(); else if (n.active) openTerminal(n.id); else toast('Not used in this case.', 'info'); }
    if (e.code === 'KeyH') Tutorial.toggle();
    const t = { Digit1: 'mag', Digit2: 'spray', Digit3: 'wand' }[e.code]; if (t) { World.tool = t; hud(); Tutorial.onTool(t); }
  });
  let lastT = 0;
  (function tick(ts) { const dt = Math.min(0.05, (ts - lastT) / 1000 || 0); lastT = ts; G.loops.forEach(f => f(dt)); requestAnimationFrame(tick); })(0);

  window.GAME = G; window.GAME_API = { start, openTerminal, openBoard, closeSheet, toast };
  menu();
})();

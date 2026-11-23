/* Lenz's Alibi — seeded RNG, shared physics, lab layout data and the procedural case generator. */
(function () {
  'use strict';

  // ---------- seeded RNG ----------
  function hashStr(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function RNG(seed) {
    let a = hashStr(String(seed));
    const r = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.range = (lo, hi) => lo + (hi - lo) * r();
    r.int = (lo, hi) => Math.floor(r.range(lo, hi + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.step = (lo, hi, st) => Math.round(Math.round(r.range(lo, hi) / st) * st * 1000) / 1000;
    r.shuffle = (arr) => { arr = arr.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    return r;
  }

  // ---------- shared physics ----------
  const PHYS = {
    MU0: 1.2566e-6,
    // Horizontal-plane dipole superposition. Moments in A·m², result in µT.
    field(sources, x, z) {
      let bx = 0, bz = 0;
      for (const s of sources) {
        const dx = x - s.x, dz = z - s.z;
        const r2 = Math.max(dx * dx + dz * dz, 0.25), r = Math.sqrt(r2);
        const ux = dx / r, uz = dz / r, md = s.mx * ux + s.mz * uz, c = 0.1 / (r2 * r);
        bx += c * (3 * md * ux - s.mx); bz += c * (3 * md * uz - s.mz);
      }
      return { bx, bz };
    },
    // Eddy-brake drag coefficient k (kg/s) for a sleeve: F = k v
    eddyK(sig, tmm, B) { return 2.0 * sig * (tmm / 2) * B * B; },
    // Magnet of mass m falling height h with linear drag k
    eddyDrop(m, k, h) {
      const g = 9.81;
      if (k < 1e-9) { const T = Math.sqrt(2 * h / g); return { T, v: g * T, vt: Infinity, tau: Infinity }; }
      const vt = m * g / k, tau = m / k;
      let lo = 0, hi = h / vt + 12 * tau + 1;
      for (let i = 0; i < 70; i++) { const t = (lo + hi) / 2; (vt * t - vt * tau * (1 - Math.exp(-t / tau)) < h) ? lo = t : hi = t; }
      return { T: hi, v: vt * (1 - Math.exp(-hi / tau)), vt, tau };
    },
    // Mass-spec orbit radius (m) for mass in u, |q| = e
    specR(mu, V, B) { return Math.sqrt(2.0729e-8 * mu * V) / B; }
  };

  // ---------- lab layout (metres; +x = East, +z = South) ----------
  const LAB = {
    ROOMS: [
      { name: 'Main Accelerator Bay', x1: -10, x2: 10, z1: -7, z2: 7 },
      { name: 'Observation Booth', x1: -6, x2: 6, z1: -13, z2: -7 },
      { name: 'Cryo-Storage', x1: 10, x2: 18, z1: -5, z2: 5 },
      { name: 'Control Substation', x1: -18, x2: -10, z1: -5, z2: 5 }
    ],
    PANELS: [
      { id: 'P1', x: -6, z: -6.8, o: 'ns', where: 'Accelerator Bay · north wall, west end' },
      { id: 'P2', x: 6, z: -6.8, o: 'ns', where: 'Accelerator Bay · north wall, east end' },
      { id: 'P3', x: -7, z: 6.8, o: 'ns', where: 'Accelerator Bay · south wall, west end' },
      { id: 'P4', x: 8, z: 6.8, o: 'ns', where: 'Accelerator Bay · south wall, east end' },
      { id: 'P5', x: 17.8, z: -1.5, o: 'ew', where: 'Cryo-Storage · east wall' },
      { id: 'P6', x: 12.5, z: 2.8, o: 'floor', where: 'Cryo-Storage · floor panel' },
      { id: 'P7', x: -17.8, z: 2, o: 'ew', where: 'Control Substation · west wall' },
      { id: 'P8', x: -5.8, z: -10, o: 'ew', where: 'Observation Booth · west wall' }
    ],
    DECOYS: [
      { id: 'RACK-A', name: 'Server rack A', x: -8.5, z: 3 },
      { id: 'XFMR-1', name: 'Transformer T1', x: 8.9, z: -5.6 },
      { id: 'RACK-B', name: 'Server rack B', x: -13, z: -3.6 },
      { id: 'PUMP', name: 'Cryo compressor', x: 13, z: -3.8 },
      { id: 'UPS', name: 'UPS bank', x: 4.5, z: -11.8 }
    ],
    CIRCUITS: [
      { id: 'cryo', name: 'Cryo-Storage bench outlet', path: [[3, 7], [10, 7], [10, 1]] },
      { id: 'ctrl', name: 'Control Substation bench outlet', path: [[3, 7], [-10, 7], [-10, 1]] },
      { id: 'obs', name: 'Observation Booth bench outlet', path: [[3, 7], [10, 7], [10, -7], [1, -7]] },
      { id: 'bay', name: 'Accelerator Bay service outlet', path: [[3, 7], [8.5, 7]] }
    ],
    MATS: [
      { id: 'pvc', name: 'PVC', sig: 0, color: '#9aa7ad' },
      { id: 'al', name: 'Aluminium 6061', sig: 0.7, color: '#c9d3da' },
      { id: 'slot', name: 'Slotted copper', sig: 0.3, color: '#b9793f' },
      { id: 'cu', name: 'Solid copper', sig: 1, color: '#e08a45' }
    ],
    STOCK: { al: 'Aluminium 6061 tube stock', slot: 'Slotted copper cryostat liners', cu: 'Solid copper cryostat tubes' },
    ISOTOPES: [
      { id: 'Cl35', label: '³⁵Cl⁻', m: 34.969, q: -1 }, { id: 'Cl37', label: '³⁷Cl⁻', m: 36.966, q: -1 },
      { id: 'K39', label: '³⁹K⁺', m: 38.964, q: 1 }, { id: 'K41', label: '⁴¹K⁺', m: 40.962, q: 1 },
      { id: 'Br79', label: '⁷⁹Br⁻', m: 78.918, q: -1 }, { id: 'Br81', label: '⁸¹Br⁻', m: 80.916, q: -1 }
    ],
    MOTIONS: { insert: 'plunged into the coil and stopped dead', withdraw: 'yanked out of the coil', through: 'dropped clean through the coil' }
  };

  const SUSPECTS = [
    { id: 'cryo', name: 'Dr. Mara Voss', role: 'Cryogenics Tech', color: '#6fd3ff', alibi: 'I was bleeding down the helium dewars when the field spiked. You cannot leave that valve unattended — check the fill log.' },
    { id: 'eng', name: 'Idris Okafor', role: 'Accelerator Engineer', color: '#ffb347', alibi: 'Recalibrating the quadrupole supplies. I heard the containment alarm on my headset and stayed at my station, per protocol.' },
    { id: 'grad', name: 'Lena Park', role: 'Grad Student', color: '#c6a0ff', alibi: 'Writing up Thorne\'s beam data. He had promised me first authorship. Why would I want him gone?' },
    { id: 'sec', name: 'Tomas Reyes', role: 'Security Chief', color: '#ff7a6b', alibi: 'Doing my rounds. The blast door never lost power — my board shows no outage — so nobody walked out of that lab.' }
  ];

  const CASES = {
    1: { id: 1, code: 'CASE 01', title: 'The Vanishing in Bay 2', tag: 'Tutorial', suspects: 3, puzzles: ['faraday'], decoys: [0, 0], events: false, methods: ['motion'],
      blurb: 'One puzzle. Good first case.' },
    2: { id: 2, code: 'CASE 02', title: 'The Cryo-Shaft Incident', tag: 'Standard', suspects: 3, puzzles: ['eddy', 'ampere'], decoys: [1, 2], events: false, methods: ['current'],
      blurb: 'Falling magnets and a fake lock.' },
    3: { id: 3, code: 'CASE 03', title: 'Cold Case Generator', tag: 'Procedural · Endless', suspects: 4, puzzles: ['faraday', 'ampere', 'eddy', 'massspec'], decoys: [2, 4], events: true, methods: ['motion', 'current'],
      blurb: 'Every puzzle. New case each time.' }
  };
  const ATTR_OF = { faraday: 'side', ampere: 'circuit', eddy: 'stock', massspec: 'isotope' };
  const POOLS = { side: ['West', 'East'], circuit: LAB.CIRCUITS.map(c => c.id), stock: ['al', 'slot', 'cu'], isotope: LAB.ISOTOPES.map(i => i.id) };

  function attrText(attr, v) {
    if (attr === 'side') return 'Badge ping 23:12 — ' + v + ' corridor reader';
    if (attr === 'circuit') return 'Breaker-panel key signed out: ' + LAB.CIRCUITS.find(c => c.id === v).name;
    if (attr === 'stock') return 'Stores clearance: ' + LAB.STOCK[v];
    return 'Reagent locker batch tag: ' + LAB.ISOTOPES.find(i => i.id === v).label;
  }

  function generate(caseId, seed, ap) {
    const def = CASES[caseId], R = RNG(caseId + ':' + seed);
    const C = { def, seed, ap: !!ap, puzzles: {}, state: {}, facts: [], strikes: 0 };

    // --- suspects, culprit and the attribute matrix ---
    const sus = R.shuffle(SUSPECTS).slice(0, def.suspects).map(s => Object.assign({ attrs: {} }, s));
    const culprit = R.pick(sus); C.culpritId = culprit.id;
    const attrs = R.shuffle(def.puzzles.map(p => ATTR_OF[p])); C.attrs = attrs;
    attrs.forEach(a => { culprit.attrs[a] = R.pick(POOLS[a]); });
    sus.filter(s => s !== culprit).forEach((s, j) => {
      const must = attrs[j % attrs.length];
      let diff = attrs.filter(a => a === must || R() < 0.4);
      if (attrs.length > 1 && diff.length === attrs.length) { const keep = R.pick(attrs.filter(x => x !== must)); diff = diff.filter(a => a !== keep); }
      attrs.forEach(a => { s.attrs[a] = diff.includes(a) ? R.pick(POOLS[a].filter(v => v !== culprit.attrs[a])) : culprit.attrs[a]; });
    });
    sus.forEach(s => { s.log = attrs.map(a => attrText(a, s.attrs[a])); });
    C.suspects = sus;

    // --- Faraday: ghost pulse ---
    if (def.puzzles.includes('faraday')) {
      C.puzzles.faraday = {
        N: R.pick([50, 100, 250, 500]), phi0: R.pick([2, 4, 5, 8]) * 1e-4, rev: R.pick([1, -1]),
        pole: culprit.attrs.side === 'West' ? 'N' : 'S', motion: R.pick(['insert', 'withdraw', 'through']), v: R.step(0.5, 4, 0.5)
      };
    }
    // --- Ampère: maglock bypass ---
    if (def.puzzles.includes('ampere')) {
      let Ic, Il, nL, nC, n = 0;
      do { Ic = R.step(1.5, 8, 0.1); nC = R.pick([500, 800, 1000, 1200, 2000]); nL = R.pick([800, 1000, 1200, 1500]); Il = nC * Ic / nL; n++; }
      while (n < 500 && (Il < 1.5 || Il > 8 || Math.abs(Il * 10 - Math.round(Il * 10)) > 1e-6 || Math.abs(Il - Ic) < 0.35));
      Il = Math.round(Il * 10) / 10;
      const used = [Ic, Il], cells = [];
      const wires = [{ kind: 'feed', name: 'MAGLOCK FEED', I: Il * R.pick([1, -1]) }];
      R.shuffle(LAB.CIRCUITS).forEach(c => {
        let I = Ic;
        if (c.id !== culprit.attrs.circuit) { do { I = R.step(1.5, 8, 0.1); } while (used.some(u => Math.abs(u - I) < 0.35)); used.push(I); }
        wires.push({ kind: 'circuit', id: c.id, name: c.name, I: I * R.pick([1, -1]) });
      });
      R.shuffle(wires).forEach((w, i) => {
        let cx, cy; do { cx = R.int(1, 10); cy = R.int(1, 6); } while (cells.some(p => Math.abs(p[0] - cx) < 2 && Math.abs(p[1] - cy) < 2));
        cells.push([cx, cy]); w.cx = cx; w.cy = cy; w.tag = 'K' + (i + 1);
      });
      wires.sort((a, b) => a.tag < b.tag ? -1 : 1);
      C.puzzles.ampere = { wires, nL, nC, Ic, Il, tap: culprit.attrs.circuit, drift: def.events };
    }
    // --- Eddy: cryo-shaft ---
    if (def.puzzles.includes('eddy')) {
      const mat = culprit.attrs.stock, t = mat === 'slot' ? R.pick([4, 6]) : R.pick([2, 4, 6]);
      let h, m, B, d, clash, tries = 0;
      do { // reroll until no other sleeve reproduces the logged descent time
        h = R.step(3, 6, 0.5); m = R.pick([0.4, 0.5, 0.8, 1.0]); B = R.pick([1.0, 1.2, 1.4]);
        d = PHYS.eddyDrop(m, PHYS.eddyK(LAB.MATS.find(x => x.id === mat).sig, t, B), h);
        clash = LAB.MATS.some(M => [2, 4, 6].some(tt => !(M.id === mat && tt === t) && Math.abs(PHYS.eddyDrop(m, PHYS.eddyK(M.sig, tt, B), h).T - d.T) < 0.05));
      } while (clash && ++tries < 30);
      C.puzzles.eddy = { h, m, B, mat, t, Tlog: Math.round(d.T * 100) / 100, vSeis: Math.ceil(d.v * 1.2 * 10) / 10 };
    }
    // --- Mass spectrometer ---
    if (def.puzzles.includes('massspec')) {
      C.puzzles.massspec = { iso: culprit.attrs.isotope, D: R.step(0.2, 0.4, 0.02), side: R.pick(['up', 'down']) };
    }
    // --- Magnet hunt: hidden pod + decoys ---
    const target = R.pick(LAB.PANELS), ang = R.range(0, Math.PI * 2), mm = R.range(6000, 9000);
    const nDec = R.int(def.decoys[0], def.decoys[1]);
    const decoys = R.shuffle(LAB.DECOYS).slice(0, nDec).map(d => {
      const a = R.int(0, 7) * Math.PI / 4, m = R.step(2500, 6000, 500);
      return Object.assign({}, d, { m, deg: Math.round(a * 180 / Math.PI), mx: Math.round(m * Math.cos(a)), mz: Math.round(m * Math.sin(a)) });
    });
    const pod = { x: target.x, z: target.z, mx: mm * Math.cos(ang), mz: mm * Math.sin(ang) };
    C.hunt = { target: target.id, pod, decoys, sources: [pod].concat(decoys) };

    // --- accusation "method" questions ---
    C.methods = def.methods.map(id => {
      if (id === 'motion') return { id, q: 'How was the camera-killing pulse triggered?', options: Object.keys(LAB.MOTIONS).map(k => ({ v: k, label: 'The core was ' + LAB.MOTIONS[k] })), answer: C.puzzles.faraday.motion };
      const P = C.puzzles.ampere, alt = P.wires.filter(w => w.kind === 'circuit' && w.id !== P.tap).map(w => Math.abs(w.I));
      const opts = R.shuffle([P.Ic, P.Il, R.pick(alt)]).map(v => ({ v: v.toFixed(1), label: 'Maglock neutralised by a ' + v.toFixed(1) + ' A counter-solenoid' }));
      opts.push({ v: 'cut', label: 'Main power to the maglock was cut' });
      return { id, q: 'How was the blast door bypassed?', options: opts, answer: P.Ic.toFixed(1) };
    });

    // --- instability schedule ---
    C.surges = []; if (def.events) { let t = R.range(60, 95); for (let i = 0; i < 40; i++) { C.surges.push(t); t += R.range(80, 150); } }
    return C;
  }

  window.RNG = RNG; window.PHYS = PHYS; window.LAB = LAB; window.CASES = CASES; window.generateCase = generate;
})();

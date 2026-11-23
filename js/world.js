/* Lenz's Alibi — first-person 3D lab (Three.js r128 global build).
   Procedural textures, shadowed lighting, reflection probe, dressed rooms, animated props, tutorial guide arrows. */
(function () {
  'use strict';
  const W = { paused: true, tool: 'mag', player: { x: 0, z: 4.5, yaw: 0, pitch: 0 }, keys: {}, locked: false, surge: 0, sprayLeft: 14, high: true };
  let scene, camera, renderer, envTex = null, C = null, last = 0, el, T = 0;
  let colliders = [], inter = [], carts = [], filings = [], conduit = null, anim = [], hand = {}, parent = null, shadows = true;
  const M = {}, TX = {};

  // ------------------------------------------------------------------ textures
  function tex(draw, w, h, rx, ry, color) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h || w; draw(cv.getContext('2d'), cv.width, cv.height);
    const t = new THREE.CanvasTexture(cv); if (color !== false) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8; if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); }
    return t;
  }
  const speck = (g, w, h, n, col, s) => { g.fillStyle = col; for (let i = 0; i < n; i++) g.fillRect(Math.random() * w, Math.random() * h, Math.random() * s + 0.5, Math.random() * s + 0.5); };
  function textures() {
    const floor = bump => (g, s) => {
      g.fillStyle = bump ? '#fff' : '#27323a'; g.fillRect(0, 0, s, s);
      if (!bump) { speck(g, s, s, 2600, 'rgba(255,255,255,.035)', 2); speck(g, s, s, 2200, 'rgba(0,0,0,.12)', 2.5);
        g.strokeStyle = 'rgba(0,0,0,.14)'; g.lineWidth = 1; for (let i = 0; i < 26; i++) { const x = Math.random() * s, y = Math.random() * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.random() * 90 - 45, y + Math.random() * 30 - 15); g.stroke(); } }
      g.strokeStyle = bump ? '#000' : '#141b20'; g.lineWidth = 5; for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * s / 2, 0); g.lineTo(i * s / 2, s); g.stroke(); g.beginPath(); g.moveTo(0, i * s / 2); g.lineTo(s, i * s / 2); g.stroke(); }
      if (!bump) { g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1; g.strokeRect(4, 4, s / 2 - 8, s / 2 - 8); g.strokeRect(s / 2 + 4, s / 2 + 4, s / 2 - 8, s / 2 - 8); }
    };
    TX.floor = tex(floor(false), 512, 512, 20, 12); TX.floorB = tex(floor(true), 512, 512, 20, 12, false);
    const wall = bump => (g, w, h) => { // one tile = 2 m wide x 4 m tall
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3c4a53'); gr.addColorStop(0.7, '#35424a'); gr.addColorStop(1, '#232c32');
      g.fillStyle = bump ? '#fff' : gr; g.fillRect(0, 0, w, h);
      if (!bump) { speck(g, w, h, 1500, 'rgba(0,0,0,.08)', 3); speck(g, w, h, 900, 'rgba(255,255,255,.03)', 2);
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 9; i++) { const x = Math.random() * w; g.fillRect(x, h * 0.72, 2 + Math.random() * 3, h * 0.28 * Math.random()); }
        g.fillStyle = '#c98a2b'; g.fillRect(0, h - 150, w, 9); g.fillStyle = '#1a2227'; g.fillRect(0, h - 141, w, 3); }
      g.strokeStyle = bump ? '#000' : '#1b2328'; g.lineWidth = 4; [0, w / 2, w].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); });
      [h * 0.3, h - 34].forEach(y => { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
      g.fillStyle = bump ? '#444' : '#55636c'; for (let x = 12; x < w; x += w / 2) for (const y of [14, h * 0.3 - 12, h * 0.3 + 12, h - 48]) { g.beginPath(); g.arc(x, y, 3, 0, 6.283); g.arc(x + w / 2 - 24, y, 3, 0, 6.283); g.fill(); }
    };
    TX.wall = tex(wall(false), 256, 512, 1, 1); TX.wallB = tex(wall(true), 256, 512, 1, 1, false);
    TX.ceil = tex((g, s) => { g.fillStyle = '#12181c'; g.fillRect(0, 0, s, s); speck(g, s, s, 500, 'rgba(255,255,255,.03)', 2); g.strokeStyle = '#080c0e'; g.lineWidth = 6; g.strokeRect(0, 0, s, s); g.fillStyle = '#0a0f12'; for (let i = 0; i < 6; i++) g.fillRect(40, 40 + i * 14, 60, 6); }, 256, 256, 20, 12);
    TX.hazard = tex((g, s) => { g.fillStyle = '#1c2327'; g.fillRect(0, 0, s, s); g.fillStyle = '#e3a51c'; for (let i = -s; i < s * 2; i += 64) { g.beginPath(); g.moveTo(i, s); g.lineTo(i + 32, s); g.lineTo(i + 32 + s, 0); g.lineTo(i + s, 0); g.fill(); }
      g.fillStyle = '#2a343b'; g.fillRect(0, s * 0.16, s, s * 0.68); speck(g, s, s, 700, 'rgba(0,0,0,.15)', 3); g.strokeStyle = '#11161a'; g.lineWidth = 4; g.strokeRect(s * 0.06, s * 0.2, s * 0.88, s * 0.6); g.beginPath(); g.moveTo(s / 2, s * 0.2); g.lineTo(s / 2, s * 0.8); g.stroke(); }, 256);
    TX.stripe = tex((g, s) => { g.fillStyle = '#e3a51c'; g.fillRect(0, 0, s, s); g.fillStyle = '#15191c'; for (let i = -s; i < s * 2; i += 32) { g.beginPath(); g.moveTo(i, s); g.lineTo(i + 16, s); g.lineTo(i + 16 + s, 0); g.lineTo(i + s, 0); g.fill(); } }, 64, 64, 8, 1);
    TX.grate = tex((g, s) => { g.fillStyle = '#1a2126'; g.fillRect(0, 0, s, s); g.fillStyle = '#07090b'; for (let x = 4; x < s; x += 16) for (let y = 4; y < s; y += 16) g.fillRect(x, y, 9, 9); }, 64, 64, 6, 6);
    TX.led = tex((g, s) => { g.fillStyle = '#000'; g.fillRect(0, 0, s, s); for (let f = 0; f < 2; f++) for (let y = 6; y < s; y += 9) for (let x = 6; x < s / 2 - 4; x += 8) if (Math.random() < 0.45) { g.fillStyle = Math.random() < 0.75 ? '#35ff8a' : Math.random() < 0.6 ? '#ffb347' : '#ff4a3a'; g.fillRect(f * s / 2 + x, y, 3, 3); } }, 128, 128, 0.5, 1);
    TX.tape = tex((g, w, h) => { g.fillStyle = '#f2c81e'; g.fillRect(0, 0, w, h); g.fillStyle = '#111'; g.font = 'bold 22px Arial, sans-serif'; g.textBaseline = 'middle'; for (let x = 6; x < w; x += 256) g.fillText('CRIME SCENE — DO NOT CROSS', x, h / 2 + 1, 244); }, 512, 32, 2, 1);
    TX.cork = tex((g, w, h) => { g.fillStyle = '#8a6a44'; g.fillRect(0, 0, w, h); speck(g, w, h, 5000, 'rgba(40,25,10,.25)', 3); speck(g, w, h, 2500, 'rgba(255,220,170,.12)', 2);
      const pins = []; for (let i = 0; i < 9; i++) { const x = 30 + (i % 5) * 96 + Math.random() * 20, y = 24 + Math.floor(i / 5) * 120 + Math.random() * 24, pw = 60 + Math.random() * 20; g.save(); g.translate(x + pw / 2, y + 40); g.rotate((Math.random() - 0.5) * 0.25);
        g.fillStyle = i % 3 === 1 ? '#f1e38a' : '#ece6d8'; g.fillRect(-pw / 2, -40, pw, 80); if (i % 3 !== 1) { g.fillStyle = '#2b3338'; g.fillRect(-pw / 2 + 5, -35, pw - 10, 48); g.fillStyle = '#6d7c85'; g.beginPath(); g.arc(0, -16, 10, 0, 6.283); g.fill(); g.fillRect(-13, -4, 26, 16); }
        g.fillStyle = '#333'; for (let l = 0; l < 3; l++) g.fillRect(-pw / 2 + 6, (i % 3 === 1 ? -28 : 18) + l * 7, pw - 14 - l * 8, 2); g.restore(); pins.push([x + pw / 2, y + 4]); }
      g.strokeStyle = '#c0261c'; g.lineWidth = 2; g.beginPath(); pins.forEach((p, i) => { i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }); g.lineTo(pins[2][0], pins[2][1]); g.stroke();
      pins.forEach(p => { g.fillStyle = '#e03a2e'; g.beginPath(); g.arc(p[0], p[1], 4, 0, 6.283); g.fill(); });
      g.fillStyle = '#c0261c'; g.font = 'bold 30px "Special Elite", "Courier New", monospace'; g.fillText('WHERE IS THORNE?', 110, 268); }, 512, 288);
    TX.white = tex((g, w, h) => { g.fillStyle = '#e9eef0'; g.fillRect(0, 0, w, h); speck(g, w, h, 300, 'rgba(0,0,0,.04)', 6); g.font = '30px "Segoe Print", "Comic Sans MS", cursive'; g.fillStyle = '#1c3f9a';
      g.fillText('ε = −N dΦ/dt', 26, 50); g.fillText('∮ B·dℓ = μ₀ I', 26, 104); g.fillText('B = μ₀ n I', 300, 50); g.fillStyle = '#b02a20'; g.fillText('r = mv / qB', 300, 104); g.fillText('F = k v  →  v_t = mg/k', 26, 164);
      g.strokeStyle = '#1c3f9a'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(100 + i * 12, 208, 8, 26, 0, 0, 6.283); g.stroke(); } g.fillStyle = '#b02a20'; g.fillRect(20, 200, 56, 16); g.font = '18px "Segoe Print", cursive'; g.fillText('A.T. — DO NOT ERASE', 290, 240); }, 512, 256);
    TX.soft = tex((g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, s, s); }, 64);
    // live instrument screen, redrawn ~10 Hz
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; TX.scrG = cv.getContext('2d'); TX.screen = new THREE.CanvasTexture(cv); TX.screen.encoding = THREE.sRGBEncoding;
  }
  function drawScreen(t) {
    const g = TX.scrG; g.fillStyle = '#031014'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#0d2a30'; g.lineWidth = 1;
    for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 76); g.stroke(); } for (let y = 0; y < 76; y += 19) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
    g.strokeStyle = '#4dffd8'; g.lineWidth = 2; g.beginPath(); for (let x = 0; x <= 256; x += 4) { const y = 38 + Math.sin(x * 0.06 + t * 3) * 20 * Math.sin(x * 0.012 + t * 0.7); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.strokeStyle = '#ffb347'; g.beginPath(); for (let x = 0; x <= 256; x += 4) { const y = 38 + Math.cos(x * 0.03 - t * 2) * 9; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for (let i = 0; i < 9; i++) { const h = 10 + 16 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3)); g.fillStyle = i === 6 ? '#ff5a4d' : '#2fb6a2'; g.fillRect(8 + i * 16, 122 - h, 11, h); }
    g.fillStyle = '#9fe8dc'; g.font = '10px monospace'; g.fillText('B ' + (4.2 + 0.3 * Math.sin(t)).toFixed(2) + ' T', 164, 96); g.fillStyle = '#ff5a4d'; if (Math.sin(t * 5) > 0) g.fillText('FAULT 23:14', 164, 112);
    TX.screen.needsUpdate = true;
  }

  // ------------------------------------------------------------------ materials
  function mats() {
    const std = o => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.7 }, o));
    M.floor = std({ map: TX.floor, bumpMap: TX.floorB, bumpScale: 0.015, roughness: 0.42, metalness: 0.25, envMapIntensity: 0.55 });
    M.ceil = std({ map: TX.ceil, roughness: 0.95, metalness: 0 });
    M.wall = std({ map: TX.wall, bumpMap: TX.wallB, bumpScale: 0.02, roughness: 0.78, metalness: 0.15, envMapIntensity: 0.35 });
    M.trim = std({ color: 0x151c21, roughness: 0.5, metalness: 0.6 });
    M.steel = std({ color: 0x9aa7af, roughness: 0.22, metalness: 0.95, envMapIntensity: 1.1 });
    M.dark = std({ color: 0x1d262c, roughness: 0.45, metalness: 0.65 });
    M.black = std({ color: 0x0a0d0f, roughness: 0.6, metalness: 0.3 });
    M.copper = std({ color: 0xd9793a, roughness: 0.25, metalness: 1, envMapIntensity: 1.2 });
    M.panel = std({ color: 0x55697a, roughness: 0.5, metalness: 0.55 });
    M.white = std({ color: 0xdfe6ea, roughness: 0.3, metalness: 0.35 });
    M.blue = std({ color: 0x235a9c, roughness: 0.4, metalness: 0.4 });
    M.orange = std({ color: 0xc8641e, roughness: 0.45, metalness: 0.35 });
    M.red = std({ color: 0xb3261c, roughness: 0.45, metalness: 0.3 });
    M.green = std({ color: 0x2c6b46, roughness: 0.5, metalness: 0.3 });
    M.yellow = std({ color: 0xe6b81c, roughness: 0.55, metalness: 0.1 });
    M.paper = std({ color: 0xe8e2d2, roughness: 0.9, metalness: 0 });
    M.rubber = std({ color: 0x101214, roughness: 0.9, metalness: 0 });
    M.frost = std({ color: 0xeaf6ff, roughness: 0.95, metalness: 0, transparent: true, opacity: 0.75 });
    M.hazard = std({ map: TX.hazard, roughness: 0.5, metalness: 0.55 });
    M.stripe = std({ map: TX.stripe, roughness: 0.7, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2 });
    M.grate = std({ map: TX.grate, roughness: 0.5, metalness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
    M.tape = std({ map: TX.tape, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x3a3000 });
    M.cork = std({ map: TX.cork, roughness: 0.95 }); M.wboard = std({ map: TX.white, roughness: 0.25, metalness: 0.1 });
    M.glass = std({ color: 0xa8e0ee, transparent: true, opacity: 0.16, roughness: 0.03, metalness: 0.9, envMapIntensity: 1.6, depthWrite: false });
    M.screen = std({ color: 0x020405, emissive: 0xffffff, emissiveMap: TX.screen, emissiveIntensity: 1.1, roughness: 0.25 });
    M.led = std({ color: 0x030405, emissive: 0xffffff, emissiveMap: TX.led, emissiveIntensity: 1.6, roughness: 0.4 });
    M.glow = (hex, k) => std({ color: 0x05080a, emissive: hex, emissiveIntensity: k == null ? 1 : k, roughness: 0.4 });
    M.add = (hex, o) => new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  }
  function makeEnv() { // small emissive "light box" baked into a reflection probe for the metals
    const s = new THREE.Scene(), p = (c, x, y, z, w, h, d, back) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color: c, side: back ? THREE.BackSide : THREE.FrontSide })); m.position.set(x, y, z); s.add(m); };
    p(0x10171c, 0, 0, 0, 20, 8, 20, true); p(0xffffff, 0, 3.9, 0, 7, 0.1, 2); p(0xfff0d0, -6, 3.9, 5, 3, 0.1, 1); p(0xfff0d0, 6, 3.9, -5, 3, 0.1, 1);
    p(0x55d8ff, 9.9, 0.5, 0, 0.1, 2, 6); p(0xff9a40, -9.9, 0.5, 0, 0.1, 2, 5); p(0x3a4750, 0, -3.9, 0, 20, 0.1, 20);
    const pm = new THREE.PMREMGenerator(renderer), t = pm.fromScene(s, 0.04).texture; pm.dispose(); return t;
  }

  // ------------------------------------------------------------------ builders
  function add(geo, mat, x, y, z) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = shadows && !mat.transparent; (parent || scene).add(m); return m; }
  function solid(x, z, w, d) { colliders.push({ a: x - w / 2, b: x + w / 2, c: z - d / 2, d: z + d / 2 }); }
  function box(w, h, d, mat, x, y, z, col) { if (col) solid(x, z, w, d); return add(new THREE.BoxGeometry(w, h, d), mat, x, y, z); }
  function cyl(r, h, mat, x, y, z, col, seg) { if (col) solid(x, z, r * 2, r * 2); return add(new THREE.CylinderGeometry(r, r, h, seg || 24), mat, x, y, z); }
  function pipe(r, len, mat, x, y, z, axis) { const m = cyl(r, len, mat, x, y, z, false, 12); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; return m; }
  function plane(w, h, mat, x, y, z, ry, rx) { const m = add(new THREE.PlaneGeometry(w, h), mat, x, y, z); m.castShadow = false; if (ry) m.rotation.y = ry; if (rx) m.rotation.x = rx; return m; }
  function decal(w, d, mat, x, z, rot) { const m = plane(w, d, mat, x, 0.012, z); m.rotation.x = -Math.PI / 2; m.rotation.z = rot || 0; return m; }
  function group(x, y, z, fn) { const g = new THREE.Group(); g.position.set(x, y, z); (parent || scene).add(g); const p = parent; parent = g; fn(); parent = p; return g; }
  function wallBox(w, h, d, x, y, z) { const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, L = Math.max(w, d) / 2; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L, 1 - (1 - uv.getY(i)) * h / 4 - (4 - y - h / 2) / 4); return add(g, M.wall, x, y, z); }
  function wall(x1, z1, x2, z2) { const w = Math.abs(x2 - x1) + 0.3, d = Math.abs(z2 - z1) + 0.3, x = (x1 + x2) / 2, z = (z1 + z2) / 2; wallBox(w, 4, d, x, 2, z); solid(x, z, w, d); box(w + 0.06, 0.22, d + 0.06, M.trim, x, 0.11, z); box(w + 0.04, 0.12, d + 0.04, M.trim, x, 3.94, z); }
  function windowWall(x1, x2, z) { const w = x2 - x1, x = (x1 + x2) / 2; wallBox(w, 1.15, 0.3, x, 0.575, z); wallBox(w, 1.35, 0.3, x, 3.325, z); solid(x, z, w, 0.3); box(w, 0.22, 0.36, M.trim, x, 0.11, z);
    box(w, 0.08, 0.36, M.trim, x, 1.19, z); box(w, 0.08, 0.36, M.trim, x, 2.61, z); box(0.08, 1.4, 0.36, M.trim, x, 1.9, z); plane(w, 1.4, M.glass, x, 1.9, z + 0.05); plane(w, 1.4, M.glass, x, 1.9, z - 0.05, Math.PI); }
  function label(text, color, x, y, z, s) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const g = cv.getContext('2d');
    g.font = '600 44px "IBM Plex Mono", Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(5,9,12,.72)'; const w = Math.min(500, g.measureText(text).width + 40); g.fillRect(256 - w / 2, 12, w, 72); g.fillStyle = color; g.fillRect(256 - w / 2, 12, 5, 72); g.fillText(text, 256, 50, 480);
    const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false })); sp.scale.set(2.1 * (s || 1), 0.4 * (s || 1), 1); sp.position.set(x, y, z); scene.add(sp); return sp;
  }
  function floorText(text, x, z, rot, col) { const t = tex((g, w, h) => { g.clearRect(0, 0, w, h); g.font = 'bold 54px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col || 'rgba(230,184,28,.8)'; g.fillText(text, w / 2, h / 2, w - 20); }, 512, 96);
    decal(3, 0.56, new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -3 }), x, z, rot); }
  function pt(x, y, z, hex, k, dist) { const l = new THREE.PointLight(hex, k, dist || 12, 1.8); l.position.set(x, y, z); scene.add(l); return l; }
  function fixture(x, z, hex, k, spot, long) { // ceiling troffer; `spot` ones cast shadows
    box(long ? 0.5 : 2, 0.07, long ? 2 : 0.5, M.dark, x, 3.9, z); const tube = box(long ? 0.36 : 1.8, 0.03, long ? 1.8 : 0.36, M.glow(hex, 2.2), x, 3.855, z); tube.castShadow = false;
    if (!spot) return pt(x, 3.5, z, hex, k, 13);
    const l = new THREE.SpotLight(hex, k, 20, 1.2, 0.55, 1.4); l.position.set(x, 3.8, z); l.target.position.set(x, 0, z); scene.add(l); scene.add(l.target);
    if (shadows) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0006; l.shadow.radius = 3; l.shadow.camera.near = 0.4; l.shadow.camera.far = 14; }
    return l;
  }
  function station(id, name, x, z, lx, ly, lz) {
    const active = id === 'board' || id === 'survey' || C.def.puzzles.includes(id);
    inter.push({ id, name, x, z, active }); label(active ? name : name + ' · offline', active ? '#ffcf7a' : '#5c6a72', lx, ly, lz, 0.9); return active;
  }
  function marker(n, x, z) { const m = add(new THREE.ConeGeometry(0.11, 0.2, 4), M.yellow, x, 0.1, z); m.rotation.y = Math.PI / 4; const t = tex((g, s) => { g.fillStyle = '#e6b81c'; g.fillRect(0, 0, s, s); g.fillStyle = '#111'; g.font = 'bold 46px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(n, s / 2, s / 2 + 3); }, 64);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t })); sp.scale.set(0.13, 0.13, 1); sp.position.set(x, 0.3, z); scene.add(sp); }
  function chair(x, z, ry, fallen) { const g = group(x, 0, z, () => { cyl(0.26, 0.04, M.black, 0, 0.03, 0, false, 5); cyl(0.03, 0.42, M.steel, 0, 0.25, 0, false, 8); box(0.46, 0.07, 0.46, M.rubber, 0, 0.48, 0); box(0.44, 0.5, 0.06, M.rubber, 0, 0.8, 0.22); }); g.rotation.y = ry; if (fallen) { g.rotation.z = Math.PI / 2; g.position.y = 0.26; } }
  function monitor(x, y, z, ry, w) { w = w || 0.62; const g = group(x, y, z, () => { box(w, w * 0.6, 0.04, M.black, 0, w * 0.36, 0); plane(w - 0.05, w * 0.6 - 0.05, M.screen, 0, w * 0.36, 0.022); box(0.06, 0.12, 0.05, M.black, 0, 0.04, -0.03); box(0.24, 0.02, 0.16, M.black, 0, 0, -0.03); }); g.rotation.y = ry; }
  function desk(x, z, w, d, col) { box(w, 0.05, d, M.dark, x, 0.78, z, col); for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.06, 0.76, 0.06, M.steel, x + sx * (w / 2 - 0.08), 0.38, z + sz * (d / 2 - 0.08)); }
  function tank(x, z) { cyl(0.7, 2.2, M.white, x, 1.5, z, true, 32); add(new THREE.SphereGeometry(0.7, 32, 12, 0, 6.283, 0, Math.PI / 2), M.white, x, 2.6, z); cyl(0.72, 0.2, M.blue, x, 2.05, z, false, 32); cyl(0.715, 0.55, M.frost, x, 0.75, z, false, 32);
    for (let i = 0; i < 3; i++) cyl(0.06, 0.42, M.steel, x + Math.cos(i * 2.094) * 0.5, 0.21, z + Math.sin(i * 2.094) * 0.5, false, 8); cyl(0.05, 0.75, M.steel, x, 3.6, z, false, 8); cyl(0.12, 0.08, M.steel, x, 3.26, z, false, 12);
    const gz = cyl(0.1, 0.04, M.glow(0x6fd3ff, 1.4), x - 0.71, 1.55, z, false, 16); gz.rotation.z = Math.PI / 2; }
  function rack(x, z, on) { box(0.9, 2.2, 1.4, M.black, x, 1.1, z, true); box(0.94, 0.06, 1.44, M.trim, x, 2.23, z); plane(0.74, 1.9, M.led, x, 1.15, z + 0.705); plane(0.74, 1.9, M.led, x, 1.15, z - 0.705, Math.PI);
    box(0.92, 0.07, 1.42, M.glow(on ? 0xff8a3a : 0x1c2a30, on ? 1.8 : 0.5), x, 2.05, z).castShadow = false; }

  // ------------------------------------------------------------------ scene
  function build() {
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x06090b); scene.fog = new THREE.FogExp2(0x070b0e, 0.026); scene.environment = envTex;
    colliders = []; inter = []; carts = []; filings = []; anim = []; W.sprayLeft = 14; shadows = W.high;
    scene.add(new THREE.AmbientLight(0x8fa6b8, 0.2)); scene.add(new THREE.HemisphereLight(0xa8c4d6, 0x191410, 0.14));

    // ---- shell
    const fl = add(new THREE.PlaneGeometry(40, 24), M.floor, 0, 0, -3); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
    const ce = add(new THREE.PlaneGeometry(40, 24), M.ceil, 0, 4, -3); ce.rotation.x = Math.PI / 2; ce.castShadow = false;
    wall(-10, 7, 10, 7); wall(-10, -7, -4.9, -7); windowWall(-4.75, -1.45, -7); wall(-1.3, -7, -1, -7); wall(1, -7, 1.3, -7); windowWall(1.45, 4.75, -7); wall(4.9, -7, 10, -7);
    wall(10, -7, 10, -1); wall(10, 1, 10, 7); wall(-10, -7, -10, -1); wall(-10, 1, -10, 7);
    wall(-6, -13, -6, -7.3); wall(6, -13, 6, -7.3); wall(-6, -13, 6, -13);
    wall(10.3, -5, 18, -5); wall(10.3, 5, 18, 5); wall(18, -5, 18, 5); wall(-18, -5, -10.3, -5); wall(-18, 5, -10.3, 5); wall(-18, -5, -18, 5);
    [[0, -7, 1, 'OBSERVATION', 0], [10, 0, 0, 'CRYO-STORAGE', -Math.PI / 2], [-10, 0, 0, 'CONTROL', Math.PI / 2]].forEach(d => { // doorways
      const h = d[2]; wallBox(h ? 2 : 0.3, 1.4, h ? 0.3 : 2, d[0], 3.3, d[1]);
      for (const s of [-1, 1]) box(h ? 0.14 : 0.44, 2.6, h ? 0.44 : 0.14, M.trim, d[0] + (h ? s * 0.93 : 0), 1.3, d[1] + (h ? 0 : s * 0.93));
      box(h ? 2 : 0.46, 0.12, h ? 0.46 : 2, M.trim, d[0], 2.62, d[1]); box(h ? 1.7 : 0.48, 0.05, h ? 0.48 : 1.7, M.glow(0x35d0c0, 1.6), d[0], 2.54, d[1]).castShadow = false;
      decal(h ? 1.7 : 0.5, h ? 0.5 : 1.7, M.grate, d[0], d[1]); floorText(d[3], d[0] + (h ? 0 : -Math.sign(d[0]) * 1.5), d[1] + (h ? 1.5 : 0), d[4]);
    });
    for (const x of [-8, 0, 8]) box(0.3, 0.28, 13.7, M.black, x, 3.8, 0); // bay roof beams
    for (const [y, z, m, r] of [[3.55, 6.7, M.copper, 0.07], [3.35, 6.72, M.steel, 0.05], [3.55, -6.7, M.red, 0.06], [3.35, -6.72, M.steel, 0.05]]) pipe(r, 19.6, m, 0, y, z, 'x'); // overhead services
    for (const x of [-9.72, 9.72]) { pipe(0.06, 13.4, M.steel, x, 3.5, 0, 'z'); pipe(0.045, 13.4, M.yellow, x, 3.32, 0, 'z'); }
    for (const [x, z] of [[-9.6, 6.6], [9.6, 6.6], [-9.6, -6.6], [9.6, -6.6]]) pipe(0.07, 3.6, M.steel, x, 1.8, z);
    for (const [x, y, z, ry] of [[-3, 3.2, 6.82, Math.PI], [5.5, 3.2, 6.82, Math.PI], [17.82, 3.2, 2.5, -Math.PI / 2], [-17.82, 3.2, -1, Math.PI / 2], [3, 3.2, -12.82, 0]]) plane(0.9, 0.45, M.grate, x, y, z, ry); // wall vents

    // ---- lights
    fixture(-4.5, 0.5, 0xfff1dc, 1.25, true); fixture(4.6, 3.6, 0xe6f4ff, 1.1, true); fixture(-4.5, -4.6, 0xfff1dc, 0.5); fixture(4.5, -5.2, 0xe6f4ff, 0.45); fixture(-4.5, 5, 0xfff1dc, 0.4);
    const cf = fixture(14, 0.4, 0xb6ecff, 1.3, true, true); anim.push(t => { cf.intensity = 1.3 * (Math.sin(t * 31) * Math.sin(t * 7.3) > 0.82 ? 0.35 : 1); });
    fixture(-14, 0, 0xffd9ae, 0.75, false, true); fixture(0, -10, 0xffe6c4, 0.8);
    pt(-15.8, 1.6, -2.2, 0x35d0c0, 0.5, 7);

    bay(); cryo(); control(); obs(); decoysAndPanels(); atmosphere(); buildHand(); guideBuild();
    conduit = C.puzzles.ampere ? LAB.CIRCUITS.find(c => c.id === C.puzzles.ampere.tap).path : null;
  }

  function bay() {
    // accelerator ring
    const cx = 4, cz = -1, ring = add(new THREE.TorusGeometry(2.3, 0.3, 18, 72), M.steel, cx, 1.15, cz); ring.rotation.x = Math.PI / 2;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8, x = cx + Math.cos(a) * 2.3, z = cz + Math.sin(a) * 2.3;
      const g = group(x, 0, z, () => { box(0.5, 0.75, 0.5, M.dark, 0, 0.375, 0); box(0.95, 0.95, 0.6, i % 2 ? M.blue : M.orange, 0, 1.15, 0); for (const s of [-1, 1]) { const c = add(new THREE.TorusGeometry(0.4, 0.09, 10, 24), M.copper, 0, 1.15, s * 0.36); c.castShadow = false; } box(0.2, 0.05, 0.2, M.glow(0x40ff90, 1.6), 0, 1.65, 0).castShadow = false; }); g.rotation.y = -a + Math.PI / 2; }
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, f = add(new THREE.TorusGeometry(0.36, 0.05, 8, 20), M.dark, cx + Math.cos(a) * 2.3, 1.15, cz + Math.sin(a) * 2.3); f.rotation.y = -a + Math.PI / 2; }
    cyl(0.62, 0.5, M.dark, cx, 0.25, cz, false, 32); cyl(0.42, 1.5, M.steel, cx, 1.1, cz, false, 32); for (const y of [0.7, 1.15, 1.6]) cyl(0.44, 0.06, M.glow(0x5fe0d0, 2), cx, y, cz, false, 32).castShadow = false;
    const core = add(new THREE.SphereGeometry(0.24, 20, 14), M.glow(0x8ffff0, 2.6), cx, 2.05, cz); core.castShadow = false;
    const beam = cyl(0.07, 1.85, M.add(0x5fe0d0, 0.35), cx, 3.05, cz, false, 12); cyl(0.2, 1.85, M.add(0x5fe0d0, 0.03), cx, 3.05, cz, false, 12);
    const cl = pt(cx, 2.2, cz, 0x5fe0d0, 0.9, 8); anim.push(t => { const k = 0.8 + 0.2 * Math.sin(t * 4) + (W.surge > 0 ? Math.random() : 0); cl.intensity = 0.9 * k; core.scale.setScalar(0.9 + 0.12 * k); beam.material.opacity = 0.3 * k; });
    solid(cx, cz, 5.6, 5.6);
    for (const [w, d, x, z] of [[6.4, 0.22, cx, cz - 3.1], [6.4, 0.22, cx, cz + 3.1], [0.22, 6.4, cx - 3.1, cz], [0.22, 6.4, cx + 3.1, cz]]) { const m = decal(Math.max(w, d), 0.22, M.stripe, x, z); if (d > w) m.rotation.z = Math.PI / 2; }
    pipe(0.16, 3.2, M.steel, cx, 1.15, -5.4, 'z'); for (const z of [-4.2, -5.4, -6.6]) add(new THREE.TorusGeometry(0.2, 0.04, 8, 20), M.dark, cx, 1.15, z); box(0.3, 1, 0.3, M.dark, cx, 0.5, -5.4); solid(cx, -5.4, 0.6, 3.2);

    // blast door (south)
    box(3.9, 3.6, 0.2, M.trim, 0, 1.8, 6.84); box(3.4, 3.3, 0.3, M.hazard, 0, 1.65, 6.74); add(new THREE.TorusGeometry(0.38, 0.05, 10, 28), M.steel, 0, 1.5, 6.55); for (let i = 0; i < 3; i++) { const s = box(0.72, 0.04, 0.04, M.steel, 0, 1.5, 6.55); s.rotation.z = i * 1.047; } cyl(0.08, 0.12, M.steel, 0, 1.5, 6.56, false, 12).rotation.x = Math.PI / 2;
    for (const x of [-1.2, 1.2]) { box(0.7, 0.34, 0.4, M.dark, x, 3.42, 6.6); box(0.5, 0.06, 0.3, M.glow(0xff4030, 2), x, 3.22, 6.6).castShadow = false; }
    const bc = cyl(0.12, 0.16, M.glow(0xff3020, 3), 0, 3.72, 6.5, false, 12), bl = pt(0, 3.3, 6, 0xff3020, 0.8, 8); bc.castShadow = false; anim.push(t => { const k = 0.5 + 0.5 * Math.sin(t * 3.2); bl.intensity = 0.25 + 0.9 * k * k; bc.material.emissiveIntensity = 1 + 3 * k * k; });
    for (const r of [0.2, -0.24]) { const tp = plane(4.1, 0.12, M.tape, 0, 1.45, 6.5, Math.PI); tp.rotation.z = r; } decal(3.6, 1.3, M.stripe, 0, 5.75); floorText('KEEP CLEAR', 0, 5.75, 0, 'rgba(20,24,28,.95)');
    label('BLAST DOOR · MAGLOCK ENGAGED', '#ff8f80', 0, 3.05, 6.2, 1.05);
    // maglock conduit panel
    const am = station('ampere', 'Maglock Conduit Panel', 3, 6.1, 3, 2.4, 6.4);
    box(1, 1.4, 0.16, M.dark, 3, 1.4, 6.77); plane(0.72, 0.46, am ? M.screen : M.glow(0x1a1408, 1), 3, 1.75, 6.685, Math.PI); for (let i = 0; i < 5; i++) pipe(0.04, 0.9, i === 0 ? M.red : M.copper, 2.72 + i * 0.14, 1.05, 6.66).castShadow = false;
    const cov = box(0.9, 0.6, 0.03, M.panel, 3.75, 0.32, 6.5); cov.rotation.x = -0.35; plane(0.5, 0.7, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45 }), 2.2, 1.6, 6.84, Math.PI); pipe(0.07, 1.6, M.copper, 2.2, 2.6, 6.72);

    // victim's desk (north-west) — the crime scene
    desk(-5, -4.8, 2.3, 1.1, true); const fa = station('faraday', 'Ghost-Pulse Oscilloscope', -5, -4.2, -5, 1.95, -4.8);
    box(0.72, 0.5, 0.46, M.steel, -5.55, 1.06, -4.95); plane(0.44, 0.32, fa ? M.screen : M.glow(0x0c1a14, 1), -5.65, 1.08, -4.715); for (let i = 0; i < 4; i++) cyl(0.025, 0.03, M.black, -5.32, 0.94 + i * 0.08, -4.71, false, 10).rotation.x = Math.PI / 2;
    box(0.3, 0.04, 0.3, M.black, -4.45, 0.825, -4.7); for (let i = -3; i <= 3; i++) { const c = add(new THREE.TorusGeometry(0.16, 0.022, 8, 28), M.copper, -4.45 + i * 0.035, 1.02, -4.7); c.rotation.y = Math.PI / 2; }
    box(0.2, 0.08, 0.08, M.red, -4.0, 0.85, -4.55).rotation.y = 0.4; box(0.34, 0.01, 0.46, M.paper, -5.0, 0.811, -4.45).rotation.y = 0.2; box(0.34, 0.01, 0.46, M.paper, -4.75, 0.815, -4.5).rotation.y = -0.3; cyl(0.05, 0.11, M.white, -5.9, 0.86, -4.45, false, 14);
    cyl(0.1, 0.03, M.black, -4.05, 0.82, -5.15, false, 16); pipe(0.015, 0.5, M.steel, -4.05, 1.05, -5.1).rotation.x = 0.3; add(new THREE.ConeGeometry(0.13, 0.18, 16, 1, true), M.black, -4.05, 1.3, -4.98); plane(0.2, 0.2, M.glow(0xffd9a0, 3), -4.05, 1.23, -4.98, 0, Math.PI / 2); pt(-4.2, 1.2, -4.7, 0xffc880, 0.55, 3.5);
    chair(-3.7, -3.5, 0.9, true); box(0.3, 0.01, 0.42, M.paper, -4.3, 0.006, -3.2).rotation.y = 1.1; box(0.3, 0.01, 0.42, M.paper, -3.2, 0.006, -4.1).rotation.y = 0.3;
    marker('1', -4.5, -3.9); marker('2', -3.3, -3.1); marker('3', 1.4, 5.6); marker('4', 3.9, 5.5);
    plane(2.6, 1.3, M.wboard, -9.8, 1.9, -4.2, Math.PI / 2); box(0.06, 1.4, 2.7, M.steel, -9.84, 1.9, -4.2); box(0.1, 0.04, 2.6, M.steel, -9.76, 1.22, -4.2);

    // dressing
    for (let i = 0; i < 4; i++) { box(0.6, 2, 0.62, i % 2 ? M.dark : M.panel, -9.5, 1, 4.1 + i * 0.66); box(0.02, 0.5, 0.06, M.steel, -9.19, 1.2, 4.3 + i * 0.66); } solid(-9.5, 5.1, 0.6, 2.7);
    box(1, 0.9, 1, M.green, 9.1, 0.45, 3.4, true); box(0.8, 0.7, 0.8, M.panel, 9.15, 1.25, 3.35).rotation.y = 0.3; box(0.9, 0.6, 0.7, M.orange, 9.1, 0.3, 2.3, true);
    for (const [x, z, r] of [[-2, 3, 0.2], [-6, 1.2, -0.5]]) { const g = group(x, 0, z, () => { box(0.95, 0.04, 0.6, M.steel, 0, 0.82, 0); box(0.95, 0.04, 0.6, M.steel, 0, 0.3, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(0.04, 0.8, 0.04, M.steel, sx * 0.44, 0.44, sz * 0.27); cyl(0.05, 0.04, M.rubber, sx * 0.44, 0.05, sz * 0.27, false, 10).rotation.x = Math.PI / 2; } box(0.3, 0.14, 0.22, M.red, -0.2, 0.91, 0); cyl(0.07, 0.2, M.copper, 0.25, 0.94, 0.05, false, 12); box(0.5, 0.1, 0.3, M.dark, 0, 0.37, 0); }); g.rotation.y = r; carts.push(g); }
  }

  function cryo() {
    tank(16.6, -3.9); tank(16.6, 3.9); tank(14.6, 3.9); pipe(0.05, 7.8, M.steel, 16.6, 3.92, 0, 'z'); pipe(0.05, 2, M.steel, 15.6, 3.92, 3.9, 'x');
    decal(3, 3, M.grate, 15.3, 0); cyl(0.36, 4, M.copper, 15.6, 2, 0, true, 32); for (const y of [0.25, 1.3, 2.4, 3.5]) { const f = add(new THREE.TorusGeometry(0.4, 0.06, 10, 28), M.steel, 15.6, y, 0); f.rotation.x = Math.PI / 2; }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(0.07, 4, 0.07, M.dark, 15.6 + sx * 0.6, 2, sz * 0.6); box(1.3, 0.07, 1.3, M.dark, 15.6, 2.9, 0);
    box(0.8, 1.05, 0.7, M.dark, 14.75, 0.525, 0, true);
    const ed = station('eddy', 'Cryo-Shaft Drop Rig', 14.2, 0, 14.9, 2.3, 0); plane(0.6, 0.4, ed ? M.screen : M.glow(0x0c181c, 1), 14.34, 0.8, 0, -Math.PI / 2); box(0.03, 0.48, 0.68, M.black, 14.345, 0.8, 0);
    for (let i = 0; i < 4; i++) { cyl(0.13, 1.45, [M.green, M.red, M.steel, M.blue][i], 14.4 + i * 0.32, 0.73, -4.62, false, 14); cyl(0.05, 0.14, M.steel, 14.4 + i * 0.32, 1.52, -4.62, false, 10); } box(1.5, 0.05, 0.1, M.steel, 14.88, 1.05, -4.45); solid(14.88, -4.62, 1.5, 0.4);
    for (const z of [3, -3]) { box(0.04, 0.5, 0.5, M.yellow, 10.2, 2, z); label('CRYOGEN HAZARD', '#ffd24a', 10.5, 2, z, 0.45); }
    marker('5', 14.3, 1.1);
  }

  function control() {
    box(0.9, 0.9, 4.2, M.dark, -17.25, 0.45, -2.2, true); box(0.75, 0.05, 4.2, M.steel, -17.1, 0.95, -2.2).rotation.z = -0.3; box(0.2, 1.5, 4.2, M.dark, -17.7, 1.75, -2.2);
    for (let i = 0; i < 4; i++) plane(0.92, 0.6, M.screen, -17.58, 1.95, -3.75 + i * 1.03, Math.PI / 2); for (let i = 0; i < 14; i++) box(0.05, 0.03, 0.05, M.glow([0x40ff90, 0xffb347, 0xff4030][i % 3], 2), -17.0, 1.0, -4.1 + i * 0.29).castShadow = false;
    chair(-16.1, -1.3, -1.4); chair(-16.2, -3.2, -1.8);
    cyl(1, 0.7, M.dark, -14, 0.35, 1.8, false, 40); solid(-14, 1.8, 1.6, 1.6); cyl(1.08, 0.12, M.steel, -14, 0.78, 1.8, false, 40); cyl(0.95, 0.03, M.glow(0x35d0c0, 1.5), -14, 0.86, 1.8, false, 40).castShadow = false;
    const pos = [], k = 0.045; LAB.ROOMS.forEach(r => { const p = [[r.x1, r.z1], [r.x2, r.z1], [r.x2, r.z2], [r.x1, r.z2]]; for (let i = 0; i < 4; i++) for (const y of [0, 0.12]) { const a = p[i], b = p[(i + 1) % 4]; pos.push(a[0] * k, y, (a[1] + 3) * k, b[0] * k, y, (b[1] + 3) * k); } p.forEach(a => pos.push(a[0] * k, 0, (a[1] + 3) * k, a[0] * k, 0.12, (a[1] + 3) * k)); });
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const holo = new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: 0x6ffff0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })); holo.position.set(-14, 1.15, 1.8); scene.add(holo);
    add(new THREE.CylinderGeometry(0.95, 0.5, 0.5, 32, 1, true), M.add(0x35d0c0, 0.06), -14, 1.12, 1.8); anim.push(t => { holo.rotation.y = t * 0.25; holo.position.y = 1.15 + Math.sin(t * 1.3) * 0.03; holo.material.opacity = 0.75 + 0.2 * Math.sin(t * 9); });
    station('survey', 'Field Survey Table', -14, 1.8, -14, 2.05, 1.8);
    box(1.6, 1.8, 0.14, M.panel, -13.2, 1.4, 4.78); for (let i = 0; i < 8; i++) { box(0.1, 0.22, 0.06, M.black, -13.8 + i * 0.17, 1.75, 4.69); box(0.05, 0.05, 0.03, M.glow(i === 3 ? 0xff4030 : 0x40ff90, 2), -13.8 + i * 0.17, 1.95, 4.69).castShadow = false; } label('BREAKER PANEL', '#ffcf7a', -13.2, 2.55, 4.5, 0.5);
    desk(-11.3, 3.6, 1.2, 1.8, true); monitor(-11.15, 0.81, 3.2, -Math.PI / 2); monitor(-11.15, 0.81, 4.0, -Math.PI / 2 + 0.25); chair(-12.1, 3.5, Math.PI / 2 + 0.3);
    pipe(0.05, 7.4, M.orange, -14, 0.4, -4.81, 'x'); pipe(0.05, 7.4, M.steel, -14, 0.55, -4.81, 'x');
  }

  function obs() {
    // mass spectrometer
    box(1.9, 0.85, 1, M.white, -3.4, 0.425, -12, true); box(1.94, 0.06, 1.04, M.steel, -3.4, 0.88, -12); pipe(0.16, 1.6, M.steel, -3.5, 1.15, -12.15, 'x'); for (const x of [-4.25, -2.75]) { const f = add(new THREE.TorusGeometry(0.19, 0.035, 8, 20), M.dark, x, 1.15, -12.15); f.rotation.y = Math.PI / 2; }
    box(0.7, 0.16, 0.7, M.blue, -3.6, 1.42, -12.15); box(0.7, 0.16, 0.7, M.blue, -3.6, 0.99, -12.15); box(0.16, 0.6, 0.7, M.blue, -3.95, 1.2, -12.15); cyl(0.26, 0.14, M.copper, -3.6, 1.3, -12.15, false, 24); cyl(0.26, 0.1, M.copper, -3.6, 1.08, -12.15, false, 24); cyl(0.14, 0.5, M.steel, -2.7, 1.2, -11.85, false, 16);
    const ms = station('massspec', 'Mass Spectrometer', -3.4, -11.3, -3.4, 2.3, -12); box(0.7, 0.46, 0.03, M.black, -2.9, 0.48, -11.49); plane(0.62, 0.38, ms ? M.screen : M.glow(0x14101c, 1), -2.9, 0.48, -11.47);
    // case board
    box(3.3, 2, 0.08, M.steel, 0.8, 1.9, -12.8); plane(3.1, 1.8, M.cork, 0.8, 1.9, -12.75); pt(0.8, 2.6, -11.9, 0xffd9a0, 0.5, 4.5); station('board', 'Case Board', 0.8, -12.2, 0.8, 3.15, -12.6);
    // viewing desks under the windows
    for (const x of [3.1, -3.1]) { desk(x, -7.75, 2.8, 0.8, true); monitor(x - 0.6, 0.81, -7.7, Math.PI + 0.15); monitor(x + 0.4, 0.81, -7.7, Math.PI - 0.15); cyl(0.05, 0.11, M.white, x + 1.1, 0.86, -7.9, false, 12); chair(x - 0.2, -8.7, Math.PI + (x > 0 ? 0.3 : -0.4)); }
    // reagent lockers — each tagged with an isotope batch
    for (let i = 0; i < 4; i++) { const z = -10.3 + i * 0.62; box(0.55, 1.9, 0.58, M.panel, 5.55, 0.95, z); box(0.02, 0.2, 0.26, M.glow([0x6fd3ff, 0xffb347, 0xc6a0ff, 0xff7a6b][i], 1.4), 5.265, 1.5, z).castShadow = false; box(0.03, 0.12, 0.03, M.steel, 5.26, 1.0, z + 0.2); } solid(5.55, -9.37, 0.55, 2.5); label('REAGENT LOCKERS', '#c6a0ff', 5.2, 2.2, -9.37, 0.5);
    marker('6', -2.2, -10.9);
  }

  function decoysAndPanels() {
    LAB.DECOYS.forEach(d => {
      const on = C.hunt.decoys.some(x => x.id === d.id), gl = (w, y, dd) => { box(w, 0.07, dd, M.glow(on ? 0xff8a3a : 0x1c2a30, on ? 1.8 : 0.5), d.x, y, d.z).castShadow = false; };
      if (d.id.indexOf('RACK') === 0) rack(d.x, d.z, on);
      else if (d.id === 'XFMR-1') { box(1.2, 1.2, 1.1, M.green, d.x, 0.65, d.z, true); box(1.3, 0.1, 1.2, M.dark, d.x, 0.05, d.z); for (let i = 0; i < 7; i++) for (const s of [-1, 1]) box(0.04, 0.9, 0.16, M.green, d.x - 0.48 + i * 0.16, 0.7, d.z + s * 0.62); for (let i = 0; i < 3; i++) { cyl(0.07, 0.45, M.paper, d.x - 0.36 + i * 0.36, 1.47, d.z, false, 12); cyl(0.11, 0.04, M.paper, d.x - 0.36 + i * 0.36, 1.5, d.z, false, 12); cyl(0.03, 0.1, M.copper, d.x - 0.36 + i * 0.36, 1.74, d.z, false, 8); } gl(1.22, 1.22, 1.12); }
      else if (d.id === 'PUMP') { box(1.3, 1, 1, M.blue, d.x, 0.6, d.z, true); box(1.4, 0.1, 1.1, M.dark, d.x, 0.05, d.z); cyl(0.36, 0.08, M.black, d.x, 0.62, d.z + 0.52, false, 24).rotation.x = Math.PI / 2; const fan = box(0.62, 0.08, 0.03, M.steel, d.x, 0.62, d.z + 0.57); anim.push(t => { fan.rotation.z = on ? t * 14 : 0.4; }); pipe(0.06, 2.9, M.steel, d.x + 0.4, 2.55, d.z); cyl(0.2, 0.5, M.steel, d.x - 0.3, 1.35, d.z, false, 16); gl(1.32, 1.12, 1.02); }
      else { box(1.3, 1.25, 0.9, M.dark, d.x, 0.625, d.z, true); plane(1.1, 0.5, M.led, d.x, 0.85, d.z + 0.455); for (let i = 0; i < 4; i++) box(0.24, 0.3, 0.02, M.black, d.x - 0.42 + i * 0.28, 0.32, d.z + 0.455); gl(1.32, 1.28, 0.92); }
      label(d.id + (on ? ' · ENERGISED' : ''), on ? '#ffb070' : '#5c6a72', d.x, d.id.indexOf('RACK') === 0 ? 2.65 : 2.05, d.z, 0.72);
    });
    LAB.PANELS.forEach(p => {
      if (p.o === 'floor') { box(1.6, 0.04, 1.6, M.panel, p.x, 0.02, p.z).castShadow = false; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.04, 0.05, M.steel, p.x + sx * 0.68, 0.03, p.z + sz * 0.68, false, 8); box(0.3, 0.05, 0.06, M.steel, p.x, 0.05, p.z); label(p.id, '#9fd8ff', p.x, 0.55, p.z, 0.55); return; }
      const ns = p.o === 'ns', sx = ns ? 0 : (p.x > 0 ? -1 : 1), sz = ns ? (p.z > 0 ? -1 : 1) : 0, px = p.x + sx * 0.05, pz = p.z + sz * 0.05;
      box(ns ? 1.7 : 0.05, 2.3, ns ? 0.05 : 1.7, M.panel, px, 1.3, pz); box(ns ? 1.8 : 0.07, 0.06, ns ? 0.07 : 1.8, M.trim, px, 2.47, pz); box(ns ? 1.8 : 0.07, 0.06, ns ? 0.07 : 1.8, M.trim, px, 0.13, pz);
      for (const a of [-0.76, 0.76]) for (const y of [0.3, 1.3, 2.3]) { const b = cyl(0.03, 0.03, M.steel, px + (ns ? a : sx * 0.03), y, pz + (ns ? sz * 0.03 : a), false, 8); if (ns) b.rotation.x = Math.PI / 2; else b.rotation.z = Math.PI / 2; }
      label(p.id, '#9fd8ff', p.x + sx * 0.3, 2.8, p.z + sz * 0.3, 0.55);
    });
  }

  function atmosphere() {
    const n = 700, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 36; pos[i * 3 + 1] = 0.2 + Math.random() * 3.6; pos[i * 3 + 2] = -13 + Math.random() * 20; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(g, new THREE.PointsMaterial({ map: TX.soft, size: 0.028, color: 0xcfe0e8, transparent: true, opacity: 0.28, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(dust);
    anim.push(t => { dust.position.set(Math.sin(t * 0.05) * 0.5, Math.sin(t * 0.11) * 0.2, Math.cos(t * 0.04) * 0.5); });
    const vm = new THREE.SpriteMaterial({ map: TX.soft, color: 0xcfeeff, transparent: true, opacity: 0.1, depthWrite: false });
    for (let i = 0; i < 16; i++) { const s = new THREE.Sprite(vm), bx = 12.5 + Math.random() * 5, bz = -4 + Math.random() * 8, ph = Math.random() * 6.3, sc = 1.6 + Math.random() * 1.8; s.scale.set(sc, sc * 0.6, 1); scene.add(s); anim.push(t => { s.position.set(bx + Math.sin(t * 0.15 + ph) * 0.8, 0.3 + 0.12 * Math.sin(t * 0.3 + ph), bz + Math.cos(t * 0.12 + ph) * 0.8); }); }
    anim.push(t => { TX.led.offset.x = Math.floor(t * 2.5) % 2 ? 0.5 : 0; });
  }

  // ------------------------------------------------------------------ tutorial guide (floor chevrons + target beacon)
  // W.setGuide([[x,z], ...], {x,z}) draws a glowing arrow trail from the player along the path; W.setGuide(null) hides it.
  function guideBuild() {
    const N = 48, sh = new THREE.Shape();
    sh.moveTo(0, 0.26); sh.lineTo(0.24, 0.0); sh.lineTo(0.24, -0.13); sh.lineTo(0, 0.12); sh.lineTo(-0.24, -0.13); sh.lineTo(-0.24, 0.0); sh.closePath();
    const geo = new THREE.ShapeGeometry(sh); geo.rotateX(-Math.PI / 2); // flat on the floor, pointing −Z
    const grp = new THREE.Group(); scene.add(grp); const chev = [];
    for (let i = 0; i < N; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x5fe0d0, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false, fog: false })); m.visible = false; m.renderOrder = 2; grp.add(m); chev.push(m); }
    const bmat = new THREE.MeshBasicMaterial({ color: 0xffb347, toneMapped: false, fog: false });
    const beacon = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 4), bmat); beacon.rotation.x = Math.PI; grp.add(beacon);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 40), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, fog: false }));
    ring.rotation.x = -Math.PI / 2; grp.add(ring);
    anim.push(t => {
      const G = W.guide; grp.visible = !!(G && !W.paused);
      if (!grp.visible) return;
      const pts = G.path || [], tg = G.target; let k = 0;
      if (tg) { beacon.visible = ring.visible = true; beacon.position.set(tg.x, 2.55 + Math.sin(t * 3) * 0.12, tg.z); beacon.rotation.y = t * 1.5; ring.position.set(tg.x, 0.025, tg.z); ring.scale.setScalar(1 + 0.12 * Math.sin(t * 4)); }
      else beacon.visible = ring.visible = false;
      let d = 0, next = 0.9; // first chevron 0.9 m ahead of the player
      for (let i = 0; i < pts.length - 1 && k < N; i++) {
        const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < 1e-6) continue;
        while (next <= d + L && k < N) {
          const u = (next - d) / L, m = chev[k++]; m.visible = true; m.position.set(a[0] + dx * u, 0.03, a[1] + dz * u); m.rotation.y = Math.atan2(-dx, -dz);
          m.material.opacity = 0.25 + 0.7 * Math.pow((Math.sin(t * 5 - next * 1.6) + 1) / 2, 2); next += 0.75;
        }
        d += L;
      }
      for (; k < N; k++) chev[k].visible = false;
    });
  }
  W.setGuide = function (path, target) { W.guide = path || target ? { path: path || [], target: target || null } : null; };
  W.interactables = function () { return inter.slice(); };

  function buildHand() { // held instrument, parented to the camera
    scene.add(camera); while (camera.children.length) camera.remove(camera.children[0]); hand = {}; const sh = shadows; shadows = false;
    const mk = (id, fn) => { hand[id] = group(0.3, -0.27, -0.55, fn); camera.add(hand[id]); hand[id].rotation.set(0.3, -0.4, 0.05); hand[id].scale.setScalar(0.62); };
    mk('mag', () => { box(0.15, 0.25, 0.035, M.dark, 0, 0, 0); box(0.16, 0.05, 0.04, M.yellow, 0, -0.1, 0); plane(0.115, 0.115, M.glow(0x2a8f84, 0.7), 0, 0.04, 0.019); box(0.008, 0.09, 0.004, M.glow(0xe0483c, 1.2), 0, 0.04, 0.022).rotation.z = 0.6; cyl(0.01, 0.13, M.steel, 0.05, 0.18, 0, false, 8); });
    mk('spray', () => { cyl(0.045, 0.2, M.white, 0, 0, 0, false, 18); cyl(0.046, 0.06, M.red, 0, 0.02, 0, false, 18); cyl(0.02, 0.04, M.steel, 0, 0.12, 0, false, 12); box(0.03, 0.025, 0.06, M.black, 0, 0.15, -0.02); });
    mk('wand', () => { cyl(0.016, 0.5, M.dark, 0, 0.12, -0.12, false, 10).rotation.x = -0.9; box(0.05, 0.14, 0.04, M.rubber, 0, -0.05, 0.02).rotation.x = -0.9; add(new THREE.TorusGeometry(0.06, 0.014, 8, 20), M.copper, 0, 0.28, -0.32).rotation.x = 0.7; box(0.03, 0.03, 0.01, M.glow(0xffb347, 2), 0, 0, 0.03); });
    shadows = sh;
  }

  // ------------------------------------------------------------------ queries + actions
  function blocked(x, z) { const r = 0.35; for (const c of colliders) if (x > c.a - r && x < c.b + r && z > c.c - r && z < c.d + r) return true; return false; }
  function segDist(px, pz, a, b) { const vx = b[0] - a[0], vz = b[1] - a[1], t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[1]) * vz) / (vx * vx + vz * vz))); return Math.hypot(px - a[0] - vx * t, pz - a[1] - vz * t); }
  W.roomName = function () { const p = W.player, r = LAB.ROOMS.find(r => p.x >= r.x1 && p.x <= r.x2 && p.z >= r.z1 && p.z <= r.z2); return r ? r.name : 'Doorway'; };
  W.fieldHere = function () { const b = PHYS.field(C.hunt.sources, W.player.x, W.player.z); if (W.surge > 0) { b.bx += (Math.random() - 0.5) * 400; b.bz += (Math.random() - 0.5) * 400; } return b; };
  W.wandHere = function () { if (!conduit) return 0; let d = 99; for (let i = 0; i < conduit.length - 1; i++) d = Math.min(d, segDist(W.player.x, W.player.z, conduit[i], conduit[i + 1])); return Math.min(1, 0.55 / (d * d * 0.35 + 0.5)) * (0.9 + 0.1 * Math.sin(performance.now() / 40)); };
  W.nearest = function () { const p = W.player, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw); let best = null, bd = 2.6; for (const it of inter) { const dx = it.x - p.x, dz = it.z - p.z, d = Math.hypot(dx, dz); if (d < bd && (d < 0.9 || (dx * fx + dz * fz) / d > 0.25)) { best = it; bd = d; } } return best; };
  W.spray = function () {
    if (W.sprayLeft <= 0) return false; const d = new THREE.Vector3(); camera.getWorldDirection(d); if (d.y > -0.08) return false;
    const t = -camera.position.y / d.y; if (t > 8) return false; const px = camera.position.x + d.x * t, pz = camera.position.z + d.z * t, pos = [];
    for (let i = 0; i < 160; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 1.3, x = px + Math.cos(a) * r, z = pz + Math.sin(a) * r, b = PHYS.field(C.hunt.sources, x, z), m = Math.hypot(b.bx, b.bz) || 1, l = 0.05 + Math.min(0.1, m * 0.004); pos.push(x - b.bx / m * l, 0.02, z - b.bz / m * l, x + b.bx / m * l, 0.02, z + b.bz / m * l); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaeb8be })); scene.add(ls); filings.push(ls); W.sprayLeft--; W.kick = 1; return true;
  };
  W.startSurge = function (sec) { W.surge = sec; carts.forEach(c => { c.userData.vx = (Math.random() - 0.5) * 1.6; c.userData.vz = (Math.random() - 0.5) * 1.6; }); };

  // ------------------------------------------------------------------ loop
  function step(dt) {
    const p = W.player, k = W.keys; let moving = false;
    if (W.surge > 0) { W.surge -= dt; carts.forEach(c => { c.position.x = Math.max(-9, Math.min(0.5, c.position.x + (c.userData.vx || 0) * dt)); c.position.z = Math.max(-6, Math.min(5.5, c.position.z + (c.userData.vz || 0) * dt)); }); }
    if (!W.paused) {
      if (k.ArrowLeft) p.yaw += 1.9 * dt; if (k.ArrowRight) p.yaw -= 1.9 * dt;
      const f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), s = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
      if (f || s) { const n = Math.hypot(f, s), sp = (k.ShiftLeft ? 6.5 : 4) * dt / n, dx = (-Math.sin(p.yaw) * f + Math.cos(p.yaw) * s) * sp, dz = (-Math.cos(p.yaw) * f - Math.sin(p.yaw) * s) * sp;
        if (!blocked(p.x + dx, p.z)) p.x += dx; if (!blocked(p.x, p.z + dz)) p.z += dz; W.bob = (W.bob || 0) + dt * (k.ShiftLeft ? 13 : 9); moving = true; }
    }
    const sh = W.surge > 0 ? 0.03 : 0, bob = Math.sin(W.bob || 0);
    camera.position.set(p.x + (Math.random() - 0.5) * sh, 1.62 + bob * 0.03 + (Math.random() - 0.5) * sh, p.z); camera.rotation.set(p.pitch, p.yaw, 0);
    W.kick = Math.max(0, (W.kick || 0) - dt * 5);
    for (const id in hand) { const h = hand[id]; h.visible = id === W.tool; h.position.set(0.34 + Math.cos((W.bob || 0) * 0.5) * 0.008, -0.3 + (moving ? bob * 0.012 : Math.sin(T * 1.6) * 0.004) + W.kick * 0.03, -0.55 + W.kick * 0.05); }
  }
  function frame(t) {
    requestAnimationFrame(frame); const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t; if (!C || !W.visible) return;
    T += dt; step(dt); for (const f of anim) f(T, dt); if ((W.scrT = (W.scrT || 0) + dt) > 0.1) { W.scrT = 0; drawScreen(T); }
    renderer.render(scene, camera);
    if (W.onFrame) W.onFrame(dt);
  }
  W.init = function (container) {
    el = container; renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement); camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80); camera.rotation.order = 'YXZ';
    textures(); mats(); envTex = makeEnv(); drawScreen(0);
    const resize = () => { const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight, pr = W.high ? Math.min(1.5, window.devicePixelRatio || 1) : 1;
      renderer.setPixelRatio(pr); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', resize); W.resize = resize;
    const cv = renderer.domElement; let drag = false;
    cv.addEventListener('mousedown', () => { if (W.paused) return;
      if (!W.locked) { drag = true; if (cv.requestPointerLock) { try { const pr = cv.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* drag-look fallback */ } } }
      else if (W.tool === 'spray' && W.onSpray) W.onSpray(W.spray()); });
    window.addEventListener('mouseup', () => { drag = false; });
    document.addEventListener('pointerlockchange', () => { W.locked = document.pointerLockElement === cv; });
    document.addEventListener('mousemove', e => { if (W.paused || !(W.locked || drag)) return; W.player.yaw -= e.movementX * 0.0023; W.player.pitch = Math.max(-1.35, Math.min(1.35, W.player.pitch - e.movementY * 0.0023)); });
    window.addEventListener('keydown', e => { W.keys[e.code] = true; }); window.addEventListener('keyup', e => { W.keys[e.code] = false; }); window.addEventListener('blur', () => { W.keys = {}; });
    requestAnimationFrame(frame);
  };
  W.load = function (caseData) {
    C = caseData; W.player = { x: 0, z: 4.5, yaw: 0, pitch: 0 }; W.surge = 0;
    renderer.outputEncoding = THREE.sRGBEncoding;
    for (const k in M) if (M[k] && M[k].isMaterial) M[k].needsUpdate = true;
    build(); W.resize();
  };
  W.unlock = function () { if (document.exitPointerLock) document.exitPointerLock(); W.keys = {}; };
  W.blocked = blocked; // exposed for tests
  window.World = W;
})();

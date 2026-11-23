/* Lenz's Alibi — first-person 3D lab (Three.js r128 global build).
   Procedural textures, shadowed lighting, reflection probe, dressed rooms, animated props, tutorial guide arrows. */
(function () {
  'use strict';
  const W = { paused: true, tool: 'mag', player: { x: 0, z: 4.5, yaw: 0, pitch: 0 }, keys: {}, locked: false, surge: 0, sprayLeft: 14 };
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
    colliders = []; inter = []; carts = []; filings = []; anim = []; W.sprayLeft = 14; shadows = false; // light mode only: no shadow maps
    scene.add(new THREE.AmbientLight(0x8fa6b8, 0.2)); scene.add(new THREE.HemisphereLight(0xa8c4d6, 0x191410, 0.14));

    // ---- shell
    const fl = add(new THREE.PlaneGeometry(40, 24), M.floor, 0, 0, -3); fl.rotation.x = -Math.PI / 2; fl.castShadow = false;
    const ce = add(new THREE.PlaneGeometry(40, 24), M.ceil, 0, 4, -3); ce.rotation.x = Math.PI / 2; ce.castShadow = false;
    wall(-10, 7, -1.85, 7); wall(1.85, 7, 10, 7); wallBox(3.4, 0.75, 0.3, 0, 3.625, 7); solid(0, 7, 3.7, 0.3); wall(-10, -7, -4.9, -7); windowWall(-4.75, -1.45, -7); wall(-1.3, -7, -1, -7); wall(1, -7, 1.3, -7); windowWall(1.45, 4.75, -7); wall(4.9, -7, 10, -7);
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
    if (C.puzzles.ampere) outlets();
  }
  // bench outlets at the far end of each supply conduit — the induction wand traces the live one here
  function outlets() {
    LAB.CIRCUITS.forEach(c => {
      const e = c.path[c.path.length - 1], q = c.path[c.path.length - 2], L = Math.hypot(e[0] - q[0], e[1] - q[1]), dx = (e[0] - q[0]) / L, dz = (e[1] - q[1]) / L;
      let nx = -dz, nz = dx; if (nx * -e[0] + nz * -e[1] < 0) { nx = -nx; nz = -nz; } // face into the room
      let back = 0.45; while (back < 3 && LAB.PANELS.some(p => Math.hypot(p.x - (e[0] - dx * back), p.z - (e[1] - dz * back)) < 1.1)) back += 0.3; // keep clear of wall panels
      const x = e[0] - dx * back + nx * 0.2, z = e[1] - dz * back + nz * 0.2;
      const o = box(Math.abs(nx) > 0.5 ? 0.1 : 0.36, 0.26, Math.abs(nx) > 0.5 ? 0.36 : 0.1, M.panel, x, 0.45, z); o.castShadow = false;
      box(Math.abs(nx) > 0.5 ? 0.02 : 0.2, 0.04, Math.abs(nx) > 0.5 ? 0.2 : 0.02, M.glow(0xffb347, 1.4), x + nx * 0.05, 0.52, z + nz * 0.05).castShadow = false;
      label(c.name.replace(' bench outlet', '').replace(' service outlet', '').toUpperCase() + ' OUTLET', '#ffcf7a', x + nx * 0.1, 0.95, z + nz * 0.1, 0.4);
      c.at = { x, z };
    });
  }
  // little floor pins where magnetometer readings were logged
  W.pin = function (x, z) { const m = cyl(0.09, 0.02, M.glow(0x5fe0d0, 2), x, 0.012, z, false, 14); m.castShadow = false; };
  W.traceEnd = function () { if (!conduit) return null; const c = LAB.CIRCUITS.find(k => k.path === conduit), e = c && c.at ? [c.at.x, c.at.z] : conduit[conduit.length - 1]; return { x: e[0], z: e[1], d: Math.hypot(W.player.x - e[0], W.player.z - e[1]) }; };

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
    box(0.3, 3.6, 0.36, M.trim, -1.85, 1.8, 6.84); box(0.3, 3.6, 0.36, M.trim, 1.85, 1.8, 6.84); box(4, 0.3, 0.36, M.trim, 0, 3.45, 6.84); W.doorHalves = [-1, 1].map(s => group(s * 0.86, 0, 7.0, () => { box(1.72, 3.3, 0.24, M.hazard, 0, 1.65, 0); box(0.06, 3.3, 0.26, M.dark, -s * 0.84, 1.65, 0); box(0.16, 0.6, 0.06, M.dark, -s * 0.68, 1.5, -0.14); box(0.04, 0.4, 0.02, M.glow(0xff4030, 1.5), -s * 0.68, 1.5, -0.175).castShadow = false; for (const y of [0.4, 2.9]) box(1.5, 0.05, 0.03, M.steel, 0, y, -0.13); }));
    for (const x of [-1.2, 1.2]) { box(0.7, 0.34, 0.4, M.dark, x, 3.42, 6.6); box(0.5, 0.06, 0.3, M.glow(0xff4030, 2), x, 3.22, 6.6).castShadow = false; }
    const bc = cyl(0.12, 0.16, M.glow(0xff3020, 3), 0, 3.72, 6.5, false, 12), bl = pt(0, 3.3, 6, 0xff3020, 0.8, 8); bc.castShadow = false; anim.push(t => { const k = 0.5 + 0.5 * Math.sin(t * 3.2); bl.intensity = 0.25 + 0.9 * k * k; bc.material.emissiveIntensity = 1 + 3 * k * k; });
    W.doorTape = []; for (const r of [0.2, -0.24]) { const tp = plane(4.1, 0.12, M.tape, 0, 1.45, 6.5, Math.PI); tp.rotation.z = r; W.doorTape.push(tp); } decal(3.6, 1.3, M.stripe, 0, 5.75); floorText('KEEP CLEAR', 0, 5.75, 0, 'rgba(20,24,28,.95)');
    W.doorLabel = label('BLAST DOOR · MAGLOCK ENGAGED', '#ff8f80', 0, 3.05, 6.2, 1.05);
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
    W.panelG = {};
    LAB.PANELS.forEach(p => {
      if (p.o === 'floor') { W.panelG[p.id] = group(p.x, 0, p.z, () => { box(1.6, 0.04, 1.6, M.panel, 0, 0.02, 0).castShadow = false; for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.04, 0.05, M.steel, sx * 0.68, 0.03, sz * 0.68, false, 8); box(0.3, 0.05, 0.06, M.steel, 0, 0.05, 0); }); label(p.id, '#9fd8ff', p.x, 0.55, p.z, 0.55); return; }
      const ns = p.o === 'ns', sx = ns ? 0 : (p.x > 0 ? -1 : 1), sz = ns ? (p.z > 0 ? -1 : 1) : 0, px = sx * 0.05, pz = sz * 0.05;
      W.panelG[p.id] = group(p.x, 0, p.z, () => {
        box(ns ? 1.7 : 0.05, 2.3, ns ? 0.05 : 1.7, M.panel, px, 1.3, pz); box(ns ? 1.8 : 0.07, 0.06, ns ? 0.07 : 1.8, M.trim, px, 2.47, pz); box(ns ? 1.8 : 0.07, 0.06, ns ? 0.07 : 1.8, M.trim, px, 0.13, pz);
        for (const a of [-0.76, 0.76]) for (const y of [0.3, 1.3, 2.3]) { const b = cyl(0.03, 0.03, M.steel, px + (ns ? a : sx * 0.03), y, pz + (ns ? sz * 0.03 : a), false, 8); if (ns) b.rotation.x = Math.PI / 2; else b.rotation.z = Math.PI / 2; }
      });
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
  // ------------------------------------------------------------------ ending cutscene: case solved → scientist found → culprit arrested
  // W.cutscene(spec, hooks): spec = { panel, culprit: { id, name, role, color }, summary }; hooks = { caption(title, sub, color), sfx(name), fade(on), done() }
  const LOOKS = { // per-suspect appearance: skin, hair, hair style, outfit
    cryo: { skin: 0xe3b796, hair: 0x5a3220, style: 'long', vest: null, patch: 0x6fd3ff },
    eng: { skin: 0x7a4a2c, hair: 0x141110, style: 'short', vest: 0xe8a21c, hivis: true },
    grad: { skin: 0xe6c09c, hair: 0x15110e, style: 'pony', hood: true },
    sec: { skin: 0xb98563, hair: 0x231a14, style: 'short', badge: true, tie: true }
  };
  function person(o) {
    const g = new THREE.Group(); scene.add(g); const p0 = parent;
    const mt = (c, r, side) => new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.82 : r, metalness: 0.02, side: side || THREE.FrontSide });
    const skin = mt(o.skin || 0xd29b74, 0.55), top = mt(o.top, 0.85, THREE.DoubleSide), shirt = mt(o.shirt || 0xe2e6ea, 0.8), pants = mt(o.pants || 0x262b31, 0.85);
    const shoe = mt(o.shoes || 0x0d0e10, 0.32), hairM = mt(o.hair || 0x2a1d14, 0.95), ink = mt(0x0c0d0f, 0.4), white = mt(0xf4f4f0, 0.3);
    const S = (r, w, h) => new THREE.SphereGeometry(r, w || 14, h || 10), Cy = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || 14);
    const lathe = (pts, mat, y, opt) => { opt = opt || {}; const m = add(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 28, opt.ps || 0, opt.pl || Math.PI * 2), mat, 0, y, 0); m.scale.z = opt.sz || 0.68; return m; };
    parent = g;
    // legs: thigh pivots at the hip, shin at the knee
    const legs = [-1, 1].map(s => { const hip = new THREE.Group(); hip.position.set(s * 0.095, 0.92, 0); g.add(hip); parent = hip;
      add(Cy(0.08, 0.062, 0.45), pants, 0, -0.225, 0);
      const knee = new THREE.Group(); knee.position.y = -0.45; hip.add(knee); parent = knee;
      add(S(0.062), pants, 0, 0, 0); add(Cy(0.06, 0.046, 0.42), pants, 0, -0.21, 0);
      add(new THREE.BoxGeometry(0.1, 0.07, 0.2), shoe, 0, -0.43, 0.03); add(S(0.052), shoe, 0, -0.435, 0.13).scale.set(1, 0.68, 1.1); add(new THREE.BoxGeometry(0.108, 0.02, 0.27), mt(0x1a1a1a, 0.9), 0, -0.462, 0.06);
      parent = g; hip.userData.knee = knee; return hip; });
    // pelvis, belt, duty gear
    lathe([[0.001, 0], [0.165, 0], [0.18, 0.08], [0.172, 0.15], [0.001, 0.15]], pants, 0.85);
    if (o.belt) { const b = add(new THREE.TorusGeometry(0.176, 0.022, 6, 28), ink, 0, 1.0, 0); b.rotation.x = Math.PI / 2; b.scale.y = 0.7; box(0.05, 0.04, 0.02, M.steel, 0, 1.0, 0.125); }
    if (o.duty) { box(0.06, 0.15, 0.09, ink, 0.19, 0.92, 0.02); box(0.05, 0.08, 0.05, ink, -0.185, 0.97, 0.05); box(0.04, 0.1, 0.04, ink, -0.17, 0.97, -0.08); }
    // torso
    lathe([[0.001, 0], [0.168, 0], [0.18, 0.12], [0.2, 0.3], [0.212, 0.42], [0.195, 0.52], [0.12, 0.585], [0.055, 0.6], [0.001, 0.6]], o.labcoat || o.tie ? shirt : top, 0.98);
    if (o.labcoat || o.tie) { // open jacket / lab coat over a shirt and tie
      const long = !!o.labcoat;
      lathe(long ? [[0.218, 0], [0.208, 0.3], [0.203, 0.55], [0.208, 0.75], [0.226, 0.95], [0.236, 1.06], [0.212, 1.14], [0.13, 1.19]] : [[0.21, 0], [0.214, 0.2], [0.228, 0.34], [0.236, 0.46], [0.212, 0.54], [0.13, 0.59]],
        top, long ? 0.42 : 1.0, { ps: 0.42, pl: Math.PI * 2 - 0.84, sz: 0.72 });
      for (const s of [-1, 1]) { const l = box(0.06, 0.3, 0.014, top, s * 0.085, 1.42, 0.152); l.rotation.z = s * 0.28; l.rotation.x = -0.12; }
      box(0.044, 0.3, 0.012, mt(long ? 0x6a1f24 : 0x1c2433, 0.6), 0, 1.4, 0.146);
      if (long) { box(0.07, 0.08, 0.012, top, -0.12, 1.36, 0.15); box(0.008, 0.07, 0.008, mt(0x2a5cff, 0.4), -0.1, 1.4, 0.158); box(0.1, 0.1, 0.012, top, 0.13, 0.86, 0.16); }
    }
    if (o.vest) { lathe([[0.224, 0], [0.23, 0.2], [0.228, 0.36], [0.204, 0.46], [0.13, 0.5]], mt(o.vest, 0.7, THREE.DoubleSide), 1.04, { sz: 0.74 });
      for (const x of [-0.1, 0, 0.1]) box(0.075, 0.09, 0.04, mt(o.vest, 0.75), x, 1.12, 0.168);
      if (o.hivis) for (const y of [1.17, 1.32]) { const r = add(new THREE.TorusGeometry(0.228, 0.013, 6, 32), M.glow(0xcfd8dc, 0.5), 0, y, 0); r.rotation.x = Math.PI / 2; r.scale.y = 0.74; } }
    if (o.badge) { box(0.05, 0.06, 0.012, M.glow(0xffd24a, 1.1), -0.09, 1.4, 0.15); }
    if (o.patch) box(0.085, 0.035, 0.01, M.glow(o.patch, 0.9), 0.09, 1.41, 0.146);
    if (o.radio) { box(0.04, 0.07, 0.03, ink, -0.16, 1.5, 0.08); cyl(0.004, 0.08, ink, -0.15, 1.57, 0.08, false, 6); }
    // shoulders, collar, hood, neck
    for (const s of [-1, 1]) add(S(0.075), top, s * 0.2, 1.5, 0).scale.set(1, 0.85, 0.85);
    const col = add(new THREE.TorusGeometry(0.068, 0.02, 8, 20), o.labcoat || o.tie ? top : shirt, 0, 1.585, 0); col.rotation.x = Math.PI / 2;
    if (o.hood) { const hd = add(new THREE.TorusGeometry(0.11, 0.05, 10, 18, Math.PI), top, 0, 1.6, -0.06); hd.rotation.set(Math.PI / 2 + 0.3, 0, Math.PI); for (const s of [-1, 1]) box(0.006, 0.16, 0.006, white, s * 0.04, 1.47, 0.15); }
    cyl(0.048, 0.12, skin, 0, 1.64, 0, false, 12);
    // head and face
    const head = new THREE.Group(); head.position.y = 1.775; g.add(head); parent = head;
    add(S(0.105, 24, 18), skin, 0, 0.01, 0).scale.set(0.93, 1.1, 1.0); add(S(0.082, 18, 12), skin, 0, -0.045, 0.02).scale.set(0.95, 0.85, 1.0);
    for (const s of [-1, 1]) { add(S(0.024, 10, 8), skin, s * 0.098, 0, 0).scale.set(0.5, 1, 0.8);
      add(S(0.016, 10, 8), white, s * 0.036, 0.018, 0.086); add(S(0.0085, 8, 6), ink, s * 0.036, 0.018, 0.1);
      const b = box(0.036, 0.008, 0.01, hairM, s * 0.037, 0.046, 0.096); b.rotation.z = -s * 0.12; }
    const ns = add(new THREE.ConeGeometry(0.016, 0.042, 8), skin, 0, -0.008, 0.104); ns.rotation.x = Math.PI / 2;
    box(0.04, 0.007, 0.008, mt(0x8a4a40, 0.6), 0, -0.058, 0.088);
    if (o.mustache) box(0.052, 0.013, 0.012, hairM, 0, -0.04, 0.098);
    if (o.style === 'bald') { const f = add(new THREE.SphereGeometry(0.109, 22, 10, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * 0.27, Math.PI * 0.3), hairM, 0, 0.01, 0); f.scale.set(0.95, 1.1, 1.02); }
    else { const cap = add(new THREE.SphereGeometry(0.11, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, 0, 0.02, -0.008); cap.scale.set(0.97, 1.05, 1.06); cap.rotation.x = -0.25;
      add(S(0.098, 16, 12), hairM, 0, -0.01, -0.03).scale.set(0.97, 0.95, 0.9); }
    if (o.style === 'long') { box(0.2, 0.26, 0.06, hairM, 0, -0.1, -0.075); for (const s of [-1, 1]) box(0.03, 0.17, 0.08, hairM, s * 0.095, -0.06, -0.01); }
    if (o.style === 'pony') { add(S(0.045), hairM, 0, -0.04, -0.13).scale.set(0.8, 1.4, 0.8); add(S(0.02), mt(o.top), 0, 0.0, -0.11); }
    if (o.glasses) { for (const s of [-1, 1]) { add(new THREE.TorusGeometry(0.024, 0.004, 6, 18), M.steel, s * 0.037, 0.018, 0.106); box(0.004, 0.004, 0.1, M.steel, s * 0.064, 0.02, 0.055); } box(0.02, 0.004, 0.004, M.steel, 0, 0.022, 0.108); }
    if (o.cap) { const cm = mt(o.cap, 0.6); add(Cy(0.13, 0.112, 0.065, 20), cm, 0, 0.1, -0.005); const br = box(0.17, 0.01, 0.09, ink, 0, 0.07, 0.1); br.rotation.x = 0.18; box(0.03, 0.03, 0.01, M.glow(0xffd24a, 1), 0, 0.1, 0.122); }
    parent = g;
    // arms: shoulder → elbow → hand
    const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * 0.215, 1.5, 0); g.add(sh); parent = sh;
      add(Cy(0.064, 0.056, 0.3, 12), top, 0, -0.15, 0);
      const el = new THREE.Group(); el.position.y = -0.3; sh.add(el); parent = el;
      add(S(0.056, 10, 8), top, 0, 0, 0); add(Cy(0.055, 0.046, 0.26, 12), top, 0, -0.13, 0);
      if (o.labcoat || o.tie) add(Cy(0.046, 0.046, 0.03, 12), shirt, 0, -0.255, 0);
      add(new THREE.BoxGeometry(0.06, 0.09, 0.035), skin, 0, -0.315, 0.005); add(S(0.031, 10, 8), skin, 0, -0.36, 0.005).scale.set(1, 0.7, 0.6); add(S(0.018, 8, 6), skin, -s * 0.03, -0.29, 0.02).scale.set(1, 1.5, 1);
      el.rotation.x = -0.15; parent = g; sh.userData.elbow = el; sh.rotation.z = s * 0.06; return sh; });
    parent = p0; g.userData = { legs, arms, head }; return g;
  }
  function walkPose(g, ph, k) {
    const u = g.userData, s = Math.sin(ph) * k;
    u.legs.forEach((L, i) => { L.rotation.x = (i ? -s : s) * 0.5; L.userData.knee.rotation.x = Math.max(0, Math.sin(ph + (i ? Math.PI : 0) + 1.2)) * 0.75 * k; });
    u.arms.forEach((A, i) => { A.rotation.x = (i ? s : -s) * 0.38; A.userData.elbow.rotation.x = -0.15 - 0.3 * k * Math.max(0, i ? s : -s); });
  }
  // the stencil trick that lets us see INTO the wall/floor behind the hidden panel
  const STENCIL_MATS = () => [M.wall, M.floor];
  function setCut(on) { STENCIL_MATS().forEach(m => { m.stencilWrite = on; m.stencilRef = 1; m.stencilFunc = on ? THREE.NotEqualStencilFunc : THREE.AlwaysStencilFunc; m.stencilWriteMask = 0; m.stencilFail = m.stencilZFail = m.stencilZPass = THREE.KeepStencilOp; m.needsUpdate = true; }); }

  W.cutscene = function (spec, hooks) {
    const cs = { t: 0, done: false, fired: {} }, ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u), seg = (a, b) => ease((cs.t - a) / (b - a)), lin = (a, b) => Math.max(0, Math.min(1, (cs.t - a) / (b - a)));
    const V = (x, y, z) => new THREE.Vector3(x, y, z), mix = (a, b, u) => a.clone().lerp(b, u);
    const at = (time, fn) => { if (cs.t >= time && !cs.fired[time + fn.name]) { cs.fired[time + fn.name] = 1; fn(); } };
    const P = spec.panel, floor = P.o === 'floor', ns = P.o === 'ns';
    const n = floor ? V(0, 0, -1) : ns ? V(0, 0, P.z > 0 ? -1 : 1) : V(P.x > 0 ? -1 : 1, 0, 0), side = V(n.z, 0, -n.x);
    const PP = V(P.x, 0, P.z), p0 = parent, sh0 = shadows; shadows = false;
    const black = new THREE.MeshStandardMaterial({ color: 0x030405, roughness: 0.95, envMapIntensity: 0, side: THREE.BackSide });
    // ---- the cavity behind the panel (seen through a stencil "hole" in the wall/floor)
    const face = floor ? PP.clone() : PP.clone().addScaledVector(n, -0.05), cav = new THREE.Group(); scene.add(cav); parent = cav;
    const maskM = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp, stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp });
    let mask;
    if (floor) {
      add(new THREE.BoxGeometry(1.5, 2.9, 1.5), black, P.x, -1.45, P.z);
      for (const s of [-1, 1]) box(0.04, 2.6, 0.04, M.glow(0x2fb6a2, 1.4), P.x + s * 0.7, -1.4, P.z - 0.7);
      mask = new THREE.Mesh(new THREE.PlaneGeometry(1.42, 1.42), maskM); mask.rotation.x = -Math.PI / 2; mask.position.set(P.x, 0.004, P.z);
    } else {
      const D = 1.6, Wd = 1.5, H = 2.15, c = face.clone().addScaledVector(n, -D / 2).setY(0.25 + H / 2);
      const bx = add(new THREE.BoxGeometry(ns ? Wd : D, H, ns ? D : Wd), black, c.x, c.y, c.z);
      const back = face.clone().addScaledVector(n, -D + 0.04);
      for (const s of [-1, 1]) { const p = back.clone().addScaledVector(side, s * 0.62); box(0.05, 1.9, 0.05, M.glow(0x2fb6a2, 1.5), p.x, 1.3, p.z); }
      for (const y of [0.6, 2.0]) { const p = back.clone(); const r = box(ns ? 1.3 : 0.04, 0.05, ns ? 0.04 : 1.3, M.steel, p.x, y, p.z); r.castShadow = false; }
      const fl = add(new THREE.PlaneGeometry(ns ? Wd : D, ns ? D : Wd), M.frost, c.x, 0.26, c.z); fl.rotation.x = -Math.PI / 2;
      mask = new THREE.Mesh(new THREE.PlaneGeometry(Wd, H), maskM); mask.position.copy(face).addScaledVector(n, 0.012).setY(0.25 + H / 2); mask.rotation.y = Math.atan2(n.x, n.z);
      void bx;
    }
    mask.renderOrder = -10; scene.add(mask); setCut(true);
    // ---- the pod, with Dr. Thorne inside
    const podG = new THREE.Group(); scene.add(podG); parent = podG;
    cyl(0.56, 0.2, M.dark, 0, 0.1, 0, false, 32); cyl(0.5, 0.05, M.glow(0x5fe0d0, 2.4), 0, 0.22, 0, false, 32); cyl(0.56, 0.24, M.dark, 0, 2.2, 0, false, 32); cyl(0.5, 0.05, M.glow(0x5fe0d0, 2.4), 0, 2.06, 0, false, 32);
    cyl(0.12, 0.3, M.steel, 0, 2.45, 0, false, 12); for (const s of [-1, 1]) pipe(0.03, 0.5, M.copper, s * 0.3, 2.36, 0, 'x');
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; box(0.06, 1.9, 0.06, M.steel, Math.cos(a) * 0.52, 1.15, Math.sin(a) * 0.52); }
    box(0.3, 0.12, 0.04, M.glow(0x40ff90, 1.6), 0, 0.12, 0.55);
    const glassM = new THREE.MeshStandardMaterial({ color: 0xcff4ff, emissive: 0x1d5560, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const glass = cyl(0.49, 1.82, glassM, 0, 1.14, 0, false, 32);
    parent = p0; shadows = sh0;
    const thorne = person({ top: 0xc9d0d4, labcoat: true, shirt: 0x8fa9c6, pants: 0x3a3f46, hair: 0x8b8782, style: 'bald', glasses: true, mustache: true, skin: 0xd9b49a }); podG.add(thorne); thorne.position.set(0, 0.2, 0);
    podG.rotation.y = Math.atan2(n.x, n.z);
    const podIn = floor ? V(P.x, -2.5, P.z) : face.clone().addScaledVector(n, -0.82), podOut = floor ? V(P.x, 0, P.z) : PP.clone().addScaledVector(n, 0.95);
    podG.position.copy(podIn);
    const podLight = pt(0, 0, 0, 0x7ff6ff, 0, 5); podLight.position.copy(floor ? V(P.x, -0.6, P.z) : face.clone().addScaledVector(n, -0.3).setY(1.9));
    // where the panel gets set down (pick the clear side)
    let sd = floor ? V(0.7, 0, -0.7).normalize() : side.clone().negate(); // away from the camera first
    if (!floor) { const clear = v => [-0.8, 0, 0.8].every(k => { const c = PP.clone().addScaledVector(v, 1.95 + k).addScaledVector(n, 0.45); return !blocked(c.x, c.z); }); if (!clear(sd)) sd.negate(); }
    const cside = floor ? side : sd.clone().negate(); // camera stands on the other side from the set-aside panel
    const PG = W.panelG && W.panelG[P.id];
    if (PG) { parent = PG; if (floor) box(1.56, 0.006, 1.56, new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.9, envMapIntensity: 0 }), 0, -0.002, 0); else box(ns ? 1.66 : 0.01, 2.26, ns ? 0.01 : 1.66, new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.9, envMapIntensity: 0 }), n.x * 0.02, 1.3, n.z * 0.02); parent = p0; }
    // ---- the culprit, two officers, and the corridor behind the blast door
    const L = LOOKS[spec.culprit.id] || {}, col = new THREE.Color(spec.culprit.color || '#888888');
    const crook = person(Object.assign({ top: col.getHex(), pants: 0x24282c, belt: true }, L));
    const guards = [-1, 1].map(i => person({ top: 0x1b2740, pants: 0x161c26, shoes: 0x08090a, cap: 0x121a2b, badge: true, belt: true, duty: true, radio: i > 0, hair: 0x1a1410, style: 'short', skin: i > 0 ? 0x8d5a3b : 0xe0b394, vest: 0x20242a }));
    crook.position.set(0.5, 0, 2.6); crook.rotation.y = Math.PI; crook.visible = false; guards.forEach(g => { g.visible = false; });
    const cuffs = new THREE.Group(); crook.add(cuffs); cuffs.position.set(0, 1.0, -0.2); cuffs.visible = false;
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.011, 8, 18), M.steel); r.position.x = s * 0.055; cuffs.add(r); } cuffs.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.008), M.steel));
    const corr = new THREE.Group(); scene.add(corr); parent = corr;
    const cfl = add(new THREE.PlaneGeometry(3.6, 5), M.floor, 0, 0.01, 9.6); cfl.rotation.x = -Math.PI / 2;
    for (const s of [-1, 1]) { box(0.2, 3.4, 5, M.dark, s * 1.9, 1.7, 9.6); for (const z of [7.8, 9.2, 10.6, 12]) box(0.06, 3.3, 0.14, M.trim, s * 1.77, 1.65, z); pipe(0.05, 5, M.steel, s * 1.72, 3.0, 9.6, 'z'); }
    box(3.8, 0.1, 5, M.dark, 0, 3.4, 9.6); box(3.8, 3.4, 0.2, M.dark, 0, 1.7, 12.1); box(0.6, 0.2, 0.04, M.glow(0x40ff90, 2.2), 0, 2.75, 11.98);
    for (const z of [8.2, 9.6, 11]) box(1.2, 0.04, 0.14, M.glow(0xd8ecff, 2.4), 0, 3.33, z);
    parent = p0;
    const hall = pt(0, 2.6, 9.4, 0xd8ecff, 0, 9), red = pt(-1.6, 3, 5.2, 0xff2a20, 0, 10), blue = pt(1.6, 3, 5.2, 0x2a5cff, 0, 10), fill = pt(0, 0, 0, 0xffeedd, 0, 7);
    const halves = W.doorHalves || [];
    // ---- cold vapour
    const puffs = [], pm = new THREE.SpriteMaterial({ map: TX.soft, color: 0xdff6ff, transparent: true, opacity: 0.5, depthWrite: false });
    const puff = (o, k, spread, up, push) => { for (let i = 0; i < k; i++) { const s = new THREE.Sprite(pm.clone()); s.position.set(o.x + (Math.random() - 0.5) * spread, o.y + Math.random() * 0.4, o.z + (Math.random() - 0.5) * spread); s.userData = { v: V((Math.random() - 0.5) * 0.4 + n.x * (push || 0.5), (up || 0.15) * Math.random(), (Math.random() - 0.5) * 0.4 + n.z * (push || 0.5)), life: 0, max: 1.8 + Math.random() * 1.6 }; s.scale.setScalar(0.3); scene.add(s); puffs.push(s); } };
    const cam = { pos: V(0.8, 1.9, -9.6), look: V(0.8, 1.9, -12.75) }; W.cine = cam;
    function tick(_T, dt) {
      if (cs.done) return; cs.t += dt; const t = cs.t;
      for (let i = puffs.length - 1; i >= 0; i--) { const s = puffs[i], u = s.userData; u.life += dt; s.position.addScaledVector(u.v, dt); s.scale.setScalar(0.3 + u.life * 0.75); s.material.opacity = 0.4 * (1 - u.life / u.max); if (u.life > u.max) { scene.remove(s); puffs.splice(i, 1); } }
      fill.position.copy(cam.pos).add(V(0, 0.5, 0)); fill.intensity = t > 4.4 ? 0.5 : 0;
      // ---- shot 0 · the deduction lands (case board)
      at(0, function s0() { hooks.sfx('sting'); hooks.caption('CASE SOLVED', 'It was ' + spec.culprit.name + '.', spec.culprit.color); });
      if (t < 4.4) { cam.pos.copy(mix(V(0.8, 1.85, -9.4), V(0.8, 1.9, -11.2), seg(0, 4.4))); cam.look.set(0.8, 1.9, -12.75); }
      at(3.9, function f0() { hooks.fade(true); }); at(4.5, function f1() { hooks.fade(false); hooks.caption('PANEL ' + P.id, P.where); });
      // ---- shot A · unbolt the panel, set it aside, the pod slides out of the dark cavity
      if (t >= 4.4 && t < 9.8) { const u = seg(4.4, 9.8), base = PP.clone().setY(floor ? 0.4 : 1.2);
        cam.pos.copy(mix(base.clone().addScaledVector(n, floor ? 3.6 : 4.2).addScaledVector(cside, 1.3).setY(1.75), base.clone().addScaledVector(n, floor ? 2.9 : 3.3).addScaledVector(cside, 0.6).setY(1.6), u)); cam.look.copy(base); }
      at(5.0, function a0() { hooks.sfx('clank'); });
      if (PG && t >= 5.0) {
        const jit = t < 5.6 ? Math.sin(t * 60) * 0.006 : 0, pop = seg(5.6, 6.0) * (floor ? 0.25 : 0.2), sl = seg(6.0, 7.0) * 1.95;
        if (floor) { PG.position.set(P.x + sd.x * sl + jit, pop * (1 - seg(6.6, 7.0)) + 0.01 * seg(6.6, 7), P.z + sd.z * sl); }
        else { PG.position.copy(PP).addScaledVector(n, pop + jit).addScaledVector(sd, sl); const lean = 0.07 * seg(6.6, 7.0); if (ns) PG.rotation.x = n.z * lean; else PG.rotation.z = -n.x * lean; }
      }
      at(5.7, function a1() { podLight.intensity = 1.4; puff(face.clone().setY(floor ? 0 : 0.35), 8, 1.2, 0.3, 0.7); });
      at(7.0, function a2() { hooks.sfx('thud'); });
      at(7.5, function a3() { hooks.sfx('hiss'); });
      if (t >= 7.5) { podG.position.copy(mix(podIn, podOut, seg(7.5, 9.6))); if (t < 9.6 && Math.random() < 0.5) puff(face.clone().setY(floor ? 0.05 : 0.3), 1, 1, 0.25, 0.8); }
      if (t >= 5.7) podLight.position.copy(t < 7.5 ? podLight.position : podG.position.clone().addScaledVector(n, 0.9).setY(Math.max(0.6, podG.position.y + 1.7)));
      // ---- shot B · the glass lifts, Dr. Thorne steps out, shivering
      if (t >= 9.8 && t < 15.4) { const u = seg(9.8, 15.4), c = podOut.clone().setY(1.4);
        cam.pos.copy(mix(c.clone().addScaledVector(n, 3.4).addScaledVector(cside, 1.1).setY(1.5), c.clone().addScaledVector(n, 2.6).addScaledVector(cside, 0.5).setY(1.62), u)); cam.look.copy(c.clone().addScaledVector(n, 0.9 * seg(11, 13.5))); }
      at(10, function b0() { hooks.sfx('hiss'); puff(podOut.clone().setY(0.2), 26, 1, 0.5, 0.6); });
      if (t >= 10) { glass.position.y = 1.14 + seg(10, 11.6) * 1.9; glassM.opacity = 0.5 * (1 - seg(10.6, 11.6)); }
      at(10.6, function b1() { hooks.caption('DR. THORNE', 'Found alive — cold, and furious.', '#8ffff0'); });
      if (t >= 11.2 && t < 13.6) { thorne.position.z = seg(11.2, 13.6) * 1.0; thorne.position.y = 0.2 * (1 - seg(11.2, 12)); walkPose(thorne, t * 6.5, 1 - seg(13, 13.6)); }
      if (t >= 13.6) { const k = seg(13.6, 14.3); walkPose(thorne, 0, 0); thorne.rotation.z = Math.sin(t * 38) * 0.012 * (1 - seg(14.5, 15.4));
        thorne.userData.arms.forEach((a, i) => { a.rotation.x = -0.45 * k; a.rotation.z = (i ? -1 : 1) * 0.32 * k; a.userData.elbow.rotation.x = -0.15 - 1.5 * k; }); thorne.userData.head.rotation.y = Math.sin(t * 1.3) * 0.35; thorne.userData.head.rotation.x = -0.08; }
      at(15, function f2() { hooks.fade(true); }); at(15.6, function f3() { hooks.fade(false); crook.visible = true; mask.visible = false; });
      // ---- shot C · the blast door unlocks and slides apart, security moves in
      if (t >= 15.4 && t < 22.2) { const u = seg(15.4, 22.2), shake = t > 16 && t < 16.4 ? (Math.random() - 0.5) * 0.03 : 0;
        cam.pos.copy(mix(V(-3.4, 1.85, -0.6), V(-2.6, 1.7, 0.4), u)).add(V(shake, shake, 0)); cam.look.copy(mix(V(0.2, 1.4, 4.8), V(0.4, 1.3, 3.4), u)); }
      at(16, function c0() { if (W.doorLabel) W.doorLabel.visible = false; hooks.sfx('clank'); });
      at(16.4, function c0b() { hooks.sfx('door'); hall.intensity = 1.8; });
      halves.forEach((h, i) => { const s = i ? 1 : -1; if (t >= 16) h.position.x = s * (0.86 + (t < 16.4 ? 0.02 : 0.02 + 1.75 * seg(16.4, 18.4))); });
      at(17.2, function c1() { (W.doorTape || []).forEach(m => { m.visible = false; }); hooks.sfx('siren'); hooks.caption(spec.culprit.name.toUpperCase(), spec.culprit.role + ' — under arrest.', spec.culprit.color); guards.forEach(g => { g.visible = true; }); });
      if (t >= 15.6) { const on = t > 17, f = Math.sin(t * 9) > 0; red.intensity = on ? (f ? 2.2 : 0.2) : 0; blue.intensity = on ? (f ? 0.2 : 2.4) : 0; }
      const gA = [V(-0.5, 0, 9.4), V(1.3, 0, 10.2)], gB = [V(0.0, 0, 3.4), V(1.0, 0, 3.4)];
      if (t >= 17.2 && t < 23) guards.forEach((g, i) => { const u = seg(17.2 + i * 0.3, 20.4 + i * 0.3); g.position.copy(mix(gA[i], gB[i], u)); g.rotation.y = Math.PI; walkPose(g, t * 7 + i, u < 1 ? 1 : 0); });
      if (t >= 15.6 && t < 21) { crook.rotation.y = Math.PI * (1 - seg(17.8, 18.6)); crook.position.z = 2.6 - seg(18.6, 19.6) * 0.5; walkPose(crook, t * 8, t > 18.6 && t < 19.6 ? 0.6 : 0); crook.userData.head.rotation.y = Math.sin(t * 6) * 0.25 * seg(18.6, 19.6); }
      if (t >= 20.4 && t < 22.4) { const u = seg(20.4, 21.2); crook.userData.arms.forEach((a, i) => { a.rotation.x = 0.5 * u; a.rotation.z = (i ? -1 : 1) * 0.3 * u; a.userData.elbow.rotation.x = -0.15 - 0.55 * u; });
        guards.forEach((g, i) => { const a = g.userData.arms[1 - i]; a.rotation.x = -0.85 * u; a.userData.elbow.rotation.x = -0.4 * u; }); crook.userData.head.rotation.x = 0.25 * u; }
      at(21.1, function c2() { cuffs.visible = true; hooks.sfx('cuffs'); });
      // ---- shot D · escorted out through the blast door
      if (t >= 22.2) { const u = seg(22.2, 27.5); cam.pos.copy(mix(V(1.7, 1.75, 0.6), V(1.3, 1.7, 3.2), u)); cam.look.copy(crook.position.clone().setY(1.5)); }
      at(22.4, function d0() { hooks.caption('CASE CLOSED', spec.summary || '', '#6fffaa'); });
      if (t >= 23) { const u = seg(23, 27.8), wp = t * 7; crook.position.z = 2.1 + u * 5.4; walkPose(crook, wp, 0.7);
        crook.userData.arms.forEach((a, i) => { a.rotation.x = 0.5; a.rotation.z = (i ? -1 : 1) * 0.3; a.userData.elbow.rotation.x = -0.7; });
        guards.forEach((g, i) => { g.rotation.y = 0; g.position.set(gB[i].x, 0, 3.4 + u * 5.4); walkPose(g, wp + i, 0.8); if (i === 0) { g.userData.arms[1].rotation.x = -0.6; } }); }
      at(26.6, function d1() { hooks.sfx('final'); hooks.fade(true); });
      if (t >= 28) finish();
    }
    function finish() { if (cs.done) return; cs.done = true; W.cine = null; setCut(false); mask.visible = false; const i = anim.indexOf(tick); if (i >= 0) anim.splice(i, 1); W.skipCutscene = null; hooks.done(); }
    anim.push(tick); W.skipCutscene = finish; cs.tick = tick; return cs;
  };
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
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const ls = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaeb8be })); scene.add(ls); filings.push(ls); W.sprayLeft--; W.kick = 1; return { x: px, z: pz };
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
    W.moving = moving;
    if (W.cine) { camera.position.copy(W.cine.pos); camera.lookAt(W.cine.look); for (const id in hand) hand[id].visible = false; return; }
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
    renderer.shadowMap.enabled = false; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    el.appendChild(renderer.domElement); camera = new THREE.PerspectiveCamera(72, 1, 0.05, 80); camera.rotation.order = 'YXZ';
    textures(); mats(); envTex = makeEnv(); drawScreen(0);
    const resize = () => { const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight, pr = 1; // fixed 1x resolution
      renderer.setPixelRatio(pr); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', resize); W.resize = resize;
    const cv = renderer.domElement; let drag = false;
    cv.addEventListener('mousedown', () => { if (W.paused) return;
      if (!W.locked) { drag = true; if (cv.requestPointerLock) { try { const pr = cv.requestPointerLock(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* drag-look fallback */ } } }
      else if (W.tool === 'spray' && W.onSpray) W.onSpray(W.spray()); else if (W.tool === 'mag' && W.onMag) { W.kick = 1; W.onMag(); } });
    window.addEventListener('mouseup', () => { drag = false; });
    document.addEventListener('pointerlockchange', () => { W.locked = document.pointerLockElement === cv; });
    document.addEventListener('mousemove', e => { if (W.paused || !(W.locked || drag)) return; W.player.yaw -= e.movementX * 0.0023; W.player.pitch = Math.max(-1.35, Math.min(1.35, W.player.pitch - e.movementY * 0.0023)); });
    window.addEventListener('keydown', e => { W.keys[e.code] = true; }); window.addEventListener('keyup', e => { W.keys[e.code] = false; }); window.addEventListener('blur', () => { W.keys = {}; });
    requestAnimationFrame(frame);
  };
  W.load = function (caseData) {
    C = caseData; W.player = { x: 0, z: 4.5, yaw: 0, pitch: 0 }; W.surge = 0; W.cine = null; W.skipCutscene = null; setCut(false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    for (const k in M) if (M[k] && M[k].isMaterial) M[k].needsUpdate = true;
    build(); W.resize();
  };
  W.renderNow = function () { step(0); renderer.render(scene, camera); }; // test hook: draw one frame on demand
  W.unlock = function () { if (document.exitPointerLock) document.exitPointerLock(); W.keys = {}; };
  W.blocked = blocked; // exposed for tests
  window.World = W;
})();

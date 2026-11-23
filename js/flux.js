/* Lenz's Alibi — Flux, the floating horseshoe-magnet detective.
   FluxSprite: animated 3D model (three.js) in its own small canvas (fedora, trench coat, glowing eyes, jet, magnifier, notebook).
   FluxBrain: reads the live state of each device / the case board and explains what is wrong and why. */
(function () {
  'use strict';
  // ------------------------------------------------------------------ 3D model
  // A small three.js scene in its own transparent canvas: horseshoe magnet in a fedora and trench coat,
  // glowing eyes, blue jet, floating magnifier and notebook. Same API as before: draw(t, dt), setMood(m), talk().
  function FluxSprite(canvas) {
    const T3 = window.THREE;
    if (!T3) return { draw() {}, setMood() {}, talk() {} };
    const renderer = new T3.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputEncoding = T3.sRGBEncoding; renderer.toneMapping = T3.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    const scene = new T3.Scene(), camera = new T3.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0.1, 0.02, 6.1); camera.lookAt(0.14, -0.06, 0);
    scene.add(new T3.HemisphereLight(0xfff1e0, 0x2a2018, 0.9));
    const key = new T3.DirectionalLight(0xfff0dc, 2.0); key.position.set(2.5, 3, 4); scene.add(key);
    const rim = new T3.DirectionalLight(0x7fdcff, 1.6); rim.position.set(-3, 1.5, -2.5); scene.add(rim);
    const fill = new T3.DirectionalLight(0xffd2a0, 0.5); fill.position.set(-3, -1, 3); scene.add(fill);
    const jetLight = new T3.PointLight(0x4aa8ff, 2.0, 3); jetLight.position.set(0, -1.2, 0.4); scene.add(jetLight);

    // ---- procedural textures (made once, shared by every Flux): colour maps + matching normal maps
    const TX = FluxSprite._tx || (FluxSprite._tx = makeTextures());
    function makeTextures() {
      const canvasOf = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; };
      const tex = (c, srgb, rx, ry) => { const t = new T3.CanvasTexture(c); t.wrapS = t.wrapT = T3.RepeatWrapping; t.anisotropy = 4; if (srgb) t.encoding = T3.sRGBEncoding; t.repeat.set(rx || 1, ry || 1); return t; };
      const normalFrom = (hc, strength) => canvasOf(hc.width, hc.height, (g, w, h) => { // height map → tangent-space normal map
        const src = hc.getContext('2d').getImageData(0, 0, w, h).data, out = g.createImageData(w, h), H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength, l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
          out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
        }
        g.putImageData(out, 0, 0);
      });
      const rnd = (() => { let s = 1234567; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); // stable noise, same Flux every time
      // gabardine twill: diagonal ribs, thread-by-thread variation, a few slubs and soft mottling
      const gab = canvasOf(512, 512, (g, w, h) => {
        const id = g.createImageData(w, h);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const rib = ((x + y) % 6) < 3 ? 26 : -8, v = 180 + rib + (rnd() * 22 - 11), i = (y * w + x) * 4; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
        g.putImageData(id, 0, 0);
        for (let i = 0; i < 60; i++) { const r = 20 + rnd() * 60; g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${0.008 + rnd() * 0.012})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, r, 0, 6.283); g.fill(); }
        for (let i = 0; i < 500; i++) { const x = rnd() * w, y = rnd() * h, L = 3 + rnd() * 9; g.strokeStyle = `rgba(${rnd() < 0.6 ? '60,60,60' : '235,235,235'},${0.15 + rnd() * 0.2})`; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + L); g.stroke(); }
      });
      // wool felt for the fedora: soft fuzzy noise
      const felt = canvasOf(256, 256, (g, w, h) => {
        const id = g.createImageData(w, h); for (let i = 0; i < w * h * 4; i += 4) { const v = 175 + rnd() * 40; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0);
        g.filter = 'blur(1.2px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none';
        for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(255,255,255,${rnd() * 0.12})`; g.beginPath(); const x = rnd() * w, y = rnd() * h, a = rnd() * 6.28; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); g.stroke(); }
      });
      // pebbled leather with stitched edges (for the belt)
      const leather = canvasOf(256, 64, (g, w, h) => {
        g.fillStyle = '#a8a8a8'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 1400; i++) { const v = 130 + rnd() * 90; g.fillStyle = `rgba(${v},${v},${v},.55)`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.6, 0, 6.283); g.fill(); }
        g.fillStyle = '#e8d2a8'; for (let x = 0; x < w; x += 8) { g.fillRect(x, 9, 5, 2); g.fillRect(x, h - 11, 5, 2); }
      });
      // grosgrain ribbon for the hat band
      const ribbon = canvasOf(64, 64, (g, w, h) => { for (let y = 0; y < h; y++) { const v = y % 3 === 0 ? 150 : 205 + rnd() * 20; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, w, 1); } });
      // brushed steel
      const brushed = canvasOf(512, 128, (g, w, h) => {
        g.fillStyle = '#d6d6d6'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 1600; i++) { const v = 160 + rnd() * 95, y = rnd() * h; g.strokeStyle = `rgba(${v},${v},${v},.35)`; g.beginPath(); const x = rnd() * w; g.moveTo(x, y); g.lineTo(x + 30 + rnd() * 160, y); g.stroke(); }
      });
      const env = canvasOf(512, 256, (g, w, h) => { // a small "photo studio" for the metals to reflect
        const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#fff7ea'); gr.addColorStop(0.42, '#9aa2ac'); gr.addColorStop(0.55, '#3c3632'); gr.addColorStop(1, '#121010');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ffffff'; g.fillRect(70, 30, 110, 46); g.fillRect(330, 46, 60, 30); g.fillStyle = '#8fe0ff'; g.fillRect(230, 104, 160, 10); g.fillStyle = '#ffd9a0'; g.fillRect(10, 90, 40, 60);
      });
      const label = ch => tex(canvasOf(128, 128, (g) => { g.font = 'bold 88px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(80,48,8,.9)'; g.fillText(ch, 64, 70); g.fillStyle = 'rgba(255,236,180,.55)'; g.fillText(ch, 62, 66); }), true);
      const envT = new T3.CanvasTexture(env); envT.mapping = T3.EquirectangularReflectionMapping; envT.encoding = T3.sRGBEncoding;
      const gabNc = normalFrom(gab, 2.2);
      return {
        gab: tex(gab, true, 7, 3), gabN: tex(gabNc, false, 7, 3), gabS: tex(gab, true, 2, 2), gabSN: tex(gabNc, false, 2, 2),
        felt: tex(felt, true, 3, 2), feltN: tex(normalFrom(felt, 1.6), false, 3, 2),
        leather: tex(leather, true, 10, 1), leatherN: tex(normalFrom(leather, 2.5), false, 10, 1),
        ribbon: tex(ribbon, true, 6, 1), ribbonN: tex(normalFrom(ribbon, 2), false, 6, 1),
        brushed: tex(brushed, true, 1, 1), brushedN: tex(normalFrom(brushed, 0.8), false, 1, 1),
        env: envT, N: label('N'), S: label('S')
      };
    }
    try { const pm = new T3.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(TX.env).texture; pm.dispose(); } catch (e) { /* metals just look flatter */ }

    const lin = c => new T3.Color(c).convertSRGBToLinear();
    const std = (color, metal, rough, extra) => new T3.MeshStandardMaterial(Object.assign({ color: lin(color), metalness: metal, roughness: rough }, extra || {}));
    const phys = (color, metal, rough, extra) => new T3.MeshPhysicalMaterial(Object.assign({ color: lin(color), metalness: metal, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.15 }, extra || {}));
    const add = (color, op) => new T3.MeshBasicMaterial({ color: lin(color), transparent: true, opacity: op, blending: T3.AdditiveBlending, depthWrite: false, toneMapped: false });
    const fabric = (color, big) => std(color, 0, 0.92, { map: big ? TX.gab : TX.gabS, normalMap: big ? TX.gabN : TX.gabSN, normalScale: new T3.Vector2(0.6, 0.6) });
    const M = {
      steel: phys(0xc8d0d8, 0.9, 0.28, { map: TX.brushed, normalMap: TX.brushedN, normalScale: new T3.Vector2(0.15, 0.15) }), steelDk: std(0x5a646e, 0.85, 0.38), socket: std(0x0f1b22, 0.3, 0.35),
      gold: phys(0xe6aa3e, 1, 0.24), goldDk: std(0x8f6420, 0.9, 0.38), groove: std(0x25292e, 0.6, 0.5),
      coat: fabric(0x6f4426, true), coatDk: fabric(0x4a2c17), sleeve: fabric(0x6f4426), stitch: std(0xe2c79a, 0, 0.8),
      belt: std(0x3a2618, 0.05, 0.5, { map: TX.leather, normalMap: TX.leatherN }), brass: phys(0xd8b04e, 1, 0.26), button: phys(0x2a1a10, 0.1, 0.3),
      hat: std(0x6a4426, 0, 0.95, { map: TX.felt, normalMap: TX.feltN, normalScale: new T3.Vector2(0.5, 0.5), side: T3.DoubleSide }),
      band: std(0x2c3a6e, 0, 0.6, { map: TX.ribbon, normalMap: TX.ribbonN }),
      eye: new T3.MeshBasicMaterial({ color: lin(0x8ff0ff), toneMapped: false }), eyeHi: new T3.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      ring: phys(0xd8a848, 1, 0.22), lens: phys(0xe6fbff, 0, 0.02, { transparent: true, opacity: 0.16, envMapIntensity: 0.6, clearcoat: 1 }), wood: phys(0x5a3418, 0, 0.45, { clearcoat: 0.8 }),
      leather: std(0x3b2416, 0.05, 0.55, { map: TX.leather, normalMap: TX.leatherN }), paper: std(0xf6ecd6, 0, 0.9), ink: std(0x9a7a52, 0, 0.9), pencil: phys(0xf2c230, 0, 0.4), eraser: std(0xe98aa0, 0, 0.8),
      jet: add(0x4aa8ff, 0.5), jet2: add(0xc9f0ff, 0.85)
    };
    M.labelN = new T3.MeshBasicMaterial({ map: TX.N, transparent: true, depthWrite: false });
    M.labelS = new T3.MeshBasicMaterial({ map: TX.S, transparent: true, depthWrite: false });
    const mesh = (geo, mat, x, y, z, parent) => { const m = new T3.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); (parent || body).add(m); return m; };
    const rounded = (w, h, d, r) => { // rounded box via an extruded rounded rectangle
      const s = new T3.Shape(), x = -w / 2, y = -h / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      const g = new T3.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r * 0.6), bevelEnabled: true, bevelSize: r * 0.6, bevelThickness: r * 0.6, bevelSegments: 3, curveSegments: 6 });
      g.translate(0, 0, -Math.max(0.001, d - 2 * r * 0.6) / 2); return g;
    };
    const flat = (shape, depth) => { const g = new T3.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 }); g.translate(0, 0, -depth / 2); return g; };
    // coat shape: radius at height y (shoulders roll in to a neck at y 0.44), plus soft folds that deepen toward the hem
    const coatR = y => { if (y > 0.3) { const t = Math.min(1, (y - 0.3) / 0.14); return 0.67 + 0.07 * Math.sqrt(Math.max(0, 1 - t * t)); } const u = (0.3 - y) / 0.9; return 0.74 + 0.14 * u * u - 0.035 * Math.exp(-Math.pow((y + 0.2) / 0.09, 2)); };
    const coatFold = (phi, y) => { const below = Math.max(0, (-0.24 - y) / 0.36), front = Math.min(1, Math.abs(Math.sin(phi)) * 4); return 1 + 0.045 * below * below * Math.sin(phi * 11 + 0.6) * front; };
    const coatZ = (x, y) => { const r = coatR(y); if (Math.abs(x) >= r) return 0; const phi = Math.atan2(x, Math.sqrt(r * r - x * x)), rk = r * coatFold(phi, y); return 0.72 * Math.sqrt(Math.max(0, rk * rk - x * x)); }; // front surface of the coat

    const root = new T3.Group(); scene.add(root);
    const body = new T3.Group(); root.add(body);

    // ================= the horseshoe magnet =================
    const LEG = 0.4, LX = 0.41;
    // one continuous U: outer radius 0.61, inner radius 0.21, straight legs up to the pole caps, bevelled edges
    const BEND_Y = 0.36, TOP = 0.83 - BEND_Y, RO = LX + LEG / 2, RI = LX - LEG / 2;
    const U = new T3.Shape();
    U.moveTo(-RO, TOP); U.lineTo(-RO, 0); U.absarc(0, 0, RO, Math.PI, 2 * Math.PI, false); U.lineTo(RO, TOP);
    U.lineTo(RI, TOP); U.lineTo(RI, 0); U.absarc(0, 0, RI, 0, Math.PI, true); U.lineTo(-RI, TOP); U.closePath();
    const uGeo = new T3.ExtrudeGeometry(U, { depth: 0.3, bevelEnabled: true, bevelSize: 0.035, bevelThickness: 0.04, bevelSegments: 4, curveSegments: 40 }); uGeo.translate(0, 0, -0.15);
    const magnetU = mesh(uGeo, M.steel, 0, BEND_Y, 0);
    // a darker inner face along the curve so the U reads clearly
    const inner = mesh(new T3.TorusGeometry(RI + 0.005, 0.012, 6, 40, Math.PI), M.steelDk, 0, BEND_Y, 0.195); inner.rotation.z = Math.PI;
    for (const s of [-1, 1]) {
      mesh(rounded(LEG + 0.01, 0.035, 0.39, 0.012), M.groove, s * LX, 0.825, 0);                       // seam under the pole cap
      mesh(rounded(LEG + 0.02, 0.2, 0.4, 0.06), M.gold, s * LX, 0.93, 0);                              // gold pole cap
      mesh(rounded(LEG - 0.06, 0.03, 0.36, 0.012), M.goldDk, s * LX, 1.035, 0);                         // stepped top
      const lab = mesh(new T3.PlaneGeometry(0.16, 0.16), s < 0 ? M.labelN : M.labelS, s * LX, 0.93, 0.209); lab.renderOrder = 2; // engraved N / S
      mesh(new T3.BoxGeometry(0.26, 0.012, 0.01), M.groove, s * LX, 0.77, 0.19);                        // machined lines
      mesh(new T3.BoxGeometry(0.26, 0.012, 0.01), M.groove, s * LX, 0.745, 0.19);
      mesh(rounded(0.15, 0.27, 0.02, 0.06), M.socket, s * LX, 0.58, 0.15);                              // dark eye socket
      for (const dx of [-0.14, 0.14]) { const r = mesh(new T3.CylinderGeometry(0.018, 0.018, 0.02, 10), M.steelDk, s * LX + dx, 0.36, 0.195); r.rotation.x = Math.PI / 2; } // rivets
    }
    // eyes: glowing capsules with a highlight, sitting in their sockets
    const eyes = [-1, 1].map(s => { const e = mesh(new T3.SphereGeometry(0.075, 18, 14), M.eye, s * LX, 0.58, 0.2); e.scale.set(0.85, 1.55, 0.45);
      const hi = new T3.Mesh(new T3.SphereGeometry(0.022, 8, 6), M.eyeHi); hi.position.set(-0.035, 0.03, 0.06); e.add(hi); return e; });
    const eyeGlow = [-1, 1].map(s => { const sp = new T3.Sprite(new T3.SpriteMaterial({ map: glowTex(), color: 0x58d2ff, transparent: true, opacity: 0.55, blending: T3.AdditiveBlending, depthWrite: false })); sp.position.set(s * LX, 0.58, 0.25); sp.scale.set(0.42, 0.5, 1); body.add(sp); return sp; });

    // ================= trench coat =================
    const coatG = new T3.Group(); coatG.position.y = -0.36; body.add(coatG);
    // ---- coat surface: flared skirt, cinched waist, rounded shoulders rolling up into a neck that the magnet passes through
    const lining = std(0x3a1d16, 0, 0.9, { map: TX.gabS, side: T3.BackSide });
    const coatProfile = [new T3.Vector2(0.001, -0.6)];
    for (let i = 0; i <= 44; i++) { const y = -0.6 + i * (1.04 / 44); coatProfile.push(new T3.Vector2(coatR(y), y)); }
    const coatGeo = new T3.LatheGeometry(coatProfile, 120), cp = coatGeo.attributes.position;
    for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), y = cp.getY(i), z = cp.getZ(i); if (Math.hypot(x, z) < 0.01) continue; const k = coatFold(Math.atan2(x, z), y); cp.setX(i, x * k); cp.setZ(i, z * k); }
    coatGeo.computeVertexNormals();
    const coat = mesh(coatGeo, M.coat, 0, 0, 0, coatG); coat.scale.z = 0.72;
    const coatIn = mesh(coatGeo, lining, 0, 0, 0, coatG); coatIn.scale.z = 0.72;            // inside of the coat, seen through the neck
    // ---- helpers that sit trim ON the surface instead of floating through it
    const onCoat = (x, y, off) => new T3.Vector3(x, y, coatZ(x, y) + off);
    const tube = (pts, r, mat, closed) => mesh(new T3.TubeGeometry(new T3.CatmullRomCurve3(pts, !!closed), pts.length * 4, r, 8, !!closed), mat, 0, 0, 0, coatG);
    const ring = (y, off) => { const pts = []; for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2, r = coatR(y) * coatFold(a, y) + off; pts.push(new T3.Vector3(Math.sin(a) * r, y, Math.cos(a) * r * 0.72)); } return pts; };
    function raised(c, off, thick, mat, nx, ny) { // a padded panel that follows the coat's curve: c = 4 corners [x,y] (TL, TR, BR, BL)
      nx = nx || 10; ny = ny || 8; const P = [], idx = [], uv = [];
      const at = (u, v) => { const x = (c[0][0] * (1 - u) + c[1][0] * u) * (1 - v) + (c[3][0] * (1 - u) + c[2][0] * u) * v, y = (c[0][1] * (1 - u) + c[1][1] * u) * (1 - v) + (c[3][1] * (1 - u) + c[2][1] * u) * v; return [x, y]; };
      for (const layer of [1, 0]) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const [x, y] = at(i / nx, j / ny); P.push(x, y, coatZ(x, y) + off + thick * layer); uv.push(i / nx, j / ny); }
      const id = (l, i, j) => l * (nx + 1) * (ny + 1) + j * (nx + 1) + i;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) idx.push(id(0, i, j), id(0, i, j + 1), id(0, i + 1, j), id(0, i + 1, j), id(0, i, j + 1), id(0, i + 1, j + 1));
      const edge = []; for (let i = 0; i < nx; i++) edge.push([i, 0, i + 1, 0]); for (let j = 0; j < ny; j++) edge.push([nx, j, nx, j + 1]); for (let i = nx; i > 0; i--) edge.push([i, ny, i - 1, ny]); for (let j = ny; j > 0; j--) edge.push([0, j, 0, j - 1]);
      edge.forEach(([i0, j0, i1, j1]) => idx.push(id(0, i0, j0), id(1, i0, j0), id(0, i1, j1), id(0, i1, j1), id(1, i0, j0), id(1, i1, j1)));
      const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      return mesh(g, mat, 0, 0, 0, coatG);
    }
    const normalY = (x, y) => Math.atan2(x, coatZ(x, y) / 0.5184); // turn a part to face out from the coat

    // hem roll + top-stitching that follow the folds
    tube(ring(-0.585, 0.004), 0.022, M.coatDk, true);
    const stitches = [], d3 = new T3.Object3D();
    for (let a = -1.6; a <= 1.6; a += 0.04) { const y = -0.535, r = coatR(y) * coatFold(a, y) + 0.004; stitches.push([Math.sin(a) * r, y, Math.cos(a) * r * 0.72, a, 0]); }
    for (const sx of [-0.045, 0.045]) for (let y = -0.27; y > -0.56; y -= 0.024) stitches.push([sx, y, coatZ(sx, y) + 0.012, normalY(sx, y), Math.PI / 2]);
    const stM = new T3.InstancedMesh(new T3.BoxGeometry(0.014, 0.004, 0.005), M.stitch, stitches.length);
    stitches.forEach(([x, y, z, ry, rz], i) => { d3.position.set(x, y, z); d3.rotation.set(0, ry, rz); d3.updateMatrix(); stM.setMatrixAt(i, d3.matrix); }); coatG.add(stM);

    // stand-up collar around the neck, open at the front, with a lining and a rolled top edge
    const collarGeo = new T3.CylinderGeometry(0.78, 0.68, 0.17, 72, 1, true, 0.8, Math.PI * 2 - 1.6);
    const collar = mesh(collarGeo, M.coatDk, 0, 0.52, 0, coatG); collar.scale.z = 0.72; mesh(collarGeo, lining, 0, 0.52, 0, coatG).scale.z = 0.72;
    const collarRim = []; for (let i = 0; i <= 40; i++) { const t = 0.8 + i / 40 * (Math.PI * 2 - 1.6); collarRim.push(new T3.Vector3(Math.sin(t) * 0.78, 0.605, Math.cos(t) * 0.78 * 0.72)); } tube(collarRim, 0.014, M.coatDk);
    // padded notched lapels
    for (const s of [-1, 1]) {
      const L = c => c.map(([x, y]) => [s * x, y]), ord = c => s > 0 ? c : [c[1], c[0], c[3], c[2]];
      raised(ord(L([[0.12, 0.43], [0.4, 0.37], [0.15, -0.02], [0.035, -0.05]])), 0.004, 0.02, M.coatDk, 12, 10);
      raised(ord(L([[0.4, 0.37], [0.5, 0.33], [0.42, 0.27], [0.33, 0.28]])), 0.004, 0.018, M.coatDk, 4, 3); // collar notch tab
      const edge = []; for (let i = 0; i <= 10; i++) { const t = i / 10, x = s * (0.39 + (0.145 - 0.39) * t), y = 0.36 + (-0.02 - 0.36) * t; edge.push(onCoat(x, y, 0.028)); } tube(edge, 0.005, M.stitch);
    }
    // front placket and double-breasted buttons
    raised([[-0.03, -0.24], [0.03, -0.24], [0.03, -0.585], [-0.03, -0.585]], 0.002, 0.008, M.coatDk, 2, 12);
    for (const [x, y] of [[-0.17, -0.09], [0.17, -0.09], [-0.13, -0.38], [0.13, -0.38], [-0.14, -0.49], [0.14, -0.49]]) {
      const p = onCoat(x, y, 0.004), b = mesh(new T3.CylinderGeometry(0.027, 0.027, 0.018, 18), M.button, p.x, p.y, p.z, coatG); b.rotation.set(Math.PI / 2, 0, 0); b.rotation.y = normalY(x, y);
      const rb = mesh(new T3.TorusGeometry(0.027, 0.006, 8, 18), M.brass, p.x, p.y, p.z + 0.009, coatG); rb.rotation.y = normalY(x, y);
    }
    // belt hugging the waist, loops, buckle and tail
    const beltR = coatR(-0.2) + 0.004;
    const belt = mesh(new T3.TorusGeometry(beltR, 0.04, 12, 120), M.belt, 0, -0.2, 0, coatG); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.72; belt.scale.z = 1.6;
    for (const x of [-0.5, 0.5]) raised(x > 0 ? [[x - 0.02, -0.12], [x + 0.02, -0.12], [x + 0.02, -0.28], [x - 0.02, -0.28]] : [[x - 0.02, -0.12], [x + 0.02, -0.12], [x + 0.02, -0.28], [x - 0.02, -0.28]], 0.045, 0.012, M.coatDk, 2, 4);
    const bz = coatZ(0, -0.2) + 0.045;
    const buckle = mesh(new T3.TorusGeometry(0.075, 0.016, 8, 4), M.brass, 0, -0.2, bz, coatG); buckle.rotation.z = Math.PI / 4; buckle.scale.set(1.2, 1, 1);
    mesh(new T3.BoxGeometry(0.012, 0.1, 0.012), M.brass, 0, -0.2, bz + 0.012, coatG);
    const tail = mesh(rounded(0.075, 0.2, 0.014, 0.03), M.belt, 0.15, -0.3, coatZ(0.15, -0.3) + 0.04, coatG); tail.rotation.set(0, normalY(0.15, -0.3), 0.22);
    // padded pocket flaps with a button each
    for (const s of [-1, 1]) {
      const c = [[0.3, -0.27], [0.53, -0.27], [0.52, -0.345], [0.31, -0.345]].map(([x, y]) => [s * x, y]);
      raised(s > 0 ? c : [c[1], c[0], c[3], c[2]], 0.003, 0.016, M.coatDk, 8, 3);
      const p = onCoat(s * 0.415, -0.325, 0.02), pb = mesh(new T3.CylinderGeometry(0.014, 0.014, 0.01, 12), M.button, p.x, p.y, p.z, coatG); pb.rotation.set(Math.PI / 2, 0, 0);
    }
    // star badge
    const star = new T3.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.035 : 0.075; star[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
    const bp = onCoat(0.34, 0.12, 0.012), badge = mesh(flat(star, 0.015), M.brass, bp.x, bp.y, bp.z, coatG); badge.rotation.y = normalY(0.34, 0.12);
    const bc = mesh(new T3.CylinderGeometry(0.022, 0.022, 0.03, 12), M.goldDk, bp.x, bp.y, bp.z + 0.004, coatG); bc.rotation.set(Math.PI / 2, 0, 0);
    // sleeves growing out of rounded shoulders, cuffs + little steel mitten hands
    const arms = [-1, 1].map(s => { const a = new T3.Group(); a.position.set(s * 0.82, -0.1, 0.02); body.add(a);
      mesh(new T3.SphereGeometry(0.13, 24, 16), M.sleeve, 0, 0.01, 0, a); // shoulder
      const sl = mesh(new T3.CylinderGeometry(0.115, 0.14, 0.46, 32, 4, true), M.sleeve, s * 0.05, -0.22, 0, a); sl.rotation.z = s * 0.22;
      const cuff = mesh(new T3.CylinderGeometry(0.15, 0.15, 0.07, 32), M.coatDk, s * 0.1, -0.44, 0, a); cuff.rotation.z = s * 0.22;
      mesh(new T3.TorusGeometry(0.145, 0.006, 4, 32), M.stitch, s * 0.095, -0.415, 0, a).rotation.set(Math.PI / 2, 0, s * 0.22);
      mesh(new T3.SphereGeometry(0.09, 16, 12), M.steel, s * 0.12, -0.53, 0, a);
      const thumb = new T3.Group(); thumb.position.set(s * 0.12, -0.53, 0); a.add(thumb); a.userData.thumb = thumb; a.userData.side = s; // thumb pivots at the fist
      const tm = mesh(new T3.SphereGeometry(0.04, 14, 10), M.steel, 0, 0.085, 0, thumb); tm.scale.set(0.9, 2.1, 0.9);
      thumb.rotation.set(1.2, 0, -s * 0.5); // resting: tucked forward
      return a; });

    // ================= fedora, tipped on the N pole =================
    const hat = new T3.Group(); hat.position.set(-LX, 1.08, 0); hat.rotation.z = 0.22; body.add(hat);
    const brimP = [new T3.Vector2(0.2, 0.01), new T3.Vector2(0.3, -0.004), new T3.Vector2(0.38, 0.0), new T3.Vector2(0.43, 0.02), new T3.Vector2(0.455, 0.05)];
    const brim = mesh(new T3.LatheGeometry(brimP, 72), M.hat, 0, 0, 0, hat); brim.scale.z = 0.88;
    const brimEdge = mesh(new T3.TorusGeometry(0.455, 0.01, 6, 40), M.coatDk, 0, 0.05, 0, hat); brimEdge.rotation.x = Math.PI / 2; brimEdge.scale.y = 0.88;
    const crownP = [new T3.Vector2(0.27, 0), new T3.Vector2(0.265, 0.12), new T3.Vector2(0.25, 0.24), new T3.Vector2(0.2, 0.3), new T3.Vector2(0.1, 0.29), new T3.Vector2(0.04, 0.26), new T3.Vector2(0.001, 0.25)];
    const crown = mesh(new T3.LatheGeometry(crownP, 72), M.hat, 0, 0, 0, hat); crown.scale.z = 0.85;
    const crease = mesh(new T3.BoxGeometry(0.035, 0.03, 0.34), M.coatDk, 0, 0.27, 0, hat); crease.scale.set(1, 1, 1);
    const band = mesh(new T3.CylinderGeometry(0.272, 0.272, 0.07, 72, 1, true), M.band, 0, 0.055, 0, hat); band.scale.z = 0.85;
    for (const r of [0.5, -0.5]) { const bow = mesh(rounded(0.08, 0.05, 0.02, 0.015), M.band, 0.27, 0.06, 0.04, hat); bow.rotation.set(0, Math.PI / 2, r); }

    // ================= floating magnifier, notebook and pencil =================
    const magG = new T3.Group(); root.add(magG);
    mesh(new T3.TorusGeometry(0.17, 0.028, 12, 36), M.ring, 0, 0, 0, magG);
    mesh(new T3.TorusGeometry(0.15, 0.008, 6, 36), M.goldDk, 0, 0, 0.02, magG);
    const lens = mesh(new T3.SphereGeometry(0.16, 24, 12), M.lens, 0, 0, 0, magG); lens.scale.z = 0.18;
    const hG = new T3.Group(); hG.position.set(0.13, -0.13, 0); hG.rotation.z = 0.78; magG.add(hG);
    mesh(new T3.CylinderGeometry(0.03, 0.03, 0.06, 12), M.ring, 0, -0.06, 0, hG);
    mesh(new T3.CylinderGeometry(0.032, 0.038, 0.24, 12), M.wood, 0, -0.2, 0, hG);
    mesh(new T3.SphereGeometry(0.038, 10, 8), M.ring, 0, -0.33, 0, hG);
    const book = new T3.Group(); root.add(book); book.position.set(0.98, -0.72, 0.1); book.rotation.set(0.2, -0.4, 0.15);
    mesh(rounded(0.23, 0.3, 0.05, 0.015), M.leather, 0, 0, 0, book);
    mesh(new T3.BoxGeometry(0.2, 0.28, 0.035), M.paper, 0.01, 0, 0.004, book);
    mesh(new T3.BoxGeometry(0.012, 0.31, 0.056), M.belt, 0.07, 0, 0, book); // elastic band
    for (const y of [0.08, 0.02, -0.04, -0.1]) mesh(new T3.BoxGeometry(0.11, 0.008, 0.002), M.ink, -0.02, y, 0.027, book);
    const pencil = new T3.Group(); pencil.position.set(-0.17, 0.02, 0.06); pencil.rotation.z = 0.35; book.add(pencil);
    mesh(new T3.CylinderGeometry(0.016, 0.016, 0.26, 6), M.pencil, 0, 0, 0, pencil);
    mesh(new T3.ConeGeometry(0.016, 0.05, 6), M.paper, 0, -0.155, 0, pencil).rotation.x = Math.PI;
    mesh(new T3.CylinderGeometry(0.017, 0.017, 0.03, 8), M.ring, 0, 0.145, 0, pencil);
    mesh(new T3.CylinderGeometry(0.016, 0.016, 0.03, 8), M.eraser, 0, 0.175, 0, pencil);

    // ================= jet flame + sparks =================
    const jet = mesh(new T3.ConeGeometry(0.3, 0.8, 20, 1, true), M.jet, 0, -1.3, 0); jet.rotation.x = Math.PI;
    const jet2 = mesh(new T3.ConeGeometry(0.15, 0.5, 14, 1, true), M.jet2, 0, -1.17, 0); jet2.rotation.x = Math.PI;
    mesh(new T3.CylinderGeometry(0.2, 0.26, 0.06, 20), M.steelDk, 0, -0.98, 0); // nozzle ring under the coat
    const jetGlow = new T3.Sprite(new T3.SpriteMaterial({ map: glowTex(), color: 0x4aa8ff, transparent: true, opacity: 0.8, blending: T3.AdditiveBlending, depthWrite: false })); jetGlow.position.set(0, -1.07, 0.1); jetGlow.scale.set(1.1, 0.7, 1); body.add(jetGlow);
    const NS = 46, sPos = new Float32Array(NS * 3), sCol = new Float32Array(NS * 3), sp = [];
    for (let i = 0; i < NS; i++) sp.push({ life: Math.random(), x: 0, z: 0, vx: 0, vz: 0, sp: 0 });
    const sGeo = new T3.BufferGeometry(); sGeo.setAttribute('position', new T3.BufferAttribute(sPos, 3)); sGeo.setAttribute('color', new T3.BufferAttribute(sCol, 3));
    const sparks = new T3.Points(sGeo, new T3.PointsMaterial({ map: glowTex(), size: 0.09, vertexColors: true, transparent: true, depthWrite: false, blending: T3.AdditiveBlending })); body.add(sparks);
    // gold sparkles for the happy mood
    const twinkles = [[-0.95, 0.85], [1.05, 0.8], [-1.0, -0.2], [1.1, -0.3]].map(([x, y]) => { const s2 = new T3.Sprite(new T3.SpriteMaterial({ map: glowTex(), color: 0xffd36b, transparent: true, opacity: 0, blending: T3.AdditiveBlending, depthWrite: false })); s2.position.set(x, y, 0.3); s2.scale.set(0.25, 0.25, 1); root.add(s2); return s2; });

    function glowTex() {
      if (FluxSprite._glow) return FluxSprite._glow;
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return (FluxSprite._glow = new T3.CanvasTexture(c));
    }

    let mood = '', talkT = 0, moodT = 0, w = 0, h = 0;
    const magPos = new T3.Vector3(1.0, 0.25, 0.15);
    function draw(t, dt) {
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (cw && ch && (cw !== w || ch !== h)) { w = cw; h = ch; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      talkT = Math.max(0, talkT - dt); moodT += dt;
      // idle float + gentle turn so he reads as 3D
      root.position.y = Math.sin(t * 2.1) * 0.07;
      body.rotation.y = Math.sin(t * 0.7) * 0.32 + (mood === 'think' ? 0.25 : 0);
      body.rotation.z = Math.sin(t * 1.3) * 0.035;
      hat.rotation.z = 0.22 + Math.sin(t * 2.1 - 0.8) * 0.05;
      arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (0.05 + Math.sin(t * 2.1 + i) * 0.06); });
      arms.forEach(a => { a.rotation.x = 0; a.userData.thumb.rotation.set(1.2, 0, -a.userData.side * 0.5); a.userData.thumb.scale.setScalar(1); });
      if (mood === 'wow') { // thumbs up: left fist comes up in front, thumb pointing at the sky, little happy bob
        const k = Math.min(1, moodT / 0.25), r = arms[0];
        root.position.y += Math.sin(Math.min(1, moodT / 0.5) * Math.PI) * 0.1;
        body.rotation.y = body.rotation.y * (1 - k) + 0.12 * k;
        r.rotation.set(-1.55 * k + Math.sin(t * 6) * 0.05 * k, 0, 0.55 * k); r.userData.thumb.scale.setScalar(1 + 0.6 * k);
        r.updateMatrixWorld(); const q = new T3.Quaternion(); r.getWorldQuaternion(q); q.invert(); r.userData.thumb.quaternion.copy(q);
      }
      if (mood === 'oops') { body.rotation.z += Math.sin(moodT * 26) * 0.12 * Math.max(0, 1 - moodT / 0.9); }
      if (mood === 'think') arms[1].rotation.z = 0.6; // raises a hand to hold the magnifier
      // eyes: blink, squint, droop, brighten while talking
      const blink = (t % 4.3) > 4.16 ? 0.12 : 1;
      eyes.forEach((e, i) => {
        let sy = 1.55 * blink;
        if (mood === 'oops') sy = 0.75; else if (mood === 'think' && i === 0) sy = 0.6; else if (mood === 'wow') sy = 1.85 * blink;
        e.scale.y += (sy - e.scale.y) * Math.min(1, dt * 18); e.rotation.z = mood === 'oops' ? (i ? 0.5 : -0.5) : 0;
      });
      const glow = 0.5 + (talkT > 0 ? 0.35 : 0) + (mood === 'wow' ? 0.25 : 0); eyeGlow.forEach(g => { g.material.opacity = glow + Math.sin(t * 5) * 0.06; });
      // jet flicker + sparks streaming down
      const f = 1 + Math.sin(t * 31) * 0.1 + Math.sin(t * 17) * 0.08; jet.scale.set(1, f, 1); jet2.scale.set(1, 1 + Math.sin(t * 23) * 0.15, 1); jetLight.intensity = 1 + Math.sin(t * 29) * 0.25;
      sp.forEach((p, i) => {
        p.life += dt * (1.4 + p.sp);
        if (p.life >= 1) { p.life = 0; const a = Math.random() * 6.283, r = Math.random() * 0.14; p.x = Math.cos(a) * r; p.z = Math.sin(a) * r; p.vx = (Math.random() - 0.5) * 0.5; p.vz = (Math.random() - 0.5) * 0.3; p.sp = Math.random(); }
        const L = p.life, k = (1 - L) * (1 - L);
        sPos[i * 3] = p.x + p.vx * L; sPos[i * 3 + 1] = -1.07 - L * 0.8; sPos[i * 3 + 2] = p.z + p.vz * L + 0.05;
        sCol[i * 3] = 0.45 * k; sCol[i * 3 + 1] = 0.75 * k; sCol[i * 3 + 2] = 1.0 * k;
      });
      sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true;
      twinkles.forEach((s2, i) => { const on = mood === 'wow' ? Math.max(0, Math.sin(t * 8 + i * 1.7)) : 0; s2.material.opacity = on; s2.scale.setScalar(0.15 + on * 0.2); });
      // magnifier: floats beside him, or comes up to his right eye when he's thinking
      const tgt = mood === 'think' ? new T3.Vector3(LX, 0.58 + root.position.y, 0.55) : new T3.Vector3(1.0, 0.1 + Math.sin(t * 2.6 + 1) * 0.08 + root.position.y, 0.15);
      magPos.lerp(tgt, Math.min(1, dt * 6)); magG.position.copy(magPos); magG.rotation.z = Math.sin(t * 1.7) * 0.15; magG.rotation.y = Math.sin(t * 0.9) * 0.3;
      book.position.y = -0.72 + Math.sin(t * 2 + 2.4) * 0.06 + root.position.y * 0.5; book.rotation.z = 0.15 + Math.sin(t * 1.4) * 0.08;
      renderer.render(scene, camera);
    }
    return { draw, setMood(m) { if ((m || '') !== mood) moodT = 0; mood = m || ''; }, talk() { talkT = 0.4; } };
  }

  // ------------------------------------------------------------------ brain: device-aware advice
  // Each returns { text, mood } describing the most useful next thing, explicit after the player has failed once.
  const roomOf = where => where.split('·')[0].trim();
  function faraday(C, S, explicit) {
    const P = C.puzzles.faraday, s = S.set || { pole: 'N', motion: 'insert', v: 2 };
    if (S.solved) return { text: 'Solved! Press <b>Esc</b> and follow the arrows.', mood: 'wow' };
    const lab = { insert: 'Plunge in', withdraw: 'Yank out', through: 'Drop through' }, shape = { insert: 'moves away from 0 and stays there', withdraw: 'starts far from 0 and returns to 0', through: 'goes out and comes back' };
    if (s.pole !== P.pole) return explicit ? { text: 'The top graph goes <b>' + (P.pole === 'N' ? 'above' : 'below') + '</b> zero, so the <b>' + P.pole + '</b> pole faced the coil.', mood: 'think' }
      : { text: 'Check the <b>pole</b>: is the top amber graph above or below zero?', mood: 'think' };
    if (s.motion !== P.motion) return explicit ? { text: 'Pole is right! The top graph ' + shape[P.motion] + ' → pick <b>' + lab[P.motion] + '</b>.', mood: 'think' }
      : { text: 'Pole is right! 👍 Now the <b>motion</b>: does the top graph stay away, return to 0, or go out and back?', mood: 'think' };
    if (Math.abs(s.v - P.v) > 0.01) return explicit ? { text: 'Pole and motion are right! Set the speed to <b>' + P.v.toFixed(1) + ' m/s</b>.', mood: 'think' }
      : { text: 'Pole and motion are right! Your magnet is too <b>' + (s.v > P.v ? 'fast' : 'slow') + '</b> — slide the speed ' + (s.v > P.v ? 'down' : 'up') + '.', mood: 'think' };
    return { text: 'Everything matches — press <b>Run reconstruction</b>!', mood: 'wow' };
  }
  function survey(C, S, explicit, ap) {
    const H = C.hunt, pan = LAB.PANELS.find(p => p.id === H.target);
    if (S.done || S.solved) return { text: 'Found it! Press <b>Esc</b> and head for the next arrow.', mood: 'wow' };
    const n = (S.samples || []).filter(q => q.kind !== 'fil').length;
    if (!S.samples || !S.samples.length) return { text: 'The map is empty! Close this, press <b>1</b> and <b>click</b> around the lab to log readings.', mood: 'think' };
    if (n < 6) return { text: 'Only ' + n + ' reading' + (n === 1 ? '' : 's') + '. Go log more near the <b>P</b> panels — then come back.', mood: 'think' };
    if (!ap && H.decoys.length && !S.sub) return { text: 'Those orange machines make fields too. Press <b>Subtract known</b> to remove them.', mood: 'think' };
    const wrong = (S.cleared || []).length;
    if (wrong >= 2 || (explicit && wrong)) return { text: 'The leftover field points to <b>' + pan.id + '</b> (' + roomOf(pan.where) + '). Breach it!', mood: 'think' };
    const near = (S.samples || []).some(q => Math.hypot(q.x - pan.x, q.z - pan.z) < 4);
    if ((wrong || explicit) && !near) return { text: 'You haven\'t measured near the hidden magnet yet. Try logging readings in the <b>' + roomOf(pan.where) + '</b>.', mood: 'think' };
    if (wrong || explicit) return { text: 'Look in the <b>' + roomOf(pan.where) + '</b> — the arrows are biggest there.', mood: 'think' };
    return { text: 'Find where the arrows are <b>longest</b>, then click the nearest <b>P</b> marker.', mood: 'think' };
  }
  function ampere(C, S, explicit, root) {
    const P = C.puzzles.ampere, feed = P.wires.find(w => w.kind === 'feed'), tap = P.wires.find(w => w.id === P.tap), st = S.stage || 1;
    const inBox = () => { const L = S.lasso; if (!L) return null; const x1 = Math.min(L.x1, L.x2), x2 = Math.max(L.x1, L.x2), y1 = Math.min(L.y1, L.y2), y2 = Math.max(L.y1, L.y2);
      return P.wires.filter(w => { const x = w.cx * 60 + 30, y = w.cy * 60 + 30; return x > x1 && x < x2 && y > y1 && y < y2; }); };
    const box = inBox();
    if (st === 1) {
      if (!box) return { text: 'Drag a box around the red <b>MAGLOCK FEED</b> wire.', mood: 'think' };
      if (!box.length) return { text: 'Your box is empty — drag it around the red circle (' + feed.tag + ').', mood: 'think' };
      if (box.length > 1 || box[0] !== feed) return { text: 'Your box has ' + (box.includes(feed) ? box.length + ' wires' : 'the wrong wire') + ' — box <b>only</b> ' + feed.tag + '.', mood: 'think' };
      return { text: 'Got it! Type <b>' + Math.abs(feed.I).toFixed(1) + '</b> and pick <b>' + (feed.I > 0 ? '⊙ out' : '⊗ in') + '</b>.', mood: 'think' };
    }
    if (st === 2) {
      const c = root.querySelector('#aC'), d = root.querySelector('#aP'), v = c ? parseFloat(c.value) : NaN;
      if (d && d.value === '1') return { text: '<b>Aiding</b> makes the lock stronger! Pick <b>Opposing</b>.', mood: 'oops' };
      // thermal drift (Case 03): the lock field sags over time, so the needed counter-current is lower — read the live % from the panel
      const kEl = root.querySelector('#aK'), m = kEl && kEl.textContent.match(/([\d.]+)%/), drift = m ? parseFloat(m[1]) / 100 : 1;
      const need = P.nL * P.Il * drift / P.nC, sum = P.nL + '×' + P.Il.toFixed(1) + (drift < 0.999 ? '×' + drift.toFixed(3) : '') + ' ÷ ' + P.nC;
      if (!(v > 0)) return { text: 'Use I = n<sub>lock</sub>×I<sub>lock</sub>' + (drift < 0.999 ? '×drift' : '') + ' ÷ n<sub>sol</sub> = ' + sum + '.', mood: 'think' };
      const err = (v - need) / need;
      if (Math.abs(err) > 0.012) {
        if (drift < 0.999 && Math.abs(v - P.Ic) / P.Ic < 0.012) return { text: 'Careful — the lock has drifted to <b>' + (drift * 100).toFixed(1) + '%</b>. Multiply by that too: ' + sum + ' ≈ <b>' + need.toFixed(2) + ' A</b>.', mood: 'oops' };
        return explicit ? { text: 'Right now you need about <b>' + need.toFixed(2) + ' A</b>' + (drift < 0.999 ? ' — it keeps drifting, so test quickly' : '') + '.', mood: 'think' } : { text: 'Too ' + (err > 0 ? 'high' : 'low') + '. Check: ' + sum + '.', mood: 'think' };
      }
      return { text: 'That cancels it — press <b>Test bypass</b>!', mood: 'wow' };
    }
    if (st === 3) {
      if (box && box.length === 1 && box[0].kind === 'circuit') return box[0] === tap ? { text: 'That\'s it! ' + tap.tag + ' carries ' + P.Ic.toFixed(1) + ' A — pick it in the list.', mood: 'wow' } : { text: box[0].tag + ' carries ' + Math.abs(box[0].I).toFixed(1) + ' A — not ' + P.Ic.toFixed(1) + ' A. Try another wire.', mood: 'think' };
      return { text: 'Box the other wires one at a time. Which one carries <b>' + P.Ic.toFixed(1) + ' A</b>?', mood: 'think' };
    }
    if (st === 4) return { text: 'Press <b>Esc</b>, grab the <b>wand [3]</b> and follow ' + tap.tag + '\'s buzz to its outlet!', mood: 'think' };
    return { text: 'Solved! Press <b>Esc</b>.', mood: 'wow' };
  }
  function eddy(C, S, explicit) {
    const P = C.puzzles.eddy, set = S.set || { mat: 'pvc', t: 2 }, last = (S.trials || [])[S.trials ? S.trials.length - 1 : 0], m = id => LAB.MATS.find(x => x.id === id);
    if (S.solved) return { text: 'Solved! Press <b>Esc</b>.', mood: 'wow' };
    if (!last) return { text: 'Try <b>PVC</b> first — no metal, so it falls fastest. Then compare.', mood: 'think' };
    if (last.mat !== set.mat || last.t !== set.t) return { text: 'New settings — press <b>Drop canister</b> to test them.', mood: 'think' };
    if (explicit) return { text: 'Try <b>' + m(P.mat).name + '</b>, <b>' + P.t + ' mm</b>.', mood: 'think' };
    const fast = last.T < P.Tlog;
    return { text: 'That took ' + last.T.toFixed(2) + ' s, but the log says ' + P.Tlog.toFixed(2) + ' s. Too ' + (fast ? 'fast → use <b>more metal</b> (better conductor or thicker).' : 'slow → use <b>less metal</b> (weaker conductor or thinner).'), mood: 'think' };
  }
  function massspec(C, S, explicit) {
    const P = C.puzzles.massspec, set = S.set || { V: 2000, B: 0.4, dir: 'in' }, iso = LAB.ISOTOPES.find(i => i.id === P.iso);
    if (S.solved) return { text: 'Solved! Press <b>Esc</b>.', mood: 'wow' };
    if (S.hit) return { text: 'It hit! Read m/|q| and pick the ion with that mass' + (explicit ? ': <b>' + iso.label + '</b>.' : '.'), mood: 'think' };
    const dir = (iso.q > 0) === (P.side === 'up') ? 'in' : 'out';
    if (set.dir !== dir) return explicit ? { text: 'Pick <b>' + (dir === 'in' ? '⊗ into screen' : '⊙ out of screen') + '</b> so it bends ' + (P.side === 'up' ? 'up' : 'down') + '.', mood: 'think' } : { text: 'The slit is <b>' + (P.side === 'up' ? 'above' : 'below') + '</b>. If the beam bends the wrong way, flip the field.', mood: 'think' };
    const need = Math.sqrt(2.0729e-8 * iso.m * set.V) / (P.D / 2), err = (set.B - need) / need;
    if (Math.abs(err) > 0.007) return explicit ? { text: 'With ' + set.V + ' V, set B ≈ <b>' + need.toFixed(3) + ' T</b>.', mood: 'think' } : { text: 'B is too <b>' + (err > 0 ? 'strong' : 'weak') + '</b> — the circle is too ' + (err > 0 ? 'small' : 'big') + '. ' + (err > 0 ? 'Lower' : 'Raise') + ' B.', mood: 'think' };
    return { text: 'Looks right — press <b>Fire beam</b>!', mood: 'wow' };
  }
  const ATTR = { faraday: 'side', ampere: 'circuit', eddy: 'stock', massspec: 'isotope' };
  function board(C, S, explicit, root) {
    const who = C.suspects.find(s => s.id === C.culpritId), done = C.def.puzzles.filter(p => (C.state[p] || {}).solved);
    const clash = s => { for (const p of done) { const a = ATTR[p]; if (s.attrs[a] !== who.attrs[a]) return s.log[C.attrs.indexOf(a)]; } return null; };
    const left = C.suspects.filter(s => !clash(s)), val = id => (root.querySelector('#' + id) || {}).value || '';
    if (!done.length) return { text: 'Verify an instrument first — then its fact appears here.', mood: 'think' };
    const pick = val('qWho');
    if (!pick) return left.length === 1 ? (explicit ? { text: 'Only <b>' + left[0].name + '</b> matches every fact!', mood: 'think' } : { text: 'Compare each log with your facts. Only <b>one</b> suspect fits them all.', mood: 'think' })
      : { text: 'Cross out ' + C.suspects.filter(s => clash(s)).map(s => s.name).join(', ') + ' — their logs clash with your facts.', mood: 'think' };
    const chosen = C.suspects.find(s => s.id === pick), c = clash(chosen);
    if (c) return { text: chosen.name + '\'s log says “' + c + '” — that clashes with your fact.', mood: 'oops' };
    if (left.length > 1 && chosen !== who) return { text: 'Possible, but more facts are needed to be sure.', mood: 'think' };
    for (let i = 0; i < C.methods.length; i++) { const v = val('qM' + i); if (!v) return { text: 'Now answer: <b>' + C.methods[i].q + '</b> Your instrument fact says how.', mood: 'think' };
      if (v !== C.methods[i].answer) return { text: 'Re-read your fact — the method doesn\'t match it.', mood: 'oops' }; }
    const where = val('qWhere');
    if (!where) return { text: 'Where is the pod? It\'s the panel you breached in the Field Survey.', mood: 'think' };
    if (where !== C.hunt.target) return { text: 'Your Field Survey found the pod behind <b>' + C.hunt.target + '</b>, not ' + where + '.', mood: 'oops' };
    return { text: 'Everything checks out — press <b>File accusation</b>!', mood: 'wow' };
  }
  const FluxBrain = {
    advise(id, C, explicit, root) {
      const S = C.state[id] || {};
      try {
        if (id === 'faraday') return faraday(C, S, explicit);
        if (id === 'survey') return survey(C, S, explicit, C.ap);
        if (id === 'ampere') return ampere(C, S, explicit, root);
        if (id === 'eddy') return eddy(C, S, explicit);
        if (id === 'massspec') return massspec(C, S, explicit);
        if (id === 'board') return board(C, S, explicit, root);
      } catch (e) { /* never let the sidekick break a puzzle */ }
      return null;
    }
  };

  window.FluxSprite = FluxSprite; window.FluxBrain = FluxBrain;
})();

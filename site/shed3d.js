/* Живая модель хозблока Листвич: размер и опции из конструктора сразу видны на постройке.
   Без сборщика: ES-модуль, three.js лежит в ./vendor. */
import * as THREE from './vendor/three.module.js';

const BOARD = 0.143;          // ширина доски имитации бруса, м
const FLOOR_H = 0.15;         // обвязка 100×150
const H_FRONT = 2.45, H_BACK = 2.15;

export const PAINTS = {
  natural:    { name: 'Без покраски',      base: '#E6C690', groove: '#B48C55', grain: '#C9A26A' },
  teak:       { name: 'Тик',               base: '#C27838', groove: '#7E4618', grain: '#A65F28' },
  oak:        { name: 'Морёный дуб',       base: '#6E4B30', groove: '#3A2617', grain: '#5A3B24' },
  anthracite: { name: 'Серый антрацит',    base: '#585D5F', groove: '#2E3133', grain: '#4C5052' },
  red:        { name: 'Красная охра',      base: '#9E3F2A', groove: '#5E2216', grain: '#8A3523' },
  olive:      { name: 'Олива',             base: '#7A7651', groove: '#4A472E', grain: '#6A6646' },
};

/* ---------- текстуры ---------- */
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function woodCanvas(p, seed = 7) {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), r = rng(seed);
  const boards = Math.round(1 / BOARD), bh = S / boards;
  for (let b = 0; b < boards; b++) {
    const y = b * bh;
    const grd = g.createLinearGradient(0, y, 0, y + bh);
    grd.addColorStop(0, shade(p.base, 0.05)); grd.addColorStop(0.5, p.base); grd.addColorStop(1, shade(p.base, -0.06));
    g.fillStyle = grd; g.fillRect(0, y, S, bh);
    // волокна
    g.globalAlpha = 0.22; g.strokeStyle = p.grain;
    for (let k = 0; k < 9; k++) {
      g.lineWidth = 0.6 + r() * 1.4; g.beginPath();
      let yy = y + 4 + r() * (bh - 8); g.moveTo(0, yy);
      for (let x = 0; x <= S; x += 32) { yy += (r() - 0.5) * 2.2; g.lineTo(x, Math.min(y + bh - 3, Math.max(y + 3, yy))); }
      g.stroke();
    }
    // сучки
    g.globalAlpha = 0.35; g.fillStyle = p.groove;
    if (r() > 0.55) { const kx = r() * S, ky = y + bh * (0.3 + r() * 0.4); g.beginPath(); g.ellipse(kx, ky, 5 + r() * 6, 3 + r() * 2, 0, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    // паз
    g.fillStyle = p.groove; g.fillRect(0, y + bh - 4, S, 4);
    g.fillStyle = shade(p.base, 0.22); g.fillRect(0, y, S, 1.5);
  }
  return c;
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
function roofCanvas(color = '#7A7F82') {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, S, S);
  const rib = S / 5; // МП-20: волна ~0.2 м
  for (let i = 0; i < 5; i++) {
    const x = i * rib; const grd = g.createLinearGradient(x, 0, x + rib, 0);
    grd.addColorStop(0, shade(color, -0.25)); grd.addColorStop(0.18, shade(color, 0.18)); grd.addColorStop(0.32, color); grd.addColorStop(1, shade(color, -0.08));
    g.fillStyle = grd; g.fillRect(x, 0, rib, S);
  }
  return c;
}
function groundCanvas() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S / 2);
  grd.addColorStop(0, 'rgba(176,184,140,0.8)'); grd.addColorStop(0.5, 'rgba(190,192,150,0.55)'); grd.addColorStop(1, 'rgba(190,198,150,0)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const r = rng(3); g.globalAlpha = 0.18;
  for (let i = 0; i < 2600; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * S * 0.42; g.fillStyle = r() > 0.5 ? '#6F844A' : '#B8C68C'; g.fillRect(S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, 2, 3); }
  return c;
}

/* ---------- геометрия ---------- */
function uvBox(geo, w, h, d) {
  const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0], uv.getY(i) * dims[f][1]); }
  uv.needsUpdate = true; return geo;
}
const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const seg = (t, a, b) => easeOut((t - a) / (b - a));

export function createShed(host, opts = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas'); canvas.className = 'shed3d-canvas'; host.appendChild(canvas);
  const labels = document.createElement('div'); labels.className = 'shed3d-labels'; host.appendChild(labels);
  const mkLabel = (cls) => { const d = document.createElement('span'); d.className = 'shed3d-dim ' + cls; labels.appendChild(d); return d; };
  const labL = mkLabel('is-l'), labW = mkLabel('is-w'), labT = mkLabel('is-t'), labD = mkLabel('is-d');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight('#F4F1E8', '#8A8F6A', 1.35));
  const sun = new THREE.DirectionalLight('#FFF3DC', 2.4);
  sun.position.set(6, 11, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02; sun.shadow.radius = 4;
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(17, 17), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(groundCanvas()), transparent: true, depthWrite: false }));
  ground.material.map.colorSpace = THREE.SRGBColorSpace;
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), new THREE.ShadowMaterial({ opacity: 0.28 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = 0.002; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);

  /* материалы */
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (cnv, rot = 0) => { const t = new THREE.CanvasTexture(cnv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; if (rot) { t.rotation = rot; } return t; };
  const woodMats = {}, deckMats = {};
  for (const k in PAINTS) {
    const cnv = woodCanvas(PAINTS[k], 11);
    woodMats[k] = new THREE.MeshStandardMaterial({ map: tex(cnv), roughness: 0.82 });
    deckMats[k] = new THREE.MeshStandardMaterial({ map: tex(cnv, Math.PI / 2), roughness: 0.85 });
  }
  const natural = woodMats.natural, naturalDeck = deckMats.natural;
  const roofMat = new THREE.MeshStandardMaterial({ map: tex(roofCanvas()), roughness: 0.6, metalness: 0.15 });
  const roofEdge = new THREE.MeshStandardMaterial({ color: '#2F3235', roughness: 0.6, metalness: 0.3 });
  const blockMat = new THREE.MeshStandardMaterial({ color: '#A8A49C', roughness: 0.95 });
  const pileMat = new THREE.MeshStandardMaterial({ color: '#33373A', roughness: 0.5, metalness: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#5E7684', roughness: 0.12, metalness: 0.35 });
  const pvcMat = new THREE.MeshStandardMaterial({ color: '#F4F4F1', roughness: 0.4 });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#4A3A30', roughness: 0.6 });
  const handleMat = new THREE.MeshStandardMaterial({ color: '#C9C4B8', roughness: 0.3, metalness: 0.8 });
  const gutterMat = new THREE.MeshStandardMaterial({ color: '#E9E6DF', roughness: 0.45 });
  const logMat = new THREE.MeshStandardMaterial({ color: '#8B6440', roughness: 0.9 });
  const logEndMat = new THREE.MeshStandardMaterial({ color: '#D9B98A', roughness: 0.9 });
  const lineMat = new THREE.LineBasicMaterial({ color: '#2A2420', transparent: true, opacity: 0.55 });

  let model = new THREE.Group(); scene.add(model);
  const dims = new THREE.Group(); scene.add(dims);

  /* состояние */
  const target = Object.assign({ L: 6, W: 3, terrace: 0, drovnik: 0, piles: 0, rooms: 1, windows: 1, pvc: 0, doors: 'std', paint: 'natural', gutter: 0, insul: 0 }, opts.params || {});
  const cur = { ...target, L: target.L, W: target.W, terrace: target.terrace, drovnik: target.drovnik ? 1.2 : 0 };
  let grow = reduce ? 1 : 0, growing = false;
  let az = 0.55, el = 0.30, azT = az, dist = 14, distT = 14, sway = 0;
  let dirty = true, running = false, visible = true, dragging = false, lastInteract = 0;

  function disposeGroup(g) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }

  function build() {
    disposeGroup(model); scene.remove(model); model = new THREE.Group(); scene.add(model);
    disposeGroup(dims); dims.clear();
    const L = cur.L, W = cur.W, T = cur.terrace, D = cur.drovnik, g = grow;
    const wood = woodMats[cur.paint] || natural, deck = deckMats[cur.paint] || naturalDeck;
    const total = D + L + T, x0 = -total / 2;           // дровник | хозблок | терраса
    const xs0 = x0 + D, xs1 = xs0 + L;
    const base = cur.piles ? 0.42 : 0.26;                 // высота низа обвязки
    const add = (geo, mat, x, y, z, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; model.add(m); return m; };

    /* фундамент */
    const fg = seg(g, 0, 0.22);
    if (fg > 0) {
      const nx = Math.max(2, Math.round(total / 1.5) + 1), nz = W > 2.4 ? 3 : 2;
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const x = x0 + 0.1 + (total - 0.2) * i / (nx - 1), z = -W / 2 + 0.1 + (W - 0.2) * j / (nz - 1);
        if (cur.piles) {
          const h = base * fg; add(new THREE.CylinderGeometry(0.054, 0.054, h, 14), pileMat, x, h / 2 - 0.02, z);
          add(new THREE.BoxGeometry(0.2, 0.012, 0.2), pileMat, x, h - 0.01, z);
        } else {
          const h = base * fg; add(new THREE.BoxGeometry(0.4, h, 0.2), blockMat, x, h / 2, z);
        }
      }
    }
    /* обвязка и пол */
    const og = seg(g, 0.15, 0.35);
    if (og <= 0) return finish();
    const fy = base + FLOOR_H;
    add(uvBox(new THREE.BoxGeometry(total * og, FLOOR_H, W), total * og, FLOOR_H, W), deck, x0 + total * og / 2, base + FLOOR_H / 2, 0);

    /* стены закрытой части */
    const wg = seg(g, 0.3, 0.72);
    const hAt = (z) => H_BACK + (H_FRONT - H_BACK) * (z + W / 2) / W; // высота стены в точке z
    if (wg > 0) {
      const th = 0.1, Hf = H_FRONT * wg, Hb = H_BACK * wg;
      // передняя стена с проёмами
      const rooms = Math.max(1, Math.min(3, cur.rooms | 0));
      const roomW = L / rooms, openings = [];
      for (let r = 0; r < rooms; r++) {
        const rx = xs0 + r * roomW;
        const dw = cur.doors === 'double' && r === 0 ? Math.min(1.4, roomW - 0.4) : Math.min(0.86, roomW - 0.4);
        openings.push({ type: 'door', x: rx + 0.3 + dw / 2, w: dw, y: 0.02, h: 2.0 });
      }
      // окна: по кругу по комнатам, где есть место; иначе на торец
      const sideWins = []; let left = Math.max(0, cur.windows | 0);
      for (let pass = 0; pass < 2 && left > 0; pass++) for (let r = 0; r < rooms && left > 0; r++) {
        const rx = xs0 + r * roomW, used = openings.filter((o) => o.x > rx && o.x < rx + roomW);
        const free0 = Math.max(...used.map((o) => o.x + o.w / 2)) + 0.3, free1 = rx + roomW - 0.25;
        const ww = cur.pvc ? 0.8 : 0.6;
        const already = openings.filter((o) => o.type === 'win' && o.x > rx && o.x < rx + roomW);
        const startX = already.length ? Math.max(...already.map((o) => o.x + o.w / 2)) + 0.3 : free0;
        if (free1 - startX >= ww) { openings.push({ type: 'win', x: startX + ww / 2, w: ww, y: 1.25, h: ww }); left--; }
      }
      while (left-- > 0) sideWins.push(1);

      const frontShape = new THREE.Shape(); frontShape.moveTo(xs0, 0); frontShape.lineTo(xs1, 0); frontShape.lineTo(xs1, Hf); frontShape.lineTo(xs0, Hf); frontShape.closePath();
      if (wg > 0.98) for (const o of openings) { const p = new THREE.Path(); const y0 = o.y, y1 = o.y + o.h; p.moveTo(o.x - o.w / 2, y0 + (y0 < 0.05 ? 0.001 : 0)); p.lineTo(o.x + o.w / 2, y0); p.lineTo(o.x + o.w / 2, y1); p.lineTo(o.x - o.w / 2, y1); p.closePath(); frontShape.holes.push(p); }
      const fgeo = new THREE.ExtrudeGeometry(frontShape, { depth: th, bevelEnabled: false });
      add(fgeo, wood, 0, fy, W / 2 - th);
      // задняя стена
      const backShape = new THREE.Shape(); backShape.moveTo(x0, 0); backShape.lineTo(xs1, 0); backShape.lineTo(xs1, Hb); backShape.lineTo(x0, Hb); backShape.closePath();
      add(new THREE.ExtrudeGeometry(backShape, { depth: th, bevelEnabled: false }), wood, 0, fy, -W / 2);
      // торцы (трапеция в плоскости z-y), выдавливаем вдоль x
      const sideShape = (withWin) => {
        const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, Hf); s.lineTo(-W / 2, Hb); s.closePath();
        if (withWin && wg > 0.98) { const ww = cur.pvc ? 0.8 : 0.6, p = new THREE.Path(); p.moveTo(-ww / 2, 1.25); p.lineTo(ww / 2, 1.25); p.lineTo(ww / 2, 1.25 + ww); p.lineTo(-ww / 2, 1.25 + ww); p.closePath(); s.holes.push(p); }
        const geo = new THREE.ExtrudeGeometry(s, { depth: th, bevelEnabled: false }); geo.rotateY(-Math.PI / 2); return geo;
      };
      const rightWin = sideWins.length > 0 && T < 0.3, leftWin = sideWins.length > 1 || (sideWins.length > 0 && T >= 0.3);
      add(sideShape(leftWin && D < 0.3), wood, xs0 + th, fy, 0);
      add(sideShape(rightWin), wood, xs1, fy, 0);
      // перегородки внутри (видны через дверь — тонко)
      for (let r = 1; r < rooms; r++) add(new THREE.BoxGeometry(0.06, H_BACK * wg, W - 0.2), wood, xs0 + r * roomW, fy + H_BACK * wg / 2, 0);
      // угловые доски
      const trim = cur.paint === 'natural' ? woodMats.natural : woodMats[cur.paint];
      for (const [x, z, h] of [[xs0, W / 2, Hf], [xs1, W / 2, Hf], [x0, -W / 2, Hb], [xs1, -W / 2, Hb]]) add(new THREE.BoxGeometry(0.12, h, 0.12), trim, x, fy + h / 2, z);

      /* двери и окна */
      if (wg > 0.98) {
        for (const o of openings) {
          const zf = W / 2 - th / 2;
          if (o.type === 'door') {
            const dbl = cur.doors === 'double' && o.w > 1;
            const m = add(uvBox(new THREE.BoxGeometry(o.w - 0.04, o.h - 0.03, 0.05), o.w, o.h, 0.05), dbl ? wood : doorMat, o.x, fy + o.y + o.h / 2, zf + 0.01);
            m.castShadow = false;
            if (dbl) add(new THREE.BoxGeometry(0.02, o.h - 0.05, 0.06), doorMat, o.x, fy + o.h / 2, zf + 0.03);
            add(new THREE.BoxGeometry(0.03, 0.14, 0.04), handleMat, o.x + (dbl ? 0.08 : o.w / 2 - 0.12), fy + 1.0, zf + 0.06);
            add(new THREE.BoxGeometry(o.w + 0.1, 0.07, 0.04), trim, o.x, fy + o.y + o.h + 0.03, zf + 0.05);
          } else win(o.x, fy + o.y + o.h / 2, zf, o.w, 'z');
        }
        const sw = (x, rotY) => win(x, fy + 1.25 + (cur.pvc ? 0.4 : 0.3), 0, cur.pvc ? 0.8 : 0.6, 'x');
        if (rightWin) sw(xs1 - th / 2); if (leftWin && D < 0.3) sw(xs0 + th / 2);
      }
      function win(x, y, z, w, axis) {
        const frame = cur.pvc ? pvcMat : trim;
        const geo = axis === 'z' ? new THREE.BoxGeometry(w, w, 0.12) : new THREE.BoxGeometry(0.12, w, w);
        add(geo, frame, x, y, z, false);
        const gl = axis === 'z' ? new THREE.BoxGeometry(w - 0.1, w - 0.1, 0.13) : new THREE.BoxGeometry(0.13, w - 0.1, w - 0.1);
        add(gl, glassMat, x, y, z, false);
        const sill = axis === 'z' ? new THREE.BoxGeometry(w + 0.12, 0.04, 0.16) : new THREE.BoxGeometry(0.16, 0.04, w + 0.12);
        add(sill, cur.pvc ? pvcMat : trim, x + (axis === 'x' ? 0 : 0), y - w / 2 - 0.02, z + (axis === 'z' ? 0.04 : 0), false);
      }
    }

    /* дровник */
    const eg = seg(g, 0.82, 1);
    if (D > 0.05 && eg > 0) {
      const h = H_BACK * eg; const slat = 0.1, gap = 0.07;
      for (let y = 0.02; y < h - 0.02; y += slat + gap) add(new THREE.BoxGeometry(0.04, slat, W), wood, x0 + 0.02, fy + y + slat / 2, 0);
      // поленница
      const r = 0.075, rows = Math.floor((h * 0.82) / (r * 2)), cols = Math.floor((W - 0.5) / (r * 2.05)), depth = Math.max(0.2, D - 0.25);
      if (rows > 0 && cols > 0) {
        const n = rows * cols, cyl = new THREE.CylinderGeometry(r, r * 1.05, depth, 9); cyl.rotateZ(Math.PI / 2);
        const inst = new THREE.InstancedMesh(cyl, [logMat, logEndMat, logEndMat], n); inst.castShadow = true; inst.receiveShadow = true;
        const m4 = new THREE.Matrix4(), rr = rng(5); let k = 0;
        for (let a = 0; a < rows; a++) for (let b = 0; b < cols; b++) { m4.makeTranslation(x0 + 0.12 + depth / 2 + (rr() - 0.5) * 0.04, fy + r + a * r * 1.95, -W / 2 + 0.3 + r + b * r * 2.05 + (a % 2) * r * 0.5); inst.setMatrixAt(k++, m4); }
        model.add(inst);
      }
      // стойка спереди
      add(new THREE.BoxGeometry(0.1, H_FRONT * eg, 0.1), trim(), x0 + 0.05, fy + H_FRONT * eg / 2, W / 2 - 0.05);
    }
    function trim() { return woodMats[cur.paint] || natural; }

    /* терраса */
    if (T > 0.05 && eg > 0) {
      const tx0 = xs1, tx1 = xs1 + T * Math.min(1, eg * 1.2);
      const tw = tx1 - tx0;
      // стойки
      const posts = Math.max(2, Math.ceil(tw / 2.2) + 1);
      for (let i = 0; i < posts; i++) {
        const x = tx0 + (i === 0 ? 0.25 : tw * i / (posts - 1)) - (i === posts - 1 ? 0.06 : 0);
        if (i === 0) continue;
        add(new THREE.BoxGeometry(0.1, H_FRONT, 0.1), trim(), x, fy + H_FRONT / 2, W / 2 - 0.06);
        add(new THREE.BoxGeometry(0.1, hAt(-W / 2 + 0.06), 0.1), trim(), x, fy + hAt(-W / 2 + 0.06) / 2, -W / 2 + 0.06);
      }
      // перила с крестами (как на их верандах), проход к ступеням посередине фасада
      const railY = fy + 0.9, rail = (xa, xb, za, zb) => {
        const len = Math.hypot(xb - xa, zb - za); if (len < 0.2) return;
        const ang = Math.atan2(zb - za, xb - xa);
        const top = add(new THREE.BoxGeometry(len, 0.06, 0.1), trim(), (xa + xb) / 2, railY, (za + zb) / 2); top.rotation.y = -ang;
        const bot = add(new THREE.BoxGeometry(len, 0.05, 0.06), trim(), (xa + xb) / 2, fy + 0.12, (za + zb) / 2); bot.rotation.y = -ang;
        const d = Math.hypot(len, 0.78), a2 = Math.atan2(0.78, len);
        for (const s of [1, -1]) { const c = add(new THREE.BoxGeometry(d, 0.06, 0.04), trim(), (xa + xb) / 2, fy + 0.51, (za + zb) / 2); c.rotation.set(0, -ang, s * a2, 'YXZ'); }
      };
      const mid = (tx0 + tx1) / 2, stepW = 1.0;
      if (tw > 2.2) { rail(tx0 + 0.15, mid - stepW / 2, W / 2 - 0.06, W / 2 - 0.06); rail(mid + stepW / 2, tx1 - 0.06, W / 2 - 0.06, W / 2 - 0.06); }
      rail(tx1 - 0.06, tx1 - 0.06, W / 2 - 0.06, -W / 2 + 0.3);
      // ступени
      if (tw > 1.2) for (let s = 0; s < 2; s++) add(uvBox(new THREE.BoxGeometry(stepW, 0.06, 0.3), stepW, 0.06, 0.3), deck, mid, fy - 0.2 - s * 0.17, W / 2 + 0.15 + s * 0.3);
    }

    /* крыша */
    const rg = seg(g, 0.62, 0.92);
    if (rg > 0) {
      const over = 0.28, rl = total + over * 2, rw = W + 0.62, slope = Math.atan2(H_FRONT - H_BACK, W);
      const drop = (1 - rg) * 1.6, ry = fy + (H_FRONT + H_BACK) / 2 + 0.07 + drop;
      const roof = new THREE.Group(); roof.position.set(0, ry, 0.05); roof.rotation.x = -slope; model.add(roof);
      const slab = new THREE.Mesh(uvBox(new THREE.BoxGeometry(rl, 0.035, rw / Math.cos(slope)), rl * 1.0, 0.035, rw), roofMat); slab.castShadow = true; slab.receiveShadow = true; roof.add(slab);
      const fas = new THREE.Mesh(new THREE.BoxGeometry(rl, 0.14, 0.03), roofEdge); fas.position.set(0, -0.06, rw / 2 / Math.cos(slope)); roof.add(fas);
      const fas2 = fas.clone(); fas2.position.z = -rw / 2 / Math.cos(slope); roof.add(fas2);
      for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, rw / Math.cos(slope)), roofEdge); f.position.set(s * rl / 2, -0.06, 0); roof.add(f); }
      // водосток по низкому краю
      if (cur.gutter && rg > 0.99) {
        const gy = fy + H_BACK - 0.04, gz = -W / 2 - 0.36;
        const gut = add(new THREE.CylinderGeometry(0.06, 0.06, rl, 12, 1, true, 0, Math.PI), gutterMat, 0, gy, gz); gut.rotation.set(Math.PI / 2, 0, Math.PI / 2);
        gut.material.side = THREE.DoubleSide;
        add(new THREE.CylinderGeometry(0.045, 0.045, gy, 10), gutterMat, x0 - over + 0.15, gy / 2, gz);
      }
    }
    finish();

    function finish() {
      /* размерные линии */
      const showDims = opts.dims !== false && g > 0.95;
      labL.style.opacity = labW.style.opacity = showDims ? 1 : 0;
      labT.style.opacity = showDims && T > 0.05 ? 1 : 0; labD.style.opacity = showDims && D > 0.05 ? 1 : 0;
      if (!showDims) return;
      const z = W / 2 + 0.75, pts = [], tick = (x, zz) => pts.push(x, 0.02, zz - 0.12, x, 0.02, zz + 0.12);
      pts.push(xs0, 0.02, z, xs1, 0.02, z); tick(xs0, z); tick(xs1, z);
      if (T > 0.05) { pts.push(xs1, 0.02, z, xs1 + T, 0.02, z); tick(xs1 + T, z); }
      if (D > 0.05) { pts.push(x0, 0.02, z, xs0, 0.02, z); tick(x0, z); }
      const xr = x0 + total + 0.75; pts.push(xr, 0.02, -W / 2, xr, 0.02, W / 2); pts.push(xr - 0.12, 0.02, -W / 2, xr + 0.12, 0.02, -W / 2, xr - 0.12, 0.02, W / 2, xr + 0.12, 0.02, W / 2);
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      dims.add(new THREE.LineSegments(geo, lineMat));
      dimAnchors = { L: new THREE.Vector3((xs0 + xs1) / 2, 0.02, z + 0.32), W: new THREE.Vector3(xr + 0.4, 0.02, 0), T: new THREE.Vector3(xs1 + T / 2, 0.02, z + 0.32), D: new THREE.Vector3((x0 + xs0) / 2, 0.02, z + 0.32) };
      labL.textContent = fmt(target.L) + ' м'; labW.textContent = fmt(target.W) + ' м';
      labT.textContent = 'терраса ' + fmt(target.terrace) + ' м'; labD.textContent = 'дровник';
    }
  }
  let dimAnchors = null;
  const fmt = (v) => String(+v.toFixed(1)).replace('.', ',');

  function placeLabels() {
    if (!dimAnchors) return; const w = host.clientWidth, h = host.clientHeight, v = new THREE.Vector3();
    for (const [k, el] of [['L', labL], ['W', labW], ['T', labT], ['D', labD]]) {
      v.copy(dimAnchors[k]).project(cam); el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-50%)`;
    }
  }

  function fitDistance() {
    const total = target.L + target.terrace + (target.drovnik ? 1.2 : 0);
    const r = Math.hypot(total, target.W) / 2 + 1.2;
    const aspect = Math.max(0.6, host.clientWidth / Math.max(1, host.clientHeight));
    const fov = cam.fov * Math.PI / 180, fitH = r / Math.tan(fov / 2), fitW = fitH / Math.min(1.25, aspect);
    return Math.max(fitH, fitW) * (opts.zoom || 1.0);
  }

  function applyProj() { cam.updateProjectionMatrix(); const sh = opts.shift || [0, 0]; const e = cam.projectionMatrix.elements; e[8] = -sh[0]; e[9] = -sh[1]; cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert(); }
  function resize() {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; applyProj(); distT = fitDistance(); dirty = true; kick();
  }

  /* перетаскивание: крутим участок */
  let px = 0, py = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); host.classList.add('is-drag'); kick(); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; azT += (e.clientX - px) * 0.008; el = Math.min(0.75, Math.max(0.12, el + (e.clientY - py) * 0.003)); px = e.clientX; py = e.clientY; lastInteract = performance.now(); host.dataset.touched = '1'; kick(); });
  const up = () => { dragging = false; host.classList.remove('is-drag'); lastInteract = performance.now(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) { kick(); if (!growing && grow < 1) startGrow(); } }, { threshold: 0.15 });
  io.observe(host);
  const ro = new ResizeObserver(resize); ro.observe(host);

  let growT0 = 0;
  function startGrow() { if (reduce) { grow = 1; dirty = true; return; } growing = true; growT0 = performance.now(); kick(); }

  let tPrev = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - tPrev) / 1000); tPrev = now;
    let active = dragging || growing;
    if (growing) { grow = Math.min(1, (now - growT0) / 1900); dirty = true; if (grow >= 1) growing = false; }
    // плавно догоняем параметры
    const k = 1 - Math.pow(0.0009, dt);
    for (const key of ['L', 'W', 'terrace']) { const tv = target[key]; if (Math.abs(cur[key] - tv) > 0.003) { cur[key] += (tv - cur[key]) * k; dirty = true; active = true; } else if (cur[key] !== tv) { cur[key] = tv; dirty = true; } }
    const dT = target.drovnik ? 1.2 : 0; if (Math.abs(cur.drovnik - dT) > 0.003) { cur.drovnik += (dT - cur.drovnik) * k; dirty = true; active = true; } else if (cur.drovnik !== dT) { cur.drovnik = dT; dirty = true; }
    for (const key of ['piles', 'rooms', 'windows', 'pvc', 'doors', 'paint', 'gutter', 'insul']) if (cur[key] !== target[key]) { cur[key] = target[key]; dirty = true; }
    if (Math.abs(distT - dist) > 0.01) { dist += (distT - dist) * (1 - Math.pow(0.004, dt)); active = true; }
    // лёгкое покачивание, пока никто не трогает
    if (!reduce && !dragging && now - lastInteract > 2500 && opts.sway !== false) { sway += dt * 0.25; active = true; }
    az += (azT - az) * (1 - Math.pow(0.001, dt)); if (Math.abs(azT - az) > 0.0005) active = true;
    const a = az + Math.sin(sway) * 0.16;
    cam.position.set(Math.sin(a) * Math.cos(el) * dist, Math.sin(el) * dist + 0.6, Math.cos(a) * Math.cos(el) * dist);
    cam.lookAt(0, (opts.lookY ?? 1.05), 0);
    if (dirty) { build(); dirty = false; }
    renderer.render(scene, cam); placeLabels();
    if (active && visible) requestAnimationFrame(frame); else running = false;
  }
  function kick() { if (!running && visible) { running = true; tPrev = performance.now(); requestAnimationFrame(frame); } }

  resize(); build();
  if (opts.autoGrow !== false) startGrow(); else { grow = 1; dirty = true; }

  return {
    set(p) { Object.assign(target, p); distT = fitDistance(); kick(); },
    get params() { return { ...target }; },
    regrow() { grow = 0; startGrow(); },
    resize,
    dispose() { io.disconnect(); ro.disconnect(); renderer.dispose(); },
  };
}

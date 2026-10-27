/* ============================================================
   LA TUMBA DEL FARAÓN — texturas procedurales
   Todo el arte se genera en canvas: cero assets externos.
   ============================================================ */
'use strict';

const TX = (() => {

  /* ---------- utilidades ---------- */
  function rng32(seed) {
    let a = seed;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function T3(canvas, rx = 1, ry = 1) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 4;
    if (THREE.sRGBEncoding !== undefined) t.encoding = THREE.sRGBEncoding;
    return t;
  }

  /* ---------- glifos (dibujados, no tipografía) ---------- */
  // s = tamaño aprox del glifo
  function glyph(g, x, y, s, r, col, lw) {
    g.save(); g.translate(x, y); g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = lw || Math.max(1.4, s * 0.09); g.lineCap = 'round'; g.lineJoin = 'round';
    const k = r(); // variante
    if (k < 0.12) {                       // ankh
      g.beginPath(); g.arc(0, -s * 0.28, s * 0.22, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(0, -s * 0.06); g.lineTo(0, s * 0.42);
      g.moveTo(-s * 0.22, s * 0.1); g.lineTo(s * 0.22, s * 0.1); g.stroke();
    } else if (k < 0.24) {                // ojo de Horus
      g.beginPath(); g.moveTo(-s * 0.3, 0); g.quadraticCurveTo(0, -s * 0.34, s * 0.3, 0);
      g.quadraticCurveTo(0, s * 0.3, -s * 0.3, 0); g.stroke();
      g.beginPath(); g.arc(0, -s * 0.02, s * 0.09, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(s * 0.18, s * 0.12); g.quadraticCurveTo(s * 0.3, s * 0.34, s * 0.1, s * 0.36); g.stroke();
    } else if (k < 0.36) {                // agua (zigzag)
      g.beginPath(); g.moveTo(-s * 0.34, -s * 0.1);
      for (let i = 0; i < 4; i++) {
        g.lineTo(-s * 0.34 + s * 0.17 * (i * 2 + 1), s * 0.14);
        g.lineTo(-s * 0.34 + s * 0.17 * (i * 2 + 2), -s * 0.1);
      }
      g.stroke();
    } else if (k < 0.48) {                // sol
      g.beginPath(); g.arc(0, 0, s * 0.26, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(0, 0, s * 0.07, 0, Math.PI * 2); g.fill();
    } else if (k < 0.6) {                 // ave
      g.beginPath(); g.moveTo(-s * 0.3, s * 0.2); g.quadraticCurveTo(-s * 0.05, -s * 0.3, s * 0.3, -s * 0.05);
      g.quadraticCurveTo(s * 0.05, s * 0.05, -s * 0.3, s * 0.2); g.fill();
      g.beginPath(); g.moveTo(-s * 0.3, s * 0.2); g.lineTo(-s * 0.34, s * 0.34); g.moveTo(-s * 0.18, s * 0.22); g.lineTo(-s * 0.2, s * 0.34); g.stroke();
    } else if (k < 0.72) {                // escarabajo
      g.beginPath(); g.ellipse(0, 0, s * 0.2, s * 0.28, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(-s * 0.2, -s * 0.1); g.lineTo(-s * 0.34, -s * 0.24);
      g.moveTo(s * 0.2, -s * 0.1); g.lineTo(s * 0.34, -s * 0.24);
      g.moveTo(-s * 0.22, s * 0.08); g.lineTo(-s * 0.36, s * 0.2);
      g.moveTo(s * 0.22, s * 0.08); g.lineTo(s * 0.36, s * 0.2); g.stroke();
    } else if (k < 0.84) {                // pluma de Maat
      g.beginPath(); g.moveTo(0, -s * 0.4); g.quadraticCurveTo(s * 0.22, 0, 0, s * 0.4);
      g.quadraticCurveTo(-s * 0.22, 0, 0, -s * 0.4); g.stroke();
      g.beginPath(); g.moveTo(0, s * 0.4); g.lineTo(0, s * 0.48); g.stroke();
    } else {                              // cetro was
      g.beginPath(); g.moveTo(0, -s * 0.4); g.lineTo(0, s * 0.3);
      g.moveTo(0, s * 0.3); g.lineTo(-s * 0.14, s * 0.44); g.moveTo(0, s * 0.3); g.lineTo(s * 0.14, s * 0.44);
      g.moveTo(0, -s * 0.4); g.lineTo(-s * 0.12, -s * 0.3); g.stroke();
    }
    g.restore();
  }

  /* ---------- MURO con registros jeroglíficos ---------- */
  function wallCanvas() {
    const c = cv(1024, 512), g = c.getContext('2d'), r = rng32(7331);
    g.fillStyle = '#161210'; g.fillRect(0, 0, 1024, 512);
    // veteado sedimentario
    for (let y = 0; y < 512; y += 3) {
      g.fillStyle = `rgba(${20 + r() * 14 | 0},${15 + r() * 10 | 0},${11 + r() * 8 | 0},0.5)`;
      g.fillRect(0, y, 1024, 3);
    }
    // moteado
    for (let i = 0; i < 2400; i++) {
      const a = 0.04 + r() * 0.05;
      g.fillStyle = r() < 0.5 ? `rgba(255,220,160,${a * 0.35})` : `rgba(0,0,0,${a})`;
      g.fillRect(r() * 1024, r() * 512, 1 + r() * 2, 1 + r() * 2);
    }
    // tres registros de glifos
    const bands = [[46, 152], [196, 302], [346, 452]];
    for (const [y0, y1] of bands) {
      const yc = (y0 + y1) / 2, s = (y1 - y0) * 0.62;
      // líneas divisorias
      g.strokeStyle = '#3a2c14'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, y0 - 8); g.lineTo(1024, y0 - 8);
      g.moveTo(0, y1 + 8); g.lineTo(1024, y1 + 8); g.stroke();
      for (let x = 30; x < 1024; x += 46) {
        const roll = r();
        let col = '#33270f';                                   // oro apagado (la antorcha lo revela)
        if (roll > 0.94) col = '#4a170d';                      // rojo ocasional
        else if (roll > 0.9) col = '#15351d';                  // verde ocasional
        glyph(g, x, yc, s, r, col, 2.4);
      }
    }
    // zócalo
    g.fillStyle = '#0d0a08'; g.fillRect(0, 470, 1024, 42);
    g.strokeStyle = '#2c2110'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 470); g.lineTo(1024, 470); g.stroke();
    return c;
  }

  /* ---------- PILAR ---------- */
  function pillarCanvas() {
    const c = cv(256, 1024), g = c.getContext('2d'), r = rng32(1337);
    g.fillStyle = '#1c1712'; g.fillRect(0, 0, 256, 1024);
    // sombreado lateral (cilindro fingido)
    const sh = g.createLinearGradient(0, 0, 256, 0);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(0.22, 'rgba(0,0,0,0)');
    sh.addColorStop(0.78, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = sh; g.fillRect(0, 0, 256, 1024);
    // capitel y base dorados
    for (const [y0, y1] of [[0, 74], [950, 1024]]) {
      g.fillStyle = '#57431a'; g.fillRect(0, y0, 256, y1 - y0);
      g.fillStyle = '#6e551f'; g.fillRect(0, y0 + 8, 256, 10);
      g.fillStyle = '#2c2110'; g.fillRect(0, y1 - 12, 256, 4);
    }
    // columna de glifos central
    for (let y = 120; y < 930; y += 78) glyph(g, 128, y, 46, r, '#3a2c12', 3);
    return c;
  }

  /* ---------- SUELO ---------- */
  function floorCanvas() {
    const c = cv(512, 512), g = c.getContext('2d'), r = rng32(4041);
    g.fillStyle = '#100e0b'; g.fillRect(0, 0, 512, 512);
    const N = 4, S = 512 / N;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const v = 14 + r() * 10 | 0;
      g.fillStyle = `rgb(${v + 4},${v},${v - 3})`;
      g.fillRect(i * S + 1, j * S + 1, S - 2, S - 2);
      // grietas
      if (r() < 0.6) {
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.4;
        let x = i * S + 8 + r() * (S - 16), y = j * S + 8 + r() * (S - 16);
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 34; y += (r() - 0.5) * 34; g.lineTo(x, y); }
        g.stroke();
      }
    }
    // juntas
    g.strokeStyle = 'rgba(0,0,0,0.75)'; g.lineWidth = 3;
    for (let i = 0; i <= N; i++) {
      g.beginPath(); g.moveTo(i * S, 0); g.lineTo(i * S, 512);
      g.moveTo(0, i * S); g.lineTo(512, i * S); g.stroke();
    }
    return c;
  }

  /* ---------- TECHO: Nut, diosa del cielo ---------- */
  function nutCanvas() {
    const c = cv(1024, 512), g = c.getContext('2d'), r = rng32(909);
    const bg = g.createLinearGradient(0, 0, 0, 512);
    bg.addColorStop(0, '#0a0e2c'); bg.addColorStop(0.6, '#080b20'); bg.addColorStop(1, '#050714');
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 512);
    // cuerpo arqueado de Nut (línea dorada sutil con estrellas)
    g.strokeStyle = 'rgba(217,184,74,0.4)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(-30, 500);
    g.quadraticCurveTo(512, -130, 1054, 500); g.stroke();
    g.strokeStyle = 'rgba(217,184,74,0.16)'; g.lineWidth = 14;
    g.beginPath(); g.moveTo(-30, 500);
    g.quadraticCurveTo(512, -130, 1054, 500); g.stroke();
    // manos (círculos en los extremos)
    for (const x of [-16, 1040]) {
      g.fillStyle = 'rgba(217,184,74,0.5)';
      g.beginPath(); g.arc(x, 496, 12, 0, Math.PI * 2); g.fill();
    }
    // estrellas
    for (let i = 0; i < 150; i++) {
      const x = r() * 1024, y = r() * 512, s = 0.8 + r() * 2.2;
      const near = Math.abs(y - (500 - Math.pow((x - 512) / 560, 2) * 640));
      g.fillStyle = `rgba(${217 + r() * 30 | 0},${184 + r() * 40 | 0},${74 + r() * 30 | 0},${0.35 + r() * 0.6})`;
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
      if (r() < 0.08) { // destello en cruz
        g.strokeStyle = 'rgba(232,199,102,0.5)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x - s * 3, y); g.lineTo(x + s * 3, y);
        g.moveTo(x, y - s * 3); g.lineTo(x, y + s * 3); g.stroke();
      }
    }
    return c;
  }

  /* ---------- PUERTA sellada ---------- */
  function doorCanvas() {
    const c = cv(512, 768), g = c.getContext('2d'), r = rng32(555);
    g.fillStyle = '#1e1812'; g.fillRect(0, 0, 512, 768);
    // marco
    g.strokeStyle = '#0d0a07'; g.lineWidth = 26; g.strokeRect(13, 13, 486, 742);
    g.strokeStyle = '#3a2c14'; g.lineWidth = 4; g.strokeRect(34, 34, 444, 700);
    // disco solar
    g.strokeStyle = '#8a6a20'; g.lineWidth = 7;
    g.beginPath(); g.arc(256, 150, 58, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = '#b8912e'; g.lineWidth = 3;
    g.beginPath(); g.arc(256, 150, 44, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#8a6a20'; g.beginPath(); g.arc(256, 150, 9, 0, Math.PI * 2); g.fill();
    // columnas de glifos
    for (const x of [128, 384]) for (let y = 260; y < 620; y += 52) glyph(g, x, y, 34, r, '#3a2a10', 2.6);
    // banda del sello (donde brilla el sello emisivo)
    g.fillStyle = '#241a0e'; g.fillRect(60, 636, 392, 74);
    g.strokeStyle = '#57431a'; g.lineWidth = 3; g.strokeRect(60, 636, 392, 74);
    return c;
  }
  function doorSealCanvas() { // mapa emisivo: solo el sello brilla
    const c = cv(512, 768), g = c.getContext('2d'), r = rng32(556);
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 768);
    g.strokeStyle = '#ffb84a'; g.lineWidth = 5; g.strokeRect(78, 650, 356, 46);
    glyph(g, 256, 673, 30, r, '#ffb84a', 3);   // ankh/pluma central
    for (const x of [110, 402]) glyph(g, x, 673, 22, r, '#ffcf7a', 2.4);
    return c;
  }

  /* ---------- SARCÓFAGO antropoide ---------- */
  function sarcoCanvas() {
    const c = cv(512, 1024), g = c.getContext('2d'), r = rng32(810);
    g.fillStyle = '#14100b'; g.fillRect(0, 0, 512, 1024);
    // bordes dorados laterales
    for (const x of [0, 472]) {
      g.fillStyle = '#57431a'; g.fillRect(x, 0, 40, 1024);
      g.fillStyle = '#2c2110'; g.fillRect(x + 34, 0, 6, 1024);
    }
    // nemes (tocado a rayas)
    g.save();
    g.beginPath(); g.moveTo(96, 150); g.quadraticCurveTo(256, 28, 416, 150);
    g.lineTo(400, 330); g.lineTo(112, 330); g.closePath(); g.clip();
    for (let i = -6; i < 16; i++) {
      g.fillStyle = i % 2 ? '#8a6d1d' : '#c9a227';
      g.save(); g.translate(256, 180); g.rotate(-0.42); g.fillRect(-420, i * 26, 840, 26); g.restore();
    }
    g.restore();
    // rostro sereno
    g.fillStyle = '#0d0a07';
    g.beginPath(); g.ellipse(256, 240, 88, 116, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#6e551f'; g.lineWidth = 3;
    g.beginPath(); g.ellipse(256, 240, 88, 116, 0, 0, Math.PI * 2); g.stroke();
    // ojos cerrados (paz)
    g.strokeStyle = '#8a6d1d'; g.lineWidth = 5; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(256 + s * 22, 218); g.quadraticCurveTo(256 + s * 48, 212, 256 + s * 58, 222); g.stroke();
    }
    // boca
    g.beginPath(); g.moveTo(236, 296); g.quadraticCurveTo(256, 304, 276, 296); g.stroke();
    // barba postiza
    g.beginPath(); g.moveTo(256, 330); g.lineTo(256, 368); g.stroke();
    // collar usej
    const arcs = [['#c9a227', 64], ['#e8c766', 50], ['#7a1f12', 38], ['#c9a227', 26]];
    for (const [col, rad] of arcs) {
      g.strokeStyle = col; g.lineWidth = 11;
      g.beginPath(); g.arc(256, 372, rad, 0.15, Math.PI - 0.15); g.stroke();
    }
    // brazos cruzados (pose osiríaca)
    g.fillStyle = '#0d0a07';
    g.beginPath(); g.moveTo(120, 470); g.quadraticCurveTo(256, 520, 392, 470);
    g.lineTo(392, 560); g.quadraticCurveTo(256, 610, 120, 560); g.closePath(); g.fill();
    g.strokeStyle = '#57431a'; g.lineWidth = 4; g.stroke();
    // puños dorados
    for (const x of [196, 316]) {
      g.fillStyle = '#8a6d1d'; g.beginPath(); g.ellipse(x, 512, 26, 18, 0, 0, Math.PI * 2); g.fill();
    }
    // faldellín y piernas a rayas + columna de glifos
    g.fillStyle = '#0d0a07'; g.fillRect(140, 600, 232, 380);
    for (let y = 610; y < 980; y += 34) {
      g.fillStyle = (y / 34 | 0) % 2 ? '#241b0d' : '#1a1409';
      g.fillRect(148, y, 216, 30);
    }
    for (let y = 640; y < 960; y += 64) glyph(g, 256, y, 36, r, '#3a2a10', 2.6);
    return c;
  }

  /* ---------- AMMIT, la devoradora (lo no pintado) ---------- */
  function ammitCanvas() {
    const c = cv(768, 448), g = c.getContext('2d');
    const B = '#050307'; // negro vacío
    // aura roja tenue
    const aura = g.createRadialGradient(220, 210, 30, 220, 210, 260);
    aura.addColorStop(0, 'rgba(120,10,6,0.16)'); aura.addColorStop(1, 'rgba(120,10,6,0)');
    g.fillStyle = aura; g.fillRect(0, 0, 768, 448);
    g.fillStyle = B; g.strokeStyle = B; g.lineJoin = 'round';
    // cabeza de cocodrilo (hocico largo)
    g.beginPath();
    g.moveTo(60, 250); g.quadraticCurveTo(150, 196, 300, 208);
    g.lineTo(310, 236); g.lineTo(240, 244);         // boca superior
    g.lineTo(310, 258); g.lineTo(230, 262);         // dientes intermedios
    g.lineTo(300, 276); g.quadraticCurveTo(180, 296, 90, 288); // mandíbula
    g.closePath(); g.fill();
    // dientes hueso
    g.fillStyle = '#cfc2a4';
    for (let i = 0; i < 7; i++) {
      const x = 250 - i * 30;
      g.beginPath(); g.moveTo(x, 244 + (i % 2) * 4); g.lineTo(x - 7, 256 + (i % 2) * 4); g.lineTo(x - 14, 244 + (i % 2) * 4); g.closePath(); g.fill();
    }
    // ojo rojo brillante
    g.fillStyle = '#ff2a18';
    g.beginPath(); g.arc(286, 206, 7, 0, Math.PI * 2); g.fill();
    const eye = g.createRadialGradient(286, 206, 2, 286, 206, 26);
    eye.addColorStop(0, 'rgba(255,60,30,0.9)'); eye.addColorStop(1, 'rgba(255,60,30,0)');
    g.fillStyle = eye; g.beginPath(); g.arc(286, 206, 26, 0, Math.PI * 2); g.fill();
    // pecho leonino + pata delantera
    g.fillStyle = B;
    g.beginPath(); g.moveTo(300, 190); g.quadraticCurveTo(370, 168, 400, 230);
    g.quadraticCurveTo(410, 300, 380, 420); g.lineTo(330, 420); g.lineTo(340, 300);
    g.quadraticCurveTo(320, 240, 300, 190); g.closePath(); g.fill();
    // grupa de hipopótamo
    g.beginPath(); g.moveTo(380, 190); g.quadraticCurveTo(560, 150, 660, 240);
    g.quadraticCurveTo(700, 320, 640, 420); g.lineTo(420, 420);
    g.quadraticCurveTo(380, 330, 380, 190); g.closePath(); g.fill();
    // patas traseras
    for (const x of [470, 590]) {
      g.beginPath(); g.moveTo(x, 340); g.lineTo(x - 18, 420); g.lineTo(x + 34, 420); g.lineTo(x + 16, 340); g.closePath(); g.fill();
    }
    // cola
    g.strokeStyle = B; g.lineWidth = 20; g.lineCap = 'round';
    g.beginPath(); g.moveTo(650, 250); g.quadraticCurveTo(720, 200, 700, 120); g.stroke();
    // borde rojo oscuro (negación del pigmento)
    g.strokeStyle = 'rgba(90,14,8,0.55)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(60, 250); g.quadraticCurveTo(150, 196, 300, 208);
    g.quadraticCurveTo(370, 168, 400, 230); g.quadraticCurveTo(560, 150, 660, 240);
    g.quadraticCurveTo(700, 320, 640, 420); g.stroke();
    return c;
  }

  /* ---------- EL FARAÓN — hoja de sprites ----------
     11 frames de 200×300:
     0-1 idle · 2-7 correr · 8 salto · 9 oculto (pose canónica) · 10 victoria  */
  const FRAMES = 11, FW = 200, FH = 300;
  function pharaohCanvas() {
    const c = cv(FW * FRAMES, FH), g = c.getContext('2d');
    const BLK = '#0b0908', GOLD = '#c9a227', GOLDD = '#8a6d1d', GOLDL = '#e8c766';
    const limb = (x1, y1, x2, y2, w, col) => {
      g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    };
    for (let f = 0; f < FRAMES; f++) {
      const ox = f * FW;
      g.save(); g.translate(ox, 0);
      const mode = f <= 1 ? 'idle' : f <= 7 ? 'run' : f === 8 ? 'jump' : f === 9 ? 'hide' : 'win';
      const ph = (f - 2) / 6 * Math.PI * 2;         // fase de carrera
      const bob = mode === 'idle' ? f * 2 : mode === 'run' ? Math.abs(Math.sin(ph * 2)) * 4 : 0;
      const groundY = 288;
      const hidden = mode === 'hide';

      // ----- torso -----
      const hipY = hidden ? 252 : 236 + bob;
      const shY = 118 + bob;                          // hombros
      g.fillStyle = BLK;
      g.beginPath();
      g.moveTo(92, shY); g.lineTo(128, shY);
      g.lineTo(133, hipY + 6); g.lineTo(87, hipY + 6);
      g.closePath(); g.fill();
      // contorno pintura al ocultarse
      if (hidden) { g.strokeStyle = 'rgba(64,90,150,0.55)'; g.lineWidth = 2.5; g.stroke(); }

      // ----- nemes (detrás de la cabeza) -----
      const headR = 21;
      if (!hidden) {
        g.fillStyle = GOLD;
        g.beginPath(); g.moveTo(92, 62 + bob); g.lineTo(128, 62 + bob);
        g.lineTo(140, shY - 8); g.lineTo(80, shY - 8); g.closePath(); g.fill();
        g.strokeStyle = GOLDD; g.lineWidth = 3;
        for (let i = 1; i < 4; i++) {
          g.beginPath(); g.moveTo(80 + i * 3, 62 + bob + i * 12); g.lineTo(140 - i * 3, 62 + bob + i * 12); g.stroke();
        }
        // faldones laterales
        g.fillStyle = GOLD;
        g.fillRect(78, shY - 8, 9, 42); g.fillRect(133, shY - 8, 9, 42);
        g.fillStyle = GOLDD; g.fillRect(78, shY + 8, 9, 5); g.fillRect(133, shY + 8, 9, 5);
      } else {
        // nemes de perfil (oculto)
        g.fillStyle = GOLD;
        g.beginPath(); g.moveTo(96, 96); g.lineTo(132, 96); g.lineTo(140, 150); g.lineTo(88, 150); g.closePath(); g.fill();
        g.strokeStyle = GOLDD; g.lineWidth = 3;
        g.beginPath(); g.moveTo(90, 112); g.lineTo(138, 112); g.moveTo(89, 128); g.lineTo(139, 128); g.stroke();
      }

      // ----- cabeza de perfil -----
      const hx = 108, hy = (hidden ? 112 : 84) + bob;
      g.fillStyle = BLK;
      g.beginPath(); g.arc(hx, hy, headR, 0, Math.PI * 2); g.fill();
      // nariz y barba
      g.beginPath(); g.moveTo(hx + headR - 2, hy - 2); g.lineTo(hx + headR + 7, hy + 4); g.lineTo(hx + headR - 4, hy + 8); g.closePath(); g.fill();
      limb(hx - 2, hy + headR - 4, hx - 2, hy + headR + 8, 3, BLK);
      // ureus dorado
      g.fillStyle = GOLD;
      g.beginPath(); g.arc(hx + 6, hy - headR + 4, 3.4, 0, Math.PI * 2); g.fill();
      // ojo
      g.fillStyle = GOLDL;
      g.beginPath(); g.arc(hx + 8, hy - 3, 2.6, 0, Math.PI * 2); g.fill();

      // ----- collar usej -----
      const colY = shY + 4;
      const arcs = [[GOLD, 26], [GOLDL, 20], [GOLDD, 14]];
      for (const [col, rad] of arcs) {
        g.strokeStyle = col; g.lineWidth = 4.5;
        g.beginPath(); g.arc(110, colY, rad, 0.12, Math.PI - 0.12); g.stroke();
      }

      // ----- faldellín -----
      g.fillStyle = BLK;
      g.beginPath();
      g.moveTo(87, hipY + 2); g.lineTo(133, hipY + 2);
      g.lineTo(142, hipY + 26); g.lineTo(78, hipY + 26); g.closePath(); g.fill();
      g.strokeStyle = GOLD; g.lineWidth = 4;
      g.beginPath(); g.moveTo(86, hipY + 2); g.lineTo(134, hipY + 2); g.stroke();

      // ----- piernas -----
      if (mode === 'run') {
        for (const s of [0, Math.PI]) {
          const sw = Math.sin(ph + s), lift = Math.max(0, Math.sin(ph + s)) * 15;
          const kx = 108 + sw * 20, ky = hipY + 34;
          const ax = 108 + sw * 38, ay = groundY - lift;
          limb(108, hipY + 20, kx, ky, 11, BLK);
          limb(kx, ky, ax, ay, 9, BLK);
          limb(ax, ay, ax + 15, ay, 7, BLK);          // pie
        }
      } else if (mode === 'jump') {
        limb(108, hipY + 20, 88, hipY + 52, 11, BLK); limb(88, hipY + 52, 96, hipY + 76, 9, BLK);
        limb(112, hipY + 20, 132, hipY + 46, 11, BLK); limb(132, hipY + 46, 124, hipY + 74, 9, BLK);
        limb(96, hipY + 76, 112, hipY + 76, 7, BLK); limb(124, hipY + 74, 140, hipY + 74, 7, BLK);
      } else if (hidden) {
        // arrodillado, pose canónica
        limb(104, 268, 128, 288, 12, BLK); limb(128, 288, 96, 288, 10, BLK);
        limb(116, 268, 142, 288, 12, BLK); limb(142, 288, 110, 288, 10, BLK);
      } else if (mode === 'win') {
        limb(104, hipY + 20, 92, groundY, 11, BLK); limb(92, groundY, 106, groundY, 7, BLK);
        limb(116, hipY + 20, 138, groundY, 11, BLK); limb(138, groundY, 124, groundY, 7, BLK);
      } else {
        limb(104, hipY + 20, 102, groundY, 11, BLK); limb(102, groundY, 118, groundY, 7, BLK);
        limb(116, hipY + 20, 118, groundY, 11, BLK); limb(118, groundY, 134, groundY, 7, BLK);
      }

      // ----- brazos y antorcha -----
      const torchFlame = (fx, fy, j) => {
        const fl = g.createRadialGradient(fx, fy, 2, fx, fy, 17 + j);
        fl.addColorStop(0, 'rgba(255,242,192,0.95)');
        fl.addColorStop(0.35, 'rgba(255,210,122,0.85)');
        fl.addColorStop(0.7, 'rgba(255,138,44,0.5)');
        fl.addColorStop(1, 'rgba(255,90,20,0)');
        g.fillStyle = fl;
        g.beginPath(); g.arc(fx, fy, 17 + j, 0, Math.PI * 2); g.fill();
      };
      if (mode === 'run') {
        const sw = Math.sin(ph + Math.PI) * 16;
        limb(96, shY + 8, 96 + sw, shY + 36, 9, BLK);           // brazo trasero
        limb(96 + sw, shY + 36, 98 + sw * 1.4, shY + 58, 8, BLK);
        limb(124, shY + 8, 138, shY + 26, 9, BLK);              // brazo de la antorcha
        limb(138, shY + 26, 146, shY + 6, 8, BLK);
        limb(146, shY + 6, 156, shY - 52, 5, '#3a2a16');        // palo
        torchFlame(157, shY - 62, (f % 3) * 3);
      } else if (mode === 'win') {
        limb(96, shY + 8, 78, shY - 34, 9, BLK); limb(78, shY - 34, 70, shY - 62, 8, BLK);
        limb(124, shY + 8, 148, shY - 40, 9, BLK); limb(148, shY - 40, 152, shY - 74, 8, BLK);
        limb(152, shY - 74, 158, shY - 128, 5, '#3a2a16');
        torchFlame(159, shY - 138, 4);
      } else if (hidden) {
        // sin antorcha: te has fundido con la pintura
        limb(100, 168, 112, 250, 9, BLK); limb(112, 250, 126, 262, 8, BLK);
        limb(128, 168, 138, 246, 9, BLK); limb(138, 246, 124, 260, 8, BLK);
      } else {
        // idle / jump
        const raise = mode === 'jump' ? -18 : 0;
        limb(96, shY + 8, 92, shY + 40, 9, BLK); limb(92, shY + 40, 96, shY + 62, 8, BLK);
        limb(124, shY + 8, 138, shY + 24, 9, BLK); limb(138, shY + 24, 146, shY + 2 + raise, 8, BLK);
        limb(146, shY + 2 + raise, 154, shY - 54, 5, '#3a2a16');
        torchFlame(155, shY - 64, (f % 2) * 4);
      }
      g.restore();
    }
    return c;
  }

  /* ---------- objetos ---------- */
  function itemHeartCanvas() {
    const c = cv(128, 128), g = c.getContext('2d');
    const gl = g.createRadialGradient(64, 64, 4, 64, 64, 60);
    gl.addColorStop(0, 'rgba(232,199,102,0.5)'); gl.addColorStop(1, 'rgba(232,199,102,0)');
    g.fillStyle = gl; g.fillRect(0, 0, 128, 128);
    // glifo ib (vaso del corazón)
    g.strokeStyle = '#e8c766'; g.lineWidth = 5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(46, 42); g.lineTo(82, 42); g.lineTo(82, 56); g.lineTo(46, 56); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(42, 56); g.lineTo(86, 56); g.lineTo(86, 86); g.quadraticCurveTo(64, 98, 42, 86); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(42, 62); g.quadraticCurveTo(28, 70, 42, 78);
    g.moveTo(86, 62); g.quadraticCurveTo(100, 70, 86, 78); g.stroke();
    return c;
  }
  function itemDeclCanvas() {
    const c = cv(128, 160), g = c.getContext('2d'), r = rng32(202);
    const gl = g.createRadialGradient(64, 80, 6, 64, 80, 76);
    gl.addColorStop(0, 'rgba(232,199,102,0.4)'); gl.addColorStop(1, 'rgba(232,199,102,0)');
    g.fillStyle = gl; g.fillRect(0, 0, 128, 160);
    g.fillStyle = '#241c12';
    g.beginPath(); g.moveTo(24, 26); g.lineTo(104, 26); g.lineTo(104, 134); g.lineTo(24, 134); g.closePath(); g.fill();
    g.strokeStyle = '#c9a227'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(34, 38); g.lineTo(94, 38); g.lineTo(94, 122); g.lineTo(34, 122); g.closePath(); g.stroke();
    glyph(g, 64, 62, 22, r, '#e8c766', 2.4);
    glyph(g, 64, 96, 22, r, '#e8c766', 2.4);
    return c;
  }
  function flameCanvas() {
    const c = cv(128, 128), g = c.getContext('2d');
    const fl = g.createRadialGradient(64, 74, 4, 64, 74, 58);
    fl.addColorStop(0, 'rgba(255,244,200,1)');
    fl.addColorStop(0.3, 'rgba(255,206,96,0.9)');
    fl.addColorStop(0.62, 'rgba(255,120,30,0.55)');
    fl.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = fl; g.beginPath(); g.arc(64, 74, 58, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,244,200,0.9)';
    g.beginPath(); g.moveTo(64, 8); g.quadraticCurveTo(84, 48, 64, 84);
    g.quadraticCurveTo(44, 48, 64, 8); g.fill();
    return c;
  }
  function dotCanvas(colIn, colOut) {
    const c = cv(64, 64), g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, colIn); gr.addColorStop(1, colOut);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  }

  /* ---------- API ---------- */
  function build() {
    const ph = pharaohCanvas();
    const phTex = new THREE.CanvasTexture(ph);
    phTex.wrapS = phTex.wrapT = THREE.RepeatWrapping;
    phTex.repeat.set(1 / FRAMES, 1);
    if (THREE.sRGBEncoding !== undefined) phTex.encoding = THREE.sRGBEncoding;
    return {
      wall: T3(wallCanvas(), 3, 1),
      pillar: T3(pillarCanvas(), 1, 1),
      floor: T3(floorCanvas(), 7, 2),
      nut: T3(nutCanvas(), 3, 1),
      door: T3(doorCanvas(), 1, 1),
      doorSeal: T3(doorSealCanvas(), 1, 1),
      sarco: T3(sarcoCanvas(), 1, 1),
      ammit: T3(ammitCanvas(), 1, 1),
      pharaoh: phTex, phFrames: FRAMES,
      heart: T3(itemHeartCanvas(), 1, 1),
      decl: T3(itemDeclCanvas(), 1, 1),
      flame: T3(flameCanvas(), 1, 1),
      spark: T3(dotCanvas('rgba(255,220,140,0.95)', 'rgba(255,120,20,0)'), 1, 1),
      smoke: T3(dotCanvas('rgba(120,110,90,0.35)', 'rgba(60,55,45,0)'), 1, 1)
    };
  }

  return { build };
})();

/* gancho para pruebas en Node */
if (typeof module !== 'undefined' && module.exports) module.exports = TX;


/* gancho para pruebas en Node */
if (typeof module !== "undefined" && module.exports) module.exports = TX;

/* ============================================================
   LA TUMBA DEL FARAÓN — 2D PURO · papiro vivo
   Plataformas estilo Prince of Persia · Canvas 2D · cero assets
   ============================================================ */
'use strict';
console.log('[TUMBA-2D] v4 · spawns seguros');

/* ================= constantes ================= */
const VW = 1280, VH = 720;              // lienzo lógico
const GRAV = 1500;                     // px/s² (canvas: y crece hacia ABAJO)
const RUN = 280, JUMP = -640;
const TILE = 64;
const AMMIT_PATROL = 70, AMMIT_CHASE = 205;
const VIEW = 300;                      // visión de Ammit, hacia donde mira
const KILL_DX = 30, KILL_DY = 40;

/* ================= estado ================= */
let cv, cx, keys = {}, state = 'title';  // title | playing | dead | win
let cam = { x: 0, y: 0 };
let P, A, items = [], door, particles = [], time = 0, deathT = 0;
let level = null, levelW = 0, levelH = 0;

/* ================= entrada ================= */
const KEYMAP = {
  a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
  w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down',
  ' ': 'jump', e: 'act'
};
addEventListener('keydown', e => {
  const k = KEYMAP[e.key.toLowerCase()];
  if (k) { keys[k] = true; e.preventDefault(); }
  if (e.key === 'Enter' && state === 'title') { camIdx = 0; startGame(); }
  if (e.key.toLowerCase() === 'r' && state === 'dead') startGame();
  if (e.key.toLowerCase() === 'r' && state === 'win') { camIdx = 0; startGame(); }
  if (e.key.toLowerCase() === 'm') sfxMuted = !sfxMuted;
});
addEventListener('keyup', e => {
  const k = KEYMAP[e.key.toLowerCase()];
  if (k) keys[k] = false;
});

/* ================= nivel: el corredor-escalera del Duat =================
   S: suelo · P: plataforma · B: bloque (muro) · D: puerta del alba (salida)
   I: declaración · G: oro · M: mural-escondite · A: spawn de Ammit
   F: spawn del Faraón · L: led platform (se hunde si pesas) · X: sarcófago
   #: pilar decorativo (no colisiona) · ~: arena (baja lento)         */
const LEVELS = [
  { name: 'I · EL CORREDOR', map: [
    '############################################',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#..........................................#',
    '#......I.......I...........................#',
    '#.F...PPPP....PPPP....PPPPM...APPP.G..PXPPD#',
    '############################################',
  ] },
  { name: 'II · EL POZO', map: [
    '########################',
    '#.......D..........G...#',
    '#PPPPPPPPPP.....PPPPPP.#',
    '#.........PPPP.........#',
    '#...PPPPP..............#',
    '#.......I.....PPPPP....#',
    '#......PPPP............#',
    '#.PPPPP................#',
    '#........PPPP....M.....#',
    '#...............PPPP...#',
    '#....PPPPP..I..........#',
    '#..........PPPP........#',
    '#.........X......PPPPP.#',
    '#...PPPPPPPPP..........#',
    '#.F.................A..#',
    '########################',
  ] },
  { name: 'III · LA ESCALERA', map: [
    '########################################',
    '#......................................#',
    '#......................................#',
    '#......................................#',
    '#...................................D..#',
    '#.................................PPPP.#',
    '#......................................#',
    '#.........................I...PPPP.....#',
    '#..................I....PPPP...........#',
    '#.................PPPP.................#',
    '#...........PPPP.......................#',
    '#.....PPPP.............................#',
    '#.F.............M.....A.......G....X...#',
    '########################################',
  ] },
];
let camIdx = 0;                        // cámara actual
let LW = 24, LH = 16;                  // dimensiones de la cámara activa (se recalculan)
const TS = 60;                          // tamaño de tile en px


/* ================= arranque ================= */
function boot() {
  cv = document.getElementById('game');
  cv.width = VW; cv.height = VH;
  cx = cv.getContext('2d');
  buildLevel();
  requestAnimationFrame(loop);
}

function buildLevel() {
  level = LEVELS[camIdx].map.map(r => r.split(''));
  LW = level[0].length; LH = level.length;
  levelW = LW * TS; levelH = LH * TS;
  items = []; particles = [];
  P = { x: 0, y: 0, vx: 0, vy: 0, dir: 1, ground: false, anim: 0, frame: 0, hidden: false, hideT: 0, decl: 0, gold: false, climb: null, coyote: 0, jumpBuf: 0 };
  A = { x: 0, y: 0, dir: -1, chasing: false, knows: false, lastSeen: 0, sniff: 0, anim: 0, dead: false };
  let doorPos = null, ammitSpawn = null;
  for (let r = 0; r < LH; r++) for (let c = 0; c < LW; c++) {
    const t = level[r][c];
    const x = c * TS, y = r * TS;
    if (t === 'F') { P.x = x + 10; P.y = y + 4; level[r][c] = '.'; }
    if (t === 'A') { ammitSpawn = { x: x + 10, y: y + 4 }; level[r][c] = '.'; }
    if (t === 'I') { items.push({ type: 'decl', id: items.filter(i => i.type === 'decl').length, x: x + TS / 2, y: y + TS / 2, taken: false, bob: Math.random() * 6 }); level[r][c] = '.'; }
    if (t === 'G') { items.push({ type: 'gold', x: x + TS / 2, y: y + TS / 2, taken: false, bob: Math.random() * 6 }); level[r][c] = '.'; }
    if (t === 'D') { doorPos = { x, y }; level[r][c] = '.'; }
    if (t === 'M') { items.push({ type: 'mural', x: x + TS / 2, y: y + TS / 2, used: false }); level[r][c] = '.'; }
    if (t === 'X') { items.push({ type: 'sarco', x: x + TS / 2, y: y + TS / 2, used: false }); level[r][c] = '.'; }
  }
  if (ammitSpawn) { A.x = ammitSpawn.x; A.y = ammitSpawn.y; }
  door = doorPos || { x: (LW - 2) * TS, y: 0 };
}

function startGame() {
  buildLevel();
  state = 'playing';
  time = 0;
  document.getElementById('title').classList.add('hidden');
  document.getElementById('death').classList.add('hidden');
  document.getElementById('win').classList.add('hidden');
}

/* ================= física ================= */
function solidAt(px, py) {
  const c = Math.floor(px / TS), r = Math.floor(py / TS);
  if (c < 0 || c >= LW || r < 0 || r >= LH) return true;
  const t = level[r][c];
  return t === '#' || t === 'B' || t === 'P' || t === 'L' || t === 'S';
}

function playerRect(p = P) { return { x: p.x, y: p.y, w: 34, h: 56 }; }

function collideAxis(axis) {
  const r = playerRect();
  const x0 = Math.floor(r.x / TS), x1 = Math.floor((r.x + r.w) / TS);
  const y0 = Math.floor(r.y / TS), y1 = Math.floor((r.y + r.h) / TS);
  let hit = false;
  for (let rr = y0; rr <= y1; rr++) for (let cc = x0; cc <= x1; cc++) {
    if (rr < 0 || rr >= LH || cc < 0 || cc >= LW) continue;
    const t = level[rr][cc];
    if (t === '#' || t === 'B' || t === 'P' || t === 'L') {
      if (axis === 'x') {
        const tileX = cc * TS;
        if (P.vx > 0 && r.x + r.w > tileX && r.x < tileX) { P.x = tileX - r.w - 0.01; P.vx = 0; hit = true; }
        else if (P.vx < 0 && r.x < tileX + TS && r.x + r.w > tileX + TS) { P.x = tileX + TS + 0.01; P.vx = 0; hit = true; }
      } else {
        const tileY = rr * TS;
        if (P.vy > 0 && r.y + r.h > tileY && r.y < tileY) { P.y = tileY - r.h - 0.01; P.vy = 0; P.ground = true; hit = true; }
        else if (P.vy < 0 && r.y < tileY + TS && r.y + r.h > tileY + TS) { P.y = tileY + TS + 0.01; P.vy = 0; hit = true; }  /* techo */
      }
    }
  }
  return hit;
}

function updatePlayer(dt) {
  if (P.hidden) {
    P.hideT += dt;
    if (!keys.act && P.hideT > 0.25) {
      const near = items.find(it => (it.type === 'mural' || it.type === 'sarco') && it.used);
      if (near) near.used = false;
      P.hidden = false; P.hideT = 0;
      toast('Sales de la pintura.');
    }
    return;
  }
  /* horizontal */
  const ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  P.vx = ax * RUN;
  if (ax !== 0) P.dir = ax;
  P.x += P.vx * dt;
  collideAxis('x');

  /* vertical: salto con coyote-time y buffer */
  P.coyote = P.ground ? 0.1 : Math.max(0, P.coyote - dt);
  P.jumpBuf = keys.jump ? 0.12 : Math.max(0, P.jumpBuf - dt);
  if (P.jumpBuf > 0 && P.coyote > 0) { P.vy = JUMP; P.jumpBuf = 0; P.coyote = 0; sfxJump(); }
  P.ground = false;
  P.vy += GRAV * dt;
  P.y += P.vy * dt;
  if (collideAxis('y') && P.vy === 0) P.ground = true;

  /* animación */
  P.anim += dt * (Math.abs(P.vx) > 10 ? 8 : 2);
  P.frame = Math.floor(P.anim) % 4;

  /* objetos */
  for (const it of items) {
    if (it.taken || it.type === 'mural' || it.type === 'sarco') continue;
    if (Math.abs(P.x + 17 - it.x) < 30 && Math.abs(P.y + 28 - it.y) < 34) {
      if (it.type === 'decl') { it.taken = true; P.decl++; sfxPickup(); toast('«No he robado el pan del templo.» — <em>Declaración ' + (P.decl === 1 ? 'I' : 'II') + '</em>'); }
      if (it.type === 'gold') { it.taken = true; P.gold = true; sfxPickup(); toast('Has tomado el oro. <em>Tu corazón pesa más.</em>'); }
    }
  }
  /* interacción E: mural y sarcófago */
  if (keys.act) {
    for (const it of items) {
      if (it.type === 'mural' && !it.used && Math.abs(P.x + 17 - it.x) < 40 && Math.abs(P.y + 28 - it.y) < 44) {
        if (!P.gold) { P.hidden = true; P.hideT = 0; it.used = true; toast('Te fundes con la pintura. <em>Inmóvil.</em>'); }
        else toast('El oro pesa en tu corazón. <em>El mural te rechaza.</em>');
      }
      if (it.type === 'sarco' && !it.used && Math.abs(P.x + 17 - it.x) < 40 && Math.abs(P.y + 28 - it.y) < 44) {
        P.hidden = true; it.used = true; toast('El sarcófago te acoge. <em>El peso no importa aquí.</em>');
      }
    }
  }

  /* puerta: victoria con las 2 declaraciones */
  if (door && Math.abs(P.x + 17 - (door.x + TS / 2)) < 40 && Math.abs(P.y + 28 - (door.y + TS / 2)) < 60) {
    if (P.decl >= 2) {
      if (camIdx < LEVELS.length - 1) { camIdx++; startGame(); toast('Cámara superada. La Duat se abre.'); }
      else { state = 'win'; sfxWin(); document.getElementById('win').classList.remove('hidden'); }
    }
    else toast('La puerta está sellada. <em>Faltan declaraciones (' + P.decl + '/2).</em>');
  }
}

/* ================= Ammit ================= */
function updateAmmit(dt) {
  if (state !== 'playing' || A.dead) return;
  const dx = P.x - A.x;
  if (!P.hidden && Math.abs(dx) < VIEW && Math.sign(dx) === A.dir) {
    if (!A.chasing) { A.chasing = true; toast('Ammit te ha visto. <em>Corre.</em>'); sfxGrowl(); }
    A.lastSeen = P.x;
  } else if (A.chasing && P.hidden) A.sniff += dt;

  if (A.chasing) {
    const target = P.hidden ? A.lastSeen : P.x;
    A.x += Math.sign(target - A.x) * AMMIT_CHASE * dt;
    if (!P.hidden && Math.abs(A.x - P.x) < KILL_DX && Math.abs(A.y - P.y) < KILL_DY) kill();
    if (!P.hidden && Math.abs(A.x - P.x) > 480) A.chasing = false;
    if (P.hidden && A.sniff > 3 && Math.abs(A.x - A.lastSeen) < 40) { A.chasing = false; A.sniff = 0; toast('Ammit pierde tu rastro…'); }
  } else {
    A.x += A.dir * AMMIT_PATROL * dt;
    if (A.x < TS * 2) { A.x = TS * 2; A.dir = 1; }
    if (A.x > levelW - TS * 3) { A.x = levelW - TS * 3; A.dir = -1; }
  }
  /* gravedad de Ammit: cae hasta la plataforma bajo sus pies */
  const feet = A.y + 50;
  if (!solidAt(A.x, feet)) {
    A.vyA = (A.vyA || 0) + 900 * dt;
    A.y += A.vyA * dt;
    if (solidAt(A.x, A.y + 50)) { A.y = Math.floor((A.y + 50) / TS) * TS - 50; A.vyA = 0; }
  } else A.vyA = 0;
  A.anim += dt * (A.chasing ? 9 : 3);
}

function kill() {
  if (state !== 'playing') return;
  state = 'dead'; deathT = 0;
  sfxDeath();
  setTimeout(() => {
    document.getElementById('death').classList.remove('hidden');
  }, 800);
}

/* ================= render ================= */
function draw() {
  if (!cx) return;
  /* cámara: sigue al jugador con sesgo de mirada */
  const tx = P.x + P.dir * 60 - VW / 2;
  const ty = Math.min(Math.max(P.y - VH * 0.55, 0), levelH - VH);
  cam.x += (Math.max(Math.min(tx, levelW - VW), 0) - cam.x) * 0.12;
  cam.y += (ty - cam.y) * 0.15;

  /* fondo papiro */
  cx.fillStyle = '#e8d9b0';
  cx.fillRect(0, 0, VW, VH);
  drawPapyrusTexture();
  drawLevel();
  drawItems();
  drawDoor();
  drawAmmit();
  drawPlayer();
  drawParticles(dt2);
  drawHUD();
}

let dt2 = 0;

function drawPapyrusTexture() {
  /* fibras horizontales tenues + manchas de edad */
  cx.save();
  cx.globalAlpha = 0.06;
  cx.strokeStyle = '#8a6f3e';
  for (let y = 0; y < VH; y += 7) {
    cx.beginPath(); cx.moveTo(0, y + Math.sin(y * 0.05) * 2); cx.lineTo(VW, y + Math.sin(y * 0.07) * 2); cx.stroke();
  }
  cx.restore();
  /* borde de papiro: marco de glifos */
  cx.save();
  cx.globalAlpha = 0.5;
  cx.strokeStyle = '#7a5c2e';
  cx.lineWidth = 3;
  cx.strokeRect(14, 14, VW - 28, VH - 28);
  cx.lineWidth = 1;
  cx.strokeRect(22, 22, VW - 44, VH - 44);
  cx.restore();
}

function drawLevel() {
  const c0 = Math.floor(cam.x / TS), c1 = Math.floor((cam.x + VW) / TS);
  const r0 = Math.floor(cam.y / TS), r1 = Math.floor((cam.y + VH) / TS);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (r < 0 || r >= LH || c < 0 || c >= LW) continue;
    const t = level[r][c];
    const x = c * TS - cam.x, y = r * TS - cam.y;
    if (t === '#' || t === 'B' || t === 'P' || t === 'L' || t === 'S') {
      /* bloque de piedra arenisca con borde grabado */
      cx.fillStyle = t === 'P' ? '#c9ae7e' : '#b89a6a';
      cx.fillRect(x, y, TS, TS);
      cx.strokeStyle = '#8a6f3e';
      cx.lineWidth = 2;
      cx.strokeRect(x + 1, y + 1, TS - 2, TS - 2);
      /* remaches de esquina */
      cx.fillStyle = '#8a6f3e';
      cx.fillRect(x + 4, y + 4, 3, 3); cx.fillRect(x + TS - 7, y + 4, 3, 3);
      cx.fillRect(x + 4, y + TS - 7, 3, 3); cx.fillRect(x + TS - 7, y + TS - 7, 3, 3);
      /* plataforma: línea de sombra inferior */
      if (t === 'P') { cx.fillStyle = 'rgba(90,60,20,.35)'; cx.fillRect(x, y + TS - 6, TS, 6); }
      /* glifo decorativo ocasional en bloques grandes */
      if (t === '#' && (r * 7 + c * 13) % 11 === 0) glyph(x + TS / 2, y + TS / 2, '#8a6f3e');
    } else if (t === 'M') {
      /* mural: rectángulo con pintura */
      cx.fillStyle = '#d9c49a'; cx.fillRect(x, y, TS, TS);
      cx.strokeStyle = '#a8742e'; cx.lineWidth = 3; cx.strokeRect(x + 4, y + 4, TS - 8, TS - 8);
      glyph(x + TS / 2, y + TS / 2, '#a8742e');
    }
  }
}

function glyph(x, y, col) {
  /* glifo simple: ankh estilizado */
  cx.save();
  cx.strokeStyle = col; cx.lineWidth = 2;
  cx.beginPath(); cx.arc(x, y - 8, 6, 0, Math.PI * 2); cx.stroke();
  cx.beginPath(); cx.moveTo(x, y - 2); cx.lineTo(x, y + 10); cx.stroke();
  cx.beginPath(); cx.moveTo(x - 8, y + 3); cx.lineTo(x + 8, y + 3); cx.stroke();
  cx.restore();
}

function drawItems() {
  for (const it of items) {
    const x = it.x - cam.x, y = it.y - cam.y + Math.sin(time * 2 + it.bob) * 4;
    if (it.type === 'decl' && !it.taken) {
      /* cartucho dorado flotante */
      cx.save();
      cx.fillStyle = '#d9b84a'; cx.strokeStyle = '#8a6f3e'; cx.lineWidth = 2;
      roundRect(x - 14, y - 10, 28, 20, 5); cx.fill(); cx.stroke();
      cx.fillStyle = '#5c4a1e';
      cx.font = 'bold 11px Georgia';
      cx.textAlign = 'center';
      cx.fillText(it.id === 0 ? 'I' : 'II', x, y + 4);
      cx.restore();
    }
    if (it.type === 'mural' && !it.used) {
      /* mural: rectángulo de pintura con escena */
      cx.save();
      cx.fillStyle = '#d9c49a'; cx.strokeStyle = '#a8742e'; cx.lineWidth = 3;
      cx.fillRect(x - 26, y - 26, 52, 52); cx.strokeRect(x - 26, y - 26, 52, 52);
      /* figura pintada: el Faraón sentado con pluma */
      cx.strokeStyle = '#7a4a1e'; cx.lineWidth = 2;
      cx.beginPath(); cx.arc(x - 6, y - 8, 6, 0, Math.PI * 2); cx.stroke();
      cx.beginPath(); cx.moveTo(x - 6, y - 2); cx.lineTo(x - 6, y + 14); cx.stroke();
      cx.beginPath(); cx.moveTo(x - 6, y + 2); cx.lineTo(x + 8, y + 2); cx.stroke();
      cx.beginPath(); cx.moveTo(x - 6, y + 14); cx.lineTo(x + 2, y + 14); cx.stroke();
      glyph(x + 14, y, '#a8742e');
      cx.restore();
    }
    if (it.type === 'sarco' && !it.used) {
      /* sarcófago: caja de piedra con tapa y máscara */
      cx.save();
      cx.fillStyle = '#a89060'; cx.strokeStyle = '#6a5228'; cx.lineWidth = 3;
      cx.fillRect(x - 28, y - 20, 56, 44); cx.strokeRect(x - 28, y - 20, 56, 44);
      cx.fillStyle = '#6a5228';
      cx.fillRect(x - 28, y - 20, 56, 8);   /* tapa */
      /* máscara dorada */
      cx.fillStyle = '#d9b84a';
      cx.beginPath(); cx.arc(x, y + 4, 8, 0, Math.PI * 2); cx.fill();
      cx.strokeStyle = '#6a5228'; cx.lineWidth = 2; cx.stroke();
      /* brazos cruzados */
      cx.beginPath(); cx.moveTo(x - 10, y + 16); cx.lineTo(x + 10, y + 16); cx.stroke();
      cx.restore();
    }
    if (it.type === 'gold' && !it.taken) {
      cx.save();
      cx.fillStyle = '#e8c84a';
      cx.strokeStyle = '#8a6f3e'; cx.lineWidth = 2;
      cx.beginPath();
      cx.moveTo(x, y - 9); cx.lineTo(x + 10, y); cx.lineTo(x, y + 9); cx.lineTo(x - 10, y);
      cx.closePath(); cx.fill(); cx.stroke();
      cx.restore();
    }
  }
}

function drawDoor() {
  if (!door) return;
  const x = door.x - cam.x, y = door.y - cam.y;
  /* puerta del alba: cartucho vertical dorado */
  cx.save();
  cx.fillStyle = P.decl >= 2 ? '#f2d27a' : '#b89a6a';
  cx.strokeStyle = '#8a6f3e'; cx.lineWidth = 3;
  roundRect(x + 8, y + 6, TS - 16, TS - 12, 6); cx.fill(); cx.stroke();
  /* sol del alba */
  cx.strokeStyle = P.decl >= 2 ? '#fff2cc' : '#7a5c2e';
  cx.beginPath(); cx.arc(x + TS / 2, y + TS / 2 - 4, 9, 0, Math.PI * 2); cx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    cx.beginPath();
    cx.moveTo(x + TS / 2 + Math.cos(a) * 12, y + TS / 2 - 4 + Math.sin(a) * 12);
    cx.lineTo(x + TS / 2 + Math.cos(a) * 16, y + TS / 2 - 4 + Math.sin(a) * 16);
    cx.stroke();
  }
  cx.restore();
}

function drawPlayer() {
  if (P.hidden) return;
  const x = P.x - cam.x, y = P.y - cam.y;
  cx.save();
  cx.translate(x + 17, y + 28);
  cx.scale(P.dir, 1);
  /* silueta canónica: cabeza + nemes + falda + piernas */
  cx.fillStyle = '#2a1f14';
  /* cabeza con nemes */
  cx.beginPath(); cx.arc(0, -20, 9, 0, Math.PI * 2); cx.fill();
  cx.beginPath();
  cx.moveTo(-9, -22); cx.lineTo(-14, -8); cx.lineTo(-4, -10);
  cx.lineTo(9, -22); cx.lineTo(14, -8); cx.lineTo(4, -10);
  cx.closePath(); cx.fill();
  /* torso */
  cx.beginPath();
  cx.moveTo(-7, -12); cx.lineTo(7, -12); cx.lineTo(6, 8); cx.lineTo(-6, 8);
  cx.closePath(); cx.fill();
  /* falda real */
  cx.fillStyle = '#4a3520';
  cx.beginPath();
  cx.moveTo(-6, 8); cx.lineTo(6, 8); cx.lineTo(8, 22); cx.lineTo(-8, 22);
  cx.closePath(); cx.fill();
  /* piernas según frame */
  cx.fillStyle = '#2a1f14';
  const f = P.ground ? P.frame : 2;
  const step = Math.sin(P.anim * 1.6) * 6;
  cx.fillRect(-5, 22, 4, 12 + (f === 1 ? step : 0));
  cx.fillRect(1, 22, 4, 12 + (f === 3 ? step : 0));
  /* brazos: uno adelante */
  cx.fillRect(4, -10, 4, 14);
  /* antorcha en mano */
  cx.fillStyle = '#8a5a20';
  cx.fillRect(6, -6, 3, 12);
  cx.fillStyle = '#ff9a3a';
  cx.beginPath(); cx.arc(7.5, -8, 5, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = '#ffcf7a';
  cx.beginPath(); cx.arc(7.5, -8, 2.5, 0, Math.PI * 2); cx.fill();
  /* halo de antorcha */
  const g = cx.createRadialGradient(8, -8, 2, 8, -8, 46);
  g.addColorStop(0, 'rgba(255,170,80,.28)');
  g.addColorStop(1, 'rgba(255,170,80,0)');
  cx.fillStyle = g;
  cx.beginPath(); cx.arc(8, -8, 46, 0, Math.PI * 2); cx.fill();
  cx.restore();
}

function drawAmmit() {
  if (A.dead) return;
  const x = A.x - cam.x, y = A.y - cam.y;
  cx.save();
  cx.translate(x, y + 25);
  cx.scale(A.dir < 0 ? -1 : 1, 1);
  /* Ammit: lo-no-pintado — silueta dentada con ojos ocre */
  cx.fillStyle = 'rgba(12,8,4,.94)';
  cx.beginPath();
  cx.moveTo(-34, 0); cx.lineTo(-20, -16); cx.lineTo(-6, -8);
  cx.lineTo(10, -18); cx.lineTo(26, -6); cx.lineTo(38, 2);
  cx.lineTo(30, 14); cx.lineTo(8, 10); cx.lineTo(-14, 12); cx.lineTo(-30, 8);
  cx.closePath(); cx.fill();
  /* ojos rojo ocre */
  cx.fillStyle = '#c9410e';
  cx.beginPath(); cx.arc(16, -6, 3.2, 0, Math.PI * 2); cx.fill();
  cx.beginPath(); cx.arc(24, -2, 2.6, 0, Math.PI * 2); cx.fill();
  /* dientes */
  cx.fillStyle = '#e8d9b0';
  for (let i = 0; i < 5; i++) {
    cx.beginPath();
    cx.moveTo(30 - i * 5, 2); cx.lineTo(28 - i * 5, 8); cx.lineTo(26 - i * 5, 2);
    cx.closePath(); cx.fill();
  }
  cx.restore();
}

function drawParticles(d) {
  for (const p of particles) {
    p.x += p.vx * d; p.y += p.vy * d; p.life -= d;
    if (p.life <= 0) continue;
    cx.save();
    cx.globalAlpha = Math.max(0, p.life);
    cx.fillStyle = p.col;
    cx.fillRect(p.x - cam.x, p.y - cam.y, p.s, p.s);
    cx.restore();
  }
  particles = particles.filter(p => p.life > 0);
}

function drawHUD() {
  /* nombre de cámara arriba-centro */
  cx.save();
  cx.font = 'bold 15px Georgia'; cx.textAlign = 'center'; cx.fillStyle = '#8a6f3e';
  cx.fillText('CÁMARA ' + LEVELS[camIdx].name, VW / 2, 40);
  cx.restore();
  /* corazón ib latiendo arriba-izquierda */
  const beat = Math.sin(time * (P.gold ? 9 : 5)) * 0.5 + 0.5;
  cx.save();
  cx.translate(46, 46);
  cx.scale(1 + beat * 0.08, 1 + beat * 0.08);
  cx.strokeStyle = '#5c4a1e'; cx.fillStyle = P.gold ? '#c9410e' : '#8a2d0e';
  cx.lineWidth = 2.5;
  /* vasija-ib egipcia */
  cx.beginPath();
  cx.moveTo(0, -14); cx.quadraticCurveTo(10, -6, 6, 8);
  cx.quadraticCurveTo(0, 14, -6, 8);
  cx.quadraticCurveTo(-10, -6, 0, -14);
  cx.closePath(); cx.fill(); cx.stroke();
  cx.restore();
  /* cartuchos de declaraciones */
  for (let i = 0; i < 2; i++) {
    const x = 90 + i * 44, y = 36;
    cx.save();
    cx.strokeStyle = '#5c4a1e'; cx.lineWidth = 2;
    if (P.decl > i) { cx.fillStyle = '#d9b84a'; }
    else { cx.fillStyle = 'rgba(232,217,176,.6)'; }
    roundRect(x, y, 36, 22, 5); cx.fill(); cx.stroke();
    cx.fillStyle = P.decl > i ? '#5c4a1e' : '#8a6f3e';
    cx.font = 'bold 12px Georgia'; cx.textAlign = 'center';
    cx.fillText(['I', 'II'][i], x + 18, y + 15);
    cx.restore();
  }
}

function roundRect(x, y, w, h, r) {
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.arcTo(x + w, y, x + w, y + h, r);
  cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r);
  cx.arcTo(x, y, x + w, y, r);
  cx.closePath();
}

/* ================= audio procedural ================= */
let AC = null, sfxMuted = false;
function ac() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  return AC;
}
function tone(freq, dur, type = 'sine', vol = 0.12, slide = 0) {
  if (sfxMuted) return;
  try {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur);
  } catch (e) { }
}
const sfxJump = () => tone(180, 0.18, 'triangle', 0.08, 120);
const sfxPickup = () => { tone(520, 0.12, 'sine', 0.1); setTimeout(() => tone(780, 0.16, 'sine', 0.1), 90); };
const sfxDeath = () => { tone(140, 0.5, 'sawtooth', 0.14, -80); };
const sfxGrowl = () => tone(70, 0.4, 'sawtooth', 0.1, 30);
const sfxWin = () => { [440, 550, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sine', 0.1), i * 140)); };

/* ================= toast ================= */
let toastMsg = '', toastT = 0;
function toast(msg) { toastMsg = msg; toastT = 3.2; }
function drawToast(d) {
  if (toastT <= 0) return;
  toastT -= d;
  cx.save();
  cx.globalAlpha = Math.min(1, toastT);
  cx.font = '15px Georgia';
  cx.textAlign = 'center';
  cx.fillStyle = 'rgba(42,31,20,.85)';
  const w = cx.measureText(toastMsg.replace(/<[^>]+>/g, '')).width + 40;
  roundRect(VW / 2 - w / 2, VH - 70, w, 34, 8);
  cx.fill();
  cx.fillStyle = '#e8d9b0';
  cx.fillText(toastMsg.replace(/<[^>]+>/g, ''), VW / 2, VH - 48);
  cx.restore();
}

/* ================= bucle ================= */
let last = 0;
function loop(ts) {
  const dt = Math.min(0.033, (ts - last) / 1000 || 0.016);
  last = ts; dt2 = dt;
  if (state === 'playing') {
    time += dt;
    updatePlayer(dt);
    updateAmmit(dt);
  } else if (state === 'dead') deathT += dt;
  draw();
  drawToast(dt);
  requestAnimationFrame(loop);
}

/* ================= arranque ================= */
if (typeof window !== 'undefined' && !window.__TEROS_TEST__) {
  window.__DBG = () => ({
    cam: camIdx, state, player: { x: P.x, y: P.y, decl: P.decl, gold: P.gold, hidden: P.hidden, ground: P.ground },
    ammit: { x: A.x, chasing: A.chasing },
    near: items.filter(i => !i.taken && Math.hypot(P.x - i.x, P.y - i.y) < 90).map(i => ({ type: i.type, d: +Math.hypot(P.x - i.x, P.y - i.y).toFixed(0) }))
  });
  boot();
}

/* pruebas en Node */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildLevel, startGame, updatePlayer, updateAmmit, state: () => state, P: () => P, A: () => A, items: () => items, LEVELS, setCamera: i => { camIdx = i; startGame(); }, camIdx: () => camIdx, keys };
}

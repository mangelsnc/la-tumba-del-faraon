/* ============================================================
   LA TUMBA DEL FARAÓN — demo técnica 2.5D
   Sprites planos en escena 3D · three.js r128 · cero assets
   ============================================================ */
'use strict';

/* ================= constantes de diseño ================= */
const LANE_Z   = [-3.4, 0, 3.4];      // 0 fondo · 1 medio · 2 frente
const LANE_SPD = 7.5;                 // velocidad de cambio de carril
const WALK_SPD = 7.2;
const JUMP_V   = 10.6;
const GRAV     = -27;
const AMMIT_PATROL = 3.1;
const AMMIT_CHASE  = 6.0;
const VIEW_SAME = 7.5, VIEW_ADJ = 4.5;
const CORRIDOR_MIN = -3.8, CORRIDOR_MAX = 60.6;

/* ================= estado global ================= */
let renderer, scene, camera, TXA;
let player, ammit, door, doorGroup, sealLight, winLight;
let braziers = [], pedestals = [], particles = [], smokePool = [];
let interactables = [];
let state = 'title';           // title | playing | dead | win | opening
let keys = {};
let sfx, muted = false;

const P = {                     // jugador
  x: -2, lane: 1, z: 0, y: 0, vy: 0, ground: true,
  dir: 1, hidden: false, hideType: null, hideLock: 0,
  anim: 0, frame: 0, beat: 0, weight: false, decl: 0
};
const A = {                     // Ammit
  x: 16, z: LANE_Z[0], dir: -1, chasing: false,
  lastSeen: 0, sniff: 0, knows: false, anim: 0
};
const D = { open: false, t: 0 };

/* ================= utilidades DOM ================= */
const $ = id => document.getElementById(id);
const toastEl = () => $('toast'), hintEl = () => $('hint');
let toastTimer = 0, hintCurrent = '';
function toast(msg, dur = 3.6) {
  const t = toastEl(); t.innerHTML = msg; t.style.opacity = 1;
  toastTimer = dur;
}
function hint(msg) {
  if (hintCurrent === msg) return;
  hintCurrent = msg;
  const h = hintEl(); h.innerHTML = msg; h.style.opacity = msg ? 0.95 : 0;
}

/* ================= AUDIO procedural ================= */
function makeSFX() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;                    /* sin audio disponible: juego silencioso */
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);

  function env(g, t0, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }
  function tone(freq, type, peak, a, d, t0, glideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + a + d);
    env(g, t0, a, peak, d);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + a + d + 0.05);
  }
  function noiseBurst(peak, dur, filterFreq, t0) {
    const len = ctx.sampleRate * dur, buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = ctx.createGain(); env(g, t0, 0.02, peak, dur);
    src.connect(f); f.connect(g); g.connect(master); src.start(t0);
  }

  /* --- ambiente: drone + viento --- */
  const droneG = ctx.createGain(); droneG.gain.value = 0.045;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  droneG.connect(lp); lp.connect(master);
  [55, 55.4, 82.5].forEach(f => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    o.connect(droneG); o.start();
  });
  const windLen = ctx.sampleRate * 2, wbuf = ctx.createBuffer(1, windLen, ctx.sampleRate);
  const wd = wbuf.getChannelData(0);
  for (let i = 0; i < windLen; i++) wd[i] = Math.random() * 2 - 1;
  const wind = ctx.createBufferSource(); wind.buffer = wbuf; wind.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.55;
  const wg = ctx.createGain(); wg.gain.value = 0.028;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.018;
  lfo.connect(lfoG); lfoG.connect(wg.gain);
  wind.connect(bp); bp.connect(wg); wg.connect(master);
  wind.start(); lfo.start();

  /* --- gruñido continuo de Ammit (ganancia dinámica) --- */
  const growlG = ctx.createGain(); growlG.gain.value = 0;
  const growlF = ctx.createBiquadFilter(); growlF.type = 'lowpass'; growlF.frequency.value = 170;
  growlG.connect(growlF); growlF.connect(master);
  [36, 41.3].forEach(f => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    o.connect(growlG); o.start();
  });

  return {
    ctx, master,
    beat(heavy) {
      const t = ctx.currentTime;
      tone(58, 'sine', heavy ? 0.5 : 0.32, 0.012, 0.1, t);
      tone(46, 'sine', heavy ? 0.34 : 0.2, 0.012, 0.09, t + 0.15);
    },
    pickup() {
      const t = ctx.currentTime;
      tone(523, 'sine', 0.22, 0.02, 0.3, t);
      tone(784, 'sine', 0.18, 0.02, 0.42, t + 0.12);
    },
    gold() {
      const t = ctx.currentTime;
      tone(1240, 'triangle', 0.14, 0.01, 0.5, t);
      tone(62, 'sine', 0.4, 0.02, 0.35, t);
    },
    hide() { tone(180, 'sine', 0.2, 0.05, 0.4, ctx.currentTime, 90); },
    unhide() { tone(90, 'sine', 0.2, 0.05, 0.4, ctx.currentTime, 180); },
    reject() {
      const t = ctx.currentTime;
      tone(140, 'square', 0.1, 0.02, 0.22, t);
      tone(120, 'square', 0.1, 0.02, 0.3, t + 0.16);
    },
    door() {
      const t = ctx.currentTime;
      noiseBurst(0.5, 1.4, 130, t);
      tone(38, 'sine', 0.5, 0.3, 1.3, t);
    },
    death() {
      const t = ctx.currentTime;
      tone(210, 'sawtooth', 0.3, 0.03, 0.85, t, 38);
      noiseBurst(0.4, 0.7, 400, t);
    },
    win() {
      const t = ctx.currentTime, seq = [294, 311, 370, 440, 466, 588];
      seq.forEach((f, i) => tone(f, 'sine', 0.2, 0.03, 0.5, t + i * 0.17));
    },
    setGrowl(v) { growlG.gain.setTargetAtTime(v, ctx.currentTime, 0.25); },
    toggleMute() {
      muted = !muted;
      master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
      return muted;
    }
  };
}

/* ================= CONSTRUCCIÓN DEL MUNDO ================= */
function buildWorld() {
  /* suelo */
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(84, 13),
    new THREE.MeshLambertMaterial({ map: TXA.floor })
  );
  floor.rotation.x = -Math.PI / 2; floor.position.set(30, 0, 0);
  scene.add(floor);

  /* techo: Nut */
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(84, 13),
    new THREE.MeshLambertMaterial({ map: TXA.nut })
  );
  ceil.rotation.x = Math.PI / 2; ceil.position.set(30, 8, 0);
  scene.add(ceil);

  /* muros laterales */
  const wallGeo = new THREE.BoxGeometry(84, 8, 0.8);
  const wallMat = new THREE.MeshLambertMaterial({ map: TXA.wall });
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.position.set(30, 4, -6.2); scene.add(backWall);
  const frontWall = new THREE.Mesh(wallGeo, wallMat.clone());
  frontWall.position.set(30, 4, 6.2); scene.add(frontWall);

  /* muros de cierre */
  const capGeo = new THREE.BoxGeometry(0.8, 8, 13);
  const capMat = new THREE.MeshLambertMaterial({ map: TXA.wall.clone() });
  capMat.map.repeat.set(2, 1);
  const cap1 = new THREE.Mesh(capGeo, capMat); cap1.position.set(-4.5, 4, 0); scene.add(cap1);
  const cap2 = new THREE.Mesh(capGeo, capMat.clone()); cap2.position.set(66.5, 4, 0); scene.add(cap2);

  /* pilares: solo el plano del fondo (los frontales taparían la vista lateral) */
  const pilGeo = new THREE.CylinderGeometry(0.55, 0.62, 8, 10);
  const pilMat = new THREE.MeshLambertMaterial({ map: TXA.pillar });
  for (let x = 6; x <= 58; x += 8) {
    const pb = new THREE.Mesh(pilGeo, pilMat); pb.position.set(x, 4, -5.1); scene.add(pb);
  }

  /* braseros (luz ambiente cálida) */
  const bowlGeo = new THREE.CylinderGeometry(0.42, 0.26, 0.5, 8);
  const bowlMat = new THREE.MeshLambertMaterial({ color: 0x2a2118 });
  const stemGeo = new THREE.CylinderGeometry(0.09, 0.14, 1.1, 6);
  [[4, -4.6], [26, 4.6], [50, -4.6], [56, 4.6]].forEach(([bx, bz]) => {
    const g = new THREE.Group();
    const stem = new THREE.Mesh(stemGeo, bowlMat); stem.position.y = 0.55; g.add(stem);
    const bowl = new THREE.Mesh(bowlGeo, bowlMat); bowl.position.y = 1.2; g.add(bowl);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TXA.flame, transparent: true, depthWrite: false, opacity: 0.95
    }));
    fl.scale.set(1.1, 1.5, 1); fl.position.y = 1.75; g.add(fl);
    const light = new THREE.PointLight(0xff9a4a, 1.15, 13, 1.8);
    light.position.y = 2.1; g.add(light);
    g.position.set(bx, 0, bz);
    scene.add(g);
    braziers.push({ group: g, x: bx, flame: fl, light, baseI: 0.85 });
  });

  /* sarcófagos */
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x17120c });
  const sarcoMat = new THREE.MeshLambertMaterial({ map: TXA.sarco });
  const sGeo = new THREE.BoxGeometry(1.05, 2.3, 1.7);
  const sMats = [darkMat, darkMat, darkMat, darkMat, sarcoMat, sarcoMat];
  [[20, LANE_Z[1], -0.28], [44, LANE_Z[2], 0.24]].forEach(([sx, sz, rot]) => {
    const s = new THREE.Mesh(sGeo, sMats);
    s.position.set(sx, 1.15, sz); s.rotation.y = rot;
    scene.add(s);
    interactables.push({
      type: 'sarco', x: sx, z: sz, r: 2.1,
      label: () => P.hidden && P.hideType === 'sarco' && Math.abs(P.x - sx) < 2.4
        ? 'E — Salir del sarcófago'
        : 'E — Esconderte en el sarcófago'
    });
  });

  /* punto de fusión con el mural (solo corazón ligero) */
  const mural = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 2.25),
    new THREE.MeshBasicMaterial({
      map: TXA.pharaoh.clone(), color: 0x5a7ac8, transparent: true, opacity: 0.5, side: THREE.DoubleSide
    })
  );
  mural.material.map.repeat.set(1 / TXA.phFrames, 1);
  mural.material.map.offset.x = 9 / TXA.phFrames;   // pose canónica
  mural.position.set(36, 1.35, -5.75);
  scene.add(mural);
  interactables.push({
    type: 'mural', x: 36, z: LANE_Z[0], r: 2.2, mural,
    label: () => P.hidden && P.hideType === 'mural'
      ? 'E — Deshacerte de la pintura'
      : 'E — Fundirte con el mural' + (P.weight ? ' · el muro te rechaza' : '')
  });

  /* pedestales + objetos */
  const pedGeo = new THREE.BoxGeometry(0.72, 0.95, 0.72);
  const pedMat = new THREE.MeshLambertMaterial({ color: 0x1a140c });
  function pedestal(x, z) {
    const p = new THREE.Mesh(pedGeo, pedMat); p.position.set(x, 0.475, z);
    scene.add(p); return p;
  }
  function floatingItem(tex, w, h) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    );
    scene.add(m); return m;
  }
  /* declaración I — carril del fondo (zona de Ammit) */
  pedestal(12, LANE_Z[0]);
  const decl1 = floatingItem(TXA.decl, 0.62, 0.78); decl1.position.set(12, 1.55, LANE_Z[0]);
  interactables.push({ type: 'decl', id: 0, x: 12, z: LANE_Z[0], r: 1.9, mesh: decl1,
    label: () => 'E — Tomar la Declaración I' });
  /* declaración II — carril central */
  pedestal(52, LANE_Z[1]);
  const decl2 = floatingItem(TXA.decl.clone(), 0.62, 0.78); decl2.position.set(52, 1.55, LANE_Z[1]);
  interactables.push({ type: 'decl', id: 1, x: 52, z: LANE_Z[1], r: 1.9, mesh: decl2,
    label: () => 'E — Tomar la Declaración II' });
  /* oro de la ofrenda — pecado opcional */
  pedestal(30, LANE_Z[2]);
  const gold = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.34, 0.4),
    new THREE.MeshBasicMaterial({ color: 0xd9a92e })
  );
  gold.position.set(30, 1.15, LANE_Z[2]); gold.rotation.y = 0.5;
  scene.add(gold);
  const goldGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TXA.spark, transparent: true, depthWrite: false, opacity: 0.5
  }));
  goldGlow.scale.set(1.6, 1.6, 1); goldGlow.position.set(30, 1.25, LANE_Z[2]);
  scene.add(goldGlow);
  interactables.push({ type: 'gold', x: 30, z: LANE_Z[2], r: 1.9, mesh: gold, glow: goldGlow,
    label: () => 'E — Tomar el oro de la ofrenda' });

  /* PUERTA DEL ALBA */
  doorGroup = new THREE.Group();
  const dFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 6.6, 4.6),
    new THREE.MeshLambertMaterial({ map: TXA.wall.clone() })
  );
  dFrame.position.set(63.6, 3.3, 0); scene.add(dFrame);
  door = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 5.6),
    new THREE.MeshLambertMaterial({ map: TXA.door, side: THREE.DoubleSide })
  );
  door.position.set(62.4, 2.8, 0);
  scene.add(door);
  const seal = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 5.6),
    new THREE.MeshBasicMaterial({
      map: TXA.doorSeal, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  seal.position.set(62.15, 2.8, 0);
  scene.add(seal);
  sealLight = new THREE.PointLight(0xffb84a, 1.1, 8, 2);
  sealLight.position.set(61.4, 2.4, 0); scene.add(sealLight);
  winLight = new THREE.PointLight(0xfff2cc, 0, 16, 2);
  winLight.position.set(64.6, 3.4, 0); scene.add(winLight);
  const winGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 5.6),
    new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0 })
  );
  winGlow.position.set(64.9, 2.8, 0); scene.add(winGlow);
  doorGroup.userData = { seal, winGlow };
  interactables.push({ type: 'door', x: 61.6, z: 0, r: 2.4,
    label: () => D.open ? '' : P.decl >= 2
      ? 'E — Recitar las declaraciones y abrir la Puerta del Alba'
      : `E — La puerta está sellada · Declaraciones ${P.decl}/2` });

  /* partículas: chispas de antorcha */
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TXA.spark, transparent: true, depthWrite: false, opacity: 0
    }));
    s.scale.set(0.14, 0.14, 1); scene.add(s);
    particles.push({ s, life: 0, vy: 0, vx: 0 });
  }
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: TXA.smoke, transparent: true, depthWrite: false, opacity: 0
    }));
    s.scale.set(0.7, 0.7, 1); scene.add(s);
    smokePool.push({ s, life: 0 });
  }
}

/* ================= JUGADOR ================= */
function buildPlayer() {
  const mat = new THREE.MeshBasicMaterial({
    map: TXA.pharaoh, transparent: true, side: THREE.DoubleSide
  });
  player = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.55), mat);
  player.position.set(P.x, 1.28, P.z);
  scene.add(player);

  /* antorcha: luz que pinta el mundo */
  const torch = new THREE.PointLight(0xffb46b, 2.3, 24, 1.6);
  torch.position.set(0.9, 2.1, 0.35);
  scene.add(torch);

  player.userData = { torch, baseI: 1.5 };
}

function setFrame(f) {
  player.material.map.offset.x = f / TXA.phFrames;
}

function updatePlayer(dt) {
  const ud = player.userData;

  /* --- oculto: sin movimiento --- */
  if (P.hidden) {
    setFrame(9);
    const tint = P.hideType === 'mural' ? 0x8fb0e8 : 0xffffff;
    player.material.color.setHex(tint);
    player.material.opacity = P.hideType === 'mural' ? 0.85 : 0.3;
    P.beat -= dt;
    if (P.beat <= 0) { P.beat = P.weight ? 0.72 : 1.15; pulseHeart(); if (sfx) sfx.beat(P.weight); }
    return;
  }
  player.material.opacity = 1;
  player.material.color.setHex(0xffffff);

  /* --- movimiento horizontal --- */
  let mv = 0;
  if (keys['a'] || keys['arrowleft']) mv -= 1;
  if (keys['d'] || keys['arrowright']) mv += 1;
  if (mv !== 0) {
    P.dir = mv;
    P.x += mv * WALK_SPD * dt;
  }
  P.x = Math.max(CORRIDOR_MIN, Math.min(CORRIDOR_MAX, P.x));

  /* --- carriles --- */
  if (keys['w'] || keys['arrowup']) { P.lane = Math.max(0, P.lane - 1); keys['w'] = keys['arrowup'] = false; }
  if (keys['s'] || keys['arrowdown']) { P.lane = Math.min(2, P.lane + 1); keys['s'] = keys['arrowdown'] = false; }
  const tz = LANE_Z[P.lane];
  P.z += Math.sign(tz - P.z) * Math.min(Math.abs(tz - P.z), LANE_SPD * dt);

  /* --- salto --- */
  if ((keys[' '] || keys['space']) && P.ground) {
    P.vy = JUMP_V; P.ground = false; keys[' '] = keys['space'] = false;
  }
  P.vy += GRAV * dt;
  P.y += P.vy * dt;
  if (P.y <= 0) { P.y = 0; P.vy = 0; P.ground = true; }

  /* --- animación --- */
  if (!P.ground) setFrame(8);
  else if (mv !== 0) {
    P.anim += dt * 9;
    setFrame(2 + (Math.floor(P.anim) % 6));
  } else {
    P.anim += dt * 0.7;
    setFrame(Math.floor(P.anim) % 2);
  }

  /* --- posición --- */
  player.position.set(P.x, 1.28 + P.y, P.z);
  player.scale.x = P.dir;

  /* --- antorcha: parpadeo del latido --- */
  const flick = 0.92 + Math.sin(performance.now() * 0.011) * 0.06
    + (P.weight ? Math.sin(performance.now() * 0.031) * 0.12 : 0);
  ud.torch.intensity = ud.baseI * flick;
  ud.torch.position.set(P.x + P.dir * 0.85, 2.15 + P.y, P.z + 0.3);

  /* --- chispas --- */
  if (Math.random() < (mv !== 0 ? 0.5 : 0.22)) spawnSpark();
  if (Math.random() < 0.05) spawnSmoke();

  /* --- latido --- */
  P.beat -= dt;
  if (P.beat <= 0) { P.beat = P.weight ? 0.72 : 1.15; pulseHeart(); if (sfx) sfx.beat(P.weight); }
}

function pulseHeart() {
  const el = $('heartIb');
  el.style.transform = 'scale(1.28)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 130);
}

/* ================= AMMIT ================= */
function buildAmmit() {
  ammit = new THREE.Mesh(
    new THREE.PlaneGeometry(3.7, 2.16),
    new THREE.MeshBasicMaterial({ map: TXA.ammit, transparent: true, side: THREE.DoubleSide })
  );
  ammit.position.set(A.x, 1.08, A.z);
  scene.add(ammit);
  const glow = new THREE.PointLight(0x551008, 0.55, 6, 2);
  ammit.add(glow);
}

function distToPlayer() {
  return Math.hypot(P.x - A.x, P.z - A.z);
}

function updateAmmit(dt) {
  if (state !== 'playing') return;

  const laneDiff = Math.abs(P.lane - 0);          // Ammit vive en el carril 0 (fondo)
  const dx = P.x - A.x;

  /* --- ¿te ve? --- */
  if (!P.hidden) {
    const view = laneDiff === 0 ? VIEW_SAME : (laneDiff === 1 ? VIEW_ADJ : 0);
    /* solo ve hacia donde mira: si estás detrás, no te ve */
    const ahead = Math.sign(dx) === A.dir;
    if (ahead && Math.abs(dx) < view) {
      if (!A.chasing) {
        A.chasing = true; A.knows = false;
        toast('Ammit te ha visto. <em>Corre.</em>', 2.2);
      }
      A.lastSeen = P.x; A.sniff = 0;
    }
  } else if (A.chasing && !A.knows) {
    /* escondido con margen: olfatea el último rastro */
    A.sniff += dt;
  }

  /* --- comportamiento --- */
  if (A.chasing) {
    const target = (A.knows || P.hidden) ? A.lastSeen : P.x;
    const dir = Math.sign(target - A.x);
    A.x += dir * AMMIT_CHASE * dt;
    A.dir = dir !== 0 ? dir : A.dir;
    /* se acerca a tu carril mientras persigue */
    const tz = A.knows ? LANE_Z[0] : LANE_Z[P.lane];
    A.z += Math.sign(tz - A.z) * Math.min(Math.abs(tz - A.z), 2.6 * dt);

    if (!A.knows && !P.hidden && Math.abs(A.x - P.x) < 1.35 && Math.abs(A.z - P.z) < 1.2) {
      kill();
    }
    if (A.knows && Math.abs(A.x - A.lastSeen) < 1.5) {
      kill();     /* te vio entrar al escondite */
    }
    if (!A.knows && P.hidden && A.sniff > 2.6 && Math.abs(A.x - A.lastSeen) < 1.2) {
      A.chasing = false; A.sniff = 0;
      toast('Ammit pierde tu rastro… <em>por ahora.</em>', 2.6);
    }
    if (!P.hidden && Math.abs(A.x - P.x) > 10) { A.chasing = false; }
  } else {
    /* patrulla el carril del fondo */
    A.x += A.dir * AMMIT_PATROL * dt;
    if (A.x > 55) { A.x = 55; A.dir = -1; }
    if (A.x < 9) { A.x = 9; A.dir = 1; }
    A.z += Math.sign(LANE_Z[0] - A.z) * Math.min(Math.abs(LANE_Z[0] - A.z), 3 * dt);
  }

  /* --- apariencia --- */
  A.anim += dt * (A.chasing ? 7 : 3.2);
  const bob = Math.sin(A.anim) * (A.chasing ? 0.09 : 0.045);
  ammit.position.set(A.x, 1.08 + Math.abs(bob), A.z);
  ammit.scale.x = A.dir;
  ammit.material.opacity = 1;

  /* --- la devoradora apaga el pigmento --- */
  braziers.forEach(b => {
    const target = Math.abs(b.x - A.x) < 4.2 ? 0.1 : b.baseI;
    b.light.intensity += (target - b.light.intensity) * Math.min(1, dt * 3);
    b.flame.material.opacity += ((target < 0.3 ? 0.25 : 0.95) - b.flame.material.opacity) * Math.min(1, dt * 3);
  });

  /* --- audio y peligro --- */
  const d = distToPlayer();
  const danger = Math.max(0, 1 - d / 13);
  $('danger').style.opacity = A.chasing ? Math.max(0.55, danger) : danger * 0.6;
  if (sfx) sfx.setGrowl(muted ? 0 : (A.chasing ? 0.16 : danger * 0.09));
}

function kill() {
  if (state !== 'playing') return;
  state = 'dead';
  if (sfx) { sfx.death(); sfx.setGrowl(0); }
  $('danger').style.opacity = 1;
  ammit.position.set(P.x, 1.08, P.z);
  setTimeout(() => $('death').classList.remove('hidden'), 700);
}

/* ================= PARTÍCULAS ================= */
function spawnSpark() {
  const p = particles.find(p => p.life <= 0); if (!p) return;
  p.life = 0.55 + Math.random() * 0.3;
  p.vy = 1.1 + Math.random() * 1.2;
  p.vx = (Math.random() - 0.5) * 0.7 - P.dir * 0.4;
  p.s.position.set(P.x + P.dir * 0.85, 2.15 + P.y, P.z + 0.3);
  p.s.material.opacity = 0.9;
}
function spawnSmoke() {
  const p = smokePool.find(p => p.life <= 0); if (!p) return;
  p.life = 1.6 + Math.random();
  p.s.position.set(P.x + P.dir * 0.85 + (Math.random() - 0.5) * 0.3, 2.3 + P.y, P.z + 0.3);
  p.s.material.opacity = 0.16;
}
function updateParticles(dt) {
  particles.forEach(p => {
    if (p.life <= 0) return;
    p.life -= dt;
    p.s.position.y += p.vy * dt;
    p.s.position.x += p.vx * dt;
    p.s.material.opacity = Math.max(0, p.life * 1.4);
  });
  smokePool.forEach(p => {
    if (p.life <= 0) return;
    p.life -= dt;
    p.s.position.y += 0.45 * dt;
    p.s.scale.x = p.s.scale.y = 0.7 + (1.8 - p.life) * 0.5;
    p.s.material.opacity = Math.max(0, p.life * 0.1);
  });
}

/* ================= INTERACCIÓN ================= */
function nearestInteract() {
  let best = null, bd = 1e9;
  for (const it of interactables) {
    if (it.done) continue;
    const dz = Math.abs(P.z - it.z);
    const d = Math.hypot(P.x - it.x, P.z - it.z);
    if (d < it.r && dz < it.r * 0.8 && d < bd) { bd = d; best = it; }
  }
  return best;
}

function tryHide(it) {
  if (it.type === 'mural' && P.weight) {
    if (sfx) sfx.reject();
    toast('El muro te rechaza: <em>el oro pesa en tu corazón.</em>', 3.2);
    return;
  }
  if (!P.ground) return;
  /* si Ammit te ve de cerca, sabe dónde te escondes */
  if (A.chasing && Math.abs(A.x - P.x) < 3.2 && !P.hidden) {
    A.knows = true; A.lastSeen = P.x;
  }
  P.hidden = true; P.hideType = it.type;
  if (it.type === 'mural') { P.x = it.x; P.z = LANE_Z[0]; P.lane = 0; }
  player.position.set(P.x, 1.28, P.z);
  setFrame(9); player.scale.x = 1;
  if (sfx) sfx.hide();
  toast(it.type === 'mural'
    ? 'Tu <em>ka</em> se funde con la pintura. Ammit pasa de largo.'
    : 'Contienes la respiración dentro del sarcófago.', 3);
}

function unhide() {
  P.hidden = false; P.hideType = null;
  if (A.knows) { A.knows = false; A.lastSeen = P.x; }   /* te ha visto salir: te persigue a ti */
  if (sfx) sfx.unhide();
}

function interact() {
  if (state !== 'playing') return;

  /* salir del escondite */
  if (P.hidden) { unhide(); return; }

  const it = nearestInteract();
  if (!it) return;

  switch (it.type) {
    case 'sarco':
    case 'mural':
      tryHide(it);
      break;
    case 'decl': {
      it.done = true;
      scene.remove(it.mesh);
      P.decl++;
      $(`slot${P.decl - 1}`).classList.add('filled');
      $('cartLabel').textContent = `Declaraciones ${P.decl}/2`;
      if (sfx) sfx.pickup();
      toast(P.decl === 1
        ? '«No he robado el pan del templo.» — <em>Declaración I</em>'
        : '«No he apagado la luz de otro.» — <em>Declaración II</em>', 3.4);
      break;
    }
    case 'gold':
      it.done = true;
      scene.remove(it.mesh); scene.remove(it.glow);
      P.weight = true;
      if (sfx) sfx.gold();
      toast('Has tomado el oro de la ofrenda.<br><em>Tu corazón pesa más.</em>', 3.4);
      break;
    case 'door':
      if (P.decl >= 2) openDoor();
      else {
        if (sfx) sfx.reject();
        toast(`La puerta permanece sellada.<br><em>Declaraciones: ${P.decl}/2</em>`, 2.8);
      }
      break;
  }
}

function openDoor() {
  D.open = true; state = 'opening';
  if (sfx) sfx.door();
  $('hint').style.opacity = 0;
  toast('Recitas las declaraciones. El sello <em>arde en oro.</em>', 3);
}

function updateDoor(dt) {
  if (!D.open) {
    sealLight.intensity = 1 + Math.sin(performance.now() * 0.003) * 0.25;
    return;
  }
  D.t += dt;
  door.position.y = Math.max(-2.9, 2.8 - D.t * 2.2);
  doorGroup.userData.seal.material.opacity = Math.max(0, 1 - D.t * 0.8);
  sealLight.intensity = Math.max(0, 1.1 - D.t);
  winLight.intensity = Math.min(2.6, D.t * 2.2);
  doorGroup.userData.winGlow.material.opacity = Math.min(0.85, D.t * 0.7);
  /* el Faraón camina hacia el alba */
  if (D.t > 1.1) {
    P.x += 3.4 * dt; P.dir = 1;
    player.position.set(P.x, 1.28, P.z);
    setFrame(2 + (Math.floor(D.t * 8) % 6));
    player.scale.x = 1;
    if (P.x > 63.4 && state === 'opening') {
      state = 'win';
      if (sfx) sfx.win();
      $('win').classList.remove('hidden');
    }
  }
}

/* ================= CÁMARA ================= */
let camX = 4;
function updateCamera(dt) {
  const targetX = P.x + 1.5;
  camX += (targetX - camX) * Math.min(1, dt * 3.2);
  const targetFov = P.hidden ? 46 : 50;
  camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 2.5);
  camera.updateProjectionMatrix();
  /* cámara DENTRO del corredor: lateral con leve picado, estilo Klonoa.
     Nunca fuera del muro frontal (z=6.2): la cámara mira desde z=5.6 */
  camera.position.set(camX, 4.2, 5.6);
  camera.lookAt(camX + 0.5, 1.9, -0.5);
}

/* ================= HUD y pistas ================= */
let hintPulse = 0;
function updateHUD(dt) {
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) toastEl().style.opacity = 0;
  }
  if (state !== 'playing') { if (state !== 'opening') hint(''); return; }
  if (P.hidden) {
    const it = P.hideType === 'mural'
      ? interactables.find(i => i.type === 'mural')
      : null;
    hint(P.hideType === 'mural' ? 'E — Deshacerte de la pintura' : 'E — Salir del sarcófago');
    return;
  }
  const it = nearestInteract();
  hint(it ? it.label() : '');
}

/* ================= RESET ================= */
function resetGame() {
  Object.assign(P, {
    x: -2, lane: 1, z: 0, y: 0, vy: 0, ground: true, dir: 1,
    hidden: false, hideType: null, anim: 0, frame: 0, beat: 0.4, weight: false, decl: 0
  });
  Object.assign(A, { x: 16, z: LANE_Z[0], dir: -1, chasing: false, lastSeen: 0, sniff: 0, knows: false, anim: 0 });
  D.open = false; D.t = 0;
  door.position.y = 2.8;
  doorGroup.userData.seal.material.opacity = 1;
  winLight.intensity = 0;
  doorGroup.userData.winGlow.material.opacity = 0;

  interactables.forEach(it => {
    if (it.done) {
      it.done = false;
      if (it.mesh) scene.add(it.mesh);
      if (it.glow) scene.add(it.glow);
    }
  });
  [0, 1].forEach(i => $(`slot${i}`).classList.remove('filled'));
  $('cartLabel').textContent = 'Declaraciones 0/2';
  $('danger').style.opacity = 0;
  ['death', 'win'].forEach(id => $(id).classList.add('hidden'));
  camX = P.x + 5.2;
  state = 'playing';
  toast('Despiertas de nuevo. La Duat no recuerda tu muerte.', 3);
}

/* ================= ARRANQUE ================= */
function boot() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (THREE.sRGBEncoding !== undefined) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  $('game').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030204);
  scene.fog = new THREE.FogExp2(0x050308, 0.018);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 90);
  camera.position.set(4, 4.2, 5.6);
  camera.lookAt(4.5, 1.9, -0.5);

  /* luz ambiente mínima: la tumba está muerta */
  scene.add(new THREE.AmbientLight(0x8a6f4d, 0.42));
  const hemi = new THREE.HemisphereLight(0x2a3a6e, 0x4a3420, 0.5);
  scene.add(hemi);

  TXA = TX.build();
  buildWorld();
  buildPlayer();
  buildAmmit();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (e.repeat) { if (k === ' ') e.preventDefault(); return; }
    keys[k] = true;
    if (k === ' ') e.preventDefault();

    if (state === 'title' && k === 'enter') startGame();
    else if ((state === 'dead' || state === 'win') && k === 'r') resetGame();
    else if (state === 'playing' && k === 'e') interact();
    else if (k === 'm' && sfx) {
      const m = sfx.toggleMute();
      toast(m ? 'Sonido silenciado.' : 'Sonido activado.', 1.4);
    }
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  let last = performance.now();
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'playing') {
      updatePlayer(dt);
      updateAmmit(dt);
    } else if (state === 'opening') {
      updateDoor(dt);
    }
    updateParticles(dt);
    updateCamera(dt);
    updateHUD(dt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);
}

function startGame() {
  $('title').classList.add('hidden');
  if (!sfx) sfx = makeSFX();
  if (sfx && sfx.ctx.state === 'suspended') sfx.ctx.resume();
  state = 'playing';
  $('controlsHint').style.opacity = 1;
  setTimeout(() => { $('controlsHint').style.opacity = 0; }, 9000);
  toast('La Duat te envuelve. Busca las <em>dos declaraciones.</em>', 4);
}

if (typeof window !== 'undefined' && !window.__TEROS_TEST__) {
  boot();
}

/* gancho de depuración: window.__DBG() desde la consola del navegador */
if (typeof window !== 'undefined') {
  window.__DBG = () => ({
    state,
    player: { x: P.x, y: P.y, z: P.z, lane: P.lane, hidden: P.hidden, decl: P.decl, weight: P.weight },
    ammit: { x: A.x, z: A.z, dir: A.dir, chasing: A.chasing, knows: A.knows },
    near: interactables.filter(i => !i.taken && Math.hypot(P.x - i.x, P.z - i.z) < i.r + 0.6)
      .map(i => ({ type: i.type, d: +Math.hypot(P.x - i.x, P.z - i.z).toFixed(2) }))
  });
}

/* gancho para pruebas automatizadas en Node (sin navegador) */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { P, A, D, interact, unhide, resetGame, startGame, boot, get state() { return state; }, set state(v) { state = v; }, keys, interactables, LANE_Z };
}

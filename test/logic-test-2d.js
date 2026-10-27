/* pruebas de lógica para la versión 2D — node test/logic-test-2d.js */
'use strict';
let pass = 0, fail = 0;
const ok = (cond, name) => {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ FALLO: ${name}`); }
};

/* stubs mínimos de navegador */
global.window = { addEventListener() { } };
global.window.__TEROS_TEST__ = true;
global.addEventListener = () => { };
global.document = {
  getElementById: () => ({ classList: { add() { }, remove() { } }, style: {} }),
  createElement: () => ({ getContext: () => null })
};
global.requestAnimationFrame = () => { };

const G = require('../js/game2d.js');

console.log('\n=== LA TUMBA 2D · pruebas de lógica ===\n');

/* arranque */
G.startGame();
ok(G.state() === 'playing', 'startGame arranca');
const P = G.P(), A = G.A();

/* el jugador aparece en el suelo, dentro del nivel */
ok(P.x > 0 && P.y > 0, `spawn en (${P.x.toFixed(0)}, ${P.y.toFixed(0)})`);
ok(G.items().filter(i => i.type === 'decl').length === 2, 'hay 2 declaraciones');
ok(G.items().some(i => i.type === 'gold'), 'hay oro');
ok(G.items().some(i => i.type === 'mural'), 'hay mural');
ok(G.items().some(i => i.type === 'sarco'), 'hay sarcófago');

/* movimiento horizontal */
const x0 = P.x;
G.keys.right = true;
for (let i = 0; i < 30; i++) G.updatePlayer(1 / 60);
G.keys.right = false;
ok(P.x > x0 + 40, `correr a la derecha funciona (Δ=${(P.x - x0).toFixed(0)}px)`);

/* salto (en el pozo despejado de la columna del spawn) */
P.x = 130;   /* col 2: shaft sin plataformas hasta arriba */
const y0 = P.y;
G.keys.jump = true;
let peak = y0;
for (let i = 0; i < 70; i++) { G.updatePlayer(1 / 60); peak = Math.min(peak, P.y); }
G.keys.jump = false;
for (let i = 0; i < 80; i++) G.updatePlayer(1 / 60);
ok(peak < y0 - 60, `el salto sube (${(y0 - peak).toFixed(0)}px)`);
ok(P.ground, 'aterriza tras el salto');

/* recoger una declaración (teleport a la primera) */
const decl1 = G.items().find(i => i.type === 'decl' && !i.taken);
P.x = decl1.x - 17; P.y = decl1.y - 28; P.vy = 0;
for (let i = 0; i < 5; i++) G.updatePlayer(1 / 60);
ok(P.decl === 1, `declaración recogida (decl=${P.decl})`);

/* el oro pesa: el mural rechaza */
const gold = G.items().find(i => i.type === 'gold' && !i.taken);
P.x = gold.x - 17; P.y = gold.y - 28; P.vy = 0;
for (let i = 0; i < 5; i++) G.updatePlayer(1 / 60);
ok(P.gold, 'oro recogido');
const mural = G.items().find(i => i.type === 'mural');
P.x = mural.x - 17; P.y = mural.y - 28; P.vy = 0; P.ground = true;
G.keys.act = true;
for (let i = 0; i < 3; i++) G.updatePlayer(1 / 60);
G.keys.act = false;
ok(!P.hidden, 'el mural RECHAZA al corazón con oro');

/* sarcófago: siempre acepta */
const sarco = G.items().find(i => i.type === 'sarco');
P.x = sarco.x - 17; P.y = sarco.y - 28; P.vy = 0; P.ground = true;
G.keys.act = true;
for (let i = 0; i < 3; i++) G.updatePlayer(1 / 60);
ok(P.hidden, 'el sarcófago acoge (aunque peses)');
/* salir del escondite */
G.keys.act = false;
for (let i = 0; i < 30; i++) G.updatePlayer(1 / 60);
ok(!P.hidden, 'sales del sarcófago al soltar E');

/* segunda declaración y puerta */
const decl2 = G.items().find(i => i.type === 'decl' && !i.taken);
P.x = decl2.x - 17; P.y = decl2.y - 28; P.vy = 0;
for (let i = 0; i < 5; i++) G.updatePlayer(1 / 60);
ok(P.decl === 2, 'segunda declaración recogida');

/* victoria en la puerta (arriba del todo) */
const doorPos = (() => {
  for (let r = 0; r < G.LEVEL.length; r++) {
    const c = G.LEVEL[r].indexOf('D');
    if (c >= 0) return { r, c };
  } return null;
})();
ok(doorPos, 'la puerta existe en el nivel');
P.x = doorPos.c * 60 + 30 - 17; P.y = doorPos.r * 60 + 30 - 28; P.vy = 0;
for (let i = 0; i < 5; i++) G.updatePlayer(1 / 60);
ok(G.state() === 'win', 'victoria con 2 declaraciones en la puerta');

/* Ammit: muerte por proximidad */
G.startGame();
const P2 = G.P(), A2 = G.A();
A2.x = P2.x + 10; A2.y = P2.y; A2.chasing = true; A2.dir = 1;
for (let i = 0; i < 5; i++) G.updateAmmit(1 / 60);
ok(G.state() === 'dead', 'Ammit mata por proximidad');

/* Ammit: te ve solo de frente */
G.startGame();
const P3 = G.P(), A3 = G.A();
/* jugador DETRÁS de Ammit: Ammit mira a la izquierda (dir=-1) */
A3.x = 500; A3.dir = -1; A3.chasing = false;
P3.x = 700; P3.hidden = false;   /* 200px a la derecha = su espalda */
for (let i = 0; i < 3; i++) G.updateAmmit(1 / 60);
ok(!A3.chasing, 'Ammit NO ve a su espalda');

/* reset restaura */
G.startGame();
const P4 = G.P();
ok(G.state() === 'playing' && P4.decl === 0 && !P4.gold, 'resetGame restaura todo');

console.log(`\n=== ${pass} OK · ${fail} FALLOS ===\n`);
process.exit(fail ? 1 : 0);

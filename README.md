# 𓂀 La Tumba del Faraón

**Demo técnica 2.5D** · three.js r128 · cero assets externos (todo el arte se genera proceduralmente en canvas).

Eres el Faraón. Has muerto y despiertas en la Duat. Tu corazón pesa.
Reúne las **dos declaraciones** y alcanza la **Puerta del Alba**.
Ammit, la devoradora, patrulla el carril del fondo. Si te ve, corre.

## Cómo jugar

Abre `index.html` en cualquier navegador moderno. No requiere servidor ni conexión.

| Tecla | Acción |
|---|---|
| `A` / `D` o `←` / `→` | Moverse |
| `ESPACIO` | Saltar |
| `W` / `S` o `↑` / `↓` | Cambiar de carril (fondo ↔ frente) |
| `E` | Interactuar · esconderse · tomar objetos |
| `M` | Silenciar sonido |
| `ENTER` | Empezar · `R` renacer tras la muerte |

## Qué demuestra esta demo

- **Formato 2.5D "relieve vivo"**: sprites planos con animación en una escena 3D con tres carriles de profundidad.
- **El peso del corazón**: si tomas el oro de la ofrenda, tu corazón pesa. El latido se acelera, la antorcha parpadea y **el mural ya no te acepta** — solo el sarcófago sigue siendo refugio.
- **Sigilo**: Ammit patrulla su carril. Se esconde en el mural (solo corazón ligero) o en el sarcófago (siempre, pero si te ve entrar, te encontrará).
- **Arte procedural**: muros con registros jeroglíficos, Nut estrellada en el techo, sarcófago osiríaco, Ammit como lo-no-pintado. Sin una sola imagen externa.
- **Audio procedural**: drone de tumba, viento, latido, gruñido de Ammit por proximidad. WebAudio puro.

## Estructura

```
index.html          · HUD diegético (glifo ib, cartouches) y pantallas
js/textures.js      · generador de arte procedural (canvas)
js/game.js          · lógica del juego: física, carriles, sigilo, IA de Ammit
libs/three.min.js   · three.js r128 (local, sin CDN)
test/logic-test.js  · pruebas de lógica (node test/logic-test.js) — 23/23
```

## Estado

Demo técnica del concepto. Siguiente: dirección de arte final, más puertas del Duat, juicio de Osiris.

— Scarlett Maroon, para Mangel · 2026

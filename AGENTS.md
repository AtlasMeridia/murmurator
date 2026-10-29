# Murmurator — agent instructions

GPU particle simulation with flow fields, built as an exploration instrument: let
it run, steer it with sliders or presets, and export frames worth keeping.
TypeScript + Vite + three.js. WebGPU compute when the browser supports it, with
a CPU/WebGL fallback.

## Commands

- `npm run dev` — dev server on the LAN (`--host`), for checking on a phone.
- `npm run dev:local` — dev server on localhost only.
- `npm run build` — typecheck (`tsc`) and production build into `dist/`.

WebGPU needs a secure context: `localhost` works, a LAN IP over plain http falls
back to WebGL.

## Layout

- `src/main.ts` — UI markup, event wiring, Info readout, presets, downloads.
- `src/ui/icons.ts` — inline stroke icons (24×24, 2px, `currentColor`).
- `src/ui/styles/colors_and_type.css` — Minerali tokens, a byte-for-byte copy.
- `src/ui/styles/main.css` — app styles; tokens only, no raw colors.
- `src/core/engine/` — `ParticleEngine` picks WebGPU (`webgpu/`, loaded with
  dynamic imports) or the CPU path (`Particle.ts`, `Physics.ts`, `Renderer.ts`).
- `src/core/state/` — `Parameters.ts` defines every parameter (range, step,
  default); `StateStore` holds values and notifies subscribers; `presets.ts`
  holds the built-in presets.
- `src/core/events/` — `EventBus` for engine frame/state/resize events.
- `src/api/ConsoleAPI.ts` — `window.murmurator` debugging API (`murmurator.help()`).
- `docs/PHYSICS.md` — how the forces work. `docs/history/` holds the January
  2026 brief and architecture plan. They're kept as history, and parts were
  never built (the AI control layer, video export).

## Conventions

- State is the source of truth. Controls write to `stateStore`; anything that
  reacts (canvas size, segmented controls, engine) subscribes. Changes made
  from the console API show up in the UI the same way.
- To add a parameter, define it in `Parameters.ts` and render it with
  `createSlider` or `createEnumField` in `main.ts`.

## Design system

Minerali v6 from `~/Projects/atlas-design`, graphite operator profile: mono
chrome (`.mn-chrome` on the panel), hairline borders, square corners, no
gradients or shadows. Acid (`--accent-cut`) marks only live or selected state:
the running dot, the active segment, a dragged slider thumb, focus.

- Never edit `src/ui/styles/colors_and_type.css`. Fixes go to atlas-design
  first, then copy the file over again. Murmurator isn't registered in
  atlas-design's `desk/consumers.json`, so `design-desk sync` doesn't cover it
  yet. Until it's registered, copy the file by hand.
- Before UI changes, read `~/Projects/atlas-design/TASTE.md`.
- Sentence case in source; caps come from CSS. No emoji, no arrow glyphs.

## Tracking

Tasks live in `BACKLOG.md`. Session notes go in `_dev/dev-log.md`. `_dev/` is
gitignored because the repo is public.

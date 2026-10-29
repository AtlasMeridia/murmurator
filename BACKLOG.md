# Backlog

## Burn

Tasks explicitly approved for unattended automated dispatch by the capacity-burn scheduler.

## Now

## Next

- [ ] Register murmurator in atlas-design `desk/consumers.json` so `design-desk sync` keeps the token copy current (desk-owned file, so it needs a desk session).
- [ ] Particle lifetime in GPU mode (TODO in `ParticleEngine.ts`).
- [ ] Turbulence draws straight-line artifacts: its jitter is `sin(pos + time*1000)`, which is coherent across particles. Replace with a per-particle hash. No preset uses it until then.

## Blocked

## Later

- [ ] TypeScript 7 and Vite 8 major upgrades.
- [ ] Video export.
- [ ] Tangential (swirl) force around the attractor, so a real vortex preset is possible.
- [ ] Graphite ⇄ cream theme toggle, if a light ground is ever useful here.

## Done

- [x] WebGPU physics: noise, attractor, clamp and bounce now apply (TSL `If` blocks used dropped JS reassignment); tracer fade quad now renders; presets retuned, Vortex → Orbit, presets apply over defaults — 2026-10-28
- [x] GPU particles no longer freeze after reset or shape change — 2026-10-28
- [x] WebGPU: compute node built once instead of per frame; sync render/compute (renderAsync deprecated in r181); opaque clear color; three pre-bundled together in dev so a mid-session re-optimize can't mix instances — 2026-10-28

- [x] Align UI with Minerali v6 tokens; inline SVG icons; sticky playback head; state-driven viewport sync — 2026-10-28
- [x] Remove dead CSS and unused barrel modules; three 0.186, vite 7.3.7 — 2026-10-28

# Murmurator Physics Guide

A comprehensive reference for understanding and tuning the particle simulation.

## Overview

Murmurator simulates thousands of particles moving through a 2D flow field. Each particle has a position and velocity, updated every frame based on:

- **Noise field** — Smooth, organic forces derived from 3D Perlin noise
- **Global forces** — Constant directional push (gravity)
- **Attractor** — Pull toward (or repulsion from) a point
- **Turbulence** — Random jitter for chaos
- **Damping** — Velocity decay over time
- **Bounds** — Edge behavior (wrap, bounce, or escape)

---

## Parameter Reference

### Particles

| Parameter | Key | Default | Range | Effect |
|-----------|-----|---------|-------|--------|
| Count | `particles.count` | 5000 | 100–200,000 | Number of particles. Higher = denser visuals but more GPU load |
| Size | `particles.size` | 2 | 0.5–20 | Base radius of each particle in pixels |
| Color | `particles.color` | #ffffff | Any hex | Base color for all particles |
| Opacity | `particles.opacity` | 0.8 | 0–1 | Transparency (0 = invisible, 1 = solid) |
| Size Variation | `particles.sizeVariation` | 0.5 | 0–1 | Random size range. 0 = uniform, 1 = 0% to 200% of base size |
| Lifetime | `particles.lifetime` | 0 | 0–30 | Seconds before particle respawns (0 = immortal) |
| Initial Speed | `particles.initialSpeed` | 0.5 | 0–5 | Starting velocity magnitude when spawned |
| Spawn Mode | `particles.spawnMode` | random | random, center, edges, grid | Where new particles appear |
| Shape | `particles.shape` | circle | circle, square, triangle, ring | Particle geometry |

### Physics

#### Noise Field

| Parameter | Key | Default | Range | Effect |
|-----------|-----|---------|-------|--------|
| Noise Strength | `physics.noise.strength` | 1 | 0–5 | How strongly the noise field pushes particles |
| Noise Scale | `physics.noise.scale` | 0.005 | 0.001–0.1 | Spatial frequency. Lower = smoother, larger flow patterns |
| Noise Evolution | `physics.noise.speed` | 0.001 | 0–0.01 | How fast the noise pattern changes over time |

#### Forces

| Parameter | Key | Default | Range | Effect |
|-----------|-----|---------|-------|--------|
| Gravity X | `physics.force.x` | 0 | -2–2 | Constant horizontal force (positive = right) |
| Gravity Y | `physics.force.y` | 0 | -2–2 | Constant vertical force (positive = down in screen space) |
| Attractor Strength | `physics.attractor.strength` | 0 | -2–2 | Pull toward attractor point. Negative = repel |
| Attractor X | `physics.attractor.x` | 0 | -1–1 | Normalized X position (-1 = left edge, 1 = right edge) |
| Attractor Y | `physics.attractor.y` | 0 | -1–1 | Normalized Y position (-1 = top, 1 = bottom) |

#### Motion

| Parameter | Key | Default | Range | Effect |
|-----------|-----|---------|-------|--------|
| Damping | `physics.damping` | 0.98 | 0.8–1 | Velocity multiplier per frame. 1 = no friction, lower = more drag |
| Max Velocity | `physics.maxVelocity` | 10 | 1–50 | Speed cap to prevent runaway particles |
| Turbulence | `physics.turbulence` | 0 | 0–1 | Random force each frame. Creates jittery, chaotic motion |

### Simulation

| Parameter | Key | Default | Range | Effect |
|-----------|-----|---------|-------|--------|
| Speed | `simulation.speed` | 0.1 | 0.01–1 | Time multiplier. Higher = faster simulation |
| Bounds | `simulation.bounds` | wrap | wrap, bounce, none | Edge behavior (see below) |

**Bounds modes:**
- **wrap** — Particles teleport to opposite edge (seamless flow)
- **bounce** — Particles reflect off edges with 80% energy retention
- **none** — Particles can leave the canvas (eventually disappear)

### Rendering

| Parameter | Key | Default | Range | Effect |
|-----------|-----|---------|-------|--------|
| Tracers | `rendering.tracers` | 0 | 0–0.2 | Trail persistence. 0 = no trails, higher = longer fading trails |

---

## How Physics Works

Each frame, every particle goes through this update sequence:

### 1. Global Forces
```
velocity += force * deltaTime * 0.01
```
Gravity (force.x, force.y) adds a constant push in one direction.

### 2. Noise Field Sampling
```
noiseX = noise3D(x * scale, y * scale, time * speed)
noiseY = noise3D(x * scale + 100, y * scale + 100, time * speed)
velocity += noise * strength * deltaTime * 0.1
```
The 3D noise function returns values in [-1, 1]. Using different offsets for X and Y creates varied directional flow. The third dimension (time) makes the pattern evolve smoothly.

### 3. Attractor Calculation
```
direction = attractorPosition - particlePosition
distance = length(direction)
force = strength / distance * deltaTime * 0.5
velocity += normalize(direction) * force
```
Inverse-distance falloff creates natural gravitational behavior. Negative strength repels.

### 4. Turbulence
```
velocity += random(-0.5, 0.5) * turbulence * deltaTime * 0.5
```
Pure randomness added each frame. Even small values (0.1) create visible jitter.

### 5. Damping
```
velocity *= damping
```
Applied after all forces. At 0.98, particles lose 2% velocity per frame. At 60fps, this halves velocity in ~34 frames (~0.6 seconds).

### 6. Velocity Clamping
```
if (speed > maxVelocity) {
  velocity = normalize(velocity) * maxVelocity
}
```
Prevents particles from accelerating indefinitely.

### 7. Position Update
```
position += velocity * deltaTime
```

### 8. Boundary Handling
Applied last, based on `simulation.bounds` setting.

---

## Parameter Interactions

Understanding how parameters combine is key to creating specific effects.

| Combination | Result |
|-------------|--------|
| High noise + low damping | Fluid, organic flow that never settles |
| High noise + high damping | Responsive but controlled movement |
| Strong attractor + high damping | Particles cluster and orbit tightly |
| Strong attractor + low damping | Slingshot effect, particles gain speed |
| Turbulence + low noise | Chaotic but structureless motion |
| Turbulence + high noise | Chaotic with underlying flow direction |
| Gravity + wrap bounds | Perpetual falling particles |
| Gravity + bounce bounds | Particles settle at bottom |
| Low noise scale + high strength | Large, sweeping patterns |
| High noise scale + high strength | Intricate, detailed turbulence |

---

## Recipes

Suggested starting points for common effects.

### Calm Flow
Gentle, meditative movement.
```
noise.strength: 0.5
noise.scale: 0.003
noise.speed: 0.0005
damping: 0.99
turbulence: 0
tracers: 0.05
```

### Swarm
Particles cluster and orbit a point.
```
attractor.strength: 1.5
attractor.x: 0
attractor.y: 0
damping: 0.95
noise.strength: 0.3
turbulence: 0.1
```

### Vortex
Spiral patterns around center.
```
attractor.strength: 0.8
noise.strength: 1.5
noise.scale: 0.008
damping: 0.97
force.x: 0.3  // Creates rotation
```

### Chaos
Erratic, unpredictable motion.
```
noise.strength: 3
noise.scale: 0.02
noise.speed: 0.005
turbulence: 0.5
damping: 0.95
maxVelocity: 20
```

### Rain
Particles falling downward.
```
force.y: 1.5
noise.strength: 0.2
noise.scale: 0.01
damping: 0.99
bounds: wrap
spawnMode: edges
```

### Explosion (Outward)
Particles blast outward from center.
```
attractor.strength: -2
spawnMode: center
initialSpeed: 3
damping: 0.98
bounds: none
```

### Fireflies
Slow drifting with occasional bursts.
```
noise.strength: 0.4
noise.scale: 0.002
turbulence: 0.15
damping: 0.99
particles.size: 3
tracers: 0.02
```

---

## Tips

1. **Start with damping** — It's the most impactful parameter for overall feel. High damping (0.99) = sluggish. Low damping (0.9) = energetic.

2. **Noise scale is spatial frequency** — Think of it as "zoom level" on the flow field. Lower values = zoomed in = smoother.

3. **Tracers reveal motion** — Even small tracer values (0.02) help visualize flow patterns. Essential for tuning.

4. **Attractor + offset = orbits** — Move the attractor off-center and add slight force to create orbital dynamics.

5. **Bounds affect density** — "wrap" keeps constant density. "bounce" concentrates particles at edges. "none" depletes particles over time (combine with lifetime to respawn).

6. **Use lifetime for renewal** — Short lifetime (5-10s) with any spawn mode creates continuous fresh particles entering the system.

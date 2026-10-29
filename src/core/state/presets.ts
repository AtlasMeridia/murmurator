// Built-in presets for common particle effects

import { getDefaultParameters } from './Parameters.ts';

export interface Preset {
  name: string;
  description: string;
  settings: Record<string, number | string | boolean>;
}

// Kept as the user set them when a preset is applied; everything else resets
const KEPT_KEYS = ['particles.color', 'particles.shape', 'viewport.aspectRatio', 'viewport.orientation'];

export const PRESETS: Preset[] = [
  {
    name: 'Calm flow',
    description: 'Slow drift along a gently changing flow field',
    settings: {
      'particles.count': 2500,
      'particles.size': 1,
      'particles.opacity': 0.5,
      'physics.noise.strength': 0.4,
      'physics.noise.scale': 0.003,
      'physics.noise.speed': 0.0005,
      'physics.damping': 0.95,
      'rendering.tracers': 0.1,
      'simulation.speed': 0.08,
    },
  },
  {
    name: 'Swarm',
    description: 'Particles pulled into a churning cluster at the center',
    settings: {
      'particles.size': 1.5,
      'physics.attractor.strength': 2,
      'physics.noise.strength': 0.25,
      'physics.noise.scale': 0.012,
      'physics.noise.speed': 0.004,
      'physics.damping': 0.94,
      'rendering.tracers': 0.07,
      'simulation.speed': 0.15,
    },
  },
  {
    name: 'Orbit',
    description: 'Low-friction fall toward the center, overshooting into converging strands',
    settings: {
      'particles.count': 3000,
      'particles.size': 1,
      'particles.opacity': 0.6,
      'particles.initialSpeed': 2,
      'physics.attractor.strength': 1,
      'physics.noise.strength': 0.05,
      'physics.noise.scale': 0.005,
      'physics.damping': 0.995,
      'physics.maxVelocity': 6,
      'rendering.tracers': 0.1,
      'simulation.speed': 0.12,
    },
  },
  {
    name: 'Chaos',
    description: 'Strong, fast-shifting flow that tears particles into sheets',
    settings: {
      'particles.count': 3000,
      'particles.size': 1,
      'particles.opacity': 0.7,
      'physics.noise.strength': 2,
      'physics.noise.scale': 0.01,
      'physics.noise.speed': 0.003,
      'physics.damping': 0.96,
      'physics.maxVelocity': 12,
      'rendering.tracers': 0.08,
      'simulation.speed': 0.2,
    },
  },
  {
    name: 'Rain',
    description: 'Particles falling downward in long streaks',
    settings: {
      'particles.count': 2500,
      'particles.size': 1,
      'particles.opacity': 0.7,
      'physics.force.x': 0.1,
      'physics.force.y': -2,
      'physics.noise.strength': 0.04,
      'physics.noise.scale': 0.004,
      'physics.noise.speed': 0.001,
      'physics.damping': 0.98,
      'simulation.bounds': 'wrap',
      'rendering.tracers': 0.12,
      'simulation.speed': 0.12,
    },
  },
];

// Full settings for a preset: defaults for everything it doesn't set, so the
// previous preset can't leak through
export function resolvePreset(preset: Preset): Record<string, number | string | boolean> {
  const defaults = getDefaultParameters();
  for (const key of KEPT_KEYS) delete defaults[key];
  return { ...defaults, ...preset.settings };
}

// Get a preset by name
export function getPreset(name: string): Preset | undefined {
  return PRESETS.find(p => p.name === name);
}

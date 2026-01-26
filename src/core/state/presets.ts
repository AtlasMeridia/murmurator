// Built-in presets for common particle effects

export interface Preset {
  name: string;
  description: string;
  settings: Record<string, number | string | boolean>;
}

export const PRESETS: Preset[] = [
  {
    name: 'Calm Flow',
    description: 'Gentle, meditative movement',
    settings: {
      'physics.noise.strength': 0.5,
      'physics.noise.scale': 0.003,
      'physics.noise.speed': 0.0005,
      'physics.damping': 0.99,
      'physics.turbulence': 0,
      'physics.force.x': 0,
      'physics.force.y': 0,
      'physics.attractor.strength': 0,
      'rendering.tracers': 0.05,
      'simulation.speed': 0.1,
    },
  },
  {
    name: 'Swarm',
    description: 'Particles cluster and orbit a central point',
    settings: {
      'physics.attractor.strength': 1.5,
      'physics.attractor.x': 0,
      'physics.attractor.y': 0,
      'physics.damping': 0.95,
      'physics.noise.strength': 0.3,
      'physics.noise.scale': 0.005,
      'physics.turbulence': 0.1,
      'physics.force.x': 0,
      'physics.force.y': 0,
      'rendering.tracers': 0.02,
      'simulation.speed': 0.15,
    },
  },
  {
    name: 'Vortex',
    description: 'Spiral patterns around center',
    settings: {
      'physics.attractor.strength': 0.8,
      'physics.attractor.x': 0,
      'physics.attractor.y': 0,
      'physics.noise.strength': 1.5,
      'physics.noise.scale': 0.008,
      'physics.noise.speed': 0.002,
      'physics.damping': 0.97,
      'physics.force.x': 0.3,
      'physics.force.y': 0,
      'physics.turbulence': 0,
      'rendering.tracers': 0.08,
      'simulation.speed': 0.12,
    },
  },
  {
    name: 'Chaos',
    description: 'Erratic, unpredictable motion',
    settings: {
      'physics.noise.strength': 3,
      'physics.noise.scale': 0.02,
      'physics.noise.speed': 0.005,
      'physics.damping': 0.95,
      'physics.turbulence': 0.5,
      'physics.maxVelocity': 20,
      'physics.force.x': 0,
      'physics.force.y': 0,
      'physics.attractor.strength': 0,
      'rendering.tracers': 0,
      'simulation.speed': 0.2,
    },
  },
  {
    name: 'Rain',
    description: 'Particles falling downward',
    settings: {
      'physics.force.x': 0,
      'physics.force.y': 1.5,
      'physics.noise.strength': 0.2,
      'physics.noise.scale': 0.01,
      'physics.noise.speed': 0.001,
      'physics.damping': 0.99,
      'physics.turbulence': 0,
      'physics.attractor.strength': 0,
      'simulation.bounds': 'wrap',
      'rendering.tracers': 0.1,
      'simulation.speed': 0.15,
    },
  },
];

// Get a preset by name
export function getPreset(name: string): Preset | undefined {
  return PRESETS.find(p => p.name === name);
}

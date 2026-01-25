// Parameter definitions for the particle system
// These define what can be controlled and their valid ranges

export type ParameterType = 'number' | 'boolean' | 'formula' | 'color' | 'enum';

export interface ParameterDef {
  key: string;              // Unique identifier, dot-notation path
  label: string;            // Human-readable name
  type: ParameterType;
  default: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];       // For enum type
  category: string;         // For UI grouping
  subcategory?: string;     // 'basic' or 'advanced' for UI organization
  description?: string;     // For AI context
}

// Default parameter definitions
export const PARAMETER_DEFINITIONS: ParameterDef[] = [
  // Particle system - Basic
  {
    key: 'particles.count',
    label: 'Count',
    type: 'number',
    default: 5000,
    min: 100,
    max: 50000,
    step: 100,
    category: 'particles',
    subcategory: 'basic',
    description: 'Number of particles in the system',
  },
  {
    key: 'particles.size',
    label: 'Size',
    type: 'number',
    default: 2,
    min: 0.5,
    max: 20,
    step: 0.5,
    category: 'particles',
    subcategory: 'basic',
    description: 'Base size of each particle',
  },
  {
    key: 'particles.color',
    label: 'Color',
    type: 'color',
    default: '#ffffff',
    category: 'particles',
    subcategory: 'basic',
    description: 'Base color of particles',
  },
  {
    key: 'particles.opacity',
    label: 'Opacity',
    type: 'number',
    default: 0.8,
    min: 0,
    max: 1,
    step: 0.05,
    category: 'particles',
    subcategory: 'basic',
    description: 'Transparency of particles',
  },

  // Particle system - Advanced
  {
    key: 'particles.sizeVariation',
    label: 'Size Variation',
    type: 'number',
    default: 0.5,
    min: 0,
    max: 1,
    step: 0.1,
    category: 'particles',
    subcategory: 'advanced',
    description: 'Random size range (0 = uniform, 1 = max variation)',
  },
  {
    key: 'particles.lifetime',
    label: 'Lifetime',
    type: 'number',
    default: 0,
    min: 0,
    max: 30,
    step: 1,
    category: 'particles',
    subcategory: 'advanced',
    description: 'Particle lifespan in seconds (0 = infinite)',
  },
  {
    key: 'particles.initialSpeed',
    label: 'Initial Speed',
    type: 'number',
    default: 0.5,
    min: 0,
    max: 5,
    step: 0.1,
    category: 'particles',
    subcategory: 'advanced',
    description: 'Starting velocity magnitude',
  },
  {
    key: 'particles.spawnMode',
    label: 'Spawn Mode',
    type: 'enum',
    default: 'random',
    options: ['random', 'center', 'edges', 'grid'],
    category: 'particles',
    subcategory: 'advanced',
    description: 'Where new particles spawn',
  },
  {
    key: 'particles.shape',
    label: 'Shape',
    type: 'enum',
    default: 'circle',
    options: ['circle', 'square', 'triangle', 'ring'],
    category: 'particles',
    subcategory: 'advanced',
    description: 'Particle shape',
  },

  // Physics - Basic
  {
    key: 'physics.noise.strength',
    label: 'Noise Strength',
    type: 'number',
    default: 1,
    min: 0,
    max: 5,
    step: 0.1,
    category: 'physics',
    subcategory: 'basic',
    description: 'Strength of noise-based forces',
  },
  {
    key: 'physics.damping',
    label: 'Damping',
    type: 'number',
    default: 0.98,
    min: 0.8,
    max: 1,
    step: 0.005,
    category: 'physics',
    subcategory: 'basic',
    description: 'Velocity damping (1 = no damping, lower = more friction)',
  },

  // Physics - Advanced: Noise
  {
    key: 'physics.noise.scale',
    label: 'Noise Scale',
    type: 'number',
    default: 0.005,
    min: 0.001,
    max: 0.1,
    step: 0.001,
    category: 'physics',
    subcategory: 'advanced',
    description: 'Scale of the noise field (smaller = smoother)',
  },
  {
    key: 'physics.noise.speed',
    label: 'Noise Evolution',
    type: 'number',
    default: 0.001,
    min: 0,
    max: 0.01,
    step: 0.0005,
    category: 'physics',
    subcategory: 'advanced',
    description: 'How fast the noise pattern changes',
  },

  // Physics - Advanced: Forces
  {
    key: 'physics.force.x',
    label: 'Gravity X',
    type: 'number',
    default: 0,
    min: -2,
    max: 2,
    step: 0.1,
    category: 'physics',
    subcategory: 'advanced',
    description: 'Global force in X direction',
  },
  {
    key: 'physics.force.y',
    label: 'Gravity Y',
    type: 'number',
    default: 0,
    min: -2,
    max: 2,
    step: 0.1,
    category: 'physics',
    subcategory: 'advanced',
    description: 'Global force in Y direction (negative = down)',
  },
  {
    key: 'physics.maxVelocity',
    label: 'Max Velocity',
    type: 'number',
    default: 10,
    min: 1,
    max: 50,
    step: 1,
    category: 'physics',
    subcategory: 'advanced',
    description: 'Speed cap to prevent runaway particles',
  },
  {
    key: 'physics.turbulence',
    label: 'Turbulence',
    type: 'number',
    default: 0,
    min: 0,
    max: 1,
    step: 0.05,
    category: 'physics',
    subcategory: 'advanced',
    description: 'Additional randomness in movement',
  },

  // Physics - Advanced: Attractor
  {
    key: 'physics.attractor.strength',
    label: 'Attraction',
    type: 'number',
    default: 0,
    min: -2,
    max: 2,
    step: 0.1,
    category: 'physics',
    subcategory: 'advanced',
    description: 'Pull toward center (negative = repel)',
  },
  {
    key: 'physics.attractor.x',
    label: 'Attractor X',
    type: 'number',
    default: 0,
    min: -1,
    max: 1,
    step: 0.1,
    category: 'physics',
    subcategory: 'advanced',
    description: 'X position of attractor (normalized)',
  },
  {
    key: 'physics.attractor.y',
    label: 'Attractor Y',
    type: 'number',
    default: 0,
    min: -1,
    max: 1,
    step: 0.1,
    category: 'physics',
    subcategory: 'advanced',
    description: 'Y position of attractor (normalized)',
  },

  // Simulation - Basic
  {
    key: 'simulation.speed',
    label: 'Speed',
    type: 'number',
    default: 0.1,
    min: 0.01,
    max: 1,
    step: 0.01,
    category: 'simulation',
    subcategory: 'basic',
    description: 'Time multiplier for simulation',
  },
  {
    key: 'simulation.bounds',
    label: 'Bounds',
    type: 'enum',
    default: 'wrap',
    options: ['wrap', 'bounce', 'none'],
    category: 'simulation',
    subcategory: 'basic',
    description: 'How particles behave at canvas edges',
  },

  // Rendering
  {
    key: 'rendering.tracers',
    label: 'Tracers',
    type: 'number',
    default: 0,
    min: 0,
    max: 0.98,
    step: 0.02,
    category: 'rendering',
    description: 'Trail persistence (0 = off, higher = longer trails)',
  },

  // Viewport
  {
    key: 'viewport.aspectRatio',
    label: 'Aspect Ratio',
    type: 'enum',
    default: '1:1',
    options: ['1:1', '2:3', '4:5', '9:16', '16:9', '3:2', '5:4'],
    category: 'viewport',
    description: 'Canvas aspect ratio',
  },
  {
    key: 'viewport.orientation',
    label: 'Orientation',
    type: 'enum',
    default: 'landscape',
    options: ['landscape', 'portrait'],
    category: 'viewport',
    description: 'Canvas orientation',
  },
];

// Helper to get default values as a flat object
export function getDefaultParameters(): Record<string, number | boolean | string> {
  const defaults: Record<string, number | boolean | string> = {};
  for (const def of PARAMETER_DEFINITIONS) {
    defaults[def.key] = def.default;
  }
  return defaults;
}

// Helper to get a parameter definition by key
export function getParameterDef(key: string): ParameterDef | undefined {
  return PARAMETER_DEFINITIONS.find(def => def.key === key);
}

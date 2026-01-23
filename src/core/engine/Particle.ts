// Particle data structure
// Uses typed arrays for GPU-friendly data layout

export interface ParticleData {
  // Position
  x: number;
  y: number;

  // Velocity
  vx: number;
  vy: number;

  // Properties
  size: number;
  opacity: number;
  age: number;
}

// Particle system using typed arrays for performance
export class ParticleBuffer {
  readonly count: number;

  // Position data (x, y per particle)
  positions: Float32Array;

  // Velocity data (vx, vy per particle)
  velocities: Float32Array;

  // Per-particle properties
  sizes: Float32Array;
  opacities: Float32Array;
  ages: Float32Array;

  constructor(count: number) {
    this.count = count;
    this.positions = new Float32Array(count * 2);
    this.velocities = new Float32Array(count * 2);
    this.sizes = new Float32Array(count);
    this.opacities = new Float32Array(count);
    this.ages = new Float32Array(count);
  }

  // Get particle at index
  get(index: number): ParticleData {
    const i2 = index * 2;
    return {
      x: this.positions[i2],
      y: this.positions[i2 + 1],
      vx: this.velocities[i2],
      vy: this.velocities[i2 + 1],
      size: this.sizes[index],
      opacity: this.opacities[index],
      age: this.ages[index],
    };
  }

  // Set particle at index
  set(index: number, data: Partial<ParticleData>): void {
    const i2 = index * 2;
    if (data.x !== undefined) this.positions[i2] = data.x;
    if (data.y !== undefined) this.positions[i2 + 1] = data.y;
    if (data.vx !== undefined) this.velocities[i2] = data.vx;
    if (data.vy !== undefined) this.velocities[i2 + 1] = data.vy;
    if (data.size !== undefined) this.sizes[index] = data.size;
    if (data.opacity !== undefined) this.opacities[index] = data.opacity;
    if (data.age !== undefined) this.ages[index] = data.age;
  }

  // Set position only (optimized)
  setPosition(index: number, x: number, y: number): void {
    const i2 = index * 2;
    this.positions[i2] = x;
    this.positions[i2 + 1] = y;
  }

  // Set velocity only (optimized)
  setVelocity(index: number, vx: number, vy: number): void {
    const i2 = index * 2;
    this.velocities[i2] = vx;
    this.velocities[i2 + 1] = vy;
  }

  // Get position (optimized)
  getPosition(index: number): { x: number; y: number } {
    const i2 = index * 2;
    return {
      x: this.positions[i2],
      y: this.positions[i2 + 1],
    };
  }

  // Get velocity (optimized)
  getVelocity(index: number): { vx: number; vy: number } {
    const i2 = index * 2;
    return {
      vx: this.velocities[i2],
      vy: this.velocities[i2 + 1],
    };
  }
}

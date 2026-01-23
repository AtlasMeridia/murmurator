// Physics calculations for particle movement

import { noise3D } from '../../utils/noise.ts';
import { wrap } from '../../utils/math.ts';
import type { ParticleBuffer } from './Particle.ts';
import type { StateStore } from '../state/StateStore.ts';

export interface PhysicsConfig {
  width: number;
  height: number;
}

export class Physics {
  private state: StateStore;
  private time: number = 0;
  private width: number;
  private height: number;

  constructor(state: StateStore, config: PhysicsConfig) {
    this.state = state;
    this.width = config.width;
    this.height = config.height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(particles: ParticleBuffer, deltaTime: number): void {
    const speedMultiplier = this.state.get<number>('simulation.speed');
    const dt = deltaTime * speedMultiplier;
    this.time += dt * 0.001; // Convert to seconds

    const damping = this.state.get<number>('physics.damping');
    const forceX = this.state.get<number>('physics.force.x');
    const forceY = this.state.get<number>('physics.force.y');
    const maxVelocity = this.state.get<number>('physics.maxVelocity');
    const turbulence = this.state.get<number>('physics.turbulence');

    const noiseScale = this.state.get<number>('physics.noise.scale');
    const noiseStrength = this.state.get<number>('physics.noise.strength');
    const noiseSpeed = this.state.get<number>('physics.noise.speed');

    const attractorStrength = this.state.get<number>('physics.attractor.strength');
    const attractorX = this.state.get<number>('physics.attractor.x') * this.width * 0.5;
    const attractorY = this.state.get<number>('physics.attractor.y') * this.height * 0.5;

    const bounds = this.state.get<string>('simulation.bounds');
    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;

    for (let i = 0; i < particles.count; i++) {
      const i2 = i * 2;

      // Get current position and velocity
      let x = particles.positions[i2];
      let y = particles.positions[i2 + 1];
      let vx = particles.velocities[i2];
      let vy = particles.velocities[i2 + 1];

      // Apply global forces (gravity)
      vx += forceX * dt * 0.01;
      vy += forceY * dt * 0.01;

      // Apply noise forces (when strength > 0)
      if (noiseStrength > 0) {
        const noiseTime = this.time * noiseSpeed * 1000;
        const nx = noise3D(x * noiseScale, y * noiseScale, noiseTime);
        const ny = noise3D(x * noiseScale + 100, y * noiseScale + 100, noiseTime);
        vx += nx * noiseStrength * dt * 0.1;
        vy += ny * noiseStrength * dt * 0.1;
      }

      // Apply attractor force (when strength != 0)
      if (attractorStrength !== 0) {
        const dx = attractorX - x;
        const dy = attractorY - y;
        const distSq = dx * dx + dy * dy;
        if (distSq > 1) {
          const dist = Math.sqrt(distSq);
          const force = attractorStrength / dist * dt * 0.5;
          vx += (dx / dist) * force;
          vy += (dy / dist) * force;
        }
      }

      // Apply turbulence (random jitter)
      if (turbulence > 0) {
        vx += (Math.random() - 0.5) * turbulence * dt * 0.5;
        vy += (Math.random() - 0.5) * turbulence * dt * 0.5;
      }

      // Apply damping
      vx *= damping;
      vy *= damping;

      // Clamp to max velocity
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (speed > maxVelocity) {
        const scale = maxVelocity / speed;
        vx *= scale;
        vy *= scale;
      }

      // Update position
      x += vx * dt;
      y += vy * dt;

      // Handle bounds
      switch (bounds) {
        case 'wrap':
          x = wrap(x, -halfWidth, halfWidth);
          y = wrap(y, -halfHeight, halfHeight);
          break;
        case 'bounce':
          if (x < -halfWidth || x > halfWidth) {
            vx *= -0.8;
            x = Math.max(-halfWidth, Math.min(halfWidth, x));
          }
          if (y < -halfHeight || y > halfHeight) {
            vy *= -0.8;
            y = Math.max(-halfHeight, Math.min(halfHeight, y));
          }
          break;
        // 'none' - particles can leave bounds
      }

      // Update age
      particles.ages[i] += dt;

      // Store updated values
      particles.positions[i2] = x;
      particles.positions[i2 + 1] = y;
      particles.velocities[i2] = vx;
      particles.velocities[i2 + 1] = vy;
    }
  }

  getTime(): number {
    return this.time;
  }

  resetTime(): void {
    this.time = 0;
  }
}

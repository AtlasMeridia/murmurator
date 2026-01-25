// Main particle engine - orchestrates simulation and rendering

import { ParticleBuffer } from './Particle.ts';
import { Physics } from './Physics.ts';
import { Renderer } from './Renderer.ts';
import type { StateStore } from '../state/StateStore.ts';
import { eventBus } from '../events/EventBus.ts';
import { EventTypes } from '../events/EventTypes.ts';
import { SeededRandom } from '../../utils/random.ts';

export interface ParticleEngineConfig {
  canvas?: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface FrameInfo {
  time: number;
  deltaTime: number;
  frameCount: number;
}

export class ParticleEngine {
  private particles: ParticleBuffer;
  private physics: Physics;
  private renderer: Renderer;
  private state: StateStore;
  private running: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private width: number;
  private height: number;
  private random: SeededRandom;

  constructor(state: StateStore, config: ParticleEngineConfig) {
    this.state = state;
    this.width = config.width;
    this.height = config.height;
    this.random = new SeededRandom(Date.now());

    // Initialize particle buffer
    const count = this.state.get<number>('particles.count');
    this.particles = new ParticleBuffer(count);

    // Initialize physics
    this.physics = new Physics(this.state, {
      width: this.width,
      height: this.height,
    });

    // Initialize renderer
    this.renderer = new Renderer(this.state, {
      canvas: config.canvas,
      width: this.width,
      height: this.height,
    });

    // Initialize particles with random positions
    this.initializeParticles();

    // Subscribe to particle count changes
    this.state.subscribe('particles.count', (_key, value) => {
      this.reinitializeParticles(value as number);
    });
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particles.count; i++) {
      this.spawnParticle(i);
    }
    this.renderer.initializeParticles(this.particles);
  }

  private spawnParticle(index: number): void {
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    const spawnMode = this.state.get<string>('particles.spawnMode') || 'random';
    const initialSpeed = this.state.get<number>('particles.initialSpeed') || 0.5;
    const sizeVariation = this.state.get<number>('particles.sizeVariation') || 0.5;

    let x: number, y: number;

    switch (spawnMode) {
      case 'center':
        // Spawn near center with small random offset
        x = this.random.range(-halfW * 0.1, halfW * 0.1);
        y = this.random.range(-halfH * 0.1, halfH * 0.1);
        break;
      case 'edges':
        // Spawn on edges
        const edge = Math.floor(this.random.range(0, 4));
        switch (edge) {
          case 0: // Top
            x = this.random.range(-halfW, halfW);
            y = halfH;
            break;
          case 1: // Right
            x = halfW;
            y = this.random.range(-halfH, halfH);
            break;
          case 2: // Bottom
            x = this.random.range(-halfW, halfW);
            y = -halfH;
            break;
          default: // Left
            x = -halfW;
            y = this.random.range(-halfH, halfH);
        }
        break;
      case 'grid':
        // Spawn in grid pattern
        const gridSize = Math.ceil(Math.sqrt(this.particles.count));
        const gridX = index % gridSize;
        const gridY = Math.floor(index / gridSize);
        x = (gridX / (gridSize - 1)) * this.width - halfW;
        y = (gridY / (gridSize - 1)) * this.height - halfH;
        break;
      default: // 'random'
        x = this.random.range(-halfW, halfW);
        y = this.random.range(-halfH, halfH);
    }

    // Random velocity direction with configurable magnitude
    const angle = this.random.range(0, Math.PI * 2);
    const speed = initialSpeed * this.random.range(0.5, 1.5);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.particles.setPosition(index, x, y);
    this.particles.setVelocity(index, vx, vy);

    // Size with variation: base size * (1 - variation + random * variation * 2)
    const baseSize = 1;
    const sizeMultiplier = 1 - sizeVariation + this.random.range(0, sizeVariation * 2);
    this.particles.sizes[index] = baseSize * sizeMultiplier;

    this.particles.opacities[index] = 1;
    this.particles.ages[index] = 0;
  }

  private reinitializeParticles(newCount: number): void {
    // Create new buffer
    this.particles = new ParticleBuffer(newCount);

    // Reset random seed for reproducibility (optional)
    // this.random.reset();

    // Initialize
    this.initializeParticles();
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.getCanvas();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
    eventBus.publish(EventTypes.ENGINE_STATE, { state: 'running' });
  }

  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    eventBus.publish(EventTypes.ENGINE_STATE, { state: 'stopped' });
  }

  reset(): void {
    this.stop();
    this.physics.resetTime();
    this.frameCount = 0;
    this.random = new SeededRandom(Date.now());
    this.initializeParticles();
    this.renderer.clear(); // Clear tracer trails
    this.renderer.render();
    eventBus.publish(EventTypes.ENGINE_STATE, { state: 'reset' });
  }

  // Advance single frame (for debugging or manual stepping)
  step(): void {
    if (this.running) return;

    const now = performance.now();
    const deltaTime = this.lastTime ? now - this.lastTime : 16.67;
    this.lastTime = now;

    this.update(deltaTime);
    this.render();
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    // Cap delta time to prevent huge jumps
    const dt = Math.min(deltaTime, 50);

    // Update physics
    this.physics.update(this.particles, dt);

    // Handle particle lifetime and respawning
    const lifetime = this.state.get<number>('particles.lifetime');
    if (lifetime > 0) {
      for (let i = 0; i < this.particles.count; i++) {
        if (this.particles.ages[i] > lifetime * 1000) { // Convert to ms
          this.spawnParticle(i);
        }
      }
    }

    // Update frame counter
    this.frameCount++;

    // Publish frame event
    const frameInfo: FrameInfo = {
      time: this.physics.getTime(),
      deltaTime: dt,
      frameCount: this.frameCount,
    };
    eventBus.publish(EventTypes.ENGINE_FRAME, frameInfo);
  }

  private render(): void {
    this.renderer.updateParticles(this.particles);
    this.renderer.render();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.physics.resize(width, height);
    this.renderer.resize(width, height);
    eventBus.publish(EventTypes.ENGINE_RESIZE, { width, height });
  }

  isRunning(): boolean {
    return this.running;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getTime(): number {
    return this.physics.getTime();
  }

  // For exports
  toDataURL(type?: string): string {
    return this.renderer.toDataURL(type);
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string): void {
    this.renderer.toBlob(callback, type);
  }

  dispose(): void {
    this.stop();
    this.renderer.dispose();
  }
}

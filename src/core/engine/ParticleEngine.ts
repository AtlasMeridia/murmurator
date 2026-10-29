// Main particle engine - orchestrates simulation and rendering

import { ParticleBuffer } from './Particle.ts';
import { Physics } from './Physics.ts';
import { Renderer } from './Renderer.ts';
import type { StateStore } from '../state/StateStore.ts';
import { eventBus } from '../events/EventBus.ts';
import { EventTypes } from '../events/EventTypes.ts';
import { SeededRandom } from '../../utils/random.ts';

// WebGPU imports - only detection functions, actual classes loaded dynamically
import { isWebGPUSupported, checkWebGPUAvailable } from './webgpu/index.ts';

// Types for dynamically loaded WebGPU classes
type GPUParticleBufferType = import('./webgpu/GPUParticleBuffer.ts').GPUParticleBuffer;
type GPURendererType = import('./webgpu/GPURenderer.ts').GPURenderer;
type GPUPhysicsType = import('./webgpu/GPUPhysics.ts').GPUPhysics;

export interface ParticleEngineConfig {
  canvas?: HTMLCanvasElement;
  width: number;
  height: number;
  forceWebGL?: boolean; // Force WebGL fallback even if WebGPU is available
}

export interface FrameInfo {
  time: number;
  deltaTime: number;
  frameCount: number;
}

export class ParticleEngine {
  // CPU-based (WebGL fallback)
  private particles: ParticleBuffer | null = null;
  private physics: Physics | null = null;
  private renderer: Renderer | null = null;

  // GPU-based (WebGPU) - types imported dynamically
  private gpuParticles: GPUParticleBufferType | null = null;
  private gpuPhysics: GPUPhysicsType | null = null;
  private gpuRenderer: GPURendererType | null = null;
  // Constructor stored after dynamic import for reinit
  private GPUParticleBufferClass: (new (count: number) => GPUParticleBufferType) | null = null;

  // Mode
  private useWebGPU: boolean = false;

  private state: StateStore;
  private running: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private width: number;
  private height: number;
  private random: SeededRandom;
  private config: ParticleEngineConfig;
  private initPromise: Promise<void> | null = null;

  constructor(state: StateStore, config: ParticleEngineConfig) {
    this.state = state;
    this.width = config.width;
    this.height = config.height;
    this.random = new SeededRandom(Date.now());
    this.config = config;

    // Check basic WebGPU support (sync check)
    const maybeWebGPU = !config.forceWebGL && isWebGPUSupported();

    if (maybeWebGPU) {
      // Async WebGPU initialization with fallback
      this.initPromise = this.initWithFallback();
    } else {
      // Synchronous WebGL initialization
      this.initWebGL();
    }

    // Subscribe to particle count changes
    this.state.subscribe('particles.count', (_key, value) => {
      this.reinitializeParticles(value as number);
    });
  }

  /**
   * Try WebGPU, fall back to WebGL if it fails.
   */
  private async initWithFallback(): Promise<void> {
    // Actually check if WebGPU will work
    const webgpuAvailable = await checkWebGPUAvailable();

    if (webgpuAvailable) {
      try {
        await this.initWebGPU();
        this.useWebGPU = true;
        return;
      } catch (e) {
        console.warn('WebGPU initialization failed, falling back to WebGL:', e);
      }
    }

    // Fall back to WebGL
    console.log('Using WebGL fallback');
    this.useWebGPU = false;
    this.initWebGL();
  }

  /**
   * Initialize WebGL (CPU) path.
   */
  private initWebGL(): void {
    const count = this.state.get<number>('particles.count');
    this.particles = new ParticleBuffer(count);

    this.physics = new Physics(this.state, {
      width: this.width,
      height: this.height,
    });

    this.renderer = new Renderer(this.state, {
      canvas: this.config.canvas,
      width: this.width,
      height: this.height,
    });

    this.initializeParticles();
  }

  /**
   * Initialize WebGPU (GPU) path.
   * Uses dynamic imports to avoid loading WebGPU code on unsupported contexts.
   */
  private async initWebGPU(): Promise<void> {
    const count = this.state.get<number>('particles.count');

    // Dynamically import WebGPU modules
    const [
      { GPUParticleBuffer },
      { GPURenderer },
      { GPUPhysics },
    ] = await Promise.all([
      import('./webgpu/GPUParticleBuffer.ts'),
      import('./webgpu/GPURenderer.ts'),
      import('./webgpu/GPUPhysics.ts'),
    ]);

    // Store constructor for reinit
    this.GPUParticleBufferClass = GPUParticleBuffer;

    // Create GPU particle buffer
    this.gpuParticles = new GPUParticleBuffer(count);

    // Create GPU renderer
    this.gpuRenderer = new GPURenderer(this.state, {
      canvas: this.config.canvas,
      width: this.width,
      height: this.height,
    });

    // Wait for renderer to be ready
    await this.gpuRenderer.ready();

    // Create GPU physics
    this.gpuPhysics = new GPUPhysics(this.state, {
      width: this.width,
      height: this.height,
    });

    // Initialize physics with buffer
    this.gpuPhysics.initialize(this.gpuParticles);

    // Initialize particles
    this.initializeParticlesGPU();

    // Initialize renderer with particles
    this.gpuRenderer.initializeParticles(this.gpuParticles);
  }

  /**
   * Wait for async initialization to complete.
   */
  async ready(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Check if using WebGPU mode.
   */
  isWebGPUMode(): boolean {
    return this.useWebGPU;
  }

  private initializeParticles(): void {
    if (!this.particles || !this.renderer) return;

    for (let i = 0; i < this.particles.count; i++) {
      this.spawnParticle(i);
    }
    this.renderer.initializeParticles(this.particles);
  }

  /**
   * Initialize particles for GPU path.
   */
  private initializeParticlesGPU(): void {
    if (!this.gpuParticles) return;

    for (let i = 0; i < this.gpuParticles.count; i++) {
      this.spawnParticleGPU(i);
    }
    this.gpuParticles.uploadToGPU();
  }

  private spawnParticle(index: number): void {
    if (!this.particles) return;

    const { x, y, vx, vy, size } = this.computeSpawnData(index, this.particles.count);

    this.particles.setPosition(index, x, y);
    this.particles.setVelocity(index, vx, vy);
    this.particles.sizes[index] = size;
    this.particles.opacities[index] = 1;
    this.particles.ages[index] = 0;
  }

  private spawnParticleGPU(index: number): void {
    if (!this.gpuParticles) return;

    const { x, y, vx, vy, size } = this.computeSpawnData(index, this.gpuParticles.count);

    this.gpuParticles.setPosition(index, x, y);
    this.gpuParticles.setVelocity(index, vx, vy);
    this.gpuParticles.sizes[index] = size;
    this.gpuParticles.ages[index] = 0;
  }

  /**
   * Compute spawn data for a particle (shared between CPU and GPU paths).
   */
  private computeSpawnData(index: number, totalCount: number): {
    x: number; y: number; vx: number; vy: number; size: number;
  } {
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
        const gridSize = Math.ceil(Math.sqrt(totalCount));
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

    // Size with variation: base size * (1 - variation + random * variation * 2)
    const baseSize = 1;
    const size = baseSize * (1 - sizeVariation + this.random.range(0, sizeVariation * 2));

    return { x, y, vx, vy, size };
  }

  private reinitializeParticles(newCount: number): void {
    if (this.useWebGPU && this.GPUParticleBufferClass) {
      // GPU path
      if (this.gpuParticles) {
        this.gpuParticles.dispose();
      }
      this.gpuParticles = new this.GPUParticleBufferClass(newCount);
      this.initializeParticlesGPU();

      if (this.gpuPhysics) {
        this.gpuPhysics.initialize(this.gpuParticles);
      }
      if (this.gpuRenderer) {
        this.gpuRenderer.initializeParticles(this.gpuParticles);
      }
    } else {
      // CPU path
      this.particles = new ParticleBuffer(newCount);
      this.initializeParticles();
    }
  }

  getCanvas(): HTMLCanvasElement {
    if (this.useWebGPU && this.gpuRenderer) {
      return this.gpuRenderer.getCanvas();
    }
    return this.renderer!.getCanvas();
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

    if (this.useWebGPU) {
      this.gpuPhysics?.resetTime();
      this.frameCount = 0;
      this.random = new SeededRandom(Date.now());
      this.initializeParticlesGPU();
      if (this.gpuRenderer && this.gpuParticles) {
        this.gpuRenderer.clear();
        this.gpuRenderer.initializeParticles(this.gpuParticles);
        this.gpuRenderer.render();
      }
    } else {
      this.physics?.resetTime();
      this.frameCount = 0;
      this.random = new SeededRandom(Date.now());
      this.initializeParticles();
      this.renderer?.clear();
      this.renderer?.render();
    }

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

    if (this.useWebGPU) {
      // GPU physics (async but fire-and-forget in the loop)
      if (this.gpuPhysics && this.gpuRenderer) {
        this.gpuPhysics.update(this.gpuRenderer, dt);
      }

      // Handle particle lifetime respawning
      // Note: In full GPU mode, this would be in the compute shader
      // For now, we skip lifetime handling in GPU mode (TODO: implement in compute shader)
    } else {
      // CPU physics
      if (this.physics && this.particles) {
        this.physics.update(this.particles, dt);

        // Handle particle lifetime and respawning
        const lifetime = this.state.get<number>('particles.lifetime');
        if (lifetime > 0) {
          for (let i = 0; i < this.particles.count; i++) {
            if (this.particles.ages[i] > lifetime * 1000) {
              this.spawnParticle(i);
            }
          }
        }
      }
    }

    // Update frame counter
    this.frameCount++;

    // Publish frame event
    const time = this.useWebGPU
      ? (this.gpuPhysics?.getTime() ?? 0)
      : (this.physics?.getTime() ?? 0);

    const frameInfo: FrameInfo = {
      time,
      deltaTime: dt,
      frameCount: this.frameCount,
    };
    eventBus.publish(EventTypes.ENGINE_FRAME, frameInfo);
  }

  private render(): void {
    if (this.useWebGPU) {
      if (this.gpuRenderer && this.gpuParticles) {
        this.gpuRenderer.updateParticles(this.gpuParticles);
        this.gpuRenderer.render();
      }
    } else {
      if (this.renderer && this.particles) {
        this.renderer.updateParticles(this.particles);
        this.renderer.render();
      }
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    if (this.useWebGPU) {
      this.gpuPhysics?.resize(width, height);
      this.gpuRenderer?.resize(width, height);
    } else {
      this.physics?.resize(width, height);
      this.renderer?.resize(width, height);
    }

    eventBus.publish(EventTypes.ENGINE_RESIZE, { width, height });
  }

  isRunning(): boolean {
    return this.running;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  getTime(): number {
    if (this.useWebGPU) {
      return this.gpuPhysics?.getTime() ?? 0;
    }
    return this.physics?.getTime() ?? 0;
  }

  // For exports
  toDataURL(type?: string): string {
    if (this.useWebGPU && this.gpuRenderer) {
      return this.gpuRenderer.toDataURL(type);
    }
    return this.renderer!.toDataURL(type);
  }

  toBlob(callback: (blob: Blob | null) => void, type?: string): void {
    if (this.useWebGPU && this.gpuRenderer) {
      this.gpuRenderer.toBlob(callback, type);
    } else {
      this.renderer!.toBlob(callback, type);
    }
  }

  dispose(): void {
    this.stop();

    if (this.useWebGPU) {
      this.gpuRenderer?.dispose();
      this.gpuParticles?.dispose();
    } else {
      this.renderer?.dispose();
    }
  }
}

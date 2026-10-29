// GPU physics compute shader using TSL

import {
  Fn,
  vec2,
  uniform,
  instanceIndex,
  sqrt,
  max,
  min,
  If,
  select,
} from 'three/tsl';
import type { ComputeNode } from 'three/webgpu';
import type { GPUParticleBuffer } from './GPUParticleBuffer.ts';
import type { GPURenderer } from './GPURenderer.ts';
import type { StateStore } from '../../state/StateStore.ts';
import { flowNoise2D } from './GPUNoise.ts';

export interface GPUPhysicsConfig {
  width: number;
  height: number;
}

/**
 * GPU-accelerated physics simulation using compute shaders.
 */
export class GPUPhysics {
  private state: StateStore;
  private width: number;
  private height: number;
  private time: number = 0;

  // Uniforms
  private dtUniform = uniform(0.016);
  private timeUniform = uniform(0);
  private widthUniform = uniform(800);
  private heightUniform = uniform(600);
  private dampingUniform = uniform(0.98);
  private maxVelocityUniform = uniform(10);
  private turbulenceUniform = uniform(0);
  private forceXUniform = uniform(0);
  private forceYUniform = uniform(0);
  private noiseStrengthUniform = uniform(1);
  private noiseScaleUniform = uniform(0.01);
  private noiseSpeedUniform = uniform(1);
  private attractorStrengthUniform = uniform(0);
  private attractorXUniform = uniform(0);
  private attractorYUniform = uniform(0);
  private boundsUniform = uniform(0); // 0 = wrap, 1 = bounce, 2 = none
  private seedUniform = uniform(Math.random() * 1000);

  // Compute dispatch node, built once per particle buffer (uniforms carry per-frame values)
  private computeNode: ComputeNode | null = null;
  private particleBuffer: GPUParticleBuffer | null = null;

  constructor(state: StateStore, config: GPUPhysicsConfig) {
    this.state = state;
    this.width = config.width;
    this.height = config.height;

    this.widthUniform.value = config.width;
    this.heightUniform.value = config.height;
  }

  /**
   * Initialize compute shader with particle buffer.
   */
  initialize(buffer: GPUParticleBuffer): void {
    this.particleBuffer = buffer;

    // Create the physics compute shader
    this.computeNode = Fn(() => {
      const idx = instanceIndex;

      // Read current state
      const pos = buffer.positionsStorage.element(idx);
      const vel = buffer.velocitiesStorage.element(idx);
      const age = buffer.agesStorage.element(idx);

      const dt = this.dtUniform;
      const halfWidth = this.widthUniform.div(2);
      const halfHeight = this.heightUniform.div(2);

      // Mutable shader variables. Changes made inside If() blocks must use
      // assign/addAssign on these; reassigning a JS variable there only changes
      // the graph being built and is dropped outside the block.
      const vx = vel.x.toVar();
      const vy = vel.y.toVar();

      // Apply global forces (gravity)
      vx.addAssign(this.forceXUniform.mul(dt).mul(0.01));
      vy.addAssign(this.forceYUniform.mul(dt).mul(0.01));

      // Apply noise forces
      const noiseStrength = this.noiseStrengthUniform;

      If(noiseStrength.greaterThan(0), () => {
        const noisePos = vec2(
          pos.x.mul(this.noiseScaleUniform),
          pos.y.mul(this.noiseScaleUniform)
        );
        const noiseTime = this.timeUniform.mul(this.noiseSpeedUniform);
        const noise = flowNoise2D(noisePos, noiseTime);

        vx.addAssign(noise.x.mul(noiseStrength).mul(dt).mul(0.1));
        vy.addAssign(noise.y.mul(noiseStrength).mul(dt).mul(0.1));
      });

      // Apply attractor force
      const attractorStrength = this.attractorStrengthUniform;

      If(attractorStrength.notEqual(0), () => {
        const dx = this.attractorXUniform.sub(pos.x);
        const dy = this.attractorYUniform.sub(pos.y);
        const distSq = dx.mul(dx).add(dy.mul(dy));

        If(distSq.greaterThan(1), () => {
          const dist = sqrt(distSq);
          const force = attractorStrength.div(dist).mul(dt).mul(0.5);
          vx.addAssign(dx.div(dist).mul(force));
          vy.addAssign(dy.div(dist).mul(force));
        });
      });

      // Apply turbulence (pseudo-random jitter)
      const turbulence = this.turbulenceUniform;

      If(turbulence.greaterThan(0), () => {
        // Use position + time for pseudo-random
        const randX = pos.x.add(this.timeUniform.mul(1000)).sin().mul(0.5);
        const randY = pos.y.add(this.timeUniform.mul(1000).add(this.seedUniform)).sin().mul(0.5);
        vx.addAssign(randX.mul(turbulence).mul(dt).mul(0.5));
        vy.addAssign(randY.mul(turbulence).mul(dt).mul(0.5));
      });

      // Apply damping
      vx.mulAssign(this.dampingUniform);
      vy.mulAssign(this.dampingUniform);

      // Clamp to max velocity
      const speed = sqrt(vx.mul(vx).add(vy.mul(vy)));
      const maxV = this.maxVelocityUniform;

      If(speed.greaterThan(maxV), () => {
        const scale = maxV.div(speed);
        vx.mulAssign(scale);
        vy.mulAssign(scale);
      });

      // Update position
      const x = pos.x.add(vx.mul(dt)).toVar();
      const y = pos.y.add(vy.mul(dt)).toVar();

      // Handle bounds
      const bounds = this.boundsUniform;

      // Wrap mode (bounds == 0)
      If(bounds.lessThan(0.5), () => {
        x.assign(select(x.lessThan(halfWidth.negate()), x.add(this.widthUniform), x));
        x.assign(select(x.greaterThan(halfWidth), x.sub(this.widthUniform), x));
        y.assign(select(y.lessThan(halfHeight.negate()), y.add(this.heightUniform), y));
        y.assign(select(y.greaterThan(halfHeight), y.sub(this.heightUniform), y));
      });

      // Bounce mode (bounds == 1)
      If(bounds.greaterThan(0.5).and(bounds.lessThan(1.5)), () => {
        const outX = x.lessThan(halfWidth.negate()).or(x.greaterThan(halfWidth));
        vx.assign(select(outX, vx.mul(-0.8), vx));
        x.assign(max(halfWidth.negate(), min(halfWidth, x)));

        const outY = y.lessThan(halfHeight.negate()).or(y.greaterThan(halfHeight));
        vy.assign(select(outY, vy.mul(-0.8), vy));
        y.assign(max(halfHeight.negate(), min(halfHeight, y)));
      });

      // Write back
      buffer.positionsStorage.element(idx).assign(vec2(x, y));
      buffer.velocitiesStorage.element(idx).assign(vec2(vx, vy));
      buffer.agesStorage.element(idx).assign(age.add(dt));
    })().compute(buffer.count);
  }

  /**
   * Update physics simulation.
   */
  update(renderer: GPURenderer, deltaTime: number): void {
    if (!this.computeNode || !this.particleBuffer) {
      return;
    }

    // Update time
    const speedMultiplier = this.state.get<number>('simulation.speed');
    const dt = deltaTime * speedMultiplier;
    this.time += dt * 0.001;

    // Update uniforms from state
    this.dtUniform.value = dt;
    this.timeUniform.value = this.time;
    this.dampingUniform.value = this.state.get<number>('physics.damping');
    this.maxVelocityUniform.value = this.state.get<number>('physics.maxVelocity');
    this.turbulenceUniform.value = this.state.get<number>('physics.turbulence');
    this.forceXUniform.value = this.state.get<number>('physics.force.x');
    this.forceYUniform.value = this.state.get<number>('physics.force.y');
    this.noiseStrengthUniform.value = this.state.get<number>('physics.noise.strength');
    this.noiseScaleUniform.value = this.state.get<number>('physics.noise.scale');
    this.noiseSpeedUniform.value = this.state.get<number>('physics.noise.speed');
    this.attractorStrengthUniform.value = this.state.get<number>('physics.attractor.strength');
    this.attractorXUniform.value = this.state.get<number>('physics.attractor.x') * this.width * 0.5;
    this.attractorYUniform.value = this.state.get<number>('physics.attractor.y') * this.height * 0.5;

    // Convert bounds string to number
    const bounds = this.state.get<string>('simulation.bounds');
    this.boundsUniform.value = bounds === 'wrap' ? 0 : bounds === 'bounce' ? 1 : 2;

    renderer.compute(this.computeNode);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.widthUniform.value = width;
    this.heightUniform.value = height;
  }

  getTime(): number {
    return this.time;
  }

  resetTime(): void {
    this.time = 0;
    this.timeUniform.value = 0;
    this.seedUniform.value = Math.random() * 1000;
  }
}

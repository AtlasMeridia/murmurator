// GPU-resident particle buffer using TSL storage buffers

import { storage } from 'three/tsl';
import { StorageInstancedBufferAttribute } from 'three/webgpu';

/**
 * GPU-resident particle data storage.
 * Uses StorageInstancedBufferAttribute for compute shader access.
 */
export class GPUParticleBuffer {
  readonly count: number;

  // Storage buffer attributes (GPU-resident)
  private _positionsAttr: StorageInstancedBufferAttribute;
  private _velocitiesAttr: StorageInstancedBufferAttribute;
  private _sizesAttr: StorageInstancedBufferAttribute;
  private _agesAttr: StorageInstancedBufferAttribute;

  // TSL storage nodes for compute shaders
  readonly positionsStorage: any;
  readonly velocitiesStorage: any;
  readonly sizesStorage: any;
  readonly agesStorage: any;

  constructor(count: number) {
    this.count = count;

    // Create storage buffer attributes directly
    // positions: vec2 per particle (x, y) - itemSize = 2
    this._positionsAttr = new StorageInstancedBufferAttribute(new Float32Array(count * 2), 2);
    this._velocitiesAttr = new StorageInstancedBufferAttribute(new Float32Array(count * 2), 2);
    this._sizesAttr = new StorageInstancedBufferAttribute(new Float32Array(count), 1);
    this._agesAttr = new StorageInstancedBufferAttribute(new Float32Array(count), 1);

    // Create storage nodes for compute shader access
    this.positionsStorage = storage(this._positionsAttr, 'vec2', count);
    this.velocitiesStorage = storage(this._velocitiesAttr, 'vec2', count);
    this.sizesStorage = storage(this._sizesAttr, 'float', count);
    this.agesStorage = storage(this._agesAttr, 'float', count);
  }

  /**
   * Get the positions attribute for mesh binding.
   */
  get positionsAttribute(): StorageInstancedBufferAttribute {
    return this._positionsAttr;
  }

  /**
   * Get the sizes attribute for mesh binding.
   */
  get sizesAttribute(): StorageInstancedBufferAttribute {
    return this._sizesAttr;
  }

  /**
   * Get positions array for initialization.
   */
  get positions(): Float32Array {
    return this._positionsAttr.array as Float32Array;
  }

  /**
   * Get velocities array for initialization.
   */
  get velocities(): Float32Array {
    return this._velocitiesAttr.array as Float32Array;
  }

  /**
   * Get sizes array for initialization.
   */
  get sizes(): Float32Array {
    return this._sizesAttr.array as Float32Array;
  }

  /**
   * Get ages array for initialization.
   */
  get ages(): Float32Array {
    return this._agesAttr.array as Float32Array;
  }

  /**
   * Set position at index.
   */
  setPosition(index: number, x: number, y: number): void {
    const i2 = index * 2;
    const arr = this._positionsAttr.array as Float32Array;
    arr[i2] = x;
    arr[i2 + 1] = y;
  }

  /**
   * Set velocity at index.
   */
  setVelocity(index: number, vx: number, vy: number): void {
    const i2 = index * 2;
    const arr = this._velocitiesAttr.array as Float32Array;
    arr[i2] = vx;
    arr[i2 + 1] = vy;
  }

  /**
   * Mark buffers as needing GPU upload.
   * Call after initializing particle data.
   */
  uploadToGPU(): void {
    this._positionsAttr.needsUpdate = true;
    this._velocitiesAttr.needsUpdate = true;
    this._sizesAttr.needsUpdate = true;
    this._agesAttr.needsUpdate = true;
  }

  /**
   * Dispose GPU resources.
   */
  dispose(): void {
    // Buffers will be garbage collected
  }
}

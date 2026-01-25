// GPU-resident particle buffer using TSL storage buffers

import {
  instancedArray,
  storage,
} from 'three/tsl';

/**
 * GPU-resident particle data storage.
 * Uses TSL instancedArray for compute shader access.
 */
export class GPUParticleBuffer {
  readonly count: number;

  // Storage buffers (GPU-resident) - these are TSL nodes
  private _positionsBuffer: any;
  private _velocitiesBuffer: any;
  private _sizesBuffer: any;
  private _agesBuffer: any;

  // TSL storage nodes for compute shaders
  readonly positionsStorage: any;
  readonly velocitiesStorage: any;
  readonly sizesStorage: any;
  readonly agesStorage: any;

  // CPU-side arrays for initialization and readback
  private _positionsArray: Float32Array;
  private _velocitiesArray: Float32Array;
  private _sizesArray: Float32Array;
  private _agesArray: Float32Array;

  constructor(count: number) {
    this.count = count;

    // Create CPU-side arrays
    this._positionsArray = new Float32Array(count * 2);
    this._velocitiesArray = new Float32Array(count * 2);
    this._sizesArray = new Float32Array(count);
    this._agesArray = new Float32Array(count);

    // Create GPU storage buffers using instancedArray
    // positions: vec2 per particle (x, y)
    this._positionsBuffer = instancedArray(this._positionsArray, 'vec2');
    this._velocitiesBuffer = instancedArray(this._velocitiesArray, 'vec2');
    this._sizesBuffer = instancedArray(this._sizesArray, 'float');
    this._agesBuffer = instancedArray(this._agesArray, 'float');

    // Create storage nodes for compute shader access
    this.positionsStorage = storage(this._positionsBuffer, 'vec2', count);
    this.velocitiesStorage = storage(this._velocitiesBuffer, 'vec2', count);
    this.sizesStorage = storage(this._sizesBuffer, 'float', count);
    this.agesStorage = storage(this._agesBuffer, 'float', count);
  }

  /**
   * Get the positions buffer for mesh binding.
   */
  get positionsAttribute(): any {
    return this._positionsBuffer;
  }

  /**
   * Get the sizes buffer for mesh binding.
   */
  get sizesAttribute(): any {
    return this._sizesBuffer;
  }

  /**
   * Get CPU-side positions array for initialization.
   */
  get positions(): Float32Array {
    return this._positionsArray;
  }

  /**
   * Get CPU-side velocities array for initialization.
   */
  get velocities(): Float32Array {
    return this._velocitiesArray;
  }

  /**
   * Get CPU-side sizes array for initialization.
   */
  get sizes(): Float32Array {
    return this._sizesArray;
  }

  /**
   * Get CPU-side ages array for initialization.
   */
  get ages(): Float32Array {
    return this._agesArray;
  }

  /**
   * Set position at index (CPU-side, call uploadToGPU after).
   */
  setPosition(index: number, x: number, y: number): void {
    const i2 = index * 2;
    this._positionsArray[i2] = x;
    this._positionsArray[i2 + 1] = y;
  }

  /**
   * Set velocity at index (CPU-side, call uploadToGPU after).
   */
  setVelocity(index: number, vx: number, vy: number): void {
    const i2 = index * 2;
    this._velocitiesArray[i2] = vx;
    this._velocitiesArray[i2 + 1] = vy;
  }

  /**
   * Upload CPU arrays to GPU buffers.
   * Call after initializing particle data.
   */
  uploadToGPU(): void {
    // The buffers need to be marked for update
    if (this._positionsBuffer.needsUpdate !== undefined) {
      this._positionsBuffer.needsUpdate = true;
      this._velocitiesBuffer.needsUpdate = true;
      this._sizesBuffer.needsUpdate = true;
      this._agesBuffer.needsUpdate = true;
    }
  }

  /**
   * Dispose GPU resources.
   */
  dispose(): void {
    // Buffers will be garbage collected
  }
}

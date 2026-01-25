// WebGPU module - capability detection and exports

/**
 * Check if WebGPU is supported in the current browser.
 */
export function isWebGPUSupported(): boolean {
  // Check for navigator.gpu (WebGPU API)
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    return true;
  }
  return false;
}

/**
 * Get a human-readable message about WebGPU support status.
 */
export function getWebGPUSupportMessage(): string {
  if (isWebGPUSupported()) {
    return 'WebGPU is supported';
  }
  return 'WebGPU is not supported in this browser. Try Chrome 113+ or Edge 113+.';
}

// Re-export GPU components
export { GPUParticleBuffer } from './GPUParticleBuffer.ts';
export { GPURenderer } from './GPURenderer.ts';
export { GPUPhysics } from './GPUPhysics.ts';
export type { GPURendererConfig } from './GPURenderer.ts';
export type { GPUPhysicsConfig } from './GPUPhysics.ts';

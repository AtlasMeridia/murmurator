// WebGPU module - capability detection and exports

/**
 * Check if WebGPU API is present (basic check).
 */
export function isWebGPUSupported(): boolean {
  // Check for navigator.gpu (WebGPU API)
  if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
    return true;
  }
  return false;
}

/**
 * Check if current context is secure (required for WebGPU to actually work).
 */
export function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

/**
 * Actually try to initialize WebGPU and get an adapter.
 * This is the definitive check that WebGPU will work.
 */
export async function checkWebGPUAvailable(): Promise<boolean> {
  if (!isWebGPUSupported()) {
    return false;
  }

  // On non-secure contexts, WebGPU may exist but won't work
  if (!isSecureContext()) {
    console.warn('WebGPU requires a secure context (HTTPS or localhost)');
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('WebGPU adapter not available');
      return false;
    }
    return true;
  } catch (e) {
    console.warn('WebGPU initialization failed:', e);
    return false;
  }
}

/**
 * Get a human-readable message about WebGPU support status.
 */
export function getWebGPUSupportMessage(): string {
  if (!isWebGPUSupported()) {
    return 'WebGPU is not supported in this browser. Try Chrome 113+ or Edge 113+.';
  }
  if (!isSecureContext()) {
    return 'WebGPU requires HTTPS or localhost. Using WebGL fallback.';
  }
  return 'WebGPU is supported';
}

// GPU component types (for type imports only - actual classes loaded dynamically)
export type { GPUParticleBuffer } from './GPUParticleBuffer.ts';
export type { GPURenderer, GPURendererConfig } from './GPURenderer.ts';
export type { GPUPhysics, GPUPhysicsConfig } from './GPUPhysics.ts';

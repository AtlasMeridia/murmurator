export { ParticleEngine } from './ParticleEngine.ts';
export { ParticleBuffer } from './Particle.ts';
export { Physics } from './Physics.ts';
export { Renderer } from './Renderer.ts';
export type { ParticleData } from './Particle.ts';
export type { ParticleEngineConfig, FrameInfo } from './ParticleEngine.ts';

// WebGPU exports
export {
  isWebGPUSupported,
  getWebGPUSupportMessage,
  GPUParticleBuffer,
  GPURenderer,
  GPUPhysics,
} from './webgpu/index.ts';
export type { GPURendererConfig, GPUPhysicsConfig } from './webgpu/index.ts';

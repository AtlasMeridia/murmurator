// WebGPU renderer using Three.js WebGPURenderer

import * as THREE from 'three';
import { WebGPURenderer, MeshBasicNodeMaterial } from 'three/webgpu';
import type { ComputeNode } from 'three/webgpu';
import {
  vec3,
  float,
  uniform,
  instanceIndex,
  color as colorNode,
  positionLocal,
} from 'three/tsl';
import type { GPUParticleBuffer } from './GPUParticleBuffer.ts';
import type { StateStore } from '../../state/StateStore.ts';

export interface GPURendererConfig {
  canvas?: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio?: number;
  antialias?: boolean;
}

type ParticleShape = 'circle' | 'square' | 'triangle' | 'ring';

export class GPURenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer!: WebGPURenderer;
  private particles: THREE.InstancedMesh | null = null;
  private state: StateStore;
  private width: number;
  private height: number;
  private currentShape: ParticleShape = 'circle';
  private particleBuffer: GPUParticleBuffer | null = null;

  // Tracer effect
  private fadeQuad: THREE.Mesh | null = null;
  private fadeMaterial: MeshBasicNodeMaterial | null = null;

  // Uniforms
  private baseSizeUniform = uniform(5);
  private baseOpacityUniform = uniform(1);
  private colorUniform = uniform(new THREE.Color(1, 1, 1));

  // Initialization promise
  private initPromise: Promise<void>;

  constructor(state: StateStore, config: GPURendererConfig) {
    this.state = state;
    this.width = config.width;
    this.height = config.height;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Create orthographic camera centered at origin
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 1000);
    this.camera.position.z = 100;

    // Create WebGPU renderer (async initialization)
    this.initPromise = this.initRenderer(config);

    // Subscribe to shape changes
    this.state.subscribe('particles.shape', () => {
      if (this.particleBuffer) {
        this.initializeParticles(this.particleBuffer);
      }
    });
  }

  private async initRenderer(config: GPURendererConfig): Promise<void> {
    this.renderer = new WebGPURenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
    });

    await this.renderer.init();

    // Opaque black, so a clear without a following render isn't transparent
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(config.pixelRatio ?? window.devicePixelRatio);
    this.renderer.setSize(this.width, this.height);

    // Create fade quad for tracer effect
    this.createFadeQuad();
  }

  /**
   * Wait for renderer initialization to complete.
   */
  async ready(): Promise<void> {
    return this.initPromise;
  }

  private createFadeQuad(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fadeMaterial = new MeshBasicNodeMaterial({
      colorNode: colorNode(0x000000),
      transparent: true,
      opacity: 0.1,
      depthTest: false,
      depthWrite: false,
    });
    this.fadeQuad = new THREE.Mesh(geometry, this.fadeMaterial);
    this.fadeQuad.position.z = 50;
    this.fadeQuad.frustumCulled = false;
    this.fadeQuad.visible = false;
  }

  private createGeometry(shape: ParticleShape): THREE.BufferGeometry {
    switch (shape) {
      case 'circle':
        return new THREE.CircleGeometry(1, 16);
      case 'square':
        return new THREE.PlaneGeometry(1.8, 1.8);
      case 'triangle':
        return new THREE.CircleGeometry(1, 3);
      case 'ring':
        return new THREE.RingGeometry(0.5, 1, 16);
      default:
        return new THREE.CircleGeometry(1, 16);
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  getDomElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Initialize particles from GPU buffer.
   */
  initializeParticles(buffer: GPUParticleBuffer): void {
    this.particleBuffer = buffer;

    // Remove existing particles
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    // Get current shape from state
    this.currentShape = this.state.get<ParticleShape>('particles.shape') || 'circle';

    // Create geometry
    const geometry = this.createGeometry(this.currentShape);

    // Attach positions as instanced attribute
    // This allows the geometry to read positions directly from the storage buffer
    geometry.setAttribute('instancePosition', buffer.positionsAttribute);

    // Create node material that reads from storage buffers
    const material = new MeshBasicNodeMaterial({
      colorNode: this.colorUniform,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    // Create instanced mesh
    this.particles = new THREE.InstancedMesh(geometry, material, buffer.count);
    this.particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particles.frustumCulled = false; // Important for particles

    // Override position: scale local geometry by particle size, then add instance position
    // positionLocal is the original geometry vertex
    // instancePos is the particle center from storage buffer
    const instancePos = buffer.positionsStorage.element(instanceIndex);
    const scaledLocal = positionLocal.mul(this.baseSizeUniform);

    material.positionNode = vec3(
      scaledLocal.x.add(instancePos.x),
      scaledLocal.y.add(instancePos.y),
      float(0)
    );

    this.scene.add(this.particles);

    // Initial update
    this.updateUniforms();
  }

  /**
   * Update particle positions from buffer.
   * In GPU mode, this is a no-op since compute shaders update directly.
   */
  updateParticles(_buffer: GPUParticleBuffer): void {
    // GPU compute updates buffers directly
    this.updateUniforms();
  }

  /**
   * Update uniforms from state.
   */
  private updateUniforms(): void {
    const baseSize = this.state.get<number>('particles.size');
    const baseOpacity = this.state.get<number>('particles.opacity');
    const colorHex = this.state.get<string>('particles.color');

    this.baseSizeUniform.value = baseSize;
    this.baseOpacityUniform.value = baseOpacity;
    this.colorUniform.value.set(colorHex);

    if (this.particles) {
      const material = this.particles.material as MeshBasicNodeMaterial;
      material.opacity = baseOpacity;
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // Update camera
    const halfW = width / 2;
    const halfH = height / 2;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(width, height);
  }

  render(): void {
    const tracerStrength = this.state.get<number>('rendering.tracers') ?? 0;
    const trailIntensity = this.state.get<number>('rendering.trailIntensity') ?? 1.0;

    if (tracerStrength > 0 && this.fadeQuad && this.fadeMaterial) {
      // Enable tracer mode
      this.renderer.autoClear = false;
      this.scene.background = null;

      // Update fade opacity using exponential mapping
      // k controls decay rate, multiplied by intensity for user adjustment
      const k = 19.5 * trailIntensity;
      this.fadeMaterial.opacity = Math.exp(-k * tracerStrength);
      this.fadeQuad.visible = true;

      // Render fade quad first
      this.camera.add(this.fadeQuad);
      this.fadeQuad.position.set(0, 0, -50);

      this.renderer.render(this.scene, this.camera);

      this.camera.remove(this.fadeQuad);
    } else {
      // Normal render mode
      this.renderer.autoClear = true;
      if (!this.scene.background) {
        this.scene.background = new THREE.Color(0x000000);
      }
      if (this.fadeQuad) {
        this.fadeQuad.visible = false;
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Synchronous render for compatibility.
   */
  renderSync(): void {
    this.render();
  }

  /**
   * Clear the canvas.
   */
  clear(): void {
    this.renderer.autoClear = true;
    this.scene.background = new THREE.Color(0x000000);
    this.renderer.clear();
  }

  /**
   * Execute a compute shader.
   */
  compute(computeNode: ComputeNode): void {
    this.renderer.compute(computeNode);
  }

  dispose(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
    if (this.fadeQuad) {
      this.fadeQuad.geometry.dispose();
      this.fadeMaterial?.dispose();
    }
    this.renderer.dispose();
  }

  toDataURL(type: string = 'image/png'): string {
    return this.renderer.domElement.toDataURL(type);
  }

  toBlob(callback: (blob: Blob | null) => void, type: string = 'image/png'): void {
    this.renderer.domElement.toBlob(callback, type);
  }
}

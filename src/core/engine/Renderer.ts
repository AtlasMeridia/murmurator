// Three.js renderer for particles using InstancedMesh

import * as THREE from 'three';
import type { ParticleBuffer } from './Particle.ts';
import type { StateStore } from '../state/StateStore.ts';

export interface RendererConfig {
  canvas?: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio?: number;
  antialias?: boolean;
}

type ParticleShape = 'circle' | 'square' | 'triangle' | 'ring';

export class Renderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.InstancedMesh | null = null;
  private state: StateStore;
  private width: number;
  private height: number;
  private currentShape: ParticleShape = 'circle';
  private particleBuffer: ParticleBuffer | null = null;

  // Tracer effect
  private fadeQuad: THREE.Mesh | null = null;
  private fadeMaterial: THREE.MeshBasicMaterial | null = null;

  // Reusable objects to avoid GC
  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor(state: StateStore, config: RendererConfig) {
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

    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.antialias ?? true,
      preserveDrawingBuffer: true, // Needed for screenshots
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(config.pixelRatio ?? window.devicePixelRatio);

    // Subscribe to shape changes
    this.state.subscribe('particles.shape', () => {
      if (this.particleBuffer) {
        this.initializeParticles(this.particleBuffer);
      }
    });

    // Create fade quad for tracer effect
    this.createFadeQuad();
  }

  private createFadeQuad(): void {
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fadeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.1,
      depthTest: false,
      depthWrite: false,
    });
    this.fadeQuad = new THREE.Mesh(geometry, this.fadeMaterial);
    this.fadeQuad.position.z = 50; // In front of camera but behind particles
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

  // Initialize particles from buffer
  initializeParticles(buffer: ParticleBuffer): void {
    // Store buffer reference for shape changes
    this.particleBuffer = buffer;

    // Remove existing particles
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }

    // Get current shape from state
    this.currentShape = this.state.get<ParticleShape>('particles.shape') || 'circle';

    // Create geometry based on shape
    const geometry = this.createGeometry(this.currentShape);

    // Create material
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    // Create instanced mesh
    this.particles = new THREE.InstancedMesh(geometry, material, buffer.count);
    this.particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Initialize instance colors
    const colors = new Float32Array(buffer.count * 3);
    for (let i = 0; i < buffer.count; i++) {
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
    }
    this.particles.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);

    this.scene.add(this.particles);

    // Initial update
    this.updateParticles(buffer);
  }

  // Update particle positions and properties from buffer
  updateParticles(buffer: ParticleBuffer): void {
    if (!this.particles) return;

    const baseSize = this.state.get<number>('particles.size');
    const baseOpacity = this.state.get<number>('particles.opacity');
    const colorHex = this.state.get<string>('particles.color');

    this.color.set(colorHex);

    const material = this.particles.material as THREE.MeshBasicMaterial;
    material.opacity = baseOpacity;
    material.color.copy(this.color);

    // Update instance matrices
    for (let i = 0; i < buffer.count; i++) {
      const i2 = i * 2;
      const x = buffer.positions[i2];
      const y = buffer.positions[i2 + 1];
      const size = buffer.sizes[i] * baseSize;

      this.dummy.position.set(x, y, 0);
      this.dummy.scale.setScalar(size);
      this.dummy.updateMatrix();
      this.particles.setMatrixAt(i, this.dummy.matrix);
    }

    this.particles.instanceMatrix.needsUpdate = true;
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

    if (tracerStrength > 0 && this.fadeQuad && this.fadeMaterial) {
      // Enable tracer mode
      this.renderer.autoClear = false;
      this.scene.background = null;

      // Update fade opacity (lower opacity = longer trails)
      this.fadeMaterial.opacity = 1 - tracerStrength;
      this.fadeQuad.visible = true;

      // Render fade quad first (attached to camera so it covers screen)
      this.camera.add(this.fadeQuad);
      this.fadeQuad.position.set(0, 0, -50);

      // Render scene (fade quad fades previous frame, then particles render on top)
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

  setBackgroundColor(color: string | number): void {
    (this.scene.background as THREE.Color).set(color);
  }

  // Clear the canvas (useful when resetting with tracers enabled)
  clear(): void {
    this.renderer.autoClear = true;
    this.scene.background = new THREE.Color(0x000000);
    this.renderer.clear();
  }

  dispose(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
  }

  // For exports - get raw data URL
  toDataURL(type: string = 'image/png'): string {
    return this.renderer.domElement.toDataURL(type);
  }

  // For exports - get blob
  toBlob(callback: (blob: Blob | null) => void, type: string = 'image/png'): void {
    this.renderer.domElement.toBlob(callback, type);
  }
}

// Console API for debugging Murmurator
// Exposed globally as window.murmurator

import type { ParticleEngine } from '../core/engine/ParticleEngine.ts';
import type { StateStore, ParameterSnapshot, Unsubscribe } from '../core/state/StateStore.ts';
import type { EventBus } from '../core/events/EventBus.ts';
import { PARAMETER_DEFINITIONS, type ParameterDef } from '../core/state/Parameters.ts';

export class ConsoleAPI {
  readonly stateStore: StateStore;
  readonly eventBus: EventBus;
  readonly engine: ParticleEngine;

  constructor(engine: ParticleEngine, stateStore: StateStore, eventBus: EventBus) {
    this.engine = engine;
    this.stateStore = stateStore;
    this.eventBus = eventBus;
  }

  // ─── State Access ───────────────────────────────────────────

  get(key: string): unknown {
    return this.stateStore.get(key);
  }

  set(key: string, value: unknown): void {
    this.stateStore.set(key, value);
  }

  add(key: string, delta: number): void {
    const current = this.stateStore.get<number>(key);
    if (typeof current !== 'number') {
      console.warn(`Cannot add to non-numeric parameter: ${key}`);
      return;
    }
    this.stateStore.set(key, current + delta);
  }

  multiply(key: string, factor: number): void {
    const current = this.stateStore.get<number>(key);
    if (typeof current !== 'number') {
      console.warn(`Cannot multiply non-numeric parameter: ${key}`);
      return;
    }
    this.stateStore.set(key, current * factor);
  }

  getState(): Record<string, unknown> {
    const snapshot = this.stateStore.getSnapshot();
    return snapshot.parameters;
  }

  // ─── Playback ───────────────────────────────────────────────

  play(): void {
    this.engine.start();
  }

  pause(): void {
    this.engine.stop();
  }

  reset(): void {
    this.engine.reset();
  }

  step(): void {
    this.engine.step();
  }

  isRunning(): boolean {
    return this.engine.isRunning();
  }

  // ─── Inspection ─────────────────────────────────────────────

  getTime(): number {
    return this.engine.getTime();
  }

  getFrameCount(): number {
    return this.engine.getFrameCount();
  }

  getParameters(): ParameterDef[] {
    return PARAMETER_DEFINITIONS;
  }

  getParameter(key: string): ParameterDef | undefined {
    return PARAMETER_DEFINITIONS.find(def => def.key === key);
  }

  // ─── Snapshots ──────────────────────────────────────────────

  getSnapshot(): ParameterSnapshot {
    return this.stateStore.getSnapshot();
  }

  loadSnapshot(snapshot: ParameterSnapshot): void {
    this.stateStore.loadSnapshot(snapshot);
  }

  // ─── Events ─────────────────────────────────────────────────

  on<T = unknown>(event: string, callback: (data: T) => void): Unsubscribe {
    return this.eventBus.subscribe(event, callback);
  }

  // ─── Help ───────────────────────────────────────────────────

  help(): void {
    console.log(`
Murmurator Console API
======================

State:
  murmurator.get(key)           - Get parameter value
  murmurator.set(key, value)    - Set parameter value
  murmurator.add(key, delta)    - Add to numeric parameter
  murmurator.multiply(key, n)   - Multiply numeric parameter
  murmurator.getState()         - Get all parameters as object

Playback:
  murmurator.play()             - Start simulation
  murmurator.pause()            - Stop simulation
  murmurator.reset()            - Reset simulation
  murmurator.step()             - Advance one frame (when paused)
  murmurator.isRunning()        - Check if running

Inspection:
  murmurator.getTime()          - Get simulation time
  murmurator.getFrameCount()    - Get total frames
  murmurator.getParameters()    - List all parameter definitions
  murmurator.getParameter(key)  - Get specific parameter definition

Snapshots:
  murmurator.getSnapshot()      - Save current state
  murmurator.loadSnapshot(s)    - Restore saved state

Events:
  murmurator.on(event, fn)      - Subscribe to events
    Events: engine:frame, engine:state, engine:resize

Example:
  murmurator.set('particles.count', 10000)
  murmurator.add('physics.force.y', -0.5)
  const preset = murmurator.getSnapshot()
  murmurator.loadSnapshot(preset)
`);
  }
}

// Central state management for all parameters
// Observable for reactive updates

import type { ControlSignal } from '../events/ControlSignal.ts';
import { getDefaultParameters, getParameterDef, PARAMETER_DEFINITIONS } from './Parameters.ts';

export type Unsubscribe = () => void;
export type StateCallback = (key: string, value: unknown, oldValue: unknown) => void;

export interface ParameterSnapshot {
  parameters: Record<string, unknown>;
  timestamp: number;
}

export interface PresetFile {
  version: string;
  name: string;
  created: string;
  settings: Record<string, unknown>;
}

export class StateStore {
  private parameters: Map<string, unknown> = new Map();
  private listeners: Map<string, Set<StateCallback>> = new Map();
  private globalListeners: Set<StateCallback> = new Set();

  constructor() {
    // Initialize with defaults
    const defaults = getDefaultParameters();
    for (const [key, value] of Object.entries(defaults)) {
      this.parameters.set(key, value);
    }
  }

  get<T = unknown>(key: string): T {
    return this.parameters.get(key) as T;
  }

  set(key: string, value: unknown): void {
    const oldValue = this.parameters.get(key);
    if (oldValue === value) return;

    // Validate if we have a definition
    const def = getParameterDef(key);
    if (def) {
      value = this.validateValue(def, value);
    }

    this.parameters.set(key, value);
    this.notifyListeners(key, value, oldValue);
  }

  private validateValue(def: typeof PARAMETER_DEFINITIONS[0], value: unknown): unknown {
    if (def.type === 'number' && typeof value === 'number') {
      if (def.min !== undefined) value = Math.max(def.min, value as number);
      if (def.max !== undefined) value = Math.min(def.max, value as number);
    }
    return value;
  }

  private notifyListeners(key: string, value: unknown, oldValue: unknown): void {
    // Notify key-specific listeners
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(cb => cb(key, value, oldValue));
    }

    // Notify global listeners
    this.globalListeners.forEach(cb => cb(key, value, oldValue));
  }

  // Apply a control signal
  applySignal(signal: ControlSignal): void {
    const currentValue = this.get<number>(signal.target);
    let newValue: unknown;

    switch (signal.mode) {
      case 'set':
        newValue = signal.value;
        break;
      case 'add':
        if (typeof currentValue === 'number' && typeof signal.value === 'number') {
          newValue = currentValue + signal.value;
        } else {
          newValue = signal.value;
        }
        break;
      case 'multiply':
        if (typeof currentValue === 'number' && typeof signal.value === 'number') {
          newValue = currentValue * signal.value;
        } else {
          newValue = signal.value;
        }
        break;
      case 'lerp':
        // For lerp, we'd need duration handling - for now, just set
        newValue = signal.value;
        break;
      default:
        newValue = signal.value;
    }

    this.set(signal.target, newValue);
  }

  // Subscribe to changes on a specific key
  subscribe(key: string, callback: StateCallback): Unsubscribe {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);

    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(callback);
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  // Subscribe to all changes
  subscribeAll(callback: StateCallback): Unsubscribe {
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  // Bulk operations
  getSnapshot(): ParameterSnapshot {
    const parameters: Record<string, unknown> = {};
    this.parameters.forEach((value, key) => {
      parameters[key] = value;
    });
    return {
      parameters,
      timestamp: Date.now(),
    };
  }

  loadSnapshot(snapshot: ParameterSnapshot): void {
    for (const [key, value] of Object.entries(snapshot.parameters)) {
      this.set(key, value);
    }
  }

  // Get human-readable state description (for AI context)
  getDescribedState(): string {
    const lines: string[] = ['Current Parameters:'];

    let currentCategory = '';
    for (const def of PARAMETER_DEFINITIONS) {
      if (def.category !== currentCategory) {
        currentCategory = def.category;
        lines.push(`\n## ${currentCategory.toUpperCase()}`);
      }
      const value = this.get(def.key);
      lines.push(`- ${def.label}: ${value}${def.description ? ` (${def.description})` : ''}`);
    }

    return lines.join('\n');
  }

  // Export settings to JSON string
  exportSettings(name: string = 'Untitled'): string {
    const snapshot = this.getSnapshot();
    const preset: PresetFile = {
      version: '1.0',
      name,
      created: new Date().toISOString(),
      settings: snapshot.parameters,
    };
    return JSON.stringify(preset, null, 2);
  }

  // Import settings from JSON string
  // Returns error message on failure, null on success
  importSettings(json: string): string | null {
    try {
      const parsed = JSON.parse(json);

      // Validate structure
      if (!parsed || typeof parsed !== 'object') {
        return 'Invalid preset file format';
      }

      // Support both full PresetFile format and raw settings object
      const settings = parsed.settings ?? parsed.parameters ?? parsed;

      if (!settings || typeof settings !== 'object') {
        return 'No settings found in preset file';
      }

      // Validate that we have at least some known keys
      const knownKeys = PARAMETER_DEFINITIONS.map(def => def.key);
      const settingsKeys = Object.keys(settings);
      const validKeys = settingsKeys.filter(k => knownKeys.includes(k));

      if (validKeys.length === 0) {
        return 'Preset contains no recognized parameters';
      }

      // Apply settings (only valid keys)
      for (const key of validKeys) {
        this.set(key, settings[key]);
      }

      return null; // Success
    } catch (e) {
      return e instanceof Error ? e.message : 'Failed to parse preset file';
    }
  }

  // Reset all parameters to defaults
  resetToDefaults(): void {
    const defaults = getDefaultParameters();
    for (const [key, value] of Object.entries(defaults)) {
      this.set(key, value);
    }
  }
}

// Singleton instance
export const stateStore = new StateStore();

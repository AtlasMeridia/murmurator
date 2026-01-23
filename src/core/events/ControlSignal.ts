// Control signal type definitions
// The universal message format for parameter changes

export type EasingFunction = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

export type SignalMode = 'set' | 'add' | 'multiply' | 'lerp';

export interface Formula {
  expression: string;
  compiled?: (context: FormulaContext) => number;
  dependencies: string[];
}

export interface FormulaContext {
  time: number;
  deltaTime: number;
  x?: number;
  y?: number;
  index?: number;
  random?: () => number;
}

export interface ControlSignal {
  // What to change
  target: string;  // e.g., "physics.force.x", "particles.count"

  // The change
  value: number | string | boolean | Formula;

  // How to apply it
  mode: SignalMode;

  // Optional timing
  duration?: number;  // ms to transition
  easing?: EasingFunction;

  // Metadata
  source?: string;    // Which adapter sent this
  timestamp?: number;
}

// Helper to create control signals
export function createSignal(
  target: string,
  value: ControlSignal['value'],
  mode: SignalMode = 'set'
): ControlSignal {
  return {
    target,
    value,
    mode,
    timestamp: Date.now(),
  };
}

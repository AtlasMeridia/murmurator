# Particle Playground: Architecture & Build Plan

**Version:** 0.1 (Draft)
**Created:** January 2025
**Status:** Planning / Pre-development

---

## System Architecture Overview

The application follows an **event-driven, plugin architecture** with clear separation between:

1. **Core Engine** — particle simulation and rendering (knows nothing about inputs)
2. **Event Bus** — message passing system for loose coupling
3. **Input Adapters** — translate various inputs into control signals
4. **Output Adapters** — handle exports, streaming, external communication
5. **UI Shell** — control panel and viewport management

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                  UI SHELL                                     │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────────┐  │
│  │           VIEWPORT              │  │          CONTROL PANEL            │  │
│  │   (canvas container, aspect     │  │  - Aspect ratio selector          │  │
│  │    ratio management)            │  │  - Formula display                │  │
│  │                                 │  │  - AI text input                  │  │
│  │      ┌─────────────────┐        │  │  - Playback controls              │  │
│  │      │     CANVAS      │        │  │  - Capture controls               │  │
│  │      │  (Three.js /    │        │  │  - Parameter inspector            │  │
│  │      │   WebGL)        │        │  │                                   │  │
│  │      └─────────────────┘        │  │                                   │  │
│  └─────────────────────────────────┘  └───────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                      ▼
         ┌─────────────────────┐              ┌─────────────────────┐
         │   PARTICLE ENGINE   │◄────────────►│     STATE STORE     │
         │   - Simulation      │              │   - Parameters      │
         │   - Rendering       │              │   - Formulas        │
         │   - Physics         │              │   - Config          │
         └─────────────────────┘              └─────────────────────┘
                    ▲                                      ▲
                    │                                      │
                    │         ┌─────────────────┐          │
                    └─────────┤    EVENT BUS    ├──────────┘
                              │   (pub/sub)     │
                              └─────────────────┘
                                       ▲
           ┌───────────────┬───────────┼───────────┬───────────────┐
           ▼               ▼           ▼           ▼               ▼
    ┌────────────┐  ┌────────────┐  ┌─────┐  ┌────────────┐  ┌────────────┐
    │    TEXT    │  │   AUDIO    │  │MIDI │  │    OSC     │  │  WEBSOCKET │
    │   ADAPTER  │  │   ADAPTER  │  │ ... │  │   ADAPTER  │  │   ADAPTER  │
    │  (AI/Chat) │  │  (future)  │  │     │  │  (future)  │  │  (future)  │
    └────────────┘  └────────────┘  └─────┘  └────────────┘  └────────────┘
           ▲
           │
    ┌────────────┐
    │  CLAUDE    │
    │    API     │
    └────────────┘
```

---

## Directory Structure

```
particle-playground/
├── docs/
│   ├── PROJECT_BRIEF.md
│   ├── ARCHITECTURE.md          # This document
│   └── API.md                   # Control signal specification (future)
│
├── src/
│   ├── index.html               # Entry point
│   ├── main.ts                  # Application bootstrap
│   │
│   ├── core/
│   │   ├── engine/
│   │   │   ├── ParticleEngine.ts      # Main engine class
│   │   │   ├── ParticleSystem.ts      # Individual particle system
│   │   │   ├── Particle.ts            # Particle data structure
│   │   │   ├── Physics.ts             # Force calculations
│   │   │   └── Renderer.ts            # Three.js rendering
│   │   │
│   │   ├── state/
│   │   │   ├── StateStore.ts          # Central state management
│   │   │   ├── Parameters.ts          # Parameter definitions & defaults
│   │   │   └── Formulas.ts            # Formula parsing & evaluation
│   │   │
│   │   └── events/
│   │       ├── EventBus.ts            # Pub/sub implementation
│   │       ├── ControlSignal.ts       # Signal type definitions
│   │       └── EventTypes.ts          # Event constants
│   │
│   ├── adapters/
│   │   ├── BaseAdapter.ts             # Abstract adapter interface
│   │   ├── TextAdapter.ts             # AI/text input (v1.0)
│   │   ├── AudioAdapter.ts            # Audio input (stub for future)
│   │   ├── MidiAdapter.ts             # MIDI input (stub for future)
│   │   └── OscAdapter.ts              # OSC input (stub for future)
│   │
│   ├── services/
│   │   ├── AIService.ts               # Claude API integration
│   │   ├── ExportService.ts           # Screenshot & video export
│   │   └── ConfigService.ts           # Load/save configurations
│   │
│   ├── ui/
│   │   ├── App.ts                     # Main UI shell
│   │   ├── Viewport.ts                # Canvas container & aspect ratio
│   │   ├── ControlPanel.ts            # Right sidebar
│   │   ├── components/
│   │   │   ├── AspectRatioSelector.ts
│   │   │   ├── FormulaDisplay.ts
│   │   │   ├── TextInput.ts
│   │   │   ├── PlaybackControls.ts
│   │   │   ├── CaptureControls.ts
│   │   │   └── ParameterInspector.ts
│   │   └── styles/
│   │       └── main.css
│   │
│   └── utils/
│       ├── math.ts                    # Math helpers
│       ├── random.ts                  # Seeded RNG
│       └── canvas.ts                  # Canvas utilities
│
├── public/
│   └── (static assets)
│
├── tests/
│   └── (test files mirroring src structure)
│
├── package.json
├── tsconfig.json
├── vite.config.ts                # Vite for dev server & bundling
└── README.md
```

---

## Core Abstractions

### 1. Control Signal

The universal message format for parameter changes. All adapters emit these; the engine consumes them.

```typescript
interface ControlSignal {
  // What to change
  target: string;           // e.g., "physics.force.x", "particles.count"
  
  // The change
  value: number | string | boolean | Formula;
  
  // How to apply it
  mode: 'set' | 'add' | 'multiply' | 'lerp';
  
  // Optional timing
  duration?: number;        // ms to transition
  easing?: EasingFunction;
  
  // Metadata
  source?: string;          // Which adapter sent this
  timestamp?: number;
}
```

### 2. Parameter Definition

Parameters are the controllable values in the system. Each has metadata for validation and UI.

```typescript
interface ParameterDef {
  key: string;              // Unique identifier, dot-notation path
  label: string;            // Human-readable name
  type: 'number' | 'boolean' | 'formula' | 'color' | 'enum';
  default: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];       // For enum type
  category: string;         // For UI grouping
  description?: string;     // For AI context
}
```

### 3. Formula

Formulas allow mathematical expressions as parameter values, evaluated per-frame.

```typescript
interface Formula {
  expression: string;       // e.g., "2 * cos(time * 0.5)"
  compiled: Function;       // Compiled evaluator
  dependencies: string[];   // Variables used (time, x, y, etc.)
}
```

### 4. Adapter Interface

All input adapters implement this interface:

```typescript
abstract class BaseAdapter {
  protected eventBus: EventBus;
  protected enabled: boolean = false;
  
  abstract name: string;
  abstract initialize(): Promise<void>;
  abstract start(): void;
  abstract stop(): void;
  abstract dispose(): void;
  
  // Adapters call this to emit signals
  protected emit(signal: ControlSignal): void {
    signal.source = this.name;
    signal.timestamp = Date.now();
    this.eventBus.publish('control:signal', signal);
  }
}
```

---

## Key Modules

### ParticleEngine

Responsibilities:
- Manage one or more ParticleSystems
- Orchestrate the simulation loop (update → render)
- Handle canvas resizing
- Expose methods for pause/play/reset

Does NOT:
- Know about UI
- Know about input sources
- Handle exports directly

```typescript
class ParticleEngine {
  private systems: ParticleSystem[];
  private renderer: Renderer;
  private state: StateStore;
  private running: boolean;
  
  constructor(canvas: HTMLCanvasElement, state: StateStore);
  
  addSystem(config: ParticleSystemConfig): ParticleSystem;
  removeSystem(id: string): void;
  
  start(): void;
  stop(): void;
  reset(): void;
  step(): void;  // Single frame advance (for debugging)
  
  resize(width: number, height: number): void;
  getCanvas(): HTMLCanvasElement;
}
```

### StateStore

Central source of truth for all parameters. Observable for reactive updates.

```typescript
class StateStore {
  private parameters: Map<string, any>;
  private listeners: Map<string, Set<Function>>;
  
  get(key: string): any;
  set(key: string, value: any): void;
  
  // Apply a control signal
  applySignal(signal: ControlSignal): void;
  
  // Subscribe to changes
  subscribe(key: string, callback: Function): Unsubscribe;
  subscribeAll(callback: Function): Unsubscribe;
  
  // Bulk operations
  getSnapshot(): ParameterSnapshot;
  loadSnapshot(snapshot: ParameterSnapshot): void;
  
  // For AI context
  getDescribedState(): string;  // Human-readable parameter summary
}
```

### EventBus

Simple pub/sub for decoupled communication.

```typescript
class EventBus {
  private channels: Map<string, Set<Function>>;
  
  publish(channel: string, data: any): void;
  subscribe(channel: string, callback: Function): Unsubscribe;
  unsubscribe(channel: string, callback: Function): void;
  
  // Predefined channels:
  // - 'control:signal' — parameter change requests
  // - 'engine:frame' — fired each frame with timing info
  // - 'engine:state' — play/pause/reset notifications
  // - 'export:screenshot' — screenshot requested
  // - 'export:video:start' — video recording started
  // - 'export:video:stop' — video recording stopped
}
```

### AIService

Handles communication with Claude API and translation to control signals.

```typescript
class AIService {
  private client: Anthropic;
  private state: StateStore;
  
  constructor(apiKey: string, state: StateStore);
  
  // Process natural language or math input
  async processInput(input: string): Promise<ControlSignal[]>;
  
  // Build context for the AI
  private buildSystemPrompt(): string;
  private buildUserMessage(input: string): string;
}
```

The AI receives:
- Current parameter state
- Available parameters with their ranges and descriptions
- Recent history of changes

And outputs:
- One or more control signals
- Optional explanation (for UI feedback)

---

## Data Flow Examples

### Example 1: User types "make it more chaotic"

```
1. User types in TextInput component
2. TextInput calls TextAdapter.process("make it more chaotic")
3. TextAdapter calls AIService.processInput("make it more chaotic")
4. AIService sends to Claude API with current state context
5. Claude returns: [
     { target: "physics.noise.scale", value: 2.5, mode: "set" },
     { target: "physics.force.randomness", value: 0.8, mode: "set" }
   ]
6. TextAdapter emits these signals to EventBus
7. StateStore receives signals, updates parameters
8. ParticleEngine (subscribed to state) picks up changes
9. Next frame renders with new parameters
10. FormulaDisplay updates to show new values
```

### Example 2: User clicks Screenshot

```
1. User clicks screenshot button
2. CaptureControls publishes 'export:screenshot' to EventBus
3. ExportService (subscribed) receives event
4. ExportService calls engine.stop() to freeze
5. ExportService gets canvas, calls toBlob()
6. ExportService triggers download
7. ExportService calls engine.start() to resume
```

### Example 3: Future audio input

```
1. AudioAdapter.start() begins microphone capture
2. Audio frames processed through FFT
3. Frequency bands mapped to control signals:
   { target: "physics.force.y", value: bassLevel, mode: "lerp" }
4. Signals flow through EventBus → StateStore → Engine
5. Particles react to music in real-time
```

---

## Technology Choices

### Core
| Concern | Choice | Rationale |
|---------|--------|-----------|
| Language | TypeScript | Type safety, better tooling, AI-friendly |
| Bundler | Vite | Fast dev server, simple config, good defaults |
| 3D/WebGL | Three.js | Mature, well-documented, good for particles |
| Particles | InstancedMesh | GPU-efficient for thousands of particles |

### UI
| Concern | Choice | Rationale |
|---------|--------|-----------|
| Framework | Vanilla TS or Lit | Keep it light; React is overkill here |
| Styling | Plain CSS + CSS Variables | Simple, no build complexity |
| Layout | CSS Grid | Natural fit for viewport + sidebar |

### AI
| Concern | Choice | Rationale |
|---------|--------|-----------|
| Model | Claude (Anthropic API) | User preference, good at structured output |
| SDK | @anthropic-ai/sdk | Official, TypeScript support |

### Export
| Concern | Choice | Rationale |
|---------|--------|-----------|
| Screenshots | Canvas.toBlob() | Native, simple |
| Video | MediaRecorder API | Browser-native, outputs WebM |
| Video (MP4) | FFmpeg.wasm (future) | If MP4 needed |

---

## Build Phases

### Phase 1: Foundation (Core Engine)
**Goal:** Particle system renders and runs

- [ ] Project setup (Vite, TypeScript, Three.js)
- [ ] Basic ParticleEngine with hardcoded parameters
- [ ] Simple particle system (position, velocity, basic forces)
- [ ] Render loop with InstancedMesh
- [ ] Canvas sizing and basic aspect ratio support

**Milestone:** Particles moving on screen

### Phase 2: State & Control
**Goal:** Parameters are externally controllable

- [ ] StateStore implementation
- [ ] Parameter definitions
- [ ] EventBus implementation
- [ ] Engine subscribes to state changes
- [ ] Manual parameter tweaking (console or basic UI)

**Milestone:** Can change particle behavior by modifying state

### Phase 3: UI Shell
**Goal:** Full control panel

- [ ] Layout (viewport + sidebar)
- [ ] Aspect ratio selector with orientation toggle
- [ ] Playback controls (play/pause/reset)
- [ ] Parameter inspector (read-only view of current values)
- [ ] Formula display

**Milestone:** Can control simulation through UI

### Phase 4: AI Integration
**Goal:** Natural language control

- [ ] AIService with Claude API
- [ ] TextAdapter
- [ ] Text input component
- [ ] Prompt engineering for reliable parameter mapping
- [ ] Error handling and feedback

**Milestone:** Can type "make it faster" and see results

### Phase 5: Export
**Goal:** Capture stills and video

- [ ] Screenshot export (PNG)
- [ ] Video recording (WebM via MediaRecorder)
- [ ] Clean canvas capture (no UI)
- [ ] Download triggers

**Milestone:** Can save images and videos

### Phase 6: Polish & Extensibility
**Goal:** Ready for future expansion

- [ ] Adapter stubs (Audio, MIDI, OSC)
- [ ] Configuration save/load
- [ ] Seed/randomization controls
- [ ] Documentation
- [ ] Basic presets

**Milestone:** v1.0 complete

---

## AI Development Notes

This document is intended to be consumed by AI coding assistants (Claude Code, etc.) during development. Key points for AI developers:

1. **Modularity is paramount** — resist the urge to tightly couple components
2. **Control signals are the API** — all input goes through this abstraction
3. **State is the source of truth** — engine reads from state, never maintains its own
4. **Adapters are stateless translators** — they convert input to signals, nothing more
5. **Test with manual signals first** — before wiring up AI, test that signals → state → engine works

When implementing, prefer:
- Small, focused functions
- Explicit types over `any`
- Composition over inheritance (except BaseAdapter)
- Early returns over deep nesting
- Comments explaining "why" not "what"

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | Jan 2025 | Claude + Kenny | Initial draft |

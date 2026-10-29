# Particle Playground: Project Brief

**Version:** 0.1 (Draft)
**Created:** January 2025
**Status:** Planning / Pre-development

---

## Executive Summary

Particle Playground is an AI-driven generative art application for creating, exploring, and capturing particle physics simulations. The application allows users to generate randomized particle animations, control them through natural language or direct mathematical input, and export still images or video recordings of interesting states.

The system is designed as a modular platform with a plugin architecture, enabling future expansion to support additional input modalities (audio, video, MIDI, OSC) and output capabilities.

---

## Vision

Create a tool that sits at the intersection of generative art, creative coding, and AI assistance—a playground where the user can:

1. **Discover** — Let randomized particle systems run and evolve, surfacing unexpected visual patterns
2. **Direct** — Guide the simulation through natural language ("make it feel more like smoke") or precise mathematical adjustments ("change force to 0.5 * cos(x)")
3. **Capture** — Freeze and export moments of visual interest as images or video

The goal is not a production tool but an **exploration instrument**—a place to find visual accidents worth keeping.

---

## Target User

- Primary: The developer/artist building this system (Kenny)
- Secondary: Other creative coders who may use or fork the project
- Context: Personal generative art practice, content creation pipeline, portfolio pieces

---

## Core Features (v1.0)

### 1. Particle Simulation Engine
- GPU-accelerated particle system capable of rendering thousands of particles smoothly
- Configurable physics: forces, attractors, repulsors, noise fields, velocity damping
- Randomization system to generate novel starting configurations
- Deterministic seeding (optional) to reproduce specific states

### 2. Viewport Controls
- Resizable canvas with preset aspect ratios:
  - 1:1 (square)
  - 2:3
  - 4:5
  - 9:16
- Each ratio available in landscape or portrait orientation
- Clean rendering without UI overlay for exports

### 3. Control Panel (Right Sidebar)
- **Aspect Ratio Selector** — dropdown or button group with orientation toggle
- **Formula/Physics Display** — live readout of the mathematical functions driving the simulation (editable)
- **AI Text Input** — natural language or mathematical instructions
- **Playback Controls** — play, pause, reset
- **Capture Controls** — screenshot button, video record start/stop
- **Parameter Visibility** — show current values of key simulation parameters

### 4. AI Integration
- Text input interpreted by LLM (Claude API) to modify simulation parameters
- Supports both:
  - Natural language: "add some swirling motion"
  - Direct math: "set rotation to 2 * sin(time * 0.5)"
- AI receives current parameter state as context for coherent modifications

### 5. Export Capabilities
- **Screenshot** — export current frame as PNG at canvas resolution
- **Video Recording** — capture canvas to WebM or MP4
- Exports should be clean (canvas only, no UI)

---

## Future Features (Post-v1.0)

These are explicitly out of scope for v1.0 but the architecture must accommodate them:

### Input Modalities
- **Audio Input** — microphone or audio file; FFT analysis drives parameters (beat detection, frequency bands)
- **Video Input** — webcam or video file; motion detection, color analysis, or pose estimation drives parameters
- **MIDI Input** — hardware controllers map to parameters
- **OSC Input/Output** — interoperability with TouchDesigner, Ableton, Resolume, etc.
- **WebSocket API** — external applications can send control signals

### Output Capabilities
- **OSC Output** — send parameter data to external software
- **Frame Streaming** — stream frames to external processes
- **Preset System** — save and load configurations
- **Seed/State Export** — export reproducible states

### Advanced Simulation
- Multiple particle systems running simultaneously
- Particle trails and history
- Collision detection
- Custom shaders per particle type

---

## Technical Constraints

### Development Environment
- Primary development on MacBook M4 Max
- High VRAM, CPU, and RAM available—performance headroom is generous
- Development workflow: architect in Claude Desktop → build in Claude Code

### Technology Preferences
- Browser-based (local web app)
- Modern JavaScript/TypeScript
- GPU acceleration via WebGL/Three.js
- React or lightweight framework for UI (if needed)
- Modular, plugin-friendly architecture

### Non-Goals (v1.0)
- Multi-user / collaborative features
- Cloud deployment or hosting
- Mobile support
- Persistent storage / database

---

## Success Criteria

v1.0 is successful if:

1. The particle simulation runs smoothly with 5,000+ particles on target hardware
2. Aspect ratio switching works correctly and exports at the correct dimensions
3. AI text input successfully modifies simulation parameters (both natural language and math)
4. Screenshots export clean PNG files
5. Video recording captures at least 30fps for 60+ seconds
6. The codebase is modular enough that adding an audio input adapter requires no changes to the core engine

---

## Open Questions

1. **AI Model**: Claude API vs. local model vs. hybrid? (Claude API assumed for v1.0)
2. **Video Format**: WebM (easy) vs. MP4 (better compatibility, harder to encode in browser)?
3. **State Management**: Simple reactive state vs. full state machine?
4. **Electron/Tauri**: Stay browser-only or wrap in desktop shell for better file system access?

---

## Glossary

- **Adapter**: A module that translates external input (text, audio, video, MIDI) into normalized control signals
- **Control Signal**: A standardized message format for parameter updates
- **Event Bus**: Pub/sub system for loose coupling between modules
- **Particle Engine**: Core simulation and rendering system
- **Seed**: A value that initializes the random number generator for reproducible results

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | Jan 2025 | Claude + Kenny | Initial draft |

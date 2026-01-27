// Particle Playground - Main Entry Point

import './ui/styles/main.css';
import { ParticleEngine } from './core/engine/ParticleEngine.ts';
import { stateStore } from './core/state/StateStore.ts';
import { eventBus } from './core/events/EventBus.ts';
import { EventTypes } from './core/events/EventTypes.ts';
import { parseAspectRatio } from './utils/math.ts';
import { getParameterDef } from './core/state/Parameters.ts';
import { ConsoleAPI } from './api/ConsoleAPI.ts';
import { isWebGPUSupported, isSecureContext, getWebGPUSupportMessage } from './core/engine/webgpu/index.ts';
import { PRESETS } from './core/state/presets.ts';

// Application state
let engine: ParticleEngine;

// DOM elements
const app = document.getElementById('app')!;

// Helper to create slider with input field
function createSlider(id: string, stateKey: string, label: string): string {
  const def = getParameterDef(stateKey);
  const value = stateStore.get(stateKey);
  const min = def?.min ?? 0;
  const max = def?.max ?? 100;
  const step = def?.step ?? 1;

  return `
    <div class="slider-control">
      <label>
        <span>${label}</span>
        <input type="text" class="value-input" id="input-${id}" value="${value}" data-key="${stateKey}">
      </label>
      <input type="range" id="slider-${id}" min="${min}" max="${max}" step="${step}" value="${value}" data-key="${stateKey}">
    </div>
  `;
}

// Helper to create enum selector
function createEnumSelector(id: string, stateKey: string, label: string, options: string[]): string {
  const currentValue = stateStore.get(stateKey);

  const buttons = options.map(opt =>
    `<button data-value="${opt}" class="${opt === currentValue ? 'active' : ''}">${opt}</button>`
  ).join('');

  return `
    <div class="enum-control">
      <span class="enum-label">${label}</span>
      <div class="enum-selector" id="enum-${id}" data-key="${stateKey}">
        ${buttons}
      </div>
    </div>
  `;
}

// Create the UI structure
function createUI(): void {
  app.innerHTML = `
    <div class="viewport" id="viewport">
      <!-- Canvas will be inserted here -->
    </div>
    <div class="control-panel">
      <!-- Presets Section -->
      <div class="panel-section">
        <div class="section-header" data-section="presets">
          <div class="section-title">Presets</div>
          <span class="section-toggle">▼</span>
        </div>
        <div class="section-content" id="section-presets">
          <div class="preset-actions">
            <button class="btn" id="btn-export">Export</button>
            <button class="btn" id="btn-import">Import</button>
            <button class="btn" id="btn-defaults">Defaults</button>
            <input type="file" id="import-file" accept=".json" style="display: none;">
          </div>
          <div class="preset-list">
            ${PRESETS.map(p => `<button class="btn preset-btn" data-preset="${p.name}" title="${p.description}">${p.name}</button>`).join('')}
          </div>
        </div>
      </div>

      <!-- Playback Section -->
      <div class="panel-section">
        <div class="section-header" data-section="playback">
          <div class="section-title">Playback</div>
          <span class="section-toggle">▼</span>
        </div>
        <div class="section-content" id="section-playback">
          <div class="playback-controls">
            <button class="btn btn-icon" id="btn-playpause" title="Play/Pause">▶</button>
            <button class="btn btn-icon" id="btn-reset" title="Reset">↺</button>
          </div>
          <div class="stats" id="stats">
            <div class="stats-row">
              <span>FPS:</span>
              <span id="stat-fps">0</span>
            </div>
            <div class="stats-row">
              <span>Particles:</span>
              <span id="stat-particles">0</span>
            </div>
            <div class="stats-row">
              <span>Time:</span>
              <span id="stat-time">0.00s</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Viewport Section -->
      <div class="panel-section">
        <div class="section-header" data-section="viewport">
          <div class="section-title">Viewport</div>
          <span class="section-toggle">▼</span>
        </div>
        <div class="section-content" id="section-viewport">
          <div class="aspect-ratio-selector">
            <button class="btn aspect-ratio-btn active" data-ratio="1:1">1:1</button>
            <button class="btn aspect-ratio-btn" data-ratio="4:5">4:5</button>
            <button class="btn aspect-ratio-btn" data-ratio="2:3">2:3</button>
            <button class="btn aspect-ratio-btn" data-ratio="9:16">9:16</button>
          </div>
          <div class="orientation-toggle">
            <button class="active" data-orientation="landscape">Landscape</button>
            <button data-orientation="portrait">Portrait</button>
          </div>
        </div>
      </div>

      <!-- Particles Section -->
      <div class="panel-section">
        <div class="section-header" data-section="particles">
          <div class="section-title">Particles</div>
          <span class="section-toggle">▼</span>
        </div>
        <div class="section-content" id="section-particles">
          ${createSlider('count', 'particles.count', 'Count')}
          ${createSlider('size', 'particles.size', 'Size')}
          <div class="param-row">
            <span class="param-label">Color</span>
            <input type="color" id="input-color" value="${stateStore.get('particles.color')}">
          </div>
          ${createSlider('opacity', 'particles.opacity', 'Opacity')}

          <!-- Advanced Particles -->
          <div class="subsection">
            <div class="subsection-header collapsed" data-subsection="particles-advanced">
              <span class="subsection-toggle">▼</span>
              <span class="subsection-title">Advanced</span>
            </div>
            <div class="subsection-content collapsed" id="subsection-particles-advanced">
              ${createSlider('sizeVariation', 'particles.sizeVariation', 'Size Variation')}
              ${createSlider('lifetime', 'particles.lifetime', 'Lifetime (s)')}
              ${createSlider('initialSpeed', 'particles.initialSpeed', 'Initial Speed')}
              ${createEnumSelector('spawnMode', 'particles.spawnMode', 'Spawn Mode', ['random', 'center', 'edges', 'grid'])}
              ${createEnumSelector('shape', 'particles.shape', 'Shape', ['circle', 'square', 'triangle', 'ring'])}
            </div>
          </div>
        </div>
      </div>

      <!-- Physics Section -->
      <div class="panel-section">
        <div class="section-header" data-section="physics">
          <div class="section-title">Physics</div>
          <span class="section-toggle">▼</span>
        </div>
        <div class="section-content" id="section-physics">
          ${createSlider('noise', 'physics.noise.strength', 'Noise Strength')}
          ${createSlider('tracers', 'rendering.tracers', 'Tracers')}
          ${createSlider('speed', 'simulation.speed', 'Speed')}

          <!-- Advanced Physics -->
          <div class="subsection">
            <div class="subsection-header collapsed" data-subsection="physics-advanced">
              <span class="subsection-toggle">▼</span>
              <span class="subsection-title">Advanced</span>
            </div>
            <div class="subsection-content collapsed" id="subsection-physics-advanced">
              ${createSlider('noiseScale', 'physics.noise.scale', 'Noise Scale')}
              ${createSlider('noiseEvolution', 'physics.noise.speed', 'Noise Evolution')}
              ${createSlider('gravityX', 'physics.force.x', 'Gravity X')}
              ${createSlider('gravityY', 'physics.force.y', 'Gravity Y')}
              ${createSlider('maxVelocity', 'physics.maxVelocity', 'Max Velocity')}
              ${createSlider('turbulence', 'physics.turbulence', 'Turbulence')}
              ${createSlider('attraction', 'physics.attractor.strength', 'Attraction')}
              ${createEnumSelector('bounds', 'simulation.bounds', 'Bounds', ['wrap', 'bounce', 'none'])}
              ${createSlider('damping', 'physics.damping', 'Damping')}
            </div>
          </div>
        </div>
      </div>

      <!-- Export Section -->
      <div class="panel-section">
        <div class="section-header" data-section="export">
          <div class="section-title">Export</div>
          <span class="section-toggle">▼</span>
        </div>
        <div class="section-content" id="section-export">
          <div class="export-controls">
            <button class="btn" id="btn-screenshot">Screenshot</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Calculate canvas dimensions based on aspect ratio and available space
function calculateCanvasSize(): { width: number; height: number } {
  const viewport = document.getElementById('viewport')!;
  const availableWidth = viewport.clientWidth - 40; // Padding
  const availableHeight = viewport.clientHeight - 40;

  const ratioStr = stateStore.get<string>('viewport.aspectRatio');
  const orientation = stateStore.get<string>('viewport.orientation');

  let ratio = parseAspectRatio(ratioStr);
  // Ratios like 9:16, 2:3 are portrait by default (width < height)
  // Invert for landscape orientation
  if (orientation === 'landscape') {
    ratio = 1 / ratio;
  }

  let width: number, height: number;

  if (availableWidth / availableHeight > ratio) {
    // Height constrained
    height = availableHeight;
    width = height * ratio;
  } else {
    // Width constrained
    width = availableWidth;
    height = width / ratio;
  }

  return {
    width: Math.floor(width),
    height: Math.floor(height),
  };
}

// Initialize the particle engine
async function initEngine(): Promise<void> {
  const viewport = document.getElementById('viewport')!;
  const { width, height } = calculateCanvasSize();

  // Show initial loading status
  const statsDiv = document.getElementById('stats');
  if (statsDiv) {
    const modeRow = document.createElement('div');
    modeRow.className = 'stats-row';
    modeRow.innerHTML = `
      <span>Mode:</span>
      <span id="stat-mode" style="color: #94a3b8">Loading...</span>
    `;
    statsDiv.appendChild(modeRow);
  }

  // Log basic support info
  const basicSupport = isWebGPUSupported();
  const secureCtx = isSecureContext();
  console.log(`WebGPU API present: ${basicSupport}, Secure context: ${secureCtx}`);

  engine = new ParticleEngine(stateStore, {
    width,
    height,
  });

  // Wait for async initialization (WebGPU with fallback)
  await engine.ready();

  // Update mode indicator based on actual mode
  const actualMode = engine.isWebGPUMode();
  const modeSpan = document.getElementById('stat-mode');
  if (modeSpan) {
    modeSpan.textContent = actualMode ? 'WebGPU' : 'WebGL';
    modeSpan.style.color = actualMode ? '#4ade80' : '#fbbf24';
  }

  console.log(actualMode
    ? '🚀 WebGPU initialized - using GPU compute for physics'
    : '⚠️ Using WebGL fallback - CPU physics'
  );

  viewport.appendChild(engine.getCanvas());
  engine.start();
}

// Setup event listeners
function setupEventListeners(): void {
  // Collapsible sections
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', () => {
      const sectionName = (header as HTMLElement).dataset.section!;
      const content = document.getElementById(`section-${sectionName}`)!;
      header.classList.toggle('collapsed');
      content.classList.toggle('collapsed');
    });
  });

  // Collapsible subsections
  document.querySelectorAll('.subsection-header').forEach(header => {
    header.addEventListener('click', () => {
      const subsectionName = (header as HTMLElement).dataset.subsection!;
      const content = document.getElementById(`subsection-${subsectionName}`)!;
      header.classList.toggle('collapsed');
      content.classList.toggle('collapsed');
    });
  });

  // Playback controls
  const playPauseBtn = document.getElementById('btn-playpause')!;
  playPauseBtn.addEventListener('click', () => {
    if (engine.isRunning()) {
      engine.stop();
      playPauseBtn.textContent = '▶';
      playPauseBtn.title = 'Play';
    } else {
      engine.start();
      playPauseBtn.textContent = '⏸';
      playPauseBtn.title = 'Pause';
    }
  });

  document.getElementById('btn-reset')!.addEventListener('click', () => {
    engine.reset();
    engine.stop();
    playPauseBtn.textContent = '▶';
    playPauseBtn.title = 'Play';
  });

  // Aspect ratio buttons
  document.querySelectorAll('.aspect-ratio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLButtonElement;
      const ratio = target.dataset.ratio!;

      document.querySelectorAll('.aspect-ratio-btn').forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      stateStore.set('viewport.aspectRatio', ratio);
      resizeCanvas();
    });
  });

  // Orientation toggle
  document.querySelectorAll('.orientation-toggle button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLButtonElement;
      const orientation = target.dataset.orientation!;

      document.querySelectorAll('.orientation-toggle button').forEach(b => b.classList.remove('active'));
      target.classList.add('active');

      stateStore.set('viewport.orientation', orientation);
      resizeCanvas();
    });
  });

  // All sliders with input fields
  document.querySelectorAll('.slider-control input[type="range"]').forEach(slider => {
    const rangeInput = slider as HTMLInputElement;
    const stateKey = rangeInput.dataset.key!;
    const id = rangeInput.id.replace('slider-', '');
    const textInput = document.getElementById(`input-${id}`) as HTMLInputElement;

    // Range slider changes
    rangeInput.addEventListener('input', () => {
      const def = getParameterDef(stateKey);
      const isInteger = stateKey === 'particles.count';
      const value = isInteger ? parseInt(rangeInput.value) : parseFloat(rangeInput.value);
      textInput.value = formatValue(value, def?.step);
      stateStore.set(stateKey, value);
    });

    // Text input changes
    textInput.addEventListener('change', () => {
      const def = getParameterDef(stateKey);
      let value = parseFloat(textInput.value);

      // Clamp to min/max
      if (def?.min !== undefined) value = Math.max(def.min, value);
      if (def?.max !== undefined) value = Math.min(def.max, value);

      if (stateKey === 'particles.count') value = Math.round(value);

      textInput.value = formatValue(value, def?.step);
      rangeInput.value = value.toString();
      stateStore.set(stateKey, value);
    });

    // Select all on focus for easy typing
    textInput.addEventListener('focus', () => textInput.select());
  });

  // Enum selectors
  document.querySelectorAll('.enum-selector').forEach(selector => {
    const stateKey = (selector as HTMLElement).dataset.key!;

    selector.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = (btn as HTMLElement).dataset.value!;

        selector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        stateStore.set(stateKey, value);
      });
    });
  });

  // Color picker
  document.getElementById('input-color')!.addEventListener('input', (e) => {
    stateStore.set('particles.color', (e.target as HTMLInputElement).value);
  });

  // Screenshot
  document.getElementById('btn-screenshot')!.addEventListener('click', takeScreenshot);

  // Preset controls
  setupPresetControls();

  // Window resize
  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  // Stats update
  eventBus.subscribe(EventTypes.ENGINE_FRAME, (info: { time: number; deltaTime: number; frameCount: number }) => {
    updateStats(info);
  });
}

// Format value based on step precision
function formatValue(value: number, step?: number): string {
  if (step === undefined) return value.toString();
  if (step >= 1) return Math.round(value).toString();

  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return value.toFixed(decimals);
}

function resizeCanvas(): void {
  const { width, height } = calculateCanvasSize();
  engine.resize(width, height);
}

// FPS calculation
let lastFpsUpdate = 0;
let framesSinceLastUpdate = 0;
let currentFps = 0;

function updateStats(info: { time: number; deltaTime: number; frameCount: number }): void {
  framesSinceLastUpdate++;

  const now = performance.now();
  if (now - lastFpsUpdate >= 1000) {
    currentFps = framesSinceLastUpdate;
    framesSinceLastUpdate = 0;
    lastFpsUpdate = now;
  }

  document.getElementById('stat-fps')!.textContent = currentFps.toString();
  document.getElementById('stat-particles')!.textContent = stateStore.get<number>('particles.count').toString();
  document.getElementById('stat-time')!.textContent = info.time.toFixed(2) + 's';
}

function takeScreenshot(): void {
  const wasRunning = engine.isRunning();
  if (wasRunning) engine.stop();

  engine.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `particle-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }
    if (wasRunning) engine.start();
  });
}

// Setup preset import/export controls
function setupPresetControls(): void {
  const importInput = document.getElementById('import-file') as HTMLInputElement;

  // Export button
  document.getElementById('btn-export')!.addEventListener('click', () => {
    const name = prompt('Preset name:', 'My Preset') || 'Untitled';
    const json = stateStore.exportSettings(name);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `murmurator-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import button
  document.getElementById('btn-import')!.addEventListener('click', () => {
    importInput.click();
  });

  // File input change handler
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const error = stateStore.importSettings(reader.result as string);
      if (error) {
        alert(`Import failed: ${error}`);
      } else {
        updateUIFromState();
        engine.reset(); // Clear canvas and respawn particles
      }
    };
    reader.readAsText(file);
    importInput.value = ''; // Reset for next import
  });

  // Defaults button
  document.getElementById('btn-defaults')!.addEventListener('click', () => {
    if (confirm('Reset all parameters to defaults?')) {
      stateStore.resetToDefaults();
      updateUIFromState();
      engine.reset(); // Clear canvas and respawn particles
    }
  });

  // Built-in preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetName = (btn as HTMLElement).dataset.preset!;
      const preset = PRESETS.find(p => p.name === presetName);
      if (preset) {
        for (const [key, value] of Object.entries(preset.settings)) {
          stateStore.set(key, value);
        }
        updateUIFromState();
        engine.reset(); // Clear canvas and respawn particles
      }
    });
  });
}

// Update all UI controls to match current state
function updateUIFromState(): void {
  // Update sliders and their input fields
  document.querySelectorAll('.slider-control input[type="range"]').forEach(slider => {
    const rangeInput = slider as HTMLInputElement;
    const stateKey = rangeInput.dataset.key!;
    const id = rangeInput.id.replace('slider-', '');
    const textInput = document.getElementById(`input-${id}`) as HTMLInputElement;
    const def = getParameterDef(stateKey);

    const value = stateStore.get(stateKey);
    rangeInput.value = String(value);
    textInput.value = formatValue(value as number, def?.step);
  });

  // Update enum selectors
  document.querySelectorAll('.enum-selector').forEach(selector => {
    const stateKey = (selector as HTMLElement).dataset.key!;
    const currentValue = stateStore.get(stateKey);

    selector.querySelectorAll('button').forEach(btn => {
      const btnValue = (btn as HTMLElement).dataset.value!;
      btn.classList.toggle('active', btnValue === currentValue);
    });
  });

  // Update color picker
  const colorInput = document.getElementById('input-color') as HTMLInputElement;
  if (colorInput) {
    colorInput.value = stateStore.get<string>('particles.color');
  }
}

// Initialize
async function init(): Promise<void> {
  createUI();
  await initEngine();
  setupEventListeners();

  // Expose debugging API
  const consoleApi = new ConsoleAPI(engine!, stateStore, eventBus);
  (window as any).murmurator = consoleApi;

  // Initial stats
  document.getElementById('stat-particles')!.textContent = stateStore.get<number>('particles.count').toString();

  // Set initial play/pause button state (engine starts running)
  document.getElementById('btn-playpause')!.textContent = '⏸';
  document.getElementById('btn-playpause')!.title = 'Pause';
}

// Run initialization
init().catch((error) => {
  console.error('Failed to initialize:', error);

  // Show error message to user
  const viewport = document.getElementById('viewport');
  if (viewport) {
    viewport.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: #ef4444;
        text-align: center;
        padding: 20px;
      ">
        <h2 style="margin-bottom: 10px;">Initialization Error</h2>
        <p style="color: #94a3b8; max-width: 400px;">
          ${error.message || 'Failed to initialize the particle engine.'}
        </p>
        <p style="color: #64748b; font-size: 0.875rem; margin-top: 20px;">
          ${getWebGPUSupportMessage()}
        </p>
      </div>
    `;
  }
});

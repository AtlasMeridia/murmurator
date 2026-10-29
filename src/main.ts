// Murmurator - Main Entry Point

import './ui/styles/colors_and_type.css';
import './ui/styles/main.css';
import { ParticleEngine } from './core/engine/ParticleEngine.ts';
import { stateStore } from './core/state/StateStore.ts';
import { eventBus } from './core/events/EventBus.ts';
import { EventTypes } from './core/events/EventTypes.ts';
import { parseAspectRatio } from './utils/math.ts';
import { getParameterDef } from './core/state/Parameters.ts';
import { ConsoleAPI } from './api/ConsoleAPI.ts';
import { isWebGPUSupported, isSecureContext, getWebGPUSupportMessage } from './core/engine/webgpu/index.ts';
import { PRESETS, resolvePreset } from './core/state/presets.ts';
import { icon } from './ui/icons.ts';

// Space kept around the canvas inside the viewport (px, both sides combined)
const CANVAS_MARGIN = 48;
// How often the Info readout repaints (ms)
const STATS_INTERVAL = 250;

let engine: ParticleEngine;

const app = document.getElementById('app')!;

// ─── Markup helpers ───────────────────────────────────────────

function section(id: string, title: string, body: string, collapsed = false): string {
  const state = collapsed ? ' collapsed' : '';
  return `
    <div class="panel-section">
      <button type="button" class="section-header${state}" data-section="${id}" aria-expanded="${!collapsed}">
        <span>${title}</span>${icon('chevron')}
      </button>
      <div class="section-content${state}" id="section-${id}">
        <div class="collapse-inner"><div class="section-body">${body}</div></div>
      </div>
    </div>
  `;
}

function subsection(id: string, title: string, body: string): string {
  return `
    <div class="subsection">
      <button type="button" class="subsection-header collapsed" data-subsection="${id}" aria-expanded="false">
        <span>${title}</span>${icon('chevron')}
      </button>
      <div class="subsection-content collapsed" id="subsection-${id}">
        <div class="collapse-inner">${body}</div>
      </div>
    </div>
  `;
}

function createSlider(id: string, stateKey: string, label: string): string {
  const def = getParameterDef(stateKey);
  const value = stateStore.get(stateKey);
  const min = def?.min ?? 0;
  const max = def?.max ?? 100;
  const step = def?.step ?? 1;

  return `
    <div class="slider-control">
      <label for="slider-${id}">
        <span>${label}</span>
        <input type="text" inputmode="decimal" class="value-input" id="input-${id}" value="${value}" data-key="${stateKey}" aria-label="${label}">
      </label>
      <input type="range" id="slider-${id}" min="${min}" max="${max}" step="${step}" value="${value}" data-key="${stateKey}">
    </div>
  `;
}

function createSegmented(stateKey: string, options: string[], labels: string[] = options): string {
  const current = stateStore.get(stateKey);
  const buttons = options.map((opt, i) =>
    `<button type="button" data-value="${opt}" class="${opt === current ? 'active' : ''}">${labels[i]}</button>`
  ).join('');
  return `<div class="segmented" data-key="${stateKey}">${buttons}</div>`;
}

function createEnumField(stateKey: string, label: string, options: string[]): string {
  return `
    <div class="field">
      <span class="field-label">${label}</span>
      ${createSegmented(stateKey, options)}
    </div>
  `;
}

function createUI(): void {
  const viewport = `
    ${createSegmented('viewport.aspectRatio', ['1:1', '4:5', '5:8', '2:3', '9:16'])}
    ${createSegmented('viewport.orientation', ['landscape', 'portrait'])}
  `;

  const info = `
    <div class="stats">
      <div class="stats-row"><span>FPS</span><span id="stat-fps">0</span></div>
      <div class="stats-row"><span>Particles</span><span id="stat-particles">0</span></div>
      <div class="stats-row"><span>Time</span><span id="stat-time">0.00s</span></div>
      <div class="stats-row"><span>Mode</span><span id="stat-mode">Loading</span></div>
    </div>
  `;

  const particles = `
    ${createSlider('count', 'particles.count', 'Count')}
    ${createSlider('size', 'particles.size', 'Size')}
    <div class="param-row">
      <label for="input-color">Color</label>
      <input type="color" id="input-color" value="${stateStore.get('particles.color')}">
    </div>
    ${createSlider('opacity', 'particles.opacity', 'Opacity')}
    ${subsection('particles-advanced', 'Advanced', `
      ${createSlider('sizeVariation', 'particles.sizeVariation', 'Size variation')}
      ${createSlider('lifetime', 'particles.lifetime', 'Lifetime (s)')}
      ${createSlider('initialSpeed', 'particles.initialSpeed', 'Initial speed')}
      ${createEnumField('particles.spawnMode', 'Spawn mode', ['random', 'center', 'edges', 'grid'])}
      ${createEnumField('particles.shape', 'Shape', ['circle', 'square', 'triangle', 'ring'])}
    `)}
  `;

  const physics = `
    ${createSlider('noise', 'physics.noise.strength', 'Noise strength')}
    ${createSlider('tracers', 'rendering.tracers', 'Tracers')}
    ${createSlider('speed', 'simulation.speed', 'Speed')}
    ${subsection('physics-advanced', 'Advanced', `
      ${createSlider('noiseScale', 'physics.noise.scale', 'Noise scale')}
      ${createSlider('noiseEvolution', 'physics.noise.speed', 'Noise evolution')}
      ${createSlider('gravityX', 'physics.force.x', 'Gravity X')}
      ${createSlider('gravityY', 'physics.force.y', 'Gravity Y')}
      ${createSlider('maxVelocity', 'physics.maxVelocity', 'Max velocity')}
      ${createSlider('turbulence', 'physics.turbulence', 'Turbulence')}
      ${createSlider('attraction', 'physics.attractor.strength', 'Attraction')}
      ${createEnumField('simulation.bounds', 'Bounds', ['wrap', 'bounce', 'none'])}
      ${createSlider('damping', 'physics.damping', 'Damping')}
    `)}
  `;

  const presets = `
    <div class="preset-actions">
      <button type="button" class="btn" id="btn-export">Export</button>
      <button type="button" class="btn" id="btn-import">Import</button>
      <button type="button" class="btn" id="btn-defaults">Defaults</button>
      <input type="file" id="import-file" accept=".json" hidden>
    </div>
    <div class="preset-list">
      ${PRESETS.map(p => `<button type="button" class="btn preset-btn" data-preset="${p.name}" title="${p.description}">${p.name}</button>`).join('')}
    </div>
  `;

  app.innerHTML = `
    <div class="viewport" id="viewport"></div>
    <div class="control-panel mn-chrome">
      <div class="panel-head">
        <div class="panel-head-row">
          <span class="wordmark">Murmurator</span>
          <span class="run-state" id="run-state">Paused</span>
        </div>
        <div class="playback-controls">
          <button type="button" class="btn btn-icon" id="btn-playpause" title="Play" aria-label="Play">${icon('play')}</button>
          <button type="button" class="btn btn-icon" id="btn-reset" title="Reset" aria-label="Reset">${icon('reset')}</button>
          <button type="button" class="btn btn-icon" id="btn-screenshot" title="Download PNG" aria-label="Download PNG">${icon('download')}</button>
        </div>
      </div>
      ${section('info', 'Info', info, true)}
      ${section('viewport', 'Viewport', viewport)}
      ${section('particles', 'Particles', particles)}
      ${section('physics', 'Physics', physics)}
      ${section('presets', 'Presets', presets, true)}
    </div>
  `;
}

// ─── Canvas sizing ────────────────────────────────────────────

// Fit the configured aspect ratio inside the viewport
function calculateCanvasSize(): { width: number; height: number } {
  const viewport = document.getElementById('viewport')!;
  const availableWidth = viewport.clientWidth - CANVAS_MARGIN;
  const availableHeight = viewport.clientHeight - CANVAS_MARGIN;

  let ratio = parseAspectRatio(stateStore.get<string>('viewport.aspectRatio'));
  // Ratios like 9:16, 2:3 are portrait by default (width < height)
  if (stateStore.get<string>('viewport.orientation') === 'landscape') {
    ratio = 1 / ratio;
  }

  const heightBound = availableWidth / availableHeight > ratio;
  const width = heightBound ? availableHeight * ratio : availableWidth;
  const height = heightBound ? availableHeight : availableWidth / ratio;

  return { width: Math.floor(width), height: Math.floor(height) };
}

function resizeCanvas(): void {
  const { width, height } = calculateCanvasSize();
  engine.resize(width, height);
}

// ─── Engine ───────────────────────────────────────────────────

async function initEngine(): Promise<void> {
  console.log(`WebGPU API present: ${isWebGPUSupported()}, Secure context: ${isSecureContext()}`);

  engine = new ParticleEngine(stateStore, calculateCanvasSize());

  // Wait for async initialization (WebGPU with fallback)
  await engine.ready();

  const gpu = engine.isWebGPUMode();
  const modeSpan = document.getElementById('stat-mode')!;
  modeSpan.textContent = gpu ? 'WebGPU' : 'WebGL';
  modeSpan.className = gpu ? 'mode-gpu' : 'mode-cpu';
  console.log(gpu ? 'WebGPU initialized: GPU compute physics' : 'WebGL fallback: CPU physics');

  document.getElementById('viewport')!.appendChild(engine.getCanvas());
  engine.start();
}

// Reflect engine run state in the panel head
function syncPlayState(): void {
  const running = engine.isRunning();
  const btn = document.getElementById('btn-playpause')!;
  const label = running ? 'Pause' : 'Play';
  btn.innerHTML = icon(running ? 'pause' : 'play');
  btn.title = label;
  btn.setAttribute('aria-label', label);

  const runState = document.getElementById('run-state')!;
  runState.textContent = running ? 'Running' : 'Paused';
  runState.classList.toggle('running', running);
}

// ─── Event wiring ─────────────────────────────────────────────

function toggleCollapse(header: HTMLElement, content: HTMLElement): void {
  const collapsed = header.classList.toggle('collapsed');
  content.classList.toggle('collapsed', collapsed);
  header.setAttribute('aria-expanded', String(!collapsed));
}

function setupEventListeners(): void {
  document.querySelectorAll<HTMLElement>('.section-header').forEach(header => {
    header.addEventListener('click', () =>
      toggleCollapse(header, document.getElementById(`section-${header.dataset.section}`)!));
  });

  document.querySelectorAll<HTMLElement>('.subsection-header').forEach(header => {
    header.addEventListener('click', () =>
      toggleCollapse(header, document.getElementById(`subsection-${header.dataset.subsection}`)!));
  });

  // Playback
  document.getElementById('btn-playpause')!.addEventListener('click', () => {
    if (engine.isRunning()) engine.stop();
    else engine.start();
  });

  document.getElementById('btn-reset')!.addEventListener('click', () => {
    engine.reset();
    engine.stop();
  });

  document.getElementById('btn-screenshot')!.addEventListener('click', takeScreenshot);

  // Engine state can also change from the console API
  eventBus.subscribe(EventTypes.ENGINE_STATE, syncPlayState);

  // Sliders with paired text inputs
  document.querySelectorAll<HTMLInputElement>('.slider-control input[type="range"]').forEach(rangeInput => {
    const stateKey = rangeInput.dataset.key!;
    const textInput = document.getElementById(rangeInput.id.replace('slider-', 'input-')) as HTMLInputElement;
    const def = getParameterDef(stateKey);
    const isInteger = stateKey === 'particles.count';

    rangeInput.addEventListener('input', () => {
      const value = isInteger ? parseInt(rangeInput.value) : parseFloat(rangeInput.value);
      textInput.value = formatValue(value, def?.step);
      stateStore.set(stateKey, value);
    });

    textInput.addEventListener('change', () => {
      let value = parseFloat(textInput.value);
      if (Number.isNaN(value)) value = stateStore.get<number>(stateKey);
      if (def?.min !== undefined) value = Math.max(def.min, value);
      if (def?.max !== undefined) value = Math.min(def.max, value);
      if (isInteger) value = Math.round(value);

      textInput.value = formatValue(value, def?.step);
      rangeInput.value = value.toString();
      stateStore.set(stateKey, value);
    });

    textInput.addEventListener('focus', () => textInput.select());
  });

  // Segmented controls (enums, aspect ratio, orientation)
  document.querySelectorAll<HTMLElement>('.segmented').forEach(group => {
    group.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-value]');
      if (btn) stateStore.set(group.dataset.key!, btn.dataset.value!);
    });
  });

  // Keep segmented controls and canvas in sync with state from any source
  // (UI, presets, import, console API)
  stateStore.subscribeAll((key, value) => {
    document.querySelectorAll<HTMLElement>(`.segmented[data-key="${key}"] button`).forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  });
  stateStore.subscribe('viewport.aspectRatio', resizeCanvas);
  stateStore.subscribe('viewport.orientation', resizeCanvas);

  document.getElementById('input-color')!.addEventListener('input', (e) => {
    stateStore.set('particles.color', (e.target as HTMLInputElement).value);
  });

  setupPresetControls();

  window.addEventListener('resize', resizeCanvas);

  setupStats();
}

// Format value based on step precision
function formatValue(value: number, step?: number): string {
  if (step === undefined) return value.toString();
  if (step >= 1) return Math.round(value).toString();

  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  return value.toFixed(decimals);
}

// ─── Info readout ─────────────────────────────────────────────

function setupStats(): void {
  const fpsEl = document.getElementById('stat-fps')!;
  const timeEl = document.getElementById('stat-time')!;
  const particlesEl = document.getElementById('stat-particles')!;

  const showCount = () => { particlesEl.textContent = stateStore.get<number>('particles.count').toString(); };
  showCount();
  stateStore.subscribe('particles.count', showCount);

  let frames = 0;
  let windowStart = performance.now();
  let lastPaint = 0;

  eventBus.subscribe(EventTypes.ENGINE_FRAME, (info: { time: number }) => {
    frames++;
    const now = performance.now();
    if (now - windowStart >= 1000) {
      fpsEl.textContent = Math.round(frames * 1000 / (now - windowStart)).toString();
      frames = 0;
      windowStart = now;
    }
    if (now - lastPaint >= STATS_INTERVAL) {
      timeEl.textContent = info.time.toFixed(2) + 's';
      lastPaint = now;
    }
  });
}

// ─── Downloads & presets ──────────────────────────────────────

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function takeScreenshot(): void {
  const wasRunning = engine.isRunning();
  if (wasRunning) engine.stop();

  engine.toBlob((blob) => {
    if (blob) download(blob, `murmurator-${Date.now()}.png`);
    if (wasRunning) engine.start();
  });
}

function setupPresetControls(): void {
  const importInput = document.getElementById('import-file') as HTMLInputElement;

  document.getElementById('btn-export')!.addEventListener('click', () => {
    const name = prompt('Preset name:', 'My preset') || 'Untitled';
    const json = stateStore.exportSettings(name);
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    download(new Blob([json], { type: 'application/json' }), `murmurator-${slug}-${Date.now()}.json`);
  });

  document.getElementById('btn-import')!.addEventListener('click', () => importInput.click());

  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = ''; // Allow re-importing the same file
    if (!file) return;

    const error = stateStore.importSettings(await file.text());
    if (error) {
      alert(`Import failed: ${error}`);
    } else {
      applyStateChange();
    }
  });

  document.getElementById('btn-defaults')!.addEventListener('click', () => {
    if (confirm('Reset all parameters to defaults?')) {
      stateStore.resetToDefaults();
      applyStateChange();
    }
  });

  document.querySelectorAll<HTMLElement>('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = PRESETS.find(p => p.name === btn.dataset.preset);
      if (!preset) return;
      for (const [key, value] of Object.entries(resolvePreset(preset))) {
        stateStore.set(key, value);
      }
      applyStateChange();
    });
  });
}

// After a bulk state change: refresh inputs, clear canvas, respawn particles
function applyStateChange(): void {
  updateUIFromState();
  engine.reset();
}

// Sync slider and color inputs to current state (segmented controls sync via subscription)
function updateUIFromState(): void {
  document.querySelectorAll<HTMLInputElement>('.slider-control input[type="range"]').forEach(rangeInput => {
    const stateKey = rangeInput.dataset.key!;
    const textInput = document.getElementById(rangeInput.id.replace('slider-', 'input-')) as HTMLInputElement;
    const value = stateStore.get<number>(stateKey);
    rangeInput.value = String(value);
    textInput.value = formatValue(value, getParameterDef(stateKey)?.step);
  });

  (document.getElementById('input-color') as HTMLInputElement).value = stateStore.get<string>('particles.color');
}

// ─── Boot ─────────────────────────────────────────────────────

function showInitError(error: unknown): void {
  const viewport = document.getElementById('viewport');
  if (!viewport) return;

  const panel = document.createElement('div');
  panel.className = 'init-error';
  const heading = document.createElement('h2');
  heading.textContent = 'Initialization error';
  const message = document.createElement('p');
  message.textContent = error instanceof Error ? error.message : 'Failed to initialize the particle engine.';
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = getWebGPUSupportMessage();
  panel.append(heading, message, hint);
  viewport.replaceChildren(panel);
}

async function init(): Promise<void> {
  createUI();
  await initEngine();
  setupEventListeners();
  syncPlayState();

  // Debugging API
  window.murmurator = new ConsoleAPI(engine, stateStore, eventBus);
}

init().catch((error) => {
  console.error('Failed to initialize:', error);
  showInitError(error);
});

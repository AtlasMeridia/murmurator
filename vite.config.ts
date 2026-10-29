import { defineConfig } from 'vite';

// `npm run dev` adds --host for LAN access; `npm run dev:local` stays on localhost.
export default defineConfig({
  server: {
    allowedHosts: ['.local'],
  },
  preview: {
    allowedHosts: ['.local'],
  },
  optimizeDeps: {
    // three/webgpu and three/tsl are only reached through dynamic imports. Pre-bundle
    // them with three up front so the dev server never re-optimizes mid-session and
    // briefly serves two three.js instances (which breaks WebGPU pipelines).
    include: ['three', 'three/webgpu', 'three/tsl'],
  },
  build: {
    // three.js core and its WebGPU/TSL build are each ~600 kB minified
    chunkSizeWarningLimit: 700,
  },
});

import { defineConfig } from 'vite';

// `npm run dev` adds --host for LAN access; `npm run dev:local` stays on localhost.
export default defineConfig({
  server: {
    allowedHosts: ['.local'],
  },
  preview: {
    allowedHosts: ['.local'],
  },
  build: {
    // three.js core and its WebGPU/TSL build are each ~600 kB minified
    chunkSizeWarningLimit: 700,
  },
});

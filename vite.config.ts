import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    allowedHosts: ['ellis-mbp', 'localhost'],
  },
});

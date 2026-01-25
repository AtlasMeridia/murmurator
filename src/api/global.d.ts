// Global type declarations for Murmurator console API

import type { ConsoleAPI } from './ConsoleAPI.ts';

declare global {
  interface Window {
    murmurator: ConsoleAPI;
  }
}

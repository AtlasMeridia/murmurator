// Event type constants for the pub/sub system

export const EventTypes = {
  // Control signals
  CONTROL_SIGNAL: 'control:signal',

  // Engine events
  ENGINE_FRAME: 'engine:frame',
  ENGINE_STATE: 'engine:state',
  ENGINE_RESIZE: 'engine:resize',

  // Export events
  EXPORT_SCREENSHOT: 'export:screenshot',
  EXPORT_VIDEO_START: 'export:video:start',
  EXPORT_VIDEO_STOP: 'export:video:stop',

  // UI events
  UI_PARAMETER_CHANGE: 'ui:parameter:change',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

// Inline stroke icons (Heroicons idiom: 24x24, 2px stroke, currentColor)

const paths = {
  play: '<path d="M6 4.5v15l13-7.5z" />',
  pause: '<path d="M8 5v14M16 5v14" />',
  reset: '<path d="M4 4v5h5" /><path d="M5.1 15a7.5 7.5 0 1 0 1.3-8.4L4 9" />',
  download: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5" /><path d="M4.5 19.5h15" />',
  chevron: '<path d="m6 9 6 6 6-6" />',
} as const;

export type IconName = keyof typeof paths;

export function icon(name: IconName): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${paths[name]}</svg>`;
}

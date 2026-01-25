// GPU-native noise functions using TSL
// Implements value noise for particle physics

import {
  Fn,
  float,
  vec2,
  vec3,
  floor,
  fract,
  sin,
  dot,
  mix,
} from 'three/tsl';

// Use 'any' for TSL node types since the exact types vary by Three.js version
type TSLNode = any;

/**
 * Hash function for pseudo-random values.
 * Takes a vec2 and returns a float in [0, 1].
 */
export const hash21 = /*#__PURE__*/ Fn(([p]: [TSLNode]) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(0.1031));
  const p3Shifted = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(p3Shifted.x.add(p3Shifted.y).mul(p3Shifted.z));
});

/**
 * Hash function for pseudo-random vec2.
 * Takes a vec2 and returns a vec2 in [0, 1].
 */
export const hash22 = /*#__PURE__*/ Fn(([p]: [TSLNode]) => {
  const p3 = fract(vec3(p.x, p.y, p.x).mul(vec3(0.1031, 0.1030, 0.0973)));
  const p3Shifted = p3.add(dot(p3, vec3(p3.y, p3.z, p3.x).add(33.33)));
  return fract(vec2(p3Shifted.x.add(p3Shifted.y), p3Shifted.x.add(p3Shifted.z)).mul(p3Shifted.z));
});

/**
 * Hash function using sin - simple and fast.
 */
export const hashSin = /*#__PURE__*/ Fn(([p]: [TSLNode]) => {
  return fract(sin(dot(p, vec2(127.1, 311.7))).mul(43758.5453));
});

/**
 * 2D value noise.
 * Returns a value in approximately [-1, 1].
 */
export const valueNoise2D = /*#__PURE__*/ Fn(([p]: [TSLNode]) => {
  const i = floor(p);
  const f = fract(p);

  // Smooth interpolation
  const u = f.mul(f).mul(float(3).sub(f.mul(2)));

  // Four corners
  const a = hash21(i);
  const b = hash21(i.add(vec2(1, 0)));
  const c = hash21(i.add(vec2(0, 1)));
  const d = hash21(i.add(vec2(1, 1)));

  // Bilinear interpolation
  const result = mix(mix(a, b, u.x), mix(c, d, u.x), u.y);

  // Remap from [0, 1] to [-1, 1]
  return result.mul(2).sub(1);
});

/**
 * 3D value noise (using xy + z as time).
 * Input: vec3(x, y, time)
 * Returns: float in approximately [-1, 1]
 */
export const valueNoise3D = /*#__PURE__*/ Fn(([p]: [TSLNode]) => {
  const i = floor(p);
  const f = fract(p);

  // Smooth interpolation
  const u = f.mul(f).mul(float(3).sub(f.mul(2)));

  // Hash function for 3D
  const hash3 = Fn(([q]: [TSLNode]) => {
    return fract(sin(dot(q, vec3(127.1, 311.7, 74.7))).mul(43758.5453));
  });

  // Eight corners of the cube
  const n000 = hash3(i);
  const n100 = hash3(i.add(vec3(1, 0, 0)));
  const n010 = hash3(i.add(vec3(0, 1, 0)));
  const n110 = hash3(i.add(vec3(1, 1, 0)));
  const n001 = hash3(i.add(vec3(0, 0, 1)));
  const n101 = hash3(i.add(vec3(1, 0, 1)));
  const n011 = hash3(i.add(vec3(0, 1, 1)));
  const n111 = hash3(i.add(vec3(1, 1, 1)));

  // Trilinear interpolation
  const nx00 = mix(n000, n100, u.x);
  const nx10 = mix(n010, n110, u.x);
  const nx01 = mix(n001, n101, u.x);
  const nx11 = mix(n011, n111, u.x);

  const nxy0 = mix(nx00, nx10, u.y);
  const nxy1 = mix(nx01, nx11, u.y);

  const result = mix(nxy0, nxy1, u.z);

  // Remap from [0, 1] to [-1, 1]
  return result.mul(2).sub(1);
});

/**
 * Simple flow field noise - returns a vec2 direction.
 * Uses two offset noise samples for x and y components.
 */
export const flowNoise2D = /*#__PURE__*/ Fn(([p, time]: [TSLNode, TSLNode]) => {
  const p3x = vec3(p.x, p.y, time);
  const p3y = vec3(p.x.add(100), p.y.add(100), time);

  const nx = valueNoise3D(p3x);
  const ny = valueNoise3D(p3y);

  return vec2(nx, ny);
});

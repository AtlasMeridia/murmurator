// Seeded random number generator for reproducible results

export class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  // Mulberry32 PRNG - fast and good quality
  next(): number {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Random in range [min, max)
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Random integer in range [min, max]
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Random sign (-1 or 1)
  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }

  // Reset to original seed
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.seed = seed;
    }
  }

  getSeed(): number {
    return this.seed;
  }
}

// Global random instance
export const random = new SeededRandom();

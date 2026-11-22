// Every render path, including legacy saves and shared links, uses these bounds.
export const LANDING_FRONT_Z = 0.27;
export const BOAT_RADIUS = 1.05;
export const CHANNEL_START_Z = 2.05;
export const LAUNCH_SITE = { x: -0.8, z: CHANNEL_START_Z };

export function riverLane(savedY: number, mobile: boolean): number {
  const depth = Math.max(0, Math.min(1, (savedY - 0.45) / 0.37));
  return mobile ? 0.6 + depth * 0.15 : 0.62 + depth * 0.22;
}
export function keepInChannel<T extends { z: number }>(point: T): T {
  point.z = Math.max(CHANNEL_START_Z, point.z);
  return point;
}

// Render-only layout: never rewrite saved coordinates, wishes or profile data.
// Sorting by a stable ID hash makes the same collection independent of API order.
export function spreadBoats(ids: readonly string[]) {
  const hash = (id: string) => {
    let value = 2166136261;
    for (const char of id) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return value >>> 0;
  };
  const sorted = [...new Set(ids)].sort((a, b) => hash(a) - hash(b) || a.localeCompare(b));
  const result = new Map<string, { x: number; y: number }>();
  for (const id of sorted) {
    // Seeded best-candidate sampling gives organic spacing without rows/columns.
    // Stable IDs keep the same collection stationary across reloads and polling.
    let seed = hash(id);
    const random = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    let best = { x: 0.5, y: 0.6 }, bestSpace = -1;
    for (let attempt = 0; attempt < 128; attempt++) {
      const candidate = { x: 0.12 + random() * 0.76, y: 0.45 + random() * 0.35 };
      let space = Infinity;
      for (const placed of result.values()) {
        // Account for the river's wide, shallow projection when separating boats.
        const dx = (candidate.x - placed.x) / 0.13;
        const dy = (candidate.y - placed.y) / 0.09;
        space = Math.min(space, dx * dx + dy * dy);
      }
      if (space > bestSpace) { best = candidate; bestSpace = space; }
    }
    result.set(id, best);
  }
  return result;
}

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
  sorted.forEach((id, i) => {
    // A coprime stride distributes adjacent slots across both axes.
    const slot = (Math.floor(i * 30 / Math.max(1, sorted.length)) * 7) % 30;
    result.set(id, { x: 0.12 + (slot % 6) * 0.152, y: 0.45 + Math.floor(slot / 6) * 0.0875 });
  });
  return result;
}

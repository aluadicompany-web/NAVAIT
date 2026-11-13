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

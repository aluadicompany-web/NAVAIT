export const ROOM = { minX: -4.6, maxX: 4.6, minZ: -3.2, maxZ: 6 };
export type HallPresence = {
  id: string;
  krathongId: string;
  x: number;
  z: number;
  praying: boolean;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function roomPoint(x: number, z: number) {
  return {
    x: Math.max(ROOM.minX, Math.min(ROOM.maxX, x)),
    z: Math.max(ROOM.minZ, Math.min(ROOM.maxZ, z)),
  };
}
export function parsePresence(value: unknown): HallPresence | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    !uuid.test(v.id) ||
    typeof v.krathongId !== "string" ||
    !uuid.test(v.krathongId) ||
    typeof v.x !== "number" ||
    !Number.isFinite(v.x) ||
    typeof v.z !== "number" ||
    !Number.isFinite(v.z) ||
    typeof v.praying !== "boolean"
  )
    return null;
  return {
    id: v.id,
    krathongId: v.krathongId,
    ...roomPoint(v.x, v.z),
    praying: v.praying,
  };
}
export function moveToward(
  position: { x: number; z: number },
  target: { x: number; z: number },
  distance: number,
) {
  const dx = target.x - position.x,
    dz = target.z - position.z,
    length = Math.hypot(dx, dz);
  if (length < 0.001) return { ...position, moving: false, yaw: 0 };
  const step = Math.min(length, Math.max(0, distance));
  return {
    ...roomPoint(
      position.x + (dx / length) * step,
      position.z + (dz / length) * step,
    ),
    moving: step > 0.001,
    yaw: Math.atan2(dx, dz),
  };
}

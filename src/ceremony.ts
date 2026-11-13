export type EntrySide = -1 | 1;
export type CeremonyPhase =
  "approach" | "pier" | "lower" | "released" | "depart" | "done";
export const RELEASE_AT = 6.6;
export const CEREMONY_END = 9.6;
const ease = (x: number) => {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
};
export function ceremonyPose(
  elapsed: number,
  side: EntrySide,
  reduced = false,
) {
  const t = Math.max(0, elapsed),
    releaseAt = reduced ? 0.15 : RELEASE_AT;
  let phase: CeremonyPhase = "approach",
    x = side * 7.8,
    z = -3.55,
    yaw = (-side * Math.PI) / 2,
    stride = 0,
    bend = 0;
  if (reduced) {
    phase = t < releaseAt ? "lower" : t < 0.8 ? "released" : "done";
    x = -0.8;
    z = -0.12;
    yaw = 0;
    bend = t < 0.8 ? 0.8 : 0;
  } else if (t < 2.8) {
    const p = ease(t / 2.8);
    x = side * 7.8 + (-0.8 - side * 7.8) * p;
    stride = Math.sin(t * 10) * 0.48;
  } else if (t < 5) {
    phase = "pier";
    x = -0.8;
    z = -3.55 + 3.43 * ease((t - 2.8) / 2.2);
    yaw = ((-side * Math.PI) / 2) * (1 - ease((t - 2.8) / 0.35));
    stride = Math.sin(t * 10) * 0.4;
  } else if (t < RELEASE_AT) {
    phase = "lower";
    x = -0.8;
    z = -0.12;
    yaw = 0;
    bend = ease((t - 5) / 1.6);
  } else if (t < 7.3) {
    phase = "released";
    x = -0.8;
    z = -0.12;
    yaw = 0;
    bend = 1 - ease((t - RELEASE_AT) / 0.7);
  } else if (t < CEREMONY_END) {
    phase = "depart";
    x = -0.8;
    z = -0.12 - 3.43 * ease((t - 7.3) / 2.3);
    yaw = Math.PI * ease((t - 7.3) / 0.4);
    stride = Math.sin(t * 10) * 0.35;
  } else {
    phase = "done";
    x = -0.8;
    z = -3.55;
    yaw = Math.PI;
  }
  const lowering = phase === "lower" ? bend : phase === "released" ? 1 : 0;
  return {
    phase,
    x,
    z,
    yaw,
    stride,
    bend,
    bob: stride ? Math.abs(Math.sin(t * 10)) * 0.025 : 0,
    carryY: 0.68 - lowering * 0.65,
    carryZ: 0.67 + lowering * 0.52,
    releaseAt,
  };
}
const palette = [
  0x74b9ab, 0xe9a0a7, 0x9ca9de, 0xe9bd77, 0xa4c789, 0xc5a0d8, 0x83bdd4,
  0xe5a075, 0xaba3d8, 0xdcb48d, 0x91c6ba, 0xe2a9c2, 0xc0ca81, 0x8ea8cc,
  0xe4b78c, 0xa7c0d2,
];
export class CostumePool {
  private available = [...palette];
  private used = new Set<number>();
  private random: () => number;
  constructor(
    random: () => number = () =>
      crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
  ) {
    this.random = random;
  }
  next() {
    let color: number;
    if (this.available.length) {
      const index = Math.floor(this.random() * this.available.length);
      color = this.available.splice(index, 1)[0];
    } else {
      color = Math.floor(this.random() * 0xffffff);
      while (this.used.has(color)) color = (color + 0x173b51) & 0xffffff;
    }
    this.used.add(color);
    return color;
  }
  side(): EntrySide {
    return this.random() < 0.5 ? -1 : 1;
  }
}

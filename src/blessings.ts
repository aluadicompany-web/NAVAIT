export const BLESSINGS = [
  "ขอให้ทุกวันมีเรื่องเล็ก ๆ ที่ทำให้ยิ้มได้เสมอ",
  "ขอให้ความเหนื่อยล้าค่อย ๆ จางไป และหัวใจได้พักอย่างอ่อนโยน",
  "ขอให้ได้พบรักที่จริงใจ และเป็นตัวเองได้อย่างสบายใจ",
  "ขอให้ความตั้งใจค่อย ๆ ผลิบานในเวลาที่เหมาะสม",
  "ขอให้ครอบครัวและคนที่รักมีความสุขและปลอดภัย",
  "ขอให้สุขภาพแข็งแรงทั้งกายและใจ",
  "ขอให้เรื่องหนักใจเบาลง และพบทางออกที่ดี",
  "ขอให้เส้นทางข้างหน้าเต็มไปด้วยโอกาสดี ๆ",
  "ขอให้มีความรักที่อบอุ่น คอยเข้าใจและดูแลกัน",
  "ขอให้ความรักที่มอบออกไป ได้รับความจริงใจกลับมา",
  "ขอให้คืนนี้เป็นจุดเริ่มต้นของความสบายใจบทใหม่",
  "ขอให้กล้าเริ่มต้นสิ่งที่ฝัน และใจดีกับตัวเองระหว่างทาง",
  "ขอให้มีมิตรภาพดี ๆ อยู่เคียงข้างในวันที่ต้องการใครสักคน",
  "ขอให้การงานราบรื่น และความพยายามนำไปสู่ความสำเร็จ",
  "ขอให้คนที่รักได้อยู่เคียงข้างกันด้วยความเข้าใจ",
  "ขอให้วันพรุ่งนี้มีความหวังใหม่ และเหตุผลดี ๆ ให้ก้าวต่อไป",
  "ขอให้หัวใจได้เยียวยาจากความรักที่ผ่านมา และพร้อมรับสิ่งดี ๆ",
  "ขอให้มีเวลาพัก มีเวลาฝัน และมีเวลาสำหรับคนสำคัญ",
  "ขอให้สิ่งดี ๆ ที่ไม่คาดคิด เข้ามาในเวลาที่พอดี",
  "ขอให้ได้รักตัวเองมากขึ้น และพบความสุขในแบบของตัวเอง",
] as const;
const format = (index: number) => BLESSINGS[index];
export class BlessingDeck {
  private remaining: number[] = [];
  private last: number | null = null;
  private random: () => number;
  constructor(saved: unknown = null, random: () => number = Math.random) {
    this.random = random;
    if (saved && typeof saved === "object") {
      const value = saved as { remaining?: unknown; last?: unknown };
      if (
        Array.isArray(value.remaining) &&
        value.remaining.every(
          (i) => Number.isInteger(i) && i >= 0 && i < BLESSINGS.length,
        ) &&
        new Set(value.remaining).size === value.remaining.length &&
        (value.last === null ||
          (Number.isInteger(value.last) &&
            Number(value.last) >= 0 &&
            Number(value.last) < BLESSINGS.length))
      ) {
        this.remaining = [...value.remaining];
        this.last = value.last as number | null;
      }
    }
  }
  draw() {
    if (!this.remaining.length) {
      this.remaining = BLESSINGS.map((_, i) => i);
      for (let i = this.remaining.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.remaining[i], this.remaining[j]] = [
          this.remaining[j],
          this.remaining[i],
        ];
      }
      if (this.remaining.at(-1) === this.last)
        [this.remaining[0], this.remaining[this.remaining.length - 1]] = [
          this.remaining[this.remaining.length - 1],
          this.remaining[0],
        ];
    }
    this.last = this.remaining.pop()!;
    return format(this.last);
  }
  snapshot() {
    return { remaining: [...this.remaining], last: this.last };
  }
}
let memory = new BlessingDeck();
export function drawBlessing() {
  try {
    const key = "navait.blessings.v1";
    const saved = localStorage.getItem(key);
    if (saved) memory = new BlessingDeck(JSON.parse(saved));
  } catch {
    /* The in-memory deck works when storage is unavailable. */
  }
  const wish = memory.draw();
  try {
    localStorage.setItem(
      "navait.blessings.v1",
      JSON.stringify(memory.snapshot()),
    );
  } catch {
    /* Saving the wish itself is handled by the normal persistence path. */
  }
  return wish;
}
export function resolveWish(input: string, draw: () => string = drawBlessing) {
  return input.trim().slice(0, 100) || draw();
}
/** Legacy blank records get a stable blessing without changing on each dialog open. */
export function blessingForId(id: string) {
  let hash = 0;
  for (const char of id)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return format(hash % BLESSINGS.length);
}

/** Hide the attribution on automatic wishes saved by the previous release. */
export function displayWish(wish: string, id: string) {
  return wish.trim().replace(/\n— คำอวยพรจาก NAVAIT$/, "") || blessingForId(id);
}

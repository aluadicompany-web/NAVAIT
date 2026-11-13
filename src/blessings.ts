export const BLESSINGS = [
  "ขอให้ทุกวันมีเรื่องเล็ก ๆ ที่ทำให้คุณยิ้มได้เสมอ",
  "ขอให้ความเหนื่อยล้าค่อย ๆ จางไป และหัวใจได้พักอย่างอ่อนโยน",
  "ขอให้คุณได้พบผู้คนที่เห็นคุณค่าและหวังดีกับคุณ",
  "ขอให้ความตั้งใจที่คุณดูแลมา ค่อย ๆ ผลิบานในเวลาที่เหมาะสม",
  "ขอให้บ้านและคนที่คุณรักเต็มไปด้วยความอบอุ่นและเสียงหัวเราะ",
  "ขอให้คุณมีสุขภาพแข็งแรง และมีพลังดูแลตัวเองในทุกวัน",
  "ขอให้เรื่องหนักใจเบาลง และมีทางออกที่อ่อนโยนรออยู่",
  "ขอให้เส้นทางข้างหน้าพาคุณไปพบโอกาสที่ดีและเหมาะกับใจ",
  "ขอให้คุณได้ภูมิใจกับก้าวเล็ก ๆ ของตัวเองในทุกวัน",
  "ขอให้ความรักที่คุณมอบออกไป กลับมาโอบกอดหัวใจของคุณ",
  "ขอให้คืนนี้เป็นจุดเริ่มต้นของความสบายใจบทใหม่",
  "ขอให้คุณกล้าเริ่มต้นสิ่งที่ฝัน และใจดีกับตัวเองระหว่างทาง",
  "ขอให้มีมิตรภาพดี ๆ อยู่เคียงข้างในวันที่ต้องการใครสักคน",
  "ขอให้การงานราบรื่น และทุกความพยายามได้รับการมองเห็น",
  "ขอให้คุณได้พบความสุขในจังหวะชีวิตที่เป็นของตัวเอง",
  "ขอให้วันพรุ่งนี้มีความหวังใหม่ และเหตุผลดี ๆ ให้ก้าวต่อไป",
  "ขอให้ความทรงจำที่สวยงามเติมความอบอุ่นให้ใจคุณเสมอ",
  "ขอให้คุณมีเวลาพัก มีเวลาฝัน และมีเวลาสำหรับคนสำคัญ",
  "ขอให้สิ่งดี ๆ ที่ไม่คาดคิด แวะมาทักทายคุณในเวลาที่พอดี",
  "ขอให้แสงเทียนเล็ก ๆ คืนนี้ เตือนว่าคุณคู่ควรกับความสุข",
] as const;
const signature = "\n— คำอวยพรจาก NAVAIT";
const format = (index: number) => BLESSINGS[index] + signature;
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

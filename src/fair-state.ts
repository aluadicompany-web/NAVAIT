export const FAIR_WIDTH = 3800;
export const FAIR_STOPS = [
    { x: 460, name: "ขนมไทยบ้านอุ่น", kind: "food", color: "#d88e83", detail: "ขนมครกหอม ๆ ทองหยิบ และลูกชุบสีสดใส แวะพักใจด้วยของหวานสักหน่อย" },
    { x: 1010, name: "ปาลูกโป่ง", kind: "balloons", color: "#779fa6", detail: "เล็งลูกโป่งแล้วแตะเพื่อปา มีลูกดอกให้ 5 ครั้ง เล่นใหม่ได้เสมอ" },
    { x: 1550, name: "ครัวริมวัด", kind: "food", color: "#b39369", detail: "ผัดไทยร้อน ๆ กับลูกชิ้นปิ้ง ส่งกลิ่นหอมอยู่ข้างทาง" },
    { x: 2200, name: "ชิงช้าสวรรค์", kind: "wheel", color: "#e2b573", detail: "ขึ้นชมแสงไฟงานวัดจากกระเช้า แล้วลงมาเดินเล่นต่อได้ทุกเมื่อ" },
    { x: 2860, name: "สอยดาวรับพร", kind: "stars", color: "#a28cb7", detail: "เลือกดาวดวงหนึ่ง รับข้อความเล็ก ๆ ไว้เป็นกำลังใจคืนนี้" },
    { x: 3390, name: "น้ำหวาน & สายไหม", kind: "food", color: "#83b7a1", detail: "น้ำหวานเย็น ๆ และสายไหมปุยเมฆ ร้านสุดท้ายก่อนเดินกลับท่าน้ำ" },
] as const;
export function walkFair(x: number, direction: number, dt: number) {
    return Math.max(100, Math.min(FAIR_WIDTH - 100, x + Math.max(-1, Math.min(1, direction)) * 230 * Math.max(0, Math.min(dt, 0.05))));
}
export function nearbyStop(x: number) {
    return FAIR_STOPS.findIndex(stop => Math.abs(stop.x - x) < 180);
}
export function fairCamera(x: number, visible: number) {
    return Math.max(0, Math.min(Math.max(0, FAIR_WIDTH - visible), x - visible / 2));
}
export class BalloonRound {
    hits = new Set<number>();
    throws = 0;
    throwAt(index: number) {
        if (this.throws >= 5 || this.hits.has(index) || index < 0 || index >= 12)
            return false;
        this.throws++;
        this.hits.add(index);
        return true;
    }
}

import { isLocalPhoto } from "./profile";
import { designs } from "./catalog";
export type Krathong = {
  id: string;
  name: string;
  wish: string;
  color: number;
  x: number;
  y: number;
  created: number;
  design?: number;
  photo?: string;
  avatarPath?: string;
};
const colors = [0xf0a6bf, 0xffd18b, 0xc1b4ef];
const key = "navait.krathongs.v1";
export function readKrathongs(): Krathong[] {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data)
      ? data
          .filter(
            (v): v is Krathong =>
              v !== null &&
              typeof v === "object" &&
              typeof v.id === "string" &&
              typeof v.name === "string" &&
              typeof v.wish === "string" &&
              Number.isFinite(v.color) &&
              Number.isFinite(v.x) &&
              Number.isFinite(v.y) &&
              Number.isFinite(v.created),
          )
          .slice(-30)
          .map((v) => ({
            ...v,
            photo: isLocalPhoto(v.photo) ? v.photo : undefined,
            design:
              Number.isInteger(v.design) &&
              v.design! >= 0 &&
              v.design! < designs.length
                ? v.design
                : ([1, 2, 4][colors.indexOf(v.color)] ?? 0),
          }))
      : [];
  } catch {
    return [];
  }
}
export const state = {
  krathongs: readKrathongs(),
  selected: 0,
  name: "",
  wish: "",
};
export function makeKrathong(
  name: string,
  wish: string,
  photo?: string,
): Krathong {
  const item = {
    id: crypto.randomUUID(),
    photo,
    name: name.trim().slice(0, 24),
    wish: wish.trim().slice(0, 100),
    color: designs[state.selected].color,
    design: state.selected,
    x: 0.18 + Math.random() * 0.64,
    y: 0.45 + Math.random() * 0.32,
    created: Date.now(),
  };
  return item;
}
export function saveLocal(item: Krathong) {
  const next = [...state.krathongs, item].slice(-30);
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    throw Error("พื้นที่เก็บข้อมูลบนเครื่องเต็ม กรุณาลบข้อมูลเก่าของเว็บหรือทดลองเบราว์เซอร์อื่น");
  }
  state.krathongs = next;
}

export type Krathong = { id: string; name: string; wish: string; color: number; x: number; y: number; created: number };
const key = 'navait.krathongs.v1';
export function readKrathongs(): Krathong[] {
  try { const data = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data.filter((v): v is Krathong => v !== null && typeof v === 'object' && typeof v.id === 'string' && typeof v.name === 'string' && typeof v.wish === 'string' && Number.isFinite(v.color) && Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.created)).slice(-30) : []; } catch { return []; }
}
export const state = { krathongs: readKrathongs(), selected: 0, name: '', wish: '' };
export const colors = [0xf0a6bf, 0xffd18b, 0xc1b4ef];
export function launch(name: string, wish: string): Krathong {
 const item = { id: crypto.randomUUID(), name: name.trim().slice(0,24), wish: wish.trim().slice(0,100), color: colors[state.selected], x: .18 + Math.random() * .64, y: .45 + Math.random() * .32, created: Date.now() };
 state.krathongs = [...state.krathongs, item].slice(-30);
 try { localStorage.setItem(key, JSON.stringify(state.krathongs)); } catch { /* Play remains available when storage is disabled. */ }
 return item;
}

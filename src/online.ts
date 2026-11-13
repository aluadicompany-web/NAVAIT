import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Krathong } from "./state";
import type { ProfilePhoto } from "./profile";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const onlineConfigured = Boolean(url && key);
let client: SupabaseClient | null = null;
function db() {
  if (!url || !key) throw Error("ยังไม่ได้ตั้งค่าแม่น้ำออนไลน์");
  return (client ??= createClient(url, key));
}
export function photoUrl(item: Krathong) {
  if (
    item.avatarPath &&
    url &&
    /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.jpg$/.test(item.avatarPath)
  )
    return `${url}/storage/v1/object/public/avatars/${item.avatarPath}`;
  return undefined;
}
export async function loadShared(): Promise<Krathong[]> {
  const { data, error } = await db()
    .from("krathongs")
    .select("id,name,wish,design,color,x,y,created_at,avatar_path")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data || [])
    .reverse()
    .map((row) => ({
      id: row.id,
      name: row.name,
      wish: row.wish,
      design: row.design,
      color: row.color,
      x: row.x,
      y: row.y,
      created: Date.parse(row.created_at),
      avatarPath: row.avatar_path || undefined,
    }));
}
export async function publish(
  item: Krathong,
  photo: ProfilePhoto | null,
): Promise<Krathong> {
  const api = db();
  const { data: sessionData, error: sessionError } =
    await api.auth.getSession();
  if (sessionError) throw sessionError;
  let user = sessionData.session?.user;
  if (!user) {
    const { data, error } = await api.auth.signInAnonymously();
    if (error) throw error;
    user = data.user ?? undefined;
  }
  if (!user) throw Error("เข้าเล่นออนไลน์ไม่สำเร็จ");
  let avatarPath: string | undefined;
  if (photo) {
    avatarPath = `${user.id}/${item.id}.jpg`;
    const { error } = await api.storage
      .from("avatars")
      .upload(avatarPath, photo.blob, {
        contentType: "image/jpeg",
        upsert: false,
        cacheControl: "86400",
      });
    if (error) throw error;
  }
  const { error } = await api
    .from("krathongs")
    .insert({
      id: item.id,
      owner_id: user.id,
      name: item.name,
      wish: item.wish,
      design: item.design ?? 0,
      color: item.color,
      x: item.x,
      y: item.y,
      avatar_path: avatarPath ?? null,
    });
  if (error) {
    if (avatarPath) await api.storage.from("avatars").remove([avatarPath]);
    throw error;
  }
  return { ...item, avatarPath, photo: undefined };
}
export function onlineError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : String((error as { message?: string })?.message || "");
  if (/anonymous|signups/i.test(message))
    return "เข้าเล่นออนไลน์ไม่ได้ กรุณาให้ผู้ดูแลเปิด Anonymous Sign-ins ใน Supabase";
  if (/daily limit/i.test(message))
    return "วันนี้ลอยครบ 10 กระทงแล้ว กลับมาลอยใหม่พรุ่งนี้นะ";
  if (/river full|avatar limit/i.test(message))
    return "พื้นที่แม่น้ำเต็มชั่วคราว กรุณาให้ผู้ดูแลจัดการข้อมูลเก่า";
  return "เชื่อมต่อแม่น้ำออนไลน์ไม่สำเร็จ กรุณาลองอีกครั้ง รูปและคำอธิษฐานยังอยู่ในฟอร์ม";
}

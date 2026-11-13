import { blessingForId } from "./blessings";
import { designs } from "./catalog";
import { River } from "./river";
import { state, makeKrathong, saveLocal, type Krathong } from "./state";
import { ProfilePicker, defaultAvatar, isLocalPhoto } from "./profile";
import {
  onlineConfigured,
  loadShared,
  loadSharedItem,
  publish,
  photoUrl,
  onlineError,
} from "./online";
import { Ambience } from "./ambience";
import { bindShare, isKrathongId } from "./sharing";
import "./style.css";
const shareControls = (id: string, label: string) =>
  `<div class="share-controls" id="${id}"><button type="button" class="share-button">${label}</button><input data-share-link aria-label="ลิงก์กระทงสำหรับแชร์" readonly hidden><p data-share-status role="status"></p></div>`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
 <main><div id="river" aria-label="แม่น้ำยามค่ำและกระทงของคุณ"></div>
 <header><a class="brand" href="./"><span class="brand-icon">✳</span> NAVAIT <span class="brand-divider"></span><span class="brand-thai">คืนลอยกระทง</span></a><span class="edition">ใต้แสงจันทร์ เราพบกัน</span><div class="header-actions"><button type="button" class="sound" id="sound-toggle" aria-pressed="false" aria-label="เปิดเสียงบรรยากาศ"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9c2 2 2 4 0 6m3-9c4 4 4 8 0 12"/></svg><span>เปิดเสียง</span></button><button class="sound" id="about" aria-label="เกี่ยวกับพื้นที่นี้">เกี่ยวกับ ↗</button></div></header><p id="audio-status" class="audio-status" role="status"></p>
 <section class="intro"><div class="eyebrow"><span></span> A LITTLE WISH, A LITTLE LIGHT</div><h1>ฝากคำอธิษฐาน<br>ให้สายน้ำพาไป<span> ✧</span></h1><p>คืนพระจันทร์เต็มดวง กระทงเล็ก ๆ และความหวังดีของคุณ<br>มาลอยความสุขไปด้วยกันนะ</p></section>
 <aside class="ritual" id="ritual"><div class="step">คืนพิเศษ เริ่มต้นที่คุณ <span>MAKE A WISH</span></div><h2>กระทงนี้…ของใครเอ่ย?</h2><p class="muted">ใส่ชื่อเล่น แล้วฝากคำอธิษฐานไว้กับสายน้ำ</p><form id="launch-form"><label for="name">ชื่อบนกระทง <span>*</span></label><input id="name" name="name" placeholder="ชื่อเล่นของคุณ" maxlength="24" required autocomplete="nickname"><div id="profile-picker"></div><label for="wish">คำอธิษฐาน <span class="optional">ไม่บังคับ</span></label><textarea id="wish" name="wish" placeholder="เขียนคำอธิษฐาน หรือเว้นว่างเพื่อรับคำอวยพรจากเรา" maxlength="100" rows="2"></textarea><fieldset><legend>เลือกกระทงของคุณ <span class="optional">9 แบบ · โมเดล 3D</span></legend><div class="choices">${designs.map((d, i) => `<button type="button" class="choice ${i === 0 ? "active" : ""}" data-design="${i}" aria-pressed="${i === 0}" title="${d.description}"><img alt="กระทง${d.name}" width="100" height="74"><span>${d.name}</span></button>`).join("")}</div><p id="design-description">${designs[0].description}</p></fieldset><button class="primary" type="submit">ลอยกระทงของฉัน <span>↗</span></button><p id="launch-status" role="status"></p><div class="privacy" id="connection-status"></div></form></aside>
 <p id="ceremony-status" class="ceremony-status" role="status" hidden></p><section class="after" id="after" hidden><span class="success-icon">✧</span><h2>คำอธิษฐานออกเดินทางแล้ว</h2><p>ขอให้ความสุขลอยกลับมาหาคุณนะ</p>${shareControls("share-mine", "แชร์กระทงของฉัน")}<button type="button" class="share-button" id="enter-temple">เข้าโบสถ์</button><button class="primary" id="again">ลอยอีกหนึ่งความปรารถนา ↗</button></section>
 <section id="shared-card" class="after shared-card" hidden><h2>คำอธิษฐานที่ส่งถึงคุณ</h2><p id="shared-message" role="status">กำลังตามหากระทง…</p><button type="button" id="retry-shared" class="share-button" hidden>ลองอีกครั้ง</button><button type="button" class="primary" id="join-river">ลอยกระทงของฉัน</button></section>
 <dialog id="wish-dialog"><button id="close-dialog" class="close" aria-label="ปิด">×</button><img id="dialog-avatar" class="dialog-avatar" alt="รูปโปรไฟล์" width="96" height="96" hidden><h2 id="dialog-name"></h2><p id="dialog-wish"></p>${shareControls("share-wish", "แชร์คำอธิษฐานนี้")}</dialog></main>`;
const ambience = new Ambience(
  document.querySelector<HTMLButtonElement>("#sound-toggle")!,
  document.querySelector<HTMLElement>("#audio-status")!,
);
let latestOwn: Krathong | null = null;
let currentWish: Krathong | null = null;
let pinned: Krathong | null = null;
const requestedId = new URL(location.href).searchParams.get("krathong");
const shareMine = document.querySelector<HTMLElement>("#share-mine")!;
const shareWish = document.querySelector<HTMLElement>("#share-wish")!;
shareMine.hidden = !onlineConfigured;
bindShare(shareMine.querySelector("button")!, () => latestOwn, shareMine);
bindShare(shareWish.querySelector("button")!, () => currentWish, shareWish);
const picker = new ProfilePicker(
  document.querySelector<HTMLElement>("#profile-picker")!,
);
const connection = document.querySelector<HTMLElement>("#connection-status")!;
connection.textContent = onlineConfigured
  ? "แม่น้ำร่วมกัน · ชื่อและรูปใช้แสดงกับผู้เล่นอื่น"
  : "ทดลองบนอุปกรณ์นี้ · ยังไม่ได้เชื่อมแม่น้ำออนไลน์";
let shared: Krathong[] = [];
let sharedRevision = 0;
let river: River | undefined;
try {
  river = new River(document.querySelector<HTMLElement>("#river")!);
} catch (error) {
  console.error(error);
  document
    .querySelector("#river")!
    .insertAdjacentHTML(
      "beforeend",
      '<p class="gpu-error" role="alert">เปิดฉาก 3D ไม่สำเร็จ กรุณาเปิด WebGL หรือทดลองใช้เบราว์เซอร์อื่น แล้วรีเฟรชหน้าเว็บ</p>',
    );
  document.querySelector<HTMLButtonElement>("button[type=submit]")!.disabled =
    true;
}
document
  .querySelectorAll<HTMLButtonElement>("[data-design]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      state.selected = Number(button.dataset.design);
      document.querySelector("#design-description")!.textContent =
        designs[state.selected].description;
      document.querySelectorAll("[data-design]").forEach((b) => {
        b.classList.toggle("active", b === button);
        b.setAttribute("aria-pressed", String(b === button));
      });
    }),
  );
document
  .querySelector<HTMLFormElement>("#launch-form")!
  .addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.querySelector<HTMLInputElement>("#name")!;
    if (!name.value.trim()) {
      name.setCustomValidity("กรุณาใส่ชื่อเล่นของคุณ");
      name.reportValidity();
      return;
    }
    name.setCustomValidity("");
    const button = document.querySelector<HTMLButtonElement>(
      "button[type=submit]",
    )!;
    const status = document.querySelector<HTMLElement>("#launch-status")!;
    if (button.disabled) return;
    button.disabled = true;
    status.textContent = onlineConfigured
      ? "กำลังฝากคำอธิษฐานไว้ในแม่น้ำ…"
      : "กำลังลอยกระทง…";
    try {
      let item = makeKrathong(
        name.value,
        document.querySelector<HTMLTextAreaElement>("#wish")!.value,
        picker.photo?.dataUrl,
      );
      if (onlineConfigured) {
        item = await publish(item, picker.photo);
        sharedRevision++;
        shared = [...shared, item].slice(-30);
      } else saveLocal(item);
      latestOwn = item;

      document.querySelector<HTMLElement>("#shared-card")!.hidden = true;
      shareMine.querySelector<HTMLElement>("[data-share-status]")!.textContent =
        "";
      shareMine.querySelector<HTMLInputElement>("[data-share-link]")!.hidden =
        true;
      document.querySelector("main")!.classList.add("playing");
      document.querySelector<HTMLElement>("#ritual")!.hidden = true;
      const ceremonyStatus =
        document.querySelector<HTMLElement>("#ceremony-status")!;
      document.querySelector<HTMLElement>("#after")!.hidden = true;
      ceremonyStatus.hidden = false;
      ceremonyStatus.textContent = "กำลังเดินถือกระทงไปที่ท่าน้ำ…";
      await river?.walkAndRelease(item, picker.photo?.dataUrl, () =>
        ambience.playLaunch(),
      );
      ceremonyStatus.hidden = true;
      document.querySelector<HTMLElement>("#after")!.hidden = false;
      status.textContent = "";
    } catch (error) {
      status.textContent = onlineConfigured
        ? onlineError(error)
        : error instanceof Error
          ? error.message
          : "บันทึกไม่สำเร็จ กรุณาลองใหม่";
    } finally {
      button.disabled = false;
    }
  });
document
  .querySelector<HTMLInputElement>("#name")!
  .addEventListener("input", (event) =>
    (event.target as HTMLInputElement).setCustomValidity(""),
  );
document.querySelector("#again")!.addEventListener("click", () => {
  document.querySelector("main")!.classList.remove("playing");
  document.querySelector<HTMLElement>("#ritual")!.hidden = false;
  document.querySelector<HTMLElement>("#after")!.hidden = true;
  document.querySelector<HTMLInputElement>("#name")!.focus();
});
const dialog = document.querySelector<HTMLDialogElement>("#wish-dialog")!;
window.addEventListener("wish", (event) => {
  const item = (event as CustomEvent<Krathong>).detail;
  currentWish = item;
  shareWish.hidden = !onlineConfigured || !isKrathongId(item.id);
  shareWish.querySelector<HTMLElement>("[data-share-status]")!.textContent = "";
  shareWish.querySelector<HTMLInputElement>("[data-share-link]")!.hidden = true;
  document.querySelector("#dialog-name")!.textContent =
    `คำอธิษฐานของ ${item.name}`;
  document.querySelector("#dialog-wish")!.textContent =
    item.wish.trim() || blessingForId(item.id);
  const avatar = document.querySelector<HTMLImageElement>("#dialog-avatar")!;
  avatar.hidden = false;
  avatar.alt = `รูปโปรไฟล์ของ ${item.name}`;
  avatar.onerror = () => {
    avatar.onerror = null;
    avatar.src = defaultAvatar(item.name);
  };
  avatar.src =
    photoUrl(item) ||
    (isLocalPhoto(item.photo) ? item.photo : defaultAvatar(item.name));
  dialog.showModal();
});
document.querySelector("#about")!.addEventListener("click", () => {
  shareWish.hidden = true;
  document.querySelector<HTMLImageElement>("#dialog-avatar")!.hidden = true;
  document.querySelector("#dialog-name")!.textContent = "คืนลอยกระทง · NAVAIT";
  document.querySelector("#dialog-wish")!.textContent = onlineConfigured
    ? "แม่น้ำลอยกระทงร่วมกัน คลิกชื่อเพื่ออ่านคำอธิษฐาน หลังลอยกระทงสามารถเลือกเข้าโบสถ์เพื่อเดินและนั่งสวดมนต์ร่วมกับผู้เล่นที่ออนไลน์อยู่"
    : "เข้าเล่นด้วยชื่อเล่นและรูปโปรไฟล์ ข้อมูลเก็บเฉพาะเบราว์เซอร์นี้ ยังไม่ได้เชื่อมแม่น้ำออนไลน์";
  dialog.showModal();
});
document
  .querySelector("#close-dialog")!
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

let refreshing = false;
async function refreshShared() {
  if (!onlineConfigured || refreshing || document.hidden) return;
  refreshing = true;
  const revision = sharedRevision;
  try {
    const items = await loadShared();
    if (revision !== sharedRevision) return;
    shared = items;
    river?.syncBoats(withPinned(items));
    connection.textContent = "แม่น้ำร่วมกัน · ชื่อและรูปใช้แสดงกับผู้เล่นอื่น";
  } catch (error) {
    connection.textContent = "แม่น้ำออนไลน์ขาดการเชื่อมต่อ · กำลังรอลองใหม่";
    console.warn("Shared river is unavailable", error);
  } finally {
    refreshing = false;
  }
}
if (onlineConfigured) {
  river?.syncBoats([]);
  void refreshShared();
  setInterval(() => void refreshShared(), 15000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void refreshShared();
  });
}

function withPinned(items: Krathong[]) {
  return pinned
    ? [...items.filter((i) => i.id !== pinned!.id).slice(-29), pinned]
    : items;
}
function joinRiver() {
  document.querySelector<HTMLElement>("#shared-card")!.hidden = true;
  document.querySelector<HTMLElement>("#after")!.hidden = true;
  document.querySelector<HTMLElement>("#ritual")!.hidden = false;
  document.querySelector("main")!.classList.remove("playing");
  const next = new URL(location.href);
  next.searchParams.delete("krathong");
  history.replaceState(null, "", next);
  document.querySelector<HTMLInputElement>("#name")!.focus();
}
document.querySelector("#join-river")!.addEventListener("click", joinRiver);
let openingShared = false;
async function openShared() {
  if (!requestedId || openingShared) return;
  openingShared = true;
  const card = document.querySelector<HTMLElement>("#shared-card")!;
  const message = document.querySelector<HTMLElement>("#shared-message")!;
  const retry = document.querySelector<HTMLElement>("#retry-shared")!;
  card.hidden = false;
  retry.hidden = true;
  document.querySelector<HTMLElement>("#ritual")!.hidden = true;
  document.querySelector<HTMLElement>("#after")!.hidden = true;
  document.querySelector("main")!.classList.add("playing");
  try {
    if (!isKrathongId(requestedId)) {
      message.textContent = "ลิงก์กระทงไม่ถูกต้อง แต่คุณยังมาลอยกระทงด้วยกันได้";
      return;
    }
    if (!onlineConfigured) {
      message.textContent = "เว็บนี้ยังเปิดกระทงที่แชร์มาไม่ได้ กรุณาลองใหม่ภายหลัง";
      return;
    }
    message.textContent = "กำลังตามหากระทง…";
    const item = await loadSharedItem(requestedId);
    if (!item) {
      message.textContent = "ไม่พบกระทงนี้ อาจหมดระยะเวลาแสดงผลหรือถูกนำออกแล้ว";
      return;
    }
    pinned = item;
    river?.syncBoats(withPinned(shared));
    river?.focusBoat(item.id);
    message.textContent = `กระทงของ ${item.name}`;
    window.dispatchEvent(new CustomEvent("wish", { detail: item }));
  } catch {
    message.textContent = "ยังโหลดกระทงไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองอีกครั้ง";
    retry.hidden = false;
  } finally {
    openingShared = false;
  }
}
document
  .querySelector("#retry-shared")!
  .addEventListener("click", () => void openShared());
if (requestedId) void openShared();

window.addEventListener("ceremony-phase", (event) => {
  const phase = (event as CustomEvent<{ phase: string }>).detail.phase;
  const status = document.querySelector<HTMLElement>("#ceremony-status")!;
  if (phase === "lower") status.textContent = "ค่อย ๆ ฝากความปรารถนาไว้กับสายน้ำ…";
  else if (phase === "pier") status.textContent = "กำลังเดินมาที่ปลายท่า…";
});

let templeRoom: { close: () => void } | null = null;
document
  .querySelector<HTMLButtonElement>("#enter-temple")!
  .addEventListener("click", async () => {
    if (!latestOwn || templeRoom) return;
    const button = document.querySelector<HTMLButtonElement>("#enter-temple")!;
    button.disabled = true;
    try {
      const { Temple } = await import("./temple");
      river?.setPaused(true);
      await ambience.setScenePaused(true);
      document.querySelector("main")!.classList.add("inside-temple");
      templeRoom = new Temple(latestOwn, picker.photo?.dataUrl, () => {
        templeRoom = null;
        document.querySelector("main")!.classList.remove("inside-temple");
        river?.setPaused(false);
        void ambience.setScenePaused(false);
        button.focus();
      });
    } catch (error) {
      document.querySelector("main")!.classList.remove("inside-temple");
      river?.setPaused(false);
      void ambience.setScenePaused(false);
      document.querySelector<HTMLElement>("#audio-status")!.textContent =
        "เปิดโบสถ์ไม่สำเร็จ ลองอีกครั้ง";
      console.warn("Temple could not open", error);
    } finally {
      button.disabled = false;
    }
  });

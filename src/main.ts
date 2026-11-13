import { designs } from "./catalog";
import { River } from "./river";
import { state, launch, type Krathong } from "./state";
import "./style.css";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
 <main><div id="river" aria-label="แม่น้ำยามค่ำและกระทงของคุณ"></div>
 <header><a class="brand" href="./"><span class="brand-icon">✳</span> NAVAIT <span class="brand-divider"></span><span class="brand-thai">คืนลอยกระทง</span></a><span class="edition">ใต้แสงจันทร์ เราพบกัน</span><button class="sound" id="about" aria-label="เกี่ยวกับพื้นที่นี้">เกี่ยวกับ ↗</button></header>
 <section class="intro"><div class="eyebrow"><span></span> A LITTLE WISH, A LITTLE LIGHT</div><h1>ฝากคำอธิษฐาน<br>ให้สายน้ำพาไป<span> ✧</span></h1><p>คืนพระจันทร์เต็มดวง กระทงเล็ก ๆ และความหวังดีของคุณ<br>มาลอยความสุขไปด้วยกันนะ</p></section>
 <aside class="ritual" id="ritual"><div class="step">คืนพิเศษ เริ่มต้นที่คุณ <span>MAKE A WISH</span></div><h2>กระทงนี้…ของใครเอ่ย?</h2><p class="muted">ใส่ชื่อเล่น แล้วฝากคำอธิษฐานไว้กับสายน้ำ</p><form id="launch-form"><label for="name">ชื่อบนกระทง <span>*</span></label><input id="name" name="name" placeholder="ชื่อเล่นของคุณ" maxlength="24" required autocomplete="nickname"><label for="wish">คำอธิษฐาน <span class="optional">ไม่บังคับ</span></label><textarea id="wish" name="wish" placeholder="ขอให้ปีนี้มีแต่เรื่องน่ารัก ๆ …" maxlength="100" rows="2"></textarea><fieldset><legend>เลือกกระทงของคุณ <span class="optional">9 แบบ · โมเดล 3D</span></legend><div class="choices">${designs.map((d, i) => `<button type="button" class="choice ${i === 0 ? "active" : ""}" data-design="${i}" aria-pressed="${i === 0}" title="${d.description}"><img alt="กระทง${d.name}" width="100" height="74"><span>${d.name}</span></button>`).join("")}</div><p id="design-description">${designs[0].description}</p></fieldset><button class="primary" type="submit">ลอยกระทงของฉัน <span>↗</span></button><div class="privacy">✧ เข้าเล่นด้วยชื่อเล่น ไม่ต้องสมัครสมาชิก</div></form></aside>
 <section class="after" id="after" hidden><span class="success-icon">✧</span><h2>คำอธิษฐานออกเดินทางแล้ว</h2><p>ขอให้ความสุขลอยกลับมาหาคุณนะ</p><button class="primary" id="again">ลอยอีกหนึ่งความปรารถนา ↗</button></section>
 <footer><span class="river-note"><i></i> สายน้ำแห่งความปรารถนา <span id="count"></span></span><span class="footer-note">กระทงธรรมชาติในโลกดิจิทัล · อ่อนโยนต่อสายน้ำ</span></footer>
 <div class="demo-note">กระแสน้ำไหลไปทางขวา → · แตะชื่อเพื่ออ่านคำอธิษฐาน</div>
 <dialog id="wish-dialog"><button id="close-dialog" class="close" aria-label="ปิด">×</button><span class="dialog-star">✧</span><h2 id="dialog-name"></h2><p id="dialog-wish"></p></dialog></main>`;
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
const count = () => {
  document.querySelector("#count")!.textContent =
    `· ${state.krathongs.length} กระทง`;
};
count();
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
  .addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector<HTMLInputElement>("#name")!;
    if (!name.value.trim()) {
      name.setCustomValidity("กรุณาใส่ชื่อเล่นของคุณ");
      name.reportValidity();
      return;
    }
    name.setCustomValidity("");
    const item = launch(
      name.value,
      document.querySelector<HTMLTextAreaElement>("#wish")!.value,
    );
    river?.addBoat(item);
    document.querySelector("main")!.classList.add("playing");
    document.querySelector<HTMLElement>("#ritual")!.hidden = true;
    document.querySelector<HTMLElement>("#after")!.hidden = false;
    count();
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
  document.querySelector("#dialog-name")!.textContent =
    `คำอธิษฐานของ ${item.name}`;
  document.querySelector("#dialog-wish")!.textContent =
    item.wish || "ขอให้ทุกวันมีแต่เรื่องดี ๆ";
  dialog.showModal();
});
document.querySelector("#about")!.addEventListener("click", () => {
  document.querySelector("#dialog-name")!.textContent = "คืนลอยกระทง · NAVAIT";
  document.querySelector("#dialog-wish")!.textContent =
    "ต้นแบบลอยกระทงออนไลน์ เข้าเล่นด้วยชื่อเล่น กระทงจะเก็บไว้ในเบราว์เซอร์นี้ ยังไม่มีบัญชีผู้ใช้และยังไม่เชื่อมต่อกับผู้เล่นคนอื่น";
  dialog.showModal();
});
document
  .querySelector("#close-dialog")!
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

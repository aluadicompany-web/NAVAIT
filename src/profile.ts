const SIZE = 256;
const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_PIXELS = 60_000_000;
export type ProfilePhoto = { dataUrl: string; blob: Blob };
export function defaultAvatar(name: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const hue = [...name].reduce((sum, c) => sum + c.charCodeAt(0), 130) % 360;
  ctx.fillStyle = `hsl(${hue} 30% 84%)`;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = `hsl(${hue} 25% 43%)`;
  ctx.beginPath();
  ctx.arc(128, 92, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(128, 236, 84, 81, 0, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/png");
}
export function isLocalPhoto(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length < 90_000 &&
    /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value)
  );
}
/** A cover crop, clamped so dragging never reveals blank pixels. */
export function cropRect(
  width: number,
  height: number,
  zoom: number,
  x: number,
  y: number,
) {
  const side = Math.min(width, height) / Math.max(1, Math.min(zoom, 4));
  return {
    side,
    x: ((width - side) * (Math.max(-1, Math.min(1, x)) + 1)) / 2,
    y: ((height - side) * (Math.max(-1, Math.min(1, y)) + 1)) / 2,
  };
}
export class ProfilePicker {
  private bitmap: ImageBitmap | null = null;
  private zoom = 1;
  private x = 0;
  private y = 0;
  private pointer: { id: number; x: number; y: number } | null = null;
  private selected: ProfilePhoto | null = null;
  private generation = 0;
  private input: HTMLInputElement;
  private dialog: HTMLDialogElement;
  private canvas: HTMLCanvasElement;
  private slider: HTMLInputElement;
  private status: HTMLElement;
  constructor(private root: HTMLElement) {
    root.innerHTML = `<div class="profile-choice"><img id="profile-preview" alt="อวตาร์เริ่มต้น" width="48" height="48"><div><button type="button" id="choose-photo" class="photo-button">เลือกรูปโปรไฟล์ <span>ไม่บังคับ</span></button><p>รูปใช้เป็นหัวอวตาร์และในคำอธิษฐาน</p></div><button type="button" id="remove-photo" aria-label="ลบรูปโปรไฟล์" hidden>ลบรูป</button></div><input id="profile-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden><p id="photo-status" class="photo-status" role="status"></p><dialog id="crop-dialog" aria-labelledby="crop-title"><h2 id="crop-title">จัดรูปโปรไฟล์ของคุณ</h2><p>ลากรูปเพื่อจัดตำแหน่ง แล้วซูมให้พอดีวงกลม</p><div class="crop-stage"><canvas id="crop-canvas" width="320" height="320" aria-label="ภาพตัวอย่างการครอป"></canvas><div class="crop-mask"></div></div><label for="crop-zoom">ซูมรูป</label><input id="crop-zoom" type="range" min="1" max="4" value="1" step="0.01"><div class="crop-pan" role="group" aria-label="เลื่อนรูป"><button type="button" data-pan="-1,0" aria-label="เลื่อนรูปไปทางซ้าย">←</button><button type="button" data-pan="0,-1" aria-label="เลื่อนรูปขึ้น">↑</button><button type="button" id="crop-reset">จัดกึ่งกลาง</button><button type="button" data-pan="0,1" aria-label="เลื่อนรูปลง">↓</button><button type="button" data-pan="1,0" aria-label="เลื่อนรูปไปทางขวา">→</button></div><p class="crop-output">รูปที่บันทึก 256 × 256 พิกเซล · ย่อไฟล์ให้อัตโนมัติ</p><div class="crop-actions"><button type="button" id="crop-cancel">ยกเลิก</button><button type="button" class="primary" id="crop-save">ใช้รูปนี้</button></div></dialog>`;
    this.input = root.querySelector("#profile-file")!;
    this.dialog = root.querySelector("#crop-dialog")!;
    this.canvas = root.querySelector("#crop-canvas")!;
    this.slider = root.querySelector("#crop-zoom")!;
    this.status = root.querySelector("#photo-status")!;
    this.setPreview(null);
    root
      .querySelector("#choose-photo")!
      .addEventListener("click", () => this.input.click());
    this.input.addEventListener("change", () => void this.openFile());
    this.slider.addEventListener("input", () => {
      this.zoom = Number(this.slider.value);
      this.draw();
    });
    this.canvas.addEventListener("pointerdown", (e) => {
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.pointer || this.pointer.id !== e.pointerId || !this.bitmap)
        return;
      const side = Math.min(this.bitmap.width, this.bitmap.height) / this.zoom;
      const pixelsPerScreenPixel =
        side / this.canvas.getBoundingClientRect().width;
      const dx = e.clientX - this.pointer.x,
        dy = e.clientY - this.pointer.y;
      if (this.bitmap.width > side)
        this.x = Math.max(
          -1,
          Math.min(
            1,
            this.x -
              (dx * pixelsPerScreenPixel * 2) / (this.bitmap.width - side),
          ),
        );
      if (this.bitmap.height > side)
        this.y = Math.max(
          -1,
          Math.min(
            1,
            this.y -
              (dy * pixelsPerScreenPixel * 2) / (this.bitmap.height - side),
          ),
        );
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
      this.draw();
    });
    const end = () => {
      this.pointer = null;
    };
    this.canvas.addEventListener("pointerup", end);
    this.canvas.addEventListener("pointercancel", end);
    this.canvas.addEventListener("lostpointercapture", end);
    root.querySelectorAll<HTMLButtonElement>("[data-pan]").forEach((b) =>
      b.addEventListener("click", () => {
        const [dx, dy] = b.dataset.pan!.split(",").map(Number);
        this.x = Math.max(-1, Math.min(1, this.x - dx * 0.12));
        this.y = Math.max(-1, Math.min(1, this.y - dy * 0.12));
        this.draw();
      }),
    );
    root.querySelector("#crop-reset")!.addEventListener("click", () => {
      this.zoom = 1;
      this.x = this.y = 0;
      this.slider.value = "1";
      this.draw();
    });
    root
      .querySelector("#crop-cancel")!
      .addEventListener("click", () => this.dialog.close());
    root
      .querySelector("#crop-save")!
      .addEventListener("click", () => void this.save());
    this.dialog.addEventListener("close", () => {
      this.generation++;
      this.bitmap?.close();
      this.bitmap = null;
      this.input.value = "";
      this.pointer = null;
    });
    root.querySelector("#remove-photo")!.addEventListener("click", () => {
      this.selected = null;
      this.setPreview(null);
      this.status.textContent = "ใช้อวตาร์เริ่มต้น";
    });
  }
  get photo() {
    return this.selected;
  }
  private setPreview(photo: ProfilePhoto | null) {
    const img = this.root.querySelector<HTMLImageElement>("#profile-preview")!;
    img.src = photo?.dataUrl || defaultAvatar("");
    img.alt = photo ? "รูปโปรไฟล์ที่เลือก" : "อวตาร์เริ่มต้น";
    (this.root.querySelector("#remove-photo")! as HTMLElement).hidden = !photo;
  }
  private async openFile() {
    const file = this.input.files?.[0];
    if (!file) return;
    const generation = ++this.generation;
    this.status.textContent = "กำลังเปิดรูป…";
    try {
      if (
        !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
          file.type,
        )
      )
        throw Error(
          "กรุณาเลือกรูป JPG, PNG, WebP หรือ AVIF (รูป HEIC ให้แปลงเป็น JPG ก่อน)",
        );
      if (file.size > MAX_FILE_BYTES)
        throw Error("รูปนี้เกิน 30 MB กรุณาย่อไฟล์ต้นฉบับก่อน");
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      if (generation !== this.generation) {
        bitmap.close();
        return;
      }
      if (bitmap.width * bitmap.height > MAX_PIXELS) {
        bitmap.close();
        throw Error("รูปมีขนาดเกิน 60 ล้านพิกเซล กรุณาย่อรูปก่อน");
      }
      this.bitmap?.close();
      this.bitmap = bitmap;
      this.zoom = 1;
      this.x = this.y = 0;
      this.slider.value = "1";
      this.draw();
      this.status.textContent = "";
      this.dialog.showModal();
    } catch (error) {
      this.status.textContent =
        error instanceof Error ? error.message : "เปิดรูปนี้ไม่สำเร็จ ลองใช้รูปอื่น";
      this.input.value = "";
    }
  }
  private draw() {
    if (!this.bitmap) return;
    const ctx = this.canvas.getContext("2d")!;
    const r = cropRect(
      this.bitmap.width,
      this.bitmap.height,
      this.zoom,
      this.x,
      this.y,
    );
    ctx.clearRect(0, 0, 320, 320);
    ctx.drawImage(this.bitmap, r.x, r.y, r.side, r.side, 0, 0, 320, 320);
  }
  private async save() {
    if (!this.bitmap) return;
    const button = this.root.querySelector<HTMLButtonElement>("#crop-save")!;
    button.disabled = true;
    const generation = this.generation;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#f9f1df";
      ctx.fillRect(0, 0, SIZE, SIZE);
      const r = cropRect(
        this.bitmap.width,
        this.bitmap.height,
        this.zoom,
        this.x,
        this.y,
      );
      ctx.drawImage(this.bitmap, r.x, r.y, r.side, r.side, 0, 0, SIZE, SIZE);
      let quality = 0.88;
      let blob: Blob | null = null;
      do {
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        quality -= 0.12;
      } while (blob && blob.size > 60_000 && quality >= 0.28);
      if (!blob || blob.size > 60_000) throw Error("ย่อรูปไม่สำเร็จ กรุณาลองใช้รูปอื่น");
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("บันทึกรูปไม่สำเร็จ"));
        reader.readAsDataURL(blob!);
      });
      if (!this.dialog.open || generation !== this.generation) return;
      this.selected = { dataUrl, blob };
      this.setPreview(this.selected);
      this.status.textContent = `เตรียมรูปแล้ว · 256 × 256 · ${Math.ceil(blob.size / 1024)} KB`;
      this.dialog.close();
    } catch (error) {
      this.status.textContent =
        error instanceof Error ? error.message : "บันทึกรูปไม่สำเร็จ";
    } finally {
      button.disabled = false;
    }
  }
}

import * as T from "three";
import type { Krathong } from "./state";
import { defaultAvatar } from "./profile";
import { photoUrl, onlineConfigured } from "./online";
import { TemplePresence, type HallPeer } from "./temple-presence";
import { moveToward, roomPoint } from "./temple-state";
import { CeremonyAvatar } from "./render/avatar";
import { TempleInterior } from "./render/temple-interior";
import { CostumePool } from "./ceremony";
import { Chant } from "./chant";
type Visitor = {
  avatar: CeremonyAvatar;
  position: { x: number; z: number };
  target: { x: number; z: number };
  praying: boolean;
  yaw: number;
  phase: number;
};
export class Temple {
  private root = document.createElement("section");
  private viewport: HTMLElement;
  private labels = document.createElement("div");
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(50, 1, 0.1, 100);
  private interior = new TempleInterior();
  private own: Visitor;
  private peers = new Map<string, Visitor>();
  private costumes = new CostumePool();
  private presence: TemplePresence | null = null;
  private keys = new Set<string>();
  private chant: Chant;
  private width = 1;
  private height = 1;
  private last = 0;
  private lastFrame = 0;
  private time = 0;
  private paused = false;
  private closed = false;
  private wasMoving = false;
  private keyboardWalking = false;
  private ray = new T.Raycaster();
  private media = matchMedia("(prefers-reduced-motion: reduce)");
  private id = crypto.randomUUID();
  constructor(
    item: Krathong,
    photo: string | undefined,
    private onExit: () => void,
  ) {
    this.root.className = "temple-room";
    this.root.setAttribute("aria-label", "ภายในโบสถ์");
    this.root.innerHTML = `<div id="temple-viewport"></div><div class="temple-top"><button type="button" id="leave-temple">← กลับท่าน้ำ</button><div><h1>ภายในโบสถ์</h1><p id="temple-presence" role="status">กำลังเชื่อมต่อผู้ร่วมสวด…</p></div></div><div class="temple-controls"><button type="button" id="temple-pray" aria-pressed="false">นั่งสวดมนต์</button><button type="button" id="temple-chant" aria-pressed="false">ฟังบทสวด</button><p id="temple-audio-status" role="status"></p><details><summary>บทนมัสการพระพุทธเจ้า</summary><p>นะโม ตัสสะ ภะคะวะโต<br>อะระหะโต สัมมาสัมพุทธัสสะ<br><small>สวด 3 จบ · เสียงอ่านภาษาไทย</small></p></details></div><div class="temple-dpad" role="group" aria-label="ปุ่มเดิน"><button type="button" data-direction="ArrowUp" aria-label="เดินไปข้างหน้า">↑</button><button type="button" data-direction="ArrowLeft" aria-label="เดินไปทางซ้าย">←</button><button type="button" data-direction="ArrowDown" aria-label="เดินถอยหลัง">↓</button><button type="button" data-direction="ArrowRight" aria-label="เดินไปทางขวา">→</button></div><p class="temple-hint">แตะพื้นเพื่อเดิน · ใช้ WASD หรือลูกศรได้</p>`;
    this.viewport = this.root.querySelector("#temple-viewport")!;
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x33292b);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.viewport.append(this.renderer.domElement);
    this.labels.className = "boat-labels";
    this.viewport.append(this.labels);
    this.scene.add(this.interior.group);
    this.scene.environment = this.interior.environment;
    this.scene.environmentIntensity = 0.6;
    const start = { x: (Math.random() - 0.5) * 3, z: 5.3 };
    this.own = this.visitor(item, photo, start);
    this.root.dataset.selfId = this.id;
    document.body.append(this.root);
    document.body.classList.add("temple-open");
    this.resize();
    this.chant = new Chant(
      this.root.querySelector("#temple-chant")!,
      this.root.querySelector("#temple-audio-status")!,
    );
    this.root
      .querySelector("#leave-temple")!
      .addEventListener("click", () => this.close());
    this.root
      .querySelector("#temple-pray")!
      .addEventListener("click", () => this.pray());
    this.renderer.domElement.addEventListener("pointerdown", this.tap);
    this.renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.paused = true;
      this.connection("กำลังกู้คืนภาพ…");
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () => {
      this.paused = false;
      this.last = 0;
    });
    for (const button of Array.from(
      this.root.querySelectorAll<HTMLButtonElement>("[data-direction]"),
    )) {
      button.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.keys.add(button.dataset.direction!);
        button.setPointerCapture(e.pointerId);
      });
      const up = () => this.keys.delete(button.dataset.direction!);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("lostpointercapture", up);
    }
    window.addEventListener("keydown", this.keyDown);
    window.addEventListener("keyup", this.keyUp);
    window.addEventListener("blur", this.blur);
    window.addEventListener("resize", this.resize);
    window.addEventListener("pagehide", this.pageHide);
    document.addEventListener("visibilitychange", this.visibility);
    if (onlineConfigured) {
      this.presence = new TemplePresence(
        { id: this.id, krathongId: item.id, ...start, praying: false },
        (peers) => this.sync(peers),
        (status) => this.connection(status),
      );
    } else this.connection("อยู่คนเดียวบนอุปกรณ์นี้");
    this.renderer.setAnimationLoop(this.frame);
    this.root.querySelector<HTMLButtonElement>("#leave-temple")!.focus();
  }
  private visitor(
    item: Krathong,
    photo: string | undefined,
    position: { x: number; z: number },
  ): Visitor {
    const avatar = new CeremonyAvatar(
      item,
      this.costumes.next(),
      1,
      photo || photoUrl(item) || item.photo || defaultAvatar(item.name),
      () => {},
      () => {},
      "hall",
    );
    this.scene.add(avatar.group);
    this.labels.append(avatar.head);
    return {
      avatar,
      position: { ...position },
      target: { ...position },
      praying: false,
      yaw: Math.PI,
      phase: 0,
    };
  }
  private connection(status: string) {
    if (this.closed) return;
    this.root.querySelector("#temple-presence")!.textContent = onlineConfigured
      ? status === "เชื่อมต่อแล้ว"
        ? `อยู่ร่วมกัน ${this.peers.size + 1} คน`
        : status
      : status;
  }
  private sync(peers: HallPeer[]) {
    if (this.closed) return;
    const ids = new Set(peers.map((p) => p.presence.id));
    for (const [id, visitor] of this.peers)
      if (!ids.has(id)) {
        visitor.avatar.dispose();
        this.peers.delete(id);
      }
    for (const { presence, item } of peers) {
      let visitor = this.peers.get(presence.id);
      if (!visitor) {
        visitor = this.visitor(item, undefined, presence);
        visitor.avatar.head.dataset.presenceId = presence.id;
        this.peers.set(presence.id, visitor);
      }
      visitor.target = roomPoint(presence.x, presence.z);
      visitor.praying = presence.praying;
    }
    this.connection("เชื่อมต่อแล้ว");
  }
  private pray() {
    this.own.praying = !this.own.praying;
    this.own.target = { ...this.own.position };
    this.keys.clear();
    this.prayerButton();
    this.presence?.update(
      this.own.position.x,
      this.own.position.z,
      this.own.praying,
      true,
    );
  }
  private prayerButton() {
    const button = this.root.querySelector<HTMLButtonElement>("#temple-pray")!;
    button.setAttribute("aria-pressed", String(this.own.praying));
    button.textContent = this.own.praying ? "ลุกขึ้น" : "นั่งสวดมนต์";
  }
  private keyDown = (e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(key)
    ) {
      e.preventDefault();
      this.keys.add(key);
    }
  };
  private keyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  };
  private blur = () => this.keys.clear();
  private visibility = () => {
    if (document.hidden) this.keys.clear();
    this.last = 0;
  };
  private pageHide = () => this.close();
  private tap = (e: PointerEvent) => {
    this.keyboardWalking = false;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2,
      ),
      this.camera,
    );
    const p = this.ray.ray.intersectPlane(
      new T.Plane(new T.Vector3(0, 1, 0), 0),
      new T.Vector3(),
    );
    if (p) {
      this.own.praying = false;
      this.prayerButton();
      this.presence?.update(
        this.own.position.x,
        this.own.position.z,
        false,
        true,
      );
      this.own.target = roomPoint(p.x, p.z);
    }
  };
  private resize = () => {
    this.width = this.viewport.clientWidth;
    this.height = this.viewport.clientHeight;
    const mobile = this.width < 760;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.position.set(0, mobile ? 24 : 14, mobile ? 27 : 16);
    this.camera.lookAt(0, 0, -0.8);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  };
  private frame = (now: number) => {
    if (now - this.lastFrame < 33) return;
    this.lastFrame = now;
    const dt = this.last ? Math.min((now - this.last) / 1000, 0.1) : 0;
    this.last = now;
    if (this.closed || this.paused || document.hidden) return;
    const dx =
        Number(this.keys.has("d") || this.keys.has("ArrowRight")) -
        Number(this.keys.has("a") || this.keys.has("ArrowLeft")),
      dz =
        Number(this.keys.has("s") || this.keys.has("ArrowDown")) -
        Number(this.keys.has("w") || this.keys.has("ArrowUp"));
    if (dx || dz) {
      this.keyboardWalking = true;
      if (this.own.praying)
        this.presence?.update(
          this.own.position.x,
          this.own.position.z,
          false,
          true,
        );
      this.own.praying = false;
      this.prayerButton();
      const n = Math.hypot(dx, dz);
      this.own.target = roomPoint(
        this.own.position.x + dx / n,
        this.own.position.z + dz / n,
      );
    }
    if (!dx && !dz && this.keyboardWalking) {
      this.keyboardWalking = false;
      this.own.target = { ...this.own.position };
    }
    const movement = moveToward(this.own.position, this.own.target, dt * 2.4);
    this.own.position = { x: movement.x, z: movement.z };
    if (movement.moving) {
      this.own.yaw = movement.yaw;
      this.own.phase += dt * 9;
    }
    if (movement.moving || this.wasMoving)
      this.presence?.update(
        movement.x,
        movement.z,
        this.own.praying,
        this.wasMoving && !movement.moving,
      );
    this.wasMoving = movement.moving;
    this.own.avatar.updateHall(
      movement.x,
      movement.z,
      this.own.yaw,
      this.media.matches
        ? 0
        : movement.moving
          ? Math.sin(this.own.phase) * 0.4
          : 0,
      this.own.praying,
      this.camera,
      this.width,
      this.height,
    );
    for (const visitor of this.peers.values()) {
      const step = moveToward(visitor.position, visitor.target, dt * 5);
      visitor.position = { x: step.x, z: step.z };
      if (step.moving) {
        visitor.yaw = step.yaw;
        visitor.phase += dt * 9;
      }
      visitor.avatar.updateHall(
        step.x,
        step.z,
        visitor.yaw,
        this.media.matches
          ? 0
          : step.moving
            ? Math.sin(visitor.phase) * 0.4
            : 0,
        visitor.praying,
        this.camera,
        this.width,
        this.height,
      );
    }
    if (!this.media.matches) this.time += dt;
    this.interior.update(this.time);
    this.renderer.render(this.scene, this.camera);
    this.root.dataset.playerX = this.own.position.x.toFixed(2);
    this.root.dataset.playerZ = this.own.position.z.toFixed(2);
  };
  close() {
    if (this.closed) return;
    this.closed = true;
    this.renderer.setAnimationLoop(null);
    this.presence?.close();
    this.chant.dispose();
    this.own.avatar.dispose();
    this.peers.forEach((p) => p.avatar.dispose());
    this.interior.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    window.removeEventListener("keydown", this.keyDown);
    window.removeEventListener("keyup", this.keyUp);
    window.removeEventListener("blur", this.blur);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pagehide", this.pageHide);
    document.removeEventListener("visibilitychange", this.visibility);
    this.root.remove();
    document.body.classList.remove("temple-open");
    this.onExit();
  }
}

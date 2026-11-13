import * as T from "three";
import { state, type Krathong } from "./state";
import { createKrathong, disposeModel, type Model } from "./render/krathong";
import { Festival } from "./render/festival";
import { createWater } from "./render/water";
import { designs } from "./catalog";
import { CostumePool } from "./ceremony";
import { CeremonyAvatar } from "./render/avatar";
import { riverLane, keepInChannel } from "./navigation";
type Boat = {
  item: Krathong;
  model: Model;
  label: HTMLButtonElement;
  offset: number;
  demo: boolean;
  focusedAt?: number;
  releasedAt?: number;
  releaseOrigin?: T.Vector3;
  releaseScale?: number;
};
export class River {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(39, 1, 0.1, 100);
  private boats: Boat[] = [];
  private actor: CeremonyAvatar | null = null;
  private pendingIds = new Set<string>();
  private costumes = new CostumePool();
  private water = createWater();
  private festival = new Festival();
  private media = matchMedia("(prefers-reduced-motion: reduce)");
  private effect: {
    group: T.Group;
    rings: T.Mesh<T.RingGeometry, T.MeshBasicMaterial>[];
    sparks: T.Points;
    started: number;
    origin: T.Vector3;
  } | null = null;
  private time = 0;
  private last = 0;
  private lastFrame = 0;
  private running = true;
  private paused = false;
  private width = 1;
  private height = 1;
  private ray = new T.Raycaster();
  private labels = document.createElement("div");
  private thumbnails: T.Scene;
  private previewCamera = new T.PerspectiveCamera(35, 1, 0.1, 20);
  private previewModels: Model[] = [];
  constructor(private host: HTMLElement) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    host.append(this.renderer.domElement);
    this.labels.className = "boat-labels";
    host.append(this.labels);
    this.scene.fog = new T.FogExp2(0x12383c, 0.021);
    this.scene.add(this.water.mesh);
    this.scene.add(this.festival.group);
    this.scene.add(new T.HemisphereLight(0xc4e9ff, 0x427858, 2.4));
    const light = new T.DirectionalLight(0xffe0a4, 3.4);
    light.position.set(-3, 10, 5);
    this.scene.add(light);
    const rim = new T.DirectionalLight(0x91c9e8, 2);
    rim.position.set(4, 4, -8);
    this.scene.add(rim);
    this.thumbnails = new T.Scene();
    this.thumbnails.add(new T.HemisphereLight(0xffffff, 0x567453, 3));
    const pl = new T.DirectionalLight(0xffe6b0, 4);
    pl.position.set(-2, 5, 3);
    this.thumbnails.add(pl);
    this.previewCamera.position.set(1.7, 2.4, 2.8);
    this.previewCamera.lookAt(0, 0.3, 0);
    this.resize();
    if (state.krathongs.length === 0)
      designs.forEach((_, i) =>
        this.addBoat(
          {
            id: `demo-${i}`,
            name: designs[i].name,
            wish: designs[i].description,
            color: designs[i].color,
            design: i,
            x: 0.13 + (i % 3) * 0.29,
            y: 0.48 + Math.floor(i / 3) * 0.17,
            created: 0,
          },
          true,
        ),
      );
    state.krathongs.forEach((item) => this.addBoat(item));
    this.renderThumbnails();
    window.addEventListener("resize", this.resize);
    this.media.addEventListener("change", this.motionChange);
    this.renderer.domElement.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      this.running = false;
      this.host.classList.add("context-lost");
    });
    this.renderer.domElement.addEventListener("webglcontextrestored", () => {
      this.running = true;
      this.last = 0;
      this.host.classList.remove("context-lost");
    });
    this.renderer.setAnimationLoop(this.frame);
  }
  private motionChange = () => {
    this.last = 0;
    if (this.media.matches) this.clearEffect();
  };
  private resize = () => {
    this.width = this.host.clientWidth;
    this.height = this.host.clientHeight;
    this.renderer.setSize(this.width, this.height);
    this.water.material.uniforms.viewportHeight.value =
      this.renderer.getDrawingBufferSize(new T.Vector2()).y;
    this.camera.aspect = this.width / this.height;
    this.camera.position.set(0, 15, 13);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
  };
  private point(x: number, y: number) {
    this.ray.setFromCamera(new T.Vector2(x * 2 - 1, 1 - y * 2), this.camera);
    const result = new T.Vector3();
    this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), result);
    return result;
  }
  addBoat(item: Krathong, demo = false) {
    if (!demo) {
      for (const b of this.boats.filter((b) => b.demo)) {
        this.scene.remove(b.model.group);
        disposeModel(b.model);
        b.label.remove();
      }
      this.boats = this.boats.filter((b) => !b.demo);
    }
    const model = createKrathong(item.design ?? 0);
    this.scene.add(model.group);
    const label = document.createElement("button");
    label.className = `boat-label${demo ? " sample" : ""}`;
    label.textContent = demo ? `ตัวอย่าง · ${item.name}` : item.name;
    label.setAttribute(
      "aria-label",
      `${demo ? "ตัวอย่างกระทง" : "คำอธิษฐานของ"} ${item.name}`,
    );
    label.addEventListener("click", () =>
      window.dispatchEvent(new CustomEvent("wish", { detail: item })),
    );
    this.labels.append(label);
    this.boats.push({ item, model, label, offset: this.time, demo });
    if (!demo) {
      const real = this.boats.filter((b) => !b.demo);
      if (real.length > 30) {
        const old = real[0];
        this.scene.remove(old.model.group);
        disposeModel(old.model);
        old.label.remove();
        this.boats = this.boats.filter((b) => b !== old);
      }
    }
  }
  walkAndRelease(
    item: Krathong,
    photo: string | undefined,
    onRelease: () => void,
  ): Promise<void> {
    this.actor?.finish();
    this.actor = null;
    for (const sample of this.boats.filter((b) => b.demo)) {
      this.scene.remove(sample.model.group);
      disposeModel(sample.model);
      sample.label.remove();
    }
    this.boats = this.boats.filter((b) => !b.demo);
    this.pendingIds.add(item.id);
    return new Promise((resolve) => {
      const release = (origin: T.Vector3, scale: number) => {
        this.pendingIds.delete(item.id);
        if (!this.boats.some((b) => b.item.id === item.id)) this.addBoat(item);
        const boat = this.boats.find((b) => b.item.id === item.id)!;
        boat.releasedAt = this.media.matches ? undefined : this.time;
        boat.releaseOrigin = this.media.matches ? undefined : origin;
        boat.releaseScale = this.media.matches ? undefined : scale;
        this.celebrate(item.id, origin);
        onRelease();
        resolve();
      };
      const actor = new CeremonyAvatar(
        item,
        this.costumes.next(),
        this.costumes.side(),
        photo,
        release,
        () => {
          if (this.actor === actor) this.actor = null;
          delete this.host.dataset.ceremony;
        },
      );
      this.actor = actor;
      this.scene.add(actor.group);
      this.labels.append(actor.head);
      this.host.dataset.ceremony = "active";
    });
  }
  focusBoat(id: string) {
    const boat = this.boats.find((b) => b.item.id === id);
    if (!boat) return;
    boat.focusedAt = this.time;
    boat.label.classList.add("is-focused");
  }
  celebrate(id: string, releaseOrigin?: T.Vector3) {
    this.clearEffect();
    if (this.media.matches) return;
    const boat = this.boats.find((b) => b.item.id === id);
    if (!boat) return;
    boat.releasedAt = this.time;
    const origin = (releaseOrigin ?? this.festival.launchPoint).clone();
    origin.y = 0;
    const group = new T.Group();
    group.position.copy(origin);
    this.scene.add(group);
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(
        new T.RingGeometry(0.97, 1, 40),
        new T.MeshBasicMaterial({
          color: i === 0 ? 0xf5d48d : 0x96d1ba,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: T.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.015 + i * 0.003;
      group.add(ring);
      rings.push(ring);
    }
    const positions = new Float32Array(14 * 3);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
    const sparks = new T.Points(
      geometry,
      new T.PointsMaterial({
        color: 0xffdfa1,
        size: 0.055,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    group.add(sparks);
    this.effect = { group, rings, sparks, started: this.time, origin };
    this.host.dataset.launchEffect = "active";
  }
  private clearEffect() {
    if (!this.effect) return;
    this.scene.remove(this.effect.group);
    this.effect.group.traverse((obj) => {
      if (obj instanceof T.Mesh || obj instanceof T.Points) {
        obj.geometry.dispose();
        (obj.material as T.Material).dispose();
      }
    });
    this.effect = null;
    delete this.host.dataset.launchEffect;
  }
  private updateEffect() {
    const effect = this.effect;
    if (!effect) return;
    const age = this.time - effect.started;
    if (age > 2.8) {
      this.clearEffect();
      return;
    }
    effect.rings.forEach((ring, i) => {
      const progress = Math.max(0, (age - i * 0.16) / 2.4);
      ring.scale.setScalar(0.35 + progress * 2.3);
      ring.material.opacity =
        age < i * 0.16 ? 0 : Math.max(0, (1 - progress) * 0.5);
    });
    const positions = effect.sparks.geometry.getAttribute(
      "position",
    ) as T.BufferAttribute;
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2,
        radius = 0.2 + age * 0.21;
      positions.setXYZ(
        i,
        Math.cos(angle) * radius,
        0.2 + Math.sin(i * 2.4) * 0.12 + age * 0.45,
        Math.sin(angle) * radius,
      );
    }
    positions.needsUpdate = true;
    (effect.sparks.material as T.PointsMaterial).opacity = Math.max(
      0,
      1 - age / 2.4,
    );
  }
  syncBoats(items: Krathong[]) {
    const ids = new Set(items.map((item) => item.id));
    for (const boat of this.boats.filter(
      (b) => !b.demo && !ids.has(b.item.id),
    )) {
      this.scene.remove(boat.model.group);
      disposeModel(boat.model);
      boat.label.remove();
    }
    this.boats = this.boats.filter((b) => b.demo || ids.has(b.item.id));
    const existing = new Set(this.boats.map((b) => b.item.id));
    for (const item of items)
      if (!existing.has(item.id) && !this.pendingIds.has(item.id))
        this.addBoat(item);
  }
  private renderThumbnails() {
    this.renderer.setSize(180, 150, false);
    designs.forEach((_, i) => {
      const model = createKrathong(i);
      this.previewModels.push(model);
      this.thumbnails.add(model.group);
      this.previewCamera.aspect = 180 / 150;
      this.previewCamera.updateProjectionMatrix();
      this.renderer.render(this.thumbnails, this.previewCamera);
      const image = document.querySelector<HTMLImageElement>(
        `[data-design="${i}"] img`,
      );
      if (image) image.src = this.renderer.domElement.toDataURL("image/png");
      this.thumbnails.remove(model.group);
      disposeModel(model);
    });
    this.previewModels = [];
    this.resize();
  }
  private frame = (now: number) => {
    if (now - this.lastFrame < 33) return;
    this.lastFrame = now;
    const actorDelta = this.last ? Math.min((now - this.last) / 1000, 0.2) : 0;
    const delta = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    if (!this.running || document.hidden || this.paused) return;
    if (!this.media.matches) this.time += delta;
    this.water.material.uniforms.time.value = this.time;
    const mobile = this.width < 760;
    this.actor?.update(
      actorDelta,
      this.media.matches,
      this.camera,
      this.width,
      this.height,
    );
    for (const boat of this.boats) {
      const { item, model, label } = boat;
      const age = this.time - boat.offset;
      // Every boat travels rightward with the current and re-enters upstream.
      const focusedAge =
        boat.focusedAt === undefined ? null : this.time - boat.focusedAt;
      const sx =
        (((focusedAge === null ? item.x : 0.56) + (focusedAge ?? age) * 0.009) %
          1.12) -
        0.06;
      const sy = riverLane(focusedAge === null ? item.y : 0.64, mobile);
      const p = keepInChannel(this.point(sx, sy));
      if (boat.releasedAt !== undefined) {
        const progress = Math.min(1, (this.time - boat.releasedAt) / 3);
        p.lerpVectors(
          boat.releaseOrigin ?? this.festival.launchPoint,
          p,
          progress * progress * (3 - 2 * progress),
        );
        if (progress === 1) boat.releasedAt = undefined;
      }
      model.group.position.copy(p);
      const releaseProgress =
        boat.releasedAt === undefined
          ? 1
          : Math.min(1, (this.time - boat.releasedAt) / 3);
      model.group.position.y = T.MathUtils.lerp(
        boat.releaseOrigin?.y ?? 0,
        Math.sin(this.time * 1.4 + item.x * 9) * 0.035,
        releaseProgress,
      );
      const targetYaw = item.x * 3 + Math.sin(this.time * 0.3 + item.y) * 0.08;
      model.group.rotation.set(
        Math.sin(this.time * 1.1 + item.x) * 0.025,
        boat.releaseOrigin
          ? T.MathUtils.lerp(0, targetYaw, releaseProgress)
          : targetYaw,
        Math.cos(this.time * 1.3 + item.y) * 0.025,
      );
      const scale = mobile ? 0.72 : 1;
      model.group.scale.setScalar(
        T.MathUtils.lerp(boat.releaseScale ?? scale, scale, releaseProgress),
      );
      const flicker =
        1 +
        Math.sin(this.time * 12 + item.x * 21) * 0.12 +
        Math.sin(this.time * 19) * 0.05;
      model.flame.scale.y = 0.14 * flicker;
      model.flame.rotation.z = Math.sin(this.time * 7 + item.y) * 0.12;
      model.glow.scale.setScalar(1.15 * flicker);
      const screen = model.group.position.clone();
      screen.y += 1.45 * scale;
      screen.project(this.camera);
      label.style.transform = `translate(-50%,-100%) translate(${(screen.x * 0.5 + 0.5) * this.width}px,${(-screen.y * 0.5 + 0.5) * this.height}px)`;
    }
    this.festival.update(this.time, this.camera, mobile);
    this.updateEffect();
    this.renderer.render(this.scene, this.camera);
  };
  setPaused(paused: boolean) {
    this.paused = paused;
    this.last = 0;
    if (paused) {
      this.actor?.finish();
      this.actor = null;
      delete this.host.dataset.ceremony;
    }
  }
  dispose() {
    this.clearEffect();
    this.actor?.finish();
    this.actor = null;
    this.festival.dispose();
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.resize);
    this.media.removeEventListener("change", this.motionChange);
    for (const b of this.boats) {
      disposeModel(b.model);
      b.label.remove();
    }
    this.water.mesh.geometry.dispose();
    this.water.material.dispose();
    this.renderer.dispose();
    this.host.replaceChildren();
  }
}

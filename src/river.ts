import * as T from "three";
import { state, type Krathong } from "./state";
import { createKrathong, disposeModel, type Model } from "./render/krathong";
import { createWater } from "./render/water";
import { designs } from "./catalog";
type Boat = {
  item: Krathong;
  model: Model;
  label: HTMLButtonElement;
  offset: number;
  demo: boolean;
};
export class River {
  private renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(39, 1, 0.1, 100);
  private boats: Boat[] = [];
  private water = createWater();
  private media = matchMedia("(prefers-reduced-motion: reduce)");
  private time = 0;
  private last = 0;
  private lastFrame = 0;
  private running = true;
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
    for (const item of items) if (!existing.has(item.id)) this.addBoat(item);
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
    const delta = this.last ? Math.min((now - this.last) / 1000, 0.05) : 0;
    this.last = now;
    if (!this.running || document.hidden) return;
    if (!this.media.matches) this.time += delta;
    this.water.material.uniforms.time.value = this.time;
    const mobile = this.width < 760;
    for (const boat of this.boats) {
      const { item, model, label, demo } = boat;
      const age = this.time - boat.offset;
      // Every boat travels rightward with the current and re-enters upstream.
      const sx = ((item.x + age * 0.009) % 1.12) - 0.06;
      const sy = mobile
        ? demo
          ? 0.47 + (item.y - 0.48) * 0.58
          : 0.48 + (item.y - 0.45) * 0.65
        : item.y;
      const p = this.point(sx, sy);
      model.group.position.copy(p);
      model.group.position.y = Math.sin(this.time * 1.4 + item.x * 9) * 0.035;
      model.group.rotation.set(
        Math.sin(this.time * 1.1 + item.x) * 0.025,
        item.x * 3 + Math.sin(this.time * 0.3 + item.y) * 0.08,
        Math.cos(this.time * 1.3 + item.y) * 0.025,
      );
      const scale = mobile ? 0.72 : 1;
      model.group.scale.setScalar(scale);
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
    this.renderer.render(this.scene, this.camera);
  };
  dispose() {
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

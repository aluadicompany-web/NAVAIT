import * as T from "three";
import { ceremonyPose, type EntrySide } from "../ceremony";
import { createKrathong, disposeModel, type Model } from "./krathong";
import { defaultAvatar } from "../profile";
import type { Krathong } from "../state";

/** Gender-neutral chibi body with a camera-facing circular portrait head. */
export class CeremonyAvatar {
  readonly group = new T.Group();
  readonly held: Model;
  readonly head = document.createElement("div");
  readonly side: EntrySide;
  private torso = new T.Group();
  private legs: T.Group[] = [];
  private arms: { upper: T.Mesh; lower: T.Mesh; hand: T.Mesh; side: number }[] =
    [];
  private geometries = new Set<T.BufferGeometry>();
  private materials: T.Material[] = [];
  private photo: HTMLImageElement;
  private elapsed = 0;
  private released = false;
  private lastPhase = "";
  private reduced = false;
  private disposed = false;
  constructor(
    readonly item: Krathong,
    color: number,
    side: EntrySide,
    photo: string | undefined,
    private onRelease: (origin: T.Vector3, scale: number) => void,
    private onDone: () => void,
  ) {
    this.side = side;
    const sphere = new T.SphereGeometry(1, 10, 7),
      capsule = new T.CapsuleGeometry(1, 1, 4, 8),
      segment = new T.CylinderGeometry(1, 1, 1, 8);
    [sphere, capsule, segment].forEach((g) => this.geometries.add(g));
    const material = (c: number) => {
      const m = new T.MeshStandardMaterial({
        color: new T.Color(c).multiplyScalar(0.55),
        roughness: 0.9,
      });
      this.materials.push(m);
      return m;
    };
    const shirt = material(color),
      trousers = material(0x3b5758),
      shoe = material(0xf1e4cb),
      mitten = material(0xf7dfbd),
      seam = material(0xfff1d3);
    const mesh = (
      geometry: T.BufferGeometry,
      mat: T.Material,
      parent: T.Object3D,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
    ) => {
      const m = new T.Mesh(geometry, mat);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      parent.add(m);
      return m;
    };
    this.group.add(this.torso);
    mesh(capsule, shirt, this.torso, 0, 0.79, 0, 0.29, 0.24, 0.21);
    mesh(sphere, seam, this.torso, 0, 1.13, 0.015, 0.13, 0.035, 0.12);
    for (const s of [-1, 1]) {
      const leg = new T.Group();
      leg.position.set(s * 0.135, 0.43, 0);
      this.group.add(leg);
      this.legs.push(leg);
      mesh(capsule, trousers, leg, 0, -0.16, 0, 0.095, 0.13, 0.1);
      mesh(sphere, shoe, leg, 0, -0.35, 0.055, 0.115, 0.08, 0.17);
      const upper = mesh(segment, shirt, this.group, 0, 0, 0, 0.09, 1, 0.09),
        lower = mesh(segment, shirt, this.group, 0, 0, 0, 0.078, 1, 0.078),
        hand = mesh(sphere, mitten, this.group, 0, 0, 0, 0.095, 0.095, 0.095);
      this.arms.push({ upper, lower, hand, side: s });
    }
    mesh(sphere, seam, this.torso, 0, 0.78, 0.207, 0.032, 0.032, 0.015);
    this.held = createKrathong(item.design ?? 0);
    this.group.add(this.held.group);
    this.held.group.scale.setScalar(0.52);
    // A water reflection is not part of a carried object.
    this.held.group.traverse((o) => {
      if (o instanceof T.Mesh && o.geometry.type === "PlaneGeometry")
        o.visible = false;
    });
    this.head.className = "ceremony-avatar-head";
    this.head.style.visibility = "hidden";
    this.head.dataset.actorId = item.id;
    this.head.dataset.entrySide = side === -1 ? "left" : "right";
    this.head.dataset.outfitColor = color.toString(16).padStart(6, "0");
    this.photo = document.createElement("img");
    this.photo.alt = `อวตาร์ของ ${item.name}`;
    this.photo.draggable = false;
    this.photo.onerror = () => {
      this.photo.onerror = null;
      this.photo.src = defaultAvatar(item.name);
    };
    this.photo.src = photo || defaultAvatar(item.name);
    const name = document.createElement("span");
    name.textContent = item.name;
    this.head.append(name, this.photo);
    this.group.name = "Walking krathong avatar";
  }
  private bone(mesh: T.Mesh, start: T.Vector3, end: T.Vector3, radius: number) {
    const direction = end.clone().sub(start);
    mesh.position.copy(start).add(end).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      direction.clone().normalize(),
    );
    mesh.scale.set(radius, direction.length(), radius);
  }
  update(
    delta: number,
    reduced: boolean,
    camera: T.Camera,
    width: number,
    height: number,
  ) {
    if (this.disposed) return;
    if (reduced && !this.reduced && this.elapsed > 0)
      this.elapsed = this.released ? 0.2 : 0;
    if (this.reduced && !reduced) this.elapsed = this.released ? 7.3 : 0;
    this.reduced = reduced;
    this.elapsed += delta;
    const p = ceremonyPose(this.elapsed, this.side, reduced);
    this.group.position.set(p.x, 0.13 + p.bob, p.z);
    this.group.rotation.y = p.yaw;
    this.torso.position.y = -p.bend * 0.16;
    this.torso.rotation.x = p.bend * 0.52;
    this.torso.updateMatrix();
    this.legs.forEach((leg, i) => {
      leg.rotation.x = (i === 0 ? 1 : -1) * p.stride;
      leg.position.y = 0.43;
    });
    this.held.group.position.set(0, p.carryY, p.carryZ);
    for (const arm of this.arms) {
      const shoulder = new T.Vector3(arm.side * 0.28, 1.02, 0).applyMatrix4(
        this.torso.matrix,
      );
      const hand = new T.Vector3(
        arm.side * 0.31,
        p.carryY + 0.12,
        p.carryZ - 0.03,
      );
      const elbow = shoulder.clone().lerp(hand, 0.53);
      elbow.x += arm.side * 0.04;
      elbow.y -= 0.08;
      this.bone(arm.upper, shoulder, elbow, 0.09);
      this.bone(arm.lower, elbow, hand, 0.078);
      arm.hand.position.copy(hand);
    }
    this.group.updateMatrixWorld(true);
    const headWorld = this.group.localToWorld(
      new T.Vector3(0, 1.48, 0).applyMatrix4(this.torso.matrix),
    );
    const screen = headWorld.clone().project(camera);
    const upper = headWorld
      .clone()
      .add(new T.Vector3(0, 0.37, 0))
      .project(camera);
    const diameter = Math.max(
      22,
      Math.min(52, Math.abs(upper.y - screen.y) * height),
    );
    this.head.style.visibility = "visible";
    this.head.style.width = `${diameter}px`;
    this.head.style.transform = `translate(-50%,-50%) translate(${(screen.x * 0.5 + 0.5) * width}px,${(-screen.y * 0.5 + 0.5) * height}px)`;
    if (p.phase !== this.lastPhase) {
      this.lastPhase = p.phase;
      this.head.dataset.phase = p.phase;
      window.dispatchEvent(
        new CustomEvent("ceremony-phase", {
          detail: { id: this.item.id, phase: p.phase },
        }),
      );
    }
    if (!this.released && this.elapsed >= p.releaseAt) {
      this.released = true;
      const origin = this.held.group.getWorldPosition(new T.Vector3());
      this.held.group.visible = false;
      this.onRelease(origin, 0.52);
    }
    if (p.phase === "done") {
      this.dispose();
      this.onDone();
    }
  }
  finish() {
    if (!this.released) {
      this.group.updateMatrixWorld(true);
      this.released = true;
      this.onRelease(new T.Vector3(-0.8, 0.035, 1.07), 0.52);
    }
    this.dispose();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.head.remove();
    this.photo.onerror = null;
    this.held.group.removeFromParent();
    disposeModel(this.held);
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.group.removeFromParent();
  }
}

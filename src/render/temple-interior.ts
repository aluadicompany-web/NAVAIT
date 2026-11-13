import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export class TempleInterior {
  readonly group = new T.Group();
  private flameMeshes: T.Mesh[] = [];
  private resources: T.BufferGeometry[] = [];
  constructor() {
    const raw = new T.Group(),
      materials = new Map<number, T.MeshStandardMaterial>();
    const box = new T.BoxGeometry(),
      sphere = new T.SphereGeometry(1, 12, 8),
      cylinder = new T.CylinderGeometry(1, 1, 1, 20),
      cone = new T.ConeGeometry(1, 1, 16);
    this.resources.push(box, sphere, cylinder, cone);
    const part = (
      geo: T.BufferGeometry,
      color: number,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      if (!materials.has(color))
        materials.set(color, new T.MeshStandardMaterial({ color }));
      const m = new T.Mesh(geo, materials.get(color)!);
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sz);
      m.rotation.set(rx, ry, rz);
      raw.add(m);
      return m;
    };
    const block = (
      c: number,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
    ) => part(box, c, x, y, z, w, h, d);
    block(0xc8b397, 0, -0.12, -0.7, 12.5, 0.24, 16.6);
    // Polished tiled floor, cream walls, maroon lacquer panels and gold trim.
    for (let x = -6; x <= 6; x++)
      block(0xa59883, x, 0.006, -0.7, 0.012, 0.012, 16.5);
    for (let z = -9; z <= 7; z++)
      block(0xa59883, 0, 0.006, z, 12.5, 0.012, 0.012);
    block(0xf0dfbf, 0, 2.4, -9, 12.5, 4.8, 0.2);
    for (const side of [-1, 1]) {
      block(0xe3d0ae, side * 6.2, 2.1, -0.7, 0.2, 4.2, 16.6);
      block(0x703f3e, side * 6.05, 0.65, -0.7, 0.12, 1.3, 16.6);
      block(0xc5a15a, side * 5.97, 1.35, -0.7, 0.1, 0.08, 16.5);
      block(0xc7a66c, side * 6.0, 4.1, -0.7, 0.2, 0.18, 16.5);
      for (const z of [-6.5, -2.5, 1.5, 5.5]) {
        part(cylinder, 0x773b35, side * 5.45, 2.2, z, 0.22, 4.4, 0.22);
        part(cylinder, 0xdab866, side * 5.45, 0.22, z, 0.34, 0.4, 0.34);
        part(cylinder, 0xe6c57b, side * 5.45, 4.25, z, 0.36, 0.3, 0.36);
        block(0xa07846, side * 5.99, 2.55, z, 0.15, 2.25, 1.1);
        block(0xffdb95, side * 5.89, 2.55, z, 0.08, 1.98, 0.82);
        for (const dz of [-0.25, 0, 0.25])
          block(0x825734, side * 5.82, 2.55, z + dz, 0.09, 1.98, 0.035);
      }
    }
    block(0x6c3336, 0, 2.3, -8.86, 7.7, 4.5, 0.08);
    for (const x of [-3.95, 3.95])
      block(0xe2bb66, x, 2.3, -8.77, 0.12, 4.5, 0.08);
    for (const y of [0.12, 4.5]) block(0xe2bb66, 0, y, -8.77, 8, 0.12, 0.08);
    // Restrained lotus pattern behind the principal image.
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 11; col++) {
        const x = -3.5 + col * 0.7 + (row % 2) * 0.15,
          y = 0.5 + row * 0.8;
        part(sphere, 0xb58c4b, x, y, -8.69, 0.055, 0.11, 0.015);
      }
    block(0x983f40, 0, 0.025, 2.0, 3.2, 0.04, 10.5);
    for (const x of [-1.6, 1.6]) block(0xd6b16b, x, 0.05, 2, 0.06, 0.045, 10.5);
    for (const z of [-1.6, 1.1, 3.8])
      for (const x of [-3.4, -1.1, 1.1, 3.4]) {
        block(0x9f5650, x, 0.055, z, 0.95, 0.08, 0.8);
        block(0xd1a56b, x, 0.1, z, 0.85, 0.018, 0.7);
      }
    // Three-tier lotus dais and a seated Buddha with robe, ushnisha and halo.
    for (let i = 0; i < 3; i++)
      part(
        cylinder,
        [0xa87332, 0xd0a545, 0xe5bd67][i],
        0,
        0.17 + i * 0.2,
        -6.5,
        2 - i * 0.25,
        0.22,
        1.5 - i * 0.18,
      );
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI) / 10;
      part(
        sphere,
        0xe8c16e,
        Math.cos(a) * 1.55,
        0.54,
        -6.5 + Math.sin(a) * 1.1,
        0.19,
        0.19,
        0.12,
        0,
        -a,
      );
    }
    const gold = 0xdcb15a;
    part(sphere, gold, -0.55, 0.97, -6.1, 0.94, 0.27, 0.48, 0, 0, 0.06);
    part(sphere, gold, 0.55, 0.97, -6.1, 0.94, 0.27, 0.48, 0, 0, -0.06);
    part(sphere, gold, 0, 1.8, -6.5, 0.67, 0.94, 0.39);
    part(sphere, 0xc18a37, 0.18, 1.7, -6.28, 0.45, 0.77, 0.13, 0, 0, -0.25);
    part(cylinder, gold, 0, 2.6, -6.5, 0.19, 0.35, 0.19);
    part(sphere, 0xe6bc68, 0, 3.13, -6.5, 0.43, 0.55, 0.37);
    for (const side of [-1, 1]) {
      part(sphere, gold, side * 0.44, 3.03, -6.5, 0.11, 0.3, 0.1);
      part(sphere, 0x7a592c, side * 0.155, 3.16, -6.15, 0.1, 0.015, 0.018);
    }
    part(sphere, gold, 0, 3.05, -6.1, 0.065, 0.12, 0.05);
    part(sphere, 0x8f602c, 0, 2.9, -6.15, 0.11, 0.016, 0.016);
    part(sphere, 0xac813a, 0, 3.61, -6.53, 0.32, 0.22, 0.28);
    part(cone, gold, 0, 3.96, -6.53, 0.1, 0.46, 0.1);
    part(sphere, gold, -0.62, 1.85, -6.42, 0.18, 0.62, 0.18, 0, 0, -0.23);
    part(sphere, gold, 0.69, 1.58, -6.22, 0.16, 0.63, 0.15, 0, 0, 0.15);
    part(sphere, gold, -0.15, 1.2, -5.94, 0.44, 0.1, 0.2);
    part(sphere, gold, 0.72, 0.99, -5.86, 0.15, 0.28, 0.1);
    const halo = new T.TorusGeometry(1.16, 0.035, 5, 48);
    this.resources.push(halo);
    part(halo, 0xf0cc77, 0, 3.08, -6.98, 1, 1, 1);
    // Offering tables, candles, incense and flower vases remain behind the walking area.
    for (const x of [-2.8, 2.8]) {
      block(0x794333, x, 0.58, -5.5, 1.1, 0.12, 0.65);
      for (const dx of [-0.42, 0.42])
        block(0x694535, x + dx, 0.3, -5.5, 0.08, 0.6, 0.45);
      part(cylinder, 0xe4bf78, x, 0.89, -5.5, 0.15, 0.5, 0.15);
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9;
        part(
          sphere,
          0xf6e8c8,
          x + Math.cos(a) * 0.19,
          1.2 + (i % 3) * 0.07,
          -5.5 + Math.sin(a) * 0.16,
          0.11,
          0.12,
          0.11,
        );
      }
    }
    block(0x7b4934, 0, 0.4, -4.7, 2.2, 0.65, 0.6);
    block(0xdeba68, 0, 0.78, -4.7, 2.4, 0.12, 0.75);
    part(cylinder, 0x896238, 0, 0.99, -4.7, 0.23, 0.3, 0.23);
    for (let i = 0; i < 5; i++)
      part(cylinder, 0x694632, (i - 2) * 0.055, 1.36, -4.7, 0.008, 0.6, 0.008);
    for (const x of [-0.86, 0.86]) {
      part(cylinder, 0xcfab5d, x, 0.95, -4.7, 0.14, 0.25, 0.14);
      part(cylinder, 0xffe4ab, x, 1.16, -4.7, 0.055, 0.32, 0.055);
      const flame = new T.Mesh(
        sphere,
        new T.MeshBasicMaterial({ color: 0xffd17a }),
      );
      flame.position.set(x, 1.37, -4.7);
      flame.scale.set(0.045, 0.1, 0.045);
      this.group.add(flame);
      this.flameMeshes.push(flame);
    }
    raw.updateMatrixWorld(true);
    const geometries: T.BufferGeometry[] = [];
    raw.traverse((obj) => {
      if (!(obj instanceof T.Mesh)) return;
      const base = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
      base.deleteAttribute("uv");
      const geo = base.index ? base.toNonIndexed() : base;
      if (geo !== base) base.dispose();
      const color = (obj.material as T.MeshStandardMaterial).color,
        colors = new Float32Array(geo.getAttribute("position").count * 3);
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }
      geo.setAttribute("color", new T.BufferAttribute(colors, 3));
      geometries.push(geo);
    });
    const merged = mergeGeometries(geometries);
    if (!merged) throw Error("Temple interior geometry failed");
    this.group.add(
      new T.Mesh(
        merged,
        new T.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.65,
          metalness: 0.05,
        }),
      ),
    );
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.group.add(new T.HemisphereLight(0xffedcf, 0x6b5146, 2.4));
    const front = new T.DirectionalLight(0xffe7b5, 3);
    front.position.set(-3, 7, 5);
    this.group.add(front);
    const goldLight = new T.PointLight(0xffd18a, 28, 15, 2);
    goldLight.position.set(0, 4, -4.2);
    this.group.add(goldLight);
  }
  update(time: number) {
    this.flameMeshes.forEach(
      (m, i) =>
        (m.scale.y =
          0.1 *
          (1 + 0.08 * Math.sin(time * 4 + i) + 0.025 * Math.sin(time * 7))),
    );
  }
  dispose() {
    const geos = new Set<T.BufferGeometry>(),
      mats = new Set<T.Material>();
    this.group.traverse((o) => {
      if (o instanceof T.Mesh) {
        geos.add(o.geometry);
        mats.add(o.material as T.Material);
      }
    });
    this.resources.forEach((g) => geos.add(g));
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
  }
}

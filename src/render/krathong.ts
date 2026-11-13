import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { designs } from "../catalog";
const sphere = new T.SphereGeometry(1, 10, 7);
const cylinder = new T.CylinderGeometry(1, 1, 1, 24);

const petal = new T.BufferGeometry();
const vertices: number[] = [],
  indices: number[] = [];
for (let row = 0; row <= 8; row++) {
  const t = row / 8;
  for (let col = 0; col <= 6; col++) {
    const u = col / 3 - 1;
    vertices.push(
      u * Math.sin(Math.PI * t) * 0.5,
      0.45 * t * t + 0.1 * (1 - u * u),
      t,
    );
  }
}
for (let row = 0; row < 8; row++)
  for (let col = 0; col < 6; col++) {
    const i = row * 7 + col;
    indices.push(i, i + 7, i + 1, i + 1, i + 7, i + 8);
  }
petal.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
petal.setIndex(indices);
petal.computeVertexNormals();

const cone = new T.ConeGeometry(1, 1, 10);
const materials = new Map<string, T.MeshStandardMaterial>();
function material(color: number) {
  const key = String(color);
  if (!materials.has(key))
    materials.set(
      key,
      new T.MeshStandardMaterial({
        color,
        roughness: 0.58,
        metalness: 0.03,
        side: T.DoubleSide,
      }),
    );
  return materials.get(key)!;
}
export type Model = { group: T.Group; flame: T.Mesh; glow: T.Sprite };
const glowCanvas = document.createElement("canvas");
glowCanvas.width = glowCanvas.height = 64;
const gc = glowCanvas.getContext("2d")!;
const gradient = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
gradient.addColorStop(0, "rgba(255,218,118,.7)");
gradient.addColorStop(0.25, "rgba(255,167,56,.25)");
gradient.addColorStop(1, "rgba(255,140,40,0)");
gc.fillStyle = gradient;
gc.fillRect(0, 0, 64, 64);
const glowMaterial = new T.SpriteMaterial({
  map: new T.CanvasTexture(glowCanvas),
  transparent: true,
  depthWrite: false,
  blending: T.AdditiveBlending,
});
const reflectionMaterial = new T.MeshBasicMaterial({
  map: glowMaterial.map,
  transparent: true,
  depthWrite: false,
  blending: T.AdditiveBlending,
  opacity: 0.35,
});
const reflectionGeometry = new T.PlaneGeometry(2.8, 2.8);
const flameMaterial = new T.MeshBasicMaterial({ color: 0xffdf88 });
// Procedural Thai craft-inspired models: merged by material to limit draw calls.
export function createKrathong(index: number): Model {
  const design = designs[index] || designs[0],
    root = new T.Group(),
    raw = new T.Group();
  function part(
    geometry: T.BufferGeometry,
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
  ) {
    const m = new T.Mesh(geometry, material(color));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx, ry, rz);
    raw.add(m);
    return m;
  }
  function ring(
    count: number,
    radius: number,
    y: number,
    color: number,
    size = 0.13,
  ) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      part(
        sphere,
        color,
        Math.cos(a) * radius,
        y,
        Math.sin(a) * radius,
        size,
        size * 0.75,
        size,
      );
    }
  }
  function leaves(count: number, radius: number, y: number, scale = 1) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      part(
        cone,
        i % 2 ? 0x408c54 : 0x286745,
        Math.cos(a) * radius,
        y,
        Math.sin(a) * radius,
        0.19 * scale,
        0.62 * scale,
        0.075 * scale,
        Math.sin(a) * 0.35,
        0,
        -Math.cos(a) * 0.35,
      );
    }
  }
  function lotus(
    count: number,
    radius: number,
    y: number,
    color: number,
    size = 0.4,
  ) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      part(
        petal,
        color,
        Math.cos(a) * radius * 0.3,
        y,
        Math.sin(a) * radius * 0.3,
        size * 1.4,
        size * 1.3,
        size * 1.65,
        0,
        Math.PI / 2 - a,
        0,
      );
    }
  }

  function flower(x: number, z: number, y: number, color: number, size = 0.17) {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      part(
        sphere,
        color,
        x + Math.cos(a) * size * 0.65,
        y,
        z + Math.sin(a) * size * 0.65,
        size * 0.55,
        size * 0.28,
        size * 0.55,
      );
    }
    part(sphere, 0xffc34b, x, y + 0.025, z, size * 0.3, 0.05, size * 0.3);
  }
  part(cylinder, 0x3c7551, 0, 0.08, 0, 0.73, 0.17, 0.73);
  ring(28, 0.68, 0.16, 0x85a55a, 0.06);
  switch (design.kind) {
    case "leaf":
      leaves(16, 0.61, 0.38);
      leaves(12, 0.42, 0.34, 0.7);
      ring(14, 0.35, 0.36, design.color, 0.11);
      ring(9, 0.2, 0.36, 0xffd65b, 0.09);
      break;
    case "lotus":
      lotus(10, 0.43, 0.32, 0xbd5286, 0.49);
      lotus(8, 0.29, 0.44, design.color, 0.4);
      lotus(6, 0.16, 0.5, 0xffc5d5, 0.28);
      break;
    case "tiered":
      for (let j = 0; j < 3; j++) {
        lotus(
          12 - j * 2,
          0.51 - j * 0.16,
          0.28 + j * 0.19,
          [0x8960b3, 0xb18cdd, 0xe5ccff][j],
          0.4 - j * 0.06,
        );
      }
      break;
    case "marigold":
      leaves(12, 0.62, 0.3, 0.65);
      for (let i = 0; i < 9; i++) {
        const a = (i * Math.PI * 2) / 9,
          x = Math.cos(a) * 0.43,
          z = Math.sin(a) * 0.43;
        for (let j = 0; j < 8; j++) {
          const b = (j * Math.PI) / 4;
          part(
            sphere,
            j % 2 ? 0xf2a62b : 0xffcf48,
            x + Math.cos(b) * 0.08,
            0.31 + (j % 2) * 0.04,
            z + Math.sin(b) * 0.08,
            0.1,
            0.12,
            0.1,
          );
        }
      }
      ring(10, 0.2, 0.34, 0xffd34c, 0.1);
      break;
    case "jasmine":
      leaves(16, 0.62, 0.34, 0.8);
      ring(24, 0.48, 0.36, 0xfff4da, 0.085);
      ring(18, 0.3, 0.37, 0xfffbef, 0.075);
      for (let i = 0; i < 8; i++) {
        let a = (i * Math.PI) / 4;
        for (let j = 0; j < 4; j++)
          part(
            sphere,
            0xfff6df,
            Math.cos(a) * 0.68,
            0.25 - j * 0.09,
            Math.sin(a) * 0.68,
            0.06,
            0.065,
            0.06,
          );
      }
      break;
    case "orchid":
      leaves(14, 0.58, 0.32, 0.85);
      for (let i = 0; i < 7; i++) {
        let a = (i * Math.PI * 2) / 7;
        flower(
          Math.cos(a) * 0.4,
          Math.sin(a) * 0.4,
          0.39,
          i % 2 ? 0xd5a2ed : 0x9e51bc,
          0.23,
        );
      }
      break;
    case "coconut":
      part(sphere, 0x6c422b, 0, 0.1, 0, 0.7, 0.32, 0.7);
      part(cylinder, 0xb78957, 0, 0.26, 0, 0.64, 0.07, 0.64);
      part(cylinder, 0xf1dfb5, 0, 0.31, 0, 0.56, 0.04, 0.56);
      for (let i = 0; i < 7; i++) {
        let a = (i * Math.PI * 2) / 7;
        flower(
          Math.cos(a) * 0.39,
          Math.sin(a) * 0.39,
          0.35,
          i % 2 ? 0xffe1af : 0xf3a19c,
          0.15,
        );
      }
      break;
    case "bread":
      part(cylinder, 0xc4813e, 0, 0.13, 0, 0.75, 0.26, 0.75);
      for (let i = 0; i < 8; i++) {
        let a = (i * Math.PI) / 4;
        part(
          sphere,
          0xe9b875,
          Math.cos(a) * 0.43,
          0.3,
          Math.sin(a) * 0.43,
          0.29,
          0.2,
          0.29,
        );
        part(
          sphere,
          0xf5d59c,
          Math.cos(a) * 0.43,
          0.36,
          Math.sin(a) * 0.43,
          0.2,
          0.1,
          0.2,
        );
      }
      ring(8, 0.21, 0.32, 0xad6d35, 0.08);
      break;
    case "swan":
      leaves(12, 0.59, 0.28, 0.65);
      part(sphere, 0x9ac17b, 0, 0.36, 0, 0.48, 0.23, 0.58);
      for (const side of [-1, 1])
        for (let i = 0; i < 5; i++)
          part(
            cone,
            0xb6d497,
            side * (0.28 + i * 0.035),
            0.5 + i * 0.05,
            0.22 - i * 0.11,
            0.12,
            0.48,
            0.06,
            -0.6,
            0,
            side * -0.5,
          );
      part(sphere, 0xc9e2a4, 0, 0.71, -0.4, 0.12, 0.38, 0.12, -0.25);
      part(sphere, 0xd4e9b4, 0, 1.02, -0.52, 0.17, 0.14, 0.19);
      part(cone, 0xd9b763, 0, 0.99, -0.76, 0.08, 0.23, 0.06, -Math.PI / 2);
      for (const side of [-1, 1])
        part(sphere, 0x172e27, side * 0.14, 1.06, -0.57, 0.025, 0.025, 0.025);
      break;
  }
  const candleY = design.kind === "tiered" ? 0.7 : 0.43;
  part(cylinder, 0xffdf9c, 0, candleY, 0, 0.055, 0.48, 0.055);
  part(cylinder, 0x4e3429, 0, candleY + 0.26, 0, 0.012, 0.06, 0.012);
  for (let i = 0; i < 3; i++)
    part(
      cylinder,
      0x6c4231,
      0.15 + i * 0.045,
      0.6,
      -0.1,
      0.012,
      0.7,
      0.012,
      0,
      0,
      -0.08,
    );
  raw.updateMatrixWorld(true);
  const batches = new Map<T.Material, T.BufferGeometry[]>();
  raw.traverse((obj) => {
    if (obj instanceof T.Mesh) {
      const transformed = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
      const g = transformed.index ? transformed.toNonIndexed() : transformed;
      if (g !== transformed) transformed.dispose();
      const list = batches.get(obj.material) || [];
      list.push(g);
      batches.set(obj.material, list);
    }
  });
  for (const [mat, geometries] of batches) {
    const merged = mergeGeometries(geometries);
    if (merged) root.add(new T.Mesh(merged, mat));
    geometries.forEach((g) => g.dispose());
  }
  const flame = new T.Mesh(sphere, flameMaterial);
  flame.position.set(0, candleY + 0.36, 0);
  flame.scale.set(0.055, 0.14, 0.055);
  root.add(flame);
  const reflection = new T.Mesh(reflectionGeometry, reflectionMaterial);
  reflection.rotation.x = -Math.PI / 2;
  reflection.position.y = -0.025;
  root.add(reflection);
  const glow = new T.Sprite(glowMaterial);
  glow.position.copy(flame.position);
  glow.scale.set(1.15, 1.15, 1);
  root.add(glow);
  return { group: root, flame, glow };
}
export function disposeModel(model: Model) {
  model.group.traverse((o) => {
    if (
      o instanceof T.Mesh &&
      o.geometry !== sphere &&
      o.geometry !== reflectionGeometry
    )
      o.geometry.dispose();
  });
}

import * as T from "three";
import { LAUNCH_SITE } from "../navigation";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** A low waterside landing and Thai temple, drawn in material batches. */
export class Festival {
  readonly group = new T.Group();
  readonly launchPoint = new T.Vector3(LAUNCH_SITE.x, 0, LAUNCH_SITE.z);
  private glowTime = { value: 0 };
  private pierLight = new T.PointLight(0xffc57b, 8, 9, 2);
  private templeLight = new T.PointLight(0xffd392, 12, 12, 2);
  private materials = new Map<string, T.MeshStandardMaterial>();
  private lanterns: T.InstancedMesh;
  private flames: T.InstancedMesh;
  private rims: T.InstancedMesh;
  private glows: T.InstancedMesh;
  private shoreGlows: T.InstancedMesh;
  private texture: T.CanvasTexture;
  private previousTime = -1;
  private previousMobile = false;
  constructor() {
    const raw = new T.Group(),
      originals = new Set<T.BufferGeometry>();
    const box = new T.BoxGeometry(),
      cylinder = new T.CylinderGeometry(1, 1, 1, 12),
      cone = new T.ConeGeometry(1, 1, 16),
      sphere = new T.SphereGeometry(1, 6, 5);
    [box, cylinder, cone, sphere].forEach((g) => originals.add(g));
    const mat = (color: number, glow = false) => {
      const key = `${color}-${glow}`;
      if (!this.materials.has(key))
        this.materials.set(
          key,
          new T.MeshStandardMaterial({
            color: new T.Color(color).multiplyScalar(glow ? 0.75 : 0.3),
            roughness: 0.8,
            metalness: glow ? 0.08 : 0,
            side: T.DoubleSide,
            emissive: glow ? color : 0,
            emissiveIntensity: glow ? 0.75 : 0,
          }),
        );
      return this.materials.get(key)!;
    };
    const part = (
      geometry: T.BufferGeometry,
      color: number,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      glow = false,
      rx = 0,
      ry = 0,
      rz = 0,
    ) => {
      const mesh = new T.Mesh(geometry, mat(color, glow));
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.rotation.set(rx, ry, rz);
      raw.add(mesh);
      return mesh;
    };
    const block = (
      color: number,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      glow = false,
    ) => part(box, color, x, y, z, w, h, d, glow);
    const tube = (
      points: T.Vector3[],
      color: number,
      radius = 0.025,
      glow = false,
    ) => {
      const geometry = new T.TubeGeometry(
        new T.CatmullRomCurve3(points),
        points.length > 12 ? 20 : 8,
        radius,
        3,
        false,
      );
      originals.add(geometry);
      part(geometry, color, 0, 0, 0, 1, 1, 1, glow);
    };
    function roofGeometry(width: number, depth: number, rise: number) {
      const geometry = new T.BufferGeometry(),
        v: number[] = [],
        indices: number[] = [];
      for (let row = 0; row <= 1; row++)
        for (let i = 0; i <= 20; i++) {
          const u = i / 10 - 1;
          v.push(
            (u * width) / 2,
            rise * (1 - Math.pow(Math.abs(u), 0.82)) +
              0.16 * Math.pow(Math.abs(u), 8),
            (row - 0.5) * depth,
          );
        }
      for (let i = 0; i < 20; i++)
        indices.push(i, i + 21, i + 1, i + 1, i + 21, i + 22);
      geometry.setAttribute("position", new T.Float32BufferAttribute(v, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    }
    const roof = (
      x: number,
      z: number,
      y: number,
      width: number,
      depth: number,
      rise: number,
      color: number,
    ) => {
      const geometry = roofGeometry(width, depth, rise);
      originals.add(geometry);
      part(geometry, color, x, y, z, 1, 1, 1);
      for (const side of [-1, 1]) {
        const points = [];
        for (let i = 0; i <= 20; i++) {
          const u = i / 10 - 1;
          points.push(
            new T.Vector3(
              x + (u * width) / 2,
              y +
                rise * (1 - Math.pow(Math.abs(u), 0.82)) +
                0.16 * Math.pow(Math.abs(u), 8) +
                0.025,
              z + (side * depth) / 2,
            ),
          );
        }
        tube(points, 0xdcae57, 0.035, true);
      }
      for (const side of [-1, 1]) {
        tube(
          [
            new T.Vector3(x, y + rise, z + (side * depth) / 2),
            new T.Vector3(x, y + rise + 0.27, z + side * (depth / 2 + 0.12)),
            new T.Vector3(
              x + 0.08,
              y + rise + 0.43,
              z + side * (depth / 2 + 0.23),
            ),
          ],
          0xe2bc6b,
          0.035,
        );
      }
      for (const side of [-1, 1])
        for (const end of [-1, 1]) {
          tube(
            [
              new T.Vector3(
                x + (side * width) / 2,
                y + 0.16,
                z + (end * depth) / 2,
              ),
              new T.Vector3(
                x + side * (width / 2 + 0.13),
                y + 0.3,
                z + (end * depth) / 2,
              ),
              new T.Vector3(
                x + side * (width / 2 + 0.12),
                y + 0.45,
                z + (end * depth) / 2,
              ),
            ],
            0xddaf56,
            0.025,
          );
        }
      // Tile ribs follow the roof slope without a texture download.
      const ribs = width < 1 ? 0 : width < 2.5 ? 4 : 7;
      for (let i = 1; i < ribs; i++) {
        const zz = z - depth / 2 + (depth * i) / ribs;
        for (const side of [-1, 1])
          tube(
            [
              new T.Vector3(x, y + rise + 0.014, zz),
              new T.Vector3(x + side * width * 0.25, y + rise * 0.45, zz),
              new T.Vector3(x + side * width * 0.5, y + 0.18, zz),
            ],
            0x9b4a35,
            0.009,
          );
      }
    };
    // The bank rises only slightly above the water. The landing is lower still.
    block(0x243d36, 0, -0.16, -5.3, 70, 0.42, 3.9);
    block(0x51624a, 0, 0.065, -5.3, 70, 0.08, 3.8);
    block(0x8b8161, 0, 0.12, -3.55, 50, 0.12, 0.5);
    block(0x9a8c6b, 0, 0.12, -5.0, 10, 0.08, 2.3);
    for (let i = 0; i < 35; i++)
      block(i % 2 ? 0x706c53 : 0x7d755b, -17 + i, 0, -3.34, 0.94, 0.22, 0.14);

    const hall = (x: number, z: number, size: number) => {
      block(0x8d6852, x, 0.23, z, 4.8 * size, 0.36 * size, 3.2 * size);
      block(0xc8b993, x, 0.45, z, 4.55 * size, 0.18 * size, 3.0 * size);
      block(
        0xe4d5ac,
        x,
        0.98 * size + 0.25,
        z,
        4.1 * size,
        1.35 * size,
        2.55 * size,
      );
      block(
        0x6b3f31,
        x,
        0.98 * size + 0.25,
        z + 1.29 * size,
        3.65 * size,
        1.1 * size,
        0.05,
      );
      for (const side of [-1, 1])
        for (let i = 0; i < 4; i++) {
          const xx = x + (-1.8 + i * 1.2) * size;
          part(
            cylinder,
            0xd2a955,
            xx,
            0.99 * size + 0.25,
            z + side * 1.35 * size,
            0.065 * size,
            1.4 * size,
            0.065 * size,
          );
          block(
            0xf3d28b,
            xx,
            1.7 * size + 0.25,
            z + side * 1.35 * size,
            0.18 * size,
            0.08 * size,
            0.18 * size,
          );
        }
      for (let i = -1; i <= 1; i++) {
        const xx = x + i * 1.05 * size;
        block(
          0xb88a46,
          xx,
          1.03 * size + 0.2,
          z + 1.325 * size,
          0.58 * size,
          1.03 * size,
          0.035,
        );
        block(
          0xffd17c,
          xx,
          1.02 * size + 0.2,
          z + 1.35 * size,
          0.39 * size,
          0.85 * size,
          0.02,
          true,
        );
        part(
          cone,
          0xffd17c,
          xx,
          1.51 * size + 0.2,
          z + 1.35 * size,
          0.22 * size,
          0.22 * size,
          0.025 * size,
          true,
        );
      }
      for (let level = 0; level < 3; level++)
        roof(
          x,
          z,
          1.65 * size + 0.22 + level * 0.3 * size,
          (5.05 - level * 0.68) * size,
          (3.3 - level * 0.35) * size,
          (0.68 - level * 0.1) * size,
          level % 2 ? 0x9e3d30 : 0xb34b35,
        );
      // Golden carved pediment facing the river.
      const pediment = new T.BufferGeometry();
      pediment.setAttribute(
        "position",
        new T.Float32BufferAttribute(
          [-1.6 * size, 0, 0, 1.6 * size, 0, 0, 0, 0.59 * size, 0],
          3,
        ),
      );
      pediment.computeVertexNormals();
      originals.add(pediment);
      part(pediment, 0xdcb663, x, 1.86 * size + 0.22, z + 1.55 * size, 1, 1, 1);
      part(
        sphere,
        0xf4d18a,
        x,
        2.1 * size + 0.22,
        z + 1.56 * size,
        0.12 * size,
        0.21 * size,
        0.025 * size,
        true,
      );
      for (let i = 0; i < 3; i++)
        block(
          0xc0ac83,
          x,
          0.13 + i * 0.08,
          z + 1.9 * size - i * 0.17,
          2.6 * size - i * 0.2,
          0.12,
          0.32,
        );
    };
    hall(0, -4.9, 0.8);
    hall(-7.4, -6, 0.65);
    hall(7.6, -6, 0.65);
    // Bell-shaped Thai chedis with tiered bases and slender golden spires.
    for (const x of [-4.9, 4.9]) {
      block(0xa88d60, x, 0.2, -5.6, 1.7, 0.28, 1.7);
      for (let i = 0; i < 3; i++)
        part(
          cylinder,
          0xd0b77e,
          x,
          0.4 + i * 0.15,
          -5.6,
          0.86 - i * 0.11,
          0.16,
          0.86 - i * 0.11,
        );
      part(sphere, 0xe3bf6e, x, 1.03, -5.6, 0.57, 0.66, 0.57);
      part(cone, 0xd9af57, x, 1.75, -5.6, 0.42, 1.2, 0.42);
      for (let i = 0; i < 6; i++)
        part(
          cylinder,
          0xf2ce78,
          x,
          1.5 + i * 0.15,
          -5.6,
          0.27 - i * 0.035,
          0.065,
          0.27 - i * 0.035,
        );
      part(cone, 0xf3d28b, x, 2.65, -5.6, 0.095, 0.85, 0.095, true);
    }
    // Wooden jetty: deck ~20 cm above the water, no high platform.
    block(0x4d3e2e, -0.8, 0.015, -1.67, 2.4, 0.16, 3.4);
    for (let i = 0; i < 17; i++)
      block(
        i % 2 ? 0x9c7950 : 0xa98657,
        -0.8,
        0.105,
        -3.2 + i * 0.19,
        2.35,
        0.035,
        0.17,
      );
    for (const x of [-1.94, 0.34])
      for (const z of [-3.1, -1.7, -0.25]) {
        part(cylinder, 0x745739, x, 0.28, z, 0.055, 0.9, 0.055);
        if (z !== -0.25) {
          block(0x563e29, x, 0.81, z, 0.19, 0.24, 0.19);
          block(0xffd080, x, 0.82, z, 0.13, 0.16, 0.13, true);
          roof(x, z, 0.95, 0.36, 0.3, 0.13, 0x794532);
        }
      }
    for (const x of [-1.94, 0.34])
      tube(
        [
          new T.Vector3(x, 0.55, -3.1),
          new T.Vector3(x, 0.43, -2.4),
          new T.Vector3(x, 0.55, -1.7),
          new T.Vector3(x, 0.37, -0.95),
          new T.Vector3(x, 0.5, -0.25),
        ],
        0xb99c66,
        0.018,
      );
    block(0xb19061, -0.8, 0.055, 0.12, 2.15, 0.08, 0.3);
    // Fair stalls, trees and strings of warm lights along the shore.
    for (const side of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const x = side * (9.5 + i * 2.4),
          z = -4.8 - (i % 2) * 0.5;
        block(0x8f6244, x, 0.45, z, 1.5, 0.7, 1.1);
        block(0xffce83, x, 0.82, z + 0.58, 1.2, 0.18, 0.035, true);
        roof(x, z, 1.3, 1.9, 1.5, 0.25, i % 2 ? 0x58746a : 0x9a5140);
        for (const dx of [-0.7, 0.7])
          part(cylinder, 0x8b704f, x + dx, 0.8, z + 0.5, 0.035, 1.3, 0.035);
      }
    for (const x of [-16, -11, 11, 16]) {
      part(cylinder, 0x374439, x, 0.85, -7, 0.15, 1.6, 0.15);
      for (let i = 0; i < 4; i++)
        part(
          sphere,
          i % 2 ? 0x284d43 : 0x31584a,
          x + Math.sin(i * 2) * 0.55,
          1.6 + (i % 2) * 0.6,
          -7 + Math.cos(i) * 0.4,
          1.1,
          1.2,
          1,
        );
    }
    for (const z of [-3.8, -6.8]) {
      const points = [];
      for (let i = 0; i <= 80; i++) {
        const x = -18 + i * 0.45,
          y = 1.6 - 0.32 * Math.abs(Math.sin(x * 0.33));
        points.push(new T.Vector3(x, y, z));
        if (i % 2 === 0)
          part(
            sphere,
            i % 4 === 0 ? 0xffcb75 : 0xffe3a1,
            x,
            y - 0.04,
            z,
            0.035,
            0.045,
            0.035,
            true,
          );
        if (i % 4 === 1) {
          const flag = new T.BufferGeometry();
          flag.setAttribute(
            "position",
            new T.Float32BufferAttribute(
              [-0.12, 0, 0, 0.12, 0, 0, 0, -0.26, 0],
              3,
            ),
          );
          flag.computeVertexNormals();
          originals.add(flag);
          part(
            flag,
            [0xc07e58, 0xd2b56b, 0x72917a][i % 3],
            x,
            y - 0.03,
            z,
            1,
            1,
            1,
          );
        }
      }
      tube(points, 0x6a6c50, 0.012);
      for (const x of [-18, -9, 0, 9, 18]) {
        if (x === 0 && z === -3.8) continue;
        part(cylinder, 0x6e6045, x, 0.85, z, 0.028, 1.75, 0.028);
      }
    }
    for (let i = 0; i < 18; i++) {
      const x = -17 + i * 2,
        y = 1.6 - 0.32 * Math.abs(Math.sin(x * 0.33));
      part(
        sphere,
        i % 3 === 0 ? 0xffb56d : 0xffd48b,
        x,
        y - 0.22,
        -3.8,
        0.1,
        0.13,
        0.1,
        true,
      );
      part(cylinder, 0xa78c5c, x, y - 0.1, -3.8, 0.007, 0.14, 0.007);
      part(cone, 0xe3a65d, x, y - 0.39, -3.8, 0.035, 0.1, 0.035, true);
    }
    raw.updateMatrixWorld(true);
    // Vertex colors preserve every craft color with just two static draw calls.
    const batches = new Map<boolean, T.BufferGeometry[]>();
    raw.traverse((obj) => {
      if (!(obj instanceof T.Mesh)) return;
      const material = obj.material as T.MeshStandardMaterial;
      const glowing = material.emissiveIntensity > 0;
      const color = glowing
        ? material.emissive.clone().multiplyScalar(1.2)
        : material.color;
      const transformed = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
      transformed.deleteAttribute("uv");
      const geometry = transformed.index
        ? transformed.toNonIndexed()
        : transformed;
      if (geometry !== transformed) transformed.dispose();
      const colors = new Float32Array(
        geometry.getAttribute("position").count * 3,
      );
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
      }
      geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
      const list = batches.get(glowing) || [];
      list.push(geometry);
      batches.set(glowing, list);
    });
    for (const [glowing, list] of batches) {
      const merged = mergeGeometries(list);
      if (!merged) throw Error("Could not batch the festival scenery");
      const material = glowing
        ? new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide })
        : new T.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            side: T.DoubleSide,
          });
      if (glowing) {
        material.onBeforeCompile = (shader) => {
          shader.uniforms.festivalTime = this.glowTime;
          shader.vertexShader =
            "varying vec3 vFestivalPosition;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\nvFestivalPosition=position;",
          );
          shader.fragmentShader =
            "uniform float festivalTime; varying vec3 vFestivalPosition;\n" +
            shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <color_fragment>",
            "#include <color_fragment>\nfloat phase=vFestivalPosition.x*.71+vFestivalPosition.z*.37; diffuseColor.rgb*=1.05+.065*sin(festivalTime*1.7+phase)+.025*sin(festivalTime*3.1+phase*1.8);",
          );
        };
        material.customProgramCacheKey = () => "festival-warm-light-v1";
      }
      const mesh = new T.Mesh(merged, material);
      mesh.name = glowing ? "Festival lights" : "Temple and low landing";
      this.group.add(mesh);
      list.forEach((g) => g.dispose());
    }
    this.materials.forEach((m) => m.dispose());
    this.materials.clear();
    originals.forEach((g) => g.dispose());

    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,215,123,.7)");
    gradient.addColorStop(0.3, "rgba(255,163,55,.2)");
    gradient.addColorStop(1, "rgba(255,148,42,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    this.texture = new T.CanvasTexture(canvas);
    this.shoreGlows = new T.InstancedMesh(
      new T.PlaneGeometry(0.85, 0.85),
      new T.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        opacity: 0.65,
      }),
      18,
    );
    this.shoreGlows.instanceMatrix.setUsage(T.DynamicDrawUsage);
    this.shoreGlows.frustumCulled = false;
    this.group.add(this.shoreGlows);
    this.lanterns = new T.InstancedMesh(
      new T.CylinderGeometry(0.16, 0.14, 0.32, 8, 1, true),
      new T.MeshBasicMaterial({
        color: 0xffba6c,
        side: T.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
      18,
    );
    this.flames = new T.InstancedMesh(
      new T.ConeGeometry(0.035, 0.09, 5),
      new T.MeshBasicMaterial({ color: 0xffb24e }),
      18,
    );
    this.rims = new T.InstancedMesh(
      new T.TorusGeometry(0.14, 0.009, 3, 8),
      new T.MeshBasicMaterial({ color: 0xeeaa5c }),
      18,
    );
    this.glows = new T.InstancedMesh(
      new T.PlaneGeometry(1.2, 1.2),
      new T.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
      18,
    );
    this.pierLight.position.set(-0.8, 1.45, -0.6);
    this.templeLight.position.set(0, 2, -4.0);
    this.pierLight.name = "Warm pier light";
    this.templeLight.name = "Warm temple light";
    this.group.add(this.pierLight, this.templeLight);
    this.lanterns.name = "Sky lanterns";
    for (const mesh of [this.lanterns, this.flames, this.rims, this.glows]) {
      mesh.frustumCulled = false;
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      this.group.add(mesh);
    }
  }
  update(time: number, camera: T.Camera, mobile: boolean) {
    if (time === this.previousTime && mobile === this.previousMobile) return;
    this.glowTime.value = time;
    const transform = new T.Object3D(),
      glowColor = new T.Color();
    transform.quaternion.copy(camera.quaternion);
    for (let i = 0; i < 18; i++) {
      const x = -17 + i * 2;
      const breathe =
        1 +
        0.055 * Math.sin(time * 1.4 + i * 1.7) +
        0.025 * Math.sin(time * 3.1 + i * 0.8);
      transform.position.set(
        x,
        1.6 -
          0.32 * Math.abs(Math.sin(x * 0.33)) -
          0.22 +
          Math.sin(time * 1.2 + i) * 0.008,
        -3.8,
      );
      transform.scale.setScalar(breathe * 1.2);
      transform.updateMatrix();
      this.shoreGlows.setMatrixAt(i, transform.matrix);
      glowColor.setRGB(breathe, breathe, breathe);
      this.shoreGlows.setColorAt(i, glowColor);
    }
    this.shoreGlows.instanceMatrix.needsUpdate = true;
    if (this.shoreGlows.instanceColor)
      this.shoreGlows.instanceColor.needsUpdate = true;
    this.pierLight.intensity =
      8 * (1 + 0.07 * Math.sin(time * 1.7) + 0.025 * Math.sin(time * 3.1));
    this.templeLight.intensity = 12 * (1 + 0.045 * Math.sin(time * 0.9 + 1.2));
    this.pierLight.position.x = -0.8 + Math.sin(time * 0.8) * 0.035;
    this.previousTime = time;
    this.previousMobile = mobile;
    const count = mobile ? 10 : 18,
      matrix = new T.Object3D();
    for (let i = 0; i < count; i++) {
      const phase = (i * 0.6180339 + time * 0.017) % 1,
        size = 0.65 + (i % 4) * 0.16;
      const x =
        (((i * 7.71) % 24) - 12) * (mobile ? 0.27 : 1) +
        Math.sin(time * 0.19 + i) * 0.16;
      const y = 0.35 + phase * 3.8,
        z = -6.3 - (i % 4) * 0.45;
      matrix.position.set(x, y, z);
      matrix.rotation.set(
        Math.sin(time * 0.4 + i) * 0.06,
        0,
        Math.sin(time * 0.3 + i * 2) * 0.055,
      );
      matrix.scale.setScalar(size);
      matrix.updateMatrix();
      this.lanterns.setMatrixAt(i, matrix.matrix);
      matrix.position.y = y - 0.13 * size;
      matrix.rotation.set(0, 0, 0);
      matrix.scale.setScalar(size);
      matrix.updateMatrix();
      this.flames.setMatrixAt(i, matrix.matrix);
      matrix.rotation.x = Math.PI / 2;
      matrix.updateMatrix();
      this.rims.setMatrixAt(i, matrix.matrix);
      matrix.position.y = y - 0.02;
      matrix.quaternion.copy(camera.quaternion);
      matrix.scale.setScalar(size * (1 + 0.045 * Math.sin(time * 2.2 + i)));
      matrix.updateMatrix();
      this.glows.setMatrixAt(i, matrix.matrix);
    }
    for (const mesh of [this.lanterns, this.flames, this.rims, this.glows]) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof T.Mesh) {
        obj.geometry.dispose();
        (obj.material as T.Material).dispose();
        if (obj instanceof T.InstancedMesh) obj.dispose();
      }
    });
    this.materials.forEach((m) => m.dispose());
    this.texture.dispose();
  }
}

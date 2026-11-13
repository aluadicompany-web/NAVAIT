import * as T from "three";
import { tileVariantStyle } from "./tile-pattern";
export type TempleSurface =
  | "stone"
  | "plaster"
  | "wood"
  | "lacquer"
  | "fabric"
  | "gold"
  | "mural"
  | "plain";
const gold = new Set([
  0xc5a15a, 0xc7a66c, 0xdab866, 0xe6c57b, 0xe2bb66, 0xb58c4b, 0xd6b16b,
  0xa87332, 0xd0a545, 0xe5bd67, 0xe8c16e, 0xdcb15a, 0xc18a37, 0xe6bc68,
  0xac813a, 0xf0cc77, 0xe4bf78, 0xdeba68, 0x896238, 0xcfab5d,
]);
const wood = new Set([
  0xa07846, 0x825734, 0x794333, 0x694535, 0x7b4934, 0x694632,
]);
export function templeSurface(color: number): TempleSurface {
  if (color === 0xc8b397) return "stone";
  if (color === 0xf0dfbf || color === 0xe3d0ae) return "plaster";
  if (color === 0x6c3336) return "mural";
  if (color === 0x703f3e || color === 0x773b35) return "lacquer";
  if ([0x983f40, 0x9f5650, 0xd1a56b].includes(color)) return "fabric";
  if (gold.has(color)) return "gold";
  if (wood.has(color)) return "wood";
  return "plain";
}
function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}
function noiseMap(
  size: number,
  kind: "stone" | "wood" | "fabric" | "gold" | "plaster",
) {
  const c = canvas(size),
    ctx = c.getContext("2d")!,
    pixels = ctx.createImageData(size, size);
  let seed = 1729;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 238 + (random() - 0.5) * 9;
      if (kind === "wood") {
        const grain = Math.sin(
          x * 0.17 + Math.sin(y * 0.022) * 2.7 + Math.sin(y * 0.005) * 4,
        );
        const knot = Math.sin(
          Math.hypot((x - size * 0.62) * 1.6, (y - size * 0.45) * 0.29) * 0.28,
        );
        v = 218 + grain * 13 + knot * 4 + (random() - 0.5) * 10;
      }
      if (kind === "fabric")
        v =
          225 +
          (x % 4 < 2 ? 12 : -8) +
          (y % 4 < 2 ? 9 : -6) +
          (random() - 0.5) * 6;
      if (kind === "gold")
        v =
          222 +
          (random() - 0.5) * 15 +
          Math.sin(x * 0.08 + Math.sin(y * 0.06)) * 5;
      if (kind === "plaster")
        v =
          235 +
          (random() - 0.5) * 14 +
          Math.sin(x * 0.029) * Math.cos(y * 0.021) * 4;
      const i = (y * size + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  if (kind === "stone") {
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = `rgba(120,116,110,${0.045 + (i % 3) * 0.015})`;
      ctx.lineWidth = i % 2 ? 1 : 2;
      ctx.beginPath();
      ctx.moveTo(-20, i * 75 - 55);
      ctx.bezierCurveTo(
        size * 0.22,
        i * 72 + 45,
        size * 0.56,
        i * 65 - 90,
        size + 20,
        i * 65 + 100,
      );
      ctx.stroke();
    }
    ctx.strokeStyle = "#aaa59b";
    ctx.lineWidth = 4;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    ctx.strokeStyle = "#fffdf3";
    ctx.lineWidth = 2;
    ctx.strokeRect(5, 5, size - 10, size - 10);
  }
  if (kind === "gold") {
    ctx.strokeStyle = "rgba(130,126,111,.09)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= size; i += size / 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  }
  return c;
}
function stoneAtlas() {
  const c = canvas(512),
    ctx = c.getContext("2d")!,
    size = 128;
  for (let variant = 0; variant < 16; variant++) {
    const x = (variant % 4) * size,
      y = Math.floor(variant / 4) * size,
      { cracked, faded } = tileVariantStyle(variant);
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.clip();
    const tone = (faded ? 248 : 234) + (variant % 3) * 2;
    ctx.fillStyle = `rgb(${tone},${tone},${tone - 2})`;
    ctx.fillRect(0, 0, size, size);
    for (let line = 0; line < 3; line++) {
      ctx.strokeStyle = "rgba(133,127,119,.075)";
      ctx.lineWidth = 0.6 + (line % 2) * 0.4;
      ctx.beginPath();
      ctx.moveTo(-4, line * 48 + (variant % 17));
      ctx.bezierCurveTo(
        32,
        line * 42 - 12,
        82,
        line * 45 + 26,
        132,
        line * 44 + 9,
      );
      ctx.stroke();
    }
    if (cracked) {
      const mirror = variant === 11;
      ctx.save();
      if (mirror) {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }
      ctx.strokeStyle = "rgba(104,96,86,.26)";
      ctx.lineWidth = 0.9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(25, 18);
      ctx.lineTo(39, 37);
      ctx.lineTo(43, 52);
      ctx.lineTo(58, 62);
      ctx.lineTo(63, 78);
      ctx.stroke();
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(43, 52);
      ctx.lineTo(33, 58);
      ctx.lineTo(30, 69);
      ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle = "#c8c3b8";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
    ctx.strokeStyle = "rgba(255,255,250,.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, size - 6, size - 6);
    ctx.restore();
  }
  return c;
}
function mural() {
  const c = canvas(512),
    ctx = c.getContext("2d")!;
  ctx.fillStyle = "#622c33";
  ctx.fillRect(0, 0, 512, 512);
  const g = ctx.createRadialGradient(256, 256, 10, 256, 256, 350);
  g.addColorStop(0, "#7e3a3d");
  g.addColorStop(1, "#542830");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#c4a365";
  ctx.lineWidth = 2;
  for (const [x, y] of [
    [128, 128],
    [384, 128],
    [128, 384],
    [384, 384],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-23, -25, -24, -52, 0, -76);
      ctx.bezierCurveTo(24, -52, 23, -25, 0, 0);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (let x = 0; x <= 512; x += 64)
    for (let y = 0; y <= 512; y += 64) {
      ctx.fillStyle = "#b38d50";
      ctx.beginPath();
      ctx.ellipse(x, y, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  return c;
}
export class TempleMaterials {
  readonly materials = new Map<TempleSurface, T.MeshStandardMaterial>();
  readonly environment: T.CubeTexture;
  private textures: T.Texture[] = [];
  constructor() {
    const texture = (source: HTMLCanvasElement, color = false) => {
      const map = new T.CanvasTexture(source);
      if (color) map.colorSpace = T.SRGBColorSpace;
      map.wrapS = map.wrapT = T.RepeatWrapping;
      map.anisotropy = 2;
      this.textures.push(map);
      return map;
    };
    const stone = texture(stoneAtlas(), true),
      grain = texture(noiseMap(512, "wood"), true),
      weave = texture(noiseMap(256, "fabric"), true),
      leaf = texture(noiseMap(256, "gold"), true),
      stucco = texture(noiseMap(256, "plaster"), true);
    // Height/roughness data remain linear, separate from display-color textures.
    const height = (map: T.Texture) => {
      const h = map.clone();
      h.colorSpace = T.NoColorSpace;
      h.needsUpdate = true;
      this.textures.push(h);
      return h;
    };
    const create = (
      type: TempleSurface,
      parameters: T.MeshStandardMaterialParameters,
    ) =>
      this.materials.set(
        type,
        new T.MeshStandardMaterial({ vertexColors: true, ...parameters }),
      );
    create("stone", {
      map: stone,
      bumpMap: height(stone),
      bumpScale: 0.012,
      roughness: 0.34,
      metalness: 0,
      envMapIntensity: 0.45,
    });
    create("plaster", {
      map: stucco,
      bumpMap: height(stucco),
      bumpScale: 0.014,
      roughness: 0.94,
    });
    create("wood", {
      map: grain,
      bumpMap: height(grain),
      bumpScale: 0.018,
      roughness: 0.43,
      envMapIntensity: 0.45,
    });
    create("lacquer", {
      map: grain,
      bumpMap: height(grain),
      bumpScale: 0.005,
      roughness: 0.23,
      envMapIntensity: 0.8,
    });
    create("fabric", {
      map: weave,
      bumpMap: height(weave),
      bumpScale: 0.018,
      roughness: 0.96,
    });
    create("gold", {
      map: leaf,
      bumpMap: height(leaf),
      bumpScale: 0.006,
      roughnessMap: height(leaf),
      roughness: 0.4,
      metalness: 0.76,
      envMapIntensity: 1.15,
    });
    create("mural", { map: texture(mural(), true), roughness: 0.78 });
    create("plain", { roughness: 0.78 });
    const faces = [];
    for (let i = 0; i < 6; i++) {
      const c = canvas(64),
        ctx = c.getContext("2d")!,
        g = ctx.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, "#d9c9aa");
      g.addColorStop(0.45, "#9b8670");
      g.addColorStop(1, "#55403a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = i === 2 ? "#f7e6c5" : "#e9d4ad";
      ctx.fillRect(12, 5, 10, 33);
      ctx.fillRect(42, 5, 10, 33);
      ctx.fillStyle = "#6c4439";
      ctx.fillRect(0, 48, 64, 6);
      faces.push(c);
    }
    this.environment = new T.CubeTexture(faces);
    this.environment.colorSpace = T.SRGBColorSpace;
    this.environment.needsUpdate = true;
  }
  dispose() {
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.environment.dispose();
  }
}

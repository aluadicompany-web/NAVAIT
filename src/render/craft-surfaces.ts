import * as T from "three";

type Surface = "leaf" | "petal" | "shell" | "bread" | "wax" | "plain";
const maps = new Map<Surface, T.CanvasTexture>();
const leafColors = new Set([0x3c7551,0x85a55a,0x408c54,0x286745,0x4d965c,0x9ac17b,0xb6d497,0xc9e2a4,0xd4e9b4]);
export function craftSurface(color: number, petal: boolean): Surface {
  if (leafColors.has(color)) return "leaf";
  if ([0x6c422b,0xb78957,0xf1dfb5].includes(color)) return "shell";
  if ([0xc4813e,0xe9b875,0xf5d59c,0xad6d35].includes(color)) return "bread";
  if ([0xffdf9c,0x4e3429,0x6c4231].includes(color)) return "wax";
  if (petal || color > 0x800000) return "petal";
  return "plain";
}
function texture(surface: Surface) {
  if (maps.has(surface)) return maps.get(surface)!;
  const canvas = document.createElement("canvas");canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!, pixels = context.createImageData(128,128);
  let seed = 1481;
  const random = () => { seed = Math.imul(seed,1664525)+1013904223; return (seed>>>0)/4294967296; };
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const noise=random();
    let value=244+(noise-.5)*8;
    if(surface==="leaf") value=229+Math.sin(x*.8+Math.sin(y*.04)*1.4)*7+(x%16<2?9:0)+(noise-.5)*8;
    if(surface==="petal") value=240+Math.sin(x*.36+Math.sin(y*.07)*1.8)*6+(noise-.5)*3;
    if(surface==="shell") value=218+Math.sin(x*.49+Math.sin(y*.1)*4)*16+(noise-.5)*28;
    if(surface==="bread") value=232+(noise<.08?-25:noise*.12)+(Math.sin(x*.2)*Math.cos(y*.3))*6;
    if(surface==="wax") value=246+Math.sin(y*.09)*3+(noise-.5)*2;
    const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;
  }
  context.putImageData(pixels,0,0);
  const map=new T.CanvasTexture(canvas);map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=2;maps.set(surface,map);return map;
}
export function craftMaterial(color: number, surface: Surface) {
  const map=texture(surface);
  return new T.MeshStandardMaterial({color,map,bumpMap:map,
    bumpScale:surface==="shell"?.025:surface==="leaf"?.012:surface==="petal"?.006:.004,
    roughness:surface==="wax"?.4:surface==="leaf"?.56:surface==="shell"?.88:.67,
    metalness:0,side:T.DoubleSide});
}

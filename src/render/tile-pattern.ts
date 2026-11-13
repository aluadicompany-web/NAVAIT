export function tileVariantStyle(variant: number) {
  return {
    cracked: variant === 1 || variant === 11,
    faded: [3, 8, 14].includes(variant),
  };
}
export function floorTileStyle(column: number, row: number) {
  let seed = Math.imul(column + 29, 73856093) ^ Math.imul(row + 41, 19349663);
  seed ^= seed >>> 13;
  seed = Math.imul(seed, 1274126177);
  seed ^= seed >>> 16;
  seed >>>= 0;
  const variant = seed % 16,
    style = tileVariantStyle(variant);
  return {
    variant,
    ...style,
    fade: style.faded ? 0.07 + ((seed >>> 8) % 4) * 0.015 : 0,
  };
}

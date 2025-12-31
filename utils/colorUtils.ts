import { PaletteColor, RGB } from '../types';

export const hexToRgb = (hex: string): RGB | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Euclidean distance squared (faster than sqrt)
const getColorDistance = (c1: RGB, c2: RGB): number => {
  return (
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
};

export const findNearestColor = (hex: string, palette: PaletteColor[]): string => {
  if (palette.length === 0) return hex;

  const target = hexToRgb(hex);
  if (!target) return hex;

  let minDistance = Infinity;
  let nearestColor = palette[0].hex;

  for (const color of palette) {
    const currentRgb = hexToRgb(color.hex);
    if (currentRgb) {
      const distance = getColorDistance(target, currentRgb);
      if (distance < minDistance) {
        minDistance = distance;
        nearestColor = color.hex;
      }
    }
  }

  return nearestColor;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

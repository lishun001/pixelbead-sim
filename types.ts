export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface PaletteColor {
  id: string;
  hex: string;
  name?: string;
}

export interface GridSettings {
  width: number;
  height: number;
  lockAspectRatio: boolean;
}

export type GridData = string[][]; // 2D array of Hex codes

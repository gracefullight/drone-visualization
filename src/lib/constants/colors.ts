/**
 * Color constants for the application
 * Maintains visual consistency across components
 */

// Building colors
export const BUILDING_COLORS = {
  TARGET_BASE: "#c0c0c0",
  TARGET_ROOF: "#a8a8a8",
  TARGET_EDGE: "#ffff88",
  TARGET_OUTLINE: "#ffff00",
  NORMAL_BASE: "#606060",
  NORMAL_ROOF: "#505050",
} as const;

// Scene colors
export const SCENE_COLORS = {
  GROUND: "#808080",
} as const;

/**
 * Converts RGB values (0-1 range) to hex color string
 */
export function rgbToHex([r, g, b]: [
  number,
  number,
  number,
]): string {
  const to255 = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  const rr = to255(r).toString(16).padStart(2, "0");
  const gg = to255(g).toString(16).padStart(2, "0");
  const bb = to255(b).toString(16).padStart(2, "0");
  return `#${rr}${gg}${bb}`;
}

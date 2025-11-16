import type { MetricType } from "@/types";

export interface MetricRange {
  min: number;
  max: number;
  unit: string;
  name: string;
  description: string;
}

export const METRIC_RANGES: Record<MetricType, MetricRange> = {
  rssi: {
    min: -85,
    max: -50,
    unit: "dBm",
    name: "RSSI",
    description: "Received Signal Strength Indicator",
  },
  cqi: {
    min: 0,
    max: 15,
    unit: "",
    name: "CQI",
    description: "Channel Quality Indicator",
  },
  rsrp: {
    min: -110,
    max: -80,
    unit: "dBm",
    name: "RSRP",
    description: "Reference Signal Received Power",
  },
  rsrq: {
    min: -15,
    max: -5,
    unit: "dB",
    name: "RSRQ",
    description: "Reference Signal Received Quality",
  },
  snr: {
    min: 0,
    max: 20,
    unit: "dB",
    name: "SNR",
    description: "Signal-to-Noise Ratio",
  },
};

/**
 * Convert metric value to RGB color array
 * Red (poor signal) -> Green (good signal)
 * @param value - The metric value
 * @param metric - The metric type
 * @returns RGB array [r, g, b] with values 0-1
 */
export function getColorFromMetric(
  value: number,
  metric: MetricType,
): [number, number, number] {
  const range = METRIC_RANGES[metric];
  // Normalize value to 0-1
  const normalized = Math.max(
    0,
    Math.min(1, (value - range.min) / (range.max - range.min)),
  );

  // Use HSL color space for smooth gradient: red (0°) -> yellow (60°) -> green (120°)
  // We'll use 0° to 120° (0 to 0.33 in HSL)
  const hue = normalized * 0.33; // 0 = red, 0.33 = green in HSL (0-1 scale)
  const saturation = 1.0;
  const lightness = 0.5;

  // Convert HSL to RGB
  return hslToRgb(hue, saturation, lightness);
}

/**
 * Convert HSL to RGB
 * @param h - Hue (0-1)
 * @param s - Saturation (0-1)
 * @param l - Lightness (0-1)
 * @returns RGB array [r, g, b] with values 0-1
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = l;
    g = l;
    b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      let adjustedT = t;
      if (adjustedT < 0) adjustedT += 1;
      if (adjustedT > 1) adjustedT -= 1;
      if (adjustedT < 1 / 6) return p + (q - p) * 6 * adjustedT;
      if (adjustedT < 1 / 2) return q;
      if (adjustedT < 2 / 3) return p + (q - p) * (2 / 3 - adjustedT) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r, g, b];
}

/**
 * Get quality level based on metric value
 */
export function getQualityLevel(
  value: number,
  metric: MetricType,
): "excellent" | "good" | "fair" | "poor" {
  const range = METRIC_RANGES[metric];
  const normalized = (value - range.min) / (range.max - range.min);

  if (normalized >= 0.75) return "excellent";
  if (normalized >= 0.5) return "good";
  if (normalized >= 0.25) return "fair";
  return "poor";
}

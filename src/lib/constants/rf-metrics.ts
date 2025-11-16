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

  // Interpolate between red (low) and green (high)
  // Red: #f87171 (red-400)
  // Green: #4ade80 (green-400)
  const redR = 0xf8 / 255;
  const redG = 0x71 / 255;
  const redB = 0x71 / 255;
  
  const greenR = 0x4a / 255;
  const greenG = 0xde / 255;
  const greenB = 0x80 / 255;

  // Linear interpolation in RGB space
  const r = redR + (greenR - redR) * normalized;
  const g = redG + (greenG - redG) * normalized;
  const b = redB + (greenB - redB) * normalized;

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

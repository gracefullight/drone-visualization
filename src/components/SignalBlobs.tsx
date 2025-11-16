"use client";

import { useMemo } from "react";
import { AdditiveBlending, Texture, Vector3 } from "three";
import { rgbToHex } from "@/lib/constants/colors";
import { getColorFromMetric, METRIC_RANGES } from "@/lib/constants/rf-metrics";
import type { MetricType, RFPoint } from "@/types";

interface SignalBlobsProps {
  rfPoints: RFPoint[];
  selectedMetric: MetricType;
}

export function SignalBlobs({ rfPoints, selectedMetric }: SignalBlobsProps) {
  // Create a reusable soft circular sprite texture
  const spriteMap = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null as unknown as Texture | null;

    const grd = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.5, "rgba(255,255,255,0.35)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    const tex = new Texture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Group RF points per building and make blob centers by averaging small local groups
  const blobs = useMemo(() => {
    const byBuilding = new Map<string, RFPoint[]>();
    for (const p of rfPoints) {
      const arr = byBuilding.get(p.buildingId) ?? [];
      arr.push(p);
      byBuilding.set(p.buildingId, arr);
    }

    type BlobInfo = {
      position: [number, number, number];
      color: string;
      size: number;
    };
    const out: BlobInfo[] = [];

    const range = METRIC_RANGES[selectedMetric];
    const normalize = (v: number) =>
      Math.max(0, Math.min(1, (v - range.min) / (range.max - range.min)));

    for (const arr of byBuilding.values()) {
      // Stable ordering to get spatially nearby points grouped (arr was likely created in wall/height order)
      // Use stride grouping: every 3 points form one blob center
      const stride = 3;
      for (let i = 0; i < arr.length; i += stride) {
        const group = arr.slice(i, i + stride);
        if (group.length === 0) continue;
        const pos = new Vector3();
        let sumMetric = 0;
        for (const p of group) {
          pos.x += p.position[0];
          pos.y += p.position[1];
          pos.z += p.position[2];
          sumMetric += p.metrics[selectedMetric];
        }
        pos.multiplyScalar(1 / group.length);
        const avgMetric = sumMetric / group.length;
        const color = rgbToHex(getColorFromMetric(avgMetric, selectedMetric));
        // Size bias: larger blobs for better visibility
        const q = normalize(avgMetric);
        const size = 4.0 + (1 - q) * 3.0; // 4.0m to 7.0m
        out.push({ position: [pos.x, pos.y, pos.z], color, size });
      }
    }

    // Limit extreme counts for perf (safety)
    return out.slice(0, 800);
  }, [rfPoints, selectedMetric]);

  if (!spriteMap) return null;

  // Render sprites as camera-facing billboards using <sprite>
  return (
    <group>
      {blobs.map((b) => (
        <sprite
          key={`${b.position.join(",")}-${b.color}-${b.size.toFixed(2)}`}
          position={b.position}
          scale={[b.size, b.size, 1]}
        >
          <spriteMaterial
            map={spriteMap}
            alphaMap={spriteMap}
            color={b.color}
            transparent
            opacity={0.55}
            depthWrite={false}
            depthTest={false}
            blending={AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import type { BufferGeometry } from "three";
import { AdditiveBlending, BufferAttribute, Texture } from "three";
import { getColorFromMetric } from "@/lib/constants/rf-metrics";
import type { MetricType, RFPoint } from "@/types";

interface SignalPointsProps {
  rfPoints: RFPoint[];
  selectedMetric: MetricType;
}

export function SignalPoints({ rfPoints, selectedMetric }: SignalPointsProps) {
  const geometryRef = useRef<BufferGeometry>(null);

  // Create geometry once with positions
  const { positions, pointCount } = useMemo(() => {
    const count = rfPoints.length;
    const positionsArray = new Float32Array(count * 3);

    // Hash function for deterministic seed from point id
    const hashToSeed = (s: string) => {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    for (let i = 0; i < count; i++) {
      const point = rfPoints[i];
      const seed = hashToSeed(point.id);
      // Use seed for deterministic pseudo-random values
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return (x - Math.floor(x)) * 2 - 1; // -1 to 1
      };
      const r1 = seededRandom(seed);
      const r2 = seededRandom(seed + 1);
      const r3 = seededRandom(seed + 2);

      // Create a small volumetric jitter so points form a soft cloud
      const jitterRadius = 0.6; // meters
      const jx = r1 * jitterRadius;
      const jy = r2 * 0.4; // less vertical jitter for readability
      const jz = r3 * jitterRadius;

      positionsArray[i * 3] = point.position[0] + jx;
      positionsArray[i * 3 + 1] = point.position[1] + jy;
      positionsArray[i * 3 + 2] = point.position[2] + jz;
    }

    return { positions: positionsArray, pointCount: count };
  }, [rfPoints]);

  // Soft circular sprite texture to make points appear like puffy clouds
  const spriteMap = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const grd = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.5, "rgba(255,255,255,0.4)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);

    const tex = new Texture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Update colors when metric changes
  useEffect(() => {
    if (!geometryRef.current) return;

    const colors = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      const point = rfPoints[i];
      const metricValue = point.metrics[selectedMetric];
      const [r, g, b] = getColorFromMetric(metricValue, selectedMetric);

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    geometryRef.current.setAttribute("color", new BufferAttribute(colors, 3));
    geometryRef.current.attributes.color.needsUpdate = true;
  }, [rfPoints, selectedMetric, pointCount]);

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={1.2}
        vertexColors
        sizeAttenuation
        transparent
        opacity={0.35}
        depthWrite={false}
        depthTest={false}
        blending={AdditiveBlending}
        map={spriteMap ?? undefined}
        alphaMap={spriteMap ?? undefined}
      />
    </points>
  );
}

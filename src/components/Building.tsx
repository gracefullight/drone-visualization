"use client";

import { Edges, Html } from "@react-three/drei";
import { useTimeout } from "ahooks";
import { useMemo } from "react";
import type { BuildingData, RFPoint } from "@/types";

interface BuildingProps {
  building: BuildingData;
  rfPoints: RFPoint[];
  selectedFloor: number | null;
  onSelectFloor: (floor: number | null) => void;
}

export function Building({
  building,
  rfPoints,
  selectedFloor,
  onSelectFloor,
}: BuildingProps) {
  const { id, position, width, height, depth, isTarget, floorCount } = building;

  // Deterministic PRNG from id
  const rng = useMemo(() => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return () => {
      h = (h + 0x6d2b79f5) >>> 0;
      let t = Math.imul(h ^ (h >>> 15), 1 | h);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, [id]);

  const rotY = useMemo(() => (rng() - 0.5) * 0.08, [rng]); // +/- ~4.5 degrees
  const baseColor = isTarget ? "#c0c0c0" : "#606060";
  const roughness = useMemo(() => 0.65 + rng() * 0.2, [rng]);
  const metalness = useMemo(() => 0.15 + rng() * 0.2, [rng]);

  // Rooftop mechanical box
  const roof = useMemo(() => {
    const rw = width * (0.28 + rng() * 0.18);
    const rd = depth * (0.25 + rng() * 0.2);
    const rh = Math.max(1, height * (0.05 + rng() * 0.05));
    return { rw, rd, rh };
  }, [depth, height, rng, width]);

  // Auto-close panel after 3 seconds
  useTimeout(
    () => {
      onSelectFloor(null);
    },
    selectedFloor !== null ? 3000 : undefined,
  );

  // Calculate floor height
  const floorHeight = height / floorCount;

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {[...Array(floorCount)].map((_, i) => {
        const y = -height / 2 + floorHeight * i + floorHeight / 2;
        const key = `floor-${id}-${Math.round(y * 100)}`;
        // Filter RF points per floor - considering building's y position
        const [, by] = position;
        const floorMinY = by - height / 2 + floorHeight * i;
        const floorMaxY = floorMinY + floorHeight;
        const pointsOnFloor = rfPoints.filter((p) => {
          const py = p.position[1];
          return py >= floorMinY && py < floorMaxY;
        });
        // Calculate average metrics
        const avgMetrics = {
          rssi: pointsOnFloor.length
            ? pointsOnFloor.reduce((acc, p) => acc + p.metrics.rssi, 0) /
              pointsOnFloor.length
            : null,
          cqi: pointsOnFloor.length
            ? pointsOnFloor.reduce((acc, p) => acc + p.metrics.cqi, 0) /
              pointsOnFloor.length
            : null,
          rsrp: pointsOnFloor.length
            ? pointsOnFloor.reduce((acc, p) => acc + p.metrics.rsrp, 0) /
              pointsOnFloor.length
            : null,
          rsrq: pointsOnFloor.length
            ? pointsOnFloor.reduce((acc, p) => acc + p.metrics.rsrq, 0) /
              pointsOnFloor.length
            : null,
          snr: pointsOnFloor.length
            ? pointsOnFloor.reduce((acc, p) => acc + p.metrics.snr, 0) /
              pointsOnFloor.length
            : null,
        };
        return (
          <group key={key} position={[0, y, 0]}>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Three.js mesh requires pointer events */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "";
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelectFloor(i);
              }}
            >
              <boxGeometry args={[width, floorHeight, depth]} />
              <meshStandardMaterial
                color={baseColor}
                transparent={!isTarget}
                opacity={isTarget ? 1 : 0.4}
                roughness={roughness}
                metalness={metalness}
              />
            </mesh>
            {isTarget && (
              <Edges
                linewidth={1.2}
                scale={1.01}
                threshold={15}
                color="#ffff00"
              />
            )}
            {selectedFloor === i && (
              <Html center style={{ pointerEvents: "none" }}>
                <div className="rounded bg-white/90 p-2 shadow text-xs min-w-[120px]">
                  <div className="font-bold mb-1">Floor {i + 1} Metrics</div>
                  {pointsOnFloor.length > 0 ? (
                    <>
                      <div>
                        RSSI:{" "}
                        {avgMetrics.rssi !== null
                          ? `${avgMetrics.rssi.toFixed(1)} dBm`
                          : "N/A"}
                      </div>
                      <div>
                        CQI:{" "}
                        {avgMetrics.cqi !== null
                          ? avgMetrics.cqi.toFixed(1)
                          : "N/A"}
                      </div>
                      <div>
                        RSRP:{" "}
                        {avgMetrics.rsrp !== null
                          ? `${avgMetrics.rsrp.toFixed(1)} dBm`
                          : "N/A"}
                      </div>
                      <div>
                        RSRQ:{" "}
                        {avgMetrics.rsrq !== null
                          ? `${avgMetrics.rsrq.toFixed(1)} dB`
                          : "N/A"}
                      </div>
                      <div>
                        SNR:{" "}
                        {avgMetrics.snr !== null
                          ? `${avgMetrics.snr.toFixed(1)} dB`
                          : "N/A"}
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-500">No RF data available</div>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}
      {/* Rooftop unit */}
      <group position={[0, height / 2 + roof.rh / 2, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[roof.rw, roof.rh, roof.rd]} />
          <meshStandardMaterial
            color={isTarget ? "#a8a8a8" : "#505050"}
            transparent={!isTarget}
            opacity={isTarget ? 1 : 0.45}
            roughness={Math.min(0.9, roughness + 0.05)}
            metalness={Math.min(0.4, metalness + 0.1)}
          />
        </mesh>
        {isTarget && (
          <Edges linewidth={1.2} scale={1.01} threshold={15} color="#ffff88" />
        )}
      </group>
    </group>
  );
}

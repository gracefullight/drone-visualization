"use client";

import { Edges, Html } from "@react-three/drei";
import { useTimeout } from "ahooks";
import { useMemo } from "react";
import * as THREE from "three";
import { IndoorSignalHeatmap } from "@/components/IndoorSignalHeatmap";
import { BUILDING_COLORS } from "@/lib/constants/colors";
import { getColorFromMetric, METRIC_RANGES } from "@/lib/constants/rf-metrics";
import type { BuildingData, MetricType, RFPoint } from "@/types";
import { createDeterministicRNG } from "@/utils/prng";

interface BuildingProps {
  building: BuildingData;
  rfPoints: RFPoint[];
  indoorRFPoints: RFPoint[];
  selectedFloor: number | null;
  onSelectFloor: (floor: number | null) => void;
  zoomLevel: number;
  selectedMetric: MetricType;
}

export function Building({
  building,
  rfPoints,
  indoorRFPoints,
  selectedFloor,
  onSelectFloor,
  zoomLevel,
  selectedMetric,
}: BuildingProps) {
  const { id, position, width, height, depth, isTarget, floorCount } = building;

  // Deterministic random values - generate all at once to ensure consistency
  const randomValues = useMemo(() => {
    const rng = createDeterministicRNG(id);
    return {
      rotY: (rng() - 0.5) * 0.08, // +/- ~4.5 degrees
      roughness: 0.65 + rng() * 0.2,
      metalness: 0.15 + rng() * 0.2,
      roofWidth: width * (0.28 + rng() * 0.18),
      roofDepth: depth * (0.25 + rng() * 0.2),
      roofHeight: Math.max(1, height * (0.05 + rng() * 0.05)),
    };
  }, [id, width, height, depth]);

  const baseColor = isTarget ? BUILDING_COLORS.TARGET_BASE : BUILDING_COLORS.NORMAL_BASE;

  // Calculate floor height
  const floorHeight = height / floorCount;

  // Determine if we should show indoor view based on zoom level
  // Increased threshold to 0.3 to account for Y-axis 1.5x scaling
  const showIndoorView = zoomLevel > 0.3;
  const buildingOpacity = showIndoorView ? 0.15 : (isTarget ? 1 : 0.4);

  // Create wall texture from RF points for exterior visualization
  const wallTexture = useMemo(() => {
    if (!isTarget || rfPoints.length === 0 || showIndoorView) return null;

    const resolution = 64;
    const canvas = document.createElement("canvas");
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, resolution, resolution);

    // Create vertical gradient based on RF points
    const gridSize = 16;
    const grid: number[] = Array(gridSize).fill(0);
    const counts: number[] = Array(gridSize).fill(0);

    for (const point of rfPoints) {
      const [, py] = point.position;
      const [, by] = position;
      const relativeY = py - (by - height / 2);
      const gridY = Math.floor((relativeY / height) * gridSize);

      if (gridY >= 0 && gridY < gridSize) {
        // Use selected metric value for coloring
        const value = point.metrics[selectedMetric];
        const range = METRIC_RANGES[selectedMetric];
        const normalizedValue = (value - range.min) / (range.max - range.min);
        grid[gridY] += Math.max(0, Math.min(1, normalizedValue));
        counts[gridY]++;
      }
    }

    // Draw gradient
    for (let y = 0; y < gridSize; y++) {
      if (counts[y] === 0) continue;

      const normalizedValue = grid[y] / counts[y];
      
      // Use the same color function as other components
      const range = METRIC_RANGES[selectedMetric];
      const value = range.min + normalizedValue * (range.max - range.min);
      const [r, g, b] = getColorFromMetric(value, selectedMetric);

      const cellHeight = resolution / gridSize;
      // Flip Y axis: canvas Y goes down, but 3D Y goes up
      const canvasY = (gridSize - 1 - y) * cellHeight;
      ctx.fillStyle = `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, 1.0)`;
      ctx.fillRect(0, canvasY, resolution, cellHeight);
    }

    // Apply blur
    ctx.globalAlpha = 1.0;
    ctx.filter = "blur(3px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
    ctx.globalAlpha = 1.0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Enable mipmapping and better filtering to prevent flickering when zoomed out
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16; // Maximum anisotropic filtering for better quality at angles
    
    return texture;
  }, [isTarget, rfPoints, showIndoorView, position, height, selectedMetric]);

  // Auto-close panel after 3 seconds
  useTimeout(
    () => {
      onSelectFloor(null);
    },
    selectedFloor !== null ? 3000 : undefined,
  );

  return (
    <group position={position} rotation={[0, randomValues.rotY, 0]}>
      {/* Exterior signal visualization overlay */}
      {wallTexture && !showIndoorView && (
        <>
          {/* Front face */}
          <mesh position={[0, 0, depth / 2 + 0.5]} renderOrder={2}>
            <planeGeometry args={[width * 0.98, height * 0.98]} />
            <meshBasicMaterial
              map={wallTexture}
              transparent
              opacity={0.75}
              depthWrite={false}
              depthTest={false}
              side={THREE.FrontSide}
            />
          </mesh>
          {/* Back face */}
          <mesh position={[0, 0, -depth / 2 - 0.5]} rotation={[0, Math.PI, 0]} renderOrder={2}>
            <planeGeometry args={[width * 0.98, height * 0.98]} />
            <meshBasicMaterial
              map={wallTexture}
              transparent
              opacity={0.75}
              depthWrite={false}
              depthTest={false}
              side={THREE.FrontSide}
            />
          </mesh>
          {/* Right face */}
          <mesh position={[width / 2 + 0.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} renderOrder={2}>
            <planeGeometry args={[depth * 0.98, height * 0.98]} />
            <meshBasicMaterial
              map={wallTexture}
              transparent
              opacity={0.75}
              depthWrite={false}
              depthTest={false}
              side={THREE.FrontSide}
            />
          </mesh>
          {/* Left face */}
          <mesh position={[-width / 2 - 0.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} renderOrder={2}>
            <planeGeometry args={[depth * 0.98, height * 0.98]} />
            <meshBasicMaterial
              map={wallTexture}
              transparent
              opacity={0.75}
              depthWrite={false}
              depthTest={false}
              side={THREE.FrontSide}
            />
          </mesh>
        </>
      )}
      
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
                transparent
                opacity={buildingOpacity}
                roughness={randomValues.roughness}
                metalness={randomValues.metalness}
              />
            </mesh>
            {/* Floor outline when zoomed in */}
            {showIndoorView && isTarget && (
              <Edges
                linewidth={2}
                scale={1.005}
                threshold={15}
                color="#ffffff"
              />
            )}
            {isTarget && !showIndoorView && (
              <Edges
                linewidth={1.2}
                scale={1.01}
                threshold={15}
                color={BUILDING_COLORS.TARGET_OUTLINE}
              />
            )}
            {/* Indoor signal heatmap */}
            {showIndoorView && isTarget && (
              <IndoorSignalHeatmap
                rfPoints={indoorRFPoints.filter((p) => {
                  const [, by] = position;
                  const floorMinY = by - height / 2 + floorHeight * i;
                  const floorMaxY = floorMinY + floorHeight;
                  const py = p.position[1];
                  return py >= floorMinY && py < floorMaxY;
                })}
                selectedMetric={selectedMetric}
                buildingWidth={width}
                buildingDepth={depth}
                floorY={y}
                buildingPosition={position}
                buildingHeight={height}
                floorCount={floorCount}
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
      <group position={[0, height / 2 + randomValues.roofHeight / 2, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[randomValues.roofWidth, randomValues.roofHeight, randomValues.roofDepth]} />
          <meshStandardMaterial
            color={isTarget ? BUILDING_COLORS.TARGET_ROOF : BUILDING_COLORS.NORMAL_ROOF}
            transparent={!isTarget}
            opacity={isTarget ? 1 : 0.45}
            roughness={Math.min(0.9, randomValues.roughness + 0.05)}
            metalness={Math.min(0.4, randomValues.metalness + 0.1)}
          />
        </mesh>
        {isTarget && (
          <Edges linewidth={1.2} scale={1.01} threshold={15} color={BUILDING_COLORS.TARGET_EDGE} />
        )}
      </group>
    </group>
  );
}

"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useState } from "react";
import { Building } from "@/components/Building";
import { useZoomLevel } from "@/hooks/useZoomLevel";
import { SCENE_COLORS } from "@/lib/constants/colors";
import { generateIndoorRFPoints } from "@/lib/generators/rf-points";
import type { BuildingData, MetricType, RFPoint } from "@/types";

interface SceneProps {
  buildings: BuildingData[];
  rfPoints: RFPoint[];
  selectedMetric: MetricType;
}

export function Scene({ buildings, rfPoints, selectedMetric }: SceneProps) {
  const [selected, setSelected] = useState<{
    buildingId: string;
    floor: number | null;
  } | null>(null);

  // Generate indoor RF points for all target buildings
  const indoorRFPoints = useMemo(() => {
    const allIndoorPoints: RFPoint[] = [];
    for (const building of buildings) {
      if (building.isTarget) {
        for (let floor = 0; floor < building.floorCount; floor++) {
          const floorPoints = generateIndoorRFPoints(building, floor, 8);
          allIndoorPoints.push(...floorPoints);
        }
      }
    }
    return allIndoorPoints;
  }, [buildings]);

  return (
    <Canvas
      camera={{ position: [0, 150, 150], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
      <SceneContent
        buildings={buildings}
        rfPoints={rfPoints}
        indoorRFPoints={indoorRFPoints}
        selectedMetric={selectedMetric}
        selected={selected}
        setSelected={setSelected}
      />
    </Canvas>
  );
}

function SceneContent({
  buildings,
  rfPoints,
  indoorRFPoints,
  selectedMetric,
  selected,
  setSelected,
}: {
  buildings: BuildingData[];
  rfPoints: RFPoint[];
  indoorRFPoints: RFPoint[];
  selectedMetric: MetricType;
  selected: { buildingId: string; floor: number | null } | null;
  setSelected: (value: { buildingId: string; floor: number | null } | null) => void;
}) {
  // Track zoom level
  const zoomLevel = useZoomLevel();

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color={SCENE_COLORS.GROUND} roughness={0.8} />
      </mesh>

      {/* Buildings */}
      <group scale={[1, 1.5, 1]}>
        {buildings.map((building) => (
          <Building
            key={building.id}
            building={building}
            rfPoints={rfPoints.filter((p) => p.buildingId === building.id)}
            indoorRFPoints={indoorRFPoints.filter((p) => p.buildingId === building.id)}
            selectedFloor={
              selected?.buildingId === building.id ? selected.floor : null
            }
            onSelectFloor={(floor) =>
              setSelected({ buildingId: building.id, floor })
            }
            zoomLevel={zoomLevel}
            selectedMetric={selectedMetric}
          />
        ))}
      </group>

      {/* Camera Controls */}
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
      {/* Glow for additive sprites */}
      <EffectComposer>
        <Bloom
          intensity={0.6}
          luminanceThreshold={0.2}
          mipmapBlur
          radius={0.6}
        />
      </EffectComposer>
    </>
  );
}

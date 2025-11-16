"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useState } from "react";
import { Building } from "@/components/Building";
import { SignalBlobs } from "@/components/SignalBlobs";
import { SignalPoints } from "@/components/SignalPoints";
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
  return (
    <Canvas
      camera={{ position: [0, 150, 150], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
    >
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
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#808080" roughness={0.8} />
      </mesh>

      {/* Buildings */}
      {buildings.map((building) => (
        <Building
          key={building.id}
          building={building}
          rfPoints={rfPoints.filter((p) => p.buildingId === building.id)}
          selectedFloor={
            selected?.buildingId === building.id ? selected.floor : null
          }
          onSelectFloor={(floor) =>
            setSelected({ buildingId: building.id, floor })
          }
        />
      ))}

      {/* RF Signal Points */}
      <SignalPoints rfPoints={rfPoints} selectedMetric={selectedMetric} />
      {/* RF Cloud Blobs */}
      <SignalBlobs rfPoints={rfPoints} selectedMetric={selectedMetric} />

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
    </Canvas>
  );
}

"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { MetricType, RFPoint } from "@/types";
import { getColorFromMetric } from "@/lib/constants/rf-metrics";

interface IndoorSignalHeatmapProps {
  rfPoints: RFPoint[];
  selectedMetric: MetricType;
  buildingWidth: number;
  buildingDepth: number;
  floorY: number;
  buildingPosition: [number, number, number];
  buildingHeight: number;
  floorCount: number;
}

/**
 * Visualize indoor RF signal coverage as layer-by-layer heatmap
 */
export function IndoorSignalHeatmap({
  rfPoints,
  selectedMetric,
  buildingWidth,
  buildingDepth,
  floorY,
  buildingPosition,
  buildingHeight,
  floorCount,
}: IndoorSignalHeatmapProps) {
  // Create 3D voxel grid for volumetric signal visualization
  const voxelGrid = useMemo(() => {
    if (rfPoints.length === 0) return null;

    const group = new THREE.Group();
    const floorHeight = buildingHeight / floorCount;
    
    // Validate dimensions to prevent NaN errors
    if (!Number.isFinite(floorHeight) || floorHeight <= 0 || !Number.isFinite(buildingWidth) || !Number.isFinite(buildingDepth)) {
      console.error('Invalid dimensions:', { buildingHeight, floorCount, floorHeight, buildingWidth, buildingDepth });
      return null;
    }
    
    // Grid resolution for rooms/cells
    const gridX = 6;
    const gridZ = 6;
    const cellWidth = buildingWidth / gridX;
    const cellDepth = buildingDepth / gridZ;
    
    const [bx, , bz] = buildingPosition;
    
    // Create voxel cells
    const cellGeometry = new THREE.BoxGeometry(cellWidth * 0.95, floorHeight * 0.9, cellDepth * 0.95);
    
    // Calculate signal strength for each cell
    for (let ix = 0; ix < gridX; ix++) {
      for (let iz = 0; iz < gridZ; iz++) {
        // Cell center position
        const cellX = (ix - gridX / 2 + 0.5) * cellWidth;
        const cellZ = (iz - gridZ / 2 + 0.5) * cellDepth;
        
        // Find RF points in this cell
        let totalValue = 0;
        let count = 0;
        
        for (const point of rfPoints) {
          const [px, , pz] = point.position;
          const relativeX = px - bx;
          const relativeZ = pz - bz;
          
          // Check if point is in this cell (with some margin)
          const dx = Math.abs(relativeX - cellX);
          const dz = Math.abs(relativeZ - cellZ);
          
          if (dx < cellWidth && dz < cellDepth) {
            totalValue += point.metrics[selectedMetric];
            count++;
          }
        }
        
        if (count > 0) {
          const avgValue = totalValue / count;
          const [r, g, b] = getColorFromMetric(avgValue, selectedMetric);
          
          // Create semi-transparent voxel with signal color
          const material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(r, g, b),
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          
          const voxel = new THREE.Mesh(cellGeometry, material);
          voxel.position.set(cellX, floorHeight / 2, cellZ);
          group.add(voxel);
          
          // Add wireframe edges
          const edges = new THREE.EdgesGeometry(cellGeometry);
          const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3,
          });
          const wireframe = new THREE.LineSegments(edges, lineMaterial);
          wireframe.position.copy(voxel.position);
          group.add(wireframe);
        }
      }
    }
    
    return group;
  }, [rfPoints, selectedMetric, buildingWidth, buildingDepth, buildingPosition, buildingHeight, floorCount]);

  if (!voxelGrid) return null;

  return (
    <group position={[0, floorY, 0]}>
      {/* 3D Voxel grid with signal strength colors */}
      <primitive object={voxelGrid} />
    </group>
  );
}

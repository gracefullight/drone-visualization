import type { BuildingData } from "@/types";
import { FLOOR_HEIGHT } from "@/lib/constants/building";

/**
 * Generate a city layout with high-rise target buildings and low-rise background buildings
 * @returns Array of buildings with positions and dimensions
 */
export function generateCityLayout(): BuildingData[] {
  const buildings: BuildingData[] = [];

  // Generate 3 high-rise buildings (30-40 floors = 100-130m height)
  const highRisePositions: [number, number, number][] = [
    [0, 0, 0], // Center
    [-80, 0, -80], // Back left (increased spacing)
    [80, 0, 60], // Front right (increased spacing)
  ];

  for (let i = 0; i < 3; i++) {
    const height = 100 + Math.random() * 30; // 100-130m (30-40 floors)
    const width = 40 + Math.random() * 20; // 40-60m width (more realistic)
    const depth = 40 + Math.random() * 20; // 40-60m depth (more realistic)

    buildings.push({
      id: `highrise-${i}`,
      position: [
        highRisePositions[i][0],
        height / 2, // Y position is center of building
        highRisePositions[i][2],
      ],
      width,
      height,
      depth,
      isTarget: true,
      floorCount: Math.round(height / FLOOR_HEIGHT),
    });
  }

  // Generate 12-15 low-rise buildings (3-13 floors = 10-40m height)
  const lowRiseCount = 12 + Math.floor(Math.random() * 4); // 12-15 buildings
  const groundSize = 400; // Ground plane is 400m x 400m
  const margin = 30; // Keep buildings 30m away from edge

  for (let i = 0; i < lowRiseCount; i++) {
    const height = 10 + Math.random() * 30; // 10-40m (3-13 floors)
    const width = 20 + Math.random() * 15; // 20-35m width
    const depth = 20 + Math.random() * 15; // 20-35m depth

    let x = 0;
    let z = 0;
    let attempts = 0;
    let validPosition = false;

    // Try to find a valid position without collision
    while (!validPosition && attempts < 50) {
      // Distribute buildings in a grid pattern around high-rises
      const gridSize = 6;
      const spacing = 50 + Math.random() * 20; // Increased spacing for larger buildings
      const gridX = (i % gridSize) - gridSize / 2;
      const gridZ = Math.floor(i / gridSize) - 1;

      x = gridX * spacing + (Math.random() - 0.5) * 10;
      z = gridZ * spacing + (Math.random() - 0.5) * 10;

      // Clamp position to stay within ground boundaries
      const maxX = groundSize / 2 - margin - width / 2;
      const maxZ = groundSize / 2 - margin - depth / 2;
      x = Math.max(-maxX, Math.min(maxX, x));
      z = Math.max(-maxZ, Math.min(maxZ, z));

      // Check collision with all existing buildings
      validPosition = true;

      // Check high-rise buildings
      for (const [hx, , hz] of highRisePositions) {
        const distance = Math.sqrt((x - hx) ** 2 + (z - hz) ** 2);
        const minDistance = 60; // Minimum distance considering building sizes
        if (distance < minDistance) {
          validPosition = false;
          break;
        }
      }

      // Check other low-rise buildings
      if (validPosition) {
        for (const building of buildings) {
          if (building.isTarget) continue; // Already checked high-rises
          
          const [bx, , bz] = building.position;
          const dx = Math.abs(x - bx);
          const dz = Math.abs(z - bz);
          const minDx = (width + building.width) / 2 + 10; // 10m clearance
          const minDz = (depth + building.depth) / 2 + 10;
          
          if (dx < minDx && dz < minDz) {
            validPosition = false;
            break;
          }
        }
      }

      attempts++;
    }

    if (validPosition) {
      buildings.push({
        id: `lowrise-${i}`,
        position: [x, height / 2, z],
        width,
        height,
        depth,
        isTarget: false,
        floorCount: Math.round(height / FLOOR_HEIGHT),
      });
    }
  }

  return buildings;
}

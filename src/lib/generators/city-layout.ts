import type { BuildingData } from "@/types";

/**
 * Generate a city layout with high-rise target buildings and low-rise background buildings
 * @returns Array of buildings with positions and dimensions
 */
export function generateCityLayout(): BuildingData[] {
  const buildings: BuildingData[] = [];

  // Generate 3 high-rise buildings (30-40 floors = 100-130m height, assuming 3m per floor)
  const highRisePositions: [number, number, number][] = [
    [0, 0, 0], // Center
    [-20, 0, -20], // Back left
    [20, 0, 15], // Front right
  ];

  for (let i = 0; i < 3; i++) {
    const height = 100 + Math.random() * 30; // 100-130m (30-40 floors)
    const width = 4 + Math.random() * 2; // 4-6m width
    const depth = 4 + Math.random() * 2; // 4-6m depth

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
      floorCount: Math.round(height / 3),
    });
  }

  // Generate 12-15 low-rise buildings (3-13 floors = 10-40m height)
  const lowRiseCount = 12 + Math.floor(Math.random() * 4); // 12-15 buildings

  for (let i = 0; i < lowRiseCount; i++) {
    const height = 10 + Math.random() * 30; // 10-40m (3-13 floors)
    const width = 4 + Math.random() * 2; // 4-6m width
    const depth = 4 + Math.random() * 2; // 4-6m depth

    // Distribute buildings in a grid pattern around high-rises
    // Create a 6x6 grid with spacing of 10-12 units
    const gridSize = 6;
    const spacing = 10 + Math.random() * 2;
    const gridX = (i % gridSize) - gridSize / 2;
    const gridZ = Math.floor(i / gridSize) - 1;

    const x = gridX * spacing + (Math.random() - 0.5) * 3; // Add some randomness
    const z = gridZ * spacing + (Math.random() - 0.5) * 3;

    // Skip if too close to high-rise buildings
    const tooClose = highRisePositions.some(([hx, , hz]) => {
      const distance = Math.sqrt((x - hx) ** 2 + (z - hz) ** 2);
      return distance < 8; // Minimum 8m distance
    });

    if (!tooClose) {
      buildings.push({
        id: `lowrise-${i}`,
        position: [x, height / 2, z],
        width,
        height,
        depth,
        isTarget: false,
        floorCount: Math.round(height / 3),
      });
    }
  }

  return buildings;
}

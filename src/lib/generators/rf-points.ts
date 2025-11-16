import { METRIC_RANGES } from "@/lib/constants/rf-metrics";
import type { BuildingData, RFPoint } from "@/types";

/**
 * Generate RF measurement points for a building
 * @param building - Building to generate points for
 * @param pointsPerBuilding - Number of points to generate (default: 200)
 * @returns Array of RF points with realistic signal values
 */
export function generateRFPoints(
  building: BuildingData,
  pointsPerBuilding = 200,
): RFPoint[] {
  const points: RFPoint[] = [];
  const pointsPerWall = Math.floor(pointsPerBuilding / 4); // Distribute across 4 walls

  const [bx, by, bz] = building.position;
  const { width, height, depth } = building;

  // Calculate actual bounds (position is center, y position is already center)
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const bottomY = by - height / 2;

  // Define 4 walls with their normal vectors and positions
  const walls = [
    { name: "front", normal: [0, 0, 1], offsetX: 0, offsetZ: halfDepth }, // +Z
    { name: "back", normal: [0, 0, -1], offsetX: 0, offsetZ: -halfDepth }, // -Z
    { name: "right", normal: [1, 0, 0], offsetX: halfWidth, offsetZ: 0 }, // +X
    { name: "left", normal: [-1, 0, 0], offsetX: -halfWidth, offsetZ: 0 }, // -X
  ];

  let pointIndex = 0;

  for (const wall of walls) {
    for (let i = 0; i < pointsPerWall; i++) {
      // Distribute points vertically across the building height
      const heightRatio = i / pointsPerWall;
      const pointHeight = bottomY + heightRatio * height;

      // Distribute points horizontally along the wall
      const horizontalPosition = (i % 10) / 10 - 0.5; // -0.5 to 0.5

      // Calculate point position with slight offset from surface
      const surfaceOffset = 0.15; // 15cm from surface
      let px: number;
      let pz: number;

      if (wall.name === "front" || wall.name === "back") {
        px = bx + horizontalPosition * width;
        pz = bz + wall.offsetZ + wall.normal[2] * surfaceOffset;
      } else {
        px = bx + wall.offsetX + wall.normal[0] * surfaceOffset;
        pz = bz + horizontalPosition * depth;
      }

      // Generate realistic RF metrics based on height
      // Higher floors generally have better signal quality (less interference)
      const heightFactor = heightRatio; // 0 = ground, 1 = top

      // Generate metrics with realistic variations
      const metrics = {
        rssi: generateMetricValue("rssi", heightFactor),
        cqi: generateMetricValue("cqi", heightFactor),
        rsrp: generateMetricValue("rsrp", heightFactor),
        rsrq: generateMetricValue("rsrq", heightFactor),
        snr: generateMetricValue("snr", heightFactor),
      };

      points.push({
        id: `${building.id}-point-${pointIndex}`,
        buildingId: building.id,
        position: [px, pointHeight, pz],
        metrics,
      });

      pointIndex++;
    }
  }

  return points;
}

/**
 * Generate a realistic metric value based on height factor
 * @param metric - Metric type
 * @param heightFactor - Height ratio (0 = ground, 1 = top)
 * @returns Metric value within realistic range
 */
function generateMetricValue(
  metric: "rssi" | "cqi" | "rsrp" | "rsrq" | "snr",
  heightFactor: number,
): number {
  const range = METRIC_RANGES[metric];
  const { min, max } = range;

  // Base value: better signal at higher floors
  // Ground floor (heightFactor = 0): 20-40% of range
  // Top floor (heightFactor = 1): 60-90% of range
  const baseQuality = 0.2 + heightFactor * 0.5 + Math.random() * 0.3;

  // Add some variation to simulate realistic conditions
  const variation = (Math.random() - 0.5) * 0.2; // ±10%
  const quality = Math.max(0, Math.min(1, baseQuality + variation));

  // Convert quality (0-1) to metric value
  const value = min + quality * (max - min);

  // Round to appropriate precision
  if (metric === "cqi") {
    return Math.round(value);
  }
  return Math.round(value * 10) / 10;
}

/**
 * Generate RF points for all target buildings
 * @param buildings - Array of buildings
 * @returns Array of RF points for all target buildings
 */
export function generateAllRFPoints(buildings: BuildingData[]): RFPoint[] {
  const allPoints: RFPoint[] = [];

  for (const building of buildings) {
    if (building.isTarget) {
      const points = generateRFPoints(building, 200);
      allPoints.push(...points);
    }
  }

  return allPoints;
}

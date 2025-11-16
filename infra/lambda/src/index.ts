// Lambda handler for RF data generation
// TypeScript version with inline type definitions

interface BuildingData {
  id: string;
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  isTarget: boolean;
  floorCount: number;
}

interface RFPoint {
  id: string;
  buildingId: string;
  position: [number, number, number];
  metrics: {
    rssi: number;
    cqi: number;
    rsrp: number;
    rsrq: number;
    snr: number;
  };
}

interface RFDataResponse {
  buildings: BuildingData[];
  rfPoints: RFPoint[];
}

type MetricType = "rssi" | "cqi" | "rsrp" | "rsrq" | "snr";

const METRIC_RANGES: Record<MetricType, { min: number; max: number }> = {
  rssi: { min: -120, max: -40 },
  cqi: { min: 0, max: 15 },
  rsrp: { min: -140, max: -44 },
  rsrq: { min: -20, max: -3 },
  snr: { min: -10, max: 30 },
};

function generateMetricValue(metric: MetricType, heightFactor: number): number {
  const range = METRIC_RANGES[metric];
  const { min, max } = range;
  const baseQuality = 0.2 + heightFactor * 0.5 + Math.random() * 0.3;
  const variation = (Math.random() - 0.5) * 0.2;
  const quality = Math.max(0, Math.min(1, baseQuality + variation));
  const value = min + quality * (max - min);
  return metric === "cqi" ? Math.round(value) : Math.round(value * 10) / 10;
}

function generateRFPoints(
  building: BuildingData,
  pointsPerBuilding = 200
): RFPoint[] {
  const points: RFPoint[] = [];
  const pointsPerWall = Math.floor(pointsPerBuilding / 4);
  const [bx, by, bz] = building.position;
  const { width, height, depth } = building;
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const bottomY = by - height / 2;

  const walls = [
    { name: "front", normal: [0, 0, 1], offsetX: 0, offsetZ: halfDepth },
    { name: "back", normal: [0, 0, -1], offsetX: 0, offsetZ: -halfDepth },
    { name: "right", normal: [1, 0, 0], offsetX: halfWidth, offsetZ: 0 },
    { name: "left", normal: [-1, 0, 0], offsetX: -halfWidth, offsetZ: 0 },
  ];

  let pointIndex = 0;
  for (const wall of walls) {
    for (let i = 0; i < pointsPerWall; i++) {
      const heightRatio = i / pointsPerWall;
      const pointHeight = bottomY + heightRatio * height;
      const horizontalPosition = ((i % 10) / 10) - 0.5;
      const surfaceOffset = 0.15;

      let px: number;
      let pz: number;

      if (wall.name === "front" || wall.name === "back") {
        px = bx + horizontalPosition * width;
        pz = bz + wall.offsetZ + wall.normal[2] * surfaceOffset;
      } else {
        px = bx + wall.offsetX + wall.normal[0] * surfaceOffset;
        pz = bz + horizontalPosition * depth;
      }

      points.push({
        id: `${building.id}-point-${pointIndex}`,
        buildingId: building.id,
        position: [px, pointHeight, pz],
        metrics: {
          rssi: generateMetricValue("rssi", heightRatio),
          cqi: generateMetricValue("cqi", heightRatio),
          rsrp: generateMetricValue("rsrp", heightRatio),
          rsrq: generateMetricValue("rsrq", heightRatio),
          snr: generateMetricValue("snr", heightRatio),
        },
      });
      pointIndex++;
    }
  }
  return points;
}

function generateCityLayout(): BuildingData[] {
  const buildings: BuildingData[] = [];
  const highRisePositions: [number, number, number][] = [
    [0, 0, 0],
    [-20, 0, -20],
    [20, 0, 15],
  ];

  for (let i = 0; i < 3; i++) {
    const height = 100 + Math.random() * 30;
    const width = 4 + Math.random() * 2;
    const depth = 4 + Math.random() * 2;
    buildings.push({
      id: `highrise-${i}`,
      position: [highRisePositions[i][0], height / 2, highRisePositions[i][2]],
      width,
      height,
      depth,
      isTarget: true,
      floorCount: Math.round(height / 3),
    });
  }

  const lowRiseCount = 12 + Math.floor(Math.random() * 4);
  for (let i = 0; i < lowRiseCount; i++) {
    const height = 10 + Math.random() * 30;
    const width = 4 + Math.random() * 2;
    const depth = 4 + Math.random() * 2;
    const gridSize = 6;
    const spacing = 10 + Math.random() * 2;
    const gridX = (i % gridSize) - gridSize / 2;
    const gridZ = Math.floor(i / gridSize) - 1;
    const x = gridX * spacing + (Math.random() - 0.5) * 3;
    const z = gridZ * spacing + (Math.random() - 0.5) * 3;

    const tooClose = highRisePositions.some(([hx, , hz]) => {
      const distance = Math.sqrt((x - hx) ** 2 + (z - hz) ** 2);
      return distance < 8;
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

function generateAllRFPoints(buildings: BuildingData[]): RFPoint[] {
  const allPoints: RFPoint[] = [];
  for (const building of buildings) {
    if (building.isTarget) {
      allPoints.push(...generateRFPoints(building, 200));
    }
  }
  return allPoints;
}

function buildCorsHeaders(originHeader?: string): Record<string, string> {
  const allowed = (process.env.CORS_ORIGINS || "").split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = originHeader && allowed.includes(originHeader) ? originHeader : "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
    "Content-Type": "application/json",
  };
}

// Using minimal types to avoid extra deps; API Gateway proxy shape
type APIGatewayEvent = { httpMethod?: string; headers?: Record<string, string | undefined> };

export const handler = async (event?: APIGatewayEvent): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> => {
  try {
    // Handle CORS preflight
    if (event?.httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: buildCorsHeaders(event?.headers?.origin || event?.headers?.Origin),
        body: "",
      };
    }

    const buildings = generateCityLayout();
    const rfPoints = generateAllRFPoints(buildings);

    const response: RFDataResponse = {
      buildings,
      rfPoints,
    };

    return {
      statusCode: 200,
      headers: buildCorsHeaders(event?.headers?.origin || event?.headers?.Origin),
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error("Error generating RF data:", error);
    return {
      statusCode: 500,
      headers: buildCorsHeaders(event?.headers?.origin || event?.headers?.Origin),
      body: JSON.stringify({
        error: "Failed to generate RF data",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

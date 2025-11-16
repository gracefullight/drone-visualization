export type MetricType = "rssi" | "cqi" | "rsrp" | "rsrq" | "snr";

export interface BuildingData {
  id: string;
  position: [number, number, number];
  width: number;
  height: number;
  depth: number;
  isTarget: boolean;
  floorCount: number;
}

export interface RFPoint {
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

export interface RFDataResponse {
  buildings: BuildingData[];
  rfPoints: RFPoint[];
}

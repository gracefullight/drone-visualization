import { generateCityLayout } from "@/lib/generators/city-layout";
import { generateAllRFPoints } from "@/lib/generators/rf-points";
import type { RFDataResponse } from "@/types";

// Local-only data generation for static export. Remote fetch removed until needed.
export async function fetchRFData(): Promise<RFDataResponse> {
  const buildings = generateCityLayout();
  const rfPoints = generateAllRFPoints(buildings);
  return { buildings, rfPoints };
}
import axios from "axios";
import type { RFDataResponse } from "@/types";
import { generateCityLayout } from "@/lib/generators/city-layout";
import { generateAllRFPoints } from "@/lib/generators/rf-points";

// Optional runtime endpoint for future server deployment.
// If NEXT_PUBLIC_RF_DATA_ENDPOINT is defined, we try to fetch from it.
// Otherwise we fall back to local generation so static export still works.
const ENDPOINT = process.env.NEXT_PUBLIC_RF_DATA_ENDPOINT;

export async function fetchRFData(): Promise<RFDataResponse> {
  if (ENDPOINT) {
    try {
      const res = await axios.get<RFDataResponse>(ENDPOINT, { timeout: 8000 });
      if (res.data?.buildings && res.data?.rfPoints) {
        return res.data;
      }
    } catch {
      // Swallow and fall back silently
    }
  }
  // Fallback: generate locally (client-side deterministic-ish simulation)
  const buildings = generateCityLayout();
  const rfPoints = generateAllRFPoints(buildings);
  return { buildings, rfPoints };
}
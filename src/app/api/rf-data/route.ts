import { NextResponse } from "next/server";
import { generateCityLayout } from "@/lib/generators/city-layout";
import { generateAllRFPoints } from "@/lib/generators/rf-points";
import type { RFDataResponse } from "@/types";

export async function GET() {
  try {
    // Generate city layout
    const buildings = generateCityLayout();

    // Generate RF points for target buildings
    const rfPoints = generateAllRFPoints(buildings);

    const response: RFDataResponse = {
      buildings,
      rfPoints,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating RF data:", error);
    return NextResponse.json(
      { error: "Failed to generate RF data" },
      { status: 500 },
    );
  }
}

"use client";

import { useEffect, useState } from "react";
import { MetricControls } from "@/components/MetricControls";
import { Scene } from "@/components/Scene";
import type { MetricType, RFDataResponse } from "@/types";
import { fetchRFData } from "@/lib/api/rf-data";

export default function Home() {
  const [data, setData] = useState<RFDataResponse | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRFData()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Failed to load data";
        setError(msg);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading RF data...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-500">
          Error: {error || "No data available"}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen">
      <Scene
        buildings={data.buildings}
        rfPoints={data.rfPoints}
        selectedMetric={selectedMetric ?? "rsrp"}
      />
      <MetricControls
        className="absolute right-4 top-4 z-10"
        selectedMetric={selectedMetric}
        onMetricChange={setSelectedMetric}
        rfPoints={data.rfPoints}
      />
    </div>
  );
}

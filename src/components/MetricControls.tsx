"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { getQualityLevel, METRIC_RANGES } from "@/lib/constants/rf-metrics";
import type { MetricType, RFPoint } from "@/types";

interface MetricControlsProps {
  selectedMetric: MetricType | null;
  onMetricChange: (metric: MetricType | null) => void;
  rfPoints: RFPoint[];
  className?: string;
}

export function MetricControls(props: MetricControlsProps) {
  const { selectedMetric, onMetricChange, rfPoints, className } = props;
  const metrics: MetricType[] = ["rssi", "cqi", "rsrp", "rsrq", "snr"];

  // Calculate normalized overall average across all metrics
  const overallStats = useMemo(() => {
    if (rfPoints.length === 0) {
      return { normalizedAvg: 0, quality: "poor" as const };
    }
    let sumNorm = 0;
    for (const metric of metrics) {
      const values = rfPoints.map((p) => p.metrics[metric]);
      const range = METRIC_RANGES[metric];
      const avg = values.reduce((acc, v) => acc + v, 0) / values.length;
      const norm = Math.max(
        0,
        Math.min(1, (avg - range.min) / (range.max - range.min)),
      );
      sumNorm += norm;
    }
    const normalizedAvg = sumNorm / metrics.length;
    let quality: "excellent" | "good" | "fair" | "poor" = "poor";
    if (normalizedAvg >= 0.75) quality = "excellent";
    else if (normalizedAvg >= 0.5) quality = "good";
    else if (normalizedAvg >= 0.25) quality = "fair";
    return { normalizedAvg, quality };
  }, [rfPoints]);

  // Per-metric stats (only used if selectedMetric is not null)
  const stats = useMemo(() => {
    if (!selectedMetric || rfPoints.length === 0) {
      return { average: 0, min: 0, max: 0, quality: "poor" as const };
    }
    const values = rfPoints.map((point) => point.metrics[selectedMetric]);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const quality = getQualityLevel(average, selectedMetric);
    return { average, min, max, quality };
  }, [rfPoints, selectedMetric]);

  const metricInfo = selectedMetric ? METRIC_RANGES[selectedMetric] : null;

  const qualityVariant = {
    excellent: "default",
    good: "default",
    fair: "secondary",
    poor: "destructive",
  } as const;

  return (
    <div className={className}>
      <Card className="w-80">
        <CardHeader>
          <CardTitle>RF Signal Metrics</CardTitle>
          <CardDescription>
            Select a metric to visualize signal quality
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Normalized overall average at the top */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">
                Normalized Overall Average:
              </span>
              <span className="font-bold text-base">
                {(overallStats.normalizedAvg * 100).toFixed(1)}%
              </span>
            </div>
            <Badge variant={qualityVariant[overallStats.quality]}>
              {overallStats.quality}
            </Badge>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Select Metric:</p>
            <ToggleGroup
              type="single"
              value={selectedMetric ?? ""}
              onValueChange={(value) => {
                if (value) {
                  onMetricChange(value as MetricType);
                } else {
                  onMetricChange(null);
                }
              }}
              className="flex-wrap justify-start"
            >
              {metrics.map((metric) => (
                <ToggleGroupItem
                  key={metric}
                  value={metric}
                  aria-label={`Select ${METRIC_RANGES[metric].name}`}
                  className="text-xs cursor-pointer data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90"
                >
                  {METRIC_RANGES[metric].name}
                  {METRIC_RANGES[metric].unit && (
                    <span className="ml-1 opacity-70">
                      ({METRIC_RANGES[metric].unit})
                    </span>
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {selectedMetric && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => onMetricChange(null)}
              >
                Reset
              </Button>
            )}
          </div>

          {/* Only show per-metric stats if a metric is selected */}
          {selectedMetric && metricInfo && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metricInfo.name}</span>
                  <Badge variant={qualityVariant[stats.quality]}>
                    {stats.quality}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {metricInfo.description}
                </p>
              </div>

              <div className="space-y-2 rounded-md border p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Average:</span>
                  <span className="font-medium">
                    {stats.average.toFixed(1)} {metricInfo.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Min:</span>
                  <span className="font-medium">
                    {stats.min.toFixed(1)} {metricInfo.unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Max:</span>
                  <span className="font-medium">
                    {stats.max.toFixed(1)} {metricInfo.unit}
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-3 w-8 rounded bg-linear-to-r from-red-500 to-green-500" />
              <span>Poor → Good Signal</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

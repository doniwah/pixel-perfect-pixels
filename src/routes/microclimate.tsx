import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { LiveDot, MicroclimateChart, RangeTabs, StatusPill } from "@/components/greenhouse-ui";
import {
  HUMIDITY_TARGET,
  TEMP_TARGET,
  statusFor,
  useGreenhouse,
  type RangeKey,
} from "@/lib/greenhouse";

export const Route = createFileRoute("/microclimate")({
  head: () => ({
    meta: [
      { title: "Microclimate Monitoring — Smart Greenhouse" },
      {
        name: "description",
        content:
          "Detailed DHT22 temperature and humidity statistics with historical charts for the melon greenhouse.",
      },
      { property: "og:title", content: "Microclimate Monitoring — Smart Greenhouse" },
      {
        property: "og:description",
        content: "Temperature and humidity statistics and history for the melon greenhouse.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Microclimate,
});

const RANGES = ["6h", "12h", "24h", "7d", "30d"] as const;

function MetricBlock({
  label,
  current,
  unit,
  target,
  stats,
  decimals,
}: {
  label: string;
  current: number;
  unit: string;
  target: string;
  stats: { min: number; max: number; avg: number };
  decimals: number;
}) {
  const status =
    label === "Temperature" ? statusFor(current, TEMP_TARGET) : statusFor(current, HUMIDITY_TARGET);
  const fmt = (v: number) => `${v.toFixed(decimals)}${unit}`;

  return (
    <div className="surface-card p-7">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="numeric-xl mt-4">{fmt(current)}</p>
          <p className="mt-3 text-sm text-muted-foreground">Target {target}</p>
        </div>
        <StatusPill status={status} />
      </div>
      <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-border pt-5">
        {[
          ["Minimum today", stats.min],
          ["Maximum today", stats.max],
          ["Average", stats.avg],
        ].map(([title, value]) => (
          <div key={title as string}>
            <dt className="text-xs text-muted-foreground">{title as string}</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{fmt(value as number)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Microclimate() {
  const { current, tempStats, humidityStats, history, activeNode, isConnected, thresholds } = useGreenhouse();
  const [range, setRange] = useState<RangeKey>("24h");

  return (
    <AppLayout>
      <PageHeader
        title="Microclimate Monitoring"
        subtitle={`${activeNode} sensor readings from Firebase Realtime Database`}
        right={<LiveDot label={isConnected ? "Firebase Connected" : "Connecting..."} />}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <MetricBlock
          label="Temperature"
          current={current.temperature}
          unit="°C"
          target="25–30°C"
          stats={tempStats}
          decimals={1}
        />
        <MetricBlock
          label="Humidity"
          current={current.humidity}
          unit="%"
          target="60–80%"
          stats={humidityStats}
          decimals={0}
        />
      </div>

      <section className="surface-card mt-5 p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Historical readings</h2>
          <RangeTabs value={range} onChange={setRange} options={RANGES} />
        </div>
        <div className="mt-6">
          <MicroclimateChart data={history(range)} height={380} />
        </div>
      </section>
    </AppLayout>
  );
}

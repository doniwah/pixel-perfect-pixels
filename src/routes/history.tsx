import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { RangeTabs } from "@/components/greenhouse-ui";
import { formatTime, useGreenhouse, type RangeKey } from "@/lib/greenhouse";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Historical Data — Smart Greenhouse" },
      {
        name: "description",
        content:
          "Logged sensor and actuator records: temperature, humidity, cooling, heater and system mode.",
      },
      { property: "og:title", content: "Historical Data — Smart Greenhouse" },
      {
        property: "og:description",
        content: "Logged sensor and actuator records from the greenhouse controller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: History,
});

const RANGES = ["6h", "12h", "24h", "7d"] as const;

function StateCell({ on, tone }: { on: boolean; tone: "cooling" | "heater" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium",
        on
          ? tone === "cooling"
            ? "bg-cooling/12 text-cooling"
            : "bg-heater/12 text-heater"
          : "bg-secondary text-muted-foreground",
      )}
    >
      {on ? "ON" : "OFF"}
    </span>
  );
}

function History() {
  const { history } = useGreenhouse();
  const [range, setRange] = useState<RangeKey>("24h");
  const rows = [...history(range)].reverse().slice(0, 60);

  return (
    <AppLayout>
      <PageHeader
        title="Historical Data"
        subtitle="Sensor and actuator log recorded by the ESP8266 node"
        right={
          <button className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary">
            <Download className="size-4" /> Export CSV
          </button>
        }
      />

      <div className="mb-5">
        <RangeTabs value={range} onChange={setRange} options={RANGES} />
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                {["Timestamp", "Temperature", "Humidity", "Cooling", "Heater", "System Mode"].map(
                  (h) => (
                    <th key={h} className="px-6 py-4 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.t}
                  className="border-b border-border last:border-0 transition-colors hover:bg-secondary/60"
                >
                  <td className="px-6 py-3.5 tabular-nums text-muted-foreground">
                    {formatTime(r.t)}
                  </td>
                  <td className="px-6 py-3.5 font-medium tabular-nums">
                    {r.temperature.toFixed(1)}°C
                  </td>
                  <td className="px-6 py-3.5 font-medium tabular-nums">{r.humidity}%</td>
                  <td className="px-6 py-3.5">
                    <StateCell on={r.cooling} tone="cooling" />
                  </td>
                  <td className="px-6 py-3.5">
                    <StateCell on={r.heater} tone="heater" />
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">{r.mode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}

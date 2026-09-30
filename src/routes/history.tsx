import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
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
  const { history, activeNode, readingsCount, isConnected } = useGreenhouse();
  const [range, setRange] = useState<RangeKey>("24h");
  const rows = [...history(range)].reverse().slice(0, 100);

  const exportCSV = () => {
    if (!rows.length) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    const headers = ["Timestamp", "ISO_Time", "Temperature_C", "Humidity_Pct", "Cooling", "Heater", "Mode"];
    const csvLines = [headers.join(",")];

    rows.forEach((r) => {
      const d = new Date(r.t);
      csvLines.push(
        [
          r.t,
          `"${d.toISOString()}"`,
          r.temperature.toFixed(1),
          r.humidity,
          r.cooling ? "ON" : "OFF",
          r.heater ? "ON" : "OFF",
          r.mode,
        ].join(",")
      );
    });

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `greenhouse_${activeNode}_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded!");
  };

  return (
    <AppLayout>
      <PageHeader
        title="Historical Data"
        subtitle={`Sensor & actuator log from Firebase RTDB (${activeNode} · ${readingsCount} records total)`}
        right={
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary cursor-pointer"
          >
            <Download className="size-4" /> Export CSV
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <RangeTabs value={range} onChange={setRange} options={RANGES} />
        <span className="text-xs text-muted-foreground">
          Showing latest {rows.length} readings {isConnected ? "(Live Firebase)" : ""}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                {["Timestamp", "Full Date / Time", "Temperature", "Humidity", "Cooling", "Heater", "System Mode"].map(
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
                  <td className="px-6 py-3.5 text-xs tabular-nums text-muted-foreground">
                    {new Date(r.t).toLocaleString("id-ID")}
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

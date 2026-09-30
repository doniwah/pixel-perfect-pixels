import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Snowflake, Flame, ArrowRight, Radio } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/app-layout";
import {
  ActuatorCard,
  ConditionRing,
  LiveDot,
  MicroclimateChart,
  RangeTabs,
  SensorCard,
} from "@/components/greenhouse-ui";
import {
  HUMIDITY_TARGET,
  TEMP_TARGET,
  formatTime,
  statusFor,
  useGreenhouse,
  type RangeKey,
} from "@/lib/greenhouse";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Greenhouse — Precision Microclimate Control" },
      {
        name: "description",
        content:
          "Real-time IoT dashboard monitoring temperature, humidity and actuators for premium melon cultivation.",
      },
      { property: "og:title", content: "Smart Greenhouse — Precision Microclimate Control" },
      {
        property: "og:description",
        content:
          "Real-time IoT dashboard monitoring temperature, humidity and actuators for premium melon cultivation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const RANGES = ["6h", "12h", "24h", "7d"] as const;

function Dashboard() {
  const {
    current,
    history,
    score,
    now,
    isConnected,
    rawStatus,
    activeNode,
    setActiveNode,
    readingsCount,
  } = useGreenhouse();

  const [range, setRange] = useState<RangeKey>("24h");

  const tempStatus = statusFor(current.temperature, TEMP_TARGET);
  const humStatus = statusFor(current.humidity, HUMIDITY_TARGET);

  return (
    <AppLayout>
      <PageHeader
        title="Smart Greenhouse"
        subtitle={`Precision Microclimate Control · Real-time Firebase RTDB`}
        right={
          <div className="text-left sm:text-right">
            <div className="flex items-center gap-2 justify-start sm:justify-end">
              <LiveDot label={isConnected ? "Firebase Online" : "Connecting Firebase..."} />
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {activeNode}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Status: <span className="font-medium text-foreground">{rawStatus}</span> · Last updated: {formatTime(now)}
            </p>
          </div>
        }
      />

      {/* Sensor Node Switcher & Live Connection Banner */}
      <div className="surface-card mb-5 flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Radio className="size-4 animate-pulse" />
          </span>
          <div>
            <p className="font-medium">
              Node Aktif: <span className="font-semibold text-primary">{activeNode}</span>
              <span className="ml-2 text-xs text-muted-foreground">({readingsCount} riwayat data)</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Database: <code className="text-xs font-mono">kelompok1-fa379-default-rtdb</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pilih Node:</span>
          <button
            onClick={() => setActiveNode("DHT22")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              activeNode === "DHT22"
                ? "bg-foreground text-background shadow-soft"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            DHT22
          </button>
          <button
            onClick={() => setActiveNode("DHT11")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              activeNode === "DHT11"
                ? "bg-foreground text-background shadow-soft"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            DHT11
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SensorCard
          label="Temperature"
          value={current.temperature.toFixed(1)}
          unit="°C"
          status={tempStatus}
          target="25–30°C"
        />
        <SensorCard
          label="Humidity"
          value={String(Math.round(current.humidity))}
          unit="%"
          status={humStatus}
          target="60–80%"
        />

        <div className="surface-card flex flex-col items-center p-7 text-center">
          <p className="self-start text-sm font-medium text-muted-foreground">
            Microclimate Condition
          </p>
          <div className="my-2">
            <ConditionRing score={score} />
          </div>
          <p className="text-sm text-muted-foreground">
            Skor kondisi mikroklimat otomatis dihitung berdasarkan data sensor live Firebase.
          </p>
        </div>
      </div>


      <section className="surface-card mt-5 p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Microclimate Trend</h2>
            <p className="text-sm text-muted-foreground">Grafik suhu & kelembapan dari riwayat Firebase</p>
          </div>
          <RangeTabs value={range} onChange={setRange} options={RANGES} />
        </div>
        <div className="mt-6">
          <MicroclimateChart data={history(range)} />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Actuator Status</h2>
          <span className="text-xs text-muted-foreground">
            Mode: <strong className="text-foreground">{current.mode}</strong>
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <ActuatorCard
            title="Cooling / Fogger"
            description={`${activeNode} Cooling Fan / Fogger — Relay 1 + Red LED (D5)`}
            active={current.cooling}
            tone="cooling"
            icon={<Snowflake className="size-5" />}
          />
          <ActuatorCard
            title="Heater"
            description={`${activeNode} Heater — Relay 2 + Blue LED (D6)`}
            active={current.heater}
            tone="heater"
            icon={<Flame className="size-5" />}
          />
        </div>
      </section>

      <section className="surface-card mt-5 flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Automation & Relay Control</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {current.mode}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {current.cooling
              ? "Suhu di atas target batas atas — pendingin / fogger aktif otomatis."
              : current.heater
                ? "Suhu di bawah target batas bawah — pemanas aktif otomatis."
                : "Suhu dalam rentang ideal target."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cooling Relay: {current.cooling ? "ON" : "OFF"} · Heater Relay: {current.heater ? "ON" : "OFF"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/control"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            Smart Control
          </Link>
          <Link
            to="/automation"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Manage Automation <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Snowflake, Flame, ArrowRight } from "lucide-react";
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
  const { current, history, score, now } = useGreenhouse();
  const [range, setRange] = useState<RangeKey>("24h");

  const tempStatus = statusFor(current.temperature, TEMP_TARGET);
  const humStatus = statusFor(current.humidity, HUMIDITY_TARGET);

  return (
    <AppLayout>
      <PageHeader
        title="Smart Greenhouse"
        subtitle="Precision Microclimate Control"
        right={
          <div className="text-left sm:text-right">
            <LiveDot label="System Online" />
            <p className="mt-1 text-sm text-muted-foreground">Last updated: {formatTime(now)}</p>
          </div>
        }
      />

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
          value={String(current.humidity)}
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
            Rule-based score of how closely temperature and humidity match the configured target
            ranges.
          </p>
        </div>
      </div>

      <section className="surface-card mt-5 p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Microclimate</h2>
            <p className="text-sm text-muted-foreground">Temperature and humidity trend</p>
          </div>
          <RangeTabs value={range} onChange={setRange} options={RANGES} />
        </div>
        <div className="mt-6">
          <MicroclimateChart data={history(range)} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Actuator Status</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <ActuatorCard
            title="Cooling / Fogger"
            description="Simulated Cooling Fan / Fogger — Relay + Red LED"
            active={current.cooling}
            tone="cooling"
            icon={<Snowflake className="size-5" />}
          />
          <ActuatorCard
            title="Heater"
            description="Simulated Heater — Relay + Blue LED"
            active={current.heater}
            tone="heater"
            icon={<Flame className="size-5" />}
          />
        </div>
      </section>

      <section className="surface-card mt-5 flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Automation</h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {current.mode}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {current.cooling
              ? "Temperature is above the target range — cooling engaged."
              : current.heater
                ? "Temperature is below the target range — heater engaged."
                : "Temperature is within target range."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cooling: {current.cooling ? "ON" : "OFF"} · Heater: {current.heater ? "ON" : "OFF"}
          </p>
        </div>
        <Link
          to="/automation"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Manage Automation <ArrowRight className="size-4" />
        </Link>
      </section>
    </AppLayout>
  );
}

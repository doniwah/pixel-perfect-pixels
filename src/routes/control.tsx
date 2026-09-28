import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Snowflake, Flame, Cpu } from "lucide-react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { ActuatorCard } from "@/components/greenhouse-ui";
import { Switch } from "@/components/ui/switch";
import { useGreenhouse } from "@/lib/greenhouse";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/control")({
  head: () => ({
    meta: [
      { title: "Smart Control — Smart Greenhouse" },
      {
        name: "description",
        content:
          "Switch between automatic and manual mode and drive the cooling fogger and heater relays.",
      },
      { property: "og:title", content: "Smart Control — Smart Greenhouse" },
      {
        property: "og:description",
        content: "Manual and automatic actuator control for the greenhouse relays.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Control,
});

function Control() {
  const { current } = useGreenhouse();
  const [manual, setManual] = useState(false);
  const [cooling, setCooling] = useState(false);
  const [heater, setHeater] = useState(false);

  const coolingOn = manual ? cooling : current.cooling;
  const heaterOn = manual ? heater : current.heater;

  const setMode = (value: boolean) => {
    setManual(value);
    toast(value ? "Manual mode enabled" : "Automatic mode restored", {
      description: value
        ? "Automation rules are paused. You are driving the relays."
        : "Relays follow the configured temperature rules again.",
    });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Smart Control"
        subtitle="Relay control for the cooling fogger and heater"
      />

      <div className="surface-card flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Cpu className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Control mode</p>
            <p className="text-sm text-muted-foreground">
              {manual
                ? "Manual — actuators respond only to your input."
                : "Automatic — actuators follow the microclimate rules."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn("text-sm font-medium", !manual ? "text-foreground" : "text-muted-foreground")}
          >
            Automatic
          </span>
          <Switch checked={manual} onCheckedChange={setMode} />
          <span
            className={cn("text-sm font-medium", manual ? "text-foreground" : "text-muted-foreground")}
          >
            Manual
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <ActuatorCard
          title="Cooling / Fogger"
          description="Relay 1 + Red LED · D5"
          active={coolingOn}
          tone="cooling"
          icon={<Snowflake className="size-5" />}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {manual ? "Manual override" : "Controlled by automation"}
              </span>
              <Switch
                checked={coolingOn}
                disabled={!manual}
                onCheckedChange={(v) => {
                  setCooling(v);
                  toast(`Cooling ${v ? "ON" : "OFF"}`);
                }}
              />
            </div>
          }
        />
        <ActuatorCard
          title="Heater"
          description="Relay 2 + Blue LED · D6"
          active={heaterOn}
          tone="heater"
          icon={<Flame className="size-5" />}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {manual ? "Manual override" : "Controlled by automation"}
              </span>
              <Switch
                checked={heaterOn}
                disabled={!manual}
                onCheckedChange={(v) => {
                  setHeater(v);
                  toast(`Heater ${v ? "ON" : "OFF"}`);
                }}
              />
            </div>
          }
        />
      </div>

      <div className="surface-card mt-5 p-7">
        <h2 className="text-lg font-semibold">Device</h2>
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          {[
            ["Microcontroller", "Wemos D1 Mini (ESP8266)"],
            ["Sensor", "DHT22 — temperature & humidity"],
            ["Sampling interval", "5 seconds"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-sm font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </AppLayout>
  );
}

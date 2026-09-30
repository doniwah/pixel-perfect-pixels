import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
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
  const { current, setMode: syncModeToFirebase, setActuator, isConnected, activeNode } = useGreenhouse();
  const manual = current.mode === "MANUAL";
  const coolingOn = current.cooling;
  const heaterOn = current.heater;

  // Track if user explicitly clicked toggle to differentiate from microcontroller safety cutoff
  const userInitiatedModeChange = useRef(false);
  const prevManual = useRef(manual);

  useEffect(() => {
    // If mode turned from manual to automatic without user clicking the switch
    if (prevManual.current && !manual && !userInitiatedModeChange.current) {
      toast.warning("Sistem Pengaman Aktif", {
        description: "Suhu mencapai batas maksimal. Pemanas telah dimatikan dan mode kontrol otomatis diaktifkan kembali.",
        duration: 5000,
      });
    }
    userInitiatedModeChange.current = false;
    prevManual.current = manual;
  }, [manual]);

  const handleModeChange = async (isManual: boolean) => {
    userInitiatedModeChange.current = true;
    const nextMode = isManual ? "MANUAL" : "AUTOMATIC";
    try {
      await syncModeToFirebase(nextMode);
      toast.success(isManual ? "Manual mode enabled" : "Automatic mode restored", {
        description: isManual
          ? "Automation rules paused. Relay control sent to Firebase."
          : "Relays follow configured temperature rules in Firebase.",
      });
    } catch (err: any) {
      toast.error("Failed to update mode in Firebase: " + err.message);
    }
  };

  const handleCoolingChange = async (v: boolean) => {
    try {
      await setActuator("cooling", v);
      toast.success(`Cooling fogger ${v ? "ON" : "OFF"} (Firebase updated)`);
    } catch (err: any) {
      toast.error("Failed to update cooling in Firebase: " + err.message);
    }
  };

  const handleHeaterChange = async (v: boolean) => {
    try {
      await setActuator("heater", v);
      toast.success(`Heater ${v ? "ON" : "OFF"} (Firebase updated)`);
    } catch (err: any) {
      toast.error("Failed to update heater in Firebase: " + err.message);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Smart Control"
        subtitle={`Relay control for ${activeNode} cooling fogger and heater (Live Firebase)`}
      />

      <div className="surface-card flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
            <Cpu className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">Control mode</p>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                isConnected ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              )}>
                {isConnected ? "Firebase Connected" : "Connecting..."}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {manual
                ? "Manual — actuators respond directly to your input and sync with Firebase."
                : "Automatic — actuators follow the microclimate rules in Firebase."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={cn("text-sm font-medium", !manual ? "text-foreground" : "text-muted-foreground")}
          >
            Automatic
          </span>
          <Switch checked={manual} onCheckedChange={handleModeChange} />
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
                {manual ? "Manual override (Firebase)" : "Controlled by automation"}
              </span>
              <Switch
                checked={coolingOn}
                disabled={!manual}
                onCheckedChange={handleCoolingChange}
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
                {manual ? "Manual override (Firebase)" : "Controlled by automation"}
              </span>
              <Switch
                checked={heaterOn}
                disabled={!manual}
                onCheckedChange={handleHeaterChange}
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

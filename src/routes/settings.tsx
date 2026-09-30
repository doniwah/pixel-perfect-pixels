import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { useGreenhouse } from "@/lib/greenhouse";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Smart Greenhouse" },
      {
        name: "description",
        content:
          "Device identity, sampling interval and alert preferences for the greenhouse controller.",
      },
      { property: "og:title", content: "Settings — Smart Greenhouse" },
      {
        property: "og:description",
        content: "Device and alert configuration for the greenhouse controller.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { deviceSettings, setSettings, activeNode, setActiveNode, isConnected } = useGreenhouse();
  const [name, setName] = useState(deviceSettings.greenhouseName);
  const [ip, setIp] = useState(deviceSettings.ipAddress);
  const [interval, setIntervalVal] = useState(deviceSettings.samplingInterval);
  const [retention, setRetention] = useState(deviceSettings.retentionDays);
  const [alerts, setAlerts] = useState(deviceSettings.thresholdAlerts);
  const [logging, setLogging] = useState(deviceSettings.continuousLogging);

  // Sync state when deviceSettings arrives from Firebase
  useEffect(() => {
    setName(deviceSettings.greenhouseName);
    setIp(deviceSettings.ipAddress);
    setIntervalVal(deviceSettings.samplingInterval);
    setRetention(deviceSettings.retentionDays);
    setAlerts(deviceSettings.thresholdAlerts);
    setLogging(deviceSettings.continuousLogging);
  }, [
    deviceSettings.greenhouseName,
    deviceSettings.ipAddress,
    deviceSettings.samplingInterval,
    deviceSettings.retentionDays,
    deviceSettings.thresholdAlerts,
    deviceSettings.continuousLogging,
  ]);

  const handleSave = async () => {
    try {
      await setSettings({
        greenhouseName: name,
        ipAddress: ip,
        samplingInterval: Number(interval) || 5,
        retentionDays: Number(retention) || 30,
        thresholdAlerts: alerts,
        continuousLogging: logging,
      });
      toast.success("Settings saved to Firebase");
    } catch (err: any) {
      toast.error("Failed to save settings: " + err.message);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        subtitle={`System configuration for ${activeNode} (Live Firebase)`}
      />

      <div className="surface-card p-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Sensor Node</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveNode("DHT22")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeNode === "DHT22"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              DHT22 Node
            </button>
            <button
              onClick={() => setActiveNode("DHT11")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeNode === "DHT11"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              DHT11 Node
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Greenhouse name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip">Node address</Label>
            <Input
              id="ip"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">Sampling interval (seconds)</Label>
            <Input
              id="interval"
              type="number"
              value={interval}
              onChange={(e) => setIntervalVal(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retention">Data retention (days)</Label>
            <Input
              id="retention"
              type="number"
              value={retention}
              onChange={(e) => setRetention(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="surface-card mt-5 divide-y divide-border p-7">
        {[
          {
            title: "Threshold alerts",
            description: "Notify when temperature or humidity leaves the target range.",
            value: alerts,
            set: setAlerts,
          },
          {
            title: "Continuous logging",
            description: "Store every sensor and actuator sample in Firebase for later analysis.",
            value: logging,
            set: setLogging,
          },
        ].map((row) => (
          <div key={row.title} className="flex items-center justify-between gap-6 py-5 first:pt-0 last:pb-0">
            <div>
              <p className="font-medium">{row.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>
            </div>
            <Switch checked={row.value} onCheckedChange={row.set} />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
      >
        Save changes to Firebase
      </button>
    </AppLayout>
  );
}

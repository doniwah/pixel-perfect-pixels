import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  const [alerts, setAlerts] = useState(true);
  const [logging, setLogging] = useState(true);

  return (
    <AppLayout>
      <PageHeader title="Settings" subtitle="System configuration" />

      <div className="surface-card p-7">
        <h2 className="text-lg font-semibold">Device</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Greenhouse name</Label>
            <Input id="name" defaultValue="Melon Premium — Block A" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ip">Node address</Label>
            <Input id="ip" defaultValue="192.168.1.42" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interval">Sampling interval (seconds)</Label>
            <Input id="interval" type="number" defaultValue={5} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retention">Data retention (days)</Label>
            <Input id="retention" type="number" defaultValue={30} />
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
            description: "Store every sensor and actuator sample for later analysis.",
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
        onClick={() => toast.success("Settings saved")}
        className="mt-6 inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Save changes
      </button>
    </AppLayout>
  );
}

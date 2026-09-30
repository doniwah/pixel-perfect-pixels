import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Snowflake, Flame, Check } from "lucide-react";
import { toast } from "sonner";
import { AppLayout, PageHeader } from "@/components/app-layout";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { HUMIDITY_TARGET, TEMP_TARGET, useGreenhouse } from "@/lib/greenhouse";

export const Route = createFileRoute("/automation")({
  head: () => ({
    meta: [
      { title: "Automation — Smart Greenhouse" },
      {
        name: "description",
        content:
          "Configure the rule-based thresholds that trigger the cooling fogger and heater relays.",
      },
      { property: "og:title", content: "Automation — Smart Greenhouse" },
      {
        property: "og:description",
        content: "Rule thresholds for cooling and heating in the melon greenhouse.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Automation,
});

function Automation() {
  const { current, thresholds, setThresholds, isConnected, activeNode } = useGreenhouse();
  const [enabled, setEnabled] = useState(thresholds.enabled ?? true);
  const [temp, setTemp] = useState<number[]>([thresholds.tempMin, thresholds.tempMax]);
  const [humidity, setHumidity] = useState<number[]>([thresholds.humMin, thresholds.humMax]);

  // Synchronize when thresholds load from Firebase
  useEffect(() => {
    setTemp([thresholds.tempMin, thresholds.tempMax]);
    setHumidity([thresholds.humMin, thresholds.humMax]);
    setEnabled(thresholds.enabled ?? true);
  }, [thresholds.tempMin, thresholds.tempMax, thresholds.humMin, thresholds.humMax, thresholds.enabled]);

  const handleSave = async () => {
    try {
      await setThresholds({
        tempMin: temp[0],
        tempMax: temp[1],
        humMin: humidity[0],
        humMax: humidity[1],
        enabled,
      });
      toast.success("Automation rules saved to Firebase");
    } catch (err: any) {
      toast.error("Failed to save rules to Firebase: " + err.message);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Automation"
        subtitle={`Rule-based microclimate thresholds for ${activeNode} (Live Firebase)`}
      />

      <div className="surface-card flex items-center justify-between p-7">
        <div>
          <p className="font-semibold">Automatic control</p>
          <p className="mt-1 text-sm text-muted-foreground">
            When enabled, relays switch according to the thresholds below.
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="surface-card p-7">
          <p className="text-sm font-medium text-muted-foreground">Temperature target</p>
          <p className="numeric-xl mt-4 text-3xl">
            {temp[0]}°C – {temp[1]}°C
          </p>
          <Slider
            className="mt-8"
            value={temp}
            min={15}
            max={40}
            step={0.5}
            onValueChange={setTemp}
          />
          <p className="mt-6 text-sm text-muted-foreground">
            Above {temp[1]}°C the cooling fogger runs. Below {temp[0]}°C the heater runs.
          </p>
        </div>

        <div className="surface-card p-7">
          <p className="text-sm font-medium text-muted-foreground">Humidity target</p>
          <p className="numeric-xl mt-4 text-3xl">
            {humidity[0]}% – {humidity[1]}%
          </p>
          <Slider
            className="mt-8"
            value={humidity}
            min={30}
            max={95}
            step={1}
            onValueChange={setHumidity}
          />
          <p className="mt-6 text-sm text-muted-foreground">
            Humidity outside this band lowers the microclimate condition score.
          </p>
        </div>
      </div>

      <div className="surface-card mt-5 p-7">
        <h2 className="text-lg font-semibold">Active rules</h2>
        <ul className="mt-5 space-y-4">
          {[
            {
              icon: <Snowflake className="size-4" />,
              text: `If temperature > ${temp[1]}°C → Cooling / Fogger ON`,
              state: current.cooling,
            },
            {
              icon: <Flame className="size-4" />,
              text: `If temperature < ${temp[0]}°C → Heater ON`,
              state: current.heater,
            },
          ].map((rule) => (
            <li key={rule.text} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-3 text-sm">
                <span className="flex size-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
                  {rule.icon}
                </span>
                {rule.text}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                {rule.state ? "TRIGGERED" : "IDLE"}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={handleSave}
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
        >
          <Check className="size-4" /> Save rules to Firebase
        </button>
      </div>
    </AppLayout>
  );
}

import { useEffect, useMemo, useState } from "react";

export const TEMP_TARGET = { min: 25, max: 30 };
export const HUMIDITY_TARGET = { min: 60, max: 80 };

export type Reading = {
  t: number; // epoch ms
  temperature: number;
  humidity: number;
  cooling: boolean;
  heater: boolean;
  mode: "AUTOMATIC" | "MANUAL";
};

function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Deterministic simulated sensor history (stable across SSR + hydration). */
export function buildHistory(points: number, stepMinutes: number, endAt: number): Reading[] {
  const out: Reading[] = [];
  for (let i = points - 1; i >= 0; i--) {
    const t = endAt - i * stepMinutes * 60_000;
    const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    const daily = Math.sin(((hour - 8) / 24) * Math.PI * 2);
    const temperature = +(28 + daily * 2.2 + (noise(i + 1) - 0.5) * 0.9).toFixed(1);
    const humidity = +(70 - daily * 7 + (noise(i + 99) - 0.5) * 4).toFixed(0);
    const cooling = temperature > TEMP_TARGET.max;
    const heater = temperature < TEMP_TARGET.min;
    out.push({ t, temperature, humidity, cooling, heater, mode: "AUTOMATIC" });
  }
  return out;
}

export type Status = "optimal" | "warning" | "critical";

export function statusFor(value: number, range: { min: number; max: number }): Status {
  if (value >= range.min && value <= range.max) return "optimal";
  const span = range.max - range.min;
  const distance = value < range.min ? range.min - value : value - range.max;
  return distance <= span * 0.15 ? "warning" : "critical";
}

export function statusLabel(s: Status) {
  return s === "optimal" ? "Optimal" : s === "warning" ? "Attention" : "Critical";
}

/** Rule-based microclimate condition score (0–100). Not AI. */
export function conditionScore(temperature: number, humidity: number) {
  const part = (value: number, range: { min: number; max: number }) => {
    const span = range.max - range.min;
    if (value >= range.min && value <= range.max) {
      const center = (range.min + range.max) / 2;
      return 100 - (Math.abs(value - center) / (span / 2)) * 10;
    }
    const distance = value < range.min ? range.min - value : value - range.max;
    return Math.max(0, 90 - (distance / span) * 180);
  };
  return Math.round(part(temperature, TEMP_TARGET) * 0.55 + part(humidity, HUMIDITY_TARGET) * 0.45);
}

export function formatTime(t: number) {
  return new Date(t).toLocaleTimeString("en-GB", { hour12: false });
}

export function formatClock(t: number) {
  return new Date(t).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const RANGES = {
  "6h": { points: 72, step: 5 },
  "12h": { points: 72, step: 10 },
  "24h": { points: 96, step: 15 },
  "7d": { points: 84, step: 120 },
  "30d": { points: 90, step: 480 },
} as const;

export type RangeKey = keyof typeof RANGES;

/** Live-ish greenhouse state: fixed base on SSR, ticking once mounted. */
export function useGreenhouse() {
  const base = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return d.getTime();
  }, []);
  const [now, setNow] = useState(base);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 4000);
    return () => clearInterval(id);
  }, []);

  const history = useMemo(
    () => (key: RangeKey) => buildHistory(RANGES[key].points, RANGES[key].step, now),
    [now],
  );

  const day = useMemo(() => buildHistory(96, 15, now), [now]);
  const current = day[day.length - 1]!;
  const stats = (pick: (r: Reading) => number) => {
    const values = day.map(pick);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  };

  return {
    now,
    current,
    day,
    history,
    tempStats: stats((r) => r.temperature),
    humidityStats: stats((r) => r.humidity),
    score: conditionScore(current.temperature, current.humidity),
  };
}

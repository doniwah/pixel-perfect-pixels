import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { formatClock, statusLabel, type RangeKey, type Reading, type Status } from "@/lib/greenhouse";

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "optimal" && "bg-primary/10 text-primary",
        status === "warning" && "bg-warning/15 text-warning-foreground",
        status === "critical" && "bg-destructive/10 text-destructive",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "optimal" && "bg-primary",
          status === "warning" && "bg-warning",
          status === "critical" && "bg-destructive",
        )}
      />
      {statusLabel(status)}
    </span>
  );
}

export function LiveDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
      {label}
    </span>
  );
}

export function SensorCard({
  label,
  value,
  unit,
  status,
  target,
}: {
  label: string;
  value: string;
  unit: string;
  status: Status;
  target: string;
}) {
  return (
    <div className="surface-card p-7 transition-shadow duration-300 hover:shadow-lifted">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <StatusPill status={status} />
      </div>
      <p className="numeric-xl mt-6">
        {value}
        <span className="ml-1 text-2xl font-medium text-muted-foreground">{unit}</span>
      </p>
      <p className="mt-4 text-sm text-muted-foreground">Target {target}</p>
    </div>
  );
}

export function ConditionRing({ score }: { score: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, score)) / 100) * c;

  return (
    <div className="relative grid size-44 place-items-center">
      <svg viewBox="0 0 160 160" className="size-44 -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--color-secondary)" strokeWidth="12" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.32,0.72,0,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="numeric-xl">{score}%</p>
        <p className="mt-1 text-xs font-medium tracking-wide text-primary">
          {score >= 80 ? "OPTIMAL" : score >= 60 ? "ACCEPTABLE" : "OUT OF RANGE"}
        </p>
      </div>
    </div>
  );
}

const RANGE_LABELS: Record<string, string> = {
  "6h": "6 Hours",
  "12h": "12 Hours",
  "24h": "24 Hours",
  "7d": "7 Days",
  "30d": "30 Days",
};

export function RangeTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly T[];
}) {
  return (
    <div className="inline-flex rounded-full bg-secondary p-1">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
            value === option
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {RANGE_LABELS[option] ?? option}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-border bg-card px-3.5 py-2.5 shadow-lifted">
      <p className="text-xs text-muted-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.dataKey} className="mt-1 text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
          {entry.dataKey === "temperature" ? "°C" : "%"}
        </p>
      ))}
    </div>
  );
}

export function MicroclimateChart({
  data,
  height = 300,
}: {
  data: Reading[];
  height?: number;
}) {
  const points = data.map((r) => ({ ...r, time: formatClock(r.t) }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-cooling)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--color-cooling)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="humFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-heater)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-heater)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="4 6" vertical={false} />
          <XAxis
            dataKey="time"
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 12, color: "var(--color-muted-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="temperature"
            name="Temperature"
            stroke="var(--color-cooling)"
            strokeWidth={2}
            fill="url(#tempFill)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="humidity"
            name="Humidity"
            stroke="var(--color-heater)"
            strokeWidth={2}
            fill="url(#humFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ActuatorCard({
  title,
  description,
  active,
  tone,
  icon,
  footer,
}: {
  title: string;
  description: string;
  active: boolean;
  tone: "cooling" | "heater";
  icon: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="surface-card p-6">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl transition-colors duration-300",
            active
              ? tone === "cooling"
                ? "bg-cooling/12 text-cooling"
                : "bg-heater/12 text-heater"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="truncate text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Status</span>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            active
              ? tone === "cooling"
                ? "bg-cooling/12 text-cooling"
                : "bg-heater/12 text-heater"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {active ? "ON" : "OFF"}
        </span>
      </div>
      {footer ? <div className="mt-5 border-t border-border pt-5">{footer}</div> : null}
    </div>
  );
}

export function useRange<T extends string>(initial: T) {
  return useState<T>(initial);
}

export type { RangeKey };

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  subscribeToGreenhouse,
  sendModeToFirebase,
  sendActuatorToFirebase,
  sendSettingsToFirebase,
  sendReadingToFirebase,
  type SensorNode,
  type DeviceSettings,
  type FirebaseDHTState,
} from "./firebase-service";

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

/** Deterministic simulated sensor history fallback (stable across SSR + hydration). */
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

/** Rule-based microclimate condition score (0–100). */
export function conditionScore(
  temperature: number,
  humidity: number,
  tempTarget = TEMP_TARGET,
  humTarget = HUMIDITY_TARGET
) {
  const part = (value: number, range: { min: number; max: number }) => {
    const span = range.max - range.min;
    if (value >= range.min && value <= range.max) {
      const center = (range.min + range.max) / 2;
      return 100 - (Math.abs(value - center) / (span / 2)) * 10;
    }
    const distance = value < range.min ? range.min - value : value - range.max;
    return Math.max(0, 90 - (distance / span) * 180);
  };
  return Math.round(
    part(temperature, tempTarget) * 0.55 + part(humidity, humTarget) * 0.45
  );
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
  "6h": { durationHours: 6, points: 72, step: 5 },
  "12h": { durationHours: 12, points: 72, step: 10 },
  "24h": { durationHours: 24, points: 96, step: 15 },
  "7d": { durationHours: 24 * 7, points: 84, step: 120 },
  "30d": { durationHours: 24 * 30, points: 90, step: 480 },
} as const;

export type RangeKey = keyof typeof RANGES;

// Shared External Store for Realtime Firebase Sync
interface StoreState {
  activeNode: SensorNode;
  isConnected: boolean;
  rawStatus: string;
  mode: "AUTOMATIC" | "MANUAL";
  cooling: boolean;
  heater: boolean;
  currentTemp: number;
  currentHum: number;
  lastUpdated: number;
  thresholds: ThresholdsConfig;
  settings: DeviceSettings;
  readings: Reading[];
}

const defaultReadings = buildHistory(96, 15, Date.now());
const lastDefault = defaultReadings[defaultReadings.length - 1];

let state: StoreState = {
  activeNode: "DHT22",
  isConnected: false,
  rawStatus: "Connecting to Firebase...",
  mode: "AUTOMATIC",
  cooling: lastDefault.cooling,
  heater: lastDefault.heater,
  currentTemp: lastDefault.temperature,
  currentHum: lastDefault.humidity,
  lastUpdated: Date.now(),
  thresholds: {
    tempMin: TEMP_TARGET.min,
    tempMax: TEMP_TARGET.max,
    humMin: HUMIDITY_TARGET.min,
    humMax: HUMIDITY_TARGET.max,
    enabled: true,
  },
  settings: {
    greenhouseName: "Melon Premium — Block A",
    ipAddress: "192.168.1.42",
    samplingInterval: 5,
    retentionDays: 30,
    thresholdAlerts: true,
    continuousLogging: true,
  },
  readings: defaultReadings,
};

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

let activeUnsubscribe: (() => void) | null = null;

function subscribeFirebase(node: SensorNode) {
  if (typeof window === "undefined") return;

  if (activeUnsubscribe) {
    activeUnsubscribe();
    activeUnsubscribe = null;
  }

  activeUnsubscribe = subscribeToGreenhouse(
    node,
    (fbData: FirebaseDHTState) => {
      const mergedReadings =
        fbData.readings.length > 0 ? fbData.readings : defaultReadings;

      state = {
        ...state,
        isConnected: true,
        mode: fbData.mode,
        rawStatus: fbData.status,
        cooling: fbData.cooling,
        heater: fbData.heater,
        currentTemp: fbData.currentTemp,
        currentHum: fbData.currentHum,
        lastUpdated: fbData.lastUpdated,
        thresholds: fbData.thresholds || state.thresholds,
        settings: fbData.settings || state.settings,
        readings: mergedReadings,
      };
      emitChange();
    },
    (err) => {
      state = {
        ...state,
        isConnected: false,
        rawStatus: `Error: ${err.message}`,
      };
      emitChange();
    }
  );
}

// Global actions
export function setGlobalActiveNode(node: SensorNode) {
  if (state.activeNode !== node) {
    state = { ...state, activeNode: node, isConnected: false };
    emitChange();
    subscribeFirebase(node);
  }
}

let isInitialized = false;

function initStoreIfNeeded() {
  if (typeof window !== "undefined" && !isInitialized) {
    isInitialized = true;
    subscribeFirebase(state.activeNode);
  }
}

/**
 * Main reactive hook connecting any component to live Firebase Realtime Database
 */
export function useGreenhouse() {
  initStoreIfNeeded();

  const store = useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => state,
    () => state
  );

  const [now, setNow] = useState(store.lastUpdated);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(id);
  }, []);

  const current: Reading = useMemo(
    () => ({
      t: store.lastUpdated,
      temperature: store.currentTemp,
      humidity: store.currentHum,
      cooling: store.cooling,
      heater: store.heater,
      mode: store.mode,
    }),
    [
      store.lastUpdated,
      store.currentTemp,
      store.currentHum,
      store.cooling,
      store.heater,
      store.mode,
    ]
  );

  const history = useMemo(() => {
    return (key: RangeKey): Reading[] => {
      const cfg = RANGES[key];
      const cutoff = now - cfg.durationHours * 3600 * 1000;
      const inRange = store.readings.filter((r) => r.t >= cutoff);

      if (inRange.length >= 2) {
        // Downsample if huge amount of points for responsive Recharts rendering
        if (inRange.length > 120) {
          const stride = Math.ceil(inRange.length / 100);
          return inRange.filter((_, idx) => idx % stride === 0 || idx === inRange.length - 1);
        }
        return inRange;
      }

      // If fewer points exist in time window, build smooth dataset ending at current
      return buildHistory(cfg.points, cfg.step, now);
    };
  }, [store.readings, now]);

  const day = useMemo(() => {
    return history("24h");
  }, [history]);

  const stats = (pick: (r: Reading) => number) => {
    const values = day.map(pick);
    if (!values.length) return { min: 0, max: 0, avg: 0 };
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  };

  const dynamicTempTarget = {
    min: store.thresholds.tempMin,
    max: store.thresholds.tempMax,
  };
  const dynamicHumTarget = {
    min: store.thresholds.humMin,
    max: store.thresholds.humMax,
  };

  // Actions for sending data to Firebase
  const setMode = async (mode: "AUTOMATIC" | "MANUAL") => {
    let cooling = state.cooling;
    let heater = state.heater;
    if (mode === "AUTOMATIC") {
      cooling = state.currentTemp > state.thresholds.tempMax;
      heater = state.currentTemp < state.thresholds.tempMin;
    }

    state = { ...state, mode, cooling, heater };
    emitChange();
    await sendModeToFirebase(store.activeNode, mode);
  };

  const setActuator = async (actuator: "cooling" | "heater", active: boolean) => {
    state = {
      ...state,
      [actuator]: active,
    };
    emitChange();
    await sendActuatorToFirebase(store.activeNode, actuator, active);
  };

  const setThresholds = async (thresholds: {
    tempMin: number;
    tempMax: number;
    humMin: number;
    humMax: number;
    enabled?: boolean;
  }) => {
    state = {
      ...state,
      thresholds: {
        tempMin: thresholds.tempMin,
        tempMax: thresholds.tempMax,
        humMin: thresholds.humMin,
        humMax: thresholds.humMax,
        enabled: thresholds.enabled ?? true,
      },
    };
    emitChange();
    await sendSettingsToFirebase({
      tempMin: thresholds.tempMin,
      tempMax: thresholds.tempMax,
      humidMin: thresholds.humMin,
      humidMax: thresholds.humMax,
    });
  };

  const setSettings = async (settings: DeviceSettings) => {
    state = {
      ...state,
      settings,
    };
    emitChange();
    await sendSettingsToFirebase({
      tempMin: settings.tempMin,
      tempMax: settings.tempMax,
      humidMin: settings.humidMin,
      humidMax: settings.humidMax,
    });
  };

  const sendReading = async (temperature: number, humidity: number) => {
    await sendReadingToFirebase(store.activeNode, temperature, humidity);
  };

  return {
    now,
    current,
    day,
    history,
    tempStats: stats((r) => r.temperature),
    humidityStats: stats((r) => r.humidity),
    score: conditionScore(
      current.temperature,
      current.humidity,
      dynamicTempTarget,
      dynamicHumTarget
    ),
    isConnected: store.isConnected,
    rawStatus: store.rawStatus,
    activeNode: store.activeNode,
    setActiveNode: setGlobalActiveNode,
    thresholds: store.thresholds,
    deviceSettings: store.settings,
    readingsCount: store.readings.length,
    // Sending data methods
    setMode,
    setActuator,
    setThresholds,
    setSettings,
    sendReading,
  };
}

import { ref, onValue, set, push, update } from "firebase/database";
import { rtdb } from "./firebase";

const PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

/**
 * Decode 48-bit timestamp from Firebase push ID string.
 */
export function decodeFirebasePushId(id: string): number {
  if (!id || typeof id !== "string" || id.length < 8) return Date.now();
  let time = 0;
  for (let i = 0; i < 8; i++) {
    const c = id.charAt(i);
    const idx = PUSH_CHARS.indexOf(c);
    if (idx === -1) return Date.now();
    time = time * 64 + idx;
  }
  return time;
}

/**
 * Robustly extract numeric value from numbers or formatted strings like "26.3°C" or "15.2%".
 */
export function parseNumericValue(val: unknown, fallback = 0): number {
  if (typeof val === "number") return isNaN(val) ? fallback : val;
  if (typeof val === "string") {
    const clean = val.replace(/[^0-9.-]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

export type SensorNode = "DHT22" | "DHT11";

/**
 * Schema format according to user's specification:
 * /Control: { mode: 0 | 1, heater: boolean, cooler: boolean }
 * /Settings: { tempMin: number, tempMax: number, humidMin: number, humidMax: number }
 */
export interface FirebaseControl {
  mode: number; // 0 = Otomatis, 1 = Manual
  heater: boolean; // true = Pemanas ON, false = OFF
  cooler: boolean; // true = Pendingin ON, false = OFF
}

export interface FirebaseSettings {
  tempMin: number;
  tempMax: number;
  humidMin: number;
  humidMax: number;
}

export interface DeviceSettings extends FirebaseSettings {
  greenhouseName?: string;
  ipAddress?: string;
  samplingInterval?: number;
  retentionDays?: number;
  thresholdAlerts?: boolean;
  continuousLogging?: boolean;
}

export interface FirebaseDHTState {
  mode: "AUTOMATIC" | "MANUAL";
  rawModeNum: number;
  status: string;
  cooling: boolean; // mapped from cooler
  heater: boolean;
  currentTemp: number;
  currentHum: number;
  lastUpdated: number;
  thresholds: {
    tempMin: number;
    tempMax: number;
    humMin: number;
    humMax: number;
    enabled?: boolean;
  };
  settings: DeviceSettings;
  readings: Array<{
    t: number;
    temperature: number;
    humidity: number;
    cooling: boolean;
    heater: boolean;
    mode: "AUTOMATIC" | "MANUAL";
  }>;
}

/**
 * Listen to real-time changes on Firebase Realtime Database:
 * 1) /Control
 * 2) /Settings
 * 3) /{node} (DHT22 or DHT11)
 */
export function subscribeToGreenhouse(
  node: SensorNode = "DHT22",
  onData: (state: FirebaseDHTState) => void,
  onError?: (err: Error) => void
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  // Local caches to combine snapshot values
  let currentControl: FirebaseControl = {
    mode: 0,
    heater: false,
    cooler: false,
  };

  let currentSettings: FirebaseSettings = {
    tempMin: 25.0,
    tempMax: 30.0,
    humidMin: 50.0,
    humidMax: 70.0,
  };

  let currentDHTData: any = {};

  const emitCombinedState = () => {
    const rawModeNum = currentControl.mode === 1 ? 1 : 0;
    const mode: "AUTOMATIC" | "MANUAL" = rawModeNum === 1 ? "MANUAL" : "AUTOMATIC";

    const status = String(currentDHTData.Status || currentDHTData.status || "NORMAL - Ideal");

    // Extract raw temperatures & humidities
    const rawTemps: Record<string, unknown> =
      currentDHTData.Temperature || currentDHTData.temperature || {};
    const rawHums: Record<string, unknown> =
      currentDHTData.Humidity || currentDHTData.humidity || {};

    const tempEntries = Object.entries(rawTemps)
      .map(([key, val]) => ({
        key,
        t: decodeFirebasePushId(key),
        temp: parseNumericValue(val, 27),
      }))
      .sort((a, b) => a.t - b.t);

    const humEntries = Object.entries(rawHums)
      .map(([key, val]) => ({
        key,
        t: decodeFirebasePushId(key),
        hum: parseNumericValue(val, 65),
      }))
      .sort((a, b) => a.t - b.t);

    const lastTempObj = tempEntries[tempEntries.length - 1];
    const lastHumObj = humEntries[humEntries.length - 1];

    const currentTemp = lastTempObj ? lastTempObj.temp : 27.0;
    const currentHum = lastHumObj ? lastHumObj.hum : 65.0;
    const lastUpdated = Math.max(
      lastTempObj?.t || Date.now(),
      lastHumObj?.t || Date.now()
    );

    // In Automatic mode, compute actuators if not explicitly set by control
    const isManual = mode === "MANUAL";
    let cooling = Boolean(currentControl.cooler);
    let heater = Boolean(currentControl.heater);

    if (!isManual) {
      cooling = currentTemp > currentSettings.tempMax;
      heater = currentTemp < currentSettings.tempMin;
    }

    // Merge temperature and humidity readings chronologically
    const readings: FirebaseDHTState["readings"] = [];
    let hIdx = 0;

    for (const tItem of tempEntries) {
      while (
        hIdx < humEntries.length - 1 &&
        Math.abs(humEntries[hIdx + 1].t - tItem.t) <
          Math.abs(humEntries[hIdx].t - tItem.t)
      ) {
        hIdx++;
      }

      const matchedHum = humEntries[hIdx] ? humEntries[hIdx].hum : 65;
      const pointCooling = tItem.temp > currentSettings.tempMax;
      const pointHeater = tItem.temp < currentSettings.tempMin;

      readings.push({
        t: tItem.t,
        temperature: tItem.temp,
        humidity: matchedHum,
        cooling: pointCooling,
        heater: pointHeater,
        mode,
      });
    }

    const thresholds = {
      tempMin: currentSettings.tempMin,
      tempMax: currentSettings.tempMax,
      humMin: currentSettings.humidMin,
      humMax: currentSettings.humidMax,
      enabled: true,
    };

    const settings: DeviceSettings = {
      ...currentSettings,
      greenhouseName: currentDHTData.Settings?.greenhouseName ?? "Melon Premium — Block A",
      ipAddress: currentDHTData.Settings?.ipAddress ?? "192.168.1.42",
      samplingInterval: currentDHTData.Settings?.samplingInterval ?? 5,
      retentionDays: currentDHTData.Settings?.retentionDays ?? 30,
      thresholdAlerts: currentDHTData.Settings?.thresholdAlerts ?? true,
      continuousLogging: currentDHTData.Settings?.continuousLogging ?? true,
    };

    onData({
      mode,
      rawModeNum,
      status,
      cooling,
      heater,
      currentTemp,
      currentHum,
      lastUpdated,
      thresholds,
      settings,
      readings,
    });
  };

  // 1. Subscribe to root /Control
  const controlRef = ref(rtdb, "Control");
  const unsubControl = onValue(
    controlRef,
    (snapshot) => {
      const val = snapshot.val();
      if (val && typeof val === "object") {
        currentControl = {
          mode: val.mode === 1 ? 1 : 0,
          heater: Boolean(val.heater),
          cooler: Boolean(val.cooler),
        };
      }
      emitCombinedState();
    },
    (err) => {
      console.error("Control listener error:", err);
      if (onError) onError(err);
    }
  );

  // 2. Subscribe to root /Settings
  const settingsRef = ref(rtdb, "Settings");
  const unsubSettings = onValue(
    settingsRef,
    (snapshot) => {
      const val = snapshot.val();
      if (val && typeof val === "object") {
        currentSettings = {
          tempMin: Number(val.tempMin) || 25.0,
          tempMax: Number(val.tempMax) || 30.0,
          humidMin: Number(val.humidMin) || 50.0,
          humidMax: Number(val.humidMax) || 70.0,
        };
      }
      emitCombinedState();
    },
    (err) => {
      console.error("Settings listener error:", err);
      if (onError) onError(err);
    }
  );

  // 3. Subscribe to Sensor Node (DHT22 or DHT11)
  const nodeRef = ref(rtdb, node);
  const unsubNode = onValue(
    nodeRef,
    (snapshot) => {
      currentDHTData = snapshot.val() || {};
      emitCombinedState();
    },
    (err) => {
      console.error("Sensor node listener error:", err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubControl();
    unsubSettings();
    unsubNode();
  };
}

/**
 * Send Mode to Firebase /Control/mode
 * mode: 0 = Otomatis, 1 = Manual
 */
export async function sendModeToFirebase(
  _node: SensorNode,
  mode: "AUTOMATIC" | "MANUAL"
): Promise<void> {
  const modeNum = mode === "MANUAL" ? 1 : 0;
  const controlModeRef = ref(rtdb, "Control/mode");
  await set(controlModeRef, modeNum);
}

/**
 * Send Actuator state to Firebase /Control
 * cooler: true = Pendingin ON, false = OFF
 * heater: true = Pemanas ON, false = OFF
 */
export async function sendActuatorToFirebase(
  _node: SensorNode,
  actuator: "cooling" | "heater",
  state: boolean
): Promise<void> {
  const path = actuator === "cooling" ? "Control/cooler" : "Control/heater";
  const actuatorRef = ref(rtdb, path);
  await set(actuatorRef, Boolean(state));
}

/**
 * Send Settings to Firebase /Settings
 * {
 *   tempMin: 25.0,
 *   tempMax: 30.0,
 *   humidMin: 50.0,
 *   humidMax: 70.0
 * }
 */
export async function sendSettingsToFirebase(
  thresholds: {
    tempMin: number;
    tempMax: number;
    humidMin: number;
    humidMax: number;
  }
): Promise<void> {
  const settingsRef = ref(rtdb, "Settings");
  await set(settingsRef, {
    tempMin: Number(thresholds.tempMin),
    tempMax: Number(thresholds.tempMax),
    humidMin: Number(thresholds.humidMin),
    humidMax: Number(thresholds.humidMax),
  });
}

/**
 * Send new sensor reading to Firebase (DHT22 or DHT11)
 * Formatted with "°C" and "%" to match the ESP8266 device format.
 */
export async function sendReadingToFirebase(
  node: SensorNode,
  temperature: number,
  humidity: number
): Promise<void> {
  const tempRef = ref(rtdb, `${node}/Temperature`);
  const humRef = ref(rtdb, `${node}/Humidity`);

  const tempStr = `${temperature.toFixed(1)}°C`;
  const humStr = `${humidity.toFixed(1)}%`;

  await Promise.all([
    push(tempRef, tempStr),
    push(humRef, humStr),
  ]);
}

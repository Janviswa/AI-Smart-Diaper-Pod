/**
 * Shared sensor data types for the Cradle app.
 * These match the JSON payload the ESP32 device sends over WebSocket.
 *
 * ESP32 WebSocket endpoint: ws://<device-ip>/ws
 * Expected payload (JSON):
 * {
 *   "moisture":    15,          // 0–100 %
 *   "stool":       7,           // 0–100 %
 *   "temperature": 36.6,        // Celsius
 *   "battery":     86,          // 0–100 %
 *   "position":    "back",      // "back" | "stomach" | "left_side" | "right_side"
 *   "rssi":        -48,         // dBm
 *   "firmware":    "v2.1.0",    // firmware version string
 *   "mac":         "AA:BB:CC:11:22:33"
 * }
 */

export type DiaperStatus = "dry" | "wet" | "soiled" | "both";
export type Position     = "back" | "stomach" | "left_side" | "right_side";

/** Computed from moisture + stool thresholds */
export function computeDiaperStatus(moisture: number, stool: number): DiaperStatus {
  const wet    = moisture >= 50;
  const soiled = stool    >= 30;
  if (wet && soiled) return "both";
  if (soiled)        return "soiled";
  if (wet)           return "wet";
  return "dry";
}

export interface SensorReading {
  // Raw sensor values
  moisture:    number;       // 0–100 %
  stool:       number;       // 0–100 %
  temperature: number;       // °C
  battery:     number;       // 0–100 %
  position:    Position;
  rssi:        number;       // dBm
  // Computed
  diaper:      DiaperStatus;
  // Metadata
  updatedAt:   Date;
  firmware:    string;
  mac:         string;
}

export interface DeviceState {
  connected: boolean;
  ip:        string | null;  // null when not connected
  error:     string | null;
}

/** The entire app state shape */
export interface AppState {
  device:  DeviceState;
  reading: SensorReading | null;  // null = no data yet
}

/** Initial / empty state — shown while waiting for first real data */
export const EMPTY_STATE: AppState = {
  device: {
    connected: false,
    ip:        null,
    error:     null,
  },
  reading: null,
};

/** Parse raw ESP32 JSON payload into SensorReading */
export function parsePayload(raw: unknown): SensorReading | null {
  try {
    const p = raw as Record<string, unknown>;
    const moisture    = Number(p.moisture    ?? 0);
    const stool       = Number(p.stool       ?? 0);
    const temperature = Number(p.temperature ?? 0);
    const battery     = Number(p.battery     ?? 0);
    const position    = String(p.position    ?? "back") as Position;
    const rssi        = Number(p.rssi        ?? 0);
    const firmware    = String(p.firmware    ?? "unknown");
    const mac         = String(p.mac         ?? "—");

    return {
      moisture, stool, temperature, battery, position, rssi,
      firmware, mac,
      diaper:    computeDiaperStatus(moisture, stool),
      updatedAt: new Date(),
    };
  } catch {
    return null;
  }
}

// ── UI label maps (used by Dashboard and History) ────────────────────────────
export const DIAPER_CFG: Record<DiaperStatus, { label: string; cls: string }> = {
  dry:    { label: "All Dry",    cls: "s-dry"    },
  wet:    { label: "Wet",        cls: "s-wet"    },
  soiled: { label: "Soiled",     cls: "s-soiled" },
  both:   { label: "Change Now", cls: "s-urgent" },
};

export const POS_LABEL: Record<Position, string> = {
  back:       "On Back",
  stomach:    "On Stomach",
  left_side:  "Left Side",
  right_side: "Right Side",
};

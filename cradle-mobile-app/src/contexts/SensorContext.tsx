/**
 * SensorContext — makes useSensorData available app-wide.
 *
 * Wrap the app in <SensorProvider>.
 * Use const { state, connect, disconnect, refresh } = useSensor() anywhere.
 */

import { createContext, useContext, ReactNode } from "react";
import { useSensorData, UseSensorDataReturn } from "@/hooks/useSensorData";

const SensorCtx = createContext<UseSensorDataReturn | null>(null);

export function SensorProvider({ children }: { children: ReactNode }) {
  const sensor = useSensorData();
  return <SensorCtx.Provider value={sensor}>{children}</SensorCtx.Provider>;
}

export function useSensor(): UseSensorDataReturn {
  const ctx = useContext(SensorCtx);
  if (!ctx) throw new Error("useSensor must be inside SensorProvider");
  return ctx;
}

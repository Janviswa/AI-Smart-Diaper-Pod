/**
 * useSensorData — WebSocket hook for live ESP32 sensor data.
 *
 * USAGE:
 *   const { state, connect, disconnect, refresh } = useSensorData();
 *
 * CONNECTION:
 *   Call connect(ip) with the device IP address (e.g. "192.168.1.42").
 *   The hook opens a WebSocket to ws://<ip>/ws.
 *   The ESP32 pushes a JSON payload on every sensor update.
 *
 * RECONNECTION:
 *   Auto-reconnects on unexpected disconnect (up to MAX_RETRIES times).
 *   Exponential backoff: 1s, 2s, 4s, 8s …
 *
 * REFRESH:
 *   Call refresh() to request an immediate reading (sends "ping" to ESP32).
 *
 * STATE:
 *   state.device.connected  — true when WS is open
 *   state.device.ip         — connected IP
 *   state.device.error      — last error string or null
 *   state.reading           — latest SensorReading or null
 *
 * INTEGRATING WITH YOUR BACKEND:
 *   If you use HTTP polling instead of WebSocket, replace the connect()
 *   body with a setInterval that calls fetch(`http://${ip}/sensors`)
 *   and calls setReading(parsePayload(await res.json())).
 *
 *   For MQTT, replace with an MQTT.js client connecting to your broker.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  AppState, EMPTY_STATE, SensorReading, DeviceState,
  parsePayload,
} from "@/lib/sensorTypes";

const MAX_RETRIES   = 5;
const BASE_DELAY_MS = 1000;

export interface UseSensorDataReturn {
  state:       AppState;
  connect:     (ip: string) => void;
  disconnect:  () => void;
  refresh:     () => void;
  retryCount:  number;
}

export function useSensorData(): UseSensorDataReturn {
  const [device,  setDevice]  = useState<DeviceState>(EMPTY_STATE.device);
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const wsRef        = useRef<WebSocket | null>(null);
  const ipRef        = useRef<string | null>(null);
  const retryRef     = useRef(0);
  const retryTimerRef= useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef   = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const openSocket = useCallback((ip: string) => {
    // Close any existing connection
    wsRef.current?.close();

    const url = `ws://${ip}/ws`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      if (!mountedRef.current) return;
      setDevice({ connected: false, ip, error: `Cannot open WebSocket: ${String(err)}` });
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      retryRef.current = 0;
      setRetryCount(0);
      setDevice({ connected: true, ip, error: null });
    };

    ws.onmessage = (evt) => {
      if (!mountedRef.current) return;
      try {
        const raw     = JSON.parse(String(evt.data));
        const parsed  = parsePayload(raw);
        if (parsed) setReading(parsed);
      } catch {
        // Ignore malformed frames
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      setDevice(prev => ({ ...prev, connected: false, error: "WebSocket error" }));
    };

    ws.onclose = (evt) => {
      if (!mountedRef.current) return;
      const wasClean = evt.wasClean;
      setDevice(prev => ({ ...prev, connected: false }));

      // Auto-reconnect unless we closed intentionally (wasClean = true)
      if (!wasClean && ipRef.current && retryRef.current < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, retryRef.current);
        retryRef.current += 1;
        setRetryCount(retryRef.current);
        setDevice(prev => ({
          ...prev,
          error: `Disconnected — reconnecting in ${delay / 1000}s (attempt ${retryRef.current}/${MAX_RETRIES})…`,
        }));
        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current && ipRef.current) openSocket(ipRef.current);
        }, delay);
      } else if (!wasClean && retryRef.current >= MAX_RETRIES) {
        setDevice(prev => ({
          ...prev,
          error: `Could not reconnect after ${MAX_RETRIES} attempts. Check device and try again.`,
        }));
      }
    };
  }, []);

  const connect = useCallback((ip: string) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryRef.current = 0;
    setRetryCount(0);
    ipRef.current = ip;
    setDevice({ connected: false, ip, error: null });
    setReading(null);
    openSocket(ip);
  }, [openSocket]);

  const disconnect = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryRef.current = MAX_RETRIES; // prevent auto-reconnect
    ipRef.current = null;
    wsRef.current?.close(1000, "user_disconnect");
    wsRef.current = null;
    setDevice(EMPTY_STATE.device);
    setReading(null);
    setRetryCount(0);
  }, []);

  const refresh = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ cmd: "refresh" }));
    }
  }, []);

  return {
    state: { device, reading },
    connect,
    disconnect,
    refresh,
    retryCount,
  };
}

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Droplets, ThermometerSun, Battery, BatteryLow, BatteryMedium,
  Wifi, WifiOff, RefreshCw, AlertTriangle, Waves,
  TrendingUp, TrendingDown, Minus, PlugZap, Loader2,
} from "lucide-react";
import { useNotify, NotificationBell } from "@/components/NotificationPopup";
import PageHeader from "@/components/PageHeader";
import { useSensor } from "@/contexts/SensorContext";
import { DIAPER_CFG, POS_LABEL } from "@/lib/sensorTypes";
import type { Position, DiaperStatus } from "@/lib/sensorTypes";

// ─── Small UI helpers ──────────────────────────────────────────────────────
function Ring({ v, stroke }: { v: number; stroke: string }) {
  const sz = 52, sw = 4.5, r = (sz - sw) / 2, circ = 2 * Math.PI * r;
  return (
    <svg width={sz} height={sz} style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}>
      <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={sw} />
      <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={stroke} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.min(v / 100, 1))}
        style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

function Trend({ d }: { d: number }) {
  if (Math.abs(d) < 0.15) return <Minus className="w-3 h-3 text-muted-foreground" />;
  return d > 0
    ? <TrendingUp   className="w-3 h-3 text-red-400" />
    : <TrendingDown className="w-3 h-3 text-emerald-500" />;
}

function BabyPositionVisual({ pos }: { pos: Position }) {
  const deg: Record<Position, number> = { back: 0, stomach: 180, left_side: -90, right_side: 90 };
  return (
    <svg width="38" height="38" viewBox="0 0 60 72" fill="none"
      style={{ transform: `rotate(${deg[pos]}deg)`, transition: "transform 0.55s cubic-bezier(.34,1.56,.64,1)" }}>
      <ellipse cx="30" cy="16" rx="13" ry="13" fill="currentColor" opacity="0.75" />
      <ellipse cx="17" cy="16" rx="3.5" ry="4.5" fill="currentColor" opacity="0.45" />
      <ellipse cx="43" cy="16" rx="3.5" ry="4.5" fill="currentColor" opacity="0.45" />
      <ellipse cx="30" cy="40" rx="11" ry="14" fill="currentColor" opacity="0.70" />
      <path d="M 20,33 C 12,33 9,36 10,42 C 11,46 15,47 19,44" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.55" />
      <path d="M 40,33 C 48,33 51,36 50,42 C 49,46 45,47 41,44" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.55" />
      <path d="M 24,52 C 21,58 22,64 25,66" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.60" />
      <path d="M 36,52 C 39,58 38,64 35,66" stroke="currentColor" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.60" />
      <rect x="24" y="27" width="12" height="6" rx="3" fill="currentColor" opacity="0.65" />
    </svg>
  );
}

// ─── Waiting-for-device screen ────────────────────────────────────────────
function NoDeviceScreen({ connecting, error }: { connecting: boolean; error: string | null }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center gap-5">
      <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center">
        {connecting
          ? <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
          : <PlugZap  className="w-8 h-8 text-muted-foreground" />}
      </div>
      <div>
        <p className="text-base font-bold text-foreground">
          {connecting ? "Connecting to device…" : "No device connected"}
        </p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {error
            ? error
            : "Go to Settings → Device Management to connect your ESP32 sensor pod."}
        </p>
      </div>
    </div>
  );
}

// ─── Loading skeleton for first data ──────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border-2 border-border bg-card overflow-hidden animate-pulse">
      <div className="px-5 py-4 bg-muted/40">
        <div className="h-3 w-24 bg-muted rounded mb-3" />
        <div className="h-7 w-20 bg-muted rounded" />
      </div>
      <div className="grid grid-cols-2 divide-x divide-border/40">
        {[0,1].map(i => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <div className="w-13 h-13 rounded-full bg-muted shrink-0" />
            <div className="space-y-2">
              <div className="h-2.5 w-14 bg-muted rounded" />
              <div className="h-5 w-10 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { notify } = useNotify();
  const { state, refresh } = useSensor();
  const { device, reading } = state;

  const [flashKey,  setFlashKey]  = useState(0);
  const [syncing,   setSyncing]   = useState(false);
  const prevDiaper  = useRef<DiaperStatus | null>(null);
  const prevTemp    = useRef<number | null>(null);
  const prevBatt    = useRef<number | null>(null);

  // Fire notifications when readings change
  useEffect(() => {
    if (!reading) return;
    setFlashKey(k => k + 1);

    // Diaper status changed to non-dry
    if (prevDiaper.current !== null
      && prevDiaper.current === "dry"
      && reading.diaper !== "dry") {
      notify({
        title:   "Diaper change needed",
        message: DIAPER_CFG[reading.diaper].label,
        variant: reading.diaper === "both" ? "urgent" : "warning",
      });
    }
    prevDiaper.current = reading.diaper;

    // Temperature alert
    if (reading.temperature > 37.5) {
      notify({
        title:   "Temperature elevated",
        message: `Current: ${reading.temperature.toFixed(1)} °C`,
        variant: "warning",
      });
    }

    // Low battery (only once when crossing 20%)
    if (prevBatt.current !== null && prevBatt.current >= 20 && reading.battery < 20) {
      notify({
        title:   "Low battery",
        message: `Sensor pod battery at ${Math.round(reading.battery)}%`,
        variant: "warning",
      });
    }
    prevBatt.current = reading.battery;
    prevTemp.current = reading.temperature;
  }, [reading, notify]);

  // Notify on connect / disconnect
  useEffect(() => {
    if (device.connected) {
      notify({
        title:   "Device connected",
        message: `ESP32 online · ${device.ip}`,
        variant: "success",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.connected]);

  const syncNow = () => {
    if (!device.connected || syncing) return;
    setSyncing(true);
    refresh();
    setTimeout(() => setSyncing(false), 1200);
  };

  // ── Render states ───────────────────────────────────────────────────────
  const isConnecting = !device.connected && !!device.ip && !device.error;

  return (
    <div className="min-h-screen page-bg pb-24">
      <PageHeader
        branded
        title="Monitor"
        actions={<NotificationBell />}
        statusRow={
          <div className="flex items-center justify-between bg-card border border-border/40 rounded-2xl px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className={[
                "w-2 h-2 rounded-full shrink-0",
                device.connected ? "bg-emerald-500 conn-live" : "bg-muted-foreground/40",
              ].join(" ")} />
              <span className="text-sm font-semibold text-foreground">
                {device.connected ? "Live" : isConnecting ? "Connecting…" : "Offline"}
              </span>
              {device.connected && (
                <span className="text-[11px] text-muted-foreground font-mono">
                  · {device.ip}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={syncNow}
                disabled={syncing || !device.connected}
                className="text-[11px] font-semibold px-3 py-1 rounded-xl bg-primary/10 text-primary disabled:opacity-40 transition-colors"
              >
                <RefreshCw className={`w-3 h-3 inline mr-1 ${syncing ? "animate-spin" : ""}`} />
                Sync
              </button>
            </div>
          </div>
        }
      />

      <div className="px-4 mt-4 space-y-3">

        {/* No device or connecting */}
        {!device.connected && (
          <NoDeviceScreen connecting={isConnecting} error={device.error} />
        )}

        {/* Device connected but no reading yet */}
        {device.connected && !reading && <SkeletonCard />}

        {/* Live data */}
        {device.connected && reading && (() => {
          const cfg       = DIAPER_CFG[reading.diaper];
          const isStomach = reading.position === "stomach";
          const BattIcon  = reading.battery > 60 ? Battery : reading.battery > 20 ? BatteryMedium : BatteryLow;
          const battClr   = reading.battery > 60 ? "bg-emerald-500" : reading.battery > 20 ? "bg-amber-400" : "bg-red-500";
          const tempStatus = reading.temperature > 37.5 ? "↑ Elevated" : reading.temperature < 36 ? "↓ Low" : "✓ Normal";
          const tempColor  = reading.temperature > 37.5 ? "text-red-500" : reading.temperature < 36 ? "text-sky-500" : "text-emerald-500 dark:text-emerald-400";
          const tempDelta  = prevTemp.current !== null ? reading.temperature - prevTemp.current : 0;

          return (
            <>
              {/* Diaper status — blinks on every new reading */}
              <div key={flashKey} className="rounded-2xl border-2 overflow-hidden card-refresh fade-up">
                <div className={`${cfg.cls} flex items-center px-5 py-4`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-55 mb-1">
                      Diaper Status
                    </p>
                    <p className="text-[26px] font-bold leading-none tracking-tight">{cfg.label}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[11px] opacity-45 font-medium tabular-nums">
                      {reading.updatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button onClick={syncNow} disabled={syncing || !device.connected}
                      className="w-7 h-7 rounded-lg bg-white/15 dark:bg-black/10 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform">
                      <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
                <div className="bg-card grid grid-cols-2 divide-x divide-border/40">
                  {[
                    { label: "Moisture", val: reading.moisture, stroke: "hsl(198,90%,46%)", Icon: Droplets, icn: "text-sky-500" },
                    { label: "Stool",    val: reading.stool,    stroke: "hsl(38,88%,50%)",  Icon: Waves,    icn: "text-amber-500" },
                  ].map(({ label, val, stroke, Icon, icn }) => (
                    <div key={label} className="flex items-center gap-3 px-5 py-4">
                      <div className="relative shrink-0">
                        <Ring v={val} stroke={stroke} />
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">
                          {val}%
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Icon className={`w-3 h-3 ${icn}`} />
                          <span className="text-[11px] text-muted-foreground">{label}</span>
                        </div>
                        <p className="text-xl font-bold leading-none text-foreground">{val}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Baby position */}
              <Card className={["border-2 overflow-hidden fade-up-1", isStomach ? "s-urgent" : ""].join(" ")}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={["w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                    isStomach ? "bg-white/15 dark:bg-black/10" : "bg-muted"].join(" ")}>
                    <BabyPositionVisual pos={reading.position} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.13em] mb-1 ${isStomach ? "opacity-50" : "text-muted-foreground"}`}>
                      Baby Position
                    </p>
                    <p className="text-base font-bold leading-none">{POS_LABEL[reading.position]}</p>
                    {isStomach && <p className="text-[11px] mt-1.5 opacity-80">⚠️ Stomach sleeping raises SIDS risk</p>}
                  </div>
                  {isStomach
                    ? <Badge variant="destructive" className="rounded-full gap-1 text-[10px] shrink-0"><AlertTriangle className="w-3 h-3" /> Risk</Badge>
                    : <Badge className="rounded-full text-[10px] bg-emerald-500 hover:bg-emerald-500 text-white border-0 shrink-0">Safe</Badge>}
                </div>
              </Card>

              {/* Temp + Battery */}
              <div className="grid grid-cols-2 gap-3 fade-up-2">
                <Card className="border px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center shrink-0">
                      <ThermometerSun className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Temp</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-[28px] font-bold text-foreground leading-none">{reading.temperature.toFixed(1)}</p>
                    <span className="text-xs text-muted-foreground">°C</span>
                    <Trend d={tempDelta} />
                  </div>
                  <p className={`text-[11px] mt-2 font-semibold ${tempColor}`}>{tempStatus}</p>
                </Card>

                <Card className="border px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={["w-7 h-7 rounded-xl flex items-center justify-center shrink-0",
                      reading.battery > 60 ? "bg-emerald-100 dark:bg-emerald-950/30"
                      : reading.battery > 20 ? "bg-amber-100 dark:bg-amber-950/30"
                      : "bg-red-100 dark:bg-red-950/30"].join(" ")}>
                      <BattIcon className={["w-3.5 h-3.5",
                        reading.battery > 60 ? "text-emerald-600"
                        : reading.battery > 20 ? "text-amber-500" : "text-red-500"].join(" ")} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Battery</span>
                  </div>
                  <p className="text-[28px] font-bold text-foreground leading-none">{Math.round(reading.battery)}%</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2.5">
                    <div className={`h-full rounded-full transition-all duration-700 ${battClr}`} style={{ width: `${reading.battery}%` }} />
                  </div>
                  <p className={`text-[11px] mt-2 font-semibold ${reading.battery < 20 ? "text-red-500" : "text-muted-foreground"}`}>
                    {reading.battery < 20 ? "Charge soon" : reading.battery > 80 ? "Fully charged" : "Good"}
                  </p>
                </Card>
              </div>

              {/* Device info */}
              <Card className="border fade-up-3">
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center shrink-0">
                    <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">ESP32 Online</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {reading.firmware} · {reading.rssi} dBm · {device.ip}
                    </p>
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground/60 text-right shrink-0">
                    {reading.mac}
                  </div>
                </div>
              </Card>
            </>
          );
        })()}

        {/* Device offline + error */}
        {!device.connected && device.error && !isConnecting && (
          <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 flex items-center gap-3">
            <WifiOff className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-[12px] text-red-700 dark:text-red-400 font-medium">{device.error}</p>
          </div>
        )}

      </div>
    </div>
  );
}

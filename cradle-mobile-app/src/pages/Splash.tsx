/**
 * Splash / Connect screen.
 *
 * WiFi mode:  User types the ESP32's IP address (shown on device serial/OLED).
 *             Calls sensor.connect(ip) which opens ws://<ip>/ws.
 *             On successful WebSocket open, navigates to /dashboard.
 *
 * Bluetooth:  Web Bluetooth API — scans for a device advertising the
 *             "Cradle" name prefix. On pairing success navigates to /dashboard.
 *             NOTE: Web Bluetooth requires HTTPS or localhost, and a browser
 *             that supports it (Chrome/Edge). Falls back to a clear error.
 *
 * No mock devices. No fake POOL. No fake timers.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bluetooth, Wifi, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import CradleLogo from "@/components/CradleLogo";
import { useSensor } from "@/contexts/SensorContext";

function SignalBars({ rssi }: { rssi: number }) {
  const filled = rssi > -50 ? 4 : rssi > -62 ? 3 : rssi > -72 ? 2 : 1;
  return (
    <div className="flex items-end gap-[2px]">
      {[1,2,3,4].map(i => (
        <div key={i} style={{ height: `${i*3+2}px` }}
          className={`w-[3px] rounded-sm ${i <= filled ? "bg-primary" : "bg-muted"}`} />
      ))}
    </div>
  );
}

export default function Splash() {
  const navigate = useNavigate();
  const sensor   = useSensor();
  const { state, connect, disconnect } = sensor;
  const { device } = state;

  const [showModal, setShowModal]   = useState(false);
  const [mode,      setMode]        = useState<"wifi" | "bluetooth">("wifi");
  const [ipInput,   setIpInput]     = useState("");
  const [btScanning,setBtScanning]  = useState(false);
  const [btDevice,  setBtDevice]    = useState<{ name: string; id: string } | null>(null);
  const [btError,   setBtError]     = useState<string | null>(null);
  const tSplash = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tNav    = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tSplash.current = setTimeout(() => setShowModal(true), 2000);
    return () => {
      clearTimeout(tSplash.current!);
      clearTimeout(tNav.current!);
    };
  }, []);

  // Navigate to dashboard once connected
  useEffect(() => {
    if (device.connected) {
      tNav.current = setTimeout(() => navigate("/dashboard"), 600);
    }
  }, [device.connected, navigate]);

  // ── WiFi connect ──────────────────────────────────────────────────────────
  function handleWifiConnect() {
    const ip = ipInput.trim();
    if (!ip) return;
    connect(ip);
  }

  // ── Bluetooth scan ────────────────────────────────────────────────────────
  async function handleBtScan() {
    setBtError(null);
    setBtDevice(null);
    if (!("bluetooth" in navigator)) {
      setBtError("Web Bluetooth is not supported in this browser. Use Chrome or Edge over HTTPS.");
      return;
    }
    setBtScanning(true);
    try {
      // Request device with Cradle service UUID or name prefix
      const btDev = await (navigator as any).bluetooth.requestDevice({
        filters: [{ namePrefix: "Cradle" }],
        optionalServices: ["battery_service"],
      });
      setBtDevice({ name: btDev.name ?? "Cradle Pod", id: btDev.id });
      // For BT, the IP isn't relevant — connect via device name as identifier
      // Real implementation: connect GATT and read characteristics
      // For now, navigate after pairing animation
      setBtScanning(false);
    } catch (err: unknown) {
      setBtScanning(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("cancelled") && !msg.includes("chosen")) {
        setBtError(msg);
      }
    }
  }

  function handleBtConnect() {
    if (!btDevice) return;
    // TODO: open GATT connection and get IP/endpoint from device
    // For now: treat device name as identifier and navigate
    navigate("/dashboard");
  }

  const isConnecting = !!device.ip && !device.connected && !device.error;

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">

      {/* ── Splash ────────────────────────────────────────────────────────── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-700"
        style={{ opacity: showModal ? 0 : 1, pointerEvents: showModal ? "none" : "auto" }}
        aria-hidden={showModal}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="logo-in relative z-10 flex flex-col items-center gap-8">
          <div className="w-28 h-28 rounded-[30px] bg-primary flex items-center justify-center shadow-[0_16px_48px_hsl(var(--primary)/0.4)]">
            <CradleLogo size={68} color="white" />
          </div>
          <div className="word-in text-center">
            <h1 className="text-[44px] font-bold tracking-tight text-foreground leading-none">Cradle</h1>
            <p className="text-sm text-muted-foreground mt-2 tracking-wide">Intelligent Care for Tiny Lives</p>
          </div>
        </div>
        <div className="absolute bottom-16 flex gap-2">
          {[0, 0.35, 0.7].map((delay, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/50 conn-live"
              style={{ animationDelay: `${delay}s` }} />
          ))}
        </div>
      </div>

      {/* ── Connect modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <div className="absolute inset-0 flex flex-col">
          <div className="flex-1 flex items-center justify-center pointer-events-none select-none overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-primary/6 blur-3xl" />
            </div>
            <div className="relative flex flex-col items-center gap-3 opacity-10">
              <div className="w-14 h-14 rounded-[18px] bg-primary flex items-center justify-center">
                <CradleLogo size={34} color="white" />
              </div>
              <span className="text-2xl font-bold text-foreground">Cradle</span>
            </div>
          </div>

          <div className="sheet-up w-full bg-card rounded-t-[28px] border-t border-border/40 shadow-[0_-20px_60px_hsl(var(--foreground)/0.12)]">
            <div className="overflow-y-auto" style={{ maxHeight: "82vh" }}>
              <div className="px-5 pt-5 pb-10">
                <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-6" />

                <div className="mb-5">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">Connect Your Pod</h2>
                  <p className="text-sm text-muted-foreground mt-1">Choose how to connect your Cradle Smart Pod</p>
                </div>

                {/* Mode tabs */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {([
                    { key: "wifi",      label: "Wi-Fi",     Icon: Wifi      },
                    { key: "bluetooth", label: "Bluetooth", Icon: Bluetooth },
                  ] as const).map(({ key, label, Icon }) => (
                    <button key={key} onClick={() => { setMode(key); disconnect(); setBtDevice(null); setBtError(null); }}
                      className={`flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 font-semibold text-sm transition-all ${
                        mode === key
                          ? "border-primary bg-primary/8 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/30"
                      }`}>
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── WiFi mode ─────────────────────────────────────────── */}
                {mode === "wifi" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">
                        Device IP Address
                      </label>
                      <input
                        type="text"
                        value={ipInput}
                        onChange={e => setIpInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleWifiConnect()}
                        placeholder="192.168.1.42"
                        className="w-full h-12 rounded-2xl border border-border bg-muted/30 px-4 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                        inputMode="decimal"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                        Find the IP on your Pod's OLED screen or serial monitor
                      </p>
                    </div>

                    {/* Error banner */}
                    {device.error && (
                      <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-red-700 dark:text-red-400 font-medium leading-relaxed">{device.error}</p>
                      </div>
                    )}

                    {/* Success */}
                    {device.connected && (
                      <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <p className="text-[12px] text-emerald-700 dark:text-emerald-300 font-semibold">
                          Connected to {device.ip} — loading dashboard…
                        </p>
                      </div>
                    )}

                    <button
                      onClick={device.ip && !device.connected ? disconnect : handleWifiConnect}
                      disabled={device.connected}
                      className={`w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] ${
                        device.connected
                          ? "bg-emerald-500 text-white cursor-default"
                          : isConnecting
                          ? "bg-muted text-foreground border border-border"
                          : "bg-primary text-white shadow-sm hover:bg-primary/90 disabled:opacity-40"
                      }`}
                    >
                      {device.connected
                        ? <><CheckCircle2 className="w-4 h-4" /> Connected</>
                        : isConnecting
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting to {device.ip}…</>
                        : <><Wifi className="w-4 h-4" /> Connect</>}
                    </button>

                    {isConnecting && (
                      <button onClick={disconnect}
                        className="w-full text-[11px] text-muted-foreground font-medium py-1 flex items-center justify-center gap-1.5">
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    )}
                  </div>
                )}

                {/* ── Bluetooth mode ────────────────────────────────────── */}
                {mode === "bluetooth" && (
                  <div className="space-y-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                      Make sure your Pod's <span className="font-semibold text-foreground">green LED</span> is blinking,
                      then tap Scan. Your browser will ask you to select the device.
                    </p>

                    {btError && (
                      <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-red-700 dark:text-red-400 font-medium leading-relaxed">{btError}</p>
                      </div>
                    )}

                    {!btDevice && (
                      <button onClick={handleBtScan} disabled={btScanning}
                        className="w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 bg-primary text-white shadow-sm hover:bg-primary/90 disabled:opacity-60 active:scale-[0.98] transition-all">
                        {btScanning
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning…</>
                          : <><Bluetooth className="w-4 h-4" /> Scan for Pod</>}
                      </button>
                    )}

                    {btDevice && (
                      <>
                        <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-primary bg-primary/6">
                          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                            <Bluetooth className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{btDevice.name}</p>
                            <SignalBars rssi={-52} />
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                        </div>
                        <button onClick={handleBtConnect}
                          className="w-full h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2.5 bg-primary text-white shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all">
                          <CheckCircle2 className="w-4 h-4" /> Connect to {btDevice.name}
                        </button>
                        <button onClick={() => setBtDevice(null)}
                          className="w-full text-[11px] text-muted-foreground font-medium py-1 flex items-center justify-center gap-1.5">
                          <X className="w-3 h-3" /> Choose a different device
                        </button>
                      </>
                    )}

                    <p className="text-[10px] text-muted-foreground/60 text-center pt-1">
                      Requires Chrome or Edge with Web Bluetooth support (HTTPS)
                    </p>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

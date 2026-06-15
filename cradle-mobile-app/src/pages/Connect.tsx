import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bluetooth, Wifi, Search, CheckCircle2, X, Info,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";

interface Device {
  id: string; name: string; rssi: number; type: "bluetooth" | "wifi"; mac: string;
}

const ALL_DEVICES: Device[] = [
  { id:"1", name:"Cradle Pod Alpha", rssi:-38, type:"bluetooth", mac:"AA:BB:CC:11:22:33" },
  { id:"2", name:"Cradle Pod Beta",  rssi:-61, type:"bluetooth", mac:"AA:BB:CC:44:55:66" },
  { id:"3", name:"Cradle Pod Gamma", rssi:-74, type:"bluetooth", mac:"AA:BB:CC:77:88:99" },
  { id:"4", name:"Cradle WiFi Hub",  rssi:-45, type:"wifi",      mac:"11:22:33:AA:BB:CC" },
  { id:"5", name:"Cradle WiFi Mini", rssi:-58, type:"wifi",      mac:"11:22:33:DD:EE:FF" },
];

const signalInfo = (r: number) =>
  r > -50 ? { label:"Excellent", bars:4, color:"bg-emerald-500" } :
  r > -62 ? { label:"Good",      bars:3, color:"bg-primary"     } :
  r > -72 ? { label:"Fair",      bars:2, color:"bg-amber-400"   } :
            { label:"Weak",      bars:1, color:"bg-red-400"     };

const SignalBars = ({ rssi }: { rssi: number }) => {
  const { bars, color } = signalInfo(rssi);
  return (
    <div className="flex items-end gap-[2.5px]">
      {[1,2,3,4].map(b => (
        <div key={b} style={{ height:`${b*3+2}px` }}
          className={`w-[3px] rounded-sm ${b <= bars ? color : "bg-muted"}`} />
      ))}
    </div>
  );
};

const Connect = () => {
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [mode,       setMode]       = useState<"bluetooth"|"wifi">("bluetooth");
  const [scanning,   setScanning]   = useState(false);
  const [scanPct,    setScanPct]    = useState(0);
  const [devices,    setDevices]    = useState<Device[]>([]);
  const [connecting, setConnecting] = useState<string|null>(null);
  const [connected,  setConnected]  = useState<string|null>(null);
  const [showTip,    setShowTip]    = useState(false);

  const drip = useRef<ReturnType<typeof setInterval>|null>(null);
  const pct  = useRef<ReturnType<typeof setInterval>|null>(null);
  const done = useRef<ReturnType<typeof setTimeout>|null>(null);
  const conn = useRef<ReturnType<typeof setTimeout>|null>(null);

  const clearAll = () => {
    if (drip.current) { clearInterval(drip.current); drip.current = null; }
    if (pct.current)  { clearInterval(pct.current);  pct.current  = null; }
    if (done.current) { clearTimeout(done.current);  done.current = null; }
    if (conn.current) { clearTimeout(conn.current);  conn.current = null; }
  };
  useEffect(() => () => clearAll(), []);

  const switchMode = (next: "bluetooth"|"wifi") => {
    if (scanning) stopScan();
    setMode(next); setDevices([]); setConnected(null);
  };

  const startScan = () => {
    clearAll();
    setScanning(true); setDevices([]); setConnected(null); setScanPct(0);
    toast({ title:`Scanning for ${mode === "bluetooth" ? "Bluetooth" : "Wi-Fi"} devices…` });
    const pool = ALL_DEVICES.filter(d => d.type === mode);
    let idx = 0;
    drip.current = setInterval(() => {
      if (idx < pool.length) { setDevices(prev => [...prev, pool[idx]]); idx++; }
    }, 700);
    pct.current = setInterval(() => setScanPct(p => Math.min(p + 3, 95)), 80);
    done.current = setTimeout(() => {
      clearAll(); setScanPct(100); setScanning(false); setScanPct(0);
      toast({ title:"Scan complete", description:`Found ${pool.length} device${pool.length!==1?"s":""}` });
    }, 3000);
  };

  const stopScan = () => {
    clearAll(); setScanning(false); setScanPct(0);
    toast({ title:"Scan stopped" });
  };

  const handleConnect = (device: Device) => {
    if (connecting || connected) return;
    setConnecting(device.id);
    toast({ title:"Connecting…", description:`Pairing with ${device.name}` });
    conn.current = setTimeout(() => {
      setConnected(device.id); setConnecting(null);
      toast({ title:"Connected!", description:`${device.name} is ready` });
      setTimeout(() => navigate("/dashboard"), 900);
    }, 1800);
  };

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation(); setConnected(null);
    toast({ title:"Disconnected" });
  };

  return (
    <div className="min-h-screen page-bg pb-24">
      <PageHeader
        title="Connect Device"
        subtitle="Pair your Cradle Smart Pod via Bluetooth or Wi-Fi"
        icon={<Bluetooth className="w-5 h-5 text-primary" />}
        actions={
          <button
            onClick={() => setShowTip(p => !p)}
            className={`w-9 h-9 rounded-xl border border-border/50 flex items-center justify-center transition-colors ${
              showTip ? "bg-primary/10 text-primary border-primary/30" : "bg-card/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Info className="w-4 h-4" />
          </button>
        }
      />

      <div className="px-5 mt-4 space-y-4">
        {/* Tip panel */}
        {showTip && (
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-1.5 fade-up">
            <p className="text-xs font-bold text-foreground">Connection Tips</p>
            <p className="text-xs text-muted-foreground">• <span className="font-semibold text-foreground">Bluetooth</span> — up to 10 m, lowest latency</p>
            <p className="text-xs text-muted-foreground">• <span className="font-semibold text-foreground">Wi-Fi</span> — whole-home coverage on same network</p>
            <p className="text-xs text-muted-foreground">• Pod LED should blink green when ready to pair</p>
          </div>
        )}

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-3">
          {(["bluetooth", "wifi"] as const).map(t => (
            <button key={t} onClick={() => switchMode(t)}
              className={[
                "flex flex-col items-center gap-2 py-4 rounded-2xl border-2 font-semibold text-sm transition-all duration-200",
                mode === t
                  ? "border-primary bg-primary/8 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
              ].join(" ")}>
              {t === "bluetooth" ? <Bluetooth className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
              {t === "bluetooth" ? "Bluetooth" : "Wi-Fi"}
            </button>
          ))}
        </div>

        {/* Progress bar */}
        {scanning && (
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-150"
              style={{ width:`${scanPct}%` }} />
          </div>
        )}

        {/* Scan / stop */}
        <button
          onClick={scanning ? stopScan : startScan}
          disabled={!!connected}
          className={[
            "w-full h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
            scanning
              ? "bg-muted text-foreground border border-border"
              : connected
              ? "bg-muted/50 text-muted-foreground cursor-not-allowed"
              : "bg-primary text-white hover:bg-primary/90 shadow-sm",
          ].join(" ")}>
          {scanning
            ? <><X className="w-4 h-4" /> Stop Scanning</>
            : <><Search className="w-4 h-4" /> Scan for Devices</>}
        </button>

        {/* Radar animation */}
        {scanning && devices.length === 0 && (
          <div className="relative flex items-center justify-center py-10">
            {[0,1,2].map(i => (
              <span key={i} className="absolute rounded-full border border-primary/20 animate-ping"
                style={{ width:`${56+i*36}px`, height:`${56+i*36}px`,
                  animationDelay:`${i*0.45}s`, animationDuration:"1.8s" }} />
            ))}
            <div className="relative z-10 w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Search className="w-6 h-6 text-primary animate-pulse" />
            </div>
          </div>
        )}

        {/* Empty state */}
        {!scanning && devices.length === 0 && (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              {mode === "bluetooth"
                ? <Bluetooth className="w-6 h-6 text-muted-foreground/40" />
                : <Wifi      className="w-6 h-6 text-muted-foreground/40" />}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No devices found</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap Scan to search nearby</p>
            </div>
          </div>
        )}

        {/* Device list */}
        <div className="space-y-2.5">
          {devices.map((device, i) => {
            const { label } = signalInfo(device.rssi);
            const isConnecting = connecting === device.id;
            const isConnected  = connected  === device.id;
            return (
              <Card key={device.id}
                onClick={() => !isConnected && !isConnecting && handleConnect(device)}
                className={[
                  "p-4 border cursor-pointer select-none card-lift active:scale-[0.985]",
                  `fade-up-${Math.min(i + 1, 4) as 1|2|3|4}`,
                  isConnected  ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/25",
                  isConnecting ? "opacity-70 pointer-events-none" : "",
                ].join(" ")}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isConnected ? "bg-primary/15" : "bg-muted"}`}>
                    {device.type === "bluetooth"
                      ? <Bluetooth className={`w-4 h-4 ${isConnected ? "text-primary" : "text-muted-foreground"}`} />
                      : <Wifi      className={`w-4 h-4 ${isConnected ? "text-primary" : "text-muted-foreground"}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{device.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SignalBars rssi={device.rssi} />
                      <span className="text-[10px] text-muted-foreground">{label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground/50">{device.mac}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isConnected ? (
                      <button onClick={handleDisconnect} className="text-primary hover:text-destructive transition-colors">
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    ) : isConnecting ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Badge variant="outline" className="text-[10px] rounded-full px-2.5">Pair</Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Footer tip */}
        {!scanning && devices.length === 0 && (
          <div className="flex gap-3 p-4 rounded-2xl bg-card border border-border/60">
            <span className="text-base shrink-0">💡</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pod LED blinks <span className="font-semibold text-foreground">green</span> when ready. Hold power 3 s to restart.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Connect;

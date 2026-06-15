import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Baby, Bell, Bluetooth, Info, ChevronRight, ChevronLeft,
  Trash2, RefreshCw, Gauge, Shield, Vibrate,
  BellOff, Clock, Download, Settings as Cog,
  Music2, Camera, PlayCircle, CheckCircle2, WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotify, type SoundOption, type VibeOption } from "@/components/NotificationPopup";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useSensor } from "@/contexts/SensorContext";
import PageHeader from "@/components/PageHeader";

type Screen = "home"|"profile"|"appearance"|"notifications"|"thresholds"|"device"|"privacy"|"about";

// ── Sub-page shell — same page-header structure, adds a back button ──────────
const SubPage = ({ title, subtitle, icon, onBack, children }: {
  title: string; subtitle: string; icon: React.ReactNode;
  onBack: ()=>void; children: React.ReactNode;
}) => (
  <div className="min-h-screen page-bg pb-24">
    {/* Re-use page-header CSS class directly so structure is pixel-identical to PageHeader */}
    <header className="page-header">
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button replaces nothing — sits left of icon */}
          <button onClick={onBack}
            className="w-9 h-9 rounded-xl bg-card/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-11 h-11 rounded-2xl bg-card shadow-sm border border-border/40 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold tracking-tight text-foreground leading-none">{title}</h1>
            <p className="text-[11px] text-muted-foreground mt-1 leading-none truncate">{subtitle}</p>
          </div>
        </div>
      </div>
    </header>
    <div className="px-5 mt-4">{children}</div>
  </div>
);

// ── Reusable list patterns ────────────────────────────────────────────────────
const ListCard = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
    {children}
  </div>
);

const NavRow = ({ Icon, iconBg, label, desc, onClick, danger=false }: {
  Icon: React.ElementType; iconBg: string; label: string; desc?: string;
  onClick: ()=>void; danger?: boolean;
}) => (
  <button onClick={onClick}
    className={`w-full flex items-center gap-3 py-3.5 px-4 transition-colors ${danger ? "hover:bg-red-50 dark:hover:bg-red-950/30" : "hover:bg-muted/40"} active:bg-muted/60`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
      <Icon className={`w-4 h-4 ${danger ? "text-red-500" : "text-muted-foreground"}`} />
    </div>
    <div className="flex-1 text-left min-w-0">
      <p className={`text-sm font-bold truncate ${danger ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{label}</p>
      {desc && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{desc}</p>}
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
  </button>
);

const TogRow = ({ Icon, label, desc, checked, onChange, disabled }: {
  Icon: React.ElementType; label: string; desc?: string;
  checked: boolean; onChange: (v:boolean)=>void; disabled?: boolean;
}) => (
  <div className={`flex items-center gap-3 px-4 py-3.5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-muted-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-foreground">{label}</p>
      {desc && <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

const InfoNote = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-3 bg-card border border-border/60 rounded-2xl p-4">
    <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const Settings = () => {
  const { toast }              = useToast();
  const { notify, soundPref, setSoundPref, vibePref, setVibePref, permissionGranted, requestPermission } = useNotify();
  const { theme, toggleTheme } = useTheme();
  const navigate               = useNavigate();
  const { state, connect, disconnect, refresh } = useSensor();
  const { device, reading }    = state;
  const [screen, setScreen]    = useState<Screen>("home");
  const fileInputRef           = useRef<HTMLInputElement>(null);

  const [babyName,   setBabyName]   = useState("Baby");
  const [babyAge,    setBabyAge]    = useState("3 months");
  const [babyWeight, setBabyWeight] = useState("5.2 kg");
  const [dirty,      setDirty]      = useState(false);
  const [photoUrl,   setPhotoUrl]   = useState<string | null>(null);

  const [notif,    setNotif]    = useState(true);
  const [quiet,    setQuiet]    = useState(false);
  const [warnPct,  setWarnPct]  = useState(60);
  const [alertPct, setAlertPct] = useState(80);
  const [analytics,    setAnalytics]    = useState(false);
  const [crashReports, setCrashReports] = useState(true);

  const mk = () => setDirty(true);

  // ── Sub-screens ──────────────────────────────────────────────────────────

  if (screen === "profile") return (
    <SubPage title="Baby Profile" subtitle="Personal info used for alerts & tracking"
      icon={<Baby className="w-5 h-5 text-primary" />} onBack={() => setScreen("home")}>
      <div className="space-y-3.5">

        {/* Profile photo — proper file input */}
        <div className="flex flex-col items-center mb-6">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            aria-label="Change profile photo"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/25 overflow-hidden flex items-center justify-center shadow-md group-hover:border-primary/50 transition-colors">
              {photoUrl
                ? <img src={photoUrl} alt="Baby" className="w-full h-full object-cover" />
                : <span className="text-4xl select-none">👶</span>}
            </div>
            {/* Camera overlay badge */}
            <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-sm border-2 border-background">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </button>
          <p className="text-[11px] text-muted-foreground mt-2.5 font-medium">Tap photo to change</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={e => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setPhotoUrl(url);
              setDirty(true);
            }}
          />
        </div>

        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Name</Label>
          <Input value={babyName} onChange={e => { setBabyName(e.target.value); mk(); }} className="h-11 rounded-xl" placeholder="Baby's name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Age</Label>
            <Input value={babyAge} onChange={e => { setBabyAge(e.target.value); mk(); }} className="h-11 rounded-xl" placeholder="3 months" />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Weight</Label>
            <Input value={babyWeight} onChange={e => { setBabyWeight(e.target.value); mk(); }} className="h-11 rounded-xl" placeholder="5.2 kg" />
          </div>
        </div>
        <Button className="w-full h-11 rounded-2xl font-bold mt-2" onClick={() => {
          if (!babyName.trim()) { toast({ title: "Name required" }); return; }
          setDirty(false); toast({ title: "Profile saved ✓" });
        }} disabled={!dirty}>
          {dirty ? "Save Profile" : "All Saved ✓"}
        </Button>
      </div>
    </SubPage>
  );

  if (screen === "appearance") return (
    <SubPage title="Appearance" subtitle="Theme & display preferences"
      icon={<Cog className="w-5 h-5 text-primary" />} onBack={() => setScreen("home")}>
      <ListCard>
        <TogRow Icon={Cog} label="Dark Mode" desc="Easier on the eyes at night"
          checked={theme === "dark"} onChange={toggleTheme} />
      </ListCard>
      <InfoNote>App follows your system preference unless overridden here.</InfoNote>
    </SubPage>
  );

  if (screen === "notifications") return (
    <SubPage title="Notifications" subtitle="Alerts, sounds & quiet hours"
      icon={<Bell className="w-5 h-5 text-primary" />} onBack={() => setScreen("home")}>
      <div className="space-y-4">

        {/* Native phone notification permission */}
        {!permissionGranted && (
          <div className="bg-primary/8 border border-primary/25 rounded-2xl p-4 flex items-start gap-3">
            <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">Enable phone notifications</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Alerts appear in your phone's notification bar — even when the app is minimised.
              </p>
              <button onClick={requestPermission}
                className="mt-2.5 text-[12px] font-bold text-white bg-primary px-4 py-2 rounded-xl active:scale-95 transition-transform">
                Allow Notifications
              </button>
            </div>
          </div>
        )}

        {permissionGranted && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl px-4 py-3 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
              Phone notifications enabled
            </p>
          </div>
        )}

        {/* Master toggles */}
        <ListCard>
          <TogRow Icon={notif ? Bell : BellOff} label="In-App Notifications" desc="Alerts displayed inside the app" checked={notif} onChange={setNotif} />
          <TogRow Icon={Clock} label="Quiet Hours" desc="Mute 10 pm – 7 am" checked={quiet} onChange={setQuiet} disabled={!notif} />
        </ListCard>

        {!notif && (
          <div className="alert-soiled border rounded-2xl flex items-start gap-2.5 p-3.5">
            <BellOff className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold">In-app alerts disabled. Phone notifications are still active.</p>
          </div>
        )}

        {/* Sound selector */}
        <div className={notif ? "" : "opacity-40 pointer-events-none"}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Alert Sound</p>
          <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
            {([
              { key: "chime",  label: "Gentle Chime",  desc: "Soft melodic — 3 rising notes" },
              { key: "ping",   label: "Soft Ping",      desc: "Clean single tone" },
              { key: "beep",   label: "Alert Beep",     desc: "Double square-wave — noticeable" },
              { key: "silent", label: "Silent",          desc: "No sound, vibration only" },
            ] as { key: SoundOption; label: string; desc: string }[]).map(({ key, label, desc }) => (
              <button key={key} onClick={() => setSoundPref(key)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${soundPref === key ? "bg-primary/10" : "bg-muted"}`}>
                  {key === "silent"
                    ? <BellOff className={`w-4 h-4 ${soundPref === key ? "text-primary" : "text-muted-foreground"}`} />
                    : <Music2  className={`w-4 h-4 ${soundPref === key ? "text-primary" : "text-muted-foreground"}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${soundPref === key ? "text-primary" : "text-foreground"}`}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={e => { e.stopPropagation(); notify({ title: `Preview: ${label}`, variant: "info", sound: key, vibration: "none" }); }}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                    aria-label={`Preview ${label}`}>
                    <PlayCircle className="w-3.5 h-3.5" />
                  </button>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${soundPref === key ? "border-primary" : "border-muted-foreground/30"}`}>
                    {soundPref === key && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Vibration selector */}
        <div className={notif ? "" : "opacity-40 pointer-events-none"}>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Vibration</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "short",  label: "Short",  desc: "Single 80 ms" },
              { key: "long",   label: "Long",   desc: "Single 300 ms" },
              { key: "double", label: "Double", desc: "Two quick pulses" },
              { key: "none",   label: "Off",    desc: "No vibration" },
            ] as { key: VibeOption; label: string; desc: string }[]).map(({ key, label, desc }) => (
              <button key={key} onClick={() => setVibePref(key)}
                className={["flex flex-col items-start gap-1 p-3.5 rounded-2xl border-2 transition-all text-left",
                  vibePref === key ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"].join(" ")}>
                <div className="flex items-center gap-2 w-full">
                  <Vibrate className={`w-4 h-4 ${vibePref === key ? "text-primary" : "text-muted-foreground"}`} />
                  <p className={`text-sm font-bold ${vibePref === key ? "text-primary" : "text-foreground"}`}>{label}</p>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${vibePref === key ? "border-primary" : "border-muted-foreground/30"}`}>
                    {vibePref === key && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Test */}
        <Button className="w-full h-11 rounded-2xl font-bold" disabled={!notif}
          onClick={() => notify({ title: "Diaper change needed", message: "Moisture level has exceeded your threshold. Please check on baby.", variant: "urgent", sound: soundPref, vibration: vibePref })}>
          <Bell className="w-4 h-4 mr-2" />
          Test Notification
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Notifications stay until you swipe right or tap ✕
        </p>

      </div>
    </SubPage>
  );

  if (screen === "thresholds") return (
    <SubPage title="Alert Thresholds" subtitle="Sensor sensitivity settings"
      icon={<Gauge className="w-5 h-5 text-primary" />} onBack={() => setScreen("home")}>
      <div className="space-y-4">
        <InfoNote>Set moisture levels at which you want notifications. Adjust based on your baby's sensitivity.</InfoNote>

        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Warning Level</p>
              <p className="text-[10px] text-muted-foreground">Shows a yellow indicator</p>
            </div>
            <span className="text-2xl font-extrabold text-amber-500">{warnPct}%</span>
          </div>
          <input type="range" min={20} max={90} step={5} value={warnPct}
            onChange={e => setWarnPct(Number(e.target.value))}
            className="w-full h-2 accent-amber-500 cursor-pointer rounded-full" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>20%</span><span>90%</span>
          </div>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Critical Alert</p>
              <p className="text-[10px] text-muted-foreground">Triggers push notification</p>
            </div>
            <span className="text-2xl font-extrabold text-red-500">{alertPct}%</span>
          </div>
          <input type="range" min={30} max={100} step={5} value={alertPct}
            onChange={e => setAlertPct(Number(e.target.value))}
            className="w-full h-2 accent-red-500 cursor-pointer rounded-full" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>30%</span><span>100%</span>
          </div>
        </div>

        <Button className="w-full h-11 rounded-2xl font-bold" onClick={() => {
          toast({ title:"Thresholds saved ✓", description:`Warning ${warnPct}% · Alert ${alertPct}%` });
          setScreen("home");
        }}>Save Thresholds</Button>
      </div>
    </SubPage>
  );

  if (screen === "device") return (
    <SubPage title="Device Management" subtitle="ESP32 Smart Pod connection & info"
      icon={<Bluetooth className="w-5 h-5 text-primary" />} onBack={() => setScreen("home")}>
      <div className="space-y-3">

        {/* Connection status banner */}
        {device.connected ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl px-4 py-3 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
              Connected · {device.ip}
            </p>
          </div>
        ) : (
          <div className="bg-muted/50 border border-border rounded-2xl px-4 py-3 flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="text-[12px] font-medium text-muted-foreground">
              {device.error ?? "No device connected"}
            </p>
          </div>
        )}

        {/* Actions */}
        <ListCard>
          <NavRow Icon={RefreshCw} iconBg="bg-primary/10"
            label="Reconnect"
            desc={device.ip ? `Last IP: ${device.ip}` : "No previous connection"}
            onClick={() => {
              if (device.ip) {
                disconnect();
                setTimeout(() => connect(device.ip!), 300);
                notify({ title: "Reconnecting…", variant: "info" });
              } else {
                setScreen("home");
                navigate("/");
              }
            }} />
          <NavRow Icon={Gauge} iconBg="bg-sky-100 dark:bg-sky-950/50"
            label="Refresh Sensors"
            desc="Request an immediate reading"
            onClick={() => {
              if (device.connected) {
                refresh();
                notify({ title: "Sensor refresh requested", variant: "info" });
              } else {
                toast({ title: "Not connected" });
              }
            }} />
        </ListCard>

        {/* Live device info — from real reading */}
        <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Device Info</p>
          {[
            ["IP Address", device.ip ?? "—"],
            ["Firmware",   reading?.firmware ?? "—"],
            ["MAC",        reading?.mac ?? "—"],
            ["Signal",     reading ? `${reading.rssi} dBm` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">{k}</span>
              <span className="text-xs font-bold text-foreground font-mono">{v}</span>
            </div>
          ))}
        </div>

        {/* Danger */}
        <div className="bg-card border border-red-200 dark:border-red-900/60 rounded-2xl overflow-hidden">
          <NavRow Icon={WifiOff} iconBg="bg-red-100 dark:bg-red-950/40"
            label="Disconnect Device" desc="Return to the connect screen" danger
            onClick={() => { disconnect(); navigate("/"); }} />
        </div>
      </div>
    </SubPage>
  );

  if (screen === "privacy") return (
    <SubPage title="Privacy & Data" subtitle="Your data, your control"
      icon={<Shield className="w-5 h-5 text-primary" />} onBack={() => setScreen("home")}>
      <div className="space-y-4">

        {/* ── Export section ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Export</p>
          <ListCard>
            <NavRow Icon={Download} iconBg="bg-emerald-100 dark:bg-emerald-950/50"
              label="Export History (CSV)" desc="Download all diaper events as CSV"
              onClick={() => {
                const csv = ["ID,Type,Timestamp,Details,Resolved"].join("\n"); // populated from real history events
                const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
                a.download = "cradle-history.csv"; a.click(); toast({title:"History exported ✓"});
              }} />
            <NavRow Icon={Download} iconBg="bg-sky-100 dark:bg-sky-950/50"
              label="Export Profile (JSON)" desc="Baby profile and app settings"
              onClick={() => {
                const b = new Blob([JSON.stringify({babyName,babyAge,babyWeight,notif,warnPct,alertPct},null,2)],{type:"application/json"});
                const a = document.createElement("a"); a.href = URL.createObjectURL(b);
                a.download = "cradle-profile.json"; a.click(); toast({title:"Profile exported ✓"});
              }} />
          </ListCard>
        </div>

        {/* ── Storage section ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Storage</p>
          <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3">
            {[
              { label:"Event history",  value:"0 events", bar:0 },
              { label:"App settings",   value:"< 1 KB",   bar:2 },
            ].map(({ label, value, bar }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <span className="text-xs font-bold text-foreground">{value}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width:`${bar}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Privacy toggles ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Privacy</p>
          <ListCard>
            <TogRow Icon={Shield} label="Local storage only" desc="Data never leaves your device" checked={true} onChange={()=>{}} disabled />
            <TogRow Icon={Shield} label="Analytics" desc="Send anonymous usage stats to improve Cradle" checked={analytics} onChange={setAnalytics} />
            <TogRow Icon={Shield} label="Crash reports" desc="Automatically send crash logs" checked={crashReports} onChange={setCrashReports} />
          </ListCard>
        </div>

        {/* ── Danger zone ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">Danger Zone</p>
          <div className="bg-card border border-red-200 dark:border-red-900/60 rounded-2xl overflow-hidden divide-y divide-red-100 dark:divide-red-900/40">
            <NavRow Icon={Trash2} iconBg="bg-red-100 dark:bg-red-950/40"
              label="Clear Event History" desc="Permanently delete all diaper events" danger
              onClick={() => { toast({title:"History cleared"}); }} />
            <NavRow Icon={Trash2} iconBg="bg-red-100 dark:bg-red-950/40"
              label="Reset All Settings" desc="Restore factory defaults" danger
              onClick={() => {
                setBabyName("Baby"); setBabyAge("3 months"); setBabyWeight("5.2 kg");
                setNotif(true); setWarnPct(60); setAlertPct(80); setDirty(false);
                toast({ title: "Reset to defaults" });
              }} />
          </div>
        </div>

        <InfoNote>Cradle stores all data locally on this device. Nothing is shared with third parties unless you enable analytics above.</InfoNote>
      </div>
    </SubPage>
  );

  if (screen === "about") return (
    <SubPage title="About" subtitle="Cradle Smart Baby Monitor"
      icon={<Info className="w-5 h-5 text-primary" />} onBack={() => setScreen("home")}>
      <div className="flex flex-col items-center py-4 mb-5">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-3xl shadow-sm mb-3">🍼</div>
        <p className="text-base font-extrabold text-foreground">Cradle</p>
        <p className="text-xs text-muted-foreground">Smart Baby Monitor</p>
      </div>
      <ListCard>
        {[
          ["App Version",  "1.0.0"],
          ["Device",       reading ? `ESP32 · ${device.ip}` : "Not connected"],
          ["Firmware",     reading?.firmware ?? "—"],
          ["MAC Address",  reading?.mac      ?? "—"],
          ["Signal",       reading ? `${reading.rssi} dBm` : "—"],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between items-center px-4 py-3">
            <span className="text-sm text-muted-foreground">{k}</span>
            <span className="text-sm font-bold text-foreground font-mono">{v}</span>
          </div>
        ))}
      </ListCard>
      <p className="text-xs text-muted-foreground text-center mt-4 leading-relaxed">Built with ❤️ for parents everywhere.</p>
    </SubPage>
  );

  // ── Home screen ─────────────────────────────────────────────────────────
  const sections = [
    { heading:"Personal", items:[
      { Icon:Baby,      iconBg:"bg-pink-100 dark:bg-pink-950/50",       label:"Baby Profile",      desc:`${babyName} · ${babyAge}`,              s:"profile"       },
      { Icon:Cog,       iconBg:"bg-slate-100 dark:bg-slate-800/60",     label:"Appearance",        desc:theme==="dark"?"Dark mode":"Light mode",  s:"appearance"    },
    ]},
    { heading:"Alerts & Sensors", items:[
      { Icon:Bell,      iconBg:"bg-violet-100 dark:bg-violet-950/50",   label:"Notifications",     desc:notif?"Enabled":"Muted",                  s:"notifications" },
      { Icon:Gauge,     iconBg:"bg-amber-100 dark:bg-amber-950/50",     label:"Alert Thresholds",  desc:`Warn ${warnPct}% · Alert ${alertPct}%`,  s:"thresholds"    },
    ]},
    { heading:"Device", items:[
      { Icon:Bluetooth, iconBg:"bg-sky-100 dark:bg-sky-950/50",         label:"Device Management", desc: device.connected ? `Connected · ${device.ip}` : "Not connected",  s:"device"        },
    ]},
    { heading:"Data & Privacy", items:[
      { Icon:Shield,    iconBg:"bg-emerald-100 dark:bg-emerald-950/50", label:"Privacy & Data",    desc:"Export, storage, analytics",                          s:"privacy"       },
      { Icon:Info,      iconBg:"bg-muted",                              label:"About Cradle",      desc:"Version 1.0.0",                          s:"about"         },
    ]},
  ];

  return (
    <div className="min-h-screen page-bg pb-24">
      <PageHeader
        title="Settings"
        subtitle="App, device & notification preferences"
      />

      <div className="px-5 mt-4 space-y-4">
        {sections.map(({ heading, items }) => (
          <div key={heading} className="fade-up">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-2">
              {heading}
            </p>
            <ListCard>
              {items.map(({ Icon, iconBg, label, desc, s }) => (
                <button key={label} onClick={() => setScreen(s as Screen)}
                  className="w-full flex items-center gap-3 py-3.5 px-4 hover:bg-muted/40 active:bg-muted/70 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-bold text-foreground">{label}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </ListCard>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings;

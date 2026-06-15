/**
 * NotificationPopup — Complete notification system:
 *
 * WEB (desktop/tablet):
 *   • Small compact toast in BOTTOM-RIGHT corner (max 360px wide)
 *   • Slides in from right, stacks upward
 *   • Persists until swiped right or ✕ clicked
 *
 * MOBILE / PHONE:
 *   • Native Web Notifications API → appears in phone notification bar
 *   • requireInteraction: true → stays until user dismisses from notification bar
 *
 * NOTIFICATION BELL (Dashboard header):
 *   • Red badge shows unread count
 *   • Tapping opens a notification drawer/panel showing all stored notifications
 *   • "Clear all" button inside drawer
 *   • Notifications accumulate — stored in context, never auto-cleared
 *
 * SOUNDS: Web Audio synthesis (chime / ping / beep / silent)
 * VIBRATION: navigator.vibrate patterns
 */

import {
  createContext, useContext, useState, useCallback,
  useRef, useEffect, ReactNode,
} from "react";
import { X, Bell, AlertTriangle, CheckCircle2, Info, Trash2, BellOff } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
export type NotifVariant = "info" | "success" | "warning" | "urgent";
export type SoundOption  = "chime" | "ping" | "beep" | "silent";
export type VibeOption   = "short" | "long" | "double" | "none";

export interface NotifOptions {
  title:      string;
  message?:   string;
  variant?:   NotifVariant;
  sound?:     SoundOption;
  vibration?: VibeOption;
}

export interface StoredNotif extends NotifOptions {
  id:        string;
  timestamp: Date;
  read:      boolean;
}

interface NotifCtxType {
  notify:            (opts: NotifOptions) => void;
  notifications:     StoredNotif[];
  unreadCount:       number;
  markAllRead:       () => void;
  clearAll:          () => void;
  dismiss:           (id: string) => void;
  // active toasts (currently displayed in corner)
  toasts:            StoredNotif[];
  dismissToast:      (id: string) => void;
  // settings
  soundPref:         SoundOption;
  setSoundPref:      (s: SoundOption) => void;
  vibePref:          VibeOption;
  setVibePref:       (v: VibeOption) => void;
  permissionGranted: boolean;
  requestPermission: () => Promise<void>;
}

const Ctx = createContext<NotifCtxType | null>(null);

export function useNotify(): NotifCtxType {
  const c = useContext(Ctx);
  if (!c) throw new Error("useNotify outside NotificationProvider");
  return c;
}

// ── Audio ────────────────────────────────────────────────────────────────────
function playSound(type: SoundOption) {
  if (type === "silent") return;
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
    const master = ac.createGain();
    master.connect(ac.destination);
    const notes: { f: number; t: number; d: number; w: OscillatorType; v: number }[] =
      type === "chime" ? [
        { f: 523, t: 0,    d: 0.38, w: "sine",   v: 0.18 },
        { f: 659, t: 0.16, d: 0.38, w: "sine",   v: 0.14 },
        { f: 784, t: 0.32, d: 0.55, w: "sine",   v: 0.12 },
      ] : type === "ping" ? [
        { f: 880, t: 0,    d: 0.30, w: "sine",   v: 0.20 },
        { f: 1100,t: 0.30, d: 0.22, w: "sine",   v: 0.10 },
      ] : [
        { f: 440, t: 0,    d: 0.12, w: "square", v: 0.10 },
        { f: 440, t: 0.20, d: 0.12, w: "square", v: 0.10 },
        { f: 550, t: 0.38, d: 0.18, w: "square", v: 0.12 },
      ];
    notes.forEach(({ f, t, d, w, v }) => {
      const osc = ac.createOscillator(), g = ac.createGain();
      osc.type = w; osc.frequency.value = f;
      g.gain.setValueAtTime(0, ac.currentTime + t);
      g.gain.linearRampToValueAtTime(v, ac.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + t + d);
      osc.connect(g); g.connect(master);
      osc.start(ac.currentTime + t); osc.stop(ac.currentTime + t + d + 0.05);
    });
    setTimeout(() => ac.close(), 2500);
  } catch { /* silent fallback */ }
}

function vibrate(type: VibeOption) {
  if (!("vibrate" in navigator)) return;
  const p: Record<VibeOption, number[]> = {
    short: [80], long: [300], double: [80, 100, 80], none: [],
  };
  if (p[type].length) navigator.vibrate(p[type]);
}

async function sendNativeNotif(title: string, body?: string, variant?: NotifVariant) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const icon: Record<string, string> = { urgent: "🚨", warning: "⚠️", success: "✅", info: "ℹ️" };
  try {
    const n = new Notification(`${icon[variant ?? "info"] ?? "ℹ️"} ${title}`, {
      body: body ?? "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "cradle-alert",
      renotify: variant === "urgent",
      requireInteraction: true,
      silent: false,
    });
    n.onclick = () => { window.focus(); n.close(); };
  } catch { /* revoked */ }
}

// ── Variant colours ──────────────────────────────────────────────────────────
const VCFG: Record<NotifVariant, {
  Icon: typeof Bell; accent: string; iconBg: string; iconColor: string;
  toastBg: string; toastBorder: string;
}> = {
  info:    { Icon: Info,          accent: "bg-primary",    iconBg: "bg-primary/12",                    iconColor: "text-primary",                       toastBg: "bg-card",                              toastBorder: "border-border"                          },
  success: { Icon: CheckCircle2,  accent: "bg-emerald-500",iconBg: "bg-emerald-100 dark:bg-emerald-900/40", iconColor: "text-emerald-600 dark:text-emerald-400", toastBg: "bg-emerald-50 dark:bg-emerald-950/50",   toastBorder: "border-emerald-200 dark:border-emerald-800/50" },
  warning: { Icon: Bell,          accent: "bg-amber-400",  iconBg: "bg-amber-100 dark:bg-amber-900/40",    iconColor: "text-amber-600 dark:text-amber-400",    toastBg: "bg-amber-50 dark:bg-amber-950/50",      toastBorder: "border-amber-200 dark:border-amber-800/50"  },
  urgent:  { Icon: AlertTriangle, accent: "bg-red-500",    iconBg: "bg-red-100 dark:bg-red-900/40",        iconColor: "text-red-600 dark:text-red-400",         toastBg: "bg-red-50 dark:bg-red-950/50",          toastBorder: "border-red-200 dark:border-red-800/50"  },
};

// ── Toast card (bottom-right corner, web) ─────────────────────────────────────
function ToastCard({ item, onDismiss }: { item: StoredNotif; onDismiss: (id: string) => void }) {
  const cfg    = VCFG[item.variant ?? "info"];
  const Icon   = cfg.Icon;
  const [dx, setDx]           = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [entered, setEntered] = useState(false);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(item.id), 280);
  }, [item.id, onDismiss]);

  const swipeStart = (clientX: number) => { startX.current = clientX; };
  const swipeMove  = (clientX: number) => {
    if (startX.current === null) return;
    const d = clientX - startX.current;
    if (d > 0) setDx(d);
  };
  const swipeEnd = () => {
    if (dx > 70) dismiss(); else setDx(0);
    startX.current = null;
  };

  const opacity = Math.max(0, 1 - dx / 140);

  return (
    <div
      className={[
        "relative w-[340px] max-w-[calc(100vw-24px)] rounded-2xl border shadow-2xl overflow-hidden",
        "cursor-grab active:cursor-grabbing select-none",
        cfg.toastBg, cfg.toastBorder,
      ].join(" ")}
      style={{
        transform: leaving
          ? "translateX(110%)"
          : entered
          ? `translateX(${dx}px)`
          : "translateX(110%)",
        opacity: leaving ? 0 : opacity,
        transition: dx > 0
          ? "opacity 0.05s"
          : "transform 0.32s cubic-bezier(.22,1,.36,1), opacity 0.32s",
        boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      }}
      onTouchStart={e => swipeStart(e.touches[0].clientX)}
      onTouchMove={e  => swipeMove(e.touches[0].clientX)}
      onTouchEnd={swipeEnd}
      onMouseDown={e  => {
        swipeStart(e.clientX);
        const mv = (ev: MouseEvent) => swipeMove(ev.clientX);
        const up = () => { swipeEnd(); window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
        window.addEventListener("mousemove", mv);
        window.addEventListener("mouseup", up);
      }}
    >
      {/* Left accent strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.accent}`} />

      <div className="flex items-start gap-3 pl-4 pr-3 pt-3.5 pb-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
          <Icon className={`w-4 h-4 ${cfg.iconColor}`} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-foreground leading-snug">{item.title}</p>
          {item.message && (
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.message}</p>
          )}
          <p className="text-[10px] text-muted-foreground/50 mt-1">
            {item.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            {" · Swipe to dismiss"}
          </p>
        </div>
        <button
          onClick={dismiss}
          onMouseDown={e => e.stopPropagation()}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Notification Drawer ───────────────────────────────────────────────────────
// Opens from header bell — shows ALL stored notifications
export function NotificationDrawer({
  open, onClose,
}: { open: boolean; onClose: () => void }) {
  const { notifications, dismiss, clearAll, markAllRead } = useNotify();

  useEffect(() => {
    if (open) markAllRead();
  }, [open, markAllRead]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      {/* Panel — slides down from top-right */}
      <div className="fixed top-0 right-0 z-[160] h-full w-full max-w-[360px] bg-card border-l border-border/60 shadow-2xl flex flex-col"
        style={{ animation: "slideInRight 0.28s cubic-bezier(.22,1,.36,1) both" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-foreground" />
            <h2 className="text-base font-bold text-foreground">Notifications</h2>
            {notifications.length > 0 && (
              <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {notifications.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button onClick={clearAll}
                className="text-[11px] font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <BellOff className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {notifications.map(n => {
                const cfg  = VCFG[n.variant ?? "info"];
                const Icon = cfg.Icon;
                return (
                  <div key={n.id} className={`flex items-start gap-3 px-4 py-3.5 ${!n.read ? "bg-primary/3" : ""}`}>
                    {/* Unread dot */}
                    <div className="mt-1.5 shrink-0">
                      {!n.read
                        ? <div className="w-2 h-2 rounded-full bg-primary" />
                        : <div className="w-2 h-2" />}
                    </div>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground leading-snug">{n.title}</p>
                      {n.message && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {n.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {n.timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <button onClick={() => dismiss(n.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Bell button with unread badge ─────────────────────────────────────────────
export function NotificationBell() {
  const { unreadCount } = useNotify();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 rounded-2xl bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-bold text-white px-0.5 leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<StoredNotif[]>([]);
  const [toasts,        setToasts]        = useState<StoredNotif[]>([]);
  const [soundPref,     setSoundPref]     = useState<SoundOption>("chime");
  const [vibePref,      setVibePref]      = useState<VibeOption>("short");
  const [permissionGranted, setPermissionGranted] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const r = await Notification.requestPermission();
    setPermissionGranted(r === "granted");
  }, []);

  const notify = useCallback((opts: NotifOptions) => {
    const id   = Math.random().toString(36).slice(2);
    const item: StoredNotif = { ...opts, id, timestamp: new Date(), read: false };

    // Store in history
    setNotifications(prev => [item, ...prev].slice(0, 50));

    // Show as toast (max 3 visible at once)
    setToasts(prev => [item, ...prev].slice(0, 3));

    // Side effects
    playSound(opts.sound ?? soundPref);
    vibrate(opts.vibration ?? vibePref);
    sendNativeNotif(opts.title, opts.message, opts.variant);
  }, [soundPref, vibePref]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setToasts([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Ctx.Provider value={{
      notify, notifications, unreadCount, markAllRead, clearAll,
      dismiss, toasts, dismissToast,
      soundPref, setSoundPref, vibePref, setVibePref,
      permissionGranted, requestPermission,
    }}>
      {children}

      {/* ── Bottom-right toast stack (web) ───────────────────────────── */}
      <div
        className="fixed bottom-6 right-4 z-[200] flex flex-col-reverse gap-2.5 items-end pointer-events-none"
        aria-live="assertive"
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

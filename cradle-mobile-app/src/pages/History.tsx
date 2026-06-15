/**
 * History page — shows diaper events logged from live sensor readings.
 *
 * Events are added automatically by the sensor context whenever the diaper
 * status changes (e.g. dry → wet). No mock data.
 *
 * Integration point: import addEvent from HistoryContext (or pass via prop)
 * to push events from Dashboard when sensor state changes.
 */

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Droplets, ThermometerSun, AlertCircle, Clock,
  Filter, Trash2, Download, ChevronDown, ChevronUp,
  CheckCircle2, Waves, InboxIcon,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";

type EventType = "wet" | "soiled" | "both" | "temperature";
interface HistoryEvent {
  id:        string;
  type:      EventType;
  timestamp: Date;
  details:   string;
  resolved:  boolean;
}

const TCFG: Record<EventType, {
  Icon: React.ElementType; label: string; cls: string; iconCls: string; bar: string;
}> = {
  wet:         { Icon: Droplets,       label: "Wet",          cls: "alert-wet",    iconCls: "text-sky-500",    bar: "border-l-sky-400"    },
  soiled:      { Icon: Waves,          label: "Soiled",       cls: "alert-soiled", iconCls: "text-amber-500",  bar: "border-l-amber-400"  },
  both:        { Icon: AlertCircle,    label: "Wet & Soiled", cls: "alert-urgent", iconCls: "text-rose-500",   bar: "border-l-rose-400"   },
  temperature: { Icon: ThermometerSun, label: "Temp Alert",   cls: "alert-soiled", iconCls: "text-orange-500", bar: "border-l-orange-400" },
};

const ago   = (d: Date) => { const m = Math.floor((Date.now() - d.getTime()) / 60000); return m < 60 ? `${m}m` : m < 1440 ? `${Math.floor(m / 60)}h` : `${Math.floor(m / 1440)}d`; };
const dtFmt = (d: Date) => d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const byPeriod = (evs: HistoryEvent[], hrs: number) =>
  evs.filter(e => (Date.now() - e.timestamp.getTime()) < hrs * 3_600_000);

// ── Event card ─────────────────────────────────────────────────────────────
const EventCard = ({ ev, onResolve, onDelete }: {
  ev: HistoryEvent; onResolve: (id: string) => void; onDelete: (id: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const { Icon, label, cls, iconCls, bar } = TCFG[ev.type];
  return (
    <Card className={`overflow-hidden border transition-all duration-200 ${!ev.resolved ? `border-l-4 ${bar}` : ""}`}>
      <button className="w-full text-left p-4" onClick={() => setOpen(p => !p)}>
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${ev.resolved ? "bg-muted" : "bg-muted/70"}`}>
            <Icon className={`w-4 h-4 ${ev.resolved ? "text-muted-foreground" : iconCls}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{label}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">{ago(ev.timestamp)} ago</span>
            </div>
            <p className={`text-sm font-semibold ${ev.resolved ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {ev.resolved ? "Resolved" : "Action needed"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{ev.details}</p>
          </div>
          <div className="shrink-0 mt-0.5 text-muted-foreground">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/40">
          <p className="text-[11px] text-muted-foreground mt-3 mb-3">🕐 {dtFmt(ev.timestamp)}</p>
          <div className="flex gap-2">
            {!ev.resolved && (
              <button onClick={() => onResolve(ev.id)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 transition-all active:scale-95">
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
              </button>
            )}
            <button onClick={() => onDelete(ev.id)}
              className="flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-300 transition-all active:scale-95">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

// ── Empty state ─────────────────────────────────────────────────────────────
const EmptyState = ({ message }: { message: string }) => (
  <div className="py-12 flex flex-col items-center gap-3 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
      <InboxIcon className="w-6 h-6 text-muted-foreground/40" />
    </div>
    <div>
      <p className="text-sm font-bold text-foreground">No events yet</p>
      <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
    </div>
  </div>
);

// ── Main ────────────────────────────────────────────────────────────────────
const History = () => {
  // Events are empty by default — will be populated by real sensor data.
  // TODO: connect to HistoryContext or receive events as prop from SensorProvider.
  const [events,     setEvents]     = useState<HistoryEvent[]>([]);
  const [filter,     setFilter]     = useState<EventType | "all">("all");
  const [showFilter, setShowFilter] = useState(false);

  const unresolved = useMemo(() => events.filter(e => !e.resolved).length, [events]);
  const today      = useMemo(() => byPeriod(events, 24),  [events]);
  const week       = useMemo(() => byPeriod(events, 168), [events]);
  const month      = useMemo(() => byPeriod(events, 720), [events]);

  const apply = (evs: HistoryEvent[]) => filter === "all" ? evs : evs.filter(e => e.type === filter);

  const onResolve = (id: string) => setEvents(p => p.map(e => e.id === id ? { ...e, resolved: true } : e));
  const onDelete  = (id: string) => setEvents(p => p.filter(e => e.id !== id));
  const onClear   = ()           => setEvents(p => p.filter(e => !e.resolved));

  const onExport = () => {
    if (events.length === 0) return;
    const csv = [
      "ID,Type,Timestamp,Details,Resolved",
      ...events.map(e => `${e.id},${e.type},"${e.timestamp.toISOString()}","${e.details}",${e.resolved}`),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "cradle-history.csv";
    a.click();
  };

  const EventList = ({ evts, period }: { evts: HistoryEvent[]; period: string }) => {
    const filtered = apply(evts);
    return filtered.length === 0
      ? <EmptyState message={
          events.length === 0
            ? "Connect your device to start logging events automatically."
            : `No ${filter === "all" ? "" : TCFG[filter].label + " "}events for ${period}.`
        } />
      : <div className="space-y-2.5">{filtered.map(e => <EventCard key={e.id} ev={e} onResolve={onResolve} onDelete={onDelete} />)}</div>;
  };

  return (
    <div className="min-h-screen page-bg pb-24">
      <PageHeader
        title="History"
        subtitle="Diaper events & health alerts"
        statusRow={
          <div className="grid grid-cols-3 gap-2">
            {[
              { v: today.length, l: "Today",     hi: false },
              { v: week.length,  l: "This Week", hi: false },
              { v: unresolved,   l: "Open",      hi: unresolved > 0 },
            ].map(({ v, l, hi }) => (
              <div key={l} className={`rounded-xl py-2 text-center border ${hi ? "alert-soiled border" : "bg-card/70 border-border/50"}`}>
                <p className={`text-xl font-extrabold ${hi ? "" : "text-foreground"}`}>{v}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        }
        actions={
          <>
            <button onClick={onExport} disabled={events.length === 0}
              className="w-9 h-9 rounded-xl bg-card/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => setShowFilter(p => !p)}
              className={`w-9 h-9 rounded-xl border border-border/50 flex items-center justify-center transition-colors ${showFilter ? "bg-primary/10 text-primary border-primary/30" : "bg-card/80 text-muted-foreground hover:text-foreground"}`}>
              <Filter className="w-4 h-4" />
            </button>
          </>
        }
      />

      <div className="px-5 mt-4 space-y-3">
        {unresolved > 0 && (
          <div className="alert-soiled border rounded-2xl flex items-center justify-between px-4 py-2.5 fade-up">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-bold">{unresolved} unresolved event{unresolved > 1 ? "s" : ""}</span>
            </div>
            <button onClick={onClear} className="text-[10px] font-bold underline opacity-70 hover:opacity-100">
              Clear resolved
            </button>
          </div>
        )}

        {showFilter && (
          <div className="flex gap-2 flex-wrap fade-up">
            {(["all", "wet", "soiled", "both", "temperature"] as const).map(t => (
              <button key={t} onClick={() => setFilter(t)}
                className={["text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all",
                  filter === t ? "bg-primary text-white border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"].join(" ")}>
                {t === "all" ? "All Types" : TCFG[t].label}
              </button>
            ))}
          </div>
        )}

        {events.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              {events.length} total event{events.length !== 1 ? "s" : ""} recorded
            </span>
          </div>
        )}

        <Tabs defaultValue="today" className="fade-up-2">
          <TabsList className="w-full grid grid-cols-3 rounded-xl h-10">
            <TabsTrigger value="today" className="rounded-lg text-xs font-bold">Today</TabsTrigger>
            <TabsTrigger value="week"  className="rounded-lg text-xs font-bold">Week</TabsTrigger>
            <TabsTrigger value="month" className="rounded-lg text-xs font-bold">Month</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="mt-3"><EventList evts={today} period="today"     /></TabsContent>
          <TabsContent value="week"  className="mt-3"><EventList evts={week}  period="this week"  /></TabsContent>
          <TabsContent value="month" className="mt-3"><EventList evts={month} period="this month" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default History;

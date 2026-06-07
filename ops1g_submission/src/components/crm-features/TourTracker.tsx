/**
 * FEATURE: Tour Tracker Dashboard Card
 * Shows today's tours, upcoming tours, and tour status stats.
 */
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { format, isToday } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMountedNow } from "@/hooks/use-now";

/* ---- Status chip ---- */
function TourStatusChip({ status }: { status: string }) {
  const config: Record<string, { cls: string; label: string }> = {
    scheduled:  { cls: "bg-accent/10 text-accent border-accent/20",                label: "Scheduled" },
    completed:  { cls: "bg-success/10 text-success border-success/20",             label: "Done" },
    "no-show":  { cls: "bg-destructive/10 text-destructive border-destructive/20", label: "No-show" },
    cancelled:  { cls: "bg-muted text-muted-foreground border-border",             label: "Cancelled" },
  };
  const c = config[status] ?? config.scheduled;
  return (
    <span className={cn("inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium", c.cls)}>
      {c.label}
    </span>
  );
}

/* ---- Dashboard card ---- */
export function TourTrackerCard() {
  const { tours, leads, properties, selectLead } = useApp();
  const [now, mounted] = useMountedNow();

  const todayTours = useMemo(
    () =>
      tours.filter((t) => {
        try { return isToday(new Date(t.scheduledAt)); } catch { return false; }
      }),
    [tours],
  );

  const stats = useMemo(
    () => ({
      scheduled:  tours.filter((t) => t.status === "scheduled").length,
      completed:  tours.filter((t) => t.status === "completed").length,
      noShow:     tours.filter((t) => t.status === "no-show").length,
      cancelled:  tours.filter((t) => t.status === "cancelled").length,
    }),
    [tours],
  );

  const upcoming = useMemo(
    () =>
      tours
        .filter((t) => t.status === "scheduled" && new Date(t.scheduledAt) > new Date())
        .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
        .slice(0, 5),
    [tours],
  );

  if (!mounted) return null;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-semibold">Tour Tracker</h2>
          {todayTours.length > 0 && (
            <span className="rounded-full bg-accent text-accent-foreground px-1.5 py-0.5 text-[10px] font-mono">
              {todayTours.length} today
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{tours.length} total</span>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
        {[
          { label: "Scheduled", value: stats.scheduled,  color: "text-accent" },
          { label: "Completed", value: stats.completed,  color: "text-success" },
          { label: "No-show",   value: stats.noShow,     color: "text-destructive" },
          { label: "Cancelled", value: stats.cancelled,  color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="p-3 text-center">
            <div className={cn("font-display text-xl font-bold", s.color)}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Today's Tours */}
      {todayTours.length > 0 && (
        <div className="border-b border-border">
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/30">
            Today's Tours
          </div>
          <div className="divide-y divide-border">
            {todayTours.map((t) => {
              const lead = leads.find((l) => l.id === t.leadId);
              const prop = properties.find((p) => p.id === t.propertyId);
              if (!lead) return null;
              const minsTo = (+new Date(t.scheduledAt) - now) / 60_000;
              return (
                <button
                  key={t.id}
                  onClick={() => selectLead(lead.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-accent/5 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{lead.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {prop?.name ?? "Property TBD"} · {format(new Date(t.scheduledAt), "h:mm a")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <TourStatusChip status={t.status} />
                    <span className={cn(
                      "text-[10px] font-mono",
                      minsTo > 0 && minsTo < 60 ? "text-accent font-semibold" : "text-muted-foreground",
                    )}>
                      {minsTo > 0 ? `in ${Math.round(minsTo)}m` : `${Math.round(-minsTo)}m ago`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Tours (non-today) */}
      {upcoming.filter((t) => { try { return !isToday(new Date(t.scheduledAt)); } catch { return false; } }).length > 0 && (
        <div>
          <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/30">
            Upcoming
          </div>
          <div className="divide-y divide-border">
            {upcoming
              .filter((t) => { try { return !isToday(new Date(t.scheduledAt)); } catch { return false; } })
              .slice(0, 3)
              .map((t) => {
                const lead = leads.find((l) => l.id === t.leadId);
                const prop = properties.find((p) => p.id === t.propertyId);
                if (!lead) return null;
                return (
                  <button
                    key={t.id}
                    onClick={() => selectLead(lead.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-accent/5 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{lead.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {prop?.name ?? "—"} · {format(new Date(t.scheduledAt), "MMM d, h:mm a")}
                      </div>
                    </div>
                    <TourStatusChip status={t.status} />
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {todayTours.length === 0 && upcoming.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          No tours scheduled. Use the Lead control panel → Tour tab to schedule.
        </div>
      )}
    </section>
  );
}

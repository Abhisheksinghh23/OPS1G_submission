/**
 * CRM Dashboard Cards — all 10 features bundled into clean dashboard sections.
 * Import and drop into dashboard.tsx to add all new CRM features at once.
 *
 * Features:
 *  1. Lead scoring summary
 *  2. Today's follow-ups (Follow-up Needed)
 *  5. Revenue Forecast card
 *  6. Lost reason analytics
 *  7. Pipeline stage counts
 *  10. TCM Performance summary
 */
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  getFollowUpNeededLeads,
  calculateRevenueForecast,
  getLostReasonStats,
  getPipelineStats,
  getTCMPerformance,
  calculateLeadScore,
  type FollowUpNeededLead,
} from "@/lib/crm-features";
import { useMountedNow } from "@/hooks/use-now";
import {
  IndianRupee, Target, TrendingUp, Users, CheckCircle2,
  BellRing, XCircle, BarChart2, ChevronRight, AlertTriangle,
  Flame, Thermometer, Snowflake, Trophy, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { WhatsAppGenerator } from "./WhatsAppGenerator";

/* ================================================================
   PIPELINE STAGE FUNNEL (Feature 7)
   ================================================================ */
export function PipelineStageCard() {
  const leads = useApp((s) => s.leads);
  const stats = useMemo(() => getPipelineStats(leads), [leads]);
  const total = leads.length || 1;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-semibold">Lead Pipeline</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{leads.length} total</span>
      </header>
      <div className="p-4 space-y-2.5">
        {stats.map((s) => (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="w-28 shrink-0">
              <span className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium",
                s.color,
              )}>
                {s.label}
              </span>
            </div>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${Math.round((s.count / total) * 100)}%` }}
              />
            </div>
            <span className="w-6 text-right text-xs font-mono font-medium text-foreground shrink-0">
              {s.count}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================
   REVENUE FORECAST (Feature 5)
   ================================================================ */
export function RevenueForecastCard() {
  const leads = useApp((s) => s.leads);
  const tours = useApp((s) => s.tours);
  const [now, mounted] = useMountedNow();

  const forecast = useMemo(
    () => (mounted ? calculateRevenueForecast(leads, tours, now) : null),
    [leads, tours, now, mounted],
  );

  if (!forecast) return null;

  const fmt = (n: number) => `₹${(n / 1000).toFixed(0)}k`;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-success" />
          <h2 className="font-display text-sm font-semibold">Revenue Forecast</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          {Math.round(forecast.conversionRate * 100)}% conv rate assumed
        </span>
      </header>
      <div className="p-4 space-y-4">
        {/* Main metric */}
        <div className="text-center">
          <div className="font-display text-3xl font-bold text-success">
            {fmt(forecast.forecastedMonthlyRevenue)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Estimated monthly revenue</div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <ForecastStat
            icon={<Flame className="h-3.5 w-3.5 text-red-500" />}
            label="Hot leads"
            value={String(forecast.hotLeadCount)}
          />
          <ForecastStat
            icon={<Thermometer className="h-3.5 w-3.5 text-orange-500" />}
            label="Warm leads"
            value={String(forecast.warmLeadCount)}
          />
          <ForecastStat
            icon={<Snowflake className="h-3.5 w-3.5 text-blue-500" />}
            label="Cold leads"
            value={String(forecast.coldLeadCount)}
          />
        </div>

        <div className="rounded-lg bg-success/5 border border-success/20 p-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Estimated conversions</span>
            <span className="font-semibold text-success">{forecast.estimatedConversions} bookings</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Avg rent used</span>
            <span className="font-mono">{fmt(forecast.avgRent)}/mo</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Pipeline value</span>
            <span className="font-mono text-accent">{fmt(forecast.pipelineValue)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ForecastStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-center space-y-1">
      <div className="flex justify-center">{icon}</div>
      <div className="font-display font-bold text-lg">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ================================================================
   FOLLOW-UP NEEDED (Feature 2)
   ================================================================ */
export function FollowUpNeededCard() {
  const { leads, tours, followUps, role, currentTcmId, selectLead } = useApp();
  const [now, mounted] = useMountedNow();
  const [showAll, setShowAll] = useState(false);

  const tcmFilter = role === "tcm" ? currentTcmId : undefined;

  const neededList = useMemo(
    () => (mounted ? getFollowUpNeededLeads(leads, tours, followUps, now, tcmFilter) : []),
    [leads, tours, followUps, now, tcmFilter, mounted],
  );

  const displayed = showAll ? neededList : neededList.slice(0, 5);

  if (!mounted) return null;

  const urgencyConfig = {
    critical: { cls: "border-destructive/30 bg-destructive/5", dotCls: "bg-destructive", badge: "Critical" },
    high: { cls: "border-warning/30 bg-warning/5", dotCls: "bg-warning", badge: "High" },
    medium: { cls: "border-border bg-card", dotCls: "bg-muted-foreground", badge: "Medium" },
  };

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-warning" />
          <h2 className="font-display text-sm font-semibold">Follow-up Needed</h2>
          {neededList.length > 0 && (
            <span className="rounded-full bg-destructive text-destructive-foreground px-1.5 py-0.5 text-[10px] font-mono">
              {neededList.length}
            </span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">today's priority</span>
      </header>

      {neededList.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
          <div className="text-sm font-medium text-foreground">All caught up!</div>
          <div className="text-xs text-muted-foreground mt-1">No follow-ups pending right now.</div>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {displayed.map((item) => {
            const lead = leads.find((l) => l.id === item.leadId);
            if (!lead) return null;
            const cfg = urgencyConfig[item.urgency];
            return (
              <div key={item.leadId} className={cn("px-4 py-3 flex items-start gap-3", cfg.cls)}>
                <span className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", cfg.dotCls)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{lead.name}</span>
                    <Badge variant="outline" className="text-[9px]">{cfg.badge}</Badge>
                    <span className="text-[10px] capitalize text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      {lead.stage.replace("-", " ")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                  {item.staleHrs && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {Math.round(item.staleHrs)}h since last update
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <WhatsAppGenerator lead={lead} variant="icon" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => selectLead(lead.id)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {!showAll && neededList.length > 5 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-center"
            >
              Show {neededList.length - 5} more
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ================================================================
   LOST REASON ANALYTICS (Feature 6)
   ================================================================ */
export function LostReasonAnalyticsCard() {
  const leads = useApp((s) => s.leads);
  const stats = useMemo(() => getLostReasonStats(leads), [leads]);
  const droppedCount = leads.filter((l) => l.stage === "dropped").length;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-destructive" />
          <h2 className="font-display text-sm font-semibold">Lost Lead Analysis</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{droppedCount} lost total</span>
      </header>
      <div className="p-4">
        {stats.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            No lost leads yet. Analytics appear here when leads are dropped.
          </div>
        ) : (
          <div className="space-y-2.5">
            {stats.map((s) => (
              <div key={s.reason} className="flex items-center gap-3">
                <div className="w-32 shrink-0 text-xs text-foreground">{s.label}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-destructive/70 transition-all duration-500"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <div className="w-10 text-right text-xs font-mono text-muted-foreground shrink-0">
                  {s.count} ({s.pct}%)
                </div>
              </div>
            ))}
          </div>
        )}
        {droppedCount === 0 && (
          <div className="mt-3 rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
            Mark leads as lost (with reason) to see analytics here
          </div>
        )}
      </div>
    </section>
  );
}

/* ================================================================
   TCM PERFORMANCE SUMMARY (Feature 10)
   ================================================================ */
export function TCMPerformanceCard() {
  const { tcms, leads, tours, followUps } = useApp();
  const [now, mounted] = useMountedNow();

  const performance = useMemo(
    () => (mounted ? getTCMPerformance(tcms, leads, tours, followUps, now) : []),
    [tcms, leads, tours, followUps, now, mounted],
  );

  if (!mounted) return null;

  const streakConfig = {
    "hot": { cls: "text-success bg-success/10 border-success/30", icon: "🔥" },
    "normal": { cls: "text-muted-foreground bg-muted border-border", icon: "⚡" },
    "needs-attention": { cls: "text-destructive bg-destructive/10 border-destructive/30", icon: "⚠️" },
  };

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-semibold">TCM Performance</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{tcms.length} team members</span>
      </header>

      <div className="divide-y divide-border">
        {performance.map((p) => {
          const streak = streakConfig[p.streak];
          return (
            <div key={p.tcmId} className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
              {/* Name + zone */}
              <div className="col-span-4 min-w-0">
                <div className="font-medium text-sm truncate">{p.tcmName}</div>
                <div className="text-[11px] text-muted-foreground">{p.zone}</div>
              </div>

              {/* Stats */}
              <div className="col-span-6 grid grid-cols-3 gap-1.5">
                <MiniStat label="Leads" value={p.assignedLeads} />
                <MiniStat label="Tours" value={p.toursCompleted} />
                <MiniStat label="Booked" value={p.convertedLeads} highlight={p.convertedLeads > 0} />
              </div>

              {/* Streak + conv rate */}
              <div className="col-span-2 text-right space-y-1">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-medium",
                    streak.cls,
                  )}
                >
                  {streak.icon} {p.conversionPct}%
                </span>
                {p.overdueFollowUps > 0 && (
                  <div className="text-[10px] text-destructive flex items-center justify-end gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {p.overdueFollowUps} overdue
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border flex gap-3 text-[10px] text-muted-foreground">
        <span>🔥 Hot streak (conv ≥35%, 0 overdue)</span>
        <span>⚠️ Needs attention</span>
      </div>
    </section>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
      <div className={cn("text-sm font-bold", highlight && value > 0 ? "text-success" : "text-foreground")}>
        {value}
      </div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

/* ================================================================
   LEAD SCORE BREAKDOWN — compact summary card
   ================================================================ */
export function LeadScoreSummaryCard() {
  const leads = useApp((s) => s.leads);
  const tours = useApp((s) => s.tours);
  const [now, mounted] = useMountedNow();

  const { hotCount, warmCount, coldCount } = useMemo(() => {
    if (!mounted) return { hotCount: 0, warmCount: 0, coldCount: 0 };
    const active = leads.filter((l) => l.stage !== "booked" && l.stage !== "dropped");
    let h = 0, w = 0, c = 0;
    for (const l of active) {
      const { temperature } = calculateLeadScore(l, tours, now);
      if (temperature === "hot") h++;
      else if (temperature === "warm") w++;
      else c++;
    }
    return { hotCount: h, warmCount: w, coldCount: c };
  }, [leads, tours, now, mounted]);

  const total = hotCount + warmCount + coldCount || 1;

  if (!mounted) return null;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          <h2 className="font-display text-sm font-semibold">Lead Score Breakdown</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">live scoring</span>
      </header>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <ScoreBucket
            label="Hot"
            icon={<Flame className="h-4 w-4 text-red-500" />}
            count={hotCount}
            pct={Math.round((hotCount / total) * 100)}
            barColor="bg-red-400"
            textColor="text-red-700 dark:text-red-400"
            hint="Score ≥ 75"
          />
          <ScoreBucket
            label="Warm"
            icon={<Thermometer className="h-4 w-4 text-orange-500" />}
            count={warmCount}
            pct={Math.round((warmCount / total) * 100)}
            barColor="bg-orange-400"
            textColor="text-orange-700 dark:text-orange-400"
            hint="Score 45–74"
          />
          <ScoreBucket
            label="Cold"
            icon={<Snowflake className="h-4 w-4 text-blue-500" />}
            count={coldCount}
            pct={Math.round((coldCount / total) * 100)}
            barColor="bg-blue-300"
            textColor="text-blue-700 dark:text-blue-400"
            hint="Score < 45"
          />
        </div>
        {/* Combined bar */}
        <div className="h-2.5 rounded-full bg-muted overflow-hidden flex gap-0.5">
          <div className="h-full bg-red-400 transition-all" style={{ width: `${Math.round((hotCount / total) * 100)}%` }} />
          <div className="h-full bg-orange-400 transition-all" style={{ width: `${Math.round((warmCount / total) * 100)}%` }} />
          <div className="h-full bg-blue-300 transition-all" style={{ width: `${Math.round((coldCount / total) * 100)}%` }} />
        </div>
      </div>
    </section>
  );
}

function ScoreBucket({
  label, icon, count, pct, barColor, textColor, hint,
}: {
  label: string; icon: React.ReactNode; count: number; pct: number;
  barColor: string; textColor: string; hint: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className={cn("font-display text-2xl font-bold", textColor)}>{count}</div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[9px] text-muted-foreground">{hint}</div>
    </div>
  );
}

// ---- Re-export new feature cards so dashboard.tsx can import from one place ----
export { TourTrackerCard } from "./TourTracker";
export { TokenTrackerDashboardCard } from "./TokenTracker";

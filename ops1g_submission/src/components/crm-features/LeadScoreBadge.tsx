/**
 * FEATURE 1: Lead Score Badge
 * Shows the 0-100 score and Hot/Warm/Cold temperature label on a lead card.
 */
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { calculateLeadScore, type LeadTemperature } from "@/lib/crm-features";
import { useMountedNow } from "@/hooks/use-now";
import type { Lead, Tour } from "@/lib/types";
import { Flame, Thermometer, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  lead: Lead;
  tours?: Tour[];
  compact?: boolean;
}

const TEMP_CONFIG: Record<LeadTemperature, { label: string; icon: typeof Flame; cls: string }> = {
  hot: {
    label: "Hot",
    icon: Flame,
    cls: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  },
  warm: {
    label: "Warm",
    icon: Thermometer,
    cls: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  },
  cold: {
    label: "Cold",
    icon: Snowflake,
    cls: "bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

export function LeadScoreBadge({ lead, tours: propTours, compact = false }: Props) {
  const storeTours = useApp((s) => s.tours);
  const tours = propTours ?? storeTours;
  const [now, mounted] = useMountedNow();

  const result = useMemo(
    () => (mounted ? calculateLeadScore(lead, tours, now) : null),
    [lead, tours, now, mounted],
  );

  if (!result) return null;

  const { icon: Icon, label, cls } = TEMP_CONFIG[result.temperature];

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
          cls,
        )}
        title={result.reasons.join(" · ")}
      >
        <Icon className="h-2.5 w-2.5" />
        {result.score}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
          cls,
        )}
        title={result.reasons.join(" · ")}
      >
        <Icon className="h-3 w-3" />
        {label} Lead · {result.score}
      </span>
    </div>
  );
}

/** Tooltip with score breakdown */
export function LeadScoreTooltip({ lead, tours: propTours }: { lead: Lead; tours?: Tour[] }) {
  const storeTours = useApp((s) => s.tours);
  const tours = propTours ?? storeTours;
  const [now, mounted] = useMountedNow();

  const result = useMemo(
    () => (mounted ? calculateLeadScore(lead, tours, now) : null),
    [lead, tours, now, mounted],
  );

  if (!result) return null;

  return (
    <div className="space-y-1">
      <div className="font-semibold text-xs">Score: {result.score}/100</div>
      <ul className="space-y-0.5">
        {result.reasons.map((r, i) => (
          <li key={i} className="text-[11px] text-muted-foreground">• {r}</li>
        ))}
      </ul>
    </div>
  );
}

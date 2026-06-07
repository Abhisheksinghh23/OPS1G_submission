/**
 * FEATURE: Smart Property Recommendation Engine
 * Shows top matching properties for a lead based on budget + area + availability.
 */
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { getRecommendedProperties } from "@/lib/crm-features";
import type { Lead } from "@/lib/types";
import {
  Building2, CheckCircle2, BedDouble, IndianRupee, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Props {
  lead: Lead;
}

export function PropertyRecommendation({ lead }: Props) {
  const properties = useApp((s) => s.properties);

  const recs = useMemo(
    () => getRecommendedProperties(lead, properties),
    [lead, properties],
  );

  if (recs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
        No matching properties with available beds found for this lead's area and budget.
      </div>
    );
  }

  const scoreColor = (score: number) => {
    if (score >= 70) return "text-success border-success/30 bg-success/10";
    if (score >= 45) return "text-warning-foreground border-warning/30 bg-warning/10";
    return "text-muted-foreground border-border bg-muted";
  };

  return (
    <div className="space-y-2.5">
      {recs.map((rec, i) => (
        <div
          key={rec.propertyId}
          className={cn(
            "rounded-lg border p-3 space-y-2",
            i === 0 ? "border-accent/30 bg-accent/5" : "border-border bg-card",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <Building2 className={cn("h-4 w-4 mt-0.5 shrink-0", i === 0 ? "text-accent" : "text-muted-foreground")} />
              <div className="min-w-0">
                <div className="font-medium text-sm leading-tight truncate">{rec.propertyName}</div>
                {i === 0 && (
                  <Badge className="mt-0.5 text-[9px] bg-accent text-accent-foreground px-1.5">
                    ★ Best Match
                  </Badge>
                )}
              </div>
            </div>
            <span className={cn(
              "shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-mono font-semibold",
              scoreColor(rec.matchScore),
            )}>
              {rec.matchScore}%
            </span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <IndianRupee className="h-2.5 w-2.5 shrink-0" />
              <span>₹{rec.monthlyRent.toLocaleString("en-IN")}/mo</span>
            </div>
            <div className="flex items-center gap-1">
              <BedDouble className="h-2.5 w-2.5 shrink-0" />
              <span>{rec.availableBeds} free</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{rec.location}</span>
            </div>
          </div>

          {/* Reasons */}
          <div className="space-y-0.5">
            {rec.reasons.slice(0, 2).map((r, ri) => (
              <div key={ri} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                {r}
              </div>
            ))}
            <div className="text-[10px] text-muted-foreground italic mt-0.5">{rec.distanceNote}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

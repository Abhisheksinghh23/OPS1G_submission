/**
 * FEATURE 9: Priority Tags
 * Displays smart contextual tags on a lead card.
 */
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { getPriorityTags } from "@/lib/crm-features";
import { useMountedNow } from "@/hooks/use-now";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  lead: Lead;
}

export function PriorityTagStrip({ lead }: Props) {
  const tours = useApp((s) => s.tours);
  const followUps = useApp((s) => s.followUps);
  const [now, mounted] = useMountedNow();

  const tags = useMemo(
    () => (mounted ? getPriorityTags(lead, tours, followUps, now) : []),
    [lead, tours, followUps, now, mounted],
  );

  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {tags.map((tag) => (
        <span
          key={tag.label}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
            tag.color,
          )}
        >
          <span>{tag.icon}</span>
          {tag.label}
        </span>
      ))}
    </div>
  );
}

/**
 * FEATURE 6: Lost Lead Reason — modal shown when marking a lead as dropped.
 */
import { useState } from "react";
import { useApp } from "@/lib/store";
import { LOST_REASONS } from "@/lib/crm-features";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { XCircle } from "lucide-react";

interface Props {
  leadId: string;
  leadName: string;
  open: boolean;
  onClose: () => void;
}

export function LostReasonModal({ leadId, leadName, open, onClose }: Props) {
  const markLeadLost = useApp((s) => s.markLeadLost);
  const [selected, setSelected] = useState<string>("");

  const handleConfirm = () => {
    if (!selected) {
      toast.error("Please select a reason");
      return;
    }
    markLeadLost(leadId, selected);
    toast.success(`Lead marked lost · ${LOST_REASONS.find((r) => r.value === selected)?.label ?? selected}`);
    setSelected("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            Mark Lead as Lost
          </DialogTitle>
          <DialogDescription>
            Why is <strong>{leadName}</strong> being marked as lost? This helps improve our operations.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {LOST_REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setSelected(r.value)}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-all",
                selected === r.value
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-card text-foreground hover:border-destructive/40 hover:bg-destructive/5",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!selected}
            onClick={handleConfirm}
          >
            Mark as Lost
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * FEATURE 3: WhatsApp Message Generator
 * Button + modal that generates context-aware WA messages for a lead.
 */
import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import { generateWhatsAppMessage, type WaMessageStage } from "@/lib/crm-features";
import type { Lead } from "@/lib/types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Copy, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  lead: Lead;
  variant?: "button" | "icon";
  className?: string;
}

export function WhatsAppGenerator({ lead, variant = "button", className }: Props) {
  const [open, setOpen] = useState(false);

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex items-center justify-center h-7 w-7 rounded-md border border-border bg-card hover:bg-muted transition-colors",
            className,
          )}
          title="Generate WhatsApp message"
        >
          <MessageSquare className="h-3.5 w-3.5 text-green-600" />
        </button>
        <WhatsAppModal lead={lead} open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn("h-8 gap-1.5 text-green-700 border-green-200 hover:bg-green-50", className)}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        WA Message
      </Button>
      <WhatsAppModal lead={lead} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function WhatsAppModal({ lead, open, onClose }: { lead: Lead; open: boolean; onClose: () => void }) {
  const { tours, properties, tcms } = useApp();
  const [selectedStage, setSelectedStage] = useState<WaMessageStage | undefined>(undefined);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  const leadTour = tours.find((t) => t.leadId === lead.id && t.status === "scheduled");
  const leadProp = leadTour ? properties.find((p) => p.id === leadTour.propertyId) : undefined;
  const tcm = tcms.find((t) => t.id === lead.assignedTcmId);

  const messages = useMemo(
    () =>
      generateWhatsAppMessage(lead, selectedStage, {
        tourDate: leadTour ? new Date(leadTour.scheduledAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }) : undefined,
        tourTime: leadTour ? new Date(leadTour.scheduledAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : undefined,
        propertyName: leadProp?.name,
        tcmName: tcm?.name,
      }),
    [lead, selectedStage, leadTour, leadProp, tcm],
  );

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const stages: { value: WaMessageStage; label: string }[] = [
    { value: "new-lead", label: "New lead" },
    { value: "tour-scheduled", label: "Tour scheduled" },
    { value: "tour-completed", label: "Tour completed" },
    { value: "follow-up", label: "Follow-up" },
    { value: "token-reminder", label: "Token reminder" },
    { value: "lost-revival", label: "Re-engage" },
    { value: "booking-confirmed", label: "Booking confirmed" },
  ];

  const displayed = showAll ? messages : messages.slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-600" />
            WhatsApp Message — {lead.name}
          </DialogTitle>
          <DialogDescription>
            Generate ready-to-copy messages based on lead status. Auto-picks the best template.
          </DialogDescription>
        </DialogHeader>

        {/* Stage picker */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedStage(undefined)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
              !selectedStage ? "bg-accent text-accent-foreground border-accent" : "bg-muted text-muted-foreground border-border",
            )}
          >
            Auto
          </button>
          {stages.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedStage(s.value)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                selectedStage === s.value
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-muted text-muted-foreground border-border hover:border-accent/50",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
          {displayed.map((msg, i) => (
            <div key={i} className={cn(
              "rounded-lg border p-3 space-y-2",
              i === 0 ? "border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800" : "border-border bg-card",
            )}>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[10px]">{msg.label}</Badge>
                {i === 0 && <Badge className="text-[10px] bg-green-600">Best match</Badge>}
              </div>
              <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-wrap">{msg.body}</p>
              <Button
                size="sm"
                variant={i === 0 ? "default" : "outline"}
                className="h-7 text-xs gap-1.5"
                onClick={() => handleCopy(msg.body, i)}
              >
                {copiedIdx === i ? (
                  <><Check className="h-3 w-3" /> Copied!</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy</>
                )}
              </Button>
            </div>
          ))}
          {!showAll && messages.length > 2 && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-1"
            >
              <ChevronDown className="h-3 w-3" /> Show {messages.length - 2} more templates
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

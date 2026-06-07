/**
 * FEATURE: Payment / Token Booking Tracker
 * Per-lead token panel + dashboard summary card.
 */
import { useState, useMemo } from "react";
import { useApp } from "@/lib/store";
import type { Lead } from "@/lib/types";
import {
  IndianRupee, CheckCircle2, Clock, XCircle,
  CreditCard, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useMountedNow } from "@/hooks/use-now";

/* ============================================================
   Types
   ============================================================ */
export type PaymentStatus  = "pending" | "paid" | "failed" | "refunded";
export type BookingStatus  = "not-started" | "room-blocked" | "confirmed" | "cancelled";

export interface TokenBookingData {
  tokenAmount:     number;
  paymentStatus:   PaymentStatus;
  paymentDate:     string | null;
  bookingStatus:   BookingStatus;
  roomBlockedUntil: string | null;
  paymentMode:     string;
  notes:           string;
}

/* Module-level in-memory store (survives React re-renders, resets on page reload) */
const _tokenStore = new Map<string, TokenBookingData>();

function _defaultToken(): TokenBookingData {
  return {
    tokenAmount: 0,
    paymentStatus: "pending",
    paymentDate: null,
    bookingStatus: "not-started",
    roomBlockedUntil: null,
    paymentMode: "upi",
    notes: "",
  };
}

export function getTokenData(leadId: string): TokenBookingData {
  return _tokenStore.get(leadId) ?? _defaultToken();
}

export function saveTokenData(leadId: string, data: Partial<TokenBookingData>): void {
  _tokenStore.set(leadId, { ..._defaultToken(), ..._tokenStore.get(leadId), ...data });
}

/* ============================================================
   Lead-level TokenBookingPanel (inside LeadControlPanel)
   ============================================================ */
export function TokenBookingPanel({ lead }: { lead: Lead }) {
  const { addNote, addLeadTag, removeLeadTag, setLeadStage } = useApp();
  const [data, setData]     = useState<TokenBookingData>(() => getTokenData(lead.id));
  const [editing, setEditing] = useState(false);

  const save = (next: TokenBookingData) => {
    saveTokenData(lead.id, next);

    if (next.paymentStatus === "paid" && data.paymentStatus !== "paid") {
      addNote(lead.id,
        `Token payment marked as Paid — ₹${next.tokenAmount.toLocaleString("en-IN")} via ${next.paymentMode}`,
      );
      addLeadTag(lead.id, "token-paid");
      removeLeadTag(lead.id, "token-pending");
      if (lead.stage !== "booked") setLeadStage(lead.id, "negotiation");
      toast.success("Token payment recorded!");
    } else if (next.paymentStatus === "pending" && data.paymentStatus !== "pending") {
      addLeadTag(lead.id, "token-pending");
      removeLeadTag(lead.id, "token-paid");
    }

    if (next.bookingStatus === "confirmed" && data.bookingStatus !== "confirmed") {
      addNote(lead.id, "Booking confirmed — room secured");
      toast.success("Booking confirmed!");
    } else if (next.bookingStatus === "room-blocked" && data.bookingStatus !== "room-blocked") {
      addNote(lead.id, `Room blocked until ${next.roomBlockedUntil ?? "—"}`);
      toast.success("Room blocked!");
    }

    setData(next);
    setEditing(false);
  };

  const psConfig: Record<PaymentStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:  { label: "Pending",  cls: "text-warning-foreground bg-warning/10 border-warning/30",       icon: <Clock className="h-3 w-3" /> },
    paid:     { label: "Paid ✓",   cls: "text-success bg-success/10 border-success/30",                  icon: <CheckCircle2 className="h-3 w-3" /> },
    failed:   { label: "Failed",   cls: "text-destructive bg-destructive/10 border-destructive/30",       icon: <XCircle className="h-3 w-3" /> },
    refunded: { label: "Refunded", cls: "text-muted-foreground bg-muted border-border",                   icon: <IndianRupee className="h-3 w-3" /> },
  };
  const bsConfig: Record<BookingStatus, { label: string; cls: string }> = {
    "not-started":  { label: "Not Started",      cls: "text-muted-foreground bg-muted border-border" },
    "room-blocked": { label: "Room Blocked 🔒",  cls: "text-warning-foreground bg-warning/10 border-warning/30" },
    confirmed:      { label: "Confirmed ✓",      cls: "text-success bg-success/10 border-success/30" },
    cancelled:      { label: "Cancelled",         cls: "text-destructive bg-destructive/10 border-destructive/30" },
  };

  const ps = psConfig[data.paymentStatus];
  const bs = bsConfig[data.bookingStatus];

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium", ps.cls)}>
            {ps.icon} Payment: {ps.label}
          </span>
          <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium", bs.cls)}>
            <Lock className="h-3 w-3" /> Booking: {bs.label}
          </span>
        </div>

        {data.tokenAmount > 0 && (
          <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Token amount</span>
              <span className="font-mono font-semibold">₹{data.tokenAmount.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment mode</span>
              <span className="capitalize">{data.paymentMode}</span>
            </div>
            {data.paymentDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment date</span>
                <span>{data.paymentDate}</span>
              </div>
            )}
            {data.roomBlockedUntil && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room blocked until</span>
                <span>{data.roomBlockedUntil}</span>
              </div>
            )}
            {data.notes && <p className="text-muted-foreground italic pt-1">{data.notes}</p>}
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 gap-1.5"
          onClick={() => setEditing(true)}
        >
          <CreditCard className="h-3.5 w-3.5" />
          {data.tokenAmount > 0 ? "Update Token Booking" : "Record Token Booking"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="font-semibold text-sm flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-accent" />
        Token Booking Details
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Token Amount (₹)</Label>
          <Input
            type="number"
            value={data.tokenAmount || ""}
            onChange={(e) => setData((d) => ({ ...d, tokenAmount: Number(e.target.value) }))}
            className="h-8 text-sm"
            placeholder="e.g. 5000"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment Mode</Label>
          <Select
            value={data.paymentMode}
            onValueChange={(v) => setData((d) => ({ ...d, paymentMode: v }))}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["upi", "cash", "bank-transfer", "card", "cheque"].map((m) => (
                <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment Status</Label>
          <Select
            value={data.paymentStatus}
            onValueChange={(v) => setData((d) => ({ ...d, paymentStatus: v as PaymentStatus }))}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["pending", "paid", "failed", "refunded"] as PaymentStatus[]).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Booking Status</Label>
          <Select
            value={data.bookingStatus}
            onValueChange={(v) => setData((d) => ({ ...d, bookingStatus: v as BookingStatus }))}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["not-started", "room-blocked", "confirmed", "cancelled"] as BookingStatus[]).map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace("-", " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Payment Date</Label>
          <Input
            type="date"
            value={data.paymentDate ?? ""}
            onChange={(e) => setData((d) => ({ ...d, paymentDate: e.target.value || null }))}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Room Blocked Until</Label>
          <Input
            type="date"
            value={data.roomBlockedUntil ?? ""}
            onChange={(e) => setData((d) => ({ ...d, roomBlockedUntil: e.target.value || null }))}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</Label>
        <Input
          value={data.notes}
          onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
          placeholder="Any notes..."
          className="h-8 text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(false)}>
          Cancel
        </Button>
        <Button size="sm" className="flex-1" onClick={() => save(data)}>
          Save
        </Button>
      </div>
    </div>
  );
}

/* ============================================================
   Dashboard Card: Token Stats
   ============================================================ */
export function TokenTrackerDashboardCard() {
  const leads = useApp((s) => s.leads);
  const [, mounted] = useMountedNow();

  const stats = useMemo(() => {
    const tagPending = leads.filter((l) => (l.tags ?? []).includes("token-pending")).length;
    const tagPaid    = leads.filter((l) => (l.tags ?? []).includes("token-paid")).length;
    const inNeg      = leads.filter((l) => l.stage === "negotiation").length;

    // Sum from module-level store
    let storeCollection = 0;
    for (const [, d] of _tokenStore) {
      if (d.paymentStatus === "paid") storeCollection += d.tokenAmount;
    }

    return { pending: tagPending, paid: tagPaid, totalCollection: storeCollection, inNegotiation: inNeg };
  }, [leads]);

  if (!mounted) return null;

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-success" />
          <h2 className="font-display text-sm font-semibold">Token & Bookings</h2>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">payment tracker</span>
      </header>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
            <div className="flex items-center gap-1.5 text-warning-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Token Pending</span>
            </div>
            <div className="font-display text-2xl font-bold text-warning-foreground">{stats.pending}</div>
            <div className="text-[10px] text-muted-foreground">awaiting token payment</div>
          </div>
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <div className="flex items-center gap-1.5 text-success mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-wider">Token Paid</span>
            </div>
            <div className="font-display text-2xl font-bold text-success">{stats.paid}</div>
            <div className="text-[10px] text-muted-foreground">confirmed payments</div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Token collection received</span>
            <span className="font-mono font-semibold text-success">
              ₹{stats.totalCollection.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Leads in negotiation</span>
            <span className="font-mono">{stats.inNegotiation}</span>
          </div>
        </div>

        {stats.pending === 0 && stats.paid === 0 && (
          <p className="text-xs text-muted-foreground text-center italic">
            Open a lead → Token tab to record payments
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * CRM Feature Helpers — 10 new features for the Gharpayy Arena CRM.
 * Pure functions. No side effects. Safe to import anywhere.
 *
 * Features covered:
 *  1. Lead Scoring (calculateLeadScore / getLeadTemperature)
 *  2. Follow-up Reminders (getFollowUpNeededLeads)
 *  3. WhatsApp Message Generator (generateWhatsAppMessage)
 *  5. Revenue Forecasting (calculateRevenueForecast)
 *  6. Lost Lead Reason Analytics (getLostReasonStats)
 *  10. TCM Performance Summary (getTCMPerformance)
 */

import type { Lead, Tour, FollowUp, TCM, Booking } from "./types";

/* ================================================================
   FEATURE 1: LEAD SCORING
   ================================================================ */

export type LeadTemperature = "hot" | "warm" | "cold";

export interface LeadScoreResult {
  score: number;         // 0-100
  temperature: LeadTemperature;
  reasons: string[];     // human-readable explanation bullets
}

/**
 * Calculate a 0-100 lead score using business rules.
 * Designed to be backward-compatible — all fields are optional-safe.
 */
export function calculateLeadScore(
  lead: Lead,
  tours: Tour[],
  now = Date.now(),
): LeadScoreResult {
  let score = 40; // base
  const reasons: string[] = [];

  // Move-in urgency
  const daysToMoveIn = (+new Date(lead.moveInDate) - now) / (24 * 36e5);
  if (daysToMoveIn <= 0) {
    score -= 10;
    reasons.push("Move-in date passed");
  } else if (daysToMoveIn <= 7) {
    score += 20;
    reasons.push("Urgent move-in (≤7 days)");
  } else if (daysToMoveIn <= 14) {
    score += 10;
    reasons.push("Move-in within 2 weeks");
  } else if (daysToMoveIn >= 30) {
    score -= 8;
    reasons.push("Move-in is 30+ days away");
  }

  // Budget alignment (12k is typical Gharpayy average rent)
  const avgRent = 12000;
  if (lead.budget >= avgRent * 1.1) {
    score += 15;
    reasons.push("Budget above market rate");
  } else if (lead.budget >= avgRent * 0.85) {
    score += 8;
    reasons.push("Budget aligns with market");
  } else {
    score -= 10;
    reasons.push("Budget below average rent");
  }

  // Tour history
  const leadTours = tours.filter((t) => t.leadId === lead.id);
  const hasCompletedTour = leadTours.some((t) => t.status === "completed");
  const hasScheduledTour = leadTours.some((t) => t.status === "scheduled");
  if (hasCompletedTour) {
    score += 15;
    reasons.push("Tour completed");
  } else if (hasScheduledTour) {
    score += 8;
    reasons.push("Tour scheduled");
  }

  // Tags-based scoring
  const tags = lead.tags ?? [];
  if (tags.some((t) => t.includes("parent") || t.includes("family"))) {
    score += 5;
    reasons.push("Parent/family involved");
  }
  if (tags.some((t) => t.includes("urgent") || t.includes("ready"))) {
    score += 10;
    reasons.push("Urgency tag present");
  }
  if (tags.some((t) => t.includes("price") || t.includes("budget-low"))) {
    score -= 8;
    reasons.push("Price sensitivity flag");
  }

  // Stage-based adjustments
  const stageBonus: Record<string, number> = {
    "negotiation": 10,
    "tour-done": 8,
    "tour-scheduled": 5,
    "contacted": 0,
    "new": -5,
    "booked": 100,  // override
    "dropped": -100, // override
  };
  const stageAdj = stageBonus[lead.stage] ?? 0;
  if (lead.stage === "booked") return { score: 100, temperature: "hot", reasons: ["Lead booked"] };
  if (lead.stage === "dropped") return { score: 0, temperature: "cold", reasons: ["Lead dropped/lost"] };
  score += stageAdj;
  if (stageAdj !== 0) reasons.push(`Stage: ${lead.stage}`);

  // Response speed
  if ((lead.responseSpeedMins ?? 99) <= 5) {
    score += 5;
    reasons.push("Fast first response");
  }

  // Silence penalty
  const silentHrs = (now - +new Date(lead.updatedAt)) / 36e5;
  if (silentHrs > 48) {
    score -= 15;
    reasons.push(`${Math.round(silentHrs)}h silent`);
  } else if (silentHrs > 24) {
    score -= 8;
    reasons.push(`${Math.round(silentHrs)}h silent`);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: finalScore,
    temperature: getLeadTemperature(finalScore),
    reasons,
  };
}

export function getLeadTemperature(score: number): LeadTemperature {
  if (score >= 75) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

/* ================================================================
   FEATURE 2: FOLLOW-UP REMINDERS
   ================================================================ */

export type FollowUpReason =
  | "new-no-contact"
  | "tour-done-no-followup"
  | "payment-pending"
  | "stale-lead"
  | "overdue-followup";

export interface FollowUpNeededLead {
  leadId: string;
  reason: FollowUpReason;
  label: string;
  urgency: "critical" | "high" | "medium";
  staleHrs?: number;
}

/**
 * Returns all leads that need a follow-up action today.
 * Filters by TCM if tcmId is provided.
 */
export function getFollowUpNeededLeads(
  leads: Lead[],
  tours: Tour[],
  followUps: FollowUp[],
  now = Date.now(),
  tcmId?: string,
): FollowUpNeededLead[] {
  const result: FollowUpNeededLead[] = [];
  const filtered = tcmId ? leads.filter((l) => l.assignedTcmId === tcmId) : leads;

  for (const lead of filtered) {
    if (lead.stage === "booked" || lead.stage === "dropped") continue;

    const leadTours = tours.filter((t) => t.leadId === lead.id);
    const staleHrs = (now - +new Date(lead.updatedAt)) / 36e5;
    const overdueFollowUp = followUps.find(
      (f) => f.leadId === lead.id && !f.done && +new Date(f.dueAt) < now,
    );

    // Overdue follow-up
    if (overdueFollowUp) {
      result.push({
        leadId: lead.id,
        reason: "overdue-followup",
        label: `Follow-up overdue: ${overdueFollowUp.reason}`,
        urgency: "critical",
      });
      continue;
    }

    // New lead with no contact
    if (lead.stage === "new" && staleHrs > 1) {
      result.push({
        leadId: lead.id,
        reason: "new-no-contact",
        label: "New lead — no first contact yet",
        urgency: "critical",
        staleHrs,
      });
      continue;
    }

    // Tour completed but no follow-up logged
    const completedWithoutFollowUp = leadTours.some(
      (t) => t.status === "completed" && !t.postTour.filledAt,
    );
    if (completedWithoutFollowUp) {
      result.push({
        leadId: lead.id,
        reason: "tour-done-no-followup",
        label: "Tour done — post-tour follow-up missing",
        urgency: "high",
      });
      continue;
    }

    // Negotiation stage — payment/token pending
    if (lead.stage === "negotiation" && staleHrs > 12) {
      result.push({
        leadId: lead.id,
        reason: "payment-pending",
        label: "In negotiation — token/payment follow-up needed",
        urgency: "high",
        staleHrs,
      });
      continue;
    }

    // Lead not updated in 48h
    if (staleHrs > 48 && !lead.nextFollowUpAt) {
      result.push({
        leadId: lead.id,
        reason: "stale-lead",
        label: `No update in ${Math.round(staleHrs)}h`,
        urgency: "medium",
        staleHrs,
      });
    }
  }

  return result.sort((a, b) => {
    const u = { critical: 3, high: 2, medium: 1 };
    return u[b.urgency] - u[a.urgency];
  });
}

/* ================================================================
   FEATURE 3: WHATSAPP MESSAGE GENERATOR
   ================================================================ */

export type WaMessageStage =
  | "new-lead"
  | "tour-scheduled"
  | "tour-completed"
  | "follow-up"
  | "token-reminder"
  | "lost-revival"
  | "booking-confirmed";

export interface WaMessage {
  stage: WaMessageStage;
  label: string;
  body: string;
}

/**
 * Generate context-aware WhatsApp messages for a lead.
 * Returns the best-fit message plus alternatives.
 */
export function generateWhatsAppMessage(
  lead: Lead,
  stage?: WaMessageStage,
  extras?: {
    tourDate?: string;
    tourTime?: string;
    propertyName?: string;
    tcmName?: string;
  },
): WaMessage[] {
  const name = lead.name.split(" ")[0] ?? lead.name;
  const area = lead.preferredArea ?? "your preferred area";
  const budget = lead.budget ? `₹${Math.round(lead.budget / 1000)}k` : "";
  const prop = extras?.propertyName ?? "our Gharpayy property";
  const tourAt = extras?.tourDate && extras?.tourTime
    ? `${extras.tourDate} at ${extras.tourTime}`
    : extras?.tourDate ?? "the scheduled time";
  const tcm = extras?.tcmName ?? "our team";

  const templates: WaMessage[] = [
    {
      stage: "new-lead",
      label: "New lead welcome",
      body: `Hi ${name}! 👋 Thank you for your interest in Gharpayy. We received your PG requirement for ${area}${budget ? ` within ${budget}` : ""}. Our team will contact you shortly to schedule a property tour. – ${tcm}`,
    },
    {
      stage: "tour-scheduled",
      label: "Tour confirmation",
      body: `Hi ${name}! Your Gharpayy property tour is scheduled on *${tourAt}* at ${prop}. Please keep yourself available and feel free to call us if you need to reschedule. See you soon! 🏠`,
    },
    {
      stage: "tour-completed",
      label: "Post-tour check-in",
      body: `Hi ${name}! Hope you liked the property at ${prop}. 😊 Would you like to proceed with token booking? We can hold the room for you. Just reply here or call us directly.`,
    },
    {
      stage: "follow-up",
      label: "General follow-up",
      body: `Hi ${name}! Just following up regarding your PG requirement in ${area}. Are you still looking? We have some great options available${budget ? ` within ${budget}` : ""}. Let us know!`,
    },
    {
      stage: "token-reminder",
      label: "Token/payment reminder",
      body: `Hi ${name}! We're holding your room at ${prop} pending token payment. Please complete the booking to confirm your bed. Room availability is limited — act fast! 🙏`,
    },
    {
      stage: "lost-revival",
      label: "Re-engagement",
      body: `Hi ${name}! We noticed you were exploring PG options in ${area} earlier. We have new rooms available now${budget ? ` within your budget of ${budget}` : ""}. Would you like to re-schedule a visit? 😊`,
    },
    {
      stage: "booking-confirmed",
      label: "Booking confirmation",
      body: `Hi ${name}! 🎉 Congratulations! Your booking at ${prop} is confirmed. Welcome to the Gharpayy family! Our team will reach out with move-in details. See you soon!`,
    },
  ];

  if (!stage) {
    // Auto-pick based on lead stage
    const stageMap: Record<string, WaMessageStage> = {
      "new": "new-lead",
      "contacted": "follow-up",
      "tour-scheduled": "tour-scheduled",
      "tour-done": "tour-completed",
      "negotiation": "token-reminder",
      "booked": "booking-confirmed",
      "dropped": "lost-revival",
    };
    const autoStage = stageMap[lead.stage] ?? "follow-up";
    const primary = templates.find((t) => t.stage === autoStage)!;
    return [primary, ...templates.filter((t) => t.stage !== autoStage)];
  }

  const primary = templates.find((t) => t.stage === stage)!;
  return [primary, ...templates.filter((t) => t.stage !== stage)];
}

/* ================================================================
   FEATURE 5: REVENUE FORECASTING
   ================================================================ */

export interface RevenueForecast {
  hotLeadCount: number;
  warmLeadCount: number;
  coldLeadCount: number;
  estimatedConversions: number;
  forecastedMonthlyRevenue: number;
  avgRent: number;
  conversionRate: number; // 0-1
  pipelineValue: number;  // all active leads × avg rent
}

/**
 * Calculate a simple revenue forecast based on lead pipeline.
 */
export function calculateRevenueForecast(
  leads: Lead[],
  tours: Tour[],
  now = Date.now(),
  config?: { avgRent?: number; conversionRate?: number },
): RevenueForecast {
  const avgRent = config?.avgRent ?? 12000;
  const conversionRate = config?.conversionRate ?? 0.4;

  const activeLeads = leads.filter(
    (l) => l.stage !== "booked" && l.stage !== "dropped",
  );

  // Score each lead and categorize
  let hotCount = 0, warmCount = 0, coldCount = 0;
  for (const lead of activeLeads) {
    const { temperature } = calculateLeadScore(lead, tours, now);
    if (temperature === "hot") hotCount++;
    else if (temperature === "warm") warmCount++;
    else coldCount++;
  }

  // Conservative estimate: hot × full rate + warm × 50% rate
  const estimatedConversions = Math.round(
    hotCount * conversionRate + warmCount * conversionRate * 0.5,
  );

  return {
    hotLeadCount: hotCount,
    warmLeadCount: warmCount,
    coldLeadCount: coldCount,
    estimatedConversions,
    forecastedMonthlyRevenue: estimatedConversions * avgRent,
    avgRent,
    conversionRate,
    pipelineValue: activeLeads.length * avgRent * conversionRate,
  };
}

/* ================================================================
   FEATURE 6: LOST LEAD REASON ANALYTICS
   ================================================================ */

export const LOST_REASONS = [
  { value: "budget-issue", label: "Budget issue" },
  { value: "location-issue", label: "Location issue" },
  { value: "parent-rejected", label: "Parent rejected" },
  { value: "joined-competitor", label: "Joined competitor" },
  { value: "no-response", label: "No response" },
  { value: "postponed", label: "Move-in postponed" },
  { value: "food-concern", label: "Food concern" },
  { value: "other", label: "Other" },
] as const;

export type LostReason = (typeof LOST_REASONS)[number]["value"];

export interface LostReasonStat {
  reason: LostReason;
  label: string;
  count: number;
  pct: number;
}

/**
 * Compute lost reason stats from the lostReason tag convention.
 * Lost leads are tagged with "lost:budget-issue" etc.
 */
export function getLostReasonStats(leads: Lead[]): LostReasonStat[] {
  const droppedLeads = leads.filter((l) => l.stage === "dropped");
  const counts: Record<string, number> = {};

  for (const lead of droppedLeads) {
    let found = false;
    for (const tag of lead.tags ?? []) {
      const match = LOST_REASONS.find((r) => tag.includes(r.value) || tag === r.value);
      if (match) {
        counts[match.value] = (counts[match.value] ?? 0) + 1;
        found = true;
        break;
      }
    }
    if (!found) {
      counts["other"] = (counts["other"] ?? 0) + 1;
    }
  }

  const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;

  return LOST_REASONS.map((r) => ({
    reason: r.value,
    label: r.label,
    count: counts[r.value] ?? 0,
    pct: Math.round(((counts[r.value] ?? 0) / total) * 100),
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

/* ================================================================
   FEATURE 7: LEAD STATUS PIPELINE COUNTS
   ================================================================ */

export interface PipelineStageStat {
  stage: string;
  label: string;
  count: number;
  color: string;
}

export function getPipelineStats(leads: Lead[]): PipelineStageStat[] {
  const stages: { stage: string; label: string; color: string }[] = [
    { stage: "new", label: "New", color: "bg-info/20 text-info" },
    { stage: "contacted", label: "Contacted", color: "bg-muted text-muted-foreground" },
    { stage: "tour-scheduled", label: "Tour Scheduled", color: "bg-accent/20 text-accent" },
    { stage: "tour-done", label: "Tour Done", color: "bg-warning/20 text-warning-foreground" },
    { stage: "negotiation", label: "Negotiation", color: "bg-primary/10 text-primary" },
    { stage: "booked", label: "Converted", color: "bg-success/20 text-success" },
    { stage: "dropped", label: "Lost", color: "bg-destructive/20 text-destructive" },
  ];

  return stages.map((s) => ({
    ...s,
    count: leads.filter((l) => l.stage === s.stage).length,
  }));
}

/* ================================================================
   FEATURE 9: PRIORITY TAGS
   ================================================================ */

export interface PriorityTag {
  label: string;
  color: string; // Tailwind class fragment
  icon: string;  // emoji
}

/**
 * Derive smart priority tags for a lead card.
 */
export function getPriorityTags(
  lead: Lead,
  tours: Tour[],
  followUps: FollowUp[],
  now = Date.now(),
): PriorityTag[] {
  const tags: PriorityTag[] = [];
  const { temperature } = calculateLeadScore(lead, tours, now);
  const leadTours = tours.filter((t) => t.leadId === lead.id);
  const daysToMoveIn = (+new Date(lead.moveInDate) - now) / (24 * 36e5);
  const hasOverdueFollowUp = followUps.some(
    (f) => f.leadId === lead.id && !f.done && +new Date(f.dueAt) < now,
  );
  const hasTourDone = leadTours.some((t) => t.status === "completed");
  const hasScheduledTour = leadTours.some((t) => t.status === "scheduled");
  const negotiationPending = lead.stage === "negotiation";

  if (temperature === "hot") tags.push({ label: "Hot Lead", color: "bg-red-100 text-red-700 border-red-200", icon: "🔥" });
  if (hasOverdueFollowUp) tags.push({ label: "Follow-up Needed", color: "bg-orange-100 text-orange-700 border-orange-200", icon: "⏰" });
  if ((lead.tags ?? []).some((t) => t.includes("parent"))) tags.push({ label: "Parent Concern", color: "bg-purple-100 text-purple-700 border-purple-200", icon: "👨‍👩‍👧" });
  if ((lead.budget ?? 0) < 11000) tags.push({ label: "Budget Sensitive", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "💰" });
  if (daysToMoveIn > 0 && daysToMoveIn <= 7) tags.push({ label: "Urgent Move-in", color: "bg-red-100 text-red-800 border-red-300", icon: "🚨" });
  if (hasTourDone && !negotiationPending && lead.stage !== "booked") tags.push({ label: "Tour Done", color: "bg-blue-100 text-blue-700 border-blue-200", icon: "🏠" });
  if (negotiationPending || (hasTourDone && lead.stage === "tour-done")) tags.push({ label: "Token Pending", color: "bg-green-100 text-green-700 border-green-200", icon: "💳" });
  if (hasScheduledTour) tags.push({ label: "Tour Booked", color: "bg-accent/10 text-accent border-accent/20", icon: "📅" });

  return tags.slice(0, 4); // max 4 tags per card
}

/* ================================================================
   FEATURE 10: TCM PERFORMANCE SUMMARY
   ================================================================ */

export interface TCMPerformanceSummary {
  tcmId: string;
  tcmName: string;
  zone: string;
  assignedLeads: number;
  toursCompleted: number;
  convertedLeads: number;
  conversionPct: number; // 0-100
  overdueFollowUps: number;
  avgResponseMins: number;
  streak: string; // "hot" | "normal" | "needs-attention"
}

export function getTCMPerformance(
  tcms: TCM[],
  leads: Lead[],
  tours: Tour[],
  followUps: FollowUp[],
  now = Date.now(),
): TCMPerformanceSummary[] {
  return tcms.map((tcm) => {
    const myLeads = leads.filter((l) => l.assignedTcmId === tcm.id);
    const myTours = tours.filter((t) => t.tcmId === tcm.id);
    const toursCompleted = myTours.filter((t) => t.status === "completed").length;
    const convertedLeads = myLeads.filter((l) => l.stage === "booked").length;
    const conversionPct = toursCompleted > 0
      ? Math.round((convertedLeads / toursCompleted) * 100)
      : 0;
    const overdueFollowUps = followUps.filter(
      (f) => f.tcmId === tcm.id && !f.done && +new Date(f.dueAt) < now,
    ).length;

    let streak: TCMPerformanceSummary["streak"] = "normal";
    if (conversionPct >= 35 && overdueFollowUps === 0) streak = "hot";
    else if (overdueFollowUps >= 3 || conversionPct < 10) streak = "needs-attention";

    return {
      tcmId: tcm.id,
      tcmName: tcm.name,
      zone: tcm.zone,
      assignedLeads: myLeads.length,
      toursCompleted,
      convertedLeads,
      conversionPct,
      overdueFollowUps,
      avgResponseMins: tcm.avgResponseMins,
      streak,
    };
  });
}

/* ================================================================
   FEATURE: PROPERTY RECOMMENDATION ENGINE
   ================================================================ */

export interface PropertyRecommendation {
  propertyId: string;
  propertyName: string;
  location: string;
  roomType: string;
  monthlyRent: number;
  availableBeds: number;
  matchScore: number;     // 0-100
  reasons: string[];
  distanceNote: string;
}

export function calculatePropertyMatchScore(
  lead: { budget?: number; preferredArea?: string; tags?: string[] },
  property: { pricePerBed: number; area: string; vacantBeds: number; name: string }
): number {
  let score = 0;
  const budget = lead.budget ?? 0;
  const area = (lead.preferredArea ?? "").toLowerCase();
  const propArea = (property.area ?? "").toLowerCase();

  // Budget match (40 points)
  if (budget > 0) {
    const diff = Math.abs(budget - property.pricePerBed);
    const pct = diff / property.pricePerBed;
    if (pct <= 0.05) score += 40;
    else if (pct <= 0.15) score += 30;
    else if (pct <= 0.25) score += 20;
    else if (pct <= 0.40) score += 10;
    else if (budget < property.pricePerBed) score += 0;
    else score += 5;
  }

  // Area/location match (35 points)
  if (area && propArea) {
    if (propArea === area) score += 35;
    else if (propArea.includes(area) || area.includes(propArea)) score += 25;
    else score += 5;
  }

  // Availability (15 points)
  if (property.vacantBeds >= 3) score += 15;
  else if (property.vacantBeds >= 1) score += 10;
  else score += 0;

  // Urgency bonus (10 points) — if lead is urgent, prefer properties with more beds
  const tags = lead.tags ?? [];
  if (tags.some(t => t.includes("urgent"))) {
    score += property.vacantBeds >= 1 ? 10 : 0;
  } else {
    score += 5;
  }

  return Math.min(100, score);
}

export function getRecommendationReasons(
  lead: { budget?: number; preferredArea?: string; tags?: string[] },
  property: { pricePerBed: number; area: string; vacantBeds: number; name: string }
): string[] {
  const reasons: string[] = [];
  const budget = lead.budget ?? 0;
  const area = (lead.preferredArea ?? "").toLowerCase();
  const propArea = (property.area ?? "").toLowerCase();

  if (budget > 0) {
    const diff = property.pricePerBed - budget;
    if (Math.abs(diff) / property.pricePerBed <= 0.10) reasons.push("Budget matches closely");
    else if (diff > 0 && diff / property.pricePerBed <= 0.20) reasons.push("Slightly above budget but good value");
    else if (budget > property.pricePerBed) reasons.push("Within budget");
  }

  if (area && propArea) {
    if (propArea === area) reasons.push("Exact location match");
    else if (propArea.includes(area) || area.includes(propArea)) reasons.push("Near preferred area");
  }

  if (property.vacantBeds >= 3) reasons.push("Good availability — multiple beds open");
  else if (property.vacantBeds >= 1) reasons.push(`${property.vacantBeds} bed(s) available`);

  if ((lead.tags ?? []).some(t => t.includes("urgent"))) {
    if (property.vacantBeds >= 1) reasons.push("Immediate availability for urgent move-in");
  }

  if (reasons.length === 0) reasons.push("General match based on area and budget");
  return reasons;
}

export function getRecommendedProperties(
  lead: { budget?: number; preferredArea?: string; tags?: string[] },
  properties: Array<{ id: string; name: string; area: string; totalBeds: number; vacantBeds: number; pricePerBed: number }>
): PropertyRecommendation[] {
  return properties
    .filter(p => p.vacantBeds > 0)
    .map(p => ({
      propertyId: p.id,
      propertyName: p.name,
      location: p.area,
      roomType: "Shared",
      monthlyRent: p.pricePerBed,
      availableBeds: p.vacantBeds,
      matchScore: calculatePropertyMatchScore(lead, p),
      reasons: getRecommendationReasons(lead, p),
      distanceNote: (lead.preferredArea ?? "").toLowerCase() === p.area.toLowerCase()
        ? "Same area as preferred"
        : `Located in ${p.area}`,
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
}

/* ================================================================
   TOKEN / BOOKING STATS helper
   ================================================================ */

export interface TokenStats {
  pending: number;
  paid: number;
  totalCollection: number;
  inNegotiation: number;
}

export function getTokenStats(leads: Lead[]): TokenStats {
  const pending = leads.filter((l) => (l.tags ?? []).includes("token-pending")).length;
  const paid = leads.filter((l) => (l.tags ?? []).includes("token-paid")).length;
  const inNegotiation = leads.filter((l) => l.stage === "negotiation").length;
  return { pending, paid, totalCollection: 0, inNegotiation };
}

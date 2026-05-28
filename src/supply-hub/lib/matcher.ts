// Rule-based lead matcher. Uses real GPS distance (haversine) when both PG + landmark have lat/lng.
// IMPORTANT: never fabricates pricing — if requested occupancy not offered, lead is downgraded with reason.

import { PGS } from "../data/pgs";
import { DISTANCE, AREA_CENTROID } from "../data/areas";
import { LANDMARKS } from "../data/landmarks";
import type { PG, Gender } from "../data/types";

function hav(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function leadCoords(area: string): { lat: number; lng: number } | null {
  const n = area.toLowerCase().trim();
  if (!n) return null;
  // Most specific first — landmarks
  const lm = LANDMARKS.find(
    (l) => l.lat && l.lng && (l.n.toLowerCase().includes(n) || n.includes(l.n.toLowerCase().split(" ")[0])),
  );
  if (lm && lm.lat && lm.lng) return { lat: lm.lat, lng: lm.lng };
  // Fall back to area centroid
  for (const [k, v] of Object.entries(AREA_CENTROID)) {
    if (k.toLowerCase().includes(n) || n.includes(k.toLowerCase())) return v;
  }
  return null;
}

export interface Lead {
  name?: string;
  phone?: string;
  area: string;
  gender: Gender | "Any";
  budgetMin: number;
  budgetMax: number;
  audience?: "Student" | "Working" | "Both";
  occupancy?: "Single" | "Double" | "Triple" | "Any";
  notes?: string;
}

export interface MatchResult {
  pg: PG;
  total: number; // 0-100
  parts: { label: string; pts: number; max: number; reason: string }[];
  commuteKm: number | null;
  bedPrice: number | null;        // actual price for the requested occupancy (null = not offered)
  bedLabel: string;               // "Double @ ₹15k" or "Single only"
  reasoning: string;
  disqualified?: string;
}

const norm = (s: string) => (s || "").toLowerCase().trim();

function leadToPGDistance(leadArea: string, pg: PG): number | null {
  const coords = leadCoords(leadArea);
  if (coords && pg.lat && pg.lng) return hav(coords.lat, coords.lng, pg.lat, pg.lng);
  const f = Object.keys(DISTANCE).find((k) => norm(k) === norm(leadArea) || norm(leadArea).includes(norm(k)));
  if (!f) return null;
  const row = DISTANCE[f];
  const t = Object.keys(row).find((k) => norm(k) === norm(pg.area) || norm(pg.area).includes(norm(k)));
  return t ? row[t] : null;
}

// Pick the actual price for what the lead asked for. NEVER fabricate.
function pickBedPrice(pg: PG, occ: Lead["occupancy"]): { price: number | null; label: string } {
  const p = pg.prices;
  if (occ === "Single") return { price: p.single || null, label: p.single ? `Single ₹${(p.single / 1000).toFixed(0)}k` : "No single" };
  if (occ === "Double") return { price: p.double || null, label: p.double ? `Double ₹${(p.double / 1000).toFixed(0)}k` : "No double" };
  if (occ === "Triple") return { price: p.triple || null, label: p.triple ? `Triple ₹${(p.triple / 1000).toFixed(0)}k` : "No triple" };
  // Any → cheapest available
  const candidates = [p.triple, p.double, p.single].filter((v) => v > 0);
  if (!candidates.length) return { price: null, label: "Pricing not disclosed" };
  const cheapest = Math.min(...candidates);
  const which = cheapest === p.triple ? "Triple" : cheapest === p.double ? "Double" : "Single";
  return { price: cheapest, label: `${which} ₹${(cheapest / 1000).toFixed(0)}k` };
}

export function matchLead(lead: Lead): MatchResult[] {
  const results: MatchResult[] = [];
  const wantArea = norm(lead.area);

  // Load dynamic settings from localStorage if available in browser context
  let wDistance = 35;
  let wBudget = 25;
  let wAudience = 10;
  let wCompliance = 8;
  let showOnlyVerified = false;
  let hideLowCompliance = false;

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("gharpayy.settings.v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.matching) {
          const m = parsed.matching;
          if (typeof m.wDistance === "number") wDistance = m.wDistance;
          if (typeof m.wBudget === "number") wBudget = m.wBudget;
          if (typeof m.wAudience === "number") wAudience = m.wAudience;
          if (typeof m.wCompliance === "number") wCompliance = m.wCompliance;
          if (typeof m.showOnlyVerified === "boolean") showOnlyVerified = m.showOnlyVerified;
          if (typeof m.hideLowCompliance === "boolean") hideLowCompliance = m.hideLowCompliance;
        }
      }
    } catch (e) {}
  }

  for (const pg of PGS) {
    const parts: MatchResult["parts"] = [];
    let total = 0;
    let dq: string | undefined;

    // Enforce Verification Check if enabled
    if (showOnlyVerified) {
      const isVerified = pg.iqBreakdown?.["GPS Verified"]?.ok || false;
      if (!isVerified) {
        dq = "Not GPS verified";
      }
    }

    // Enforce Compliance Check if enabled
    if (hideLowCompliance && pg.iq < 75) {
      dq = (dq ?? "") + (dq ? " | " : "") + `Low compliance (IQ ${pg.iq}/100)`;
    }

    // 1) Area — dynamically scaled by wDistance
    const pgArea = norm(pg.area);
    let areaPts = 0;
    let areaReason = "Far from requested area";
    if (pgArea && (wantArea === pgArea || wantArea.includes(pgArea) || pgArea.includes(wantArea))) {
      areaPts = wDistance;
      areaReason = `Exact area: ${pg.area}`;
    } else if (norm(pg.locality).includes(wantArea) || pg.landmarksInline.some((l) => norm(l).includes(wantArea))) {
      areaPts = Math.round(wDistance * 0.8);
      areaReason = `Mentions "${lead.area}" in locality/landmarks`;
    } else {
      const d = leadToPGDistance(lead.area, pg);
      if (d !== null) {
        if (d <= 5) { areaPts = Math.round(wDistance * 0.68); areaReason = `${d} km away`; }
        else if (d <= 10) { areaPts = Math.round(wDistance * 0.45); areaReason = `${d} km — nearby`; }
        else if (d <= 15) { areaPts = Math.round(wDistance * 0.22); areaReason = `${d} km — commutable`; }
        else { areaPts = Math.round(wDistance * 0.05); areaReason = `${d} km — far`; }
      }
    }
    parts.push({ label: "Area", pts: areaPts, max: wDistance, reason: areaReason });
    total += areaPts;

    // 2) Gender — 20 (HARD check)
    let genderPts = 0;
    let genderReason = "";
    if (lead.gender === "Any") { genderPts = 12; genderReason = "Lead open to any gender PG"; }
    else if (pg.gender === lead.gender) { genderPts = 20; genderReason = `Exact: ${pg.gender}`; }
    else if (pg.gender === "Co-live") { genderPts = 14; genderReason = "Co-live accepts both"; }
    else { dq = (dq ?? "") + (dq ? " | " : "") + `Gender mismatch — lead ${lead.gender}, PG ${pg.gender}`; }
    parts.push({ label: "Gender", pts: genderPts, max: 20, reason: genderReason || dq! });
    total += genderPts;

    // 3) Budget — dynamically scaled by wBudget
    const { price: bedPrice, label: bedLabel } = pickBedPrice(pg, lead.occupancy);
    let budgetPts = 0;
    let budgetReason = bedLabel;
    if (bedPrice === null) {
      if (lead.occupancy && lead.occupancy !== "Any") {
        dq = (dq ?? "") + (dq ? " | " : "") + `${lead.occupancy} sharing not offered`;
        budgetReason = `${lead.occupancy} sharing not offered`;
      } else {
        budgetReason = "Pricing not disclosed";
      }
    } else if (bedPrice >= lead.budgetMin && bedPrice <= lead.budgetMax) {
      budgetPts = wBudget;
      budgetReason = `${bedLabel} fits ₹${(lead.budgetMin / 1000).toFixed(0)}k–${(lead.budgetMax / 1000).toFixed(0)}k`;
    } else if (bedPrice <= lead.budgetMax * 1.15 && bedPrice >= lead.budgetMin * 0.85) {
      budgetPts = Math.round(wBudget * 0.48);
      budgetReason = `${bedLabel} — slightly out of range`;
    } else if (bedPrice > lead.budgetMax * 1.15) {
      dq = (dq ?? "") + (dq ? " | " : "") + "Over budget by >15%";
      budgetReason = `${bedLabel} — too expensive`;
    } else {
      budgetPts = Math.round(wBudget * 0.32);
      budgetReason = `${bedLabel} — under budget`;
    }
    parts.push({ label: "Budget", pts: budgetPts, max: wBudget, reason: budgetReason });
    total += budgetPts;

    // 4) Audience — dynamically scaled by wAudience
    const aud = norm(pg.audience);
    let audPts = 0;
    let audReason = "Audience open";
    if (lead.audience === "Both" || !lead.audience) { audPts = Math.round(wAudience * 0.6); audReason = "Open to all"; }
    else if (aud.includes("both")) { audPts = Math.round(wAudience * 0.9); audReason = "Both students & professionals"; }
    else if (lead.audience === "Working" && aud.includes("professional")) { audPts = wAudience; audReason = "Working professional PG"; }
    else if (lead.audience === "Student" && aud.includes("student")) { audPts = wAudience; audReason = "Student PG"; }
    else { audPts = Math.round(wAudience * 0.3); audReason = `Skews ${pg.audience || "mixed"}`; }
    parts.push({ label: "Audience", pts: audPts, max: wAudience, reason: audReason });
    total += audPts;

    // 5) Quality (Compliance) — dynamically scaled by wCompliance
    const iqPts = Math.round((pg.iq / 100) * wCompliance);
    parts.push({ label: "Quality", pts: iqPts, max: wCompliance, reason: `IQ ${pg.iq}/100` });
    total += iqPts;

    const commuteKm = leadToPGDistance(lead.area, pg);

    const reasoning = dq
      ? `DISQUALIFIED — ${dq}`
      : parts.filter((p) => p.pts >= p.max * 0.7).map((p) => p.reason).join(" · ");

    results.push({
      pg, total: dq ? 0 : total, parts, commuteKm, bedPrice, bedLabel,
      reasoning, disqualified: dq,
    });
  }

  results.sort((a, b) => b.total - a.total || b.pg.iq - a.pg.iq);
  return results;
}

export function rating(score: number): { label: string; color: string; action: string } {
  if (score >= 90) return { label: "PERFECT", color: "text-emerald-400", action: "Send WA card immediately" };
  if (score >= 75) return { label: "STRONG", color: "text-cyan-400", action: "Call within 30 minutes" };
  if (score >= 55) return { label: "DECENT", color: "text-amber-400", action: "Pitch with explanation" };
  if (score >= 35) return { label: "WEAK", color: "text-orange-400", action: "Only if nothing better" };
  return { label: "SKIP", color: "text-rose-400", action: "Don't pitch" };
}

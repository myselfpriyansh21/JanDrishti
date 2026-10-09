import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase, type CategoryT, type ComplaintStatus, type PriorityBand } from "./supabase";

export type { PriorityBand } from "./supabase";

export type Severity = "minor" | "moderate" | "major" | "severe";
export type SafetyRisk = "none" | "low" | "moderate" | "high" | "critical";

export type ScoreFactor = {
  key: "safety_risk" | "severity" | "affected_scale" | "duration" | "location_sensitivity";
  input: string; // what the AI/DB supplied, e.g. "high", "5 day(s)"
  factor: number; // 0..1
  weight: number; // from scoring_config
  contribution: number; // 100 * weight * factor
};

export type ScoreBreakdown = {
  factors: ScoreFactor[];
  base_score: number;
  recurrence_boost: number;
  score: number;
  band: PriorityBand;
};

// Keep in sync with the object returned by supabase/functions/triage-complaint/index.ts
export type TriageResult = {
  complaint_id: string;
  ref_code: string;
  status: ComplaintStatus;
  is_valid: boolean;
  rejection_reason: string | null;
  language: string;
  category: CategoryT;
  issue_type: string;
  severity: Severity;
  safety_risk: SafetyRisk;
  affected_scale: string;
  ai_summary: string;
  ai_confidence: number; // classification confidence only (NOT severity)
  used_fallback: boolean;
  priority_score: number | null;
  priority_band: PriorityBand | null;
  score_breakdown: ScoreBreakdown | null;
  routing_status: "auto" | "needs_verification" | "overridden" | "none";
  routing_confidence: number | null;
  routing_reasons: string[];
  suggested_department: { code: string; name_en: string; name_hi: string | null } | null;
  matched_jurisdictions: string[];
  follow_up_question: string | null;
  duplicate_of_ref: string | null;
  sla_due_at: string | null;
};

export type Pin = { lat: number; lng: number; source: "gps" | "map_pin" };

export type ComplaintInput = {
  description: string;
  durationDays: number | null;
  pin: Pin | null;
};

export const DURATION_OPTIONS: { key: string; label: string; days: number | null }[] = [
  { key: "unknown", label: "Not sure", days: null },
  { key: "today", label: "Started today", days: 0 },
  { key: "1-3d", label: "1–3 days", days: 2 },
  { key: "4-7d", label: "4–7 days", days: 6 },
  { key: "1-4w", label: "1–4 weeks", days: 14 },
  { key: "gt1m", label: "More than a month", days: 45 },
];

const MAX_TEXT = 2000;

export class TriageError extends Error {
  complaintId?: string;
  refCode?: string;
  constructor(message: string, complaintId?: string, refCode?: string) {
    super(message);
    this.name = "TriageError";
    this.complaintId = complaintId;
    this.refCode = refCode;
  }
}

async function ensureSession(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  // Demo convenience: anonymous citizen session.
  // Requires Supabase → Authentication → Sign In / Providers → "Allow anonymous sign-ins".
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) {
    throw new Error(
      `You are not signed in and anonymous sign-in failed (${error?.message ?? "unknown error"}). ` +
        `Enable anonymous sign-ins in Supabase, or sign in first.`
    );
  }
  return anon.user.id;
}

async function readFunctionError(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    try {
      const body = await err.context.json();
      if (body?.error) return String(body.error);
    } catch {
      /* fall through */
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

/** Runs the server-side pipeline (extract → locate → route → dedup → score → persist). */
export async function triageComplaint(complaintId: string, refCode?: string): Promise<TriageResult> {
  const { data, error } = await supabase.functions.invoke<TriageResult>("triage-complaint", {
    body: { complaint_id: complaintId },
  });
  if (error || !data) {
    const msg = await readFunctionError(error);
    throw new TriageError(
      refCode
        ? `Your complaint ${refCode} was saved, but the analysis failed: ${msg}`
        : `Analysis failed: ${msg}`,
      complaintId,
      refCode
    );
  }
  return data;
}

export const retryTriage = triageComplaint;

/** Saves the raw complaint (RLS-protected insert) and triggers the AI triage pipeline. */
export async function submitAndTriage(input: ComplaintInput): Promise<TriageResult> {
  const text = input.description.trim();
  if (text.length < 10) throw new Error("Please describe the problem in at least 10 characters.");
  if (text.length > MAX_TEXT) throw new Error(`Description is too long (max ${MAX_TEXT} characters).`);

  const userId = await ensureSession();

  const { data, error } = await supabase
    .from("complaints")
    .insert({
      citizen_id: userId,
      raw_text: text,
      duration_input_days: input.durationDays,
      location: input.pin
        ? `SRID=4326;POINT(${input.pin.lng.toFixed(6)} ${input.pin.lat.toFixed(6)})`
        : null,
      location_source: input.pin ? input.pin.source : "none",
    })
    .select("id, ref_code")
    .single();

  if (error || !data) {
    throw new Error(`Could not save your complaint: ${error?.message ?? "unknown error"}`);
  }

  return triageComplaint(data.id, data.ref_code);
}
import { createClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CategoryT =
  | "garbage"
  | "pothole"
  | "drainage_sewer"
  | "water_leakage"
  | "streetlight"
  | "other";

export type ComplaintStatus =
  | "submitted"
  | "needs_info"
  | "pending_verification"
  | "pending_assignment"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "duplicate"
  | "rejected";

export type PriorityBand = "low" | "medium" | "high" | "critical";

// NOTE: use `type` (not `interface`) so supabase-js generics accept these rows.
export type ComplaintRow = {
  id: string;
  ref_code: string;
  citizen_id: string | null;
  raw_text: string | null;
  input_language: string | null;
  duration_input_days: number | null;
  landmark: string | null;
  address_text: string | null;
  contact_phone: string | null;
  location: string | null; // geography(Point,4326): send EWKT 'SRID=4326;POINT(lng lat)'
  location_source: "gps" | "map_pin" | "typed" | "geocoded" | "none";
  location_confidence: number | null;
  category: CategoryT | null;
  issue_type: string | null;
  severity: "minor" | "moderate" | "major" | "severe" | null;
  safety_risk: "none" | "low" | "moderate" | "high" | "critical" | null;
  safety_risk_reason: string | null;
  affected_scale: string | null;
  road_type: string | null;
  ai_duration_days: number | null;
  duration_source: "stated" | "inferred" | "unknown" | null;
  photo_consistent: "yes" | "no" | "unclear" | "no_photo" | null;
  rejection_reason: string | null;
  ai_summary: string | null;
  ai_evidence: Json | null;
  ai_confidence: number | null;
  missing_fields: string[];
  follow_up_question: string | null;
  suggested_department_id: string | null;
  routing_rule_id: string | null;
  routing_status: "auto" | "needs_verification" | "overridden" | "none";
  routing_confidence: number | null;
  routing_candidates: Json | null;
  final_department_id: string | null;
  priority_score: number | null;
  priority_band: PriorityBand | null;
  score_breakdown: Json | null;
  status: ComplaintStatus;
  duplicate_of: string | null;
  report_count: number;
  sla_due_at: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type DepartmentRow = {
  id: string;
  code: string;
  name_en: string;
  name_hi: string | null;
  contact_email: string | null;
  active: boolean;
};

export type Database = {
  public: {
    Tables: {
      complaints: {
        Row: ComplaintRow;
        Insert: Partial<ComplaintRow>;
        Update: Partial<ComplaintRow>;
        Relationships: [];
      };
      departments: {
        Row: DepartmentRow;
        Insert: Partial<DepartmentRow>;
        Update: Partial<DepartmentRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      category_t: CategoryT;
      complaint_status: ComplaintStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env and restart `npm run dev`."
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});

// Tip: later you can replace the hand-written Database type with generated types:
//   npx supabase gen types typescript --project-id <your-ref> > src/lib/database.types.ts
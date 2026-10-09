import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase, type ComplaintRow, type ComplaintStatus, type DepartmentRow } from "../lib/supabase";
import ReportForm from "./ReportForm";

/* ================================ icons ================================ */

const ICON_PATHS = {
  document:
    "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  shield:
    "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  warning:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  bolt: "m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z",
  map: "M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z",
  queue:
    "M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z",
  pencil:
    "m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125",
  refresh:
    "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99",
  bank: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z",
  close: "M6 18 18 6M6 6l12 12",
  lock: "M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z",
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[name]} />
    </svg>
  );
}

/* ================================ tabs ================================ */

export const TABS = [
  { key: "submit", label: "Citizen Submission", icon: "pencil" },
  { key: "queue", label: "Live Feed & Verification", icon: "queue" },
  { key: "map", label: "Heat / Cluster Map", icon: "map" },
] as const satisfies readonly { key: string; label: string; icon: IconName }[];

export type TabKey = (typeof TABS)[number]["key"];

/* ============================ constants / maps ============================ */

const LUCKNOW: [number, number] = [26.84, 80.95];
const CLOSED_STATUSES: string[] = ["resolved", "rejected", "duplicate"];
const ROUTABLE_STATUSES: string[] = ["pending_verification", "needs_info", "submitted", "pending_assignment"];

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  needs_info: "Needs info",
  pending_verification: "Needs verification",
  pending_assignment: "Pending assignment",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  duplicate: "Duplicate",
  rejected: "Rejected",
};

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-slate-100 text-slate-700 ring-slate-200",
  needs_info: "bg-violet-100 text-violet-800 ring-violet-200",
  pending_verification: "bg-amber-100 text-amber-900 ring-amber-300",
  pending_assignment: "bg-amber-100 text-amber-900 ring-amber-300",
  assigned: "bg-blue-100 text-blue-800 ring-blue-200",
  in_progress: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  resolved: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  duplicate: "bg-slate-200 text-slate-700 ring-slate-300",
  rejected: "bg-slate-200 text-slate-700 ring-slate-300",
};

const BAND_STYLE: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-200",
  high: "bg-orange-100 text-orange-800 ring-orange-200",
  critical: "bg-red-100 text-red-800 ring-red-200",
};

const SEVERITY_STYLE: Record<string, string> = {
  minor: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  moderate: "bg-amber-100 text-amber-800 ring-amber-200",
  major: "bg-orange-100 text-orange-800 ring-orange-200",
  severe: "bg-red-100 text-red-800 ring-red-200",
};

const CATEGORY_LABEL: Record<string, string> = {
  garbage: "Garbage",
  pothole: "Pothole / Road",
  drainage_sewer: "Drainage & Sewer",
  water_leakage: "Water Leakage",
  streetlight: "Streetlight",
  other: "Other",
};

const LANG_LABEL: Record<string, string> = { en: "EN", hi: "हिं", hinglish: "HG", other: "—" };

const FACTOR_LABEL: Record<string, string> = {
  safety_risk: "Safety",
  severity: "Severity",
  affected_scale: "Scale",
  duration: "Duration",
  location_sensitivity: "Sensitive place",
};

const FACTOR_COLOR: Record<string, string> = {
  safety_risk: "bg-red-500",
  severity: "bg-orange-500",
  affected_scale: "bg-amber-500",
  duration: "bg-sky-500",
  location_sensitivity: "bg-violet-500",
};

const BAND_HEX: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#d97706",
  low: "#16a34a",
};
const SEVERITY_HEX: Record<string, string> = {
  severe: "#dc2626",
  major: "#ea580c",
  moderate: "#d97706",
  minor: "#16a34a",
};
const SEVERITY_RANK: Record<string, number> = { minor: 1, moderate: 2, major: 3, severe: 4 };

const human = (s: string) => s.replace(/_/g, " ");
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);

function timeAgo(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function isOverdue(r: ComplaintRow): boolean {
  return !!r.sla_due_at && new Date(r.sla_due_at).getTime() < Date.now() && !CLOSED_STATUSES.includes(r.status);
}

/* ============================ data helpers ============================ */

// supabase-js client typed loosely, for tables not described in src/lib/supabase.ts
const db = supabase as unknown as SupabaseClient;

/** PostgREST returns geography as hex EWKB (or WKT / GeoJSON depending on config). Handle all three. */
function parseLocation(v: unknown): { lat: number; lng: number } | null {
  if (!v) return null;
  try {
    if (typeof v === "object" && v !== null && Array.isArray((v as { coordinates?: unknown }).coordinates)) {
      const c = (v as { coordinates: number[] }).coordinates;
      return { lng: Number(c[0]), lat: Number(c[1]) };
    }
    if (typeof v !== "string") return null;
    const wkt = v.match(/POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/i);
    if (wkt) return { lng: Number(wkt[1]), lat: Number(wkt[2]) };
    const pairs = v.match(/.{2}/g);
    if (!pairs) return null;
    const bytes = new Uint8Array(pairs.map((h) => parseInt(h, 16)));
    const view = new DataView(bytes.buffer);
    const little = bytes[0] === 1;
    const type = view.getUint32(1, little);
    let offset = 5;
    if (type & 0x20000000) offset += 4; // SRID present
    const lng = view.getFloat64(offset, little);
    const lat = view.getFloat64(offset + 8, little);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

type RoutingInfo = {
  matched: string[];
  reasons: string[];
  candidates: { departmentId: string; name: string; note: string | null; specificity: number }[];
};

function readRouting(j: unknown): RoutingInfo {
  const out: RoutingInfo = { matched: [], reasons: [], candidates: [] };
  if (!j || typeof j !== "object") return out;
  const o = j as Record<string, unknown>;
  if (Array.isArray(o.matched_jurisdictions)) {
    out.matched = o.matched_jurisdictions
      .map((x) => (x as { name?: unknown })?.name)
      .filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(o.reasons)) out.reasons = o.reasons.filter((x): x is string => typeof x === "string");
  if (Array.isArray(o.candidates)) {
    out.candidates = o.candidates.map((x) => {
      const c = x as Record<string, unknown>;
      return {
        departmentId: String(c.department_id ?? ""),
        name: String(c.name_en ?? c.code ?? "Unknown"),
        note: typeof c.rule_note === "string" ? c.rule_note : null,
        specificity: Number(c.specificity ?? 0),
      };
    });
  }
  return out;
}

type Factor = { key: string; input: string; factor: number; weight: number; contribution: number };
type Breakdown = { factors: Factor[]; base_score: number; recurrence_boost: number; score: number };

function readBreakdown(j: unknown): Breakdown | null {
  if (!j || typeof j !== "object") return null;
  const o = j as Record<string, unknown>;
  if (!Array.isArray(o.factors)) return null;
  return {
    factors: o.factors.map((f) => {
      const x = f as Record<string, unknown>;
      return {
        key: String(x.key ?? ""),
        input: String(x.input ?? ""),
        factor: Number(x.factor ?? 0),
        weight: Number(x.weight ?? 0),
        contribution: Number(x.contribution ?? 0),
      };
    }),
    base_score: Number(o.base_score ?? 0),
    recurrence_boost: Number(o.recurrence_boost ?? 0),
    score: Number(o.score ?? 0),
  };
}

/* ================================ hooks ================================ */

type Role = "admin" | "department_officer" | "citizen";
type StaffSession = {
  ready: boolean;
  userId: string | null;
  email: string | null;
  role: Role | null;
  anonymous: boolean;
};

function useStaffSession(): StaffSession {
  const [s, setS] = useState<StaffSession>({ ready: false, userId: null, email: null, role: null, anonymous: false });

  useEffect(() => {
    let alive = true;

    const load = async (session: Session | null) => {
      if (!session) {
        if (alive) setS({ ready: true, userId: null, email: null, role: null, anonymous: false });
        return;
      }
      const user = session.user;
      let role: Role = "citizen";
      if (!user.is_anonymous) {
        const { data } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
        role = (data?.role as Role | undefined) ?? "citizen";
      }
      if (alive) {
        setS({ ready: true, userId: user.id, email: user.email ?? null, role, anonymous: !!user.is_anonymous });
      }
    };

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      // never call supabase inside this callback synchronously (deadlock risk)
      setTimeout(() => {
        void load(session);
      }, 0);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return s;
}

function useComplaints(enabled: boolean) {
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    const { data, error: err } = await supabase
      .from("complaints")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (err) setError(err.message);
    else {
      setRows(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      return;
    }
    void load(false);

    const schedule = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void load(true), 400);
    };
    const channel = supabase
      .channel("dashboard-complaints")
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, schedule)
      .subscribe();
    const poll = setInterval(() => void load(true), 20_000); // safety net if realtime is unavailable

    return () => {
      if (timer.current) clearTimeout(timer.current);
      clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [enabled, load]);

  const patchLocal = useCallback((id: string, patch: Partial<ComplaintRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  return { rows, loading, error, reload: () => load(false), patchLocal };
}

function useDepartments(enabled: boolean) {
  const [list, setList] = useState<DepartmentRow[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    supabase
      .from("departments")
      .select("*")
      .eq("active", true)
      .order("name_en")
      .then(({ data }) => {
        if (alive && data) setList(data);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);
  return list;
}

/* ============================== small UI pieces ============================== */

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <Badge className={STATUS_STYLE[status] ?? STATUS_STYLE.submitted}>{STATUS_LABEL[status] ?? human(status)}</Badge>;
}

function BandBadge({ band, score }: { band: string | null; score: number | null }) {
  if (!band) return <span className="text-xs text-slate-400">—</span>;
  return (
    <Badge className={BAND_STYLE[band] ?? BAND_STYLE.low}>
      {band.toUpperCase()}
      {score != null && <span className="ml-1 font-mono opacity-80">{score}</span>}
    </Badge>
  );
}

type Accent = "blue" | "amber" | "red" | "green";
const ACCENT: Record<Accent, { bar: string; chip: string }> = {
  blue: { bar: "bg-blue-700", chip: "bg-blue-50 text-blue-700 ring-blue-100" },
  amber: { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700 ring-amber-100" },
  red: { bar: "bg-red-600", chip: "bg-red-50 text-red-700 ring-red-100" },
  green: { bar: "bg-emerald-600", chip: "bg-emerald-50 text-emerald-700 ring-emerald-100" },
};

function MetricCard(props: {
  title: string;
  value: string | number;
  caption: string;
  icon: IconName;
  accent: Accent;
  loading?: boolean;
}) {
  const a = ACCENT[props.accent];
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-1 ${a.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{props.title}</p>
          {props.loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{props.value}</p>
          )}
          <p className="mt-1 truncate text-xs text-slate-500">{props.caption}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${a.chip}`}>
          <Icon name={props.icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

/* ============================== staff sign-in ============================== */

function StaffGate({ session }: { session: StaffSession }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setErr(error.message);
    setBusy(false);
  }

  const signedInNonStaff = session.ready && session.userId && !session.anonymous && session.role === "citizen";

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-950 text-white">
          <Icon name="lock" className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-slate-900">Staff sign-in required</h3>
          <p className="text-sm text-slate-600">Live complaints, verification and the map are visible to officers and admins only.</p>
        </div>
      </div>

      {signedInNonStaff && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          You are signed in as <b>{session.email}</b>, but this account has the <b>citizen</b> role. Promote it in the
          database or sign in with an admin account.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <div>
          <label htmlFor="staff-email" className="block text-xs font-semibold text-slate-700">
            Email
          </label>
          <input
            id="staff-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label htmlFor="staff-pass" className="block text-xs font-semibold text-slate-700">
            Password
          </label>
          <input
            id="staff-pass"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {err && (
          <p className="rounded-lg bg-red-50 p-2.5 text-sm text-red-800" role="alert">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <details className="mt-5 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700">First time? Create the demo admin</summary>
        <p className="mt-2">
          Supabase → Authentication → Users → <b>Add user</b> (email + password, auto-confirm), then run:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
{`update profiles set role = 'admin'
where id = (select id from auth.users
            where email = 'YOUR_ADMIN_EMAIL');`}
        </pre>
      </details>
    </div>
  );
}

/* ============================ complaint detail modal ============================ */

const NEXT_STEP: Record<string, { to: ComplaintStatus; label: string }> = {
  assigned: { to: "in_progress", label: "Start work" },
  in_progress: { to: "resolved", label: "Mark resolved" },
};

function ComplaintModal(props: {
  c: ComplaintRow;
  departments: DepartmentRow[];
  deptName: (id: string | null) => string | null;
  role: Role | null;
  userId: string | null;
  onClose: () => void;
  onApplied: (id: string, patch: Partial<ComplaintRow>) => void;
  notify: (tone: "ok" | "err", text: string) => void;
}) {
  const { c, departments, deptName, role, userId, onClose, onApplied, notify } = props;
  const routing = useMemo(() => readRouting(c.routing_candidates), [c.routing_candidates]);
  const breakdown = useMemo(() => readBreakdown(c.score_breakdown), [c.score_breakdown]);
  const loc = useMemo(() => parseLocation(c.location), [c.location]);

  const [deptId, setDeptId] = useState<string>(c.final_department_id ?? c.suggested_department_id ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canRoute = role === "admin" && ROUTABLE_STATUSES.includes(c.status);
  const isOverride = !!deptId && deptId !== c.suggested_department_id;
  const next = NEXT_STEP[c.status];
  const duration = c.ai_duration_days ?? c.duration_input_days;

  async function run(patch: Partial<ComplaintRow>, note: string, successText: string) {
    setBusy(true);
    setErr(null);
    try {
      const { data, error } = await supabase.from("complaints").update(patch).eq("id", c.id).select("id");
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        throw new Error("Update blocked: your account is not allowed to change this complaint.");
      }
      if (patch.status && patch.status !== c.status) {
        const { error: hErr } = await db.from("status_history").insert({
          complaint_id: c.id,
          from_status: c.status,
          to_status: patch.status,
          actor_type: role === "admin" ? "admin" : "officer",
          actor_id: userId,
          note: note.slice(0, 500),
        });
        if (hErr) console.error("status_history insert failed:", hErr.message);
      }
      onApplied(c.id, patch);
      notify("ok", successText);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  function approveOrOverride() {
    if (!deptId) return;
    const target = deptName(deptId) ?? "selected department";
    if (isOverride) {
      const was = deptName(c.suggested_department_id) ?? "no suggestion";
      void run(
        { final_department_id: deptId, status: "assigned", routing_status: "overridden" },
        `Override: ${was} → ${target}. Reason: ${reason.trim()}`,
        `${c.ref_code} reassigned to ${target} (override logged)`
      );
    } else {
      void run(
        { final_department_id: deptId, status: "assigned" },
        `Approved AI suggestion: ${target}`,
        `${c.ref_code} approved → ${target}`
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Complaint ${c.ref_code}`}
    >
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <p className="font-mono text-xl font-bold text-slate-900">{c.ref_code}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={c.status} />
              <BandBadge band={c.priority_band} score={c.priority_score} />
              {isOverdue(c) && <Badge className="bg-red-600 text-white ring-red-700">SLA overdue</Badge>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {/* summary */}
          <div>
            {c.ai_summary && <p className="text-sm font-medium text-slate-900">{c.ai_summary}</p>}
            {c.raw_text && (
              <blockquote
                lang={c.input_language === "hi" ? "hi" : undefined}
                className="mt-2 rounded-lg border-l-4 border-slate-300 bg-slate-50 p-3 text-sm text-slate-700"
              >
                {c.raw_text}
              </blockquote>
            )}
          </div>

          {/* facts */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Field label="Category">
              {c.category ? CATEGORY_LABEL[c.category] ?? human(c.category) : "—"}
              {c.issue_type && <span className="block text-xs text-slate-500">{human(c.issue_type)}</span>}
            </Field>
            <Field label="Severity">
              {c.severity ? <Badge className={SEVERITY_STYLE[c.severity] ?? ""}>{c.severity}</Badge> : "—"}
            </Field>
            <Field label="Safety risk">
              {c.safety_risk ?? "—"}
              {c.safety_risk_reason && <span className="block text-xs text-slate-500">{c.safety_risk_reason}</span>}
            </Field>
            <Field label="Affected scale">{c.affected_scale ? human(c.affected_scale) : "—"}</Field>
            <Field label="Duration">{duration != null ? `${duration} day(s)` : "Unknown"}</Field>
            <Field label="AI confidence (category)">{pct(c.ai_confidence)}</Field>
            <Field label="Location">
              {loc ? (
                <span className="font-mono text-xs">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </span>
              ) : (
                "Not provided"
              )}
              <span className="block text-xs text-slate-500">source: {c.location_source}</span>
            </Field>
            <Field label="Jurisdictions">{routing.matched.length ? routing.matched.join(" · ") : "None / unknown area"}</Field>
            <Field label="Reports merged">{c.report_count}</Field>
          </dl>

          {/* routing explanation */}
          <div className="rounded-xl border border-slate-200 p-4">
            <h4 className="text-sm font-bold text-slate-900">Routing explanation</h4>
            <p className="mt-1 text-sm text-slate-700">
              Current department: <b>{deptName(c.final_department_id) ?? "not assigned"}</b>
              {c.suggested_department_id && (
                <>
                  {" "}
                  · AI suggestion: <b>{deptName(c.suggested_department_id)}</b>
                </>
              )}{" "}
              · routing confidence <b>{pct(c.routing_confidence)}</b>
            </p>
            {routing.reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
                {routing.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            {routing.candidates.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {routing.candidates.map((cand, i) => (
                  <button
                    key={cand.departmentId + i}
                    type="button"
                    disabled={!canRoute}
                    onClick={() => setDeptId(cand.departmentId)}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                      deptId === cand.departmentId
                        ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700"
                        : "border-slate-200 hover:bg-slate-50"
                    } ${canRoute ? "" : "cursor-default"}`}
                  >
                    <span className="block font-semibold text-slate-900">
                      Candidate {i + 1}: {cand.name}
                    </span>
                    {cand.note && <span className="block text-slate-500">{cand.note}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* score breakdown */}
          {breakdown && c.priority_band && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="text-sm font-bold text-slate-900">Priority score (rule-based)</h4>
              <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {breakdown.factors.map((f) => (
                  <div
                    key={f.key}
                    className={FACTOR_COLOR[f.key] ?? "bg-slate-400"}
                    style={{ width: `${Math.max(0, f.contribution)}%` }}
                    title={`${FACTOR_LABEL[f.key] ?? f.key}: +${f.contribution.toFixed(1)}`}
                  />
                ))}
                {breakdown.recurrence_boost > 0 && (
                  <div className="bg-slate-700" style={{ width: `${breakdown.recurrence_boost}%` }} title="Recurrence boost" />
                )}
              </div>
              <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {breakdown.factors.map((f) => (
                  <li key={f.key} className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${FACTOR_COLOR[f.key] ?? "bg-slate-400"}`} />
                      <span className="font-medium text-slate-800">{FACTOR_LABEL[f.key] ?? human(f.key)}</span>
                      <span className="text-slate-500">{human(f.input)}</span>
                    </span>
                    <span className="font-mono">+{f.contribution.toFixed(1)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-right text-xs font-semibold text-slate-700">
                Base {breakdown.base_score}
                {breakdown.recurrence_boost > 0 && ` + recurrence ${breakdown.recurrence_boost}`} = {breakdown.score}/100
              </p>
            </div>
          )}

          {/* actions */}
          {c.status === "needs_info" && (
            <p className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
              Waiting for the citizen to provide a location
              {c.follow_up_question ? `: “${c.follow_up_question}”` : "."}
            </p>
          )}

          {canRoute && (
            <div className="rounded-xl border-2 border-blue-900/20 bg-blue-50/50 p-4">
              <h4 className="text-sm font-bold text-blue-950">
                {c.status === "pending_verification" ? "Verify routing" : "Assign manually"}
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="assign-dept" className="block text-xs font-semibold text-slate-700">
                    Department
                  </label>
                  <select
                    id="assign-dept"
                    value={deptId}
                    onChange={(e) => setDeptId(e.target.value)}
                    disabled={busy}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select department…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name_en}
                        {d.id === c.suggested_department_id ? " (AI suggestion)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="assign-reason" className="block text-xs font-semibold text-slate-700">
                    Reason {isOverride ? "(required for override)" : "(optional)"}
                  </label>
                  <input
                    id="assign-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={busy}
                    placeholder="e.g. Boundary confirmed on site"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={approveOrOverride}
                  disabled={busy || !deptId || (isOverride && reason.trim().length < 3)}
                  className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Saving…" : isOverride ? "Override & assign" : "Approve suggestion"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run({ status: "rejected" }, "Marked as spam / invalid by admin", `${c.ref_code} rejected as invalid`)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Reject as spam
                </button>
              </div>
            </div>
          )}

          {next && (role === "admin" || role === "department_officer") && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                Department: <b>{deptName(c.final_department_id) ?? "—"}</b>
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void run({ status: next.to }, `Status advanced to ${STATUS_LABEL[next.to]}`, `${c.ref_code} → ${STATUS_LABEL[next.to]}`)
                }
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {busy ? "Saving…" : next.label}
              </button>
            </div>
          )}

          {err && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
              {err}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================= tab 2: live feed ============================= */

type FilterKey = "all" | "queue" | "info" | "active" | "done";
const FILTERS: { key: FilterKey; label: string; test: (r: ComplaintRow) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "queue", label: "Needs verification", test: (r) => r.status === "pending_verification" },
  { key: "info", label: "Needs info", test: (r) => r.status === "needs_info" },
  { key: "active", label: "Active", test: (r) => r.status === "assigned" || r.status === "in_progress" },
  { key: "done", label: "Resolved", test: (r) => r.status === "resolved" },
];

function QueuePanel(props: {
  rows: ComplaintRow[];
  loading: boolean;
  error: string | null;
  departments: DepartmentRow[];
  deptName: (id: string | null) => string | null;
  role: Role | null;
  userId: string | null;
  patchLocal: (id: string, patch: Partial<ComplaintRow>) => void;
  notify: (tone: "ok" | "err", text: string) => void;
}) {
  const { rows, loading, error, departments, deptName, role, userId, patchLocal, notify } = props;
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"priority" | "newest">("priority");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const out = {} as Record<FilterKey, number>;
    for (const f of FILTERS) out[f.key] = rows.filter(f.test).length;
    return out;
  }, [rows]);

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0];
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        f.test(r) &&
        (!q ||
          r.ref_code.toLowerCase().includes(q) ||
          (r.ai_summary ?? "").toLowerCase().includes(q) ||
          (r.raw_text ?? "").toLowerCase().includes(q))
    );
    const byNewest = (a: ComplaintRow, b: ComplaintRow) => +new Date(b.created_at) - +new Date(a.created_at);
    return [...list].sort(
      sort === "priority" ? (a, b) => (b.priority_score ?? -1) - (a.priority_score ?? -1) || byNewest(a, b) : byNewest
    );
  }, [rows, filter, query, sort]);

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const hot = f.key === "queue" && counts.queue > 0;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-blue-900 text-white"
                    : hot
                      ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300 hover:bg-amber-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20" : "bg-white/70"}`}>
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ref, text…"
            className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 sm:w-52"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "priority" | "newest")}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            aria-label="Sort"
          >
            <option value="priority">Sort: Priority</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>
      </div>

      {error && (
        <p className="m-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
          Could not load complaints: {error}
        </p>
      )}

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Complaint (AI summary · original)</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && rows.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              : visible.map((r) => {
                  const needsAction = r.status === "pending_verification";
                  const finalName = deptName(r.final_department_id);
                  const suggestedName = deptName(r.suggested_department_id);
                  const actionLabel =
                    needsAction && role === "admin"
                      ? "Approve / Override"
                      : r.status === "needs_info" && role === "admin"
                        ? "Assign"
                        : "Details";
                  return (
                    <tr key={r.id} className="align-top hover:bg-slate-50/70">
                      <td className={`border-l-4 px-4 py-3 ${needsAction ? "border-amber-400" : "border-transparent"}`}>
                        <p className="font-mono text-sm font-bold text-slate-900">{r.ref_code}</p>
                        <p className="text-xs text-slate-500">{timeAgo(r.created_at)}</p>
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <p className="line-clamp-2 font-medium text-slate-900">{r.ai_summary ?? "Awaiting AI analysis…"}</p>
                        {r.raw_text && (
                          <p
                            lang={r.input_language === "hi" ? "hi" : undefined}
                            className="mt-0.5 line-clamp-1 text-xs text-slate-500"
                          >
                            <span className="mr-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-bold text-slate-600">
                              {LANG_LABEL[r.input_language ?? "other"] ?? "—"}
                            </span>
                            {r.raw_text}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{r.category ? CATEGORY_LABEL[r.category] ?? human(r.category) : "—"}</p>
                        {r.severity && (
                          <Badge className={`mt-1 ${SEVERITY_STYLE[r.severity] ?? ""}`}>{r.severity}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {finalName ? (
                          <span className="text-slate-900">{finalName}</span>
                        ) : suggestedName ? (
                          <span className="text-amber-800">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide">Suggested</span>
                            {suggestedName}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <BandBadge band={r.priority_band} score={r.priority_score} />
                        {isOverdue(r) && <p className="mt-1 text-[11px] font-semibold text-red-600">SLA overdue</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                            needsAction && role === "admin"
                              ? "bg-blue-900 text-white hover:bg-blue-800"
                              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {actionLabel}
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>

        {!loading && visible.length === 0 && (
          <div className="px-4 py-14 text-center">
            <p className="text-sm font-semibold text-slate-700">No complaints match this view</p>
            <p className="mt-1 text-xs text-slate-500">Submit one from the “Citizen Submission” tab and it will appear here live.</p>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
        Showing {visible.length} of {rows.length} complaints · updates live
      </div>

      {selected && (
        <ComplaintModal
          key={selected.id}
          c={selected}
          departments={departments}
          deptName={deptName}
          role={role}
          userId={userId}
          onClose={() => setSelectedId(null)}
          onApplied={patchLocal}
          notify={notify}
        />
      )}
    </section>
  );
}

/* ============================== tab 3: map ============================== */

type ColorBy = "priority" | "severity";
type ViewMode = "markers" | "clusters" | "heat";
type PlotItem = { id: string; lat: number; lng: number; row: ComplaintRow };

const ZONES: { name: string; color: string; fill: number; bounds: L.LatLngBoundsLiteral }[] = [
  { name: "Demo Ward 1 – Central Lucknow", color: "#2563eb", fill: 0.05, bounds: [[26.82, 80.9], [26.89, 80.98]] },
  { name: "Demo Cantonment Zone", color: "#7c3aed", fill: 0.05, bounds: [[26.79, 80.965], [26.85, 81.025]] },
  { name: "Disputed strip (ward / cantonment) → verification", color: "#dc2626", fill: 0.14, bounds: [[26.82, 80.965], [26.85, 80.98]] },
];

function colorOf(r: ComplaintRow, by: ColorBy): string {
  const hex = by === "priority" ? BAND_HEX[r.priority_band ?? ""] : SEVERITY_HEX[r.severity ?? ""];
  return hex ?? "#64748b";
}
function rankOf(r: ComplaintRow, by: ColorBy): number {
  return by === "priority" ? (r.priority_score ?? -1) : (SEVERITY_RANK[r.severity ?? ""] ?? 0);
}

function FitToPoints({ pts }: { pts: [number, number][] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || pts.length === 0) return;
    done.current = true;
    map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15 });
  }, [pts, map]);
  return null;
}

function PointMarker({
  item,
  colorBy,
  deptLabel,
}: {
  item: PlotItem;
  colorBy: ColorBy;
  deptLabel: (r: ComplaintRow) => string;
}) {
  const r = item.row;
  const w = (r.priority_score ?? 30) / 100;
  return (
    <CircleMarker
      center={[item.lat, item.lng]}
      radius={7 + w * 6}
      pathOptions={{ color: "#ffffff", weight: 2, fillColor: colorOf(r, colorBy), fillOpacity: 0.95 }}
    >
      <Popup>
        <div className="min-w-[200px] max-w-[260px] space-y-1.5 text-xs">
          <p className="font-mono text-sm font-bold text-slate-900">{r.ref_code}</p>
          {r.ai_summary && <p className="text-slate-700">{r.ai_summary}</p>}
          <div className="flex flex-wrap gap-1">
            <StatusBadge status={r.status} />
            <BandBadge band={r.priority_band} score={r.priority_score} />
          </div>
          <p className="text-slate-600">
            {r.category ? CATEGORY_LABEL[r.category] ?? human(r.category) : "—"}
            {r.severity ? ` · ${r.severity}` : ""}
          </p>
          <p className="text-slate-600">Dept: {deptLabel(r)}</p>
        </div>
      </Popup>
    </CircleMarker>
  );
}

function ClusterLayer({
  items,
  colorBy,
  deptLabel,
}: {
  items: PlotItem[];
  colorBy: ColorBy;
  deptLabel: (r: ComplaintRow) => string;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });

  const groups = useMemo(() => {
    const cells = new Map<string, PlotItem[]>();
    for (const it of items) {
      const p = map.project(L.latLng(it.lat, it.lng), zoom);
      const key = `${Math.floor(p.x / 64)}:${Math.floor(p.y / 64)}`;
      const arr = cells.get(key);
      if (arr) arr.push(it);
      else cells.set(key, [it]);
    }
    return Array.from(cells.entries()).map(([key, list]) => ({ key, list }));
  }, [items, zoom, map]);

  return (
    <>
      {groups.map(({ key, list }) => {
        if (list.length === 1) {
          return <PointMarker key={list[0].id} item={list[0]} colorBy={colorBy} deptLabel={deptLabel} />;
        }
        const lat = list.reduce((s, x) => s + x.lat, 0) / list.length;
        const lng = list.reduce((s, x) => s + x.lng, 0) / list.length;
        const dominant = list.reduce((a, b) => (rankOf(b.row, colorBy) > rankOf(a.row, colorBy) ? b : a)).row;
        const size = Math.round(Math.min(58, 32 + Math.log2(list.length) * 7));
        const icon = L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          html: `<div class="flex items-center justify-center rounded-full text-sm font-bold text-white shadow-lg ring-4 ring-white/70" style="width:${size}px;height:${size}px;background:${colorOf(dominant, colorBy)}">${list.length}</div>`,
        });
        return (
          <Marker
            key={`cluster-${key}`}
            position={[lat, lng]}
            icon={icon}
            eventHandlers={{
              click: () => {
                const pts = list.map((x) => L.latLng(x.lat, x.lng));
                const b = L.latLngBounds(pts);
                if (b.getNorthEast().equals(b.getSouthWest())) map.setView([lat, lng], Math.min(map.getZoom() + 3, 18));
                else map.fitBounds(b, { padding: [60, 60], maxZoom: 17 });
              },
            }}
          />
        );
      })}
    </>
  );
}

function HeatLayer({ items }: { items: PlotItem[] }) {
  return (
    <>
      {items.map((it) => {
        const w = (it.row.priority_score ?? 30) / 100;
        return (
          <span key={it.id}>
            <CircleMarker
              center={[it.lat, it.lng]}
              radius={40}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: "#ef4444", fillOpacity: 0.07 + 0.08 * w }}
            />
            <CircleMarker
              center={[it.lat, it.lng]}
              radius={24}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: "#ef4444", fillOpacity: 0.1 + 0.1 * w }}
            />
            <CircleMarker
              center={[it.lat, it.lng]}
              radius={11}
              interactive={false}
              pathOptions={{ stroke: false, fillColor: "#b91c1c", fillOpacity: 0.16 + 0.14 * w }}
            />
          </span>
        );
      })}
    </>
  );
}

function MapPanel({ rows, deptLabel }: { rows: ComplaintRow[]; deptLabel: (r: ComplaintRow) => string }) {
  const [view, setView] = useState<ViewMode>("markers");
  const [colorBy, setColorBy] = useState<ColorBy>("priority");
  const [showZones, setShowZones] = useState(true);

  const items = useMemo<PlotItem[]>(() => {
    const out: PlotItem[] = [];
    for (const r of rows) {
      const p = parseLocation(r.location);
      if (p) out.push({ id: r.id, lat: p.lat, lng: p.lng, row: r });
    }
    return out;
  }, [rows]);
  const pts = useMemo<[number, number][]>(() => items.map((i) => [i.lat, i.lng]), [items]);
  const legend = colorBy === "priority" ? BAND_HEX : SEVERITY_HEX;

  const VIEWS: { key: ViewMode; label: string }[] = [
    { key: "markers", label: "Markers" },
    { key: "clusters", label: "Clusters" },
    { key: "heat", label: "Heat" },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="inline-flex rounded-lg bg-slate-100 p-1" role="group" aria-label="Map view">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                view === v.key ? "bg-blue-900 text-white shadow" : "text-slate-700 hover:bg-white"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-700">
          <label className="flex items-center gap-2">
            <span className="font-semibold">Colour by</span>
            <select
              value={colorBy}
              onChange={(e) => setColorBy(e.target.value as ColorBy)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
            >
              <option value="priority">Priority band</option>
              <option value="severity">Severity</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
            <span className="font-semibold">Jurisdictions (demo)</span>
          </label>
          <span className="text-slate-500">
            {items.length} plotted · {rows.length - items.length} without location
          </span>
        </div>
      </div>

      <div className="relative isolate overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <MapContainer center={LUCKNOW} zoom={12} className="h-[560px] w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToPoints pts={pts} />

          {showZones &&
            ZONES.map((z) => (
              <Rectangle
                key={z.name}
                bounds={z.bounds}
                pathOptions={{ color: z.color, weight: 1.5, dashArray: "6 4", fillColor: z.color, fillOpacity: z.fill }}
              >
                <Tooltip sticky>{z.name}</Tooltip>
              </Rectangle>
            ))}

          {view === "markers" &&
            items.map((it) => <PointMarker key={it.id} item={it} colorBy={colorBy} deptLabel={deptLabel} />)}
          {view === "clusters" && <ClusterLayer items={items} colorBy={colorBy} deptLabel={deptLabel} />}
          {view === "heat" && <HeatLayer items={items} />}
        </MapContainer>

        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg bg-white/95 p-3 text-xs shadow-lg ring-1 ring-slate-200">
          <p className="mb-1.5 font-bold text-slate-800">
            {view === "heat" ? "Complaint density (weighted by priority)" : colorBy === "priority" ? "Priority band" : "Severity"}
          </p>
          {view !== "heat" && (
            <ul className="space-y-1">
              {Object.entries(legend).map(([k, hex]) => (
                <li key={k} className="flex items-center gap-2 capitalize text-slate-700">
                  <span className="inline-block h-3 w-3 rounded-full ring-2 ring-white" style={{ background: hex }} />
                  {k}
                </li>
              ))}
              <li className="flex items-center gap-2 text-slate-700">
                <span className="inline-block h-3 w-3 rounded-full ring-2 ring-white" style={{ background: "#64748b" }} />
                Not scored
              </li>
            </ul>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Jurisdiction rectangles are hand-drawn demo boundaries, not official ward data. Complaints without a location
        (status “needs info”) are not plotted.
      </p>
    </section>
  );
}

/* ================================ dashboard ================================ */

export default function AdminDashboard({ tab, onTabChange }: { tab: TabKey; onTabChange: (t: TabKey) => void }) {
  const session = useStaffSession();
  const isStaff = session.role === "admin" || session.role === "department_officer";
  const { rows, loading, error, reload, patchLocal } = useComplaints(isStaff);
  const departments = useDepartments(isStaff);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const notify = useCallback((tone: "ok" | "err", text: string) => setToast({ tone, text }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // The citizen form stays mounted (so the result card survives tab switches);
  // nudge Leaflet to re-measure its container when the tab becomes visible again.
  useEffect(() => {
    if (tab !== "submit") return;
    const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
    return () => clearTimeout(t);
  }, [tab]);

  const deptById = useMemo(
    () => new Map<string, DepartmentRow>(departments.map((d) => [d.id, d] as [string, DepartmentRow])),
    [departments]
  );
  const deptName = useCallback((id: string | null) => (id ? (deptById.get(id)?.name_en ?? "Unknown") : null), [deptById]);
  const deptLabel = useCallback(
    (r: ComplaintRow) => deptName(r.final_department_id) ?? (r.suggested_department_id ? `${deptName(r.suggested_department_id)} (suggested)` : "—"),
    [deptName]
  );

  const stats = useMemo(() => {
    const open = rows.filter((r) => !CLOSED_STATUSES.includes(r.status));
    const urgent = open.filter((r) => r.priority_band === "critical" || r.priority_band === "high");
    return {
      total: rows.length,
      resolved: rows.filter((r) => r.status === "resolved").length,
      open: open.length,
      verification: rows.filter((r) => r.status === "pending_verification").length,
      urgent: urgent.length,
      critical: urgent.filter((r) => r.priority_band === "critical").length,
      auto: rows.filter((r) => r.routing_status === "auto").length,
    };
  }, [rows]);

  const show = (n: number): string | number => (isStaff ? n : "—");
  const skeleton = isStaff && loading && rows.length === 0;
  const lockedCaption = "Staff sign-in required";

  return (
    <div className="space-y-5">
      {/* page toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Command Centre</h1>
          <p className="text-sm text-slate-600">
            From unstructured complaints to explainable, safely-routed government action.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.ready && session.userId && !session.anonymous && (
            <span className="hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200 sm:inline-flex">
              <span className="font-semibold">{session.email}</span>
              <Badge className="bg-blue-100 text-blue-800 ring-blue-200">{human(session.role ?? "citizen")}</Badge>
            </span>
          )}
          {isStaff && (
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Icon name="refresh" className="h-4 w-4" /> Refresh
            </button>
          )}
          {session.ready && session.userId && !session.anonymous && (
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total complaints"
          value={show(stats.total)}
          caption={isStaff ? `${stats.open} open · ${stats.resolved} resolved` : lockedCaption}
          icon="document"
          accent="blue"
          loading={skeleton}
        />
        <MetricCard
          title="Needs verification"
          value={show(stats.verification)}
          caption={isStaff ? "Awaiting human decision" : lockedCaption}
          icon="shield"
          accent="amber"
          loading={skeleton}
        />
        <MetricCard
          title="Critical / High priority"
          value={show(stats.urgent)}
          caption={isStaff ? `${stats.critical} critical · ${stats.urgent - stats.critical} high (open)` : lockedCaption}
          icon="warning"
          accent="red"
          loading={skeleton}
        />
        <MetricCard
          title="Auto-routed"
          value={show(stats.auto)}
          caption={
            isStaff
              ? `${stats.total ? Math.round((stats.auto / stats.total) * 100) : 0}% of all · AI confidence ≥ 80%`
              : lockedCaption
          }
          icon="bolt"
          accent="green"
          loading={skeleton}
        />
      </div>

      {/* tabs */}
      <div role="tablist" aria-label="Dashboard sections" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t.key)}
              className={`flex min-w-fit flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                active ? "bg-blue-900 text-white shadow" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon name={t.icon} className="h-4 w-4" />
              {t.label}
              {t.key === "queue" && isStaff && stats.verification > 0 && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-amber-950">
                  {stats.verification}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* tab 1: citizen submission (stays mounted so the result card persists) */}
      <div className={tab === "submit" ? "relative isolate" : "hidden"}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <ReportForm />
          </div>
          <aside className="space-y-4 lg:pt-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900">What happens after you submit</h3>
              <ol className="mt-3 space-y-3 text-sm text-slate-700">
                {[
                  ["Extract", "Gemini turns free text (Hindi / English / Hinglish) into structured fields."],
                  ["Locate", "Your pin is matched to jurisdictions with PostGIS."],
                  ["Route", "Rules pick the department. Unsure cases go to a human."],
                  ["Score", "Priority is computed by transparent rules, not guessed."],
                  ["Track", "Status history is logged until the issue is resolved."],
                ].map(([title, text], i) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span>
                      <b className="text-slate-900">{title}.</b> {text}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <b>Try the demo scenarios:</b> no pin → asks a follow-up; “Cantonment” pin → Cantonment Board;
              “Disputed Strip” pin → verification queue.
            </div>
          </aside>
        </div>
      </div>

      {/* tab 2 */}
      {tab === "queue" &&
        (isStaff ? (
          <QueuePanel
            rows={rows}
            loading={loading}
            error={error}
            departments={departments}
            deptName={deptName}
            role={session.role}
            userId={session.userId}
            patchLocal={patchLocal}
            notify={notify}
          />
        ) : (
          <StaffGate session={session} />
        ))}

      {/* tab 3 */}
      {tab === "map" && (isStaff ? <MapPanel rows={rows} deptLabel={deptLabel} /> : <StaffGate session={session} />)}

      {/* toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl ${
            toast.tone === "ok" ? "bg-emerald-700" : "bg-red-700"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/* ================================= types ================================= */

type Pin = { lat: number; lng: number; source: "gps" | "map_pin" };
type Band = "low" | "medium" | "high" | "critical";

type ScoreFactor = {
  key: string; // safety_risk | severity | affected_scale | duration | location_sensitivity
  input: string;
  factor: number; // 0..1
  weight: number;
  contribution: number; // 100 * weight * factor
};

type ScoreBreakdown = {
  factors: ScoreFactor[];
  base_score: number;
  recurrence_boost: number;
  score: number;
  band: Band;
};

// Mirrors the JSON returned by supabase/functions/triage-complaint
type TriageResult = {
  complaint_id: string;
  ref_code: string;
  status: string;
  is_valid: boolean;
  rejection_reason: string | null;
  language: string;
  category: string;
  issue_type: string;
  severity: string;
  safety_risk: string;
  affected_scale: string;
  ai_summary: string;
  ai_confidence: number;
  used_fallback: boolean;
  priority_score: number | null;
  priority_band: Band | null;
  score_breakdown: ScoreBreakdown | null;
  routing_status: string;
  routing_confidence: number | null;
  routing_reasons: string[];
  suggested_department: { code: string; name_en: string; name_hi: string | null } | null;
  matched_jurisdictions: string[];
  follow_up_question: string | null;
  duplicate_of_ref: string | null;
  sla_due_at: string | null;
};

/* ============================== configuration ============================== */

const LUCKNOW: [number, number] = [26.85, 80.94];
const MAX_CHARS = 2000;
const MIN_CHARS = 10;

const DURATION_OPTIONS: { key: string; label: string; days: number | null }[] = [
  { key: "unknown", label: "Not sure", days: null },
  { key: "today", label: "Started today", days: 0 },
  { key: "1-3d", label: "1–3 days", days: 2 },
  { key: "4-7d", label: "4–7 days", days: 6 },
  { key: "1-4w", label: "1–4 weeks", days: 14 },
  { key: "gt1m", label: "More than a month", days: 45 },
];

// DEMO pins that fall inside the polygons seeded by 0002_seed.sql
const DEMO_PINS: { label: string; lat: number; lng: number }[] = [
  { label: "Demo Pin: Ward", lat: 26.85, lng: 80.94 },
  { label: "Demo Pin: Cantonment", lat: 26.81, lng: 80.99 },
  { label: "Demo Pin: Disputed Strip", lat: 26.835, lng: 80.972 },
];

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#dc2626;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);transform:rotate(-45deg)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

/* ============================ display dictionaries ============================ */

const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  needs_info: "More information needed",
  pending_verification: "Pending verification",
  pending_assignment: "Pending assignment",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  duplicate: "Merged as duplicate",
  rejected: "Rejected",
};

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-700 ring-gray-200",
  needs_info: "bg-violet-100 text-violet-800 ring-violet-200",
  pending_verification: "bg-amber-100 text-amber-800 ring-amber-200",
  pending_assignment: "bg-amber-100 text-amber-800 ring-amber-200",
  assigned: "bg-blue-100 text-blue-800 ring-blue-200",
  in_progress: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  resolved: "bg-green-100 text-green-800 ring-green-200",
  duplicate: "bg-gray-200 text-gray-700 ring-gray-300",
  rejected: "bg-gray-200 text-gray-700 ring-gray-300",
};

const CATEGORY_LABEL: Record<string, string> = {
  garbage: "Garbage",
  pothole: "Pothole / Road",
  drainage_sewer: "Drainage & Sewer",
  water_leakage: "Water Leakage",
  streetlight: "Streetlight",
  other: "Other",
};

const SEVERITY_STYLE: Record<string, string> = {
  minor: "bg-green-100 text-green-800 ring-green-200",
  moderate: "bg-amber-100 text-amber-800 ring-amber-200",
  major: "bg-orange-100 text-orange-800 ring-orange-200",
  severe: "bg-red-100 text-red-800 ring-red-200",
};

const BAND_STYLE: Record<Band, string> = {
  low: "bg-green-100 text-green-800 ring-green-200",
  medium: "bg-amber-100 text-amber-800 ring-amber-200",
  high: "bg-orange-100 text-orange-800 ring-orange-200",
  critical: "bg-red-100 text-red-800 ring-red-200",
};

const BAND_BAR: Record<Band, string> = {
  low: "bg-green-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-600",
};

const FACTOR_LABEL: Record<string, string> = {
  safety_risk: "Safety",
  severity: "Severity",
  affected_scale: "Scale",
  duration: "Duration",
  location_sensitivity: "Sensitive Place",
};

const FACTOR_COLOR: Record<string, string> = {
  safety_risk: "bg-red-500",
  severity: "bg-orange-500",
  affected_scale: "bg-amber-500",
  duration: "bg-sky-500",
  location_sensitivity: "bg-violet-500",
};

const human = (s: string) => s.replace(/_/g, " ");
const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);

/* ============================ backend helpers ============================ */

async function ensureSession(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  // Demo convenience: anonymous citizen session.
  // Requires Supabase → Authentication → Sign In / Providers → "Allow anonymous sign-ins".
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error || !anon.user) {
    throw new Error(
      `Not signed in, and anonymous sign-in failed (${error?.message ?? "unknown error"}). ` +
        `Enable "Allow anonymous sign-ins" in Supabase Auth settings.`
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
      /* fall through to message */
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "Unknown error";
}

async function runTriage(complaintId: string): Promise<TriageResult> {
  const { data, error } = await supabase.functions.invoke<TriageResult>("triage-complaint", {
    body: { complaint_id: complaintId },
  });
  if (error || !data) throw new Error(await readFunctionError(error));
  return data;
}

/* ================================ map pieces ================================ */

function ClickToPin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToPin({ pin }: { pin: Pin | null }) {
  const map = useMap();
  useEffect(() => {
    if (!pin) return;
    const ll = L.latLng(pin.lat, pin.lng);
    if (!map.getBounds().contains(ll)) map.setView(ll, Math.max(map.getZoom(), 14));
  }, [pin, map]);
  return null;
}

/* ============================== small UI pieces ============================== */

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      {children}
    </span>
  );
}

/* ================================ result card ================================ */

function ResultCard({
  r,
  onEdit,
  onNew,
}: {
  r: TriageResult;
  onEdit: () => void;
  onNew: () => void;
}) {
  const bd = r.score_breakdown;
  const band = r.priority_band;
  const isAuto = r.routing_status === "auto";
  const isPending = r.routing_status === "needs_verification";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm" aria-live="polite">
      {/* header: reference code + status */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Reference ID</p>
          <p className="font-mono text-2xl font-bold text-gray-900">{r.ref_code}</p>
        </div>
        <Badge className={STATUS_STYLE[r.status] ?? STATUS_STYLE.submitted}>
          {STATUS_LABEL[r.status] ?? human(r.status)}
        </Badge>
      </div>

      {r.ai_summary && <p className="mt-3 text-sm text-gray-700">{r.ai_summary}</p>}

      {/* badges: category, severity, priority */}
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="bg-slate-100 text-slate-800 ring-slate-200">
          {CATEGORY_LABEL[r.category] ?? human(r.category)} · {human(r.issue_type)}
        </Badge>
        <Badge className={SEVERITY_STYLE[r.severity] ?? SEVERITY_STYLE.moderate}>Severity: {r.severity}</Badge>
        {band && r.priority_score != null ? (
          <Badge className={BAND_STYLE[band]}>
            Priority: {band.toUpperCase()} ({r.priority_score}/100)
          </Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-600 ring-gray-200">Not scored</Badge>
        )}
      </div>

      {/* needs_info follow-up banner */}
      {r.status === "needs_info" && (
        <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900" role="status">
          <p className="font-semibold">We need one more detail before routing this</p>
          <p className="mt-1">
            {r.follow_up_question ??
              "Please tell us the exact location (street name or nearby landmark) or drop a pin on the map."}
          </p>
          <button
            type="button"
            onClick={onEdit}
            className="mt-3 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
          >
            Add a map pin &amp; resubmit
          </button>
        </div>
      )}

      {/* rejected */}
      {r.status === "rejected" && (
        <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          This was not accepted as a civic complaint{r.rejection_reason ? `: ${r.rejection_reason}` : "."}
        </p>
      )}

      {/* duplicate */}
      {r.duplicate_of_ref && (
        <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          A similar open complaint nearby already exists (
          <span className="font-mono">{r.duplicate_of_ref}</span>). Yours was linked to it, which raises its
          priority.
        </p>
      )}

      {/* explainable priority breakdown */}
      {bd && band && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-900">Why this priority? (rule-based score)</h3>

          {/* stacked total bar: each segment = that factor's points out of 100 */}
          <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full bg-gray-100" title="Score out of 100">
            {bd.factors.map((f) => (
              <div
                key={f.key}
                className={FACTOR_COLOR[f.key] ?? "bg-gray-400"}
                style={{ width: `${Math.max(0, f.contribution)}%` }}
                title={`${FACTOR_LABEL[f.key] ?? f.key}: +${f.contribution.toFixed(1)}`}
              />
            ))}
            {bd.recurrence_boost > 0 && (
              <div className="bg-gray-700" style={{ width: `${bd.recurrence_boost}%` }} title="Recurrence boost" />
            )}
          </div>

          {/* per-factor bars */}
          <ul className="mt-3 space-y-2.5">
            {bd.factors.map((f) => (
              <li key={f.key}>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1.5">
                    <span className={`inline-block h-2.5 w-2.5 rounded-sm ${FACTOR_COLOR[f.key] ?? "bg-gray-400"}`} />
                    <span className="font-medium text-gray-800">{FACTOR_LABEL[f.key] ?? human(f.key)}</span>
                    <span className="text-gray-500">— {human(f.input)}</span>
                  </span>
                  <span className="font-mono">
                    +{f.contribution.toFixed(1)} <span className="text-gray-400">(weight {f.weight})</span>
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${BAND_BAR[band]}`}
                    style={{ width: `${Math.max(2, Math.round(f.factor * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
            <span>
              Base score {bd.base_score}
              {bd.recurrence_boost > 0 && ` + recurrence boost ${bd.recurrence_boost}`}
            </span>
            <span className="font-mono font-semibold">Total {bd.score}/100</span>
          </div>
        </div>
      )}

      {/* routing */}
      <div className="mt-5 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Routing</h3>
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Suggested department</dt>
            <dd className="font-medium text-gray-900">{r.suggested_department?.name_en ?? "— none yet —"}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Routing status</dt>
            <dd className="mt-0.5">
              {isAuto && <Badge className="bg-blue-100 text-blue-800 ring-blue-200">Auto-suggested</Badge>}
              {isPending && (
                <Badge className="bg-amber-100 text-amber-800 ring-amber-200">Pending verification</Badge>
              )}
              {!isAuto && !isPending && (
                <Badge className="bg-gray-100 text-gray-600 ring-gray-200">Not routed yet</Badge>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">AI classification confidence</dt>
            <dd className="font-medium text-gray-900">
              {pct(r.ai_confidence)}
              {r.used_fallback && <span className="ml-1 text-xs text-amber-700">(keyword fallback)</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Routing confidence</dt>
            <dd className="font-medium text-gray-900">{pct(r.routing_confidence)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-500">Matched jurisdictions</dt>
            <dd className="text-gray-900">
              {r.matched_jurisdictions.length ? r.matched_jurisdictions.join(" · ") : "None (unknown area)"}
            </dd>
          </div>
        </dl>

        {r.routing_reasons.length > 0 && (
          <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-gray-600">
            {r.routing_reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs text-gray-500">
          AI confidence describes how sure the model is about the category — it is separate from severity. Verify
          location/jurisdiction before final routing.
        </p>
      </div>

      <button
        type="button"
        onClick={onNew}
        className="mt-5 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
      >
        Report another issue
      </button>
    </section>
  );
}

/* ================================== form ================================== */

export default function ReportForm() {
  const [text, setText] = useState("");
  const [durationKey, setDurationKey] = useState("unknown");
  const [pin, setPin] = useState<Pin | null>(null);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryId, setRetryId] = useState<{ id: string; ref: string } | null>(null);
  const [result, setResult] = useState<TriageResult | null>(null);

  const durationDays = DURATION_OPTIONS.find((o) => o.key === durationKey)?.days ?? null;

  function useMyLocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser does not support location access. Click the map to drop a pin instead.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: "gps" });
        setGeoBusy(false);
      },
      () => {
        setError("Could not get your location. Click the map to drop a pin instead.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRetryId(null);

    const trimmed = text.trim();
    if (trimmed.length < MIN_CHARS) {
      setError(`Please describe the problem in at least ${MIN_CHARS} characters.`);
      return;
    }
    if (trimmed.length > MAX_CHARS) {
      setError(`Description is too long (max ${MAX_CHARS} characters).`);
      return;
    }

    setBusy(true);
    let saved: { id: string; ref_code: string } | null = null;
    try {
      const userId = await ensureSession();

      const { data, error: insertError } = await supabase
        .from("complaints")
        .insert({
          citizen_id: userId,
          raw_text: trimmed,
          duration_input_days: durationDays,
          // geography column: EWKT string, order is POINT(lng lat)
          location: pin ? `SRID=4326;POINT(${pin.lng.toFixed(6)} ${pin.lat.toFixed(6)})` : null,
          location_source: pin ? pin.source : "none",
        })
        .select("id, ref_code")
        .single();

      if (insertError || !data) {
        throw new Error(`Could not save your complaint: ${insertError?.message ?? "unknown error"}`);
      }
      saved = data;

      const res = await runTriage(data.id);
      setResult(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      if (saved) {
        setError(`Your complaint ${saved.ref_code} was saved, but the analysis failed: ${msg}`);
        setRetryId({ id: saved.id, ref: saved.ref_code });
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    if (!retryId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await runTriage(retryId.id);
      setResult(res);
      setRetryId(null);
    } catch (err) {
      setError(`Retry failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  /** Back to the form but keep the text, so the citizen can just add a pin. */
  function editAndResubmit() {
    setResult(null);
    setError(null);
    setRetryId(null);
  }

  function startNew() {
    setText("");
    setDurationKey("unknown");
    setPin(null);
    setResult(null);
    setError(null);
    setRetryId(null);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Report a civic issue</h1>
        <p className="mt-1 text-sm text-gray-600">
          Describe the problem in English, Hindi (हिन्दी) or Hinglish. AI will extract the details, score the
          priority with transparent rules, and suggest the right department.
        </p>
      </header>

      {result ? (
        <ResultCard r={result} onEdit={editAndResubmit} onNew={startNew} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {/* description */}
          <div>
            <label htmlFor="desc" className="block text-sm font-medium text-gray-900">
              What is the problem?
            </label>
            <textarea
              id="desc"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_CHARS}
              rows={5}
              lang="hi"
              disabled={busy}
              placeholder="e.g. Hamari gali mein 5 din se sewer overflow ho raha hai.   /   मुख्य सड़क पर स्कूल के पास बड़ा गड्ढा है।"
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
            />
            <p className="mt-1 text-right text-xs text-gray-500">
              {text.length}/{MAX_CHARS}
            </p>
          </div>

          {/* duration */}
          <div>
            <label htmlFor="dur" className="block text-sm font-medium text-gray-900">
              How long has this been going on?
            </label>
            <select
              id="dur"
              value={durationKey}
              onChange={(e) => setDurationKey(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm disabled:bg-gray-50"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* map */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-900">Where is it? Click the map to drop a pin</span>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={busy || geoBusy}
                className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                {geoBusy ? "Locating…" : "Use my location"}
              </button>
            </div>

            <div className="mt-2 overflow-hidden rounded-lg border border-gray-300" style={{ height: 320 }}>
              <MapContainer center={LUCKNOW} zoom={12} style={{ height: "100%", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickToPin onPick={(lat, lng) => !busy && setPin({ lat, lng, source: "map_pin" })} />
                <FlyToPin pin={pin} />
                {pin && (
                  <Marker
                    position={[pin.lat, pin.lng]}
                    icon={pinIcon}
                    draggable={!busy}
                    eventHandlers={{
                      dragend: (ev) => {
                        const ll = (ev.target as L.Marker).getLatLng();
                        setPin({ lat: ll.lat, lng: ll.lng, source: "map_pin" });
                      },
                    }}
                  />
                )}
              </MapContainer>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {pin
                ? `Pin: ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)} (${pin.source === "gps" ? "GPS" : "map pin"})`
                : "No pin set — without a location the AI will ask for one instead of guessing."}
            </p>

            {/* demo buttons */}
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
              <span className="font-semibold">Demo:</span>
              {DEMO_PINS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  disabled={busy}
                  onClick={() => setPin({ lat: d.lat, lng: d.lng, source: "map_pin" })}
                  className="rounded-md bg-white px-2 py-1 font-medium ring-1 ring-inset ring-amber-300 hover:bg-amber-100 disabled:opacity-50"
                >
                  {d.label}
                </button>
              ))}
              <button
                type="button"
                disabled={busy}
                onClick={() => setPin(null)}
                className="rounded-md bg-white px-2 py-1 font-medium ring-1 ring-inset ring-amber-300 hover:bg-amber-100 disabled:opacity-50"
              >
                No Pin
              </button>
            </div>
          </div>

          {/* errors */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
              <p>{error}</p>
              {retryId && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={busy}
                  className="mt-2 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Retry analysis for {retryId.ref}
                </button>
              )}
            </div>
          )}

          {/* submit */}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {busy ? "AI is analysing…" : "Analyze & Submit"}
          </button>
        </form>
      )}
    </main>
  );
}
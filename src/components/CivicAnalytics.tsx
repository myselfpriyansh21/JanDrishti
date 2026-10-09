import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BarChart3, AlertOctagon, CheckCircle2, TrendingUp } from "lucide-react";

export default function CivicAnalytics() {
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0,
    critical: 0,
  });

  useEffect(() => {
    fetchAggregates();
  }, []);

  async function fetchAggregates() {
    const { data: all } = await supabase.from("complaints").select("status, priority_band");
    if (!all) return;

    setStats({
      total: all.length,
      resolved: all.filter((c) => c.status === "resolved").length,
      pending: all.filter((c) => ["submitted", "needs_info", "pending_verification"].includes(c.status)).length,
      critical: all.filter((c) => c.priority_band === "critical").length,
    });
  }

  return (
    <div className="space-y-6">
      {/* Aggregated KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase font-bold text-slate-400">Total Workload</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase font-bold text-amber-600">Pending Triage</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase font-bold text-emerald-600">Successfully Resolved</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.resolved}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] uppercase font-bold text-red-600">Critical Incidents</span>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.critical}</p>
        </div>
      </div>

      {/* Analytical Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Departmental Responsiveness
          </h4>
          <div className="space-y-3 pt-2 text-xs">
            <div>
              <div className="flex justify-between mb-1 text-slate-600">
                <span>Nagar Nigam (Sanitation &amp; Waste)</span>
                <span className="font-semibold text-slate-900">82% on-time</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[82%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-slate-600">
                <span>PWD (Roadways Infrastructure)</span>
                <span className="font-semibold text-slate-900">64% on-time</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full w-[64%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-slate-600">
                <span>Jal Sansthan (Water &amp; Sewerage)</span>
                <span className="font-semibold text-slate-900">54% on-time</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[54%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Geographic Density Patterns
          </h4>
          <p className="text-xs text-slate-500">
            Detected recurring incidents clustered within 200m of sensitive municipal zones[cite: 1].
          </p>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between font-medium">
              <span className="text-slate-700">Sector 4 Pothole Cluster</span>
              <span className="text-red-700 font-bold">High Density</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Recurring drainage overflow linked to Cantonment boundary culvert obstruction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
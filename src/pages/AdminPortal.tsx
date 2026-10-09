import React from "react";
import AdminDashboard, { type TabKey } from "../components/AdminDashboard";

interface AdminPortalProps {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  userRole: string | null;
}

export default function AdminPortal({ tab, onTabChange, userRole }: AdminPortalProps) {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border border-slate-800 text-white shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Municipal Command Center</h2>
          <p className="text-xs text-slate-300 mt-1">
            Realtime Triage Stream, Spatial Clustering &amp; Human-in-the-Loop Override Dashboard[cite: 1]
          </p>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            RBAC: {userRole?.toUpperCase() ?? "STAFF"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <AdminDashboard tab={tab} onTabChange={onTabChange} />
      </div>
    </div>
  );
}
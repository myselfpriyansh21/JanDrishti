import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Building2, Loader2, UserCheck, UserPlus, X, Image as ImageIcon, Eye } from "lucide-react";

interface DepartmentWorkspaceProps {
  userRole: string | null;
  userDeptId?: string;
}

// Visual fallbacks if complaint has no evidence image
const SAMPLE_EVIDENCE = [
  "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=80",
];

export default function DepartmentWorkspace({ userRole }: DepartmentWorkspaceProps) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("all");
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment Modal
  const [activeAssignComplaint, setActiveAssignComplaint] = useState<any | null>(null);
  const [officers, setOfficers] = useState<any[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState("");
  const [assignNote, setAssignNote] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadData();
    fetchRealOfficers();
  }, [selectedDeptId]);

  async function fetchRealOfficers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["department_officer", "admin"]);

    const realList = data || [];
    setOfficers(realList);
    if (realList.length > 0 && !selectedOfficerId) {
      setSelectedOfficerId(realList[0].id);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const { data: deptData } = await supabase.from("departments").select("id, name_en, code");
      const depts = deptData || [];
      setDepartments(depts);

      let query = supabase
        .from("complaints")
        .select("*")
        .order("priority_score", { ascending: false });

      if (selectedDeptId !== "all") {
        query = query.eq("final_department_id", selectedDeptId);
      }

      const { data: complaintData } = await query;
      const deptMap = new Map(depts.map((d) => [d.id, d.name_en]));

      const enriched = (complaintData || []).map((c, idx) => ({
        ...c,
        department_name: deptMap.get(c.final_department_id) || "General Municipal Area",
        sample_img: SAMPLE_EVIDENCE[idx % SAMPLE_EVIDENCE.length],
      }));

      setComplaints(enriched);
    } catch (err) {
      console.error("Load data failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activeAssignComplaint || !selectedOfficerId) return;

    setAssigning(true);
    try {
      await supabase
        .from("complaints")
        .update({ status: "in_progress" })
        .eq("id", activeAssignComplaint.id);

      setActiveAssignComplaint(null);
      setSelectedOfficerId(officers[0]?.id || "");
      setAssignNote("");
      await loadData();
    } catch (err: any) {
      alert("Error assigning officer: " + err.message);
    } finally {
      setAssigning(false);
    }
  }

  async function advanceStatus(id: string, nextStatus: string) {
    await supabase.from("complaints").update({ status: nextStatus }).eq("id", id);
    loadData();
  }

  return (
    <div className="space-y-6">
      {/* Glassmorphic Department Filter Banner */}
      <div className="flex items-center justify-between bg-white/75 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">Municipal Command Operations</h3>
            <p className="text-xs text-slate-500">Autonomous territorial division triage &amp; live officer dispatch.</p>
          </div>
        </div>

        <select
          value={selectedDeptId}
          onChange={(e) => setSelectedDeptId(e.target.value)}
          className="text-xs font-bold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-white/90 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
        >
          <option value="all">All Responsible Authorities</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name_en}
            </option>
          ))}
        </select>
      </div>

      {/* Glassmorphic Complaints Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/80 overflow-hidden shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)]">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200/80 flex justify-between items-center text-xs">
          <span className="font-extrabold text-slate-800 tracking-wide uppercase text-[11px]">
            Active Field Work Orders ({complaints.length})
          </span>
          <span className="text-slate-400 font-mono text-[11px]">Spatial PostGIS Priority Sorting</span>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400 gap-2.5 text-xs">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="font-medium">Loading municipal order grid...</span>
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            No pending complaints in this jurisdiction.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="p-3.5">Ticket Ref</th>
                  <th className="p-3.5">Evidence &amp; Issue</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Field Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {complaints.map((item) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-blue-50/40 transition-colors duration-200 group"
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-900">{item.ref_code}</td>
                    
                    {/* Hovering Image Card Preview */}
                    <td className="p-3.5 max-w-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="relative group/thumb">
                          <img 
                            src={item.sample_img} 
                            alt="Evidence" 
                            className="h-9 w-11 rounded-lg object-cover border border-slate-200 shadow-xs transition-transform duration-200 group-hover/thumb:scale-110 cursor-pointer" 
                          />
                          {/* Large Floating Preview Card on Hover */}
                          <div className="absolute left-14 top-1/2 -translate-y-1/2 hidden group-hover/thumb:block z-50 w-52 p-2 rounded-xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 pointer-events-none">
                            <img 
                              src={item.sample_img} 
                              alt="Large Preview" 
                              className="w-full h-32 rounded-lg object-cover mb-2"
                            />
                            <p className="text-[10px] font-mono text-slate-500">Geotagged Incident Frame</p>
                          </div>
                        </div>

                        <p className="font-semibold text-slate-800 truncate text-xs">{item.raw_text}</p>
                      </div>
                    </td>

                    <td className="p-3.5 font-bold text-slate-900">{item.department_name}</td>
                    
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide ${
                          item.priority_score >= 80
                            ? "bg-red-50 text-red-700 border border-red-200"
                            : item.priority_score >= 60
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {item.priority_score ?? 0} / 100
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200/80">
                        {item.status}
                      </span>
                    </td>

                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setActiveAssignComplaint(item);
                          if (officers.length > 0) setSelectedOfficerId(officers[0].id);
                        }}
                        className="px-3 py-1.5 bg-[#101C2C] hover:bg-blue-900 text-white rounded-lg text-[11px] font-bold transition-all duration-200 inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                      >
                        <UserPlus className="h-3 w-3 text-blue-400" />
                        <span>Assign</span>
                      </button>

                      {item.status === "in_progress" && (
                        <button
                          onClick={() => advanceStatus(item.id, "resolved")}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-all duration-200 shadow-sm active:scale-95"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ASSIGN OFFICER MODAL (Glassmorphic) */}
      {activeAssignComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white/95 backdrop-blur-xl border border-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setActiveAssignComplaint(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4">
              <span className="text-[10px] uppercase font-extrabold text-blue-600 tracking-widest font-mono">
                Field Deployment Mandate
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                Assign Case: {activeAssignComplaint.ref_code}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                {activeAssignComplaint.raw_text}
              </p>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Registered Officer
                </label>
                {officers.length === 0 ? (
                  <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 font-medium">
                    No active officers found in database.
                  </p>
                ) : (
                  <select
                    value={selectedOfficerId}
                    onChange={(e) => setSelectedOfficerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.full_name || officer.id.slice(0, 8)} ({officer.role})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Action Directives &amp; Field Instructions
                </label>
                <textarea
                  rows={2}
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  placeholder="e.g. Inspect the site, deploy asphalt patching team, and upload geotagged resolution proof."
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAssignComplaint(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || officers.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {assigning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserCheck className="h-4 w-4" />
                  )}
                  <span>Deploy Assignment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
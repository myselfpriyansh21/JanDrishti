import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { 
  Camera, 
  MapPin, 
  Send, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft, 
  Search, 
  Flame, 
  Trash2, 
  Truck, 
  AlertTriangle,
  Lightbulb,
  Droplets,
  Construction,
  Clock,
  ChevronRight
} from "lucide-react";

interface CitizenPortalProps {
  currentUser: any;
  initialTab?: "report" | "my" | "track";
  onRequireAuth: () => void;
}

const CATEGORY_ITEMS = [
  { id: "garbage", title: "Garbage Dump", icon: Trash2, color: "bg-amber-100 text-amber-800" },
  { id: "drainage_sewer", title: "Cleanliness Target Unit (Dirty Spot)", icon: AlertTriangle, color: "bg-emerald-100 text-emerald-800" },
  { id: "garbage", title: "Garbage Vehicle Not Arrived", icon: Truck, color: "bg-blue-100 text-blue-800" },
  { id: "garbage", title: "Burning of Garbage in Open Space", icon: Flame, color: "bg-red-100 text-red-800" },
  { id: "garbage", title: "Sweeping Not Done", icon: Trash2, color: "bg-purple-100 text-purple-800" },
  { id: "pothole", title: "Pothole / Road Repair Work", icon: Construction, color: "bg-amber-100 text-amber-900" },
  { id: "water_leakage", title: "Underground Water Pipe Leakage", icon: Droplets, color: "bg-cyan-100 text-cyan-800" },
  { id: "streetlight", title: "Faulty Streetlight / Loose Wire", icon: Lightbulb, color: "bg-yellow-100 text-yellow-800" },
];

export default function CitizenPortal({ currentUser, initialTab = "report", onRequireAuth }: CitizenPortalProps) {
  const [activeTab, setActiveTab] = useState<"report" | "my" | "track">(initialTab);
  const [step, setStep] = useState<"category" | "details">("category");
  const [selectedCategory, setSelectedCategory] = useState<any>(CATEGORY_ITEMS[0]);
  
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  
  const [detectedAddress, setDetectedAddress] = useState<string>(
    "RHR7+XM7, Manipal University Rd, Dahmi Kalan, Rajasthan 303007, India"
  );

  const [loading, setLoading] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);

  const [searchRef, setSearchRef] = useState("");
  const [trackedItem, setTrackedItem] = useState<any | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
    if (initialTab === "my") fetchMyComplaints();
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === "my") fetchMyComplaints();
  }, [activeTab]);

  async function fetchMyComplaints() {
    setLoadingMy(true);
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) setMyComplaints(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMy(false);
    }
  }

  const fetchLiveLocation = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await res.json();
          setDetectedAddress(data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } catch {
          setDetectedAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        } finally {
          setGpsLoading(false);
        }
      },
      () => setGpsLoading(false),
      { timeout: 8000 }
    );
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSubmittedRef(null);

    const refCode = `CIV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const { data: depts } = await supabase.from("departments").select("id, name_en, code");
      let targetCode = "NN";
      if (selectedCategory.id === "pothole") targetCode = "PWD";
      if (selectedCategory.id === "water_leakage") targetCode = "JAL";

      const matchedDept = depts?.find((d) => d.code === targetCode) || depts?.[0];

      const { error: insertError } = await supabase.from("complaints").insert({
        ref_code: refCode,
        raw_text: `${selectedCategory.title}: ${description || "Field inspection requested"}. Area: ${detectedAddress}`,
        category: selectedCategory.id,
        severity: "major",
        priority_score: 82,
        priority_band: "high",
        status: "assigned",
        routing_status: "auto",
        final_department_id: matchedDept?.id,
        location_source: "gps",
      });

      if (insertError) throw insertError;

      setSubmittedRef({
        ref_code: refCode,
        category: selectedCategory.title,
        department: matchedDept?.name_en || "Municipal Administration",
      });

      setDescription("");
      setImagePreview(null);
      setStep("category");
      fetchMyComplaints();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register complaint.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const queryTerm = searchRef.trim();
    if (!queryTerm) return;

    setTrackLoading(true);
    setTrackedItem(null);

    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .ilike("ref_code", queryTerm)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        alert("No complaint found with ticket reference: " + queryTerm);
        return;
      }
      setTrackedItem(data);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-5 px-1 sm:px-0">
      {/* Top Mobile Segmented Buttons */}
      <div className="flex bg-white/90 backdrop-blur-xl p-1 rounded-2xl border border-white/80 shadow-xs">
        <button
          onClick={() => setActiveTab("report")}
          className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
            activeTab === "report" ? "bg-[#101C2C] text-white shadow-sm" : "text-slate-600"
          }`}
        >
          Post Complaint
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
            activeTab === "my" ? "bg-[#101C2C] text-white shadow-sm" : "text-slate-600"
          }`}
        >
          Your Complaints
        </button>
        <button
          onClick={() => setActiveTab("track")}
          className={`flex-1 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
            activeTab === "track" ? "bg-[#101C2C] text-white shadow-sm" : "text-slate-600"
          }`}
        >
          Track Status
        </button>
      </div>

      {activeTab === "report" && (
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/80 shadow-sm overflow-hidden">
          {submittedRef && (
            <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  Grievance Filed: {submittedRef.ref_code}
                </p>
                <p className="text-[10px] sm:text-[11px] text-emerald-700">
                  Routed to {submittedRef.department} for ground dispatch.
                </p>
              </div>
            </div>
          )}

          {step === "category" ? (
            /* STEP 1: CHOOSE CATEGORY */
            <div>
              <div className="bg-gradient-to-r from-teal-700 to-teal-800 p-3.5 sm:p-4 text-white">
                <h3 className="text-sm sm:text-base font-extrabold tracking-tight">Choose Category</h3>
                <p className="text-[11px] sm:text-xs text-teal-100 font-medium">Post a complaint</p>
              </div>

              <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                {CATEGORY_ITEMS.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setStep("details");
                      }}
                      className="p-3.5 sm:p-4 flex items-center gap-3.5 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition group"
                    >
                      <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${cat.color} group-hover:scale-105 transition-transform`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-teal-700 transition">
                        {cat.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* STEP 2: DETAILS, MAP & PHOTO */
            <div>
              <div className="bg-gradient-to-r from-teal-700 to-teal-800 p-3.5 sm:p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("category")}
                    className="p-1 hover:bg-teal-600 rounded-lg transition"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <h3 className="text-sm sm:text-base font-extrabold tracking-tight truncate max-w-[240px] sm:max-w-none">
                    {selectedCategory.title}
                  </h3>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
                {/* Geotagged Map Visual */}
                <div className="relative h-36 sm:h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-blue-500/15 border border-blue-400/40 flex items-center justify-center animate-pulse">
                      <div className="h-7 w-7 rounded-full bg-[#101C2C] text-white flex items-center justify-center shadow-md">
                        <MapPin className="h-4 w-4" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fetchLiveLocation}
                    className="absolute top-2.5 right-2.5 bg-white p-2 rounded-xl shadow-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    title="Auto-Detect GPS"
                  >
                    {gpsLoading ? <Loader2 className="h-4 w-4 animate-spin text-teal-700" /> : <MapPin className="h-4 w-4 text-teal-700" />}
                  </button>
                </div>

                {/* Area Input */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-teal-700" />
                    Select Area
                  </label>
                  <div className="rounded-xl border-2 border-orange-400/80 p-2.5 sm:p-3 bg-white shadow-xs">
                    <p className="text-xs font-black text-slate-900 leading-snug">
                      {detectedAddress}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-extrabold text-slate-700 mb-1">
                    Please provide a brief description about the complaint
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter landmark or specific issue details..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-700 font-medium"
                  />
                </div>

                {/* Photo Upload (Responsive) */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-extrabold text-slate-700 mb-1">
                    Add a photo
                  </label>
                  <label className="flex flex-col items-center justify-center h-24 sm:h-28 w-full sm:w-44 rounded-2xl bg-[#374151] hover:bg-[#4b5563] cursor-pointer text-white transition shadow-sm">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover rounded-2xl" />
                    ) : (
                      <>
                        <Camera className="h-6 w-6 sm:h-7 sm:w-7 text-white mb-1" />
                        <span className="text-[11px] font-bold text-slate-200">Take / Upload Photo</span>
                      </>
                    )}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 font-bold">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Submit Grievance</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: YOUR COMPLAINTS (Mobile Card View) */}
      {activeTab === "my" && (
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/80 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Your Complaints</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Track and view status of all filed complaints</p>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              Total: {myComplaints.length}
            </span>
          </div>

          {loadingMy ? (
            <div className="py-10 flex items-center justify-center text-xs text-slate-400 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              <span>Loading complaints...</span>
            </div>
          ) : myComplaints.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              No registered complaints found.
            </div>
          ) : (
            <div className="space-y-3">
              {myComplaints.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {item.ref_code}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 line-clamp-2">{item.raw_text}</h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase shrink-0 ${
                      item.status === "resolved" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                    <button
                      onClick={() => {
                        setSearchRef(item.ref_code);
                        setActiveTab("track");
                        setTrackedItem(item);
                      }}
                      className="text-teal-700 hover:text-teal-900 font-bold flex items-center gap-0.5"
                    >
                      <span>Track Details</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRACK GRIEVANCE STATUS */}
      {activeTab === "track" && (
        <div className="bg-white/90 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-white/80 p-4 sm:p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Live Municipal Redressal Tracker
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Enter complaint ticket reference (e.g. CIV-2026-0891)
            </p>
          </div>

          <form onSubmit={handleTrackSearch} className="flex gap-2">
            <input
              type="text"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
              placeholder="CIV-2026-####"
              className="flex-1 text-xs p-2.5 sm:p-3 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-blue-600"
              required
            />
            <button
              type="submit"
              disabled={trackLoading}
              className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-[#101C2C] text-white text-xs font-bold hover:bg-[#1a2e47] transition flex items-center gap-1.5 shadow-sm"
            >
              {trackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Track</span>
            </button>
          </form>

          {trackedItem && (
            <div className="p-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{trackedItem.ref_code}</h4>
                  <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 line-clamp-1">{trackedItem.raw_text}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800">
                  {trackedItem.status}
                </span>
              </div>

              {/* 4-stage badges responsive grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] sm:text-xs pt-1">
                <div className="p-2 rounded-lg sm:rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold">
                  1. Ingested
                </div>
                <div className={`p-2 rounded-lg sm:rounded-xl border font-bold ${
                  trackedItem.status !== "submitted" ? "bg-emerald-100 border-emerald-200 text-emerald-900" : "bg-white text-slate-400"
                }`}>
                  2. AI Triaged
                </div>
                <div className={`p-2 rounded-lg sm:rounded-xl border font-bold ${
                  ["assigned", "in_progress", "resolved"].includes(trackedItem.status) ? "bg-emerald-100 border-emerald-200 text-emerald-900" : "bg-white text-slate-400"
                }`}>
                  3. In Progress
                </div>
                <div className={`p-2 rounded-lg sm:rounded-xl border font-bold ${
                  trackedItem.status === "resolved" ? "bg-emerald-100 border-emerald-200 text-emerald-900" : "bg-white text-slate-400"
                }`}>
                  4. Resolved
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
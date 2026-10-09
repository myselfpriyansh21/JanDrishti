import { useState, useEffect } from "react";
import LandingPage from "./pages/LandingPage";
import CitizenPortal from "./pages/CitizenPortal";
import AdminDashboard, { type TabKey } from "./components/AdminDashboard";
import DepartmentWorkspace from "./components/DepartmentWorkspace";
import CivicAnalytics from "./components/CivicAnalytics";
import AuthModal from "./components/AuthModal";
import { supabase } from "./lib/supabase";
import {
  LayoutDashboard,
  LogOut,
  BarChart3,
  Building2,
  ShieldCheck,
  Send,
  Search,
  ListOrdered,
} from "lucide-react";

type AuthRole = "citizen" | "department_officer" | "admin" | null;
type WorkspaceTab = "citizen_report" | "citizen_my" | "citizen_track" | "command_center" | "departments" | "analytics";

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<AuthRole>(null);
  const [userDeptId, setUserDeptId] = useState<string | undefined>(undefined);
  const [currentTab, setCurrentTab] = useState<WorkspaceTab>("citizen_report");
  const [adminTab, setAdminTab] = useState<TabKey>("queue");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<WorkspaceTab | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setCurrentUser(data.session.user);
        resolveRole(data.session.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser(session.user);
        resolveRole(session.user.id);
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function resolveRole(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("role, department_id")
      .eq("id", userId)
      .maybeSingle();

    const role = (data?.role as AuthRole) ?? "citizen";
    setUserRole(role);
    setUserDeptId(data?.department_id);

    if (authIntent) {
      setCurrentTab(authIntent);
      setAuthIntent(null);
    } else {
      if (role === "citizen") setCurrentTab("citizen_report");
      else if (role === "department_officer") setCurrentTab("departments");
      else setCurrentTab("command_center");
    }
  }

  const triggerProtectedAction = (intendedTab: WorkspaceTab) => {
    if (!currentUser) {
      setAuthIntent(intendedTab);
      setIsAuthOpen(true);
    } else {
      setCurrentTab(intendedTab);
    }
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserRole(null);
    setAuthIntent(null);
  }

  const TricolourBackground = () => (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="absolute -top-36 -left-28 h-[34rem] w-[34rem] rounded-full bg-[#FF9933]/30 blur-[130px] animate-pulse duration-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[38rem] w-[38rem] rounded-full bg-blue-700/10 blur-[150px] animate-pulse duration-700" />
      <div className="absolute -bottom-36 -right-28 h-[34rem] w-[34rem] rounded-full bg-[#138808]/30 blur-[130px] animate-pulse duration-1000" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a0a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a0a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-slate-50/85 text-slate-900 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      <TricolourBackground />

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-2xl border-b border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div 
            onClick={() => {
              if (currentUser) {
                if (userRole === "citizen") setCurrentTab("citizen_report");
                else if (userRole === "department_officer") setCurrentTab("departments");
                else setCurrentTab("command_center");
              } else {
                setAuthIntent(null);
              }
            }} 
            className="flex items-center gap-4 cursor-pointer select-none group py-1.5"
          >
            <img 
              src="/logo.png" 
              alt="JANDrishti Logo" 
              className="h-14 w-auto max-w-[65px] object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-sm" 
              onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
            />
            <img 
              src="/logo_word.png" 
              alt="JANDrishti" 
              className="h-9 w-auto max-h-10 object-contain transition-opacity duration-300 group-hover:opacity-90" 
              onError={(e) => {
                const parent = (e.target as HTMLElement).parentElement;
                if (parent && !parent.querySelector(".fallback-wordmark")) {
                  const span = document.createElement("span");
                  span.className = "fallback-wordmark text-2xl font-black tracking-tight text-[#101C2C]";
                  span.innerText = "JANDrishti";
                  parent.appendChild(span);
                }
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            {!currentUser ? (
              <button
                onClick={() => {
                  setAuthIntent(null);
                  setIsAuthOpen(true);
                }}
                className="px-6 py-2.5 rounded-xl bg-[#101C2C] hover:bg-[#1a2e47] text-white text-xs font-bold shadow-md shadow-slate-900/15 hover:shadow-lg transition-all duration-200 active:scale-95 flex items-center gap-2"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Portal Sign In</span>
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md border border-slate-200/90 px-3.5 py-1.5 rounded-xl shadow-xs">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-800 font-semibold truncate max-w-[180px]">
                    {currentUser?.email}
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    {userRole?.replace("_", " ")}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-slate-500 hover:text-red-600 rounded-xl hover:bg-red-50/80 border border-slate-200 hover:border-red-200 transition-all duration-200 shadow-xs"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex max-w-7xl w-full flex-1 p-4 sm:p-6 gap-6">
        {currentUser && (
          <aside className="w-60 shrink-0 bg-white/80 backdrop-blur-2xl border border-white/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl p-3.5 h-fit space-y-1.5">
            <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Operations Menu
            </p>

            {userRole === "citizen" ? (
              <>
                <button
                  onClick={() => setCurrentTab("citizen_report")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-200 ${
                    currentTab === "citizen_report"
                      ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/15"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <Send className="h-4 w-4 text-emerald-400" />
                  <span>Post Complaint</span>
                </button>

                <button
                  onClick={() => setCurrentTab("citizen_my")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-200 ${
                    currentTab === "citizen_my"
                      ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/15"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <ListOrdered className="h-4 w-4 text-amber-500" />
                  <span>Your Complaints</span>
                </button>

                <button
                  onClick={() => setCurrentTab("citizen_track")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-200 ${
                    currentTab === "citizen_track"
                      ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/15"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <Search className="h-4 w-4 text-blue-400" />
                  <span>Track Status</span>
                </button>
              </>
            ) : (
              <>
                {userRole === "admin" && (
                  <button
                    onClick={() => setCurrentTab("command_center")}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-200 ${
                      currentTab === "command_center"
                        ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/15"
                        : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                    }`}
                  >
                    <LayoutDashboard className={`h-4 w-4 ${currentTab === "command_center" ? "text-blue-400" : "text-slate-400"}`} />
                    <span>Command Center</span>
                  </button>
                )}

                <button
                  onClick={() => setCurrentTab("departments")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-200 ${
                    currentTab === "departments"
                      ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/15"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <Building2 className={`h-4 w-4 ${currentTab === "departments" ? "text-emerald-400" : "text-slate-400"}`} />
                  <span>Department Workload</span>
                </button>

                <button
                  onClick={() => setCurrentTab("analytics")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all duration-200 ${
                    currentTab === "analytics"
                      ? "bg-[#101C2C] text-white shadow-md shadow-slate-900/15"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <BarChart3 className={`h-4 w-4 ${currentTab === "analytics" ? "text-indigo-400" : "text-slate-400"}`} />
                  <span>Civic Analytics</span>
                </button>
              </>
            )}
          </aside>
        )}

        <main className="flex-1 min-w-0">
          {!currentUser ? (
            <LandingPage
              onStartCitizen={() => triggerProtectedAction("citizen_report")}
              onStartAdmin={() => triggerProtectedAction("command_center")}
            />
          ) : (
            <>
              {(currentTab === "citizen_report" || currentTab === "citizen_my" || currentTab === "citizen_track") && (
                <CitizenPortal
                  currentUser={currentUser}
                  initialTab={
                    currentTab === "citizen_my" ? "my" : currentTab === "citizen_track" ? "track" : "report"
                  }
                  onRequireAuth={() => setIsAuthOpen(true)}
                />
              )}

              {currentTab === "command_center" && userRole === "admin" && (
                <AdminDashboard tab={adminTab} onTabChange={setAdminTab} />
              )}

              {currentTab === "departments" && (
                <DepartmentWorkspace userRole={userRole} userDeptId={userDeptId} />
              )}

              {currentTab === "analytics" && <CivicAnalytics />}
            </>
          )}
        </main>
      </div>

      <footer className="relative z-10 border-t border-white/80 bg-white/70 backdrop-blur-md py-5 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">JANDrishti Autonomous Spatial Grievance Redressal Infrastructure</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Ministry of Housing &amp; Urban Affairs • Government of India</p>
      </footer>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(role, deptId) => {
          setUserRole(role as AuthRole);
          setUserDeptId(deptId);
        }}
      />
    </div>
  );
}
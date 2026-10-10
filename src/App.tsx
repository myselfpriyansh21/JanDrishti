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
  Home,
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

  // Controlled view: true = Landing Page, false = Workspace view
  const [showLanding, setShowLanding] = useState<boolean>(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setCurrentUser(data.session.user);
        resolveRole(data.session.user.id, false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setCurrentUser(session.user);
        resolveRole(session.user.id, true);
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setShowLanding(true);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function resolveRole(userId: string, isFreshLogin: boolean = false) {
    const { data } = await (supabase as any)
      .from("profiles")
      .select("role, department_id")
      .eq("id", userId)
      .maybeSingle();

    const role = (data?.role as AuthRole) ?? "citizen";
    setUserRole(role);
    setUserDeptId(data?.department_id);

    if (authIntent) {
      setCurrentTab(authIntent);
      setShowLanding(false);
      setAuthIntent(null);
    } else if (isFreshLogin) {
      if (role === "citizen") setCurrentTab("citizen_report");
      else if (role === "department_officer") setCurrentTab("departments");
      else setCurrentTab("command_center");
      setShowLanding(false);
    }
    // Agar fresh reload hua ho toh showLanding true (Landing Page) hi rahega
  }

  const triggerProtectedAction = (intendedTab: WorkspaceTab) => {
    if (!currentUser) {
      setAuthIntent(intendedTab);
      setIsAuthOpen(true);
    } else {
      setCurrentTab(intendedTab);
      setShowLanding(false);
    }
  };

  async function handleLogout() {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUserRole(null);
    setAuthIntent(null);
    setShowLanding(true);
  }

  const navigateToRoleDefault = () => {
    if (userRole === "citizen") setCurrentTab("citizen_report");
    else if (userRole === "department_officer") setCurrentTab("departments");
    else setCurrentTab("command_center");
    setShowLanding(false);
  };

  const TricolourBackground = () => (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      <div className="absolute -top-36 -left-28 h-72 sm:h-[34rem] w-72 sm:w-[34rem] rounded-full bg-[#FF9933]/30 blur-[90px] sm:blur-[130px] animate-pulse duration-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 sm:h-[38rem] w-80 sm:w-[38rem] rounded-full bg-blue-700/10 blur-[100px] sm:blur-[150px] animate-pulse duration-700" />
      <div className="absolute -bottom-36 -right-28 h-72 sm:h-[34rem] w-72 sm:w-[34rem] rounded-full bg-[#138808]/30 blur-[90px] sm:blur-[130px] animate-pulse duration-1000" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a0a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a0a_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-slate-50/85 text-slate-900 font-sans flex flex-col selection:bg-blue-600 selection:text-white pb-20 md:pb-0">
      <TricolourBackground />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-2xl border-b border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
        <div className="h-1 sm:h-1.5 w-full bg-gradient-to-r from-[#FF9933] via-white to-[#138808]" />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          {/* Logo click always takes to Landing Page */}
          <div 
            onClick={() => setShowLanding(true)} 
            className="flex items-center gap-2.5 sm:gap-4 cursor-pointer select-none group py-1"
          >
            <img 
              src="/logo.png" 
              alt="JANDrishti Logo" 
              className="h-10 sm:h-14 w-auto max-w-[45px] sm:max-w-[65px] object-contain transition-transform duration-300 group-hover:scale-105" 
              onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
            />
            <img 
              src="/logo_word.png" 
              alt="JANDrishti" 
              className="h-7 sm:h-9 w-auto max-h-8 sm:max-h-10 object-contain transition-opacity duration-300 group-hover:opacity-90" 
              onError={(e) => {
                const parent = (e.target as HTMLElement).parentElement;
                if (parent && !parent.querySelector(".fallback-wordmark")) {
                  const span = document.createElement("span");
                  span.className = "fallback-wordmark text-lg sm:text-2xl font-black tracking-tight text-[#101C2C]";
                  span.innerText = "JANDrishti";
                  parent.appendChild(span);
                }
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!currentUser ? (
              <button
                onClick={() => {
                  setAuthIntent(null);
                  setIsAuthOpen(true);
                }}
                className="px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-[#101C2C] hover:bg-[#1a2e47] text-white text-[11px] sm:text-xs font-bold shadow-md transition-all duration-200 active:scale-95 flex items-center gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Portal Sign In</span>
              </button>
            ) : (
              <>
                {showLanding ? (
                  <button
                    onClick={navigateToRoleDefault}
                    className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11px] sm:text-xs font-bold shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>Open Workspace</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowLanding(true)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 bg-white/80 text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Landing</span>
                  </button>
                )}

                <div className="flex items-center gap-2 bg-white/95 border border-slate-200/90 px-2.5 sm:px-3.5 py-1.5 rounded-xl shadow-xs">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[11px] sm:text-xs text-slate-800 font-semibold truncate max-w-[100px] sm:max-w-[180px]">
                    {currentUser?.email}
                  </span>
                  <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                    {userRole?.replace("_", " ")}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 sm:p-2.5 text-slate-500 hover:text-red-600 rounded-xl hover:bg-red-50/80 border border-slate-200 transition shadow-xs"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="relative z-10 mx-auto flex max-w-7xl w-full flex-1 p-3 sm:p-6 gap-6">
        {currentUser && !showLanding && (
          <aside className="hidden md:block w-60 shrink-0 bg-white/80 backdrop-blur-2xl border border-white/80 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.05)] rounded-2xl p-3.5 h-fit space-y-1.5">
            <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Operations Menu
            </p>

            {userRole === "citizen" ? (
              <>
                <button
                  onClick={() => setCurrentTab("citizen_report")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                    currentTab === "citizen_report"
                      ? "bg-[#101C2C] text-white shadow-md"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <Send className="h-4 w-4 text-emerald-400" />
                  <span>Post Complaint</span>
                </button>

                <button
                  onClick={() => setCurrentTab("citizen_my")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                    currentTab === "citizen_my"
                      ? "bg-[#101C2C] text-white shadow-md"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <ListOrdered className="h-4 w-4 text-amber-500" />
                  <span>Your Complaints</span>
                </button>

                <button
                  onClick={() => setCurrentTab("citizen_track")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                    currentTab === "citizen_track"
                      ? "bg-[#101C2C] text-white shadow-md"
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
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                      currentTab === "command_center"
                        ? "bg-[#101C2C] text-white shadow-md"
                        : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                    }`}
                  >
                    <LayoutDashboard className="h-4 w-4 text-blue-400" />
                    <span>Command Center</span>
                  </button>
                )}

                <button
                  onClick={() => setCurrentTab("departments")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                    currentTab === "departments"
                      ? "bg-[#101C2C] text-white shadow-md"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <Building2 className="h-4 w-4 text-emerald-400" />
                  <span>Department Workload</span>
                </button>

                <button
                  onClick={() => setCurrentTab("analytics")}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-left transition-all ${
                    currentTab === "analytics"
                      ? "bg-[#101C2C] text-white shadow-md"
                      : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                  }`}
                >
                  <BarChart3 className="h-4 w-4 text-indigo-400" />
                  <span>Civic Analytics</span>
                </button>
              </>
            )}
          </aside>
        )}

        <main className="flex-1 min-w-0 w-full">
          {showLanding ? (
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

      {/* Mobile Bottom Navigation */}
      {currentUser && !showLanding && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-2xl border-t border-slate-200 px-3 py-2 flex justify-around items-center shadow-lg">
          {userRole === "citizen" ? (
            <>
              <button
                onClick={() => setCurrentTab("citizen_report")}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                  currentTab === "citizen_report" ? "text-teal-700 font-bold" : "text-slate-500 font-medium"
                }`}
              >
                <Send className="h-5 w-5" />
                <span className="text-[10px]">Post</span>
              </button>

              <button
                onClick={() => setCurrentTab("citizen_my")}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                  currentTab === "citizen_my" ? "text-teal-700 font-bold" : "text-slate-500 font-medium"
                }`}
              >
                <ListOrdered className="h-5 w-5" />
                <span className="text-[10px]">Complaints</span>
              </button>

              <button
                onClick={() => setCurrentTab("citizen_track")}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                  currentTab === "citizen_track" ? "text-teal-700 font-bold" : "text-slate-500 font-medium"
                }`}
              >
                <Search className="h-5 w-5" />
                <span className="text-[10px]">Track</span>
              </button>
            </>
          ) : (
            <>
              {userRole === "admin" && (
                <button
                  onClick={() => setCurrentTab("command_center")}
                  className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                    currentTab === "command_center" ? "text-blue-700 font-bold" : "text-slate-500 font-medium"
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="text-[10px]">Command</span>
                </button>
              )}

              <button
                onClick={() => setCurrentTab("departments")}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                  currentTab === "departments" ? "text-blue-700 font-bold" : "text-slate-500 font-medium"
                }`}
              >
                <Building2 className="h-5 w-5" />
                <span className="text-[10px]">Workload</span>
              </button>

              <button
                onClick={() => setCurrentTab("analytics")}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition ${
                  currentTab === "analytics" ? "text-blue-700 font-bold" : "text-slate-500 font-medium"
                }`}
              >
                <BarChart3 className="h-5 w-5" />
                <span className="text-[10px]">Analytics</span>
              </button>
            </>
          )}
        </nav>
      )}

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
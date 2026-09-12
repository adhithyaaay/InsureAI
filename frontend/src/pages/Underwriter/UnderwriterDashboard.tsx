import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Users,
  Brain,
  RefreshCw,
  LogOut,
  IndianRupee,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface ApplicationItem {
  id: number;
  user_id: number;
  age: number;
  sex: number;
  bmi: number;
  children: number;
  smoker: number;
  region: string;
  status: string;
  created_at: string;
  predictions?: Array<{
    id: number;
    predicted_charge: number;
    risk_level: string;
    recommendation: string;
    model_version: string;
  }>;
  documents?: Array<{
    id: number;
    document_type: string;
    filename: string;
    status: string;
  }>;
}

export default function UnderwriterDashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApplicationItem[]>("/applications");
      setApplications(res.data);
    } catch (err: unknown) {
      console.error("Failed to load applications:", err);
      setError("Failed to fetch applications. Ensure backend server is running and session is valid.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const totalApps = applications.length;
  const pendingCount = applications.filter((a) => a.status === "PENDING_REVIEW").length;
  const approvedCount = applications.filter((a) => a.status === "APPROVED").length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">Underwriter Portal</h1>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full">
                  Underwriter View
                </span>
              </div>
              <p className="text-xs text-slate-400">Logged in as {user?.name} ({user?.email})</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchApplications}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xs font-medium transition"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Applications</span>
              <Users size={16} className="text-blue-400" />
            </div>
            <p className="text-3xl font-extrabold text-white mt-2">{totalApps}</p>
            <p className="text-xs text-slate-500 mt-1">Across all registered customers</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <span>Pending Underwriter Review</span>
              <AlertTriangle size={16} />
            </div>
            <p className="text-3xl font-extrabold text-amber-400 mt-2">{pendingCount}</p>
            <p className="text-xs text-slate-500 mt-1">Awaiting decision & verification</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <span>Approved Policies</span>
              <Brain size={16} />
            </div>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">{approvedCount}</p>
            <p className="text-xs text-slate-500 mt-1">Evaluated by XGBoost & TreeSHAP</p>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="text-blue-400" size={18} />
              <h2 className="text-base font-bold text-white">Underwriting Queue</h2>
            </div>
            <span className="text-xs text-slate-400">
              Showing {applications.length} application(s)
            </span>
          </div>

          {error && (
            <div className="p-4 m-5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-sm">Loading applications queue...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No insurance applications submitted yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Ref ID</th>
                    <th className="px-5 py-3.5">Applicant Risk Profile</th>
                    <th className="px-5 py-3.5">Smoker</th>
                    <th className="px-5 py-3.5">Region</th>
                    <th className="px-5 py-3.5">ML Predicted Premium</th>
                    <th className="px-5 py-3.5">Risk Tier</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                  {applications.map((app) => {
                    const latestPred = app.predictions && app.predictions.length > 0 ? app.predictions[0] : null;
                    const isLow = latestPred?.risk_level?.toLowerCase().includes("low");
                    const isMedium = latestPred?.risk_level?.toLowerCase().includes("medium");
                    const isHigh = latestPred?.risk_level?.toLowerCase().includes("high");

                    return (
                      <tr key={app.id} className="hover:bg-slate-900/50 transition">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-blue-400">
                          #APP-{String(app.id).padStart(5, "0")}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <div className="font-semibold text-white">
                            Age: {app.age} yrs • {app.sex === 1 ? "Male" : "Female"}
                          </div>
                          <div className="text-slate-400">
                            BMI: {app.bmi} • Children: {app.children}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold">
                          {app.smoker === 1 ? (
                            <span className="text-rose-400">Yes (High Risk)</span>
                          ) : (
                            <span className="text-emerald-400">No</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs capitalize text-slate-300">
                          {app.region}
                        </td>
                        <td className="px-5 py-4 font-semibold text-white text-xs">
                          {latestPred ? (
                            <span className="inline-flex items-center gap-0.5">
                              <IndianRupee size={12} className="text-blue-400" />
                              {Math.round(latestPred.predicted_charge).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          {latestPred ? (
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                isLow
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : isMedium
                                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                  : isHigh
                                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                  : "bg-slate-800 text-slate-300 border-slate-700"
                              }`}
                            >
                              {latestPred.risk_level.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              app.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                : app.status === "REJECTED"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

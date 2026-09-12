import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
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
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

interface PredictionSummary {
  id: number;
  predicted_charge: number;
  risk_level: string;
  recommendation: string;
  model_version: string;
}

interface DocumentSummary {
  id: number;
  document_type: string;
  filename: string;
  status: string;
  discrepancy_count?: number;
}

interface ApplicationItem {
  id: number;
  user_id: number;
  applicant_name?: string | null;
  applicant_email?: string | null;
  age: number;
  sex: number;
  bmi: number;
  children: number;
  smoker: number;
  region: string;
  status: string;
  created_at: string;
  predictions?: PredictionSummary[];
  documents?: DocumentSummary[];
}

export default function UnderwriterDashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [smokerFilter, setSmokerFilter] = useState("ALL");

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

  // Summary Metrics calculated strictly from real data
  const metrics = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter(
      (a) => a.status === "PENDING_REVIEW" || a.status === "REVIEW_REQUIRED"
    ).length;
    const approved = applications.filter((a) => a.status === "APPROVED").length;
    const rejected = applications.filter((a) => a.status === "REJECTED").length;
    const highRisk = applications.filter((a) => {
      const pred = a.predictions && a.predictions.length > 0 ? a.predictions[0] : null;
      return pred?.risk_level?.toLowerCase().includes("high") || a.smoker === 1;
    }).length;

    return { total, pending, approved, rejected, highRisk };
  }, [applications]);

  // Filtered and Searched Applications
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Search matching by ID, Name, or Email
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = String(app.id).includes(q) || `#app-${String(app.id).padStart(5, "0")}`.toLowerCase().includes(q);
        const nameMatch = app.applicant_name ? app.applicant_name.toLowerCase().includes(q) : false;
        const emailMatch = app.applicant_email ? app.applicant_email.toLowerCase().includes(q) : false;
        if (!idMatch && !nameMatch && !emailMatch) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "PENDING_REVIEW" && app.status !== "PENDING_REVIEW") return false;
        if (statusFilter === "APPROVED" && app.status !== "APPROVED") return false;
        if (statusFilter === "REJECTED" && app.status !== "REJECTED") return false;
        if (statusFilter === "REVIEW_REQUIRED" && app.status !== "REVIEW_REQUIRED") return false;
      }

      // Risk Filter
      if (riskFilter !== "ALL") {
        const latestPred = app.predictions && app.predictions.length > 0 ? app.predictions[0] : null;
        if (!latestPred) return false;
        const riskTier = latestPred.risk_level.toLowerCase();
        if (riskFilter === "LOW" && !riskTier.includes("low")) return false;
        if (riskFilter === "MEDIUM" && !riskTier.includes("medium")) return false;
        if (riskFilter === "HIGH" && !riskTier.includes("high")) return false;
      }

      // Smoker Filter
      if (smokerFilter !== "ALL") {
        if (smokerFilter === "YES" && app.smoker !== 1) return false;
        if (smokerFilter === "NO" && app.smoker !== 0) return false;
      }

      return true;
    });
  }, [applications, searchQuery, statusFilter, riskFilter, smokerFilter]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Header */}
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
                  Underwriter Access
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Logged in as <span className="text-slate-200 font-medium">{user?.name}</span> ({user?.email})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchApplications}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh Queue
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xs font-medium transition"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Real Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Total Applications</span>
              <Users size={16} className="text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2">{metrics.total}</p>
            <p className="text-[11px] text-slate-500 mt-1">Total submitted cohort</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <span>Pending Review</span>
              <Clock size={16} />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2">{metrics.pending}</p>
            <p className="text-[11px] text-slate-500 mt-1">Action needed</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <span>Approved</span>
              <CheckCircle2 size={16} />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2">{metrics.approved}</p>
            <p className="text-[11px] text-slate-500 mt-1">Policies finalized</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-rose-400 text-xs font-semibold uppercase tracking-wider">
              <span>Rejected</span>
              <XCircle size={16} />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2">{metrics.rejected}</p>
            <p className="text-[11px] text-slate-500 mt-1">High risk declinations</p>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-purple-400 text-xs font-semibold uppercase tracking-wider">
              <span>High Risk / Smokers</span>
              <Brain size={16} />
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-purple-400 mt-2">{metrics.highRisk}</p>
            <p className="text-[11px] text-slate-500 mt-1">Substandard / surcharge</p>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, Name, or Email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs transition"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-xs transition cursor-pointer"
              >
                <option value="ALL">Status: All Statuses</option>
                <option value="PENDING_REVIEW">Status: Pending Review</option>
                <option value="REVIEW_REQUIRED">Status: Review Required</option>
                <option value="APPROVED">Status: Approved</option>
                <option value="REJECTED">Status: Rejected</option>
              </select>
            </div>

            {/* Risk Tier Filter */}
            <div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-xs transition cursor-pointer"
              >
                <option value="ALL">Risk Tier: All Tiers</option>
                <option value="LOW">Risk: Low Risk (Standard)</option>
                <option value="MEDIUM">Risk: Medium Risk</option>
                <option value="HIGH">Risk: High Risk (Surcharge)</option>
              </select>
            </div>

            {/* Smoker Filter */}
            <div>
              <select
                value={smokerFilter}
                onChange={(e) => setSmokerFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 text-xs transition cursor-pointer"
              >
                <option value="ALL">Smoking: All Applicants</option>
                <option value="NO">Smoking: Non-Smoker</option>
                <option value="YES">Smoking: Smoker (Surcharge)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Application Queue Table */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="text-blue-400" size={18} />
              <h2 className="text-base font-bold text-white">Underwriting Queue</h2>
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredApplications.length} of {applications.length} applications
            </span>
          </div>

          {error && (
            <div className="p-4 m-5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-2">
              <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center text-slate-400">
              <Loader2 className="animate-spin h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-sm font-medium">Loading applications queue...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              <FileSpreadsheet size={36} className="mx-auto text-slate-700 mb-2" />
              <p className="font-semibold text-slate-400">No applications match your query.</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing filters or search terms.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5">Ref ID</th>
                    <th className="px-4 py-3.5">Applicant</th>
                    <th className="px-4 py-3.5">Profile</th>
                    <th className="px-4 py-3.5">Smoker</th>
                    <th className="px-4 py-3.5">Region</th>
                    <th className="px-4 py-3.5">Predicted Premium</th>
                    <th className="px-4 py-3.5">Risk Tier</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Doc Intelligence</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                  {filteredApplications.map((app) => {
                    const latestPred = app.predictions && app.predictions.length > 0 ? app.predictions[0] : null;
                    const isLow = latestPred?.risk_level?.toLowerCase().includes("low");
                    const isMedium = latestPred?.risk_level?.toLowerCase().includes("medium");
                    const isHigh = latestPred?.risk_level?.toLowerCase().includes("high");

                    return (
                      <tr key={app.id} className="hover:bg-slate-900/50 transition">
                        <td className="px-4 py-4 font-mono text-xs font-bold text-blue-400">
                          #APP-{String(app.id).padStart(5, "0")}
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div className="font-semibold text-white">
                            {app.applicant_name || "Self-Service Customer"}
                          </div>
                          <div className="text-slate-500 font-mono text-[11px]">
                            {app.applicant_email || `User #${app.user_id}`}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          <div className="text-slate-300">
                            {app.age} yrs • {app.sex === 1 ? "Male" : "Female"}
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            BMI: {app.bmi} • {app.children} dep.
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-semibold">
                          {app.smoker === 1 ? (
                            <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              Yes
                            </span>
                          ) : (
                            <span className="text-emerald-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs capitalize text-slate-300">
                          {app.region}
                        </td>
                        <td className="px-4 py-4 font-semibold text-white text-xs">
                          {latestPred ? (
                            <span className="inline-flex items-center gap-0.5">
                              <IndianRupee size={12} className="text-blue-400" />
                              {Math.round(latestPred.predicted_charge).toLocaleString("en-IN")}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Not evaluated</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs">
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
                        <td className="px-4 py-4 text-xs">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              app.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                : app.status === "REJECTED"
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                                : app.status === "REVIEW_REQUIRED"
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                : "bg-blue-500/10 text-blue-300 border-blue-500/30"
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          {(() => {
                            const totalDisc = app.documents?.reduce((acc, d) => acc + (d.discrepancy_count || 0), 0) || 0;
                            const hasDocs = app.documents && app.documents.length > 0;
                            if (!hasDocs) {
                              return <span className="text-slate-500 text-[11px] italic">No docs</span>;
                            }
                            if (totalDisc > 0) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/35">
                                  ⚠ {totalDisc} Discrepancy
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                ✓ Verified
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 text-xs text-right">
                          <Link
                            to={`/underwriter/applications/${app.id}`}
                            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-1.5 rounded-lg transition text-xs shadow-sm"
                          >
                            Review
                            <ArrowRight size={13} />
                          </Link>
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

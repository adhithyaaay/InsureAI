import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  IndianRupee,
  RefreshCw,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  TrendingUp,
  Percent,
  Layers,
  Info,
} from "lucide-react";
import api from "../../services/api";

import { useAuth } from "../../context/AuthContext";

interface DashboardKPIs {
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  rejected_applications: number;
  review_required_applications: number;
  approval_rate: number;
  average_predicted_premium: number;
  critical_priority_applications: number;
}

interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
}

interface MonthlyApplicationItem {
  month: string;
  applications: number;
}

interface PremiumTrendItem {
  month: string;
  average_premium: number;
}

const RISK_COLORS = {
  Low: "#10B981",    // emerald-500
  Medium: "#F59E0B", // amber-500
  High: "#EF4444",   // rose-500
};

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [riskDist, setRiskDist] = useState<RiskDistribution | null>(null);
  const [monthlyApps, setMonthlyApps] = useState<MonthlyApplicationItem[]>([]);
  const [premiumTrends, setPremiumTrends] = useState<PremiumTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashRes, riskRes, monthlyRes, trendRes] = await Promise.all([
        api.get<DashboardKPIs>("/analytics/dashboard"),
        api.get<RiskDistribution>("/analytics/risk-distribution"),
        api.get<MonthlyApplicationItem[]>("/analytics/monthly"),
        api.get<PremiumTrendItem[]>("/analytics/premium-trend"),
      ]);

      setKpis(dashRes.data);
      setRiskDist(riskRes.data);
      setMonthlyApps(monthlyRes.data);
      setPremiumTrends(trendRes.data);
    } catch (err: unknown) {
      console.error("Failed to load analytics data:", err);
      setError("Failed to load analytics. Ensure backend is running and you have underwriter authorization.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Prepare Pie Chart Data
  const riskPieData = riskDist
    ? [
        { name: "Low Risk", value: riskDist.low, color: RISK_COLORS.Low },
        { name: "Medium Risk", value: riskDist.medium, color: RISK_COLORS.Medium },
        { name: "High Risk", value: riskDist.high, color: RISK_COLORS.High },
      ].filter((item) => item.value > 0)
    : [];

  // Prepare Status Breakdown Data
  const statusBreakdownData = kpis
    ? [
        { status: "Pending", count: kpis.pending_applications, fill: "#3B82F6" },
        { status: "Approved", count: kpis.approved_applications, fill: "#10B981" },
        { status: "Rejected", count: kpis.rejected_applications, fill: "#EF4444" },
        { status: "Review Req.", count: kpis.review_required_applications, fill: "#F59E0B" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BarChart3 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">Underwriter Analytics</h1>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2 py-0.5 rounded-full">
                  Database-backed Analytics
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Audited operational metrics & actuarial distributions for <span className="text-slate-200">{user?.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/underwriter"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <ArrowLeft size={14} />
              Application Queue
            </Link>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium transition disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh Analytics
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading && !kpis ? (
          <div className="min-h-[400px] flex flex-col items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-indigo-500 mb-3" />
            <p className="text-sm font-medium text-slate-400">Loading Portfolio Analytics...</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Applications */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>Total Applications</span>
                  <Users size={18} className="text-blue-400" />
                </div>
                <div className="text-3xl font-extrabold text-white mt-2 font-mono">
                  {kpis?.total_applications ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Total submitted submissions</p>
              </div>

              {/* Approval Rate */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>Approval Rate</span>
                  <Percent size={18} className="text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-emerald-400 mt-2 font-mono">
                  {kpis?.approval_rate ?? 0}%
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Of decided applications</p>
              </div>

              {/* Average Predicted Premium */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>Average Premium</span>
                  <IndianRupee size={18} className="text-indigo-400" />
                </div>
                <div className="text-3xl font-extrabold text-indigo-300 mt-2 font-mono">
                  ₹{kpis?.average_predicted_premium ? kpis.average_predicted_premium.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0"}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">XGBoost v2.0 predictions</p>
              </div>

              {/* Critical Queue */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>Critical Priority</span>
                  <AlertTriangle size={18} className="text-rose-400" />
                </div>
                <div className="text-3xl font-extrabold text-rose-400 mt-2 font-mono">
                  {kpis?.critical_priority_applications ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Require urgent underwriter audit</p>
              </div>

              {/* Pending Review */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>Pending Review</span>
                  <Clock size={18} className="text-blue-400" />
                </div>
                <div className="text-2xl font-bold text-blue-400 mt-2 font-mono">
                  {kpis?.pending_applications ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Awaiting initial inspection</p>
              </div>

              {/* Approved */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>Approved</span>
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">
                  {kpis?.approved_applications ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Policies underwritten</p>
              </div>

              {/* Rejected */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>Rejected</span>
                  <XCircle size={18} className="text-rose-400" />
                </div>
                <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">
                  {kpis?.rejected_applications ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Declined applications</p>
              </div>

              {/* Review Required */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <span>Review Required</span>
                  <ShieldAlert size={18} className="text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">
                  {kpis?.review_required_applications ?? 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">More info or senior review</p>
              </div>
            </div>

            {/* Charts Grid: Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Monthly Application Volume (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <TrendingUp size={16} className="text-blue-400" />
                      Monthly Application Inflow
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Submission volumes aggregated by calendar month</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {monthlyApps.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyApps} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                        <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                          labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                        />
                        <Bar dataKey="applications" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Applications" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No monthly volume data recorded yet
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Distribution Donut (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldAlert size={16} className="text-purple-400" />
                      Risk Tier Distribution
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Portfolio breakdown across ML risk tiers</p>
                  </div>
                </div>

                <div className="h-64 w-full flex items-center justify-center">
                  {riskPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskPieData}
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {riskPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value) => <span className="text-xs text-slate-300">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-500">
                      No risk assessments recorded yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Grid: Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Premium Trend Line Chart (7 cols) */}
              <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <IndianRupee size={16} className="text-emerald-400" />
                      Average Predicted Premium Trend
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Monthly average actuarial charges across scored applicants</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {premiumTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={premiumTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="premiumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                        <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                        <YAxis
                          stroke="#94A3B8"
                          fontSize={11}
                          tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, "Avg Premium"]}
                          labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                        />
                        <Area
                          type="monotone"
                          dataKey="average_premium"
                          stroke="#10B981"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#premiumGrad)"
                          name="Avg Premium"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No premium predictions recorded yet
                    </div>
                  )}
                </div>
              </div>

              {/* Status Breakdown Bar Chart (5 cols) */}
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-blue-400" />
                      Underwriting Status Breakdown
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Current state distribution across all applications</p>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                      <XAxis dataKey="status" stroke="#94A3B8" fontSize={11} />
                      <YAxis stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "0.75rem", fontSize: "12px" }}
                        labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                      />
                      <Bar dataKey="count" name="Applications" radius={[6, 6, 0, 0]}>
                        {statusBreakdownData.map((entry, index) => (
                          <Cell key={`status-cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Coverage Mix — Prototype (Phase 10) */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <Layers size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white">Coverage Mix — Prototype</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                        Product Catalog
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configured health coverage products available for underwriting recommendations
                    </p>
                  </div>
                </div>
              </div>

              {/* Prototype Catalog Products Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span className="font-bold text-teal-400">BASIC_5L</span>
                    <span>1 Year Term</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Basic Health Plan</h4>
                  <div className="text-xl font-bold text-white mb-2">₹ 5,00,000</div>
                  <p className="text-xs text-slate-400 mb-2">
                    Essential healthcare protection designed for individual baseline medical coverage.
                  </p>
                  <div className="text-[11px] font-mono text-slate-500 border-t border-slate-800 pt-2">
                    Benchmark Multiplier: <strong className="text-slate-300">0.85x</strong>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span className="font-bold text-teal-400">STANDARD_10L</span>
                    <span>1 Year Term</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Standard Health Plan</h4>
                  <div className="text-xl font-bold text-white mb-2">₹ 10,00,000</div>
                  <p className="text-xs text-slate-400 mb-2">
                    Comprehensive health coverage balancing balanced financial protection and routine hospitalisation coverage.
                  </p>
                  <div className="text-[11px] font-mono text-slate-500 border-t border-slate-800 pt-2">
                    Benchmark Multiplier: <strong className="text-slate-300">1.00x (Standard)</strong>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span className="font-bold text-teal-400">PREMIUM_20L</span>
                    <span>1 Year Term</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Premium Health Plan</h4>
                  <div className="text-xl font-bold text-white mb-2">₹ 20,00,000</div>
                  <p className="text-xs text-slate-400 mb-2">
                    Extensive health coverage designed for comprehensive family protection and critical medical security.
                  </p>
                  <div className="text-[11px] font-mono text-slate-500 border-t border-slate-800 pt-2">
                    Benchmark Multiplier: <strong className="text-slate-300">1.35x</strong>
                  </div>
                </div>
              </div>

              {/* Explicit Persistence Disclosure */}
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
                <Info size={16} className="text-blue-400 shrink-0" />
                <span>
                  <strong>Data Integrity Disclosure:</strong> Coverage selection analytics will be available once policy selections are persisted.
                  Currently displaying the active prototype product catalog without fabricated historical figures.
                </span>
              </div>
            </div>

            {/* Governance Callout */}

            <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
              <ShieldAlert size={18} className="text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-300 block mb-0.5">
                  Human-in-the-Loop Governance & Actuarial Audit Policy
                </span>
                All visual aggregations, average loss estimates, and risk tier distributions are computed from immutable SQL records.
                InsureAI machine learning outputs serve exclusively as decision support for authorized underwriters. No policy binding
                or coverage adjustments occur autonomously.
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

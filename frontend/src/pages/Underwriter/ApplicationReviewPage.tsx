import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Brain,
  IndianRupee,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  TrendingDown,
  Info,
  Loader2,
  Send,
  History,
  AlertCircle,
  BarChart3,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileSearch,
  ShieldAlert,
  FileDown,
  Layers,
  Sparkles,
} from "lucide-react";
import api from "../../services/api";
import { downloadUnderwritingReport } from "../../services/reportService";
import type { UnderwritingSummaryResponse, CoverageRecommendationResponse } from "../../types/insurance";


interface FeatureImpact {
  feature: string;
  value: string | number;
  impact: number;
  direction: "increase" | "decrease";
}

interface PredictionItem {
  id: number;
  application_id: number;
  predicted_charge: number;
  risk_level: string;
  recommendation: string;
  base_charge?: number;
  model_version: string;
  explanation?: FeatureImpact[];
  created_at?: string;
}

interface ConsistencyCheckItem {
  field: string;
  label: string;
  application_value: string | number | null | undefined;
  document_value: string | number | null | undefined;
  status: "MATCH" | "MISMATCH" | "NOT_FOUND";
  details: string;
}

interface DocumentItem {
  id: number;
  application_id: number;
  document_type: string;
  filename: string;
  file_size?: number | null;
  storage_path?: string | null;
  mime_type?: string | null;
  status: string;
  extraction_method?: string | null;
  extracted_text?: string | null;
  structured_data?: Record<string, unknown> | null;
  consistency_checks?: ConsistencyCheckItem[];
  discrepancy_count?: number;
  uploaded_at: string;
}

interface DecisionItem {
  id: number;
  application_id: number;
  decision: string;
  notes?: string | null;
  underwriter_id?: number | null;
  underwriter_name?: string | null;
  created_at?: string;
}

interface ApplicationDetails {
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
  updated_at: string;
  predictions: PredictionItem[];
  documents: DocumentItem[];
  decisions: DecisionItem[];
}

export default function ApplicationReviewPage() {
  const { id } = useParams<{ id: string }>();

  const [application, setApplication] = useState<ApplicationDetails | null>(null);
  const [underwritingSummary, setUnderwritingSummary] = useState<UnderwritingSummaryResponse | null>(null);
  const [coverageRecommendation, setCoverageRecommendation] = useState<CoverageRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Decision Form State
  const [decision, setDecision] = useState<string>("APPROVE");
  const [notes, setNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionSuccess, setDecisionSuccess] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  // Trigger evaluation state
  const [evaluating, setEvaluating] = useState(false);

  // Document intelligence expansion & streaming state
  const [expandedDocText, setExpandedDocText] = useState<Record<number, boolean>>({});
  const [fileLoadingId, setFileLoadingId] = useState<number | null>(null);

  const toggleDocText = (docId: number) => {
    setExpandedDocText((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const handleViewDocumentFile = async (docId: number) => {
    if (!id) return;
    try {
      setFileLoadingId(docId);
      const response = await api.get(`/applications/${id}/documents/${docId}/file`, {
        responseType: "blob",
      });
      const contentType = (response.headers["content-type"] as string) || "application/pdf";
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to view document file:", err);
      alert("Could not load document file from server. Please verify you have underwriter privileges.");
    } finally {
      setFileLoadingId(null);
    }
  };

  const fetchApplicationDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [appRes, summaryRes, coverageRes] = await Promise.allSettled([
        api.get<ApplicationDetails>(`/applications/${id}`),
        api.get<UnderwritingSummaryResponse>(`/applications/${id}/underwriting-summary`),
        api.get<CoverageRecommendationResponse>(`/applications/${id}/coverage-options`),
      ]);

      if (appRes.status === "fulfilled") {
        setApplication(appRes.value.data);
      } else {
        throw appRes.reason;
      }

      if (summaryRes.status === "fulfilled") {
        setUnderwritingSummary(summaryRes.value.data);
      } else {
        setUnderwritingSummary(null);
      }

      if (coverageRes.status === "fulfilled") {
        setCoverageRecommendation(coverageRes.value.data);
      } else {
        setCoverageRecommendation(null);
      }
    } catch (err: unknown) {
      console.error("Failed to load application review:", err);
      setError("Unable to load application details. Verify ID exists and you are authenticated as an Underwriter.");

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
  }, [id]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      setSubmittingDecision(true);
      setDecisionSuccess(null);
      setDecisionError(null);

      const payload = {
        decision,
        notes: notes.trim() || undefined,
      };

      await api.post(`/applications/${id}/decisions`, payload);
      setDecisionSuccess(`Decision '${decision}' recorded successfully.`);
      setNotes("");

      // Re-fetch to get updated application status & decision history
      await fetchApplicationDetails();
    } catch (err: unknown) {
      console.error("Failed to submit underwriting decision:", err);
      let msg = "Failed to record decision. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const responseData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (responseData?.detail) {
          msg = responseData.detail;
        }
      }
      setDecisionError(msg);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const [downloadingReport, setDownloadingReport] = useState(false);

  const handleDownloadReport = async () => {
    if (!id) return;
    try {
      setDownloadingReport(true);
      await downloadUnderwritingReport(id);
    } catch (err) {
      console.error("Failed to download underwriting report:", err);
      alert("Failed to download underwriting report. Please try again.");
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleRunPrediction = async () => {
    if (!id) return;
    try {
      setEvaluating(true);
      await api.post(`/applications/${id}/predict`);
      await fetchApplicationDetails();
    } catch (err) {
      console.error("Prediction evaluation failed:", err);
      alert("Failed to evaluate prediction. Ensure backend is running.");
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100">
        <Loader2 className="animate-spin h-10 w-10 text-blue-500 mb-3" />
        <p className="text-sm font-medium text-slate-400">Loading Application Review Dossier...</p>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4 text-slate-100">
        <div className="max-w-md w-full text-center bg-slate-950/60 border border-slate-800 rounded-2xl p-8">
          <AlertCircle size={40} className="text-rose-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Application Not Found</h2>
          <p className="text-xs text-slate-400 mt-2">{error || "The requested application could not be loaded."}</p>
          <Link
            to="/underwriter"
            className="inline-flex items-center gap-2 mt-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition"
          >
            <ArrowLeft size={14} />
            Back to Queue
          </Link>
        </div>
      </div>
    );
  }

  const latestPrediction = application.predictions && application.predictions.length > 0
    ? application.predictions[0]
    : null;

  const isApproved = application.status === "APPROVED";
  const isRejected = application.status === "REJECTED";
  const isReviewRequired = application.status === "REVIEW_REQUIRED";

  const statusBadgeStyle = isApproved
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
    : isRejected
    ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
    : isReviewRequired
    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
    : "bg-blue-500/10 text-blue-400 border-blue-500/30";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-16">
      {/* Sticky Header */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/underwriter"
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Back to Underwriting Queue"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-white font-mono">
                  #APP-{String(application.id).padStart(5, "0")}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadgeStyle}`}>
                  {application.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Applicant: <strong className="text-slate-200">{application.applicant_name || "Direct Customer"}</strong> ({application.applicant_email || `User #${application.user_id}`})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Submitted: {new Date(application.created_at).toLocaleString()}</span>
            <button
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-sm disabled:opacity-50"
              title="Download comprehensive PDF Underwriting Assessment Report"
            >
              {downloadingReport ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
              Download Report (PDF)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Grid: Applicant Details + AI Risk Assessment */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Applicant Information (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 pb-3 border-b border-slate-800">
                <FileSpreadsheet size={16} />
                Applicant Information
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block">Full Name</span>
                  <span className="font-bold text-white text-sm mt-0.5 block truncate">
                    {application.applicant_name || "Self-Service Customer"}
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block">Email</span>
                  <span className="font-bold text-slate-300 text-xs mt-1 block truncate">
                    {application.applicant_email || `User #${application.user_id}`}
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block">Age & Gender</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {application.age} yrs • {application.sex === 1 ? "Male" : "Female"}
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block">BMI (Body Mass Index)</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {application.bmi}{" "}
                    <span className="text-[11px] font-normal text-slate-400">
                      ({application.bmi < 18.5 ? "Underweight" : application.bmi < 25 ? "Normal" : application.bmi < 30 ? "Overweight" : "Obese"})
                    </span>
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block">Smoking Status</span>
                  <span className={`font-bold text-sm mt-0.5 block ${application.smoker === 1 ? "text-rose-400" : "text-emerald-400"}`}>
                    {application.smoker === 1 ? "Smoker (Surcharge)" : "Non-Smoker"}
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block">Children / Dependents</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {application.children} {application.children === 1 ? "child" : "children"}
                  </span>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 col-span-2">
                  <span className="text-slate-500 uppercase font-semibold text-[10px] block">Residential Region</span>
                  <span className="font-bold text-white text-sm mt-0.5 block capitalize">
                    {application.region} Region
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between">
              <span>DB Application ID: #{application.id}</span>
              <span>Account User ID: #{application.user_id}</span>
            </div>
          </div>

          {/* AI Risk Assessment (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider">
                  <Brain size={16} />
                  AI Underwriting Risk Assessment
                </div>
                {latestPrediction && (
                  <span className="text-[10px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                    v{latestPrediction.model_version} Champion XGBoost
                  </span>
                )}
              </div>

              {latestPrediction ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Predicted Premium */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <IndianRupee size={16} className="text-blue-400" />
                        <span>Predicted Annual Premium</span>
                      </div>
                      <p className="text-3xl font-extrabold text-white mt-1">
                        ₹ {Math.round(latestPrediction.predicted_charge).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Exact: ₹ {latestPrediction.predicted_charge.toFixed(2)}
                      </p>
                    </div>

                    {/* Assessed Risk Tier */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                        <AlertTriangle size={16} className="text-amber-400" />
                        <span>Assessed Risk Tier</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-extrabold text-white">
                          {latestPrediction.risk_level.toUpperCase()}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            latestPrediction.risk_level.toLowerCase().includes("low")
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : latestPrediction.risk_level.toLowerCase().includes("medium")
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {latestPrediction.risk_level} Risk
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Statistical XGBoost risk classification
                      </p>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                      <ShieldCheck size={16} className="text-blue-400" />
                      <span>AI Model Recommendation</span>
                    </div>
                    <p className="text-sm font-bold text-white mt-1">
                      {latestPrediction.recommendation}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400">
                  <Brain size={36} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Prediction not generated yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    The applicant submitted details without running ML evaluation.
                  </p>
                  <button
                    onClick={handleRunPrediction}
                    disabled={evaluating}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded-xl text-xs font-medium transition"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Evaluating Model...
                      </>
                    ) : (
                      "Generate ML Risk Assessment"
                    )}
                  </button>
                </div>
              )}
            </div>

            {latestPrediction && latestPrediction.base_charge && (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Population Base Premium: ₹ {Math.round(latestPrediction.base_charge).toLocaleString("en-IN")}</span>
                <span>Evaluation Date: {latestPrediction.created_at ? new Date(latestPrediction.created_at).toLocaleDateString() : "Live"}</span>
              </div>
            )}
          </div>
        </div>

        {/* TreeSHAP Feature Attribution Breakdown */}
        {latestPrediction && latestPrediction.explanation && latestPrediction.explanation.length > 0 && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                  <BarChart3 size={16} />
                  TreeSHAP Feature Attributions
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  These values show how each feature mathematically influenced this prediction away from the population baseline.
                </p>
              </div>

              {latestPrediction.base_charge && (
                <div className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
                  Population Baseline:{" "}
                  <strong className="text-white font-mono">
                    ₹ {Math.round(latestPrediction.base_charge).toLocaleString("en-IN")}
                  </strong>
                </div>
              )}
            </div>

            {/* Split Directional Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Factors Increasing Premium */}
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                  <TrendingUp size={15} />
                  Factors Increasing Premium (+)
                </div>
                <div className="space-y-2">
                  {latestPrediction.explanation
                    .filter((item) => item.direction === "increase")
                    .map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium truncate pr-2">
                          {item.feature} ({item.value})
                        </span>
                        <span className="font-bold text-rose-400 shrink-0 font-mono">
                          + ₹ {Math.round(item.impact).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  {latestPrediction.explanation.filter((item) => item.direction === "increase").length === 0 && (
                    <p className="text-xs text-slate-500 italic">No significant premium escalations.</p>
                  )}
                </div>
              </div>

              {/* Factors Decreasing Premium */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                  <TrendingDown size={15} />
                  Factors Decreasing Premium (-)
                </div>
                <div className="space-y-2">
                  {latestPrediction.explanation
                    .filter((item) => item.direction === "decrease")
                    .map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-medium truncate pr-2">
                          {item.feature} ({item.value})
                        </span>
                        <span className="font-bold text-emerald-400 shrink-0 font-mono">
                          - ₹ {Math.round(item.impact).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  {latestPrediction.explanation.filter((item) => item.direction === "decrease").length === 0 && (
                    <p className="text-xs text-slate-500 italic">No significant risk discounts.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Impact Table with visual proportional bars */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 text-xs font-semibold text-slate-400 grid grid-cols-12 gap-2">
                <span className="col-span-5">Risk Factor / Feature</span>
                <span className="col-span-3">Observed Value</span>
                <span className="col-span-2 text-right">Rupee Impact</span>
                <span className="col-span-2 text-center">Direction</span>
              </div>
              <div className="divide-y divide-slate-800/60 bg-slate-950/40">
                {latestPrediction.explanation.map((item, index) => {
                  const isIncrease = item.direction === "increase";
                  const maxImpact = Math.max(...latestPrediction.explanation!.map((f) => f.impact), 1);
                  const barWidth = Math.max(Math.round((item.impact / maxImpact) * 100), 6);

                  return (
                    <div key={index} className="px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-900/40 transition">
                      <div className="col-span-5">
                        <p className="font-semibold text-white">{item.feature}</p>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isIncrease ? "bg-rose-500" : "bg-emerald-500"}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="col-span-3 text-slate-400 font-medium truncate">
                        {String(item.value)}
                      </div>
                      <div className={`col-span-2 text-right font-bold font-mono ${isIncrease ? "text-rose-400" : "text-emerald-400"}`}>
                        {isIncrease ? "+" : "-"} ₹ {Math.round(item.impact).toLocaleString("en-IN")}
                      </div>
                      <div className="col-span-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isIncrease
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {isIncrease ? "Increase" : "Discount"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Underwriter Note:</strong> SHAP values calculate the exact additive contribution of each factor pushing the prediction away from the population expected baseline. They represent true mathematical attribution, not confidence probability.
              </span>
            </div>
          </div>
        )}

        {/* Uploaded Documents & Document Intelligence Review */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                <FileSearch size={16} />
                Document Intelligence & Consistency Verification
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Automated document text extraction, structured entity parsing, and disclosure consistency checks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
                {application.documents ? application.documents.length : 0} document(s) attached
              </span>
              {(() => {
                const totalDisc = application.documents?.reduce((acc, d) => acc + (d.discrepancy_count || 0), 0) || 0;
                if (totalDisc > 0) {
                  return (
                    <span className="text-xs bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg text-rose-300 font-bold flex items-center gap-1.5">
                      <AlertTriangle size={14} />
                      {totalDisc} Discrepancy(ies) Flagged
                    </span>
                  );
                } else if (application.documents && application.documents.length > 0) {
                  return (
                    <span className="text-xs bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-300 font-medium flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      Zero Discrepancies
                    </span>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* Underwriter Consistency Status Alert Banner */}
          {(() => {
            const totalDisc = application.documents?.reduce((acc, d) => acc + (d.discrepancy_count || 0), 0) || 0;
            const hasDocs = application.documents && application.documents.length > 0;

            if (totalDisc > 0) {
              return (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-start gap-3">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-400" />
                  <div>
                    <strong className="text-sm text-rose-200 block mb-0.5">
                      Consistency Discrepancy Detected ({totalDisc} flag{totalDisc > 1 ? "s" : ""})
                    </strong>
                    <span>
                      The system identified discrepancies between self-disclosed applicant parameters and data extracted from uploaded documents. Please examine the verification matrices below before entering your underwriting decision.
                    </span>
                  </div>
                </div>
              );
            } else if (hasDocs) {
              return (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-3">
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <strong className="text-sm text-emerald-200 block mb-0.5">
                      Document Disclosures Consistent
                    </strong>
                    <span>
                      All extracted applicant data (Name, Date of Birth/Age, Gender, and Smoking status) aligns with application disclosures without detected contradictions.
                    </span>
                  </div>
                </div>
              );
            } else {
              return (
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-start gap-3">
                  <Info size={18} className="shrink-0 mt-0.5 text-blue-400" />
                  <div>
                    <strong className="text-sm text-slate-300 block mb-0.5">No Documents Attached</strong>
                    <span>Applicant did not upload verification documents with this policy submission.</span>
                  </div>
                </div>
              );
            }
          })()}

          {/* Document Intelligence Cards */}
          {application.documents && application.documents.length > 0 && (
            <div className="space-y-4">
              {application.documents.map((doc) => {
                const isExpanded = !!expandedDocText[doc.id];
                const hasChecks = doc.consistency_checks && doc.consistency_checks.length > 0;
                const hasEntities = doc.structured_data && Object.keys(doc.structured_data).length > 0;

                return (
                  <div
                    key={doc.id}
                    className={`border rounded-xl p-5 transition ${
                      (doc.discrepancy_count || 0) > 0
                        ? "bg-rose-950/10 border-rose-500/30"
                        : "bg-slate-900/40 border-slate-800"
                    }`}
                  >
                    {/* Document Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{doc.document_type}</h4>
                            {(doc.discrepancy_count || 0) > 0 ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                ⚠ {doc.discrepancy_count} Discrepancy
                              </span>
                            ) : doc.status === "PROCESSED" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                ✓ Verified Match
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {doc.filename} • {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "—"} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {doc.extraction_method && (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {doc.extraction_method === "EMBEDDED_PDF_TEXT"
                              ? "PDF Native Text"
                              : doc.extraction_method.startsWith("TESSERACT")
                              ? "Tesseract OCR"
                              : doc.extraction_method}
                          </span>
                        )}
                        {doc.storage_path && (
                          <button
                            onClick={() => handleViewDocumentFile(doc.id)}
                            disabled={fileLoadingId === doc.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition disabled:opacity-50"
                            title="Open original document in new tab"
                          >
                            {fileLoadingId === doc.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <ExternalLink size={13} />
                            )}
                            View File
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Consistency Checks Matrix */}
                    {hasChecks && (
                      <div className="mt-4 space-y-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <FileCheck size={14} className="text-blue-400" />
                          Application Disclosure Cross-Verification
                        </div>
                        <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                              <tr>
                                <th className="px-3.5 py-2.5">Verification Field</th>
                                <th className="px-3.5 py-2.5">Application Disclosure</th>
                                <th className="px-3.5 py-2.5">Extracted from Document</th>
                                <th className="px-3.5 py-2.5">Status</th>
                                <th className="px-3.5 py-2.5">Verification Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {doc.consistency_checks!.map((chk, idx) => (
                                <tr
                                  key={idx}
                                  className={chk.status === "MISMATCH" ? "bg-rose-500/5" : "hover:bg-slate-900/30"}
                                >
                                  <td className="px-3.5 py-2.5 font-medium text-white">{chk.label}</td>
                                  <td className="px-3.5 py-2.5 font-mono text-slate-300">{String(chk.application_value ?? "—")}</td>
                                  <td className="px-3.5 py-2.5 font-mono text-slate-300">{String(chk.document_value ?? "—")}</td>
                                  <td className="px-3.5 py-2.5">
                                    {chk.status === "MATCH" ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                        MATCH ✓
                                      </span>
                                    ) : chk.status === "MISMATCH" ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                                        MISMATCH ⚠
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                        NOT DETECTED
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-slate-400 text-[11px]">{chk.details}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Structured Extracted Fields Grid */}
                    {hasEntities && (
                      <div className="mt-4 space-y-2">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Extracted Structured Entities
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                          {Object.entries(doc.structured_data!).map(([key, val]) => (
                            <div key={key} className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5">
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 block truncate">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span className="text-white font-mono font-medium truncate block mt-0.5">
                                {Array.isArray(val) ? val.join(", ") : String(val)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted Raw Text Drawer */}
                    {doc.extracted_text && (
                      <div className="mt-4 pt-3 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => toggleDocText(doc.id)}
                          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-medium"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          <span>
                            {isExpanded ? "Hide" : "View"} Extracted Source Text ({doc.extracted_text.length} chars)
                          </span>
                        </button>

                        {isExpanded && (
                          <pre className="mt-2 text-[11px] font-mono bg-slate-950 text-slate-300 p-3.5 rounded-xl max-h-48 overflow-y-auto border border-slate-800/80 whitespace-pre-wrap leading-relaxed">
                            {doc.extracted_text}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Underwriting Intelligence & Decision Support Card */}
        {underwritingSummary && (
          <div className="bg-slate-950/70 border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-6">
            {/* Dossier Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      AI Underwriting Intelligence & Decision Support
                    </h3>
                    <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                      Rule Engine + TreeSHAP + OCR
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Automated, explainable decision support synthesized from ML predictions, document verification, and underwriting standards.
                  </p>
                </div>
              </div>

              {/* Review Priority Badge */}
              <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Review Urgency:</span>
                  <span
                    className={`px-3.5 py-1 rounded-full text-xs font-extrabold border tracking-wide uppercase ${
                      underwritingSummary.review_priority === "CRITICAL"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-lg shadow-rose-500/10"
                        : underwritingSummary.review_priority === "HIGH"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10"
                        : underwritingSummary.review_priority === "MEDIUM"
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-lg shadow-sky-500/10"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                    }`}
                  >
                    Priority: {underwritingSummary.review_priority}
                  </span>
                </div>
                {underwritingSummary.review_priority_reasons && underwritingSummary.review_priority_reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 sm:justify-end">
                    {underwritingSummary.review_priority_reasons.map((reason, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Synthesized Review Narrative */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Brain size={15} />
                <span>Deterministic Underwriting Synthesis</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {underwritingSummary.summary_narrative || underwritingSummary.summary}
              </p>
            </div>

            {/* Sub-Grid: Risk Indicators & SHAP/Document Signals */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Column 1: Underwriting Review Indicators (7 cols) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <FileText size={15} className="text-blue-400" />
                    Review Indicators ({underwritingSummary.risk_indicators.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {underwritingSummary.risk_indicators.filter((i) => i.requires_review).length} require review
                  </span>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {underwritingSummary.risk_indicators.map((ind, idx) => {
                    const sevStyle =
                      ind.severity === "critical"
                        ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                        : ind.severity === "warning"
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                        : ind.severity === "attention"
                        ? "bg-purple-500/10 border-purple-500/40 text-purple-300"
                        : "bg-blue-500/10 border-blue-500/30 text-blue-300";

                    const badgeStyle =
                      ind.severity === "critical"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                        : ind.severity === "warning"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : ind.severity === "attention"
                        ? "bg-purple-500/20 text-purple-300 border-purple-500/50"
                        : "bg-blue-500/20 text-blue-300 border-blue-500/50";

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition ${sevStyle}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}>
                              {ind.severity}
                            </span>
                            <span className="font-mono text-xs font-semibold text-white">
                              {ind.code}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800">
                            {ind.category || ind.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 mt-2 font-medium leading-relaxed">
                          {ind.message}
                        </p>
                        {ind.requires_review && (
                          <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                            <AlertTriangle size={12} />
                            <span>Action flag: manual verification required</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: SHAP Attribution Drivers + Document Findings (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* SHAP Drivers Box */}
                {underwritingSummary.shap_summary && (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <BarChart3 size={15} className="text-purple-400" />
                        Key Premium Drivers
                      </span>
                      {underwritingSummary.predicted_charge && (
                        <span className="text-xs font-mono font-bold text-white">
                          ₹ {Math.round(underwritingSummary.predicted_charge).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {/* Top Positive Surcharges */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1">
                        <TrendingUp size={12} /> Surcharge Factors (+)
                      </span>
                      {underwritingSummary.shap_summary.top_positive_factors.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-xs bg-slate-950/40 px-2.5 py-1.5 rounded border border-slate-800/80">
                          <span className="text-slate-300 font-medium truncate pr-2">
                            {f.feature} ({f.value})
                          </span>
                          <span className="text-rose-400 font-mono font-bold shrink-0">
                            + ₹ {Math.round(f.impact).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                      {underwritingSummary.shap_summary.top_positive_factors.length === 0 && (
                        <p className="text-[11px] text-slate-500 italic">No positive cost drivers.</p>
                      )}
                    </div>

                    {/* Top Negative Discounts */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                        <TrendingDown size={12} /> Discount Factors (-)
                      </span>
                      {underwritingSummary.shap_summary.top_negative_factors.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex justify-between items-center text-xs bg-slate-950/40 px-2.5 py-1.5 rounded border border-slate-800/80">
                          <span className="text-slate-300 font-medium truncate pr-2">
                            {f.feature} ({f.value})
                          </span>
                          <span className="text-emerald-400 font-mono font-bold shrink-0">
                            - ₹ {Math.round(f.impact).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                      {underwritingSummary.shap_summary.top_negative_factors.length === 0 && (
                        <p className="text-[11px] text-slate-500 italic">No negative discount drivers.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Document Consistency Finding Box */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <FileCheck size={15} className="text-blue-400" />
                      Document Verification State
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        underwritingSummary.document_findings.has_critical_discrepancy
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : underwritingSummary.document_findings.discrepancy_count > 0
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      {underwritingSummary.document_findings.has_critical_discrepancy
                        ? "CRITICAL MISMATCH"
                        : underwritingSummary.document_findings.discrepancy_count > 0
                        ? `${underwritingSummary.document_findings.discrepancy_count} DISCREPANCY`
                        : "VERIFIED CONSISTENT"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800/80">
                      <span className="text-[10px] uppercase text-slate-500 block">Uploaded Docs</span>
                      <span className="font-bold text-white">{underwritingSummary.document_findings.total_documents}</span>
                    </div>
                    <div className="bg-slate-950/40 p-2 rounded border border-slate-800/80">
                      <span className="text-[10px] uppercase text-slate-500 block">Verified Disclosures</span>
                      <span className="font-bold text-emerald-400">{underwritingSummary.document_findings.verified_fields_count}</span>
                    </div>
                  </div>

                  {underwritingSummary.document_findings.findings.length > 0 && (
                    <ul className="text-xs text-slate-300 space-y-1 pt-1 list-disc list-inside">
                      {underwritingSummary.document_findings.findings.map((f, i) => (
                        <li key={i} className="leading-snug text-slate-300">
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Human-in-the-Loop Explicit Disclaimer */}
            <div className="flex items-start gap-3 bg-purple-950/20 border border-purple-500/30 rounded-xl p-4 text-xs text-purple-200">
              <ShieldCheck size={18} className="text-purple-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="text-white block font-semibold">
                  Human-in-the-Loop Governance Notice
                </strong>
                <p className="text-slate-300 leading-relaxed">
                  This decision support package assists the underwriter. The final underwriting verdict rests entirely with the underwriter. The system never automatically issues or rejects policies.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Coverage & Policy Recommendation (Phase 10 Prototype) */}
        {coverageRecommendation && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-teal-400 border border-teal-500/30">
                  <Layers size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Coverage & Policy Recommendation</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/15 text-teal-300 border border-teal-500/30">
                      Prototype Decision Support
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Indicative plan tiers computed deterministically from applicant risk profile & XGBoost v2.0 prediction
                  </p>
                </div>
              </div>

              {/* Badges: Risk Tier & Review Priority */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-900 text-slate-300 border border-slate-700">
                  Risk Tier: <strong className="text-white">{coverageRecommendation.risk_tier}</strong>
                </span>
                <span className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold border ${
                  coverageRecommendation.review_priority === "CRITICAL"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                    : coverageRecommendation.review_priority === "HIGH"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}>
                  Priority: <strong>{coverageRecommendation.review_priority}</strong>
                </span>
              </div>
            </div>

            {/* Coverage Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {coverageRecommendation.coverage_options.map((opt) => {
                const isSuggested = opt.product_code === coverageRecommendation.suggested_product_code;
                return (
                  <div
                    key={opt.product_code}
                    className={`rounded-xl p-5 transition flex flex-col justify-between relative ${
                      isSuggested
                        ? "bg-gradient-to-b from-teal-950/40 to-slate-900/90 border-2 border-teal-500/80 shadow-lg shadow-teal-950/40"
                        : "bg-slate-900/60 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {isSuggested && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-teal-500 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                          <Sparkles size={11} />
                          Suggested for Review
                        </span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          {opt.product_code}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {opt.policy_period_years} Year Term
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white mb-3">{opt.product_name}</h4>
                      <div className="mb-4">
                        <span className="text-2xl font-black text-white">{opt.coverage_display}</span>
                        <span className="text-[11px] text-slate-400 block">Sum Insured</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80">
                      <span className="text-[11px] text-slate-400 block">Indicative Annual Premium</span>
                      <div className="text-xl font-bold text-white mt-0.5 font-mono">
                        ₹ {Math.round(opt.indicative_premium).toLocaleString("en-IN")}
                        <span className="text-xs font-normal text-slate-500"> / yr</span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {opt.pricing_note}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation Reason Callout */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Info size={14} className="text-teal-400" />
                Recommendation Rationale & Underwriter Context
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {coverageRecommendation.recommendation_reason}
              </p>
              <div className="mt-2 text-[11px] text-slate-400">
                <span>Base Persisted Prediction: </span>
                <strong className="text-white font-mono">
                  ₹ {Math.round(coverageRecommendation.base_predicted_premium).toLocaleString("en-IN")}
                </strong>
                <span className="ml-3 text-slate-500">
                  ({coverageRecommendation.pricing_disclaimer})
                </span>
              </div>
            </div>

            {/* Prominent Governance Notice */}
            <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200">
              <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="text-amber-300 block font-semibold">
                  Important Governance Notice
                </strong>
                <p className="text-slate-300 leading-relaxed">
                  {coverageRecommendation.human_in_the_loop_disclaimer}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Underwriter Decision Panel & Audit History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Decision Form (7 cols) */}
          <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold uppercase tracking-wider pb-3 border-b border-slate-800 mb-4">
              <Send size={16} />
              Submit Formal Underwriting Decision
            </div>

            {decisionSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>{decisionSuccess}</span>
              </div>
            )}

            {decisionError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{decisionError}</span>
              </div>
            )}

            <form onSubmit={handleDecisionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Underwriting Verdict
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision("APPROVE")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      decision === "APPROVE"
                        ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <CheckCircle2 size={14} />
                    Approve
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("REQUEST_REVIEW")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      decision === "REQUEST_REVIEW"
                        ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-600/20"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <AlertTriangle size={14} />
                    Request Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("REJECT")}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      decision === "REJECT"
                        ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/20"
                        : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    <AlertCircle size={14} />
                    Reject
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Underwriting Notes & Justification
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Record underwriting rationale, document verification remarks, or risk surcharge justifications..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-xs transition"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={submittingDecision}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium px-6 py-2.5 rounded-xl transition text-xs shadow-md shadow-blue-600/20"
                >
                  {submittingDecision ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Recording Decision...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Commit Underwriting Decision
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Decision Audit History (5 cols) */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <History size={16} />
                  Decision Audit History
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {application.decisions ? application.decisions.length : 0} event(s)
                </span>
              </div>

              {application.decisions && application.decisions.length > 0 ? (
                <div className="space-y-3 overflow-y-auto max-h-[280px] pr-1">
                  {application.decisions.map((item) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                            item.decision === "APPROVE"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : item.decision === "REJECT"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {item.decision}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.created_at ? new Date(item.created_at).toLocaleString() : "Recently"}
                        </span>
                      </div>
                      <p className="text-slate-300 text-xs mt-1">
                        {item.notes || <span className="text-slate-500 italic">No notes attached.</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 pt-1">
                        Underwriter: <strong className="text-slate-400">{item.underwriter_name || `User #${item.underwriter_id}`}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs italic">
                  No prior decisions have been recorded for this application.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 text-center">
              All decisions are permanently recorded in the database audit log.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

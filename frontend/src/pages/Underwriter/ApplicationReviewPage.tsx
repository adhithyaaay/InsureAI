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
} from "lucide-react";
import api from "../../services/api";

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

interface DocumentItem {
  id: number;
  application_id: number;
  document_type: string;
  filename: string;
  file_size?: number | null;
  status: string;
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

  const fetchApplicationDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<ApplicationDetails>(`/applications/${id}`);
      setApplication(res.data);
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

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Submitted: {new Date(application.created_at).toLocaleString()}</span>
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

        {/* Uploaded Documents Review */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <FileText size={16} />
              Applicant Uploaded Documents
            </div>
            <span className="text-xs text-slate-400">
              {application.documents ? application.documents.length : 0} document(s) attached
            </span>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              <strong>Manual Document Verification Notice:</strong> Automated OCR and identity verification is pending in this release. All documents are flagged as <strong>UPLOADED_PENDING_REVIEW</strong> and must be examined manually by the underwriter.
            </span>
          </div>

          {application.documents && application.documents.length > 0 ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Document Category</th>
                    <th className="px-4 py-3">Submitted Filename</th>
                    <th className="px-4 py-3">File Size</th>
                    <th className="px-4 py-3">Upload Timestamp</th>
                    <th className="px-4 py-3">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                  {application.documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-4 py-3.5 font-medium text-white">
                        {doc.document_type}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        {doc.filename}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {new Date(doc.uploaded_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs italic">
              No documents were uploaded with this application.
            </div>
          )}
        </div>

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

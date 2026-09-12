import { useState } from "react";
import {
  ShieldCheck,
  IndianRupee,
  Brain,
  AlertTriangle,
  RotateCcw,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Info,
  BarChart3,
  Loader2,
} from "lucide-react";

import type { InsuranceFormData, PredictionResult } from "@/types/insurance";
import { downloadUnderwritingReport } from "@/services/reportService";

interface Props {
  prediction: PredictionResult | null;
  applicationId?: number | null;
  formData?: InsuranceFormData;
  onReset?: () => void;
  loading?: boolean;
}

export default function DecisionCard({
  prediction,
  applicationId,
  formData,
  onReset,
  loading = false,
}: Props) {
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Exact application ID verification (NEVER fallback to prediction.id)
  const resolvedApplicationId = applicationId ?? prediction?.application_id ?? null;

  const handleDownloadReport = async () => {
    setReportError(null);

    if (!resolvedApplicationId) {
      setReportError("Application ID is unavailable. Please open the application review page to download the report.");
      return;
    }

    try {
      setDownloadingReport(true);
      await downloadUnderwritingReport(resolvedApplicationId);
    } catch (err: unknown) {
      console.error("Failed to download underwriting report:", err);
      let errorMsg = "Failed to download underwriting report. Please try again.";
      if (err && typeof err === "object" && "response" in err) {
        const responseData = (err as { response?: { data?: { detail?: string } } }).response?.data;
        if (responseData?.detail) {
          errorMsg = responseData.detail;
        }
      }
      setReportError(errorMsg);
    } finally {
      setDownloadingReport(false);
    }
  };
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-12 text-center border border-slate-200">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">
          Generating AI Underwriting Decision...
        </h2>
        <p className="text-slate-500 mt-2">
          Evaluating applicant risk parameters with our trained XGBoost model.
        </p>
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-12 text-center border border-slate-200">
        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
        <h2 className="text-2xl font-bold text-slate-800">
          No Prediction Available
        </h2>
        <p className="text-slate-500 mt-2 mb-6">
          Please complete your application details and submit for evaluation.
        </p>
        {onReset && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition"
          >
            <RotateCcw size={16} />
            Return to Application
          </button>
        )}
      </div>
    );
  }

  const riskLower = prediction.risk_level.toLowerCase();
  const isLow = riskLower.includes("low");
  const isMedium = riskLower.includes("medium");
  const isHigh = riskLower.includes("high");

  const riskTheme = isLow
    ? {
        textColor: "text-emerald-700",
        bgColor: "bg-emerald-50",
        borderColor: "border-emerald-200",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
        icon: CheckCircle2,
      }
    : isMedium
    ? {
        textColor: "text-amber-700",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
        icon: AlertTriangle,
      }
    : {
        textColor: "text-rose-700",
        bgColor: "bg-rose-50",
        borderColor: "border-rose-200",
        badgeColor: "bg-rose-100 text-rose-800 border-rose-300",
        icon: AlertTriangle,
      };

  const RiskIcon = riskTheme.icon;

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
      <div className="text-center mb-8">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Brain size={14} />
            XGBoost Risk Assessment v{prediction.model_version || "2.0"}
          </div>
          {resolvedApplicationId && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 font-mono">
              <span>App Ref: #APP-{String(resolvedApplicationId).padStart(5, "0")}</span>
            </div>
          )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          AI Underwriting Decision
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Calculated using trained XGBoost machine learning prediction on applicant risk factors
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Estimated Premium */}
        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/60">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <IndianRupee className="text-blue-600" size={24} />
            <span className="text-sm font-medium">Predicted Annual Charges</span>
          </div>

          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mt-2">
            ₹ {Math.round(prediction.predicted_charge).toLocaleString("en-IN")}
          </h2>
          <p className="text-xs text-slate-500 mt-2">
            Exact model prediction: ₹ {prediction.predicted_charge.toFixed(2)}
          </p>
        </div>

        {/* Risk Level */}
        <div className={`border rounded-xl p-6 ${riskTheme.bgColor} ${riskTheme.borderColor}`}>
          <div className="flex items-center gap-2 text-slate-600 mb-2">
            <RiskIcon className={riskTheme.textColor} size={24} />
            <span className="text-sm font-medium">Assessed Risk Tier</span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <h2 className={`text-3xl font-extrabold ${riskTheme.textColor}`}>
              {prediction.risk_level.toUpperCase()}
            </h2>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${riskTheme.badgeColor}`}
            >
              {isLow ? "Standard Tier" : isMedium ? "Substandard Tier" : "High Risk Tier"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Derived from statistical risk profiling
          </p>
        </div>

        {/* AI Recommendation */}
        <div className="border border-slate-200 rounded-xl p-6 md:col-span-2 bg-gradient-to-r from-slate-50 to-blue-50/30">
          <div className="flex items-center gap-2 text-slate-700 mb-2">
            <ShieldCheck className="text-blue-600" size={24} />
            <h3 className="font-semibold text-slate-800">Underwriting Recommendation</h3>
          </div>

          <p className="text-xl font-bold text-slate-900 mt-1">
            {prediction.recommendation}
          </p>

          <div className="mt-3 text-xs text-slate-600 bg-white/80 p-3 rounded-lg border border-slate-200">
            {isLow && (
              <span>
                <strong>Next Step:</strong> Applicant qualifies for instant standard issuance. No additional underwriting escalation needed.
              </span>
            )}
            {isMedium && (
              <span>
                <strong>Next Step:</strong> Secondary review recommended. Verifying income and medical records will finalize underwriting tier.
              </span>
            )}
            {isHigh && (
              <span>
                <strong>Next Step:</strong> High premium risk tier. Mandatory manual review and senior underwriter sign-off required.
              </span>
            )}
          </div>
        </div>

        {/* Applicant Summary Recap if available */}
        {formData && (
          <div className="border border-slate-200 rounded-xl p-5 md:col-span-2 bg-slate-50/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">
              <FileSpreadsheet size={16} />
              Evaluated Input Profile
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-700">
                <strong>Age:</strong> {formData.age}
              </span>
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-700">
                <strong>Gender:</strong> {formData.sex === 1 ? "Male" : "Female"}
              </span>
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-700">
                <strong>BMI:</strong> {formData.bmi}
              </span>
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-700">
                <strong>Children:</strong> {formData.children}
              </span>
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-700">
                <strong>Smoker:</strong> {formData.smoker === 1 ? "Yes" : "No"}
              </span>
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-700 capitalize">
                <strong>Region:</strong> {formData.region}
              </span>
            </div>
          </div>
        )}

        {/* SHAP Explainability Breakdown */}
        <div className="border border-slate-200 rounded-xl p-6 md:col-span-2 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="text-blue-600" size={22} />
                <h3 className="text-lg font-bold text-slate-900">
                  AI Prediction Explanation
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Top risk factors influencing the predicted premium using SHAP (SHapley Additive exPlanations)
              </p>
            </div>
            {prediction.base_charge && (
              <div className="text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600">
                <span>Baseline Population Average: </span>
                <strong className="text-slate-900">
                  ₹ {Math.round(prediction.base_charge).toLocaleString("en-IN")}
                </strong>
              </div>
            )}
          </div>

          {prediction.explanation && prediction.explanation.length > 0 ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Factors Increasing Premium */}
                <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-rose-800 text-xs font-bold uppercase tracking-wider mb-2.5">
                    <TrendingUp size={16} className="text-rose-600" />
                    Factors Increasing Premium (+)
                  </div>
                  <div className="space-y-2">
                    {prediction.explanation
                      .filter((item) => item.direction === "increase")
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700 truncate pr-2">
                            {item.feature} ({item.value})
                          </span>
                          <span className="font-bold text-rose-700 shrink-0">
                            + ₹ {Math.round(item.impact).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    {prediction.explanation.filter((item) => item.direction === "increase").length === 0 && (
                      <p className="text-xs text-slate-400 italic">No significant risk escalations.</p>
                    )}
                  </div>
                </div>

                {/* Factors Decreasing Premium */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-2.5">
                    <TrendingDown size={16} className="text-emerald-600" />
                    Factors Decreasing Premium (-)
                  </div>
                  <div className="space-y-2">
                    {prediction.explanation
                      .filter((item) => item.direction === "decrease")
                      .map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700 truncate pr-2">
                            {item.feature} ({item.value})
                          </span>
                          <span className="font-bold text-emerald-700 shrink-0">
                            - ₹ {Math.round(item.impact).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    {prediction.explanation.filter((item) => item.direction === "decrease").length === 0 && (
                      <p className="text-xs text-slate-400 italic">No significant premium discounts.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Complete Factor Contribution Table with Visual Impact Bars */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Detailed Factor Impact Breakdown
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Sorted by impact magnitude
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-semibold text-slate-600 grid grid-cols-12 gap-2">
                    <span className="col-span-5">Feature</span>
                    <span className="col-span-3">Value</span>
                    <span className="col-span-2 text-right">Impact</span>
                    <span className="col-span-2 text-center">Direction</span>
                  </div>
                  <div className="divide-y divide-slate-100 bg-white">
                    {prediction.explanation.map((item, index) => {
                      const isIncrease = item.direction === "increase";
                      const maxImpact = Math.max(...prediction.explanation!.map((f) => f.impact), 1);
                      const barWidth = Math.max(Math.round((item.impact / maxImpact) * 100), 6);
                      return (
                        <div key={index} className="px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center hover:bg-slate-50/50 transition">
                          <div className="col-span-5">
                            <p className="font-semibold text-slate-800">{item.feature}</p>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${isIncrease ? "bg-rose-500" : "bg-emerald-500"}`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                          <div className="col-span-3 text-slate-600 truncate font-medium">
                            {String(item.value)}
                          </div>
                          <div className={`col-span-2 text-right font-bold ${isIncrease ? "text-rose-700" : "text-emerald-700"}`}>
                            {isIncrease ? "+" : "-"} ₹ {Math.round(item.impact).toLocaleString("en-IN")}
                          </div>
                          <div className="col-span-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isIncrease
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              }`}
                            >
                              {isIncrease ? "Increase" : "Decrease"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Model Explainability:</strong> SHAP values calculate the exact additive contribution of each factor pushing the prediction away from the population expected baseline. They represent true mathematical attribution, not confidence probability.
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs italic">
              Explainability metrics not available for this prediction response.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center">
        {reportError && (
          <div className="w-full max-w-md mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-center gap-2">
            <AlertTriangle size={15} className="shrink-0 text-rose-600" />
            <span>{reportError}</span>
          </div>
        )}

        <div className="flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm disabled:opacity-50"
          >
            {downloadingReport ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloadingReport ? "Downloading Report..." : "Download Underwriting Report"}
          </button>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-2 border border-slate-300 bg-white text-slate-700 px-6 py-2.5 rounded-lg hover:bg-slate-50 transition text-sm font-medium shadow-sm"
            >
              <RotateCcw size={16} />
              Start New Application
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
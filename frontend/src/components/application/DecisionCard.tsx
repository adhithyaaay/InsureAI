import {
  ShieldCheck,
  IndianRupee,
  Brain,
  AlertTriangle,
  RotateCcw,
  Download,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";

import type { InsuranceFormData, PredictionResult } from "@/types/insurance";

interface Props {
  prediction: PredictionResult | null;
  formData?: InsuranceFormData;
  onReset?: () => void;
  loading?: boolean;
}

export default function DecisionCard({
  prediction,
  formData,
  onReset,
  loading = false,
}: Props) {
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
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-3">
          <Brain size={14} />
          XGBoost Risk Assessment v1.0
        </div>
        <h1 className="text-3xl font-bold text-slate-900">
          AI Underwriting Decision
        </h1>
        <p className="mt-1 text-slate-500 text-sm">
          Calculated using real-time machine learning prediction on applicant risk factors
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
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-4 mt-8 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={() => alert("Report generation with full underwriting breakdown will be available in Phase 8.")}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
        >
          <Download size={16} />
          Download Underwriting Report
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
  );
}
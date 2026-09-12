import {
  User,
  HeartPulse,
  Cigarette,
  MapPin,
  Users,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";

import type { InsuranceFormData } from "@/types/insurance";

interface Props {
  formData: InsuranceFormData;
  files: Record<string, File | null>;
  onEditDetails?: () => void;
  onEditDocs?: () => void;
}

export default function ReviewCard({
  formData,
  files,
  onEditDetails,
  onEditDocs,
}: Props) {
  const getBmiCategory = (bmi: number | "") => {
    if (bmi === "") return "";
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal weight";
    if (bmi < 30) return "Overweight";
    return "Obese";
  };

  const formatRegion = (region: string) => {
    switch (region.toLowerCase()) {
      case "northeast":
        return "US Northeast";
      case "northwest":
        return "US Northwest";
      case "southeast":
        return "US Southeast";
      case "southwest":
        return "US Southwest";
      default:
        return region || "Not specified";
    }
  };

  const documentList = [
    { key: "aadhaar", label: "Aadhaar Card" },
    { key: "pan", label: "PAN Card" },
    { key: "medical", label: "Medical Report" },
    { key: "income", label: "Income Proof" },
  ];

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Review Application Details
        </h1>
        <p className="mt-2 text-slate-500">
          Verify your entered information and document submission before generating an underwriting decision.
        </p>
      </div>

      {/* Applicant Demographics & Health Profile */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <User className="text-blue-600" size={20} />
            Applicant Profile
          </h2>
          {onEditDetails && (
            <button
              type="button"
              onClick={onEditDetails}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Edit Details
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Age */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Calendar size={15} className="text-slate-400" />
              Age
            </div>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {formData.age} <span className="text-xs font-normal text-slate-500">years</span>
            </p>
          </div>

          {/* Gender */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <User size={15} className="text-slate-400" />
              Gender
            </div>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {formData.sex === 1 ? "Male" : formData.sex === 0 ? "Female" : "Not specified"}
            </p>
          </div>

          {/* BMI */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <HeartPulse size={15} className="text-slate-400" />
              BMI Index
            </div>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {formData.bmi}{" "}
              <span className="text-xs font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1">
                {getBmiCategory(formData.bmi)}
              </span>
            </p>
          </div>

          {/* Children */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Users size={15} className="text-slate-400" />
              Dependents
            </div>
            <p className="text-xl font-bold text-slate-800 mt-1">
              {formData.children}{" "}
              <span className="text-xs font-normal text-slate-500">
                {formData.children === 1 ? "child" : "children"}
              </span>
            </p>
          </div>

          {/* Smoker */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <Cigarette size={15} className="text-slate-400" />
              Tobacco User
            </div>
            <div className="mt-1">
              {formData.smoker === 1 ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                  Yes (Smoker)
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-800">
                  No (Non-smoker)
                </span>
              )}
            </div>
          </div>

          {/* Region */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
              <MapPin size={15} className="text-slate-400" />
              Residential Region
            </div>
            <p className="text-lg font-bold text-slate-800 mt-1">
              {formatRegion(formData.region)}
            </p>
          </div>
        </div>
      </div>

      {/* Uploaded Documents Summary */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" size={20} />
            Document Verification Status
          </h2>
          {onEditDocs && (
            <button
              type="button"
              onClick={onEditDocs}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Manage Documents
            </button>
          )}
        </div>

        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
          {documentList.map((item) => {
            const file = files[item.key];
            return (
              <div
                key={item.key}
                className="p-3.5 flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={16} className={file ? "text-blue-600" : "text-slate-400"} />
                  <span className="font-medium text-slate-700">{item.label}</span>
                </div>

                <div>
                  {file ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full">
                      <Clock size={12} className="text-amber-600" />
                      Uploaded (Pending Review)
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">
                      Not uploaded
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 p-3 rounded-xl">
          <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <span>
            Automated document OCR & verification pipeline is currently a demo placeholder. Uploaded files are logged for underwriter review.
          </span>
        </div>
      </div>

      {/* Model Invocation Notice */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 flex items-center gap-4">
        <div className="p-3 bg-blue-600 text-white rounded-xl shrink-0">
          <Sparkles size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">
            Ready for AI Underwriting Evaluation
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Clicking <strong>Generate Decision</strong> will submit this profile to our live XGBoost regression engine to predict annual insurance charges and assess risk.
          </p>
        </div>
      </div>
    </div>
  );
}
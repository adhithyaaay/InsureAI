import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import api from "@/services/api";

import type {
  InsuranceFormData,
  InsurancePayload,
  PredictionResult,
  FormErrors,
} from "@/types/insurance";
import ApplicationForm from "./Customer/ApplicationForm";
import DocumentUploader from "@/components/application/DocumentUploader";
import ReviewCard from "@/components/application/ReviewCard";
import ProgressStepper from "@/components/application/ProgressStepper";
import DecisionCard from "@/components/application/DecisionCard";

export default function ApplicationPage() {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<InsuranceFormData>({
    age: "",
    sex: null,
    bmi: "",
    children: "",
    smoker: null,
    region: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const [files, setFiles] = useState<Record<string, File | null>>({
    aadhaar: null,
    pan: null,
    medical: null,
    income: null,
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Age validation
    if (formData.age === "" || formData.age === null || formData.age === undefined) {
      newErrors.age = "Age is required.";
    } else if (!Number.isInteger(Number(formData.age)) || Number(formData.age) <= 0) {
      newErrors.age = "Please enter a valid positive age.";
    } else if (Number(formData.age) < 18 || Number(formData.age) > 100) {
      newErrors.age = "Applicant age must be between 18 and 100.";
    }

    // Gender validation
    if (formData.sex === null || formData.sex === undefined) {
      newErrors.sex = "Please select gender.";
    }

    // BMI validation
    if (formData.bmi === "" || formData.bmi === null || formData.bmi === undefined) {
      newErrors.bmi = "BMI is required.";
    } else if (isNaN(Number(formData.bmi)) || Number(formData.bmi) <= 0) {
      newErrors.bmi = "Please enter a positive BMI.";
    } else if (Number(formData.bmi) < 10 || Number(formData.bmi) > 70) {
      newErrors.bmi = "Please enter a realistic BMI value (10.0 - 70.0).";
    }

    // Children validation
    if (formData.children === "" || formData.children === null || formData.children === undefined) {
      newErrors.children = "Number of children is required (enter 0 if none).";
    } else if (!Number.isInteger(Number(formData.children)) || Number(formData.children) < 0) {
      newErrors.children = "Children count cannot be negative.";
    } else if (Number(formData.children) > 15) {
      newErrors.children = "Please enter a valid number of children (0 - 15).";
    }

    // Smoker validation
    if (formData.smoker === null || formData.smoker === undefined) {
      newErrors.smoker = "Please specify smoker status.";
    }

    // Region validation
    if (!formData.region || formData.region.trim() === "") {
      newErrors.region = "Please select your region.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextFromStep1 = () => {
    if (validateForm()) {
      setStep(2);
    }
  };

  const handlePrediction = async () => {
    if (!validateForm()) {
      setStep(1);
      return;
    }

    try {
      setLoading(true);
      setApiError(null);

      const payload: InsurancePayload = {
        age: Number(formData.age),
        sex: Number(formData.sex),
        bmi: Number(formData.bmi),
        children: Number(formData.children),
        smoker: Number(formData.smoker),
        region: formData.region,
      };

      const response = await api.post<PredictionResult>("/predict", payload);
      setPrediction(response.data);
      setStep(4);
    } catch (err: unknown) {
      console.error("Underwriting Prediction Failed:", err);
      let errorMsg = "Unable to connect to the prediction server. Please verify backend is running on port 8000.";
      if (err && typeof err === "object" && "response" in err) {
        const responseData = (err as { response?: { data?: { detail?: unknown } } }).response?.data;
        if (responseData?.detail && typeof responseData.detail === "string") {
          errorMsg = responseData.detail;
        } else if (Array.isArray(responseData?.detail)) {
          errorMsg = responseData.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join(", ");
        }
      } else if (err instanceof Error) {
        errorMsg = err.message;
      }
      setApiError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      age: "",
      sex: null,
      bmi: "",
      children: "",
      smoker: null,
      region: "",
    });
    setFiles({
      aadhaar: null,
      pan: null,
      medical: null,
      income: null,
    });
    setErrors({});
    setApiError(null);
    setPrediction(null);
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
      <ProgressStepper step={step} />

      {/* Step 1: Customer Details */}
      {step === 1 && (
        <div className="max-w-4xl mx-auto">
          <ApplicationForm
            formData={formData}
            setFormData={setFormData}
            errors={errors}
          />

          <div className="flex justify-end max-w-xl mx-auto mt-6">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-7 py-3 rounded-xl transition shadow-sm"
              onClick={handleNextFromStep1}
            >
              Next: Upload Documents
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Upload Documents */}
      {step === 2 && (
        <div className="max-w-4xl mx-auto">
          <DocumentUploader files={files} setFiles={setFiles} />

          <div className="flex justify-between max-w-4xl mx-auto mt-6">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium px-6 py-2.5 rounded-xl transition shadow-sm"
              onClick={() => setStep(1)}
            >
              <ArrowLeft size={18} />
              Back to Details
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-7 py-2.5 rounded-xl transition shadow-sm"
              onClick={() => setStep(3)}
            >
              Continue to Review
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: AI Review */}
      {step === 3 && (
        <div className="max-w-4xl mx-auto">
          <ReviewCard
            formData={formData}
            files={files}
            onEditDetails={() => setStep(1)}
            onEditDocs={() => setStep(2)}
          />

          {apiError && (
            <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Prediction Request Failed</p>
                <p className="mt-0.5 text-xs text-rose-700">{apiError}</p>
              </div>
              <button
                type="button"
                onClick={handlePrediction}
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition shrink-0"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            </div>
          )}

          <div className="flex justify-between max-w-4xl mx-auto mt-6">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium px-6 py-2.5 rounded-xl transition shadow-sm"
              onClick={() => setStep(2)}
              disabled={loading}
            >
              <ArrowLeft size={18} />
              Back to Uploads
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold px-8 py-3 rounded-xl transition shadow-md"
              onClick={handlePrediction}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Evaluating Model...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Generate Decision →
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Decision */}
      {step === 4 && (
        <div className="max-w-4xl mx-auto">
          <DecisionCard
            prediction={prediction}
            formData={formData}
            onReset={handleReset}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
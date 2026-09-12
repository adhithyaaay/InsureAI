export interface InsuranceFormData {
  age: number | "";
  sex: number | null;
  bmi: number | "";
  children: number | "";
  smoker: number | null;
  region: string;
}

export interface InsurancePayload {
  age: number;
  sex: number;
  bmi: number;
  children: number;
  smoker: number;
  region: string;
}

export interface PredictionResult {
  predicted_charge: number;
  risk_level: string;
  recommendation: string;
}

export interface FormErrors {
  age?: string;
  sex?: string;
  bmi?: string;
  children?: string;
  smoker?: string;
  region?: string;
}

export interface DocumentUploadState {
  aadhaar: File | null;
  pan: File | null;
  medical: File | null;
  income: File | null;
}
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

export interface FeatureImpact {
  feature: string;
  value: string | number;
  impact: number;
  direction: "increase" | "decrease";
}

export interface PredictionResult {
  id?: number;
  application_id?: number;
  model_version?: string;
  predicted_charge: number;
  risk_level: string;
  recommendation: string;
  base_charge?: number;
  explanation?: FeatureImpact[];
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

export interface ConsistencyCheckItem {
  field: string;
  label: string;
  application_value: string | number | null | undefined;
  document_value: string | number | null | undefined;
  status: "MATCH" | "MISMATCH" | "NOT_FOUND";
  details: string;
}

export interface DocumentItem {
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

export interface UnderwritingRiskIndicator {
  code: string;
  category: string;
  title: string;
  severity: "info" | "attention" | "warning" | "critical";
  message: string;
  source?: string;
  requires_review: boolean;
}

export interface ShapFactorDetail {
  feature: string;
  value: string | number;
  impact: number;
  direction: "increase" | "decrease";
  description?: string;
}

export interface ShapSummaryResponse {
  base_charge?: number | null;
  top_positive_factors: ShapFactorDetail[];
  top_negative_factors: ShapFactorDetail[];
  all_factors: Array<ShapFactorDetail | Record<string, unknown>>;
}

export interface DocumentFindingSummary {
  total_documents: number;
  processed_documents: number;
  discrepancy_count: number;
  verified_fields_count: number;
  has_critical_discrepancy: boolean;
  findings: string[];
}

export interface UnderwritingSummaryResponse {
  application_id: number;
  applicant?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  model_version?: string | null;
  base_charge?: number | null;
  predicted_charge?: number | null;
  risk_level?: string;
  recommendation?: string;
  shap_summary?: ShapSummaryResponse | null;
  document_findings: DocumentFindingSummary;
  risk_indicators: UnderwritingRiskIndicator[];
  review_priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  review_priority_reasons: string[];
  requires_human_review?: boolean;
  summary_narrative: string;
  summary?: string;
  human_in_the_loop_disclaimer?: string;
  generated_at: string;
}

export interface CoverageOption {
  product_code: string;
  product_name: string;
  coverage_amount: number;
  coverage_display: string;
  policy_period_years: number;
  base_predicted_premium: number;
  indicative_premium: number;
  pricing_note: string;
}

export interface CoverageRecommendationResponse {
  application_id?: number | null;
  base_predicted_premium: number;
  currency: string;
  coverage_options: CoverageOption[];
  suggested_product_code?: string | null;
  suggested_product_name?: string | null;
  recommendation_reason: string;
  review_priority: string;
  risk_tier: string;
  human_in_the_loop_disclaimer: string;
  pricing_disclaimer: string;
}
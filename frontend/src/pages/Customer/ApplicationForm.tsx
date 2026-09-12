import InsuranceForm from "@/components/common/InsuranceForm";
import type { FormErrors, InsuranceFormData } from "@/types/insurance";

interface Props {
  formData: InsuranceFormData;
  setFormData: React.Dispatch<React.SetStateAction<InsuranceFormData>>;
  errors?: FormErrors;
}

export default function ApplicationForm({
  formData,
  setFormData,
  errors = {},
}: Props) {
  return (
    <div className="min-h-screen bg-slate-950 text-white py-12 px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold">
            Insurance Application
          </h1>

          <p className="mt-3 text-slate-400">
            Fill in your details to receive an AI-powered underwriting decision.
          </p>
        </div>

        <InsuranceForm
          formData={formData}
          setFormData={setFormData}
          errors={errors}
        />
      </div>
    </div>
  );
}
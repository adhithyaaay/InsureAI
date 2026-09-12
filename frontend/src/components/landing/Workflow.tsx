import {
  FileText,
  Upload,
  ScanSearch,
  BrainCircuit,
  BadgeDollarSign,
  ShieldCheck,
} from "lucide-react";

const steps = [
  {
    icon: FileText,
    title: "Application",
    description: "Customer fills insurance application",
  },
  {
    icon: Upload,
    title: "Upload Documents",
    description: "Aadhaar, PAN, Medical Reports",
  },
  {
    icon: ScanSearch,
    title: "AI Extraction",
    description: "OCR extracts all important details",
  },
  {
    icon: BrainCircuit,
    title: "Risk Assessment",
    description: "AI calculates applicant risk score",
  },
  {
    icon: BadgeDollarSign,
    title: "Premium Engine",
    description: "Suggests premium with explanation",
  },
  {
    icon: ShieldCheck,
    title: "Policy Decision",
    description: "Underwriter approves or rejects",
  },
];

export default function Workflow() {
  return (
    <section className="bg-slate-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-16 text-center">

          <p className="text-blue-400 font-semibold uppercase tracking-widest">
            How It Works
          </p>

          <h2 className="mt-4 text-5xl font-bold">
            AI Underwriting Workflow
          </h2>

          <p className="mt-6 text-slate-400">
            From customer application to policy approval in minutes.
          </p>

        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={index}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 transition hover:border-blue-500 hover:-translate-y-2"
              >
                <Icon className="mb-6 h-12 w-12 text-blue-500" />

                <h3 className="text-2xl font-bold">
                  {step.title}
                </h3>

                <p className="mt-4 text-slate-400">
                  {step.description}
                </p>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}
import {
  Upload,
  CheckCircle,
  FileText,
  AlertCircle,
  X,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Props {
  files: Record<string, File | null>;
  setFiles: React.Dispatch<React.SetStateAction<Record<string, File | null>>>;
}

const docs = [
  {
    key: "aadhaar",
    title: "Aadhaar Card",
    description: "Proof of Identity & Age",
  },
  {
    key: "pan",
    title: "PAN Card",
    description: "Tax & Financial Identity",
  },
  {
    key: "medical",
    title: "Medical Report",
    description: "Health checkup & vitals report",
  },
  {
    key: "income",
    title: "Income Proof (Optional)",
    description: "Salary slip or Form 16",
  },
];

export default function DocumentUploader({ files, setFiles }: Props) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string
  ) => {
    if (e.target.files?.length) {
      setFiles((prev) => ({
        ...prev,
        [key]: e.target.files![0],
      }));
    }
  };

  const handleRemove = (key: string) => {
    setFiles((prev) => ({
      ...prev,
      [key]: null,
    }));
  };

  return (
    <Card className="max-w-4xl mx-auto shadow-xl rounded-2xl">
      <CardHeader>
        <CardTitle className="text-3xl text-center">
          Upload Documents
        </CardTitle>
        <p className="text-center text-gray-500">
          Upload applicant verification documents for underwriter review.
        </p>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2.5 max-w-xl mx-auto">
          <AlertCircle size={16} className="shrink-0 text-amber-600" />
          <span>
            <strong>Note:</strong> Automated OCR & document verification pipeline is a placeholder in this phase. Uploaded files are tagged as <em>Uploaded (Pending Review)</em>.
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          {docs.map((doc) => {
            const uploadedFile = files[doc.key];
            return (
              <div
                key={doc.key}
                className="border rounded-xl p-5 hover:border-blue-500 transition bg-slate-50/50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <FileText className="text-blue-600" size={22} />
                    <div>
                      <h3 className="font-semibold text-base text-gray-900">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-gray-500">{doc.description}</p>
                    </div>
                  </div>
                </div>

                <label className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-white transition">
                  <Upload size={26} className="text-gray-500" />
                  <p className="mt-1 text-xs text-gray-500">
                    {uploadedFile ? "Replace file" : "Click to Upload (PDF/Image)"}
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    hidden
                    onChange={(e) => handleChange(e, doc.key)}
                  />
                </label>

                {uploadedFile ? (
                  <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700">
                    <div className="flex items-center gap-2 truncate">
                      <CheckCircle size={15} className="shrink-0 text-green-600" />
                      <span className="truncate font-medium">{uploadedFile.name}</span>
                      <span className="shrink-0 text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-semibold">
                        Uploaded (Pending Review)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(doc.key)}
                      className="text-gray-400 hover:text-red-600 ml-2"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-400 italic">
                    No document selected
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
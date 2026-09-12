import { CheckCircle, Circle } from "lucide-react";

interface Props {
  step: number;
}

const steps = [
  "Customer Details",
  "Upload Documents",
  "AI Review",
  "Decision",
];

export default function ProgressStepper({ step }: Props) {
  return (
    <div className="max-w-5xl mx-auto mb-10">
      <div className="flex items-center justify-between">

        {steps.map((title, index) => {
          const current = index + 1;

          const completed = current < step;
          const active = current === step;

          return (
            <div
              key={title}
              className="flex-1 flex flex-col items-center relative"
            >
              {completed ? (
                <CheckCircle
                  size={34}
                  className="text-green-600"
                />
              ) : (
                <Circle
                  size={34}
                  className={
                    active
                      ? "text-blue-600"
                      : "text-gray-400"
                  }
                />
              )}

              <p
                className={`mt-2 text-sm font-medium ${
                  active
                    ? "text-blue-600"
                    : completed
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {title}
              </p>

              {index !== steps.length - 1 && (
                <div
                  className={`absolute top-4 left-1/2 w-full h-1 ${
                    completed
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                  style={{
                    transform: "translateX(50%)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
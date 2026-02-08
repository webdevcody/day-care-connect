import { cn } from "@daycare-hub/ui";

interface StepIndicatorProps<S extends string> {
  steps: readonly S[];
  currentStep: S;
  onStepClick: (step: S) => void;
}

export function StepIndicator<S extends string>({
  steps,
  currentStep,
  onStepClick,
}: StepIndicatorProps<S>) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="mb-8 flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-2">
          <button
            onClick={() => onStepClick(s)}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors",
              i < currentIndex
                ? "bg-primary text-primary-foreground"
                : i === currentIndex
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {i < currentIndex ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="size-4"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              i + 1
            )}
          </button>
          {i < steps.length - 1 && (
            <div className={cn("h-0.5 flex-1", i < currentIndex ? "bg-primary" : "bg-muted")} />
          )}
        </div>
      ))}
    </div>
  );
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { onboardingService } from "@daycare-hub/services";
import type { OnboardingInput } from "@daycare-hub/shared";
import { queryKeys } from "./query-keys";

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OnboardingInput) => onboardingService.completeOnboarding(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      qc.invalidateQueries({ queryKey: queryKeys.children.all });
    },
  });
}

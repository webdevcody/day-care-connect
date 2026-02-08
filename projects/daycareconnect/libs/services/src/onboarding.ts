import { getApiClient } from "./client";
import type { OnboardingInput } from "@daycare-hub/shared";

export async function completeOnboarding(data: OnboardingInput) {
  return getApiClient().post<{ success: boolean }>("/api/onboarding/complete", data);
}

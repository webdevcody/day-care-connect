import { useQuery, useMutation } from "@tanstack/react-query";
import { adminStripeService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useStripeAccountStatus(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.stripeStatus(facilityId),
    queryFn: () => adminStripeService.getStripeAccountStatus(facilityId),
    enabled: !!facilityId,
  });
}

export function useCreateStripeConnectLink() {
  return useMutation({
    mutationFn: adminStripeService.createStripeConnectLink,
  });
}

export function useGetStripeDashboardLink() {
  return useMutation({
    mutationFn: adminStripeService.getStripeDashboardLink,
  });
}

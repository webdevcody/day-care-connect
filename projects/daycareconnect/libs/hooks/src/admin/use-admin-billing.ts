import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminBillingService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminBillingOverview(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.billingOverview(facilityId),
    queryFn: () => adminBillingService.getFacilityBillingOverview(facilityId),
    enabled: !!facilityId,
  });
}

export function useAdminInvoices(facilityId: string, status?: string) {
  return useQuery({
    queryKey: queryKeys.admin.billingInvoices(facilityId),
    queryFn: () => adminBillingService.getFacilityInvoices(facilityId, { status }),
    enabled: !!facilityId,
  });
}

export function useAdminInvoiceDetail(facilityId: string, invoiceId: string) {
  return useQuery({
    queryKey: queryKeys.admin.billingInvoiceDetail(facilityId, invoiceId),
    queryFn: () => adminBillingService.getAdminInvoiceDetail(invoiceId, facilityId),
    enabled: !!facilityId && !!invoiceId,
  });
}

export function useAdminBillingParents(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.billingParents(facilityId),
    queryFn: () => adminBillingService.getFacilityParents(facilityId),
    enabled: !!facilityId,
  });
}

export function useBillingPlan(enrollmentId: string, facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.billingPlan(enrollmentId),
    queryFn: () => adminBillingService.getBillingPlanForEnrollment(enrollmentId, facilityId),
    enabled: !!enrollmentId && !!facilityId,
  });
}

export function useCreateBillingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminBillingService.createBillingPlan,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "billing"] }),
  });
}

export function useUpdateBillingPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: any }) =>
      adminBillingService.updateBillingPlan(planId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "billing"] }),
  });
}

export function useCreateManualInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminBillingService.createManualInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "billing"] }),
  });
}

export function useUpdateDraftInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: any }) =>
      adminBillingService.updateDraftInvoice(invoiceId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "billing"] }),
  });
}

export function useSendInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminBillingService.sendInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "billing"] }),
  });
}

export function useVoidInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminBillingService.voidInvoice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "billing"] }),
  });
}

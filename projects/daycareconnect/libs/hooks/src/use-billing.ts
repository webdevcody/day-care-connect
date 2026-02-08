import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useParentInvoices(status?: string) {
  return useQuery({
    queryKey: queryKeys.billing.invoices,
    queryFn: () => billingService.getParentInvoices({ status }),
  });
}

export function useParentInvoiceDetail(invoiceId: string) {
  return useQuery({
    queryKey: queryKeys.billing.invoiceDetail(invoiceId),
    queryFn: () => billingService.getParentInvoiceDetail(invoiceId),
    enabled: !!invoiceId,
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: billingService.createCheckoutSession,
  });
}

export function useParentPaymentHistory() {
  return useQuery({
    queryKey: queryKeys.billing.payments,
    queryFn: () => billingService.getParentPaymentHistory(),
  });
}

export function useParentPaymentMethods() {
  return useQuery({
    queryKey: queryKeys.billing.paymentMethods,
    queryFn: () => billingService.getParentPaymentMethods(),
  });
}

export function useRemovePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.removePaymentMethod,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.billing.paymentMethods }),
  });
}

export function useSetDefaultPaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: billingService.setDefaultPaymentMethod,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.billing.paymentMethods }),
  });
}

export function useParentBillingSummary() {
  return useQuery({
    queryKey: queryKeys.billing.summary,
    queryFn: () => billingService.getParentBillingSummary(),
  });
}

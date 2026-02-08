import { getApiClient } from "./client";

export async function getParentInvoices(params?: { status?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  return getApiClient().get<any>(`/api/billing/invoices?${searchParams}`);
}

export async function getParentInvoiceDetail(invoiceId: string) {
  return getApiClient().get<any>(`/api/billing/invoices/${invoiceId}`);
}

export async function createCheckoutSession(invoiceId: string) {
  return getApiClient().post<{ url: string }>(`/api/billing/invoices/${invoiceId}/checkout`);
}

export async function getParentPaymentHistory() {
  return getApiClient().get<any>("/api/billing/payments");
}

export async function getParentPaymentMethods() {
  return getApiClient().get<any>("/api/billing/payment-methods");
}

export async function removePaymentMethod(paymentMethodId: string) {
  return getApiClient().delete<{ success: boolean }>(`/api/billing/payment-methods/${paymentMethodId}`);
}

export async function setDefaultPaymentMethod(paymentMethodId: string) {
  return getApiClient().post<any>(`/api/billing/payment-methods/${paymentMethodId}/default`);
}

export async function getParentBillingSummary() {
  return getApiClient().get<any>("/api/billing/summary");
}

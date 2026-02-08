import { getApiClient } from "../client";

export async function createBillingPlan(data: any) {
  return getApiClient().post<any>("/api/admin/billing/plans", data);
}

export async function updateBillingPlan(planId: string, data: any) {
  return getApiClient().put<any>(`/api/admin/billing/plans/${planId}`, data);
}

export async function getBillingPlanForEnrollment(enrollmentId: string, facilityId: string) {
  return getApiClient().get<any>(`/api/admin/billing/plans?enrollmentId=${enrollmentId}&facilityId=${facilityId}`);
}

export async function getFacilityBillingOverview(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/billing/overview/${facilityId}`);
}

export async function getFacilityInvoices(facilityId: string, params?: { status?: string }) {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set("status", params.status);
  return getApiClient().get<any>(`/api/admin/billing/invoices/${facilityId}?${searchParams}`);
}

export async function createManualInvoice(data: any) {
  return getApiClient().post<any>("/api/admin/billing/invoices", data);
}

export async function updateDraftInvoice(invoiceId: string, data: any) {
  return getApiClient().put<any>(`/api/admin/billing/invoices/${invoiceId}`, data);
}

export async function sendInvoice(invoiceId: string) {
  return getApiClient().post<any>(`/api/admin/billing/invoices/${invoiceId}/send`);
}

export async function voidInvoice(invoiceId: string) {
  return getApiClient().post<any>(`/api/admin/billing/invoices/${invoiceId}/void`);
}

export async function getAdminInvoiceDetail(invoiceId: string, facilityId: string) {
  return getApiClient().get<any>(`/api/admin/billing/invoices/${facilityId}/${invoiceId}`);
}

export async function getFacilityParents(facilityId: string) {
  return getApiClient().get<any>(`/api/admin/billing/parents/${facilityId}`);
}

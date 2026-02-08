import { getApiClient } from "../client";

export interface EnrolledParent {
  id: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  children: { firstName: string; lastName: string }[];
}

export interface SendEmailRequest {
  facilityId: string;
  parentIds: string[];
  subject: string;
  body: string;
}

export interface SendEmailResult {
  sent: number;
  failed: number;
  total: number;
}

export async function getEnrolledParents(facilityId: string): Promise<EnrolledParent[]> {
  return getApiClient().get<EnrolledParent[]>(`/api/admin/emails/${facilityId}/parents`);
}

export async function sendEmail(data: SendEmailRequest): Promise<SendEmailResult> {
  return getApiClient().post<SendEmailResult>(`/api/admin/emails/${data.facilityId}/send`, {
    parentIds: data.parentIds,
    subject: data.subject,
    body: data.body,
  });
}

import { getApiClient } from "./client";

export async function uploadPdf(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return getApiClient().upload<{ url: string }>("/api/uploads/pdf", formData);
}

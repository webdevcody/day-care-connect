import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminDocumentsService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminDocumentTemplates(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.documentTemplates(facilityId),
    queryFn: () => adminDocumentsService.getFacilityDocumentTemplates(facilityId),
    enabled: !!facilityId,
  });
}

export function useCreateDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }: { facilityId: string; data: any }) =>
      adminDocumentsService.createDocumentTemplate(facilityId, data),
    onSuccess: (_, { facilityId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.admin.documentTemplates(facilityId) }),
  });
}

export function useUpdateDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) =>
      adminDocumentsService.updateDocumentTemplate(templateId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "document-templates"] }),
  });
}

export function useArchiveDocumentTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDocumentsService.archiveDocumentTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "document-templates"] }),
  });
}

export function useSendDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDocumentsService.sendDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "document-instances"] }),
  });
}

export function useSendBulkDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDocumentsService.sendBulkDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "document-instances"] }),
  });
}

export function useAdminDocumentInstances(facilityId: string, params?: { status?: string; templateId?: string }) {
  return useQuery({
    queryKey: queryKeys.admin.documentInstances(facilityId),
    queryFn: () => adminDocumentsService.getFacilityDocumentInstances(facilityId, params),
    enabled: !!facilityId,
  });
}

export function useAdminComplianceReport(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.compliance(facilityId),
    queryFn: () => adminDocumentsService.getComplianceReport(facilityId),
    enabled: !!facilityId,
  });
}

export function useSendDocumentReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDocumentsService.sendDocumentReminder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "document-instances"] }),
  });
}

export function useVoidDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminDocumentsService.voidDocument,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "document-instances"] }),
  });
}

export function useAdminDocumentParents(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.documentParents(facilityId),
    queryFn: () => adminDocumentsService.getDocumentFacilityParents(facilityId),
    enabled: !!facilityId,
  });
}

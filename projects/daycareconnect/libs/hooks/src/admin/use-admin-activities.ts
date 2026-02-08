import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminActivitiesService } from "@daycare-hub/services";
import { queryKeys } from "../query-keys";

export function useAdminActivities(facilityId: string, params?: { childId?: string; date?: string }) {
  return useQuery({
    queryKey: queryKeys.admin.activities(facilityId, params),
    queryFn: () => adminActivitiesService.getActivityEntries(facilityId, params),
    enabled: !!facilityId,
  });
}

export function useEnrolledChildren(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.admin.enrolledChildren(facilityId),
    queryFn: () => adminActivitiesService.getEnrolledChildren(facilityId),
    enabled: !!facilityId,
  });
}

export function useCreateActivityEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminActivitiesService.createActivityEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "activities"] }),
  });
}

export function useBulkCreateActivityEntries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminActivitiesService.bulkCreateActivityEntries,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "activities"] }),
  });
}

export function useUpdateActivityEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, data }: { activityId: string; data: any }) =>
      adminActivitiesService.updateActivityEntry(activityId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "activities"] }),
  });
}

export function useDeleteActivityEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminActivitiesService.deleteActivityEntry,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "activities"] }),
  });
}

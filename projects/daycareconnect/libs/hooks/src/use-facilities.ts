import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { facilitiesService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useMyFacilities() {
  return useQuery({
    queryKey: queryKeys.facilities.mine,
    queryFn: () => facilitiesService.getMyFacilities(),
  });
}

export function useFacility(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.facilities.detail(facilityId),
    queryFn: () => facilitiesService.getFacility(facilityId),
    enabled: !!facilityId,
  });
}

export function useActiveFacilities() {
  return useQuery({
    queryKey: queryKeys.facilities.active,
    queryFn: () => facilitiesService.getActiveFacilities(),
  });
}

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facilitiesService.createFacility,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.facilities.mine }),
  });
}

export function useUpdateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }: { facilityId: string; data: any }) =>
      facilitiesService.updateFacility(facilityId, data),
    onSuccess: (_, { facilityId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) });
      qc.invalidateQueries({ queryKey: queryKeys.facilities.mine });
    },
  });
}

export function useToggleFacilityStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: facilitiesService.toggleFacilityStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.facilities.mine }),
  });
}

export function useSearchFacilities(params: Record<string, any>) {
  return useInfiniteQuery({
    queryKey: queryKeys.facilities.search(params),
    queryFn: ({ pageParam = 1 }) => facilitiesService.searchFacilities({ ...params, page: pageParam }),
    getNextPageParam: (lastPage: any, allPages: any[]) =>
      lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled: params.lat !== undefined && params.lng !== undefined,
  });
}

export function useUpdateFacilityHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, hours }: { facilityId: string; hours: any[] }) =>
      facilitiesService.updateFacilityHours(facilityId, hours),
    onSuccess: (_, { facilityId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) }),
  });
}

export function useAddFacilityPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }: { facilityId: string; data: { url: string; altText?: string } }) =>
      facilitiesService.addFacilityPhoto(facilityId, data),
    onSuccess: (_, { facilityId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) }),
  });
}

export function useDeleteFacilityPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, photoId }: { facilityId: string; photoId: string }) =>
      facilitiesService.deleteFacilityPhoto(facilityId, photoId),
    onSuccess: (_, { facilityId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) }),
  });
}

export function useReorderFacilityPhotos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, photoIds }: { facilityId: string; photoIds: string[] }) =>
      facilitiesService.reorderFacilityPhotos(facilityId, photoIds),
    onSuccess: (_, { facilityId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) }),
  });
}

export function useUpdateFacilityServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, services }: { facilityId: string; services: string[] }) =>
      facilitiesService.updateFacilityServices(facilityId, services),
    onSuccess: (_, { facilityId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) }),
  });
}

export function useFacilityStaff(facilityId: string) {
  return useQuery({
    queryKey: queryKeys.facilities.staff(facilityId),
    queryFn: () => facilitiesService.getFacilityStaff(facilityId),
    enabled: !!facilityId,
  });
}

export function useAddStaffMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, data }: { facilityId: string; data: { email: string; staffRole: string } }) =>
      facilitiesService.addStaffMember(facilityId, data),
    onSuccess: (_, { facilityId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.facilities.staff(facilityId) });
      qc.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) });
    },
  });
}

export function useStaffAssignments() {
  return useQuery({
    queryKey: queryKeys.staff.assignments,
    queryFn: () => facilitiesService.getStaffAssignments(),
  });
}

export function useRemoveStaffMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facilityId, staffId }: { facilityId: string; staffId: string }) =>
      facilitiesService.removeStaffMember(facilityId, staffId),
    onSuccess: (_, { facilityId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.facilities.staff(facilityId) });
      qc.invalidateQueries({ queryKey: queryKeys.facilities.detail(facilityId) });
    },
  });
}

export function useStaffPermissions(facilityId: string, staffId: string) {
  return useQuery({
    queryKey: queryKeys.facilities.staffPermissions(facilityId, staffId),
    queryFn: () => facilitiesService.getStaffPermissions(facilityId, staffId),
    enabled: !!facilityId && !!staffId,
  });
}

export function useUpdateStaffPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      facilityId,
      staffId,
      permissions,
    }: {
      facilityId: string;
      staffId: string;
      permissions: string[];
    }) => facilitiesService.updateStaffPermissions(facilityId, staffId, permissions),
    onSuccess: (_, { facilityId, staffId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.facilities.staffPermissions(facilityId, staffId) });
      qc.invalidateQueries({ queryKey: queryKeys.facilities.staff(facilityId) });
    },
  });
}

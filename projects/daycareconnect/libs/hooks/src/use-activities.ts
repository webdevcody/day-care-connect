import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { activitiesService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useChildActivities(childId: string, limit?: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.activities.children(childId),
    queryFn: ({ pageParam }) => activitiesService.getChildActivities(childId, { cursor: pageParam, limit }),
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!childId,
  });
}

export function useChildDailyReports(childId: string, params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.activities.dailyReports(childId),
    queryFn: () => activitiesService.getChildDailyReports(childId, params),
    enabled: !!childId,
  });
}

export function useChildDailyReport(childId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.activities.dailyReport(childId, date),
    queryFn: () => activitiesService.getChildDailyReport(childId, date),
    enabled: !!childId && !!date,
  });
}

export function useChildPhotos(childId: string, params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.activities.photos(childId),
    queryFn: () => activitiesService.getChildPhotos(childId, params),
    enabled: !!childId,
  });
}

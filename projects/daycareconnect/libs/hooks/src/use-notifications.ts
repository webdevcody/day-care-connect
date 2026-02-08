import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { notificationsService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useNotifications(params?: { type?: string; isRead?: boolean }) {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: ({ pageParam }) => notificationsService.getNotifications({ cursor: pageParam, ...params }),
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => notificationsService.getUnreadNotificationCount(),
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.deleteNotification,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
      qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: queryKeys.notifications.preferences,
    queryFn: () => notificationsService.getNotificationPreferences(),
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.updateNotificationPreferences,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.preferences }),
  });
}

export function useQuietHours() {
  return useQuery({
    queryKey: queryKeys.notifications.quietHours,
    queryFn: () => notificationsService.getQuietHours(),
  });
}

export function useUpdateQuietHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsService.updateQuietHours,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.quietHours }),
  });
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: notificationsService.registerPushToken,
  });
}

export function useUnregisterPushToken() {
  return useMutation({
    mutationFn: notificationsService.unregisterPushToken,
  });
}

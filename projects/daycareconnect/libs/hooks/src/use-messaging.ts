import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { messagingService } from "@daycare-hub/services";
import { queryKeys } from "./query-keys";

export function useConversations(search?: string) {
  return useQuery({
    queryKey: queryKeys.messaging.conversations,
    queryFn: () => messagingService.getConversations({ search }),
  });
}

export function useCreateOrGetConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: messagingService.createOrGetConversation,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.messaging.conversations }),
  });
}

export function useConversationDetail(conversationId: string) {
  return useQuery({
    queryKey: queryKeys.messaging.conversation(conversationId),
    queryFn: () => messagingService.getConversationDetail(conversationId),
    enabled: !!conversationId,
  });
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: queryKeys.messaging.messages(conversationId),
    queryFn: ({ pageParam }) => messagingService.getMessages(conversationId, { cursor: pageParam }),
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      messagingService.sendMessage(conversationId, content),
    onSuccess: (_, { conversationId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.messaging.messages(conversationId) });
      qc.invalidateQueries({ queryKey: queryKeys.messaging.conversations });
    },
  });
}

export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: messagingService.markConversationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.messaging.conversations });
      qc.invalidateQueries({ queryKey: queryKeys.messaging.unreadCount });
    },
  });
}

export function useToggleMuteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, isMuted }: { conversationId: string; isMuted: boolean }) =>
      messagingService.toggleMuteConversation(conversationId, isMuted),
    onSuccess: (_, { conversationId }) =>
      qc.invalidateQueries({ queryKey: queryKeys.messaging.conversation(conversationId) }),
  });
}

export function useUnreadMessageCount() {
  return useQuery({
    queryKey: queryKeys.messaging.unreadCount,
    queryFn: () => messagingService.getUnreadMessageCount(),
  });
}

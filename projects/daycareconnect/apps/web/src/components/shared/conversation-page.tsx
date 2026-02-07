import { Link } from "@tanstack/react-router";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import {
  getConversationDetail,
  getMessages,
  sendMessage,
  markConversationRead,
  toggleMuteConversation,
} from "@/lib/server/messaging";
import { MessageBubble } from "@/components/messaging/message-bubble";
import { MessageInput } from "@/components/messaging/message-input";
import { Button } from "@daycare-hub/ui";

export function ConversationPageContent({
  conversationId,
  messagesBasePath,
}: {
  conversationId: string;
  messagesBasePath: string;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const userId = session?.user?.id;
  const role = (session?.user as any)?.role;

  const { data: conversation } = useQuery({
    queryKey: ["conversation-detail", conversationId],
    queryFn: () => getConversationDetail({ data: { conversationId } }),
  });

  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }) =>
      getMessages({
        data: {
          conversationId,
          cursor: pageParam ?? undefined,
          limit: 50,
        },
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: 5_000,
  });

  // Mark conversation as read on mount
  useEffect(() => {
    markConversationRead({ data: { conversationId } }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
    });
  }, [conversationId, queryClient]);

  // Flatten messages (they come newest-first per page, reverse to show oldest-first)
  const allMessages =
    messagesData?.pages.flatMap((page) => page.messages).reverse() ?? [];

  // Auto-scroll to bottom on new messages
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (allMessages.length > prevCountRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        const isNearBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight <
          150;
        if (isNearBottom || prevCountRef.current === 0) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
    prevCountRef.current = allMessages.length;
  }, [allMessages.length]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      150;
    setShowScrollButton(!isNearBottom);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      sendMessage({ data: { conversationId, content } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const muteMutation = useMutation({
    mutationFn: (isMuted: boolean) =>
      toggleMuteConversation({ data: { conversationId, isMuted } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["conversation-detail", conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const otherName = conversation
    ? role === "parent" || role === "staff"
      ? conversation.facilityName
      : conversation.parentName
    : "...";

  return (
    <div className="-m-6 flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to={messagesBasePath}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back
          </Link>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-sm font-semibold">
              {otherName.charAt(0)}
            </span>
          </div>
          <span className="font-semibold">{otherName}</span>
        </div>
        {conversation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => muteMutation.mutate(!conversation.isMuted)}
            disabled={muteMutation.isPending}
          >
            {conversation.isMuted ? "Unmute" : "Mute"}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-2xl space-y-3 p-4">
          {/* Load older */}
          {hasNextPage && (
            <div className="flex justify-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load older messages"}
              </Button>
            </div>
          )}

          {allMessages.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No messages yet. Start the conversation!
            </div>
          )}

          {/* Date separators and messages */}
          {allMessages.map((msg, i) => {
            const msgDate = new Date(msg.createdAt).toLocaleDateString();
            const prevDate =
              i > 0
                ? new Date(allMessages[i - 1].createdAt).toLocaleDateString()
                : null;
            const showDate = msgDate !== prevDate;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {msgDate}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <MessageBubble
                  content={msg.content}
                  senderName={msg.senderName}
                  createdAt={msg.createdAt}
                  isOwn={msg.senderId === userId}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
          >
            &#8595;
          </button>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={(content) => sendMutation.mutate(content)}
        disabled={sendMutation.isPending}
      />
    </div>
  );
}

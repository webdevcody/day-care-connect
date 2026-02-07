import { useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { getConversations, createOrGetConversation } from "@/lib/server/messaging";
import { getMyEnrollments } from "@/lib/server/enrollments";
import { ConversationItem } from "@/components/messaging/conversation-item";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@daycare-hub/ui";

export function MessagesPage({ messagesBasePath }: { messagesBasePath: string }) {
  const [search, setSearch] = useState("");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isParent = role === "parent";

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", search],
    queryFn: () => getConversations({ data: { search: search || undefined } }),
    refetchInterval: 10_000,
  });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        {isParent && <NewConversationDialog messagesBasePath={messagesBasePath} />}
      </div>

      <div className="mb-4">
        <Input
          placeholder="Search conversations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : conversations && conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const otherName =
              isParent || role === "staff"
                ? conv.facilityName
                : conv.parentName;
            return (
              <ConversationItem
                key={conv.id}
                id={conv.id}
                name={otherName}
                lastMessage={conv.lastMessage}
                lastMessageAt={conv.lastMessageAt}
                unreadCount={conv.unreadCount}
                isMuted={conv.isMuted}
                messagesBasePath={messagesBasePath}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          {search ? "No conversations match your search." : "No conversations yet."}
          {isParent && !search && (
            <p className="mt-2 text-sm">
              Start a conversation with one of your child's facilities.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NewConversationDialog({ messagesBasePath }: { messagesBasePath: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ["my-enrollments-for-messaging"],
    queryFn: () => getMyEnrollments(),
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (facilityId: string) =>
      createOrGetConversation({ data: { facilityId } }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setOpen(false);
      navigate({
        to: `${messagesBasePath}/$conversationId`,
        params: { conversationId: data.conversationId },
      });
    },
  });

  // Deduplicate facilities from active/approved enrollments
  const facilityMap = new Map<string, string>();
  if (enrollments) {
    for (const e of enrollments) {
      if (
        (e.status === "active" || e.status === "approved") &&
        !facilityMap.has(e.facilityId)
      ) {
        facilityMap.set(e.facilityId, e.facilityName);
      }
    }
  }
  const uniqueFacilities = [...facilityMap.entries()];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New Message</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select a facility to message:
        </p>
        {isLoading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : uniqueFacilities.length > 0 ? (
          <div className="space-y-2 py-2">
            {uniqueFacilities.map(([facilityId, facilityName]) => (
              <button
                key={facilityId}
                onClick={() => createMutation.mutate(facilityId)}
                disabled={createMutation.isPending}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">
                    {facilityName.charAt(0)}
                  </span>
                </div>
                <span className="text-sm font-medium">{facilityName}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No facilities with active enrollments found.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  useFacilityConversations,
  useCreateFacilityConversation,
  useEnrolledParents,
} from "@daycare-hub/hooks";
import { ConversationItem } from "@/components/messaging/conversation-item";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@daycare-hub/ui";

export const Route = createFileRoute("/_facility/facility/$facilityId/messages/")({
  component: FacilityMessagesPage,
});

function FacilityMessagesPage() {
  const { facilityId } = Route.useParams();
  const [search, setSearch] = useState("");
  const messagesBasePath = `/facility/${facilityId}/messages`;

  const { data: conversations, isLoading } = useFacilityConversations(
    facilityId,
    search || undefined
  );

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Messages</h1>
        <NewConversationDialog facilityId={facilityId} messagesBasePath={messagesBasePath} />
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
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              id={conv.id}
              name={conv.parentName}
              lastMessage={conv.lastMessage}
              lastMessageAt={conv.lastMessageAt ? new Date(conv.lastMessageAt) : null}
              unreadCount={conv.unreadCount}
              isMuted={false}
              messagesBasePath={messagesBasePath}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          {search ? "No conversations match your search." : "No conversations yet."}
          {!search && (
            <p className="mt-2 text-sm">
              Start a conversation with a parent to begin messaging.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NewConversationDialog({
  facilityId,
  messagesBasePath,
}: {
  facilityId: string;
  messagesBasePath: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: parents, isLoading } = useEnrolledParents(facilityId);
  const createMutation = useCreateFacilityConversation();

  async function handleCreate(parentId: string) {
    try {
      const data = await createMutation.mutateAsync({ facilityId, parentId });
      setOpen(false);
      navigate({
        to: `${messagesBasePath}/$conversationId`,
        params: { conversationId: data.conversationId },
      });
    } catch {
      // Mutation error is handled by react-query
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">New Message</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
          <DialogDescription>Select a parent to start messaging.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : parents && parents.length > 0 ? (
          <div className="space-y-2 py-2">
            {parents.map((parent) => (
              <button
                key={parent.id}
                onClick={() => handleCreate(parent.id)}
                disabled={createMutation.isPending}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">
                    {parent.firstName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {parent.firstName} {parent.lastName}
                  </p>
                  {parent.children.length > 0 && (
                    <p className="text-xs text-muted-foreground truncate">
                      Children: {parent.children.map((c) => `${c.firstName} ${c.lastName}`).join(", ")}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No parents with active enrollments found.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

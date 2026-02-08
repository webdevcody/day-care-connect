import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useConversations, useCreateOrGetConversation, useEnrollments } from "@daycare-hub/hooks";
import { ConversationItem } from "@/components/messaging/conversation-item";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@daycare-hub/ui";

export function MessagesPage({ messagesBasePath }: { messagesBasePath: string }) {
  const [search, setSearch] = useState("");
  const isParent = messagesBasePath.startsWith("/parent");

  const { data: conversations, isLoading } = useConversations(search || undefined);
  const { data: enrollments, isLoading: enrollmentsLoading } = useEnrollments();

  // Check if user has any active/approved enrollments
  const hasActiveEnrollments =
    enrollments && enrollments.some((e) => e.status === "active" || e.status === "approved");

  // Show empty state if parent has no enrollments
  if (isParent && !enrollmentsLoading && !hasActiveEnrollments) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>

        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">No Active Enrollments</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            You need to enroll your child in a facility before you can start messaging. Discover
            nearby daycare facilities and enroll your child to begin conversations.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link to="/discover">Discover Facilities</Link>
          </Button>
        </div>
      </div>
    );
  }

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
            <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : conversations && conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conv) => {
            const isStaff = messagesBasePath.startsWith("/staff");
            const otherName = isParent || isStaff ? conv.facilityName : conv.parentName;
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

  const { data: enrollments, isLoading } = useEnrollments();
  const createMutation = useCreateOrGetConversation();

  async function handleCreate(facilityId: string) {
    try {
      const data = await createMutation.mutateAsync(facilityId);
      setOpen(false);
      navigate({
        to: `${messagesBasePath}/$conversationId`,
        params: { conversationId: data.conversationId },
      });
    } catch {
      // Mutation error is handled by react-query
    }
  }

  // Deduplicate facilities from active/approved enrollments
  const facilityMap = new Map<string, string>();
  if (enrollments) {
    for (const e of enrollments) {
      if ((e.status === "active" || e.status === "approved") && !facilityMap.has(e.facilityId)) {
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a Conversation</DialogTitle>
          {(isLoading || uniqueFacilities.length > 0) && (
            <DialogDescription>Select a facility to message:</DialogDescription>
          )}
        </DialogHeader>
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
                onClick={() => handleCreate(facilityId)}
                disabled={createMutation.isPending}
                className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <span className="text-sm font-semibold">{facilityName.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium">{facilityName}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No facilities with active enrollments found.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Enroll your child in a facility to start messaging.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                setOpen(false);
                navigate({ to: "/discover" });
              }}
            >
              Discover Facilities
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

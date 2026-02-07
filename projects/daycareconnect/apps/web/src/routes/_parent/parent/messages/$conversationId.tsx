import { createFileRoute } from "@tanstack/react-router";
import { ConversationPageContent } from "@/components/shared/conversation-page";

export const Route = createFileRoute(
  "/_parent/parent/messages/$conversationId"
)({
  component: ParentConversationPage,
});

function ParentConversationPage() {
  const { conversationId } = Route.useParams();
  return (
    <ConversationPageContent
      conversationId={conversationId}
      messagesBasePath="/parent/messages"
    />
  );
}

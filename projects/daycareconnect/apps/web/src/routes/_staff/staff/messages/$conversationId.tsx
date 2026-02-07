import { createFileRoute } from "@tanstack/react-router";
import { ConversationPageContent } from "@/components/shared/conversation-page";

export const Route = createFileRoute(
  "/_staff/staff/messages/$conversationId"
)({
  component: StaffConversationPage,
});

function StaffConversationPage() {
  const { conversationId } = Route.useParams();
  return (
    <ConversationPageContent
      conversationId={conversationId}
      messagesBasePath="/staff/messages"
    />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { ConversationPageContent } from "@/components/shared/conversation-page";

export const Route = createFileRoute(
  "/_facility/facility/messages/$conversationId"
)({
  component: FacilityConversationPage,
});

function FacilityConversationPage() {
  const { conversationId } = Route.useParams();
  return (
    <ConversationPageContent
      conversationId={conversationId}
      messagesBasePath="/facility/messages"
    />
  );
}

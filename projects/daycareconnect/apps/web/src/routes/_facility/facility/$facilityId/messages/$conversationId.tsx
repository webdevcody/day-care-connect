import { createFileRoute } from "@tanstack/react-router";
import { ConversationPageContent } from "@/components/shared/conversation-page";

export const Route = createFileRoute("/_facility/facility/$facilityId/messages/$conversationId")({
  component: FacilityConversationPage,
});

function FacilityConversationPage() {
  const { facilityId, conversationId } = Route.useParams();
  const messagesBasePath = `/facility/${facilityId}/messages`;

  return (
    <ConversationPageContent conversationId={conversationId} messagesBasePath={messagesBasePath} />
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/shared/messages-page";

export const Route = createFileRoute("/_facility/facility/messages/")({
  component: () => <MessagesPage messagesBasePath="/facility/messages" />,
});

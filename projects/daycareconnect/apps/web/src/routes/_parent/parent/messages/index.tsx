import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/shared/messages-page";

export const Route = createFileRoute("/_parent/parent/messages/")({
  component: () => <MessagesPage messagesBasePath="/parent/messages" />,
});

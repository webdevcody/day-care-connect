import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/shared/messages-page";

export const Route = createFileRoute("/_staff/staff/messages/")({
  component: () => <MessagesPage messagesBasePath="/staff/messages" />,
});

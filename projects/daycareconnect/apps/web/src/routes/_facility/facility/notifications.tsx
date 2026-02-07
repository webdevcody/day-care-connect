import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPageContent } from "@/components/shared/notifications-page";

export const Route = createFileRoute("/_facility/facility/notifications")({
  component: NotificationsPageContent,
});

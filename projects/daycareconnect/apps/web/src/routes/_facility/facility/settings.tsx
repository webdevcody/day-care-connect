import { createFileRoute } from "@tanstack/react-router";
import { SettingsPageContent } from "@/components/shared/settings-page";

export const Route = createFileRoute("/_facility/facility/settings")({
  component: SettingsPageContent,
});

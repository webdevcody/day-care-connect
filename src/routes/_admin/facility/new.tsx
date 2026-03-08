import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_admin/facility/new")({
  beforeLoad: () => {
    throw redirect({ to: "/facility/setup" });
  },
  component: () => null,
});

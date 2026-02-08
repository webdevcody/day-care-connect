import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateChild } from "@daycare-hub/hooks";
import { ChildForm } from "@/components/children/child-form";
import type { CreateChildInput } from "@daycare-hub/shared";

export const Route = createFileRoute("/_parent/parent/children/new")({
  component: NewChildPage,
});

function NewChildPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createChild = useCreateChild();

  async function handleSubmit(data: CreateChildInput) {
    await createChild.mutateAsync(data);
    // Wait for the children query to refetch before navigating
    await queryClient.refetchQueries({ queryKey: ["children"] });
    navigate({ to: "/parent/children" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Add Child</h1>
        <p className="mt-1 text-muted-foreground">Add a new child to your profile.</p>
      </div>
      <div className="max-w-2xl">
        <ChildForm onSubmit={handleSubmit} submitLabel="Add Child" />
      </div>
    </div>
  );
}

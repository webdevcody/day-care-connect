import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { getChild, updateChild } from "@/lib/server/children";
import { ChildForm } from "@/components/children/child-form";
import type { CreateChildInput } from "@daycare-hub/shared";

export const Route = createFileRoute(
  "/_parent/parent/children/$childId/edit"
)({
  loader: ({ params }) => getChild({ data: { childId: params.childId } }),
  component: EditChildPage,
});

function EditChildPage() {
  const child = Route.useLoaderData();
  const navigate = useNavigate();

  async function handleSubmit(data: CreateChildInput) {
    await updateChild({ data: { childId: child.id, ...data } });
    navigate({
      to: "/parent/children/$childId",
      params: { childId: child.id },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Edit {child.firstName} {child.lastName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Update your child's profile information.
        </p>
      </div>
      <div className="max-w-2xl">
        <ChildForm
          defaultValues={{
            firstName: child.firstName,
            lastName: child.lastName,
            dateOfBirth: child.dateOfBirth,
            gender: child.gender || undefined,
            allergies: child.allergies || undefined,
            medicalNotes: child.medicalNotes || undefined,
            emergencyContactName: child.emergencyContactName || undefined,
            emergencyContactPhone: child.emergencyContactPhone || undefined,
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
        />
      </div>
    </div>
  );
}

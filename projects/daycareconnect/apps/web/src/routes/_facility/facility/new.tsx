import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FacilityFormWizard } from "@/components/facility/facility-form-wizard";

export const Route = createFileRoute("/_facility/facility/new")({
  component: CreateFacilityPage,
});

function CreateFacilityPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="mb-2 text-3xl font-bold">Create Facility</h1>

      <FacilityFormWizard
        showStepCounter
        onSuccess={(facility) => {
          navigate({
            to: "/facility/$facilityId/edit",
            params: { facilityId: facility.id },
          });
        }}
      />
    </div>
  );
}

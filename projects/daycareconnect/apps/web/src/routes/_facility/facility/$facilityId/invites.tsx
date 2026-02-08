import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminFacilityInvites,
  useCreateFacilityInvite,
  useUpdateFacilityInvite,
  useDeactivateFacilityInvite,
  useInviteSubmissions,
} from "@daycare-hub/hooks";
import { QrCodeDisplay } from "@/components/invite/qr-code-display";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@daycare-hub/ui";
import { Plus, ChevronDown, ChevronUp, Settings } from "lucide-react";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/invites"
)({
  component: InvitesPage,
});

function InvitesPage() {
  const { facilityId } = Route.useParams();
  const { data: invites = [], isLoading } = useAdminFacilityInvites(facilityId);
  const createInvite = useCreateFacilityInvite();
  const updateInvite = useUpdateFacilityInvite();
  const deactivateInvite = useDeactivateFacilityInvite();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const webUrl = import.meta.env.VITE_WEB_URL || window.location.origin;

  async function handleCreate() {
    setCreateLoading(true);
    try {
      await createInvite.mutateAsync({
        facilityId,
        data: {
          name: newName || undefined,
          expiresAt: newExpiry || undefined,
        },
      });
      setCreateOpen(false);
      setNewName("");
      setNewExpiry("");
    } catch (err) {
      console.error("Failed to create invite:", err);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleToggleActive(inviteId: string, isActive: boolean) {
    await updateInvite.mutateAsync({ inviteId, data: { isActive: !isActive } });
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Invite Links</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              to="/facility/$facilityId/invites/forms"
              params={{ facilityId }}
            >
              <Settings className="mr-1 h-4 w-4" />
              Enrollment Forms
            </Link>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Create Invite
          </Button>
        </div>
      </div>

      {invites.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No invite links yet. Create one to start onboarding parents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invites.map((invite: any) => (
            <Card key={invite.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{invite.name || "Untitled Invite"}</p>
                      <Badge variant={invite.isActive ? "default" : "secondary"}>
                        {invite.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Code: {invite.code} &middot; {invite.submissionCount} submission{invite.submissionCount !== 1 ? "s" : ""}
                      {invite.expiresAt && (
                        <> &middot; Expires {new Date(invite.expiresAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(invite.id, invite.isActive)}
                    >
                      {invite.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(expandedId === invite.id ? null : invite.id)}
                    >
                      {expandedId === invite.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {expandedId === invite.id && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex gap-6">
                      <QrCodeDisplay
                        url={`${webUrl}/invite/${invite.code}`}
                        size={150}
                      />
                      <div className="flex-1">
                        <InviteSubmissionsList inviteId={invite.id} />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invite Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name (optional)</Label>
              <Input
                placeholder='e.g., "Fall 2026 Enrollment"'
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date (optional)</Label>
              <Input
                type="datetime-local"
                value={newExpiry}
                onChange={(e) => setNewExpiry(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createLoading}>
                {createLoading ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InviteSubmissionsList({ inviteId }: { inviteId: string }) {
  const { data: submissions = [], isLoading } = useInviteSubmissions(inviteId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading submissions...</p>;

  if (submissions.length === 0) {
    return <p className="text-sm text-muted-foreground">No submissions yet.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Submissions</p>
      {submissions.map((sub: any) => (
        <div key={sub.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
          <div className="flex-1">
            <p className="font-medium">{sub.userName}</p>
            <p className="text-muted-foreground">
              {sub.userEmail}
              {sub.childFirstName && (
                <> &middot; Child: {sub.childFirstName} {sub.childLastName}</>
              )}
            </p>
          </div>
          <Badge variant={sub.status === "completed" ? "default" : "secondary"}>
            {sub.status}
          </Badge>
        </div>
      ))}
    </div>
  );
}

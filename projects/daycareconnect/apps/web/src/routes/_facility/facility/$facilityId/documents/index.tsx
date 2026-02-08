import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminDocumentInstances,
  useSendDocumentReminder,
  useVoidDocument,
} from "@daycare-hub/hooks";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import {
  Card,
  CardContent,
  Button,
} from "@daycare-hub/ui";

const STATUS_TABS = ["all", "pending", "viewed", "signed", "expired", "voided"] as const;

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/documents/"
)({
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as string) || "all",
  }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { facilityId } = Route.useParams();
  const { status: activeTab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const statusFilter = activeTab === "all" ? undefined : activeTab;
  const { data: instances = [], isLoading } = useAdminDocumentInstances(facilityId, { status: statusFilter });
  const sendDocumentReminder = useSendDocumentReminder();
  const voidDocument = useVoidDocument();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const handleRemind = async (instanceId: string) => {
    setLoadingId(instanceId);
    try {
      await sendDocumentReminder.mutateAsync(instanceId);
    } catch (err) {
      console.error("Failed to send reminder:", err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleVoid = async (instanceId: string) => {
    if (!window.confirm("Are you sure you want to void this document?")) return;
    setLoadingId(instanceId);
    try {
      await voidDocument.mutateAsync(instanceId);
    } catch (err) {
      console.error("Failed to void document:", err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Link
            to="/facility/$facilityId/documents/templates"
            params={{ facilityId }}
          >
            <Button variant="outline">Templates</Button>
          </Link>
          <Link
            to="/facility/$facilityId/documents/send"
            params={{ facilityId }}
          >
            <Button variant="outline">Send Document</Button>
          </Link>
          <Link
            to="/facility/$facilityId/documents/compliance"
            params={{ facilityId }}
          >
            <Button variant="outline">Compliance</Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-muted p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => navigate({ search: { status: tab } })}
            className={`rounded-md px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {instances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No documents found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {instances.map((instance) => (
            <Card key={instance.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{instance.templateTitle}</p>
                    <DocumentStatusBadge status={instance.status} />
                    <span className="text-xs text-muted-foreground capitalize">
                      {instance.templateCategory}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Sent to: {instance.parentName} ({instance.parentEmail})
                    {" · "}
                    {new Date(instance.createdAt).toLocaleDateString()}
                    {instance.signedAt && (
                      <>
                        {" · Signed "}
                        {new Date(instance.signedAt).toLocaleDateString()}
                        {instance.signatureName && ` by ${instance.signatureName}`}
                      </>
                    )}
                    {instance.expiresAt && (
                      <>
                        {" · Expires "}
                        {new Date(instance.expiresAt).toLocaleDateString()}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {(instance.status === "pending" || instance.status === "viewed") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemind(instance.id)}
                        disabled={loadingId === instance.id}
                      >
                        Remind
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleVoid(instance.id)}
                        disabled={loadingId === instance.id}
                      >
                        Void
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

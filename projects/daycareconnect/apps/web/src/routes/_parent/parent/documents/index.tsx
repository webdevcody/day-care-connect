import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyDocuments } from "@daycare-hub/hooks";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@daycare-hub/ui";

export const Route = createFileRoute("/_parent/parent/documents/")({
  component: ParentDocumentsPage,
});

function ParentDocumentsPage() {
  const { data: documents, isLoading } = useMyDocuments();

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const docs = documents ?? [];

  const actionNeeded = docs.filter(
    (d) => d.status === "pending" || d.status === "viewed"
  );
  const signed = docs.filter((d) => d.status === "signed");
  const other = docs.filter(
    (d) => d.status !== "pending" && d.status !== "viewed" && d.status !== "signed"
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents</h1>

      {actionNeeded.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Action Needed</h2>
          <div className="space-y-3">
            {actionNeeded.map((doc) => (
              <Card key={doc.id} className="border-yellow-200">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{doc.templateTitle}</p>
                      <DocumentStatusBadge status={doc.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      From: {doc.facilityName}
                      {" · Sent "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                      {doc.expiresAt && (
                        <>
                          {" · Expires "}
                          {new Date(doc.expiresAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <Link to="/parent/documents/$documentId" params={{ documentId: doc.id }}>
                    <Button size="sm">Review & Sign</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {signed.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Signed Documents</h2>
          <div className="space-y-3">
            {signed.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{doc.templateTitle}</p>
                      <DocumentStatusBadge status={doc.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      From: {doc.facilityName}
                      {doc.signedAt && (
                        <>
                          {" · Signed "}
                          {new Date(doc.signedAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <Link to="/parent/documents/$documentId" params={{ documentId: doc.id }}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Other Documents</h2>
          <div className="space-y-3">
            {other.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{doc.templateTitle}</p>
                      <DocumentStatusBadge status={doc.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      From: {doc.facilityName}
                      {" · "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link to="/parent/documents/$documentId" params={{ documentId: doc.id }}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {docs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No documents yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getComplianceReport, sendDocument } from "@/lib/server/admin-documents";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/documents/compliance"
)({
  loader: ({ params }) =>
    getComplianceReport({ data: { facilityId: params.facilityId } }),
  component: CompliancePage,
});

function CompliancePage() {
  const { requiredTemplates, compliance } = Route.useLoaderData();
  const { facilityId } = Route.useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSendMissing = async (parentId: string, templateId: string) => {
    setLoading(true);
    try {
      await sendDocument({
        data: { templateId, parentIds: [parentId] },
      });
      router.invalidate();
    } catch (err) {
      console.error("Failed to send document:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    if (requiredTemplates.length === 0 || compliance.length === 0) return;

    const headers = [
      "Parent Name",
      "Email",
      "Children",
      ...requiredTemplates.map((t) => t.title),
    ];
    const rows = compliance.map((family) => [
      family.parentName,
      family.parentEmail,
      family.children.map((c) => c.name).join("; "),
      ...family.documents.map((d) => d.status),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compliance-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
        <Button variant="outline" onClick={handleExportCsv} disabled={compliance.length === 0}>
          Export CSV
        </Button>
      </div>

      {requiredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No required document templates. Mark templates as "Required" to track compliance.
            </p>
          </CardContent>
        </Card>
      ) : compliance.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No active enrollments to track.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Family</TableHead>
                    {requiredTemplates.map((t) => (
                      <TableHead key={t.id} className="min-w-[150px]">
                        {t.title}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compliance.map((family) => (
                    <TableRow key={family.parentId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{family.parentName}</p>
                          <p className="text-xs text-muted-foreground">
                            {family.children.map((c) => c.name).join(", ")}
                          </p>
                        </div>
                      </TableCell>
                      {family.documents.map((doc) => (
                        <TableCell key={doc.templateId}>
                          <div className="flex items-center gap-2">
                            <DocumentStatusBadge status={doc.status} />
                            {doc.status === "missing" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleSendMissing(family.parentId, doc.templateId)
                                }
                                disabled={loading}
                              >
                                Send
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

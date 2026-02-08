import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminDailyReports,
  useUpdateDailyReport,
  usePublishDailyReport,
  useBulkPublishDailyReports,
} from "@daycare-hub/hooks";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Badge,
  Textarea,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/daily-reports"
)({
  component: DailyReportsPage,
});

function DailyReportsPage() {
  const { facilityId } = Route.useParams();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [editingSummary, setEditingSummary] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: reports = [], isLoading: loading } = useAdminDailyReports(facilityId, { date });
  const updateDailyReport = useUpdateDailyReport();
  const publishDailyReport = usePublishDailyReport();
  const bulkPublishDailyReports = useBulkPublishDailyReports();

  const handleSaveSummary = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await updateDailyReport.mutateAsync({ reportId, summary: summaryText });
      setEditingSummary(null);
    } catch (err) {
      console.error("Failed to save summary:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (reportId: string) => {
    setActionLoading(reportId);
    try {
      await publishDailyReport.mutateAsync(reportId);
    } catch (err) {
      console.error("Failed to publish:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublishAll = async () => {
    const draftReports = reports.filter((r) => r.status === "draft");
    if (draftReports.length === 0) return;
    if (!confirm(`Publish ${draftReports.length} report(s)?`)) return;

    setActionLoading("bulk");
    try {
      await bulkPublishDailyReports.mutateAsync({
        reportIds: draftReports.map((r: any) => r.id),
        facilityId,
      });
    } catch (err) {
      console.error("Failed to bulk publish:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const draftCount = reports.filter((r) => r.status === "draft").length;
  const publishedCount = reports.filter((r) => r.status === "published").length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Daily Reports</h1>
        <div className="flex items-center gap-3">
          {draftCount > 0 && (
            <Button
              onClick={handlePublishAll}
              disabled={actionLoading === "bulk"}
            >
              {actionLoading === "bulk"
                ? "Publishing..."
                : `Publish All (${draftCount})`}
            </Button>
          )}
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{reports.length}</div>
            <p className="text-sm text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {draftCount}
            </div>
            <p className="text-sm text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {publishedCount}
            </div>
            <p className="text-sm text-muted-foreground">Published</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading reports...</p>
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No reports for this date. There may be no active enrollments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report: any) => (
            <Card key={report.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {report.childFirstName} {report.childLastName}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {report.entryCount} {report.entryCount === 1 ? "entry" : "entries"}
                    </Badge>
                    <Badge
                      variant={
                        report.status === "published" ? "default" : "outline"
                      }
                    >
                      {report.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {editingSummary === report.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={summaryText}
                      onChange={(e) => setSummaryText(e.target.value)}
                      placeholder="Write a summary of the child's day..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveSummary(report.id)}
                        disabled={actionLoading === report.id}
                      >
                        {actionLoading === report.id ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingSummary(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {report.summary ? (
                      <p className="text-sm">{report.summary}</p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        No summary yet
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {editingSummary !== report.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSummary(report.id);
                        setSummaryText(report.summary || "");
                      }}
                    >
                      {report.summary ? "Edit Summary" : "Add Summary"}
                    </Button>
                  )}
                  {report.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(report.id)}
                      disabled={actionLoading === report.id}
                    >
                      {actionLoading === report.id
                        ? "Publishing..."
                        : "Publish"}
                    </Button>
                  )}
                  {report.status === "published" && report.publishedAt && (
                    <p className="flex items-center text-xs text-muted-foreground">
                      Published{" "}
                      {new Date(report.publishedAt).toLocaleString()}
                    </p>
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

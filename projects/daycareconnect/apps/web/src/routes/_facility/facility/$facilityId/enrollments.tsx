import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  getFacilityEnrollments,
  getEnrollmentDetail,
  approveEnrollment,
  rejectEnrollment,
  bulkEnrollmentAction,
} from "@/lib/server/admin-enrollments";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import { EnrollmentReviewDialog } from "@/components/admin/enrollment-review-dialog";
import { EnrollmentStatusBadge } from "@/components/admin/status-badge";
import {
  Card,
  CardContent,
  Button,
  Checkbox,
} from "@daycare-hub/ui";

const STATUS_TABS = ["all", "pending", "approved", "active", "withdrawn", "rejected"] as const;

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/enrollments"
)({
  validateSearch: (search: Record<string, unknown>) => ({
    status: (search.status as string) || "all",
  }),
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ params, deps }) =>
    getFacilityEnrollments({
      data: { facilityId: params.facilityId, status: deps.status },
    }),
  component: EnrollmentsPage,
});

function EnrollmentsPage() {
  const enrollments = Route.useLoaderData();
  const { facilityId } = Route.useParams();
  const { status: activeTab } = Route.useSearch();
  const router = useRouter();
  const navigate = Route.useNavigate();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewEnrollment, setReviewEnrollment] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const pendingEnrollments = enrollments.filter((e) => e.status === "pending");
  const canBulkSelect = activeTab === "pending" || activeTab === "all";

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingEnrollments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingEnrollments.map((e) => e.id)));
    }
  };

  const openReview = async (enrollmentId: string) => {
    try {
      const detail = await getEnrollmentDetail({
        data: { enrollmentId, facilityId },
      });
      setReviewEnrollment(detail);
      setReviewOpen(true);
    } catch (err) {
      console.error("Failed to load enrollment detail:", err);
    }
  };

  const handleApprove = async (enrollmentId: string) => {
    setLoading(true);
    try {
      await approveEnrollment({ data: { enrollmentId } });
      setReviewOpen(false);
      setReviewEnrollment(null);
      router.invalidate();
    } catch (err) {
      console.error("Failed to approve:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (enrollmentId: string, reason: string) => {
    setLoading(true);
    try {
      await rejectEnrollment({ data: { enrollmentId, reason } });
      setReviewOpen(false);
      setReviewEnrollment(null);
      router.invalidate();
    } catch (err) {
      console.error("Failed to reject:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (action === "reject") {
      const reason = window.prompt("Enter rejection reason:");
      if (!reason) return;
      setBulkLoading(true);
      try {
        await bulkEnrollmentAction({
          data: { enrollmentIds: Array.from(selectedIds), action, reason },
        });
        setSelectedIds(new Set());
        router.invalidate();
      } catch (err) {
        console.error("Bulk action failed:", err);
      } finally {
        setBulkLoading(false);
      }
    } else {
      setBulkLoading(true);
      try {
        await bulkEnrollmentAction({
          data: { enrollmentIds: Array.from(selectedIds), action },
        });
        setSelectedIds(new Set());
        router.invalidate();
      } catch (err) {
        console.error("Bulk action failed:", err);
      } finally {
        setBulkLoading(false);
      }
    }
  };

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <h1 className="mb-4 text-2xl font-bold">Enrollments</h1>

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

      {canBulkSelect && pendingEnrollments.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <Checkbox
            checked={selectedIds.size === pendingEnrollments.length && pendingEnrollments.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm text-muted-foreground">
            Select all pending ({pendingEnrollments.length})
          </span>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            onClick={() => handleBulkAction("approve")}
            disabled={bulkLoading}
          >
            {bulkLoading ? "Processing..." : "Approve All"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleBulkAction("reject")}
            disabled={bulkLoading}
          >
            {bulkLoading ? "Processing..." : "Reject All"}
          </Button>
        </div>
      )}

      {enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No enrollments found for this filter.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {enrollments.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardContent className="flex items-center gap-4 py-4">
                {canBulkSelect && enrollment.status === "pending" && (
                  <Checkbox
                    checked={selectedIds.has(enrollment.id)}
                    onCheckedChange={() => toggleSelect(enrollment.id)}
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {enrollment.childFirstName} {enrollment.childLastName}
                    </p>
                    <EnrollmentStatusBadge status={enrollment.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Parent: {enrollment.parentName} &middot;{" "}
                    {enrollment.scheduleType.replace("_", " ")} &middot; Applied{" "}
                    {new Date(enrollment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openReview(enrollment.id)}
                >
                  Review
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EnrollmentReviewDialog
        enrollment={reviewEnrollment}
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) setReviewEnrollment(null);
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={loading}
      />
    </div>
  );
}

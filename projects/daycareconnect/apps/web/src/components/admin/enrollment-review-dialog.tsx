import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Label,
  Badge,
} from "@daycare-hub/ui";
import { StatusTimeline } from "@/components/enrollment/status-timeline";
import { EnrollmentStatusBadge } from "./status-badge";

interface EnrollmentDetail {
  id: string;
  status: string;
  scheduleType: string;
  startDate: string | null;
  notes: string | null;
  createdAt: string;
  childFirstName: string;
  childLastName: string;
  childDateOfBirth: string;
  childAllergies: string | null;
  childMedicalNotes: string | null;
  parentName: string;
  parentEmail: string;
  parentPhone: string | null;
  history: Array<{
    id: string;
    status: string;
    reason: string | null;
    createdAt: string;
    changedByName: string;
  }>;
}

interface Props {
  enrollment: EnrollmentDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (enrollmentId: string) => void;
  onReject: (enrollmentId: string, reason: string) => void;
  loading: boolean;
}

export function EnrollmentReviewDialog({
  enrollment,
  open,
  onOpenChange,
  onApprove,
  onReject,
  loading,
}: Props) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!enrollment) return null;

  const age = Math.floor(
    (Date.now() - new Date(enrollment.childDateOfBirth).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    onReject(enrollment.id, rejectReason);
    setRejectReason("");
    setShowRejectForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Enrollment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              {enrollment.childFirstName} {enrollment.childLastName}
            </h3>
            <EnrollmentStatusBadge status={enrollment.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Age</p>
              <p className="font-medium">{age} years old</p>
            </div>
            <div>
              <p className="text-muted-foreground">Schedule</p>
              <p className="font-medium">
                {enrollment.scheduleType.replace("_", " ")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Applied</p>
              <p className="font-medium">
                {new Date(enrollment.createdAt).toLocaleDateString()}
              </p>
            </div>
            {enrollment.startDate && (
              <div>
                <p className="text-muted-foreground">Requested Start</p>
                <p className="font-medium">{enrollment.startDate}</p>
              </div>
            )}
          </div>

          {enrollment.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm">{enrollment.notes}</p>
            </div>
          )}

          {(enrollment.childAllergies || enrollment.childMedicalNotes) && (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
              <p className="mb-1 text-sm font-medium">Medical Information</p>
              {enrollment.childAllergies && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Allergies:</span>{" "}
                  {enrollment.childAllergies}
                </p>
              )}
              {enrollment.childMedicalNotes && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Medical Notes:</span>{" "}
                  {enrollment.childMedicalNotes}
                </p>
              )}
            </div>
          )}

          <div className="rounded-md border p-3">
            <p className="mb-1 text-sm font-medium">Parent Contact</p>
            <p className="text-sm">{enrollment.parentName}</p>
            <p className="text-sm text-muted-foreground">
              {enrollment.parentEmail}
            </p>
            {enrollment.parentPhone && (
              <p className="text-sm text-muted-foreground">
                {enrollment.parentPhone}
              </p>
            )}
          </div>

          {enrollment.history.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Status History</p>
              <StatusTimeline history={enrollment.history} />
            </div>
          )}

          {enrollment.status === "pending" && (
            <div className="flex gap-2 border-t pt-4">
              {!showRejectForm ? (
                <>
                  <Button
                    onClick={() => onApprove(enrollment.id)}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? "Processing..." : "Approve"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowRejectForm(true)}
                    disabled={loading}
                    className="flex-1"
                  >
                    Reject
                  </Button>
                </>
              ) : (
                <div className="w-full space-y-2">
                  <Label htmlFor="rejectReason">Rejection Reason</Label>
                  <Textarea
                    id="rejectReason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Please provide a reason for rejection..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleReject}
                      disabled={loading || !rejectReason.trim()}
                      className="flex-1"
                    >
                      {loading ? "Processing..." : "Confirm Reject"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason("");
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

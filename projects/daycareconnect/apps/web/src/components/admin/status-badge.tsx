import { Badge } from "@daycare-hub/ui";

const enrollmentVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  approved: "default",
  active: "default",
  withdrawn: "destructive",
  rejected: "destructive",
};

const attendanceVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  expected: "outline",
  present: "default",
  absent: "destructive",
  late: "secondary",
};

export function EnrollmentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={enrollmentVariants[status] ?? "secondary"}>
      {status}
    </Badge>
  );
}

export function AttendanceStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={attendanceVariants[status] ?? "secondary"}>
      {status}
    </Badge>
  );
}

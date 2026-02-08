import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminAttendance,
  useCheckInChild,
  useCheckOutChild,
  useMarkAbsent,
} from "@daycare-hub/hooks";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import { AttendanceStatusBadge } from "@/components/admin/status-badge";
import { ABSENCE_REASONS } from "@daycare-hub/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/attendance"
)({
  component: AttendancePage,
});

function AttendancePage() {
  const { facilityId } = Route.useParams();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: records = [], isLoading: loading } = useAdminAttendance(facilityId, date);
  const checkInChild = useCheckInChild();
  const checkOutChild = useCheckOutChild();
  const markAbsent = useMarkAbsent();

  const handleCheckIn = async (attendanceId: string) => {
    setActionLoading(attendanceId);
    try {
      await checkInChild.mutateAsync({ attendanceId });
    } catch (err) {
      console.error("Check-in failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCheckOut = async (attendanceId: string) => {
    setActionLoading(attendanceId);
    try {
      await checkOutChild.mutateAsync({ attendanceId });
    } catch (err) {
      console.error("Check-out failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAbsent = async (attendanceId: string, reason: string) => {
    setActionLoading(attendanceId);
    try {
      await markAbsent.mutateAsync({ attendanceId, reason: reason as any });
    } catch (err) {
      console.error("Mark absent failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const presentCount = records.filter(
    (r) => r.status === "present" || r.status === "late"
  ).length;
  const absentCount = records.filter((r) => r.status === "absent").length;
  const expectedCount = records.filter((r) => r.status === "expected").length;

  const formatTime = (time: string | null) => {
    if (!time) return "—";
    return new Date(time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {presentCount}
            </div>
            <p className="text-sm text-muted-foreground">Checked In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {absentCount}
            </div>
            <p className="text-sm text-muted-foreground">Absent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {expectedCount}
            </div>
            <p className="text-sm text-muted-foreground">Expected</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading attendance...</p>
          </CardContent>
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No attendance records for this date. There may be no active
              enrollments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <p className="font-medium">
                        {record.childFirstName} {record.childLastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {record.parentName}
                      </p>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {record.scheduleType.replace("_", " ")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTime(record.checkInTime)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTime(record.checkOutTime)}
                    </TableCell>
                    <TableCell>
                      <AttendanceStatusBadge status={record.status} />
                      {record.absenceReason && (
                        <p className="mt-1 text-xs text-muted-foreground capitalize">
                          {record.absenceReason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(record.status === "expected" ||
                          record.status === "late") &&
                          !record.checkInTime && (
                            <Button
                              size="sm"
                              onClick={() => handleCheckIn(record.id)}
                              disabled={actionLoading === record.id}
                            >
                              Check In
                            </Button>
                          )}
                        {record.status === "present" &&
                          record.checkInTime &&
                          !record.checkOutTime && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckOut(record.id)}
                              disabled={actionLoading === record.id}
                            >
                              Check Out
                            </Button>
                          )}
                        {record.status === "expected" && (
                          <Select
                            onValueChange={(reason) =>
                              handleMarkAbsent(record.id, reason)
                            }
                          >
                            <SelectTrigger className="h-8 w-[130px]">
                              <SelectValue placeholder="Mark Absent" />
                            </SelectTrigger>
                            <SelectContent>
                              {ABSENCE_REASONS.map((reason) => (
                                <SelectItem key={reason} value={reason}>
                                  {reason.charAt(0).toUpperCase() +
                                    reason.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  useAdminAttendance,
  useCheckInChild,
  useCheckOutChild,
  useMarkAbsent,
  useAttendanceActivityLog,
  useChildAttendanceHistory,
} from "@daycare-hub/hooks";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@daycare-hub/ui";

export const Route = createFileRoute("/_facility/facility/$facilityId/attendance")({
  component: AttendancePage,
});

function AttendancePage() {
  const { facilityId } = Route.useParams();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChild, setSelectedChild] = useState<{
    id: string;
    firstName: string;
    lastName: string;
  } | null>(null);

  const { data: records = [], isLoading: loading } = useAdminAttendance(facilityId, date);
  const checkInChild = useCheckInChild();
  const checkOutChild = useCheckOutChild();
  const markAbsent = useMarkAbsent();

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r: any) =>
        r.childFirstName.toLowerCase().includes(q) || r.childLastName.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

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
    (r: any) => r.status === "present" || r.status === "late"
  ).length;
  const absentCount = records.filter((r: any) => r.status === "absent").length;
  const expectedCount = records.filter((r: any) => r.status === "expected").length;

  const formatTime = (time: string | null) => {
    if (!time) return "\u2014";
    return new Date(time).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </div>

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily Attendance</TabsTrigger>
          <TabsTrigger value="activity-log">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="daily">
          <div className="mb-4">
            <Input
              placeholder="Search children by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="mb-6 grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                <p className="text-sm text-muted-foreground">Checked In</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                <p className="text-sm text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{expectedCount}</div>
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
          ) : filteredRecords.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No children match your search."
                    : "No attendance records for this date. There may be no active enrollments."}
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
                    {filteredRecords.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left hover:underline"
                            onClick={() =>
                              setSelectedChild({
                                id: record.childId,
                                firstName: record.childFirstName,
                                lastName: record.childLastName,
                              })
                            }
                          >
                            <p className="font-medium">
                              {record.childFirstName} {record.childLastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{record.parentName}</p>
                          </button>
                        </TableCell>
                        <TableCell className="capitalize text-sm">
                          {record.scheduleType.replace("_", " ")}
                        </TableCell>
                        <TableCell className="text-sm">{formatTime(record.checkInTime)}</TableCell>
                        <TableCell className="text-sm">{formatTime(record.checkOutTime)}</TableCell>
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
                            {(record.status === "expected" || record.status === "late") &&
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
                                onValueChange={(reason) => handleMarkAbsent(record.id, reason)}
                              >
                                <SelectTrigger className="h-8 w-[130px]">
                                  <SelectValue placeholder="Mark Absent" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ABSENCE_REASONS.map((reason) => (
                                    <SelectItem key={reason} value={reason}>
                                      {reason.charAt(0).toUpperCase() + reason.slice(1)}
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
        </TabsContent>

        <TabsContent value="activity-log">
          <ActivityLogSection facilityId={facilityId} />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedChild} onOpenChange={(open) => !open && setSelectedChild(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedChild
                ? `${selectedChild.firstName} ${selectedChild.lastName} - Attendance History`
                : "Attendance History"}
            </DialogTitle>
            <DialogDescription>View attendance history for this child.</DialogDescription>
          </DialogHeader>
          {selectedChild && (
            <ChildHistoryContent
              facilityId={facilityId}
              childId={selectedChild.id}
              formatTime={formatTime}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActivityLogSection({ facilityId }: { facilityId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAttendanceActivityLog(facilityId);

  const allItems = data?.pages.flatMap((page: any) => page.items) ?? [];

  const formatEventTime = (time: string) => {
    return new Date(time).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading activity log...</p>
        </CardContent>
      </Card>
    );
  }

  if (allItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No check-in/out activity yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {allItems.map((item: any) => {
        const isCheckOut = !!item.checkOutTime;
        const eventTime = isCheckOut ? item.checkOutTime : item.checkInTime;
        return (
          <Card key={`${item.id}-${isCheckOut ? "out" : "in"}`}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${isCheckOut ? "bg-red-500" : "bg-green-500"}`}
                />
                <div>
                  <p className="font-medium">
                    {item.childFirstName} {item.childLastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isCheckOut ? "Checked out" : "Checked in"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{formatEventTime(eventTime)}</p>
            </CardContent>
          </Card>
        );
      })}

      {hasNextPage && (
        <div className="text-center pt-2">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ChildHistoryContent({
  facilityId,
  childId,
  formatTime,
}: {
  facilityId: string;
  childId: string;
  formatTime: (time: string | null) => string;
}) {
  const { data, isLoading } = useChildAttendanceHistory(facilityId, childId);

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Loading history...</p>
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">No attendance history found.</p>
      </div>
    );
  }

  return (
    <div className="max-h-[400px] overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell className="text-sm">{item.date}</TableCell>
              <TableCell className="text-sm">{formatTime(item.checkInTime)}</TableCell>
              <TableCell className="text-sm">{formatTime(item.checkOutTime)}</TableCell>
              <TableCell>
                <AttendanceStatusBadge status={item.status} />
                {item.absenceReason && (
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    {item.absenceReason}
                  </p>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data?.total > items.length && (
        <p className="text-center text-xs text-muted-foreground py-2">
          Showing {items.length} of {data.total} records
        </p>
      )}
    </div>
  );
}

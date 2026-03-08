import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getChildren } from "@/server/children";
import {
  signInChild,
  signOutChild,
  getAttendanceByDate,
} from "@/server/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogIn, LogOut } from "lucide-react";

export const Route = createFileRoute(
  "/_admin/facility/$facilityId/attendance"
)({
  component: AttendancePage,
});

function AttendancePage() {
  const { facilityId } = useParams({
    from: "/_admin/facility/$facilityId/attendance",
  });

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState("");

  function loadData() {
    Promise.all([
      getChildren({ data: { facilityId } }),
      getAttendanceByDate({ data: { facilityId, date } }),
    ]).then(([c, r]) => {
      setChildrenList(c.filter((ch: any) => ch.status === "active"));
      setRecords(r);
      setLoading(false);
    });
  }

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [facilityId, date]);

  async function handleSignIn() {
    if (!selectedChildId) return;
    await signInChild({ data: { childId: selectedChildId, facilityId } });
    setSelectedChildId("");
    const updated = await getAttendanceByDate({ data: { facilityId, date } });
    setRecords(updated);
  }

  async function handleSignOut(recordId: string) {
    await signOutChild({ data: { recordId, facilityId } });
    const updated = await getAttendanceByDate({ data: { facilityId, date } });
    setRecords(updated);
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  // Children currently signed in (have record today with no sign-out)
  const signedInChildIds = new Set(
    records.filter((r) => r.signInTime && !r.signOutTime).map((r) => r.childId)
  );

  // Children available for sign-in (active, not currently signed in)
  const availableForSignIn = childrenList.filter(
    (c) => !signedInChildIds.has(c.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Attendance</h2>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </div>

      {date === today && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sign In a Child</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Select
                value={selectedChildId}
                onValueChange={setSelectedChildId}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a child..." />
                </SelectTrigger>
                <SelectContent>
                  {availableForSignIn.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleSignIn}
                disabled={!selectedChildId}
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </div>
            {availableForSignIn.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                All active children are already signed in.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Records for {date}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No attendance records for this date.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Sign In</TableHead>
                  <TableHead>Sign Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  {date === today && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.child.firstName} {record.child.lastName}
                    </TableCell>
                    <TableCell>{record.signInTime || "—"}</TableCell>
                    <TableCell>{record.signOutTime || "—"}</TableCell>
                    <TableCell>
                      {record.signOutTime ? (
                        <Badge variant="secondary">Signed Out</Badge>
                      ) : (
                        <Badge>Present</Badge>
                      )}
                    </TableCell>
                    <TableCell>{record.notes || "—"}</TableCell>
                    {date === today && (
                      <TableCell>
                        {!record.signOutTime && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => handleSignOut(record.id)}
                          >
                            <LogOut className="h-3 w-3" />
                            Sign Out
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

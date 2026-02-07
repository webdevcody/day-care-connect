import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getFacilityRoster, exportRosterCsv } from "@/lib/server/admin-roster";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/roster"
)({
  loader: ({ params }) =>
    getFacilityRoster({ data: { facilityId: params.facilityId } }),
  component: RosterPage,
});

function RosterPage() {
  const initialRoster = Route.useLoaderData();
  const { facilityId } = Route.useParams();
  const [search, setSearch] = useState("");
  const [roster, setRoster] = useState(initialRoster);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!search.trim()) {
      setRoster(initialRoster);
      return;
    }
    const term = search.toLowerCase();
    setRoster(
      initialRoster.filter(
        (r) =>
          r.childFirstName.toLowerCase().includes(term) ||
          r.childLastName.toLowerCase().includes(term)
      )
    );
  }, [search, initialRoster]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportRosterCsv({ data: { facilityId } });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `roster-${facilityId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const getAge = (dob: string) => {
    const years = Math.floor(
      (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return years;
  };

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Child Roster</h1>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {roster.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search
                ? "No children match your search."
                : "No active enrollments found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Enrolled Since</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((child) => (
                  <>
                    <TableRow
                      key={child.childId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        setExpandedId(
                          expandedId === child.childId ? null : child.childId
                        )
                      }
                    >
                      <TableCell className="font-medium">
                        {child.childFirstName} {child.childLastName}
                      </TableCell>
                      <TableCell>{getAge(child.childDateOfBirth)}y</TableCell>
                      <TableCell>
                        <p>{child.parentName}</p>
                        <p className="text-xs text-muted-foreground">
                          {child.parentPhone || child.parentEmail}
                        </p>
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {child.scheduleType.replace("_", " ")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {child.startDate || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {child.childAllergies && (
                            <Badge variant="destructive">Allergies</Badge>
                          )}
                          {child.childMedicalNotes && (
                            <Badge variant="secondary">Medical</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === child.childId && (
                      <TableRow key={`${child.childId}-detail`}>
                        <TableCell colSpan={6} className="bg-muted/30">
                          <div className="grid grid-cols-2 gap-4 p-2">
                            <div>
                              <p className="text-sm font-medium">
                                Emergency Contact
                              </p>
                              <p className="text-sm">
                                {child.childEmergencyContactName || "—"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {child.childEmergencyContactPhone || "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Parent Contact
                              </p>
                              <p className="text-sm">{child.parentEmail}</p>
                              <p className="text-sm text-muted-foreground">
                                {child.parentPhone || "—"}
                              </p>
                            </div>
                            {child.childAllergies && (
                              <div>
                                <p className="text-sm font-medium text-destructive">
                                  Allergies
                                </p>
                                <p className="text-sm">
                                  {child.childAllergies}
                                </p>
                              </div>
                            )}
                            {child.childMedicalNotes && (
                              <div>
                                <p className="text-sm font-medium">
                                  Medical Notes
                                </p>
                                <p className="text-sm">
                                  {child.childMedicalNotes}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

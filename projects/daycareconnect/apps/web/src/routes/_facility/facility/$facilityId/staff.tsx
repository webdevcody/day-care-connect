import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { getFacility } from "@/lib/server/facilities";
import { addStaffMember, removeStaffMember } from "@/lib/server/facility-staff";
import { FacilitySubNav } from "@/components/admin/facility-sub-nav";
import { STAFF_ROLES } from "@daycare-hub/shared";
import type { StaffRole } from "@daycare-hub/shared";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  "/_facility/facility/$facilityId/staff"
)({
  loader: ({ params }) => getFacility({ data: { facilityId: params.facilityId } }),
  component: FacilityStaffPage,
});

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function FacilityStaffPage() {
  const facility = Route.useLoaderData();
  const { facilityId } = Route.useParams();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("lead_teacher");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!email) return;
    setError("");
    setAdding(true);
    try {
      await addStaffMember({ data: { facilityId, email, staffRole } });
      setEmail("");
      setDialogOpen(false);
      router.invalidate();
    } catch (err: any) {
      setError(err.message || "Failed to add staff member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (staffId: string) => {
    if (!confirm("Remove this staff member?")) return;
    try {
      await removeStaffMember({ data: { facilityId, staffId } });
      router.invalidate();
    } catch (err: any) {
      setError(err.message || "Failed to remove staff member");
    }
  };

  return (
    <div>
      <FacilitySubNav facilityId={facilityId} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Staff</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="staff-email">User Email *</Label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <Label htmlFor="staff-role">Role</Label>
                <Select value={staffRole} onValueChange={(v) => setStaffRole(v as StaffRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {formatRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && dialogOpen && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleAdd} disabled={adding} className="w-full">
                {adding ? "Adding..." : "Add Staff Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && !dialogOpen && <p className="mb-4 text-sm text-destructive">{error}</p>}

      {facility.staff.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No staff members yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facility.staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.userName}</TableCell>
                  <TableCell>{member.userEmail}</TableCell>
                  <TableCell>{formatRole(member.staffRole)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useFacilityStaff,
  useAddStaffMember,
  useRemoveStaffMember,
  useUpdateStaffPermissions,
} from "@daycare-hub/hooks";
import {
  STAFF_ROLES,
  STAFF_PERMISSIONS,
  STAFF_PERMISSION_LABELS,
  STAFF_PERMISSION_DESCRIPTIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "@daycare-hub/shared";
import type { StaffRole, StaffPermission } from "@daycare-hub/shared";
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
  Badge,
} from "@daycare-hub/ui";
import { Shield, Settings2 } from "lucide-react";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/staff"
)({
  component: FacilityStaffPage,
});

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function FacilityStaffPage() {
  const { facilityId } = Route.useParams();
  const { data: staffMembers, isLoading } = useFacilityStaff(facilityId);
  const addStaffMember = useAddStaffMember();
  const removeStaffMember = useRemoveStaffMember();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("lead_teacher");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  // Permissions management state
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{
    id: string;
    userName: string;
    staffRole: string;
    permissions: string[];
  } | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const updatePermissions = useUpdateStaffPermissions();

  const staff = staffMembers ?? [];

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );

  const handleAdd = async () => {
    if (!email) return;
    setError("");
    setAdding(true);
    try {
      await addStaffMember.mutateAsync({
        facilityId,
        data: { email, staffRole },
      });
      setEmail("");
      setDialogOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add staff member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (staffId: string) => {
    if (!confirm("Remove this staff member?")) return;
    try {
      await removeStaffMember.mutateAsync({ facilityId, staffId });
    } catch (err: any) {
      setError(err.message || "Failed to remove staff member");
    }
  };

  const openPermissionsDialog = (member: any) => {
    setSelectedStaff(member);
    setEditingPermissions(member.permissions || []);
    setPermDialogOpen(true);
  };

  const togglePermission = (permission: string) => {
    setEditingPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleResetToDefaults = () => {
    if (!selectedStaff) return;
    const defaults =
      DEFAULT_ROLE_PERMISSIONS[selectedStaff.staffRole as StaffRole] || [];
    setEditingPermissions([...defaults]);
  };

  const handleSavePermissions = async () => {
    if (!selectedStaff) return;
    try {
      await updatePermissions.mutateAsync({
        facilityId,
        staffId: selectedStaff.id,
        permissions: editingPermissions,
      });
      setPermDialogOpen(false);
      setSelectedStaff(null);
    } catch (err: any) {
      setError(err.message || "Failed to update permissions");
    }
  };

  return (
    <div>
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
                <Select
                  value={staffRole}
                  onValueChange={(v) => setStaffRole(v as StaffRole)}
                >
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Default permissions will be assigned based on role. You can
                  customize them after adding.
                </p>
              </div>
              {error && dialogOpen && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button
                onClick={handleAdd}
                disabled={adding}
                className="w-full"
              >
                {adding ? "Adding..." : "Add Staff Member"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && !dialogOpen && !permDialogOpen && (
        <p className="mb-4 text-sm text-destructive">{error}</p>
      )}

      {staff.length === 0 ? (
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
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.userName}
                  </TableCell>
                  <TableCell>{member.userEmail}</TableCell>
                  <TableCell>{formatRole(member.staffRole)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(member.permissions || []).length > 0 ? (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            {member.permissions.length} permission
                            {member.permissions.length !== 1 ? "s" : ""}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openPermissionsDialog(member)}
                      >
                        <Settings2 className="mr-1 h-3 w-3" />
                        Permissions
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Permissions Management Dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Manage Permissions
            </DialogTitle>
            {selectedStaff && (
              <p className="text-sm text-muted-foreground">
                {selectedStaff.userName} &mdash;{" "}
                {formatRole(selectedStaff.staffRole)}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Select which actions this staff member can perform.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToDefaults}
              >
                Reset to Role Defaults
              </Button>
            </div>

            <div className="space-y-2">
              {STAFF_PERMISSIONS.map((permission) => {
                const isChecked = editingPermissions.includes(permission);
                return (
                  <label
                    key={permission}
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      isChecked
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePermission(permission)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {STAFF_PERMISSION_LABELS[permission as StaffPermission]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {
                          STAFF_PERMISSION_DESCRIPTIONS[
                            permission as StaffPermission
                          ]
                        }
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {editingPermissions.length} of {STAFF_PERMISSIONS.length}{" "}
                permissions selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPermDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={updatePermissions.isPending}
                >
                  {updatePermissions.isPending
                    ? "Saving..."
                    : "Save Permissions"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

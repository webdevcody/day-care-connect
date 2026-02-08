import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useFacilityStaff,
  useAddStaffMember,
  useRemoveStaffMember,
  useUpdateStaffPermissions,
  useCreateStaffAccount,
  useCreateStaffInvite,
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
  DialogDescription,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@daycare-hub/ui";
import { Shield, Settings2, UserPlus, Search, Link2, Copy, Check } from "lucide-react";

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
  const createStaffAccount = useCreateStaffAccount();
  const createStaffInvite = useCreateStaffInvite();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState("");

  // Existing user tab state
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupRole, setLookupRole] = useState<StaffRole>("lead_teacher");
  const [lookupLoading, setLookupLoading] = useState(false);

  // Create account tab state
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createRole, setCreateRole] = useState<StaffRole>("lead_teacher");
  const [createLoading, setCreateLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);

  // Invite link tab state
  const [inviteRole, setInviteRole] = useState<StaffRole>("lead_teacher");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);

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

  const resetDialog = () => {
    setError("");
    setLookupEmail("");
    setLookupRole("lead_teacher");
    setCreateEmail("");
    setCreatePassword("");
    setCreateFirstName("");
    setCreateLastName("");
    setCreateRole("lead_teacher");
    setCreatedCredentials(null);
    setInviteRole("lead_teacher");
    setInviteUrl("");
    setCopied(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetDialog();
    }
  };

  // ─── Existing User Handlers ─────────────────────────────────────────────
  const handleAddExisting = async () => {
    if (!lookupEmail) return;
    setError("");
    setLookupLoading(true);
    try {
      await addStaffMember.mutateAsync({
        facilityId,
        data: { email: lookupEmail, staffRole: lookupRole },
      });
      setLookupEmail("");
      setDialogOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add staff member");
    } finally {
      setLookupLoading(false);
    }
  };

  // ─── Create Account Handlers ────────────────────────────────────────────
  const handleCreateAccount = async () => {
    if (!createEmail || !createPassword || !createFirstName || !createLastName)
      return;
    setError("");
    setCreateLoading(true);
    try {
      await createStaffAccount.mutateAsync({
        facilityId,
        data: {
          email: createEmail,
          password: createPassword,
          firstName: createFirstName,
          lastName: createLastName,
          staffRole: createRole,
        },
      });
      setCreatedCredentials({
        email: createEmail,
        password: createPassword,
      });
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setCreateLoading(false);
    }
  };

  // ─── Invite Link Handlers ──────────────────────────────────────────────
  const handleCreateInvite = async () => {
    setError("");
    setInviteLoading(true);
    try {
      const result = await createStaffInvite.mutateAsync({
        facilityId,
        data: { staffRole: inviteRole },
      });
      setInviteUrl(result.inviteUrl);
    } catch (err: any) {
      setError(err.message || "Failed to create invite link");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Staff Management Handlers ─────────────────────────────────────────
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
        <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>Add a new staff member to your facility.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="existing" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="existing" className="text-xs">
                  <Search className="mr-1 h-3 w-3" />
                  Existing User
                </TabsTrigger>
                <TabsTrigger value="create" className="text-xs">
                  <UserPlus className="mr-1 h-3 w-3" />
                  Create Account
                </TabsTrigger>
                <TabsTrigger value="invite" className="text-xs">
                  <Link2 className="mr-1 h-3 w-3" />
                  Invite Link
                </TabsTrigger>
              </TabsList>

              {/* ─── Tab 1: Existing User ──────────────────── */}
              <TabsContent value="existing" className="space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  Look up a user by their email address to add them as staff.
                </p>
                <div>
                  <Label htmlFor="lookup-email">User Email *</Label>
                  <Input
                    id="lookup-email"
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="staff@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="lookup-role">Role</Label>
                  <Select
                    value={lookupRole}
                    onValueChange={(v) => setLookupRole(v as StaffRole)}
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
                    Default permissions will be assigned based on role.
                  </p>
                </div>
                {error && dialogOpen && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button
                  onClick={handleAddExisting}
                  disabled={lookupLoading || !lookupEmail}
                  className="w-full"
                >
                  {lookupLoading ? "Adding..." : "Add Staff Member"}
                </Button>
              </TabsContent>

              {/* ─── Tab 2: Create Account ─────────────────── */}
              <TabsContent value="create" className="space-y-4 pt-2">
                {createdCredentials ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                      <p className="mb-3 font-medium text-green-800 dark:text-green-200">
                        Account created successfully!
                      </p>
                      <p className="mb-2 text-sm text-green-700 dark:text-green-300">
                        Share these credentials with the staff member:
                      </p>
                      <div className="space-y-2 rounded-md bg-white p-3 font-mono text-sm dark:bg-gray-900">
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span className="font-medium">{createdCredentials.email}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Password: </span>
                          <span className="font-medium">{createdCredentials.password}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                        Advise them to change their password after first login.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setDialogOpen(false);
                        resetDialog();
                      }}
                    >
                      Done
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Create a new account for the staff member and give them the
                      login credentials.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="create-first-name">First Name *</Label>
                        <Input
                          id="create-first-name"
                          value={createFirstName}
                          onChange={(e) => setCreateFirstName(e.target.value)}
                          placeholder="Jane"
                        />
                      </div>
                      <div>
                        <Label htmlFor="create-last-name">Last Name *</Label>
                        <Input
                          id="create-last-name"
                          value={createLastName}
                          onChange={(e) => setCreateLastName(e.target.value)}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="create-email">Email *</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        placeholder="staff@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="create-password">Password *</Label>
                      <Input
                        id="create-password"
                        type="text"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder="At least 8 characters"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        The password is shown in plain text so you can share it
                        with the staff member.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="create-role">Role</Label>
                      <Select
                        value={createRole}
                        onValueChange={(v) => setCreateRole(v as StaffRole)}
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
                    </div>
                    {error && dialogOpen && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button
                      onClick={handleCreateAccount}
                      disabled={
                        createLoading ||
                        !createEmail ||
                        !createPassword ||
                        !createFirstName ||
                        !createLastName
                      }
                      className="w-full"
                    >
                      {createLoading ? "Creating..." : "Create Account & Add as Staff"}
                    </Button>
                  </>
                )}
              </TabsContent>

              {/* ─── Tab 3: Invite Link ────────────────────── */}
              <TabsContent value="invite" className="space-y-4 pt-2">
                {inviteUrl ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                      <p className="mb-2 font-medium text-blue-800 dark:text-blue-200">
                        Invite link created!
                      </p>
                      <p className="mb-3 text-sm text-blue-700 dark:text-blue-300">
                        Share this link with the person you'd like to invite. They
                        can sign up and will automatically be added as{" "}
                        <strong>{formatRole(inviteRole)}</strong>.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={inviteUrl}
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyInvite}
                          className="shrink-0"
                        >
                          {copied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                        This link expires in 7 days.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setInviteUrl("");
                          setCopied(false);
                        }}
                      >
                        Create Another
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setDialogOpen(false);
                          resetDialog();
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Generate an invite link to share with someone. They'll sign
                      up and be automatically added as staff at this facility.
                    </p>
                    <div>
                      <Label htmlFor="invite-role">Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(v) => setInviteRole(v as StaffRole)}
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
                        The person who accepts the invite will be assigned this
                        role with default permissions.
                      </p>
                    </div>
                    {error && dialogOpen && (
                      <p className="text-sm text-destructive">{error}</p>
                    )}
                    <Button
                      onClick={handleCreateInvite}
                      disabled={inviteLoading}
                      className="w-full"
                    >
                      {inviteLoading ? "Generating..." : "Generate Invite Link"}
                    </Button>
                  </>
                )}
              </TabsContent>
            </Tabs>
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
            <DialogDescription>
              {selectedStaff
                ? `Configure permissions for ${selectedStaff.userName} (${formatRole(selectedStaff.staffRole)}).`
                : "Configure permissions for this staff member."}
            </DialogDescription>
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

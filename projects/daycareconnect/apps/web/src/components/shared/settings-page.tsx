import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import {
  useUpdateProfile,
  useChangePassword,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useQuietHours,
  useUpdateQuietHours,
  useUserRoles,
  useActivateRole,
  useDeactivateRole,
} from "@daycare-hub/hooks";
import { NOTIFICATION_TYPES, USER_ROLES, USER_ROLE_LABELS } from "@daycare-hub/shared";
import type { UserRole } from "@daycare-hub/shared";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notification-templates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Switch,
} from "@daycare-hub/ui";
import { Users, Building2, Briefcase, Check } from "lucide-react";

export function SettingsPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your account settings.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileForm />
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <PasswordForm />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationPreferencesForm />
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RolesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileForm() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const updateProfileMutation = useUpdateProfile();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    try {
      await updateProfileMutation.mutateAsync({
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        phone: (formData.get("phone") as string) || "",
      });
      setMessage("Profile updated successfully.");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {message && (
            <p className="text-sm text-green-600">{message}</p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              name="firstName"
              required
              defaultValue={user?.firstName || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              name="lastName"
              required
              defaultValue={user?.lastName || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={user?.phone || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={user?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed.
            </p>
          </div>
          <Button type="submit" disabled={updateProfileMutation.isPending}>
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const changePasswordMutation = useChangePassword();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword") as string;
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      setMessage("Password changed successfully.");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {message && (
            <p className="text-sm text-green-600">{message}</p>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
            />
          </div>
          <Button type="submit" disabled={changePasswordMutation.isPending}>
            {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationPreferencesForm() {
  const [message, setMessage] = useState("");

  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences();
  const { data: qh, isLoading: qhLoading } = useQuietHours();

  const [quietHoursForm, setQuietHoursForm] = useState({
    isEnabled: false,
    startTime: "22:00",
    endTime: "07:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  // Sync quiet hours data once loaded
  const [qhSynced, setQhSynced] = useState(false);
  if (qh && !qhSynced) {
    setQuietHoursForm({
      isEnabled: qh.isEnabled,
      startTime: qh.startTime,
      endTime: qh.endTime,
      timezone: qh.timezone,
    });
    setQhSynced(true);
  }

  const prefsMutation = useUpdateNotificationPreferences();
  const qhMutation = useUpdateQuietHours();

  function isEnabled(type: string): boolean {
    const pref = prefs?.find((p) => p.notificationType === type);
    return pref ? pref.inAppEnabled : true;
  }

  function handleToggle(type: string, enabled: boolean) {
    prefsMutation.mutate(
      [{ notificationType: type, inAppEnabled: enabled }],
      {
        onSuccess: () => {
          setMessage("Preferences saved.");
          setTimeout(() => setMessage(""), 3000);
        },
      }
    );
  }

  if (prefsLoading || qhLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading preferences...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_80px_80px] gap-4 border-b pb-2 text-sm font-medium text-muted-foreground">
              <span>Type</span>
              <span className="text-center">In-App</span>
              <span className="text-center">Push</span>
            </div>
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type}
                className="grid grid-cols-[1fr_80px_80px] items-center gap-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {NOTIFICATION_TYPE_LABELS[type].label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {NOTIFICATION_TYPE_LABELS[type].description}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={isEnabled(type)}
                    onCheckedChange={(checked) => handleToggle(type, checked)}
                  />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Switch disabled checked={false} />
                  <span className="text-[10px] text-muted-foreground">
                    Coming soon
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quiet Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable Quiet Hours</p>
                <p className="text-xs text-muted-foreground">
                  Silence notifications during specified hours
                </p>
              </div>
              <Switch
                checked={quietHoursForm.isEnabled}
                onCheckedChange={(checked) =>
                  setQuietHoursForm((prev) => ({ ...prev, isEnabled: checked }))
                }
              />
            </div>

            {quietHoursForm.isEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={quietHoursForm.startTime}
                      onChange={(e) =>
                        setQuietHoursForm((prev) => ({
                          ...prev,
                          startTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={quietHoursForm.endTime}
                      onChange={(e) =>
                        setQuietHoursForm((prev) => ({
                          ...prev,
                          endTime: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={quietHoursForm.timezone}
                    onChange={(e) =>
                      setQuietHoursForm((prev) => ({
                        ...prev,
                        timezone: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            <Button
              onClick={() =>
                qhMutation.mutate(quietHoursForm, {
                  onSuccess: () => {
                    setMessage("Quiet hours saved.");
                    setTimeout(() => setMessage(""), 3000);
                  },
                })
              }
              disabled={qhMutation.isPending}
            >
              {qhMutation.isPending ? "Saving..." : "Save Quiet Hours"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const ROLE_ICONS: Record<string, typeof Users> = {
  parent: Users,
  admin: Building2,
  staff: Briefcase,
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  parent: "Manage your children, view daily reports, and communicate with facilities.",
  admin: "Create and manage daycare facilities, handle enrollments and staff.",
  staff: "View assignments, manage daily activities, and communicate with parents.",
};

function RolesManager() {
  const { data: roleData, isLoading } = useUserRoles();
  const activateMutation = useActivateRole();
  const deactivateMutation = useDeactivateRole();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading roles...
        </CardContent>
      </Card>
    );
  }

  const activeRole = roleData?.activeRole;
  const userRolesList = roleData?.roles ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            Activate or deactivate roles to customize your experience. You can switch between active roles using the role switcher in the sidebar.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {USER_ROLES.map((role) => {
              const Icon = ROLE_ICONS[role];
              const isActive = userRolesList.includes(role);
              const isCurrent = activeRole === role;

              return (
                <Card key={role} className={isActive ? "border-primary" : ""}>
                  <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold">{USER_ROLE_LABELS[role]}</p>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Check className="h-3 w-3" /> Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_DESCRIPTIONS[role]}
                    </p>
                    {isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isCurrent || deactivateMutation.isPending}
                        onClick={() => deactivateMutation.mutate(role)}
                      >
                        {isCurrent ? "Active" : "Deactivate"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={activateMutation.isPending}
                        onClick={() => activateMutation.mutate(role)}
                      >
                        Activate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

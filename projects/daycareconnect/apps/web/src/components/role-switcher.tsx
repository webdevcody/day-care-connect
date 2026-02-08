import { useUserRoles, useSwitchRole } from "@daycare-hub/hooks";
import { USER_ROLE_LABELS, ROLE_DASHBOARD_PATHS } from "@daycare-hub/shared";
import type { UserRole } from "@daycare-hub/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daycare-hub/ui";
import { Users, Building2, Briefcase } from "lucide-react";

const ROLE_ICONS: Record<string, typeof Users> = {
  parent: Users,
  admin: Building2,
  staff: Briefcase,
};

export function RoleSwitcher() {
  const { data: roleData } = useUserRoles();
  const switchRoleMutation = useSwitchRole();

  if (!roleData || roleData.roles.length <= 1) {
    return null;
  }

  async function handleSwitch(newRole: string) {
    if (newRole === roleData?.activeRole) return;
    try {
      await switchRoleMutation.mutateAsync(newRole);
      window.location.href = ROLE_DASHBOARD_PATHS[newRole as UserRole];
    } catch {
      // Mutation error is handled by react-query
    }
  }

  return (
    <div className="px-3 py-2">
      <Select
        value={roleData.activeRole}
        onValueChange={handleSwitch}
        disabled={switchRoleMutation.isPending}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roleData.roles.map((role) => {
            const Icon = ROLE_ICONS[role] || Users;
            return (
              <SelectItem key={role} value={role}>
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {USER_ROLE_LABELS[role as UserRole] || role}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

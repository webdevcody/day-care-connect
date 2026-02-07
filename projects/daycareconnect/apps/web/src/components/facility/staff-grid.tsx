import { Card, CardContent } from "@daycare-hub/ui";

type StaffMember = {
  id: string;
  userName: string;
  staffRole: string;
};

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StaffGrid({ staff }: { staff: StaffMember[] }) {
  if (staff.length === 0) {
    return <p className="text-muted-foreground">No staff information available.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {staff.map((member) => (
        <Card key={member.id}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {member.userName.charAt(0)}
            </div>
            <div>
              <p className="font-medium">{member.userName}</p>
              <p className="text-sm text-muted-foreground">{formatRole(member.staffRole)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

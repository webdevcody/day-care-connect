import { Badge } from "@daycare-hub/ui";

const documentStatusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  viewed: "outline",
  signed: "default",
  expired: "destructive",
  voided: "destructive",
  missing: "destructive",
};

export function DocumentStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={documentStatusVariants[status] ?? "secondary"}>
      {status}
    </Badge>
  );
}

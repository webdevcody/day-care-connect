import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getChildren, createChild } from "@/server/children";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";

export const Route = createFileRoute(
  "/_admin/facility/$facilityId/children"
)({
  component: ChildrenPage,
});

function ChildrenPage() {
  const { facilityId } = useParams({
    from: "/_admin/facility/$facilityId/children",
  });
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function loadChildren() {
    getChildren({ data: { facilityId } }).then((data) => {
      setChildrenList(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadChildren();
  }, [facilityId]);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);

    await createChild({
      data: {
        facilityId,
        firstName: formData.get("firstName") as string,
        lastName: formData.get("lastName") as string,
        dateOfBirth: (formData.get("dateOfBirth") as string) || undefined,
      },
    });

    setSaving(false);
    setDialogOpen(false);
    loadChildren();
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Children</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4" />
              Add Child
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Child</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" name="firstName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" name="lastName" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input id="dateOfBirth" name="dateOfBirth" type="date" />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding..." : "Add Child"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {childrenList.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No children yet. Add your first child above.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {childrenList.map((child) => (
                <TableRow key={child.id}>
                  <TableCell>
                    <Link
                      to="/facility/$facilityId/children/$childId"
                      params={{ facilityId, childId: child.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {child.firstName} {child.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {child.dateOfBirth || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        child.status === "active" ? "default" : "secondary"
                      }
                    >
                      {child.status === "active" ? "Active" : "Withdrawn"}
                    </Badge>
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

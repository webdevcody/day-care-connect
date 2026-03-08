import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  getGuardians,
  createGuardian,
  updateGuardian,
  archiveGuardian,
} from "@/server/guardians";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  "/_admin/facility/$facilityId/guardians"
)({
  component: GuardiansPage,
});

function GuardiansPage() {
  const { facilityId } = useParams({
    from: "/_admin/facility/$facilityId/guardians",
  });
  const [guardiansList, setGuardiansList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editGuardian, setEditGuardian] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  function load() {
    getGuardians({ data: { facilityId } }).then((data) => {
      setGuardiansList(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
  }, [facilityId]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    await createGuardian({
      data: {
        facilityId,
        firstName: fd.get("firstName") as string,
        lastName: fd.get("lastName") as string,
        phone: (fd.get("phone") as string) || undefined,
        email: (fd.get("email") as string) || undefined,
        address: (fd.get("address") as string) || undefined,
        notes: (fd.get("notes") as string) || undefined,
      },
    });

    setSaving(false);
    setAddOpen(false);
    load();
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    await updateGuardian({
      data: {
        guardianId: editGuardian.id,
        facilityId,
        firstName: fd.get("firstName") as string,
        lastName: fd.get("lastName") as string,
        phone: (fd.get("phone") as string) || null,
        email: (fd.get("email") as string) || null,
        address: (fd.get("address") as string) || null,
        notes: (fd.get("notes") as string) || null,
      },
    });

    setSaving(false);
    setEditGuardian(null);
    load();
  }

  async function handleArchiveToggle(guardian: any) {
    await archiveGuardian({
      data: {
        guardianId: guardian.id,
        facilityId,
        isArchived: !guardian.isArchived,
      },
    });
    load();
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const visible = showArchived
    ? guardiansList
    : guardiansList.filter((g) => !g.isArchived);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Guardians</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4" />
                Add Guardian
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Guardian</DialogTitle>
              </DialogHeader>
              <GuardianForm onSubmit={handleCreate} saving={saving} onCancel={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No guardians yet. Add your first guardian above.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">
                    {g.firstName} {g.lastName}
                  </TableCell>
                  <TableCell>{g.phone || "—"}</TableCell>
                  <TableCell>{g.email || "—"}</TableCell>
                  <TableCell>
                    {g.isArchived ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditGuardian(g)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleArchiveToggle(g)}
                      >
                        {g.isArchived ? "Restore" : "Archive"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={!!editGuardian}
        onOpenChange={(open) => !open && setEditGuardian(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Guardian</DialogTitle>
          </DialogHeader>
          {editGuardian && (
            <GuardianForm
              guardian={editGuardian}
              onSubmit={handleUpdate}
              saving={saving}
              onCancel={() => setEditGuardian(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GuardianForm({
  guardian,
  onSubmit,
  saving,
  onCancel,
}: {
  guardian?: any;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input id="firstName" name="firstName" defaultValue={guardian?.firstName || ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input id="lastName" name="lastName" defaultValue={guardian?.lastName || ""} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={guardian?.phone || ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={guardian?.email || ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={guardian?.address || ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={guardian?.notes || ""} />
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : guardian ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  );
}

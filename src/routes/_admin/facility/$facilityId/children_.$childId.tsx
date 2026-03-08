import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { getChild, updateChild, updateChildStatus } from "@/server/children";
import { getChildPhotos, uploadChildPhoto, deleteChildPhoto } from "@/server/child-photos";
import { getChildGuardians, linkGuardian, unlinkGuardian } from "@/server/child-guardians";
import { getGuardians } from "@/server/guardians";
import { getChildAttendanceHistory } from "@/server/attendance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { ArrowLeft, Upload, Trash2, PlusCircle } from "lucide-react";

export const Route = createFileRoute(
  "/_admin/facility/$facilityId/children_/$childId"
)({
  component: ChildProfilePage,
});

function ChildProfilePage() {
  const { facilityId, childId } = useParams({
    from: "/_admin/facility/$facilityId/children_/$childId",
  });

  const [child, setChild] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [childGuardiansList, setChildGuardiansList] = useState<any[]>([]);
  const [allGuardians, setAllGuardians] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadAll() {
    Promise.all([
      getChild({ data: { childId, facilityId } }),
      getChildPhotos({ data: { childId } }),
      getChildGuardians({ data: { childId } }),
      getGuardians({ data: { facilityId } }),
      getChildAttendanceHistory({ data: { childId, facilityId, limit: 20 } }),
    ]).then(([c, p, cg, ag, h]) => {
      setChild(c);
      setPhotos(p);
      setChildGuardiansList(cg);
      setAllGuardians(ag);
      setHistory(h);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadAll();
  }, [childId, facilityId]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);

    const updated = await updateChild({
      data: {
        childId,
        facilityId,
        firstName: fd.get("firstName") as string,
        lastName: fd.get("lastName") as string,
        dateOfBirth: (fd.get("dateOfBirth") as string) || null,
        allergies: (fd.get("allergies") as string) || null,
        medicalNotes: (fd.get("medicalNotes") as string) || null,
        notes: (fd.get("notes") as string) || null,
      },
    });

    setChild(updated);
    setEditing(false);
    setSaving(false);
  }

  async function toggleStatus() {
    const newStatus = child.status === "active" ? "withdrawn" : "active";
    const updated = await updateChildStatus({
      data: { childId, facilityId, status: newStatus },
    });
    setChild(updated);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      await uploadChildPhoto({
        data: {
          childId,
          fileName: file.name,
          fileData: base64,
        },
      });
      const updatedPhotos = await getChildPhotos({ data: { childId } });
      setPhotos(updatedPhotos);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeletePhoto(photoId: string) {
    await deleteChildPhoto({ data: { photoId, childId } });
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  async function handleLinkGuardian(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await linkGuardian({
      data: {
        childId,
        guardianId: fd.get("guardianId") as string,
        relationship: fd.get("relationship") as string,
        isPrimary: fd.get("isPrimary") === "on",
      },
    });
    setLinkDialogOpen(false);
    const updated = await getChildGuardians({ data: { childId } });
    setChildGuardiansList(updated);
  }

  async function handleUnlink(guardianId: string) {
    await unlinkGuardian({ data: { childId, guardianId } });
    setChildGuardiansList((prev) =>
      prev.filter((cg) => cg.guardianId !== guardianId)
    );
  }

  if (loading || !child) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const linkedIds = new Set(childGuardiansList.map((cg) => cg.guardianId));
  const availableGuardians = allGuardians.filter(
    (g) => !linkedIds.has(g.id) && !g.isArchived
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to="/facility/$facilityId/children"
          params={{ facilityId }}
        >
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-xl font-semibold">
          {child.firstName} {child.lastName}
        </h2>
        <Badge variant={child.status === "active" ? "default" : "secondary"}>
          {child.status === "active" ? "Active" : "Withdrawn"}
        </Badge>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="history">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          {editing ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Edit Child</CardTitle>
              </CardHeader>
              <form onSubmit={handleSave}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" name="firstName" defaultValue={child.firstName} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" name="lastName" defaultValue={child.lastName} required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={child.dateOfBirth || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea id="allergies" name="allergies" defaultValue={child.allergies || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medicalNotes">Medical Notes</Label>
                    <Textarea id="medicalNotes" name="medicalNotes" defaultValue={child.medicalNotes || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" defaultValue={child.notes || ""} />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
                  </div>
                </CardContent>
              </form>
            </Card>
          ) : (
            <Card className="mt-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Child Information</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={toggleStatus}>
                      {child.status === "active" ? "Mark Withdrawn" : "Mark Active"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                      Edit
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-sm">{child.firstName} {child.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
                    <p className="text-sm">{child.dateOfBirth || "—"}</p>
                  </div>
                </div>
                {child.allergies && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Allergies</p>
                    <p className="text-sm">{child.allergies}</p>
                  </div>
                )}
                {child.medicalNotes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Medical Notes</p>
                    <p className="text-sm">{child.medicalNotes}</p>
                  </div>
                )}
                {child.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm">{child.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="photos">
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Photos</CardTitle>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Upload
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border">
                      <img
                        src={photo.url}
                        alt={photo.altText || "Child photo"}
                        className="h-full w-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon-xs"
                        className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeletePhoto(photo.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guardians">
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Linked Guardians</CardTitle>
                <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" disabled={availableGuardians.length === 0}>
                      <PlusCircle className="h-4 w-4" />
                      Link Guardian
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Link Guardian</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleLinkGuardian} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="guardianId">Guardian</Label>
                        <select
                          id="guardianId"
                          name="guardianId"
                          required
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                        >
                          {availableGuardians.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.firstName} {g.lastName}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="relationship">Relationship *</Label>
                        <Input id="relationship" name="relationship" placeholder="e.g. Mother, Father, Grandparent" required />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="isPrimary" name="isPrimary" />
                        <Label htmlFor="isPrimary">Primary Guardian</Label>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
                        <Button type="submit">Link</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {childGuardiansList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No guardians linked yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Primary</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {childGuardiansList.map((cg) => (
                      <TableRow key={cg.id}>
                        <TableCell className="font-medium">
                          {cg.guardian.firstName} {cg.guardian.lastName}
                        </TableCell>
                        <TableCell>{cg.relationship}</TableCell>
                        <TableCell>{cg.guardian.phone || "—"}</TableCell>
                        <TableCell>
                          {cg.isPrimary && <Badge variant="secondary">Primary</Badge>}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => handleUnlink(cg.guardianId)}
                          >
                            Unlink
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Sign In</TableHead>
                      <TableHead>Sign Out</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.signInTime || "—"}</TableCell>
                        <TableCell>{record.signOutTime || "—"}</TableCell>
                        <TableCell>{record.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

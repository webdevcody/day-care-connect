import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useEnrolledParents, useSendParentEmail } from "@daycare-hub/hooks";
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Checkbox,
  Badge,
  Label,
} from "@daycare-hub/ui";
import { Mail, Send, Users, Search, CheckCheck, X } from "lucide-react";

export const Route = createFileRoute("/_facility/facility/$facilityId/emails")({
  component: EmailComposerPage,
});

type SelectionMode = "all" | "manual";

function EmailComposerPage() {
  const { facilityId } = Route.useParams();
  const { data: parents = [], isLoading } = useEnrolledParents(facilityId);
  const sendEmail = useSendParentEmail();

  const [selectionMode, setSelectionMode] = useState<SelectionMode>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  const filteredParents = useMemo(() => {
    if (!search.trim()) return parents;
    const term = search.toLowerCase();
    return parents.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.email.toLowerCase().includes(term) ||
        p.firstName.toLowerCase().includes(term) ||
        p.lastName.toLowerCase().includes(term) ||
        p.children.some(
          (child) =>
            child.firstName.toLowerCase().includes(term) ||
            child.lastName.toLowerCase().includes(term)
        )
    );
  }, [search, parents]);

  const recipientCount = selectionMode === "all" ? parents.length : selectedIds.size;

  const canSend = subject.trim() && body.trim() && recipientCount > 0 && !sendEmail.isPending;

  const toggleParent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredParents) next.add(p.id);
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of filteredParents) next.delete(p.id);
      return next;
    });
  };

  const handleSend = async () => {
    setResult(null);
    try {
      const res = await sendEmail.mutateAsync({
        facilityId,
        parentIds: selectionMode === "all" ? [] : Array.from(selectedIds),
        subject: subject.trim(),
        body: body.trim(),
      });
      setResult({ sent: res.sent, failed: res.failed });
      if (res.failed === 0) {
        setSubject("");
        setBody("");
      }
    } catch (err: any) {
      setResult({ sent: 0, failed: recipientCount });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Mail className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Email Parents</h1>
      </div>

      {parents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No parents with active enrollments found.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Recipient selection */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Recipients</Label>
                <Badge variant="secondary">
                  {recipientCount} parent{recipientCount !== 1 ? "s" : ""} selected
                </Badge>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2">
                <Button
                  variant={selectionMode === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectionMode("all")}
                >
                  <CheckCheck className="mr-2 h-4 w-4" />
                  All Enrolled Parents ({parents.length})
                </Button>
                <Button
                  variant={selectionMode === "manual" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectionMode("manual")}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Select Manually
                </Button>
              </div>

              {/* Manual selection */}
              {selectionMode === "manual" && (
                <div className="space-y-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by parent name, email, or child name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Bulk select/deselect */}
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-primary hover:underline"
                    >
                      Select all{search ? " filtered" : ""}
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={deselectAllFiltered}
                      className="text-primary hover:underline"
                    >
                      Deselect all{search ? " filtered" : ""}
                    </button>
                    {selectedIds.size > 0 && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <button
                          type="button"
                          onClick={() => setSelectedIds(new Set())}
                          className="text-destructive hover:underline"
                        >
                          Clear selection
                        </button>
                      </>
                    )}
                  </div>

                  {/* Parent list */}
                  <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                    {filteredParents.length === 0 ? (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        No parents match your search.
                      </p>
                    ) : (
                      filteredParents.map((parent) => (
                        <label
                          key={parent.id}
                          className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={selectedIds.has(parent.id)}
                            onCheckedChange={() => toggleParent(parent.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {parent.firstName} {parent.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {parent.email}
                              {parent.children.length > 0 && (
                                <span>
                                  {" "}
                                  &middot; Children:{" "}
                                  {parent.children
                                    .map((c) => `${c.firstName} ${c.lastName}`)
                                    .join(", ")}
                                </span>
                              )}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compose */}
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Label className="text-base font-semibold">Compose Email</Label>

              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  placeholder="e.g. Important Update from Our Facility"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-body">Message</Label>
                <Textarea
                  id="email-body"
                  placeholder="Write your message to parents here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="resize-y"
                />
              </div>
            </CardContent>
          </Card>

          {/* Result banner */}
          {result && (
            <div
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                result.failed === 0
                  ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
                  : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              }`}
            >
              <div className="flex-1 text-sm">
                {result.failed === 0 ? (
                  <span>
                    Successfully sent to {result.sent} parent
                    {result.sent !== 1 ? "s" : ""}.
                  </span>
                ) : (
                  <span>
                    Sent {result.sent}, failed {result.failed}.
                  </span>
                )}
              </div>
              <button type="button" onClick={() => setResult(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Send button */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              This email will be sent to{" "}
              <span className="font-medium text-foreground">{recipientCount}</span> parent
              {recipientCount !== 1 ? "s" : ""}.
            </p>
            <Button size="lg" onClick={handleSend} disabled={!canSend}>
              {sendEmail.isPending ? (
                "Sending..."
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminDocumentTemplates,
  useAdminDocumentParents,
  useSendDocument,
  useSendBulkDocument,
} from "@daycare-hub/hooks";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Checkbox,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/documents/send"
)({
  component: SendDocumentPage,
});

function SendDocumentPage() {
  const { facilityId } = Route.useParams();
  const navigate = useNavigate();
  const { data: allTemplates = [], isLoading: templatesLoading } = useAdminDocumentTemplates(facilityId);
  const { data: parents = [], isLoading: parentsLoading } = useAdminDocumentParents(facilityId);
  const sendDocument = useSendDocument();
  const sendBulkDocument = useSendBulkDocument();

  const templates = allTemplates.filter((t) => !t.isArchived);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sendToAll, setSendToAll] = useState(false);
  const [selectedParentIds, setSelectedParentIds] = useState<Set<string>>(new Set());
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (templatesLoading || parentsLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const toggleParent = (parentId: string) => {
    setSelectedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const handleSend = async () => {
    if (!selectedTemplateId) return;
    setLoading(true);
    setSuccessMessage("");
    try {
      if (sendToAll) {
        const result = await sendBulkDocument.mutateAsync({
          templateId: selectedTemplateId,
          facilityId,
          expiresAt: expiresAt || undefined,
        });
        setSuccessMessage(`Document sent to ${result.length} parent(s).`);
      } else {
        const result = await sendDocument.mutateAsync({
          templateId: selectedTemplateId,
          parentIds: Array.from(selectedParentIds),
          expiresAt: expiresAt || undefined,
        });
        setSuccessMessage(`Document sent to ${result.length} parent(s).`);
      }
      setSelectedParentIds(new Set());
      setSendToAll(false);
    } catch (err) {
      console.error("Failed to send document:", err);
    } finally {
      setLoading(false);
    }
  };

  const canSend =
    selectedTemplateId && (sendToAll || selectedParentIds.size > 0);

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <h1 className="mb-4 text-2xl font-bold">Send Document</h1>

      {successMessage && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardContent className="py-3">
            <p className="text-sm text-green-800">{successMessage}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No templates available. Create one first.
                </p>
              ) : (
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.title} ({t.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sendToAll"
                  checked={sendToAll}
                  onCheckedChange={(checked) => {
                    setSendToAll(checked === true);
                    if (checked) setSelectedParentIds(new Set());
                  }}
                />
                <Label htmlFor="sendToAll" className="cursor-pointer">
                  Send to all enrolled parents ({parents.length})
                </Label>
              </div>

              {!sendToAll && (
                <div className="space-y-2">
                  {parents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No parents with active enrollments.
                    </p>
                  ) : (
                    parents.map((parent) => (
                      <div key={parent.parentId} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedParentIds.has(parent.parentId)}
                          onCheckedChange={() => toggleParent(parent.parentId)}
                        />
                        <span className="text-sm">
                          {parent.parentName} ({parent.parentEmail})
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            className="w-full"
            onClick={handleSend}
            disabled={!canSend || loading}
          >
            {loading ? "Sending..." : "Send Document"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <div className="prose prose-sm max-w-none">
                <h3>{selectedTemplate.title}</h3>
                {selectedTemplate.description && (
                  <p className="text-muted-foreground">{selectedTemplate.description}</p>
                )}
                <div className="whitespace-pre-wrap rounded-md border bg-muted/50 p-4 text-sm">
                  {selectedTemplate.content}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a template to preview its content.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

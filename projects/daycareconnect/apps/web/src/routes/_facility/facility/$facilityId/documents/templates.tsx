import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  useAdminDocumentTemplates,
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
  useArchiveDocumentTemplate,
} from "@daycare-hub/hooks";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import { TemplateFormDialog } from "@/components/documents/template-form-dialog";
import {
  Card,
  CardContent,
  Button,
  Badge,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/documents/templates"
)({
  component: TemplatesPage,
});

function TemplatesPage() {
  const { facilityId } = Route.useParams();
  const { data: templates = [], isLoading } = useAdminDocumentTemplates(facilityId);
  const createDocumentTemplate = useCreateDocumentTemplate();
  const updateDocumentTemplate = useUpdateDocumentTemplate();
  const archiveDocumentTemplate = useArchiveDocumentTemplate();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  const handleCreate = async (data: any) => {
    setLoading(true);
    try {
      await createDocumentTemplate.mutateAsync({ facilityId, data });
      setCreateOpen(false);
    } catch (err) {
      console.error("Failed to create template:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editTemplate) return;
    setLoading(true);
    try {
      await updateDocumentTemplate.mutateAsync({ templateId: editTemplate.id, data });
      setEditTemplate(null);
    } catch (err) {
      console.error("Failed to update template:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (templateId: string) => {
    if (!window.confirm("Archive this template? It can no longer be sent to parents.")) return;
    try {
      await archiveDocumentTemplate.mutateAsync(templateId);
    } catch (err) {
      console.error("Failed to archive template:", err);
    }
  };

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Document Templates</h1>
        <Button onClick={() => setCreateOpen(true)}>Create Template</Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No templates yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className={template.isArchived ? "opacity-60" : ""}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{template.title}</p>
                    <Badge variant="outline" className="capitalize">
                      {template.category}
                    </Badge>
                    {template.isRequired && (
                      <Badge variant="secondary">Required</Badge>
                    )}
                    {template.isArchived && (
                      <Badge variant="destructive">Archived</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">v{template.version}</span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </div>
                {!template.isArchived && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditTemplate(template)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleArchive(template.id)}
                    >
                      Archive
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        loading={loading}
      />

      {editTemplate && (
        <TemplateFormDialog
          open={!!editTemplate}
          onOpenChange={(open) => !open && setEditTemplate(null)}
          onSubmit={handleUpdate}
          initialData={editTemplate}
          isEdit
          loading={loading}
        />
      )}
    </div>
  );
}

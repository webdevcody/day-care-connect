import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  getActivityEntries,
  getEnrolledChildren,
  createActivityEntry,
  bulkCreateActivityEntries,
  deleteActivityEntry,
} from "@/lib/server/admin-activities";
import { AdminFacilityNav } from "@/components/admin/admin-facility-nav";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { ActivityEntryForm } from "@/components/activities/activity-entry-form";
import { ActivityIcon, getActivityLabel } from "@/components/activities/activity-icon";
import { ACTIVITY_TYPES, type ActivityType } from "@daycare-hub/shared";
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_facility/facility/$facilityId/activities"
)({
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { facilityId } = Route.useParams();
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [childFilter, setChildFilter] = useState<string>("all");
  const [entries, setEntries] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [defaultType, setDefaultType] = useState<ActivityType | undefined>();

  const fetchData = async () => {
    try {
      const [entriesData, childrenData] = await Promise.all([
        getActivityEntries({
          data: {
            facilityId,
            date,
            childId: childFilter !== "all" ? childFilter : undefined,
          },
        }),
        getEnrolledChildren({ data: { facilityId } }),
      ]);
      setEntries(entriesData);
      setChildren(childrenData);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [date, childFilter, facilityId]);

  const handleQuickAdd = (type: ActivityType) => {
    setDefaultType(type);
    setFormOpen(true);
  };

  const handleSubmit = async (data: {
    childIds: string[];
    type: ActivityType;
    data: Record<string, unknown>;
    photoUrl?: string;
    occurredAt: string;
  }) => {
    if (data.childIds.length === 1) {
      await createActivityEntry({
        data: {
          childId: data.childIds[0],
          facilityId,
          type: data.type,
          data: data.data,
          photoUrl: data.photoUrl || null,
          occurredAt: data.occurredAt,
        },
      });
    } else {
      await bulkCreateActivityEntries({
        data: {
          childIds: data.childIds,
          facilityId,
          type: data.type,
          data: data.data,
          photoUrl: data.photoUrl || null,
          occurredAt: data.occurredAt,
        },
      });
    }
    await fetchData();
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm("Delete this activity entry?")) return;
    try {
      await deleteActivityEntry({ data: { activityId: entryId } });
      await fetchData();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const quickButtons: ActivityType[] = [
    "meal",
    "nap",
    "activity",
    "bathroom",
    "photo",
    "note",
  ];

  return (
    <div>
      <AdminFacilityNav facilityId={facilityId} />

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activities</h1>
        <div className="flex items-center gap-3">
          <Select
            value={childFilter}
            onValueChange={setChildFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All children" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All children</SelectItem>
              {children.map((child) => (
                <SelectItem key={child.id} value={child.id}>
                  {child.firstName} {child.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        {quickButtons.map((type) => (
          <Button
            key={type}
            variant="outline"
            size="sm"
            onClick={() => handleQuickAdd(type)}
            className="gap-2"
          >
            <ActivityIcon type={type} className="h-4 w-4" />
            {getActivityLabel(type)}
          </Button>
        ))}
        <Button
          size="sm"
          onClick={() => {
            setDefaultType(undefined);
            setFormOpen(true);
          }}
        >
          + Log Activity
        </Button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">{entries.length}</div>
            <p className="text-sm text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">
              {new Set(entries.map((e: any) => e.childId)).size}
            </div>
            <p className="text-sm text-muted-foreground">Children</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold">
              {new Set(entries.map((e: any) => e.type)).size}
            </div>
            <p className="text-sm text-muted-foreground">Activity Types</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading activities...</p>
          </CardContent>
        </Card>
      ) : (
        <ActivityTimeline
          entries={entries}
          showChildName={childFilter === "all"}
          onDelete={handleDelete}
        />
      )}

      {/* Entry Form Dialog */}
      <ActivityEntryForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setDefaultType(undefined);
        }}
        children={children}
        defaultType={defaultType}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

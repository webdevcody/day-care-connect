import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_parent/parent")({
  component: ParentDashboard,
});

function ParentDashboard() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Parent Dashboard</h1>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Welcome!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The parent portal is coming soon. You'll be able to view your
            children's attendance, photos, and more.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

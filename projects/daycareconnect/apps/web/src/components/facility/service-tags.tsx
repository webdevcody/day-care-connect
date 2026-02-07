import { Badge } from "@daycare-hub/ui";

type Service = {
  id: string;
  serviceName: string;
};

export function ServiceTags({ services }: { services: Service[] }) {
  if (services.length === 0) {
    return <p className="text-muted-foreground">No services listed.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {services.map((s) => (
        <Badge key={s.id} variant="secondary">
          {s.serviceName}
        </Badge>
      ))}
    </div>
  );
}

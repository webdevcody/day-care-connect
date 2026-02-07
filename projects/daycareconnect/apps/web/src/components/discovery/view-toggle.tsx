import { Button } from "@daycare-hub/ui";

type ViewMode = "split" | "map" | "list";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  const modes: { key: ViewMode; label: string }[] = [
    { key: "split", label: "Split" },
    { key: "list", label: "List" },
    { key: "map", label: "Map" },
  ];

  return (
    <div className="inline-flex rounded-md border">
      {modes.map((mode) => (
        <Button
          key={mode.key}
          variant={value === mode.key ? "default" : "ghost"}
          size="sm"
          className="rounded-none first:rounded-l-md last:rounded-r-md"
          onClick={() => onChange(mode.key)}
        >
          {mode.label}
        </Button>
      ))}
    </div>
  );
}

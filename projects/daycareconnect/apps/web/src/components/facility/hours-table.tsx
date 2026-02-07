import { DAYS_OF_WEEK } from "@daycare-hub/shared";

type Hour = {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
};

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export function HoursTable({ hours }: { hours: Hour[] }) {
  return (
    <div className="space-y-2">
      {DAYS_OF_WEEK.map((day, i) => {
        const entry = hours.find((h) => h.dayOfWeek === i);
        return (
          <div key={day} className="flex items-center justify-between border-b py-2 last:border-0">
            <span className="font-medium">{day}</span>
            <span className="text-muted-foreground">
              {entry
                ? `${formatTime(entry.openTime)} – ${formatTime(entry.closeTime)}`
                : "Closed"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@daycare-hub/ui";

type Props = {
  hourlyRate: string | null;
  dailyRate: string | null;
  weeklyRate: string | null;
  monthlyRate: string | null;
};

const rateConfigs = [
  { key: "hourlyRate" as const, label: "Hourly", period: "/hour" },
  { key: "dailyRate" as const, label: "Daily", period: "/day" },
  { key: "weeklyRate" as const, label: "Weekly", period: "/week" },
  { key: "monthlyRate" as const, label: "Monthly", period: "/month" },
];

export function PricingCards(props: Props) {
  const cards = rateConfigs.filter((c) => props[c.key]);

  if (cards.length === 0) {
    return <p className="text-muted-foreground">No pricing information available.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${props[c.key]}<span className="text-sm font-normal text-muted-foreground">{c.period}</span></p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

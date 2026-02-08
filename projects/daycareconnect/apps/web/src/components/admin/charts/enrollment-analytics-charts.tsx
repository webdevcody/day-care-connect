import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DailyData {
  date: string;
  count: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

export function DailyEnrollmentChart({ data }: { data: DailyData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No enrollment data for this month.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          fontSize={11}
          angle={-45}
          textAnchor="end"
          height={60}
          interval={2}
        />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip
          labelFormatter={(_, payload) => {
            if (payload?.[0]?.payload?.date) {
              return new Date(payload[0].payload.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "long",
                day: "numeric",
                year: "numeric",
              });
            }
            return "";
          }}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          name="New Enrollments"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyEnrollmentChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No enrollment data for the last 12 months.
      </div>
    );
  }

  const formatted = data.map((d) => {
    const [year, month] = d.month.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return {
      ...d,
      label: date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
    };
  });

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="label" fontSize={12} />
        <YAxis allowDecimals={false} fontSize={12} />
        <Tooltip
          labelFormatter={(_, payload) => {
            if (payload?.[0]?.payload?.month) {
              const [year, month] = payload[0].payload.month.split("-");
              return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              });
            }
            return "";
          }}
        />
        <Bar
          dataKey="count"
          fill="hsl(var(--primary))"
          name="New Enrollments"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

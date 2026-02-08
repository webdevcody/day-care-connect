import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useEnrollmentAnalytics } from "@daycare-hub/hooks";
import {
  DailyEnrollmentChart,
  MonthlyEnrollmentChart,
} from "@/components/admin/charts/enrollment-analytics-charts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@daycare-hub/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_facility/facility/$facilityId/enrollment-analytics")({
  component: EnrollmentAnalyticsPage,
});

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function EnrollmentAnalyticsPage() {
  const { facilityId } = Route.useParams();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const { data, isLoading } = useEnrollmentAnalytics(facilityId, selectedMonth);

  const isCurrentMonth = selectedMonth === getCurrentMonth();

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth((prev) => shiftMonth(prev, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth((prev) => {
      const next = shiftMonth(prev, 1);
      return next > getCurrentMonth() ? prev : next;
    });
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setSelectedMonth(getCurrentMonth());
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Enrollment Analytics</h1>
        <p className="text-sm text-muted-foreground">Track enrollment trends over time</p>
      </div>

      {isLoading && !data ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading analytics...</p>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="py-5 text-center">
                <div className="text-3xl font-bold">{data.totalSelectedMonth}</div>
                <p className="text-sm text-muted-foreground">
                  Enrollments in {formatMonthLabel(data.selectedMonth)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-5 text-center">
                <div className="text-3xl font-bold">{data.totalLast12Months}</div>
                <p className="text-sm text-muted-foreground">Enrollments (Last 12 Months)</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart tabs */}
          <Tabs defaultValue="daily">
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Enrollments by Day</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={goToPreviousMonth}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[140px] text-center text-sm font-medium">
                        {formatMonthLabel(selectedMonth)}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={goToNextMonth}
                        disabled={isCurrentMonth}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      {!isCurrentMonth && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={goToCurrentMonth}
                          className="ml-1 text-xs"
                        >
                          Today
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <DailyEnrollmentChart data={data.daily} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="monthly">
              <Card>
                <CardHeader>
                  <CardTitle>Enrollments by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <MonthlyEnrollmentChart data={data.monthly} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No analytics data available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useEnrollmentReport, useAttendanceReport, useRevenueEstimate } from "@daycare-hub/hooks";
import { EnrollmentChart } from "@/components/admin/charts/enrollment-chart";
import { AttendanceBarChart, AbsencePieChart } from "@/components/admin/charts/attendance-chart";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
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

const PRESETS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export const Route = createFileRoute("/_facility/facility/$facilityId/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const { facilityId } = Route.useParams();
  const [preset, setPreset] = useState(30);

  const range = useMemo(() => getDateRange(preset), [preset]);

  const { data: enrollmentData, isLoading: enrollmentLoading } = useEnrollmentReport({
    facilityId,
    startDate: range.startDate,
    endDate: range.endDate,
  });
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceReport({
    facilityId,
    startDate: range.startDate,
    endDate: range.endDate,
  });
  const { data: revenueData, isLoading: revenueLoading } = useRevenueEstimate({
    facilityId,
    startDate: range.startDate,
    endDate: range.endDate,
  });

  const loading = enrollmentLoading || attendanceLoading || revenueLoading;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPreset(p.days)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                preset === p.days
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading reports...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="enrollment">
          <TabsList>
            <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
          </TabsList>

          <TabsContent value="enrollment" className="space-y-4">
            {enrollmentData && (
              <>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {Object.entries(enrollmentData.statusCounts as Record<string, number>).map(
                    ([status, cnt]) => (
                      <Card key={status}>
                        <CardContent className="py-4 text-center">
                          <div className="text-2xl font-bold">{cnt}</div>
                          <p className="text-sm capitalize text-muted-foreground">{status}</p>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Enrollment Trend (Weekly)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <EnrollmentChart data={enrollmentData.weeklyTrend} />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            {attendanceData && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Attendance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AttendanceBarChart data={attendanceData.dailyData} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Absence Reasons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <AbsencePieChart data={attendanceData.absenceBreakdown} />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            {revenueData && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-bold">{revenueData.activeEnrollments}</div>
                      <p className="text-sm text-muted-foreground">Active Enrollments</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-bold">
                        ${revenueData.monthlyRate.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Monthly Rate</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="py-4 text-center">
                      <div className="text-2xl font-bold">
                        $
                        {revenueData.totalEstimate.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <p className="text-sm text-muted-foreground">Period Estimate</p>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Revenue Estimate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RevenueChart data={revenueData.monthlyData} />
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

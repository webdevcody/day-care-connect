import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from "react-native";
import { useDashboard } from "@daycare-hub/hooks";
import { useAuth } from "../../auth/AuthContext";
import { LoadingView } from "../../components/LoadingView";
import { EmptyState } from "../../components/EmptyState";
import { ChildCard } from "../../components/ChildCard";
import { ActivityCard } from "../../components/ActivityCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, borderRadius } from "../../theme/spacing";

export function DashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useDashboard();

  if (isLoading) return <LoadingView />;

  const childrenMap = new Map(
    (data?.children || []).map((c) => [c.id, `${c.firstName} ${c.lastName}`]),
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      data={data?.recentActivities || []}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <>
          <Text style={styles.greeting}>
            Welcome, {user?.firstName || "there"}!
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {data?.stats.totalChildren ?? 0}
              </Text>
              <Text style={styles.statLabel}>Children</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {data?.stats.activeEnrollments ?? 0}
              </Text>
              <Text style={styles.statLabel}>Active Enrollments</Text>
            </View>
          </View>

          {(data?.children?.length ?? 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Children</Text>
              {data!.children.map((child) => (
                <ChildCard key={child.id} child={child} />
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </>
      }
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          childName={childrenMap.get(item.childId) || undefined}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          title="No recent activity"
          message="Activity updates will appear here"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing["5xl"],
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing["2xl"],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: {
    ...typography.h1,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing["2xl"],
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
});

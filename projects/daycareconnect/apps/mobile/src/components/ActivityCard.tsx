import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing, borderRadius } from "../theme/spacing";
interface Activity {
  id: string;
  childId: string;
  facilityId: string;
  staffId: string;
  type: string;
  data: Record<string, unknown> | null;
  photoUrl: string | null;
  occurredAt: string;
  createdAt: string;
  facilityName: string | null;
}

const ACTIVITY_ICONS: Record<string, string> = {
  meal: "🍽️",
  nap: "😴",
  activity: "🎨",
  milestone: "⭐",
  mood: "😊",
  bathroom: "🚻",
  incident: "⚠️",
  photo: "📸",
  note: "📝",
};

interface ActivityCardProps {
  activity: Activity;
  childName?: string;
}

export function ActivityCard({ activity, childName }: ActivityCardProps) {
  const icon = ACTIVITY_ICONS[activity.type] || "📋";
  const time = new Date(activity.occurredAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(activity.occurredAt).toLocaleDateString();

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.type}>
            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
          </Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        {childName && <Text style={styles.childName}>{childName}</Text>}
        <Text style={styles.date}>{date}</Text>
        {activity.facilityName && (
          <Text style={styles.facility}>{activity.facilityName}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  type: {
    ...typography.label,
    color: colors.text,
  },
  time: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  childName: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: 2,
  },
  date: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  facility: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
});

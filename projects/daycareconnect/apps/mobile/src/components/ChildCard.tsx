import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "../theme/colors";
import { typography } from "../theme/typography";
import { spacing, borderRadius } from "../theme/spacing";
import type { Child } from "../api/endpoints";

interface ChildCardProps {
  child: Child;
  onPress?: () => void;
}

export function ChildCard({ child, onPress }: ChildCardProps) {
  const age = getAge(child.dateOfBirth);
  const initials =
    (child.firstName[0] || "") + (child.lastName[0] || "");

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials.toUpperCase()}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>
          {child.firstName} {child.lastName}
        </Text>
        <Text style={styles.age}>{age}</Text>
      </View>
    </TouchableOpacity>
  );
}

function getAge(dateOfBirth: string): string {
  const dob = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - dob.getFullYear();
  const months = now.getMonth() - dob.getMonth();
  const totalMonths = years * 12 + months;

  if (totalMonths < 12) {
    return `${totalMonths} month${totalMonths !== 1 ? "s" : ""} old`;
  }
  return `${years} year${years !== 1 ? "s" : ""} old`;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  initials: {
    ...typography.label,
    color: colors.textInverse,
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.label,
    color: colors.text,
  },
  age: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

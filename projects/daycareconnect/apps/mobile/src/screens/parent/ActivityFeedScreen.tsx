import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useChildren, useChildActivities } from "@daycare-hub/hooks";
import { LoadingView } from "../../components/LoadingView";
import { EmptyState } from "../../components/EmptyState";
import { ActivityCard } from "../../components/ActivityCard";
import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";
import { spacing, borderRadius } from "../../theme/spacing";

export function ActivityFeedScreen() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: childrenData, isLoading: loadingChildren } = useChildren();

  const children = childrenData?.children || [];
  const activeChildId = selectedChildId || children[0]?.id;

  const {
    data: activitiesData,
    isLoading: loadingActivities,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useChildActivities(activeChildId!);

  if (loadingChildren) return <LoadingView />;

  if (children.length === 0) {
    return (
      <EmptyState
        title="No children"
        message="Add children to see their activity feed"
      />
    );
  }

  const activities =
    activitiesData?.pages.flatMap((p) => p.activities) || [];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.childSelector}
        contentContainerStyle={styles.childSelectorContent}
      >
        {children.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={[
              styles.childChip,
              child.id === activeChildId && styles.childChipActive,
            ]}
            onPress={() => setSelectedChildId(child.id)}
          >
            <Text
              style={[
                styles.childChipText,
                child.id === activeChildId && styles.childChipTextActive,
              ]}
            >
              {child.firstName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loadingActivities ? (
        <LoadingView />
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={activities}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          renderItem={({ item }) => <ActivityCard activity={item} />}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <EmptyState
              title="No activities yet"
              message="Activity updates will appear here"
            />
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <Text style={styles.loadingMore}>Loading more...</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  childSelector: {
    maxHeight: 56,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  childSelectorContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  childChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceDark,
    marginRight: spacing.sm,
  },
  childChipActive: {
    backgroundColor: colors.primary,
  },
  childChipText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  childChipTextActive: {
    color: colors.textInverse,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing["5xl"],
  },
  loadingMore: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: "center",
    padding: spacing.lg,
  },
});

import React from "react";
import { EmptyState } from "../../components/EmptyState";
import { View, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export function ConversationListScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        title="Messages"
        message="Messaging is coming soon! You'll be able to communicate with staff and other parents here."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});

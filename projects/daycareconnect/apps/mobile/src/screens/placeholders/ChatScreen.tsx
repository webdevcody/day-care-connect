import React from "react";
import { EmptyState } from "../../components/EmptyState";
import { View, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export function ChatScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        title="Chat"
        message="Chat functionality is coming soon!"
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

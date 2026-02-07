import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { DashboardScreen } from "../screens/parent/DashboardScreen";
import { ActivityFeedScreen } from "../screens/parent/ActivityFeedScreen";
import { NotificationsScreen } from "../screens/common/NotificationsScreen";
import { SettingsScreen } from "../screens/common/SettingsScreen";
import { ConversationListScreen } from "../screens/placeholders/ConversationListScreen";
import { ChatScreen } from "../screens/placeholders/ChatScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const ActivityStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "Home" }}
      />
      <HomeStack.Screen
        name="Notifications"
        component={NotificationsScreen}
      />
    </HomeStack.Navigator>
  );
}

function ActivityStackScreen() {
  return (
    <ActivityStack.Navigator>
      <ActivityStack.Screen
        name="ActivityFeed"
        component={ActivityFeedScreen}
        options={{ title: "Activity" }}
      />
    </ActivityStack.Navigator>
  );
}

function MessagesStackScreen() {
  return (
    <MessagesStack.Navigator>
      <MessagesStack.Screen
        name="ConversationList"
        component={ConversationListScreen}
        options={{ title: "Messages" }}
      />
      <MessagesStack.Screen name="Chat" component={ChatScreen} />
    </MessagesStack.Navigator>
  );
}

function MoreStackScreen() {
  return (
    <MoreStack.Navigator>
      <MoreStack.Screen name="Settings" component={SettingsScreen} />
    </MoreStack.Navigator>
  );
}

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: "🏠",
    Activity: "📋",
    Messages: "💬",
    More: "⚙️",
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || "📌"}
    </Text>
  );
}

export function ParentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
      })}
    >
      <Tab.Screen name="Home" component={HomeStackScreen} />
      <Tab.Screen name="Activity" component={ActivityStackScreen} />
      <Tab.Screen name="Messages" component={MessagesStackScreen} />
      <Tab.Screen name="More" component={MoreStackScreen} />
    </Tab.Navigator>
  );
}

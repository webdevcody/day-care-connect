import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";
import { AttendanceScreen } from "../screens/placeholders/AttendanceScreen";
import { StaffActivityScreen } from "../screens/placeholders/StaffActivityScreen";
import { ConversationListScreen } from "../screens/placeholders/ConversationListScreen";
import { ChatScreen } from "../screens/placeholders/ChatScreen";
import { SettingsScreen } from "../screens/common/SettingsScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();
const AttendanceStack = createNativeStackNavigator();
const ActivitiesStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();

function AttendanceStackScreen() {
  return (
    <AttendanceStack.Navigator>
      <AttendanceStack.Screen
        name="AttendanceMain"
        component={AttendanceScreen}
        options={{ title: "Attendance" }}
      />
    </AttendanceStack.Navigator>
  );
}

function ActivitiesStackScreen() {
  return (
    <ActivitiesStack.Navigator>
      <ActivitiesStack.Screen
        name="StaffActivity"
        component={StaffActivityScreen}
        options={{ title: "Activities" }}
      />
    </ActivitiesStack.Navigator>
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
    Attendance: "📋",
    Activities: "🎨",
    Messages: "💬",
    More: "⚙️",
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || "📌"}
    </Text>
  );
}

export function StaffTabs() {
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
      <Tab.Screen name="Attendance" component={AttendanceStackScreen} />
      <Tab.Screen name="Activities" component={ActivitiesStackScreen} />
      <Tab.Screen name="Messages" component={MessagesStackScreen} />
      <Tab.Screen name="More" component={MoreStackScreen} />
    </Tab.Navigator>
  );
}

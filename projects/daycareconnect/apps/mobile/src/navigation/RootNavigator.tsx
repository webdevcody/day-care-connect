import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../auth/AuthContext";
import { LoadingView } from "../components/LoadingView";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { ParentTabs } from "./ParentTabs";
import { StaffTabs } from "./StaffTabs";

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingView />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user.role === "parent" ? (
        <Stack.Screen name="ParentTabs" component={ParentTabs} />
      ) : (
        <Stack.Screen name="StaffTabs" component={StaffTabs} />
      )}
    </Stack.Navigator>
  );
}

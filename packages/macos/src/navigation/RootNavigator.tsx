import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuthStore } from "@opennative/shared";
import { SignInScreen } from "@/screens/SignInScreen";
import { MainLayout } from "@/layouts/MainLayout";

const Stack = createNativeStackNavigator();

/**
 * Auth-conditional root navigator.
 *
 * When `isAuthenticated` flips to true (e.g. after sign-in), React
 * Navigation re-renders and replaces the SignIn screen with MainLayout
 * automatically — no explicit `navigation.navigate` call needed.
 */
export function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="SignIn" component={SignInScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainLayout} />
      )}
    </Stack.Navigator>
  );
}

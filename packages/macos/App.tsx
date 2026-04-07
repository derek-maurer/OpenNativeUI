import "./global.css";
import { Text, View } from "react-native";

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-950">
      <Text className="text-2xl text-white">OpenNativeUI for macOS</Text>
      <Text className="mt-2 text-sm text-neutral-400">
        Phase 2 scaffold — ready for sign-in
      </Text>
    </View>
  );
}

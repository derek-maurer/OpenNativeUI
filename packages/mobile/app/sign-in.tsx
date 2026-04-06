import { Redirect } from "expo-router";
import { signIn } from "@opennative/shared";
import { useAuthStore } from "@opennative/shared";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  const [serverUrl, setServerUrl] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { setServerUrl: storeSetServerUrl, setAuth } = useAuthStore();

  if (isAuthenticated) {
    return <Redirect href="/(app)" />;
  }

  const handleConnect = async () => {
    setError(null);
    setIsConnecting(true);

    const trimmedUrl = serverUrl.trim().replace(/\/+$/, "");
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedUrl) {
      setError("Please enter a server URL");
      setIsConnecting(false);
      return;
    }
    if (!trimmedEmail) {
      setError("Please enter your email");
      setIsConnecting(false);
      return;
    }
    if (!trimmedPassword) {
      setError("Please enter your password");
      setIsConnecting(false);
      return;
    }

    try {
      const response = await signIn(trimmedUrl, trimmedEmail, trimmedPassword);
      storeSetServerUrl(trimmedUrl);
      setAuth(response.token, {
        id: response.id,
        email: response.email,
        name: response.name,
        role: response.role,
        profile_image_url: response.profile_image_url,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="chatbubbles" size={32} color="#fff" />
            </View>
            <Text style={styles.title}>OpenNativeUI</Text>
            <Text style={styles.subtitle}>
              Sign in to your Open WebUI server
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View>
              <Text style={styles.label}>Server URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://your-openwebui-server.com"
                placeholderTextColor="#9ca3af"
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>

            <View>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
            </View>

            <View>
              <Text style={styles.label}>Password</Text>
              <View>
                <TextInput
                  style={[styles.input, { paddingRight: 48 }]}
                  placeholder="Enter your password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#9ca3af"
                  />
                </Pressable>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              style={[
                styles.connectButton,
                isConnecting && styles.connectButtonDisabled,
              ]}
              onPress={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons name="log-in-outline" size={20} color="#fff" />
              )}
              <Text style={styles.connectButtonText}>
                {isConnecting ? "Signing in..." : "Sign In"}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.footerHint}>
            Use your Open WebUI account credentials
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  scrollContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#10a37f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#fff",
  },
  subtitle: {
    fontSize: 16,
    color: "#737373",
    marginTop: 8,
    textAlign: "center",
  },
  form: {
    gap: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#a3a3a3",
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    color: "#f87171",
    fontSize: 14,
    flex: 1,
  },
  connectButton: {
    marginTop: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#10a37f",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  footerHint: {
    fontSize: 12,
    color: "#525252",
    textAlign: "center",
    marginTop: 32,
    lineHeight: 18,
  },
});

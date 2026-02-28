import { Redirect } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "./context/auth-context";

export default function AuthScreen() {
  const { token, loadingAuth, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loadingAuth) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1f7ae0" />
      </View>
    );
  }

  if (token) {
    return <Redirect href="/(tabs)/expenses" />;
  }

  const submitHandler = async () => {
    if (!email || !password || (mode === "signup" && !name)) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      Alert.alert("Auth Error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Expense Tracker</Text>
        <Text style={styles.subtitle}>
          {mode === "signup" ? "Create Account" : "Login"}
        </Text>

        {mode === "signup" && (
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={submitHandler}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>
            {submitting
              ? "Please wait..."
              : mode === "signup"
                ? "Sign Up"
                : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() =>
            setMode((prev) => (prev === "signup" ? "login" : "signup"))
          }
          disabled={submitting}
        >
          <Text style={styles.secondaryButtonText}>
            {mode === "signup"
              ? "Already have an account? Login"
              : "New user? Create account"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  primaryButton: {
    backgroundColor: "#1f7ae0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#e9eef6",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#1d3557",
    fontWeight: "600",
  },
});

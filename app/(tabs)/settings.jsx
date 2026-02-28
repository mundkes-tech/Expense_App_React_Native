import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/auth-context";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();

  const logoutHandler = async () => {
    await signOut();
    Alert.alert("Logged out", "Session cleared successfully.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Account</Text>
        <Text style={styles.value}>{user?.name || "Not logged in"}</Text>
        <Text style={styles.value}>{user?.email || "-"}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logoutHandler}>
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  label: {
    fontWeight: "700",
    marginBottom: 4,
  },
  value: {
    color: "#555",
  },
  logoutButton: {
    backgroundColor: "#ffe8e8",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#cc0000",
    fontWeight: "700",
  },
});

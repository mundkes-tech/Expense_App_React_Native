import {
    API_BASE_URL,
    CATEGORY_OPTIONS,
    fetchWithTimeout,
} from "@/lib/finance";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../context/auth-context";

export default function ExpensesScreen() {
  const { token } = useAuth();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [capturingLocation, setCapturingLocation] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async (authToken) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/expenses`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch expenses");
      }

      const data = await response.json();
      setExpenses(data);
    } catch (_error) {
      Alert.alert("Error", "Could not fetch expenses");
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      await fetchExpenses(token);
      setLoading(false);
    };

    init();
  }, [token]);

  const resetExpenseForm = () => {
    setName("");
    setAmount("");
    setDate("");
    setCategory("");
    setLocationLabel("");
    setLatitude(null);
    setLongitude(null);
    setEditingExpenseId(null);
  };

  const startEditExpense = (expense) => {
    setEditingExpenseId(expense._id);
    setName(expense.name);
    setAmount(String(expense.amount));
    setDate(expense.date);
    setCategory(expense.category);
    setLocationLabel(expense.locationLabel || "");
    setLatitude(expense.latitude ?? null);
    setLongitude(expense.longitude ?? null);
  };

  const captureCurrentLocation = async () => {
    try {
      setCapturingLocation(true);

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission required",
          "Location permission is needed to capture current place.",
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = current.coords.latitude;
      const lon = current.coords.longitude;
      setLatitude(lat);
      setLongitude(lon);

      const places = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });
      if (places.length > 0) {
        const place = places[0];
        const parts = [
          place.name,
          place.street,
          place.city,
          place.region,
        ].filter(Boolean);
        setLocationLabel(
          parts.join(", ") || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
        );
      } else {
        setLocationLabel(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
      }
    } catch (_error) {
      Alert.alert("Location error", "Could not fetch current location.");
    } finally {
      setCapturingLocation(false);
    }
  };

  const saveExpenseHandler = async () => {
    if (!name || !amount || !date || !category) {
      Alert.alert("Validation", "Please fill all fields");
      return;
    }

    try {
      const isEditing = Boolean(editingExpenseId);
      const response = await fetchWithTimeout(
        isEditing
          ? `${API_BASE_URL}/expenses/${editingExpenseId}`
          : `${API_BASE_URL}/expenses`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            amount: parseFloat(amount),
            date,
            category,
            locationLabel: locationLabel || undefined,
            latitude: latitude ?? undefined,
            longitude: longitude ?? undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to save expense");
      }

      const savedExpense = await response.json();

      if (isEditing) {
        setExpenses((prev) =>
          prev.map((item) =>
            item._id === editingExpenseId ? savedExpense : item,
          ),
        );
      } else {
        setExpenses((prev) => [savedExpense, ...prev]);
      }

      resetExpenseForm();
    } catch (_error) {
      Alert.alert("Error", "Could not save expense");
    }
  };

  const deleteExpenseHandler = async (id) => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/expenses/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete expense");
      }

      setExpenses((prev) => prev.filter((item) => item._id !== id));
    } catch (_error) {
      Alert.alert("Error", "Could not delete expense");
    }
  };

  const openExpenseLocation = async (expense) => {
    try {
      let query = "";

      if (
        typeof expense.latitude === "number" &&
        typeof expense.longitude === "number"
      ) {
        query = `${expense.latitude},${expense.longitude}`;
      } else if (expense.locationLabel) {
        query = expense.locationLabel;
      }

      if (!query) {
        Alert.alert("No location", "No location is saved for this expense.");
        return;
      }

      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      const canOpen = await Linking.canOpenURL(url);

      if (!canOpen) {
        Alert.alert("Error", "Could not open maps on this device.");
        return;
      }

      await Linking.openURL(url);
    } catch (_error) {
      Alert.alert("Error", "Could not open location.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Add Expense</Text>
        <Text style={styles.userText}>
          Create or update your expense entries
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Expense Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter expense name"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          placeholderTextColor="#888"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{date ? date : "Select Date"}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            onChange={(_event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                const formattedDate = selectedDate.toLocaleDateString("en-GB");
                setDate(formattedDate);
              }
            }}
          />
        )}

        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={category} onValueChange={setCategory}>
            <Picker.Item label="Select Category" value="" />
            {CATEGORY_OPTIONS.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Location (Optional)</Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={captureCurrentLocation}
          disabled={capturingLocation}
        >
          <Text style={styles.secondaryButtonText}>
            {capturingLocation
              ? "Capturing location..."
              : "Use Current Location"}
          </Text>
        </TouchableOpacity>
        {locationLabel ? (
          <Text style={styles.locationPreview}>{locationLabel}</Text>
        ) : null}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={saveExpenseHandler}
          >
            <Text style={styles.primaryButtonText}>
              {editingExpenseId ? "Update Expense" : "Add Expense"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={resetExpenseForm}
          >
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.listCard}>
        <Text style={styles.label}>Recent Expenses</Text>
        {expenses.length === 0 ? (
          <Text style={styles.mutedText}>No expenses added yet.</Text>
        ) : (
          expenses.map((item) => (
            <View key={item._id} style={styles.expenseItem}>
              <Text style={styles.expenseText}>
                {item.name} - ₹{item.amount}
              </Text>
              <Text style={styles.expenseSubText}>
                {item.category} | {item.date}
              </Text>
              {item.locationLabel ? (
                <Text style={styles.expenseSubText}>
                  📍 {item.locationLabel}
                </Text>
              ) : null}
              <View style={styles.expenseActionRow}>
                <TouchableOpacity
                  style={styles.editInlineButton}
                  onPress={() => startEditExpense(item)}
                >
                  <Text style={styles.editInlineButtonText}>Edit</Text>
                </TouchableOpacity>
                {(item.locationLabel ||
                  (item.latitude != null && item.longitude != null)) && (
                  <TouchableOpacity
                    style={styles.mapInlineButton}
                    onPress={() => openExpenseLocation(item)}
                  >
                    <Text style={styles.mapInlineButtonText}>Open Map</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteInlineButton}
                  onPress={() => deleteExpenseHandler(item._id)}
                >
                  <Text style={styles.deleteInlineButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  headerCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  userText: {
    textAlign: "center",
    marginBottom: 2,
    color: "#555",
  },
  formCard: {
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  listCard: {
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  buttonRow: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#1f7ae0",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 2,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#e9eef6",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#1d3557",
    fontWeight: "600",
  },
  locationPreview: {
    marginTop: 8,
    marginBottom: 12,
    color: "#444",
    fontSize: 13,
  },
  mutedText: {
    color: "#666",
  },
  expenseItem: {
    backgroundColor: "#fff",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  expenseText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  expenseSubText: {
    fontSize: 14,
    color: "#555",
  },
  expenseActionRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
  },
  editInlineButton: {
    backgroundColor: "#e8f1ff",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editInlineButtonText: {
    color: "#1f5fbf",
    fontWeight: "700",
  },
  mapInlineButton: {
    backgroundColor: "#e7f7ef",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  mapInlineButtonText: {
    color: "#1c7c54",
    fontWeight: "700",
  },
  deleteInlineButton: {
    backgroundColor: "#ffe8e8",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteInlineButtonText: {
    color: "#cc0000",
    fontWeight: "700",
  },
});

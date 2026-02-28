import {
    API_BASE_URL,
    CATEGORY_OPTIONS,
    fetchWithTimeout,
    getCurrentMonthKey,
    readSession,
} from "@/lib/finance";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function RecurringScreen() {
  const [token, setToken] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecurring = async (authToken) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/recurring`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch recurring expenses");
    }

    const data = await response.json();
    setItems(data);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const session = await readSession();
        if (!session?.token) {
          setLoading(false);
          return;
        }

        setToken(session.token);
        await fetchRecurring(session.token);
      } catch (_error) {
        Alert.alert("Error", "Could not load recurring expenses");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const applyRecurring = async (authToken, month) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/recurring/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ month }),
    });

    if (!response.ok) {
      throw new Error("Failed to apply recurring expenses");
    }
  };

  const saveRecurringHandler = async () => {
    if (!name || !amount || !dayOfMonth) {
      Alert.alert("Validation", "Fill all recurring fields");
      return;
    }

    const parsedDay = parseInt(dayOfMonth, 10);
    if (Number.isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      Alert.alert("Validation", "Day of month must be between 1 and 31");
      return;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/recurring`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          amount: parseFloat(amount),
          category,
          dayOfMonth: parsedDay,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save recurring expense");
      }

      const saved = await response.json();
      setItems((prev) => [saved, ...prev]);
      setName("");
      setAmount("");
      setDayOfMonth("1");

      await applyRecurring(token, selectedMonth);
      Alert.alert(
        "Success",
        "Recurring expense saved and applied for selected month",
      );
    } catch (_error) {
      Alert.alert("Error", "Could not save recurring expense");
    }
  };

  const deleteRecurringHandler = async (id) => {
    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/recurring/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete recurring expense");
      }

      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (_error) {
      Alert.alert("Error", "Could not delete recurring expense");
    }
  };

  const applyNowHandler = async () => {
    try {
      await applyRecurring(token, selectedMonth);
      Alert.alert("Done", "Recurring expenses applied for selected month");
    } catch (_error) {
      Alert.alert("Error", "Could not apply recurring expenses");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1f7ae0" />
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>
          Please login from Expenses tab to manage recurring items.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Recurring</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Netflix"
          placeholderTextColor="#888"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          placeholder="Amount"
          placeholderTextColor="#888"
          value={amount}
          onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={category} onValueChange={setCategory}>
            {CATEGORY_OPTIONS.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Day of month</Text>
        <TextInput
          style={styles.input}
          placeholder="1-31"
          placeholderTextColor="#888"
          value={dayOfMonth}
          onChangeText={(text) => setDayOfMonth(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={saveRecurringHandler}
        >
          <Text style={styles.primaryButtonText}>Save Recurring</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Apply for Month</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM"
          placeholderTextColor="#888"
          value={selectedMonth}
          onChangeText={setSelectedMonth}
        />
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={applyNowHandler}
        >
          <Text style={styles.primaryButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Saved Recurring Items</Text>
        {items.length === 0 ? (
          <Text style={styles.infoText}>No recurring items yet.</Text>
        ) : (
          items.map((item) => (
            <View key={item._id} style={styles.row}>
              <Text style={styles.rowTitle}>
                {item.name} - ₹{item.amount}
              </Text>
              <Text style={styles.rowSub}>
                {item.category} • Day {item.dayOfMonth}
              </Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteRecurringHandler(item._id)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
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
    gap: 8,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
  },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  primaryButton: {
    backgroundColor: "#1f7ae0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  infoText: {
    color: "#666",
    textAlign: "center",
  },
  row: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    marginTop: 6,
    gap: 4,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  rowSub: {
    color: "#555",
  },
  deleteButton: {
    alignSelf: "flex-start",
    backgroundColor: "#ffe8e8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: "#cc0000",
    fontWeight: "700",
  },
});

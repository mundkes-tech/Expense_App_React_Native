import {
    API_BASE_URL,
    CATEGORY_OPTIONS,
    fetchWithTimeout,
    getCurrentMonthKey,
    getMonthKeyFromDateText,
    monthLabelFromKey,
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

export default function BudgetsScreen() {
  const [token, setToken] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [budgetCategory, setBudgetCategory] = useState(CATEGORY_OPTIONS[0]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBudgets = async (authToken, monthKey) => {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/budgets?month=${monthKey}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch budgets");
    }

    const data = await response.json();
    setBudgets(data);
  };

  const fetchExpenses = async (authToken) => {
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
        await fetchExpenses(session.token);
        await fetchBudgets(session.token, getCurrentMonthKey());
      } catch (_error) {
        Alert.alert("Error", "Could not load budgets");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchBudgets(token, selectedMonth).catch(() => {
      Alert.alert("Error", "Could not fetch budgets");
    });
  }, [token, selectedMonth]);

  const saveBudgetHandler = async () => {
    if (!budgetAmount) {
      Alert.alert("Validation", "Enter budget amount");
      return;
    }

    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/budgets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month: selectedMonth,
          category: budgetCategory,
          limitAmount: parseFloat(budgetAmount),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save budget");
      }

      const saved = await response.json();
      setBudgets((prev) => {
        const exists = prev.some((item) => item._id === saved._id);
        if (exists) {
          return prev.map((item) => (item._id === saved._id ? saved : item));
        }
        return [...prev, saved].sort((a, b) =>
          a.category.localeCompare(b.category),
        );
      });
      setBudgetAmount("");
    } catch (_error) {
      Alert.alert("Error", "Could not save budget");
    }
  };

  const deleteBudgetHandler = async (id) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/budgets/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete budget");
      }

      setBudgets((prev) => prev.filter((item) => item._id !== id));
    } catch (_error) {
      Alert.alert("Error", "Could not delete budget");
    }
  };

  const monthKeys = Array.from(
    new Set(expenses.map((item) => getMonthKeyFromDateText(item.date))),
  )
    .filter((item) => item !== "Unknown")
    .sort((a, b) => (a < b ? 1 : -1));

  const monthOptions = Array.from(
    new Set([getCurrentMonthKey(), ...monthKeys]),
  ).sort((a, b) => (a < b ? 1 : -1));

  const monthExpenses = expenses.filter(
    (item) => getMonthKeyFromDateText(item.date) === selectedMonth,
  );

  const spentByCategory = monthExpenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});

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
          Please login from Expenses tab to manage budgets.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Budgets</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Month</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={setSelectedMonth}
          >
            {monthOptions.map((monthKey) => (
              <Picker.Item
                key={monthKey}
                label={monthLabelFromKey(monthKey)}
                value={monthKey}
              />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={budgetCategory}
            onValueChange={setBudgetCategory}
          >
            {CATEGORY_OPTIONS.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Budget amount"
          placeholderTextColor="#888"
          value={budgetAmount}
          onChangeText={(text) => setBudgetAmount(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={saveBudgetHandler}
        >
          <Text style={styles.primaryButtonText}>Save Budget</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Budget Progress</Text>
        {budgets.length === 0 ? (
          <Text style={styles.infoText}>
            No budgets set for selected month.
          </Text>
        ) : (
          budgets.map((item) => {
            const spent = spentByCategory[item.category] || 0;
            const percent =
              item.limitAmount > 0
                ? Math.round((spent / item.limitAmount) * 100)
                : 0;
            return (
              <View key={item._id} style={styles.row}>
                <Text style={styles.rowTitle}>{item.category}</Text>
                <Text style={styles.rowSub}>
                  ₹{spent} / ₹{item.limitAmount} ({percent}%)
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteBudgetHandler(item._id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            );
          })
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
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
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

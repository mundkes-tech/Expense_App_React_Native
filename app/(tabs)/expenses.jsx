import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { PieChart } from "react-native-chart-kit";

const screenWidth = Dimensions.get("window").width;

function getApiBaseUrl() {
  const hostUri = Constants.expoConfig?.hostUri;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:5000/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:5000/api";
  }

  return "http://localhost:5000/api";
}

const API_BASE_URL = getApiBaseUrl();
const SESSION_KEY = "expense_app_session";
const CATEGORY_OPTIONS = ["Food", "Travel", "Shopping", "Bills", "Other"];

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseExpenseDate(dateText) {
  if (!dateText || typeof dateText !== "string") {
    return null;
  }

  const [day, month, year] = dateText.split("/").map(Number);
  if (!day || !month || !year) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function getMonthKeyFromDateText(dateText) {
  const parsed = parseExpenseDate(dateText);
  if (!parsed) {
    return "Unknown";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function monthLabelFromKey(monthKey) {
  if (!monthKey || monthKey === "ALL" || monthKey === "Unknown") {
    return monthKey;
  }

  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

async function saveSession(session) {
  try {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
  } catch (_error) {
    // no-op
  }
}

async function readSession() {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_error) {
    return null;
  }
}

async function clearSession() {
  try {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  } catch (_error) {
    // no-op
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function Expense() {
  const lastBudgetStatusRef = useRef({});

  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [budgetCategory, setBudgetCategory] = useState(CATEGORY_OPTIONS[0]);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgets, setBudgets] = useState([]);
  const [recurringName, setRecurringName] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringCategory, setRecurringCategory] = useState(CATEGORY_OPTIONS[0]);
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState("1");
  const [recurringItems, setRecurringItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async (authToken) => {
    try {
      const expensesResponse = await fetchWithTimeout(`${API_BASE_URL}/expenses`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!expensesResponse.ok) {
        throw new Error("Failed to fetch expenses");
      }

      const expensesData = await expensesResponse.json();
      setExpenses(expensesData);
    } catch (_error) {
      Alert.alert("Error", "Could not fetch expenses");
    }
  };

  const fetchBudgets = async (authToken, monthKey) => {
    if (!monthKey || monthKey === "ALL") {
      setBudgets([]);
      return;
    }

    try {
      const response = await fetchWithTimeout(
        `${API_BASE_URL}/budgets?month=${monthKey}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch budgets");
      }

      const data = await response.json();
      setBudgets(data);
    } catch (_error) {
      Alert.alert("Error", "Could not fetch budgets");
    }
  };

  const fetchRecurringItems = async (authToken) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/recurring`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recurring items");
      }

      const data = await response.json();
      setRecurringItems(data);
    } catch (_error) {
      Alert.alert("Error", "Could not fetch recurring expenses");
    }
  };

  const applyRecurringForMonth = async (authToken, monthKey) => {
    if (!monthKey || monthKey === "ALL") {
      return;
    }

    await fetchWithTimeout(`${API_BASE_URL}/recurring/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ month: monthKey }),
    });
  };

  useEffect(() => {
    const restoreSession = async () => {
      const session = await readSession();

      if (!session?.token) {
        setLoading(false);
        return;
      }

      setToken(session.token);
      setUser(session.user ?? null);
      await applyRecurringForMonth(session.token, getCurrentMonthKey());
      await fetchExpenses(session.token);
      await fetchBudgets(session.token, getCurrentMonthKey());
      await fetchRecurringItems(session.token);
      setLoading(false);
    };

    restoreSession();
  }, []);

  const submitAuth = async () => {
    if (!authEmail || !authPassword || (authMode === "signup" && !authName)) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }

    setLoading(true);

    try {
      const endpoint =
        authMode === "signup"
          ? `${API_BASE_URL}/auth/signup`
          : `${API_BASE_URL}/auth/login`;

      const payload =
        authMode === "signup"
          ? { name: authName, email: authEmail, password: authPassword }
          : { email: authEmail, password: authPassword };

      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      setToken(data.token);
      setUser(data.user);
      setAuthPassword("");
      await saveSession({ token: data.token, user: data.user });
      await applyRecurringForMonth(data.token, selectedMonth);
      await fetchExpenses(data.token);
      await fetchBudgets(data.token, selectedMonth);
      await fetchRecurringItems(data.token);
    } catch (error) {
      const message =
        error.name === "AbortError"
          ? `Request timed out. Check backend and API URL: ${API_BASE_URL}`
          : error.message;
      Alert.alert("Auth Error", message);
    } finally {
      setLoading(false);
    }
  };

  const logoutHandler = async () => {
    await clearSession();
    lastBudgetStatusRef.current = {};
    setToken("");
    setUser(null);
    setExpenses([]);
    setShowForm(false);
    setName("");
    setAmount("");
    setDate("");
    setCategory("");
    setEditingExpenseId(null);
    setSelectedMonth(getCurrentMonthKey());
    setBudgetCategory(CATEGORY_OPTIONS[0]);
    setBudgetAmount("");
    setBudgets([]);
    setRecurringName("");
    setRecurringAmount("");
    setRecurringCategory(CATEGORY_OPTIONS[0]);
    setRecurringDayOfMonth("1");
    setRecurringItems([]);
  };

  const saveRecurringHandler = async () => {
    if (!token) {
      Alert.alert("Auth", "Please login first");
      return;
    }

    if (!recurringName || !recurringAmount || !recurringCategory || !recurringDayOfMonth) {
      Alert.alert("Validation", "Please fill recurring details");
      return;
    }

    const parsedDay = parseInt(recurringDayOfMonth, 10);
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
          name: recurringName,
          amount: parseFloat(recurringAmount),
          category: recurringCategory,
          dayOfMonth: parsedDay,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save recurring expense");
      }

      const savedItem = await response.json();
      setRecurringItems((prevItems) => [savedItem, ...prevItems]);

      setRecurringName("");
      setRecurringAmount("");
      setRecurringCategory(CATEGORY_OPTIONS[0]);
      setRecurringDayOfMonth("1");

      await applyRecurringForMonth(token, selectedMonth);
      await fetchExpenses(token);
    } catch (_error) {
      Alert.alert("Error", "Could not save recurring expense");
    }
  };

  const deleteRecurringHandler = async (recurringId) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/recurring/${recurringId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete recurring expense");
      }

      setRecurringItems((prevItems) =>
        prevItems.filter((item) => item._id !== recurringId)
      );
    } catch (_error) {
      Alert.alert("Error", "Could not delete recurring expense");
    }
  };

  const saveBudgetHandler = async () => {
    if (!token) {
      Alert.alert("Auth", "Please login first");
      return;
    }

    if (!selectedMonth || selectedMonth === "ALL") {
      Alert.alert("Budget", "Select a month to set budget");
      return;
    }

    if (!budgetCategory || !budgetAmount) {
      Alert.alert("Validation", "Select category and budget amount");
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
      setBudgets((prevBudgets) => {
        const exists = prevBudgets.some(
          (budget) => budget.category === saved.category && budget.month === saved.month
        );

        if (exists) {
          return prevBudgets.map((budget) =>
            budget.category === saved.category && budget.month === saved.month
              ? saved
              : budget
          );
        }

        return [...prevBudgets, saved].sort((first, second) =>
          first.category.localeCompare(second.category)
        );
      });

      setBudgetAmount("");
    } catch (_error) {
      Alert.alert("Error", "Could not save budget");
    }
  };

  const deleteBudgetHandler = async (budgetId) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/budgets/${budgetId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete budget");
      }

      setBudgets((prevBudgets) =>
        prevBudgets.filter((budget) => budget._id !== budgetId)
      );
    } catch (_error) {
      Alert.alert("Error", "Could not delete budget");
    }
  };

  const resetExpenseForm = () => {
    setName("");
    setAmount("");
    setDate("");
    setCategory("");
    setEditingExpenseId(null);
    setShowForm(false);
  };

  const startEditExpense = (expense) => {
    setEditingExpenseId(expense._id);
    setName(expense.name);
    setAmount(String(expense.amount));
    setDate(expense.date);
    setCategory(expense.category);
    setShowForm(true);
  };

  const saveExpenseHandler = async () => {
    if (!token) {
      Alert.alert("Auth", "Please login first");
      return;
    }

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
          }),
        }
      );

      if (!response.ok) {
        throw new Error(isEditing ? "Failed to update expense" : "Failed to add expense");
      }

      const savedExpense = await response.json();

      if (isEditing) {
        setExpenses((prevExpenses) =>
          prevExpenses.map((item) =>
            item._id === editingExpenseId ? savedExpense : item
          )
        );
      } else {
        setExpenses((prevExpenses) => [savedExpense, ...prevExpenses]);
      }

      resetExpenseForm();
    } catch (_error) {
      Alert.alert("Error", "Could not save expense");
    }
  };

  const deleteExpenseHandler = async (id) => {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/expenses/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete expense");
      }

      setExpenses((prevExpenses) => prevExpenses.filter((item) => item._id !== id));
    } catch (_error) {
      Alert.alert("Error", "Could not delete expense");
    }
  };

  const monthKeys = Array.from(
    new Set(expenses.map((item) => getMonthKeyFromDateText(item.date)))
  )
    .filter((item) => item !== "Unknown")
    .sort((first, second) => (first < second ? 1 : -1));

  const monthOptions = Array.from(new Set([getCurrentMonthKey(), ...monthKeys])).sort(
    (first, second) => (first < second ? 1 : -1)
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const syncSelectedMonthData = async () => {
      await applyRecurringForMonth(token, selectedMonth);
      await fetchExpenses(token);
      await fetchBudgets(token, selectedMonth);
    };

    syncSelectedMonthData();
  }, [token, selectedMonth]);

  const filteredExpenses =
    selectedMonth === "ALL"
      ? expenses
      : expenses.filter(
          (item) => getMonthKeyFromDateText(item.date) === selectedMonth
        );

  const categoryTotals = filteredExpenses.reduce((acc, item) => {
    if (acc[item.category]) {
      acc[item.category] += item.amount;
    } else {
      acc[item.category] = item.amount;
    }
    return acc;
  }, {});

  // Colors for categories
  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];

  const chartData = Object.keys(categoryTotals).map((key, index) => ({
    name: key,
    amount: categoryTotals[key],
    color: colors[index % colors.length],
    legendFontColor: "#333",
    legendFontSize: 14,
  }));

  const budgetProgressRows = budgets.map((budget) => {
    const spentAmount = categoryTotals[budget.category] ?? 0;
    const limitAmount = budget.limitAmount || 0;
    const ratio = limitAmount > 0 ? spentAmount / limitAmount : 0;
    const percent = Math.round(ratio * 100);
    const safePercent = Math.min(percent, 100);

    let status = "Safe";
    if (ratio >= 1) {
      status = "Over limit";
    } else if (ratio >= 0.8) {
      status = "Near limit";
    }

    return {
      ...budget,
      spentAmount,
      percent,
      safePercent,
      status,
    };
  });

  const warningRows = budgetProgressRows.filter(
    (item) => item.status === "Near limit" || item.status === "Over limit"
  );

  useEffect(() => {
    warningRows.forEach((item) => {
      const rowKey = `${item.month}-${item.category}`;
      const previousStatus = lastBudgetStatusRef.current[rowKey];

      if (previousStatus === item.status) {
        return;
      }

      if (item.status === "Over limit") {
        Alert.alert(
          "Budget Alert",
          `${item.category} is over budget (${item.percent}%).`
        );
      } else if (item.status === "Near limit") {
        Alert.alert(
          "Budget Alert",
          `${item.category} reached ${item.percent}% of budget.`
        );
      }

      lastBudgetStatusRef.current[rowKey] = item.status;
    });
  }, [warningRows]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!token) {
    return (
      <View style={styles.authScreen}>
        <View style={styles.authCard}>
          <Text style={styles.title}>Expense Tracker</Text>
          <Text style={styles.authTitle}>
            {authMode === "signup" ? "Create Account" : "Login"}
          </Text>

          {authMode === "signup" && (
            <TextInput
              style={styles.input}
              placeholder="Full name"
              placeholderTextColor="#888"
              value={authName}
              onChangeText={setAuthName}
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#888"
            value={authEmail}
            onChangeText={setAuthEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#888"
            value={authPassword}
            onChangeText={setAuthPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.primaryButton} onPress={submitAuth}>
            <Text style={styles.primaryButtonText}>
              {authMode === "signup" ? "Sign Up" : "Login"}
            </Text>
          </TouchableOpacity>

          <View style={styles.authSwitchWrap}>
            <Text style={styles.mutedText}>
              {authMode === "signup"
                ? "Already have an account?"
                : "New user?"}
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() =>
                setAuthMode((prevMode) =>
                  prevMode === "signup" ? "login" : "signup"
                )
              }
            >
              <Text style={styles.secondaryButtonText}>
                {authMode === "signup" ? "Go to Login" : "Create Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Expense Tracker</Text>
        <Text style={styles.userText}>Welcome, {user?.name}</Text>
        <TouchableOpacity style={styles.dangerButton} onPress={logoutHandler}>
          <Text style={styles.dangerButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.label}>Month Filter</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={(itemValue) => setSelectedMonth(itemValue)}
          >
            <Picker.Item label="All months" value="ALL" />
            {monthOptions.map((monthKey) => (
              <Picker.Item
                key={monthKey}
                label={monthLabelFromKey(monthKey)}
                value={monthKey}
              />
            ))}
          </Picker>
        </View>
      </View>

      {warningRows.length > 0 && (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>Live Budget Warnings</Text>
          {warningRows.map((item) => (
            <Text key={`warn-${item.month}-${item.category}`} style={styles.warningText}>
              {item.category}: {item.status} ({item.percent}%)
            </Text>
          ))}
        </View>
      )}

      <View style={styles.budgetCard}>
        <Text style={styles.label}>Set Budget ({monthLabelFromKey(selectedMonth)})</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={budgetCategory}
            onValueChange={(itemValue) => setBudgetCategory(itemValue)}
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
        <TouchableOpacity style={styles.primaryButton} onPress={saveBudgetHandler}>
          <Text style={styles.primaryButtonText}>Save Budget</Text>
        </TouchableOpacity>
      </View>

      {budgetProgressRows.length > 0 && (
        <View style={styles.budgetCard}>
          <Text style={styles.label}>Budget Alerts</Text>
          {budgetProgressRows.map((item) => (
            <View key={`${item.month}-${item.category}`} style={styles.budgetRow}>
              <View style={styles.budgetRowHeader}>
                <Text style={styles.expenseText}>{item.category}</Text>
                <Text style={styles.budgetStatusText}>{item.status}</Text>
              </View>
              <Text style={styles.expenseSubText}>
                ₹{item.spentAmount} / ₹{item.limitAmount} ({item.percent}%)
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${item.safePercent}%` },
                    item.status === "Over limit"
                      ? styles.progressFillDanger
                      : item.status === "Near limit"
                      ? styles.progressFillWarn
                      : styles.progressFillSafe,
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.deleteBudgetButton}
                onPress={() => deleteBudgetHandler(item._id)}
              >
                <Text style={styles.deleteBudgetButtonText}>Delete Budget</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.budgetCard}>
        <Text style={styles.label}>Recurring Expenses</Text>
        <TextInput
          style={styles.input}
          placeholder="Recurring name"
          placeholderTextColor="#888"
          value={recurringName}
          onChangeText={setRecurringName}
        />
        <TextInput
          style={styles.input}
          placeholder="Amount"
          placeholderTextColor="#888"
          value={recurringAmount}
          onChangeText={(text) => setRecurringAmount(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
        />
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={recurringCategory}
            onValueChange={(itemValue) => setRecurringCategory(itemValue)}
          >
            {CATEGORY_OPTIONS.map((item) => (
              <Picker.Item key={item} label={item} value={item} />
            ))}
          </Picker>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Day of month (1-31)"
          placeholderTextColor="#888"
          value={recurringDayOfMonth}
          onChangeText={(text) => setRecurringDayOfMonth(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.primaryButton} onPress={saveRecurringHandler}>
          <Text style={styles.primaryButtonText}>Add Recurring</Text>
        </TouchableOpacity>

        {recurringItems.length > 0 && (
          <View style={styles.recurringListWrap}>
            {recurringItems.map((item) => (
              <View key={item._id} style={styles.recurringRow}>
                <Text style={styles.expenseText}>
                  {item.name} - ₹{item.amount}
                </Text>
                <Text style={styles.expenseSubText}>
                  {item.category} • Every month on day {item.dayOfMonth}
                </Text>
                <TouchableOpacity
                  style={styles.deleteBudgetButton}
                  onPress={() => deleteRecurringHandler(item._id)}
                >
                  <Text style={styles.deleteBudgetButtonText}>Delete Recurring</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Chart */}
      {filteredExpenses.length > 0 && (
        <PieChart
          data={chartData}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      )}

      {showForm ? (
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
                  const formattedDate =
                    selectedDate.toLocaleDateString("en-GB");
                  setDate(formattedDate);
                }
              }}
            />
          )}

          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={category}
              onValueChange={(itemValue) => setCategory(itemValue)}
            >
              <Picker.Item label="Select Category" value="" />
              {CATEGORY_OPTIONS.map((item) => (
                <Picker.Item key={item} label={item} value={item} />
              ))}
            </Picker>
          </View>

          <View style={styles.buttonRow}> 
            <TouchableOpacity style={styles.primaryButton} onPress={saveExpenseHandler}>
              <Text style={styles.primaryButtonText}>
                {editingExpenseId ? "Update Expense" : "Add Expense"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetExpenseForm}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.primaryButtonText}>Add New Expense</Text>
        </TouchableOpacity>
      )}

      {filteredExpenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.mutedText}>No expenses for selected month.</Text>
        </View>
      ) : (
        filteredExpenses.map((item) => (
          <View key={item._id} style={styles.expenseItem}>
            <Text style={styles.expenseText}>
              {item.name} - ₹{item.amount}
            </Text>
            <Text style={styles.expenseSubText}>
              {item.category} | {item.date}
            </Text>
            <View style={styles.expenseActionRow}>
              <TouchableOpacity
                style={styles.editInlineButton}
                onPress={() => startEditExpense(item)}
              >
                <Text style={styles.editInlineButtonText}>Edit</Text>
              </TouchableOpacity>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    padding: 20,
  },
  authCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
  },
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
  authTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  authSwitchWrap: {
    marginTop: 16,
    gap: 8,
  },
  mutedText: {
    color: "#666",
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
  dangerButton: {
    marginTop: 8,
    backgroundColor: "#ffe8e8",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: 10,
  },
  dangerButtonText: {
    color: "#cc0000",
    fontWeight: "700",
  },
  userText: {
    textAlign: "center",
    marginBottom: 10,
    color: "#555",
  },
  filterCard: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  budgetCard: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  warningCard: {
    marginBottom: 12,
    backgroundColor: "#fff8e1",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f3d37a",
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#8a5a00",
    marginBottom: 6,
  },
  warningText: {
    color: "#8a5a00",
    marginBottom: 4,
    fontWeight: "600",
  },
  budgetRow: {
    marginTop: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  budgetRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budgetStatusText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },
  progressTrack: {
    marginTop: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#edf1f4",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressFillSafe: {
    backgroundColor: "#29a36a",
  },
  progressFillWarn: {
    backgroundColor: "#f0a500",
  },
  progressFillDanger: {
    backgroundColor: "#d7263d",
  },
  deleteBudgetButton: {
    marginTop: 10,
    backgroundColor: "#ffe8e8",
    borderRadius: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteBudgetButtonText: {
    color: "#cc0000",
    fontWeight: "700",
  },
  recurringListWrap: {
    marginTop: 10,
  },
  recurringRow: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 10,
    marginTop: 10,
  },
  chart: {
    marginVertical: 20,
    borderRadius: 10,
  },
  formCard: {
    marginBottom: 20,
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
    marginBottom: 10,
    gap: 10,
  },
  emptyCard: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  expenseItem: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
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

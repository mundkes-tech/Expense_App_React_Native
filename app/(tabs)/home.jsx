import {
    API_BASE_URL,
    fetchWithTimeout,
    getCurrentMonthKey,
    getMonthKeyFromDateText,
    monthLabelFromKey,
    parseExpenseDate,
} from "@/lib/finance";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { PieChart } from "react-native-chart-kit";
import { useAuth } from "../context/auth-context";

const screenWidth = Dimensions.get("window").width;

export default function HomeScreen() {
  const { token } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

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
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        await fetchExpenses(token);
      } catch (_error) {
        Alert.alert("Error", "Could not load dashboard");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [token]);

  const monthKeys = Array.from(
    new Set(expenses.map((item) => getMonthKeyFromDateText(item.date))),
  )
    .filter((item) => item !== "Unknown")
    .sort((first, second) => (first < second ? 1 : -1));

  const monthOptions = Array.from(
    new Set([getCurrentMonthKey(), ...monthKeys]),
  ).sort((first, second) => (first < second ? 1 : -1));

  const monthFilteredExpenses =
    selectedMonth === "ALL"
      ? expenses
      : expenses.filter(
          (item) => getMonthKeyFromDateText(item.date) === selectedMonth,
        );

  const categoryTotals = monthFilteredExpenses.reduce((acc, item) => {
    if (acc[item.category]) {
      acc[item.category] += item.amount;
    } else {
      acc[item.category] = item.amount;
    }
    return acc;
  }, {});

  const colors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];
  const chartData = Object.keys(categoryTotals).map((key, index) => ({
    name: key,
    amount: categoryTotals[key],
    color: colors[index % colors.length],
    legendFontColor: "#333",
    legendFontSize: 14,
  }));

  const monthlyTotalSpent = monthFilteredExpenses.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const now = new Date();
  const sevenDayStart = new Date(now);
  sevenDayStart.setDate(now.getDate() - 6);

  const last7DaysTotal = monthFilteredExpenses.reduce((sum, item) => {
    const parsed = parseExpenseDate(item.date);
    if (parsed && parsed >= sevenDayStart && parsed <= now) {
      return sum + item.amount;
    }
    return sum;
  }, 0);

  let topCategory = "-";
  let topCategoryAmount = 0;
  Object.entries(categoryTotals).forEach(([key, value]) => {
    if (value > topCategoryAmount) {
      topCategory = key;
      topCategoryAmount = value;
    }
  });

  const previousSevenDayStart = new Date(sevenDayStart);
  previousSevenDayStart.setDate(sevenDayStart.getDate() - 7);
  const previousSevenDayEnd = new Date(sevenDayStart);
  previousSevenDayEnd.setDate(sevenDayStart.getDate() - 1);

  const totalInRange = (items, startDate, endDate) =>
    items.reduce((sum, item) => {
      const parsed = parseExpenseDate(item.date);
      if (parsed && parsed >= startDate && parsed <= endDate) {
        return sum + item.amount;
      }
      return sum;
    }, 0);

  const currentWeekTotal = totalInRange(expenses, sevenDayStart, now);
  const previousWeekTotal = totalInRange(
    expenses,
    previousSevenDayStart,
    previousSevenDayEnd,
  );
  const weeklyDailyAverage = Math.round((currentWeekTotal / 7) * 100) / 100;

  const weeklyGrowthPercent =
    previousWeekTotal > 0
      ? Math.round(
          ((currentWeekTotal - previousWeekTotal) / previousWeekTotal) *
            100 *
            10,
        ) / 10
      : null;

  const weeklyCategoryTotals = expenses.reduce((acc, item) => {
    const parsed = parseExpenseDate(item.date);
    if (!parsed || parsed < sevenDayStart || parsed > now) {
      return acc;
    }

    if (acc[item.category]) {
      acc[item.category] += item.amount;
    } else {
      acc[item.category] = item.amount;
    }
    return acc;
  }, {});

  let topWeeklyCategory = "-";
  let topWeeklyCategoryAmount = 0;
  Object.entries(weeklyCategoryTotals).forEach(([key, value]) => {
    if (value > topWeeklyCategoryAmount) {
      topWeeklyCategory = key;
      topWeeklyCategoryAmount = value;
    }
  });

  const smartAlerts = [];
  if (weeklyGrowthPercent !== null && weeklyGrowthPercent >= 25) {
    smartAlerts.push(
      `You spent ${weeklyGrowthPercent}% more this week compared with last week.`,
    );
  }

  if (
    currentWeekTotal > 0 &&
    topWeeklyCategoryAmount / currentWeekTotal >= 0.5
  ) {
    smartAlerts.push(
      `${topWeeklyCategory} is ${Math.round((topWeeklyCategoryAmount / currentWeekTotal) * 100)}% of this week's spend.`,
    );
  }

  if (
    selectedMonth !== "ALL" &&
    monthlyTotalSpent > 0 &&
    last7DaysTotal / monthlyTotalSpent >= 0.7
  ) {
    smartAlerts.push(
      "Most of this month’s spending happened in the last 7 days.",
    );
  }

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Home Dashboard</Text>
        <Text style={styles.userText}>Your spending overview at a glance</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Month Filter</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedMonth}
            onValueChange={setSelectedMonth}
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

      <View style={styles.card}>
        <Text style={styles.label}>Dashboard Summary</Text>
        <View style={styles.dashboardGrid}>
          <View style={styles.dashboardItem}>
            <Text style={styles.dashboardLabel}>Monthly Spent</Text>
            <Text style={styles.dashboardValue}>₹{monthlyTotalSpent}</Text>
          </View>
          <View style={styles.dashboardItem}>
            <Text style={styles.dashboardLabel}>Top Category</Text>
            <Text style={styles.dashboardValue}>{topCategory}</Text>
          </View>
          <View style={styles.dashboardItem}>
            <Text style={styles.dashboardLabel}>Last 7 Days</Text>
            <Text style={styles.dashboardValue}>₹{last7DaysTotal}</Text>
          </View>
          <View style={styles.dashboardItem}>
            <Text style={styles.dashboardLabel}>Items</Text>
            <Text style={styles.dashboardValue}>
              {monthFilteredExpenses.length}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Weekly Digest</Text>
        <View style={styles.digestRow}>
          <Text style={styles.digestLabel}>This Week</Text>
          <Text style={styles.digestValue}>₹{currentWeekTotal}</Text>
        </View>
        <View style={styles.digestRow}>
          <Text style={styles.digestLabel}>Last Week</Text>
          <Text style={styles.digestValue}>₹{previousWeekTotal}</Text>
        </View>
        <View style={styles.digestRow}>
          <Text style={styles.digestLabel}>Avg / Day</Text>
          <Text style={styles.digestValue}>₹{weeklyDailyAverage}</Text>
        </View>
        <View style={styles.digestRow}>
          <Text style={styles.digestLabel}>Trend</Text>
          <Text style={styles.digestValue}>
            {weeklyGrowthPercent === null
              ? "Not enough data"
              : `${weeklyGrowthPercent >= 0 ? "+" : ""}${weeklyGrowthPercent}%`}
          </Text>
        </View>
      </View>

      {smartAlerts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.label}>Smart Alerts</Text>
          {smartAlerts.map((message) => (
            <Text key={message} style={styles.alertText}>
              • {message}
            </Text>
          ))}
        </View>
      )}

      {monthFilteredExpenses.length > 0 && (
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
  card: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: "#fff",
  },
  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  dashboardItem: {
    width: "48%",
    backgroundColor: "#f7f9fc",
    borderRadius: 10,
    padding: 10,
  },
  dashboardLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  dashboardValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1d3557",
  },
  digestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  digestLabel: {
    color: "#666",
  },
  digestValue: {
    fontWeight: "700",
    color: "#1d3557",
  },
  alertText: {
    color: "#5c3f00",
    marginBottom: 6,
  },
});

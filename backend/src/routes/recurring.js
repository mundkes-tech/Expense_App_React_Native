const express = require("express");
const Expense = require("../models/Expense");
const RecurringExpense = require("../models/RecurringExpense");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

function getTargetMonth(month) {
  if (!month) {
    const now = new Date();
    const year = now.getFullYear();
    const monthText = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${monthText}`;
  }

  return month;
}

function buildDateForMonth(targetMonth, dayOfMonth) {
  const [year, month] = targetMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const finalDay = Math.min(dayOfMonth, daysInMonth);
  const dayText = String(finalDay).padStart(2, "0");
  const monthText = String(month).padStart(2, "0");

  return `${dayText}/${monthText}/${year}`;
}

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const recurringExpenses = await RecurringExpense.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(recurringExpenses);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, amount, category, dayOfMonth } = req.body;

    if (!name || amount === undefined || !category || dayOfMonth === undefined) {
      return res
        .status(400)
        .json({ message: "name, amount, category and dayOfMonth are required" });
    }

    const recurringExpense = await RecurringExpense.create({
      userId,
      name,
      amount,
      category,
      dayOfMonth,
    });

    return res.status(201).json(recurringExpense);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;

    const deleted = await RecurringExpense.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Recurring expense not found" });
    }

    return res.status(200).json({ message: "Recurring expense deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/apply", async (req, res) => {
  try {
    const userId = req.user.userId;
    const targetMonth = getTargetMonth(req.body.month);

    const recurringExpenses = await RecurringExpense.find({ userId, isActive: true });

    let createdCount = 0;

    for (const recurringItem of recurringExpenses) {
      const date = buildDateForMonth(targetMonth, recurringItem.dayOfMonth);

      const existingExpense = await Expense.findOne({
        userId,
        recurringId: recurringItem._id,
        date,
      });

      if (existingExpense) {
        continue;
      }

      await Expense.create({
        userId,
        recurringId: recurringItem._id,
        name: recurringItem.name,
        amount: recurringItem.amount,
        category: recurringItem.category,
        date,
      });

      createdCount += 1;
    }

    return res.status(200).json({
      month: targetMonth,
      createdCount,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

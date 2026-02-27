const express = require("express");
const Expense = require("../models/Expense");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;

    const expenses = await Expense.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(expenses);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, amount, date, category } = req.body;
    if (!name || amount === undefined || !date || !category) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const expense = await Expense.create({
      userId,
      name,
      amount,
      date,
      category,
    });

    return res.status(201).json(expense);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, amount, date, category } = req.body;

    if (!name || amount === undefined || !date || !category) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const updated = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId },
      {
        name,
        amount,
        date,
        category,
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;

    const deleted = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Expense not found" });
    }

    return res.status(200).json({ message: "Expense deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

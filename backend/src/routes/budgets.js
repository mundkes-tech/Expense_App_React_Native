const express = require("express");
const Budget = require("../models/Budget");
const requireAuth = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ message: "month is required" });
    }

    const budgets = await Budget.find({ userId, month }).sort({ category: 1 });
    return res.status(200).json(budgets);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const { month, category, limitAmount } = req.body;

    if (!month || !category || limitAmount === undefined) {
      return res.status(400).json({ message: "month, category and limitAmount are required" });
    }

    const budget = await Budget.findOneAndUpdate(
      { userId, month, category },
      { month, category, limitAmount },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(200).json(budget);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.userId;

    const deleted = await Budget.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Budget not found" });
    }

    return res.status(200).json({ message: "Budget deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;

import express from "express";
import pool from "../config/db.js";
import {
  createShiftTemplate,
  deleteShiftTemplate,
  getManagerAnalytics,
  getShiftHistory,
  getShiftTemplates,
} from "../controllers/additionalFeaturesController.js";
import { login, register } from "../controllers/authController.js";
import {
  assignShift,
  deleteAssignment,
  getWeeklyRoster,
  updateAssignment,
} from "../controllers/rosterController.js";
import {
  createSwapRequest,
  getMyShifts,
  getPendingSwaps,
  processSwapRequest,
} from "../controllers/swapController.js";
import { authenticateToken, requireAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/users", authenticateToken, async (req, res) => {
  const { department = null } = req.query;

  try {
    const result = await pool.query(
      `SELECT id, name, email, department FROM users
      WHERE role = 'Employee'
      AND (department = $1 OR $1 IS NULL)
      ORDER BY name ASC`,
      [department]
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch users" });
  }
});
router.post("/shifts", authenticateToken, requireAdmin, createShiftTemplate);
router.get("/shifts", authenticateToken, getShiftTemplates);
router.delete("/shifts/:id", authenticateToken, requireAdmin, deleteShiftTemplate);
router.get("/assignments/analytics", authenticateToken, requireAdmin, getManagerAnalytics);
router.get("/reports/shift-history", authenticateToken, requireAdmin, getShiftHistory);
router.post("/assignments", authenticateToken, requireAdmin, assignShift);
router.get("/roster", authenticateToken, requireAdmin, getWeeklyRoster);
router.put("/assignments/:id", authenticateToken, requireAdmin, updateAssignment);
router.delete("/assignments/:id", authenticateToken, requireAdmin, deleteAssignment);
router.post("/swaps", authenticateToken, createSwapRequest);
router.get("/my-shifts", authenticateToken, getMyShifts);
router.get("/swaps/pending", authenticateToken, requireAdmin, getPendingSwaps);
router.patch("/swaps/:id", authenticateToken, requireAdmin, processSwapRequest);

export default router;

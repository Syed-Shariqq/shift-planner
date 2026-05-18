import pool from "../config/db.js";

class RequestError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const rollbackTransaction = async (client) => {
  if (client) {
    try {
      await client.query("ROLLBACK");
    } catch {
      return;
    }
  }
};

const getDateString = (value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

export const createSwapRequest = async (req, res) => {
  let client;
  let transactionCompleted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const { from_assignment_id, to_user_id, reason } = req.body;

    const assignmentResult = await client.query(
      `SELECT *
      FROM assignments
      WHERE id = $1`,
      [from_assignment_id]
    );

    if (assignmentResult.rows.length === 0) {
      throw new RequestError(404, "Assignment not found");
    }

    const assignment = assignmentResult.rows[0];

    if (Number(assignment.user_id) !== Number(req.user.id)) {
      throw new RequestError(403, "You can only request swaps for your own shifts");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const shiftDate = new Date(assignment.date);

    if (shiftDate < today) {
      throw new RequestError(400, "Cannot request a swap for a past shift");
    }

    const usersResult = await client.query(
      `SELECT id, department FROM users
      WHERE id = ANY($1::int[])`,
      [[Number(req.user.id), Number(to_user_id)]]
    );

    if (usersResult.rows.length !== 2) {
      throw new RequestError(400, "Swap target must be in the same department");
    }

    const requester = usersResult.rows.find((user) => Number(user.id) === Number(req.user.id));
    const target = usersResult.rows.find((user) => Number(user.id) === Number(to_user_id));

    if (!requester || !target || requester.department !== target.department) {
      throw new RequestError(400, "Swap target must be in the same department");
    }

    const swapRequestResult = await client.query(
      `INSERT INTO swap_requests
      (from_assignment_id, to_user_id, reason, status)
      VALUES ($1, $2, $3, 'Pending')
      RETURNING *`,
      [from_assignment_id, to_user_id, reason]
    );

    await client.query("COMMIT");
    transactionCompleted = true;

    return res.status(201).json(swapRequestResult.rows[0]);
  } catch (error) {
    if (!transactionCompleted) {
      await rollbackTransaction(client);
    }

    return res.status(error.statusCode || 400).json({ error: error.message || "Failed to create swap request" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const processSwapRequest = async (req, res) => {
  let client;
  let transactionCompleted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const { status } = req.body;
    const managerId = req.user.id;

    if (status !== "Approved" && status !== "Rejected") {
      throw new RequestError(400, "Status must be Approved or Rejected");
    }

    const swapResult = await client.query(
      `SELECT *
      FROM swap_requests
      WHERE id = $1
      FOR UPDATE`,
      [req.params.id]
    );

    if (swapResult.rows.length === 0) {
      throw new RequestError(404, "Swap request not found");
    }

    const swap = swapResult.rows[0];

    if (swap.status !== "Pending") {
      throw new RequestError(400, "Swap already processed");
    }

    if (status === "Rejected") {
      const rejectedSwapResult = await client.query(
        `UPDATE swap_requests SET
        status = 'Rejected', decided_by = $1, decided_at = NOW()
        WHERE id = $2
        RETURNING *`,
        [managerId, req.params.id]
      );

      await client.query("COMMIT");
      transactionCompleted = true;

      return res.status(200).json(rejectedSwapResult.rows[0]);
    }

    const assignmentResult = await client.query(
      `SELECT *
      FROM assignments
      WHERE id = $1
      FOR UPDATE`,
      [swap.from_assignment_id]
    );

    if (assignmentResult.rows.length === 0) {
      throw new RequestError(404, "Assignment not found");
    }

    const assignment = assignmentResult.rows[0];
    const originalUserId = assignment.user_id;

    const updatedAssignmentResult = await client.query(
      `UPDATE assignments SET
      user_id = $2, status = 'Swapped'
      WHERE id = $1
      RETURNING *`,
      [swap.from_assignment_id, swap.to_user_id]
    );

    const approvedSwapResult = await client.query(
      `UPDATE swap_requests SET
      status = 'Approved', decided_by = $1, decided_at = NOW()
      WHERE id = $2
      RETURNING *`,
      [managerId, req.params.id]
    );

    await client.query(
      `INSERT INTO shift_history
      (user_id, shift_id, date, action, notes, changed_by)
      VALUES ($1, $2, $3, 'SWAPPED', 'Shift transferred out via swap', $4)`,
      [originalUserId, assignment.shift_id, assignment.date, managerId]
    );

    await client.query(
      `INSERT INTO shift_history
      (user_id, shift_id, date, action, notes, changed_by)
      VALUES ($1, $2, $3, 'SWAPPED', 'Shift received via swap approval', $4)`,
      [swap.to_user_id, assignment.shift_id, assignment.date, managerId]
    );

    await client.query("COMMIT");
    transactionCompleted = true;

    return res.status(200).json({
      swap: approvedSwapResult.rows[0],
      assignment: updatedAssignmentResult.rows[0],
    });
  } catch (error) {
    if (!transactionCompleted) {
      await rollbackTransaction(client);
    }

    return res.status(error.statusCode || 400).json({ error: error.message || "Failed to process swap request" });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const getMyShifts = async (req, res) => {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "from and to query parameters are required" });
  }

  try {
    const result = await pool.query(
      `SELECT a.*, s.name as shift_name, s.start_time,
      s.end_time, s.break_minutes, s.color_code
      FROM assignments a
      JOIN shifts s ON a.shift_id = s.id
      WHERE a.user_id = $1
      AND a.date BETWEEN $2 AND $3
      ORDER BY a.date ASC`,
      [req.user.id, from, to]
    );

    return res.status(200).json(
      result.rows.map((row) => ({
        ...row,
        date: getDateString(row.date),
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch shifts" });
  }
};

export const getPendingSwaps = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        sr.id,
        from_user.name AS from_employee_name,
        to_user.name AS to_employee_name,
        a.date AS shift_date,
        s.name AS shift_name,
        s.start_time,
        s.end_time,
        sr.reason,
        a.created_at
      FROM swap_requests sr
      JOIN assignments a ON sr.from_assignment_id = a.id
      JOIN shifts s ON a.shift_id = s.id
      JOIN users from_user ON a.user_id = from_user.id
      JOIN users to_user ON sr.to_user_id = to_user.id
      WHERE sr.status = 'Pending'
      ORDER BY a.created_at DESC`
    );

    return res.status(200).json(
      result.rows.map((row) => ({
        id: row.id,
        from_employee_name: row.from_employee_name,
        to_employee_name: row.to_employee_name,
        shift_date: getDateString(row.shift_date),
        shift_name: row.shift_name,
        shift_time: {
          start_time: row.start_time,
          end_time: row.end_time,
        },
        reason: row.reason,
        created_at: row.created_at,
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch pending swaps" });
  }
};

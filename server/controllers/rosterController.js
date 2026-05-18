import pool from "../config/db.js";

const millisecondsInOneDay = 86400000;
const millisecondsInOneHour = 3600000;

const weeklyHoursQuery = `SELECT COALESCE(SUM(
  (EXTRACT(EPOCH FROM (
    CASE WHEN s.end_time < s.start_time
      THEN (s.end_time + INTERVAL '1 day')
      ELSE s.end_time END
  ) - s.start_time) / 3600)
  - (s.break_minutes / 60.0)
), 0) AS total_hours
FROM assignments a
JOIN shifts s ON a.shift_id = s.id
WHERE a.user_id = $1
AND EXTRACT(WEEK FROM a.date) = EXTRACT(WEEK FROM $2::date)
AND EXTRACT(YEAR FROM a.date) = EXTRACT(YEAR FROM $2::date)`;

const rosterQuery = `SELECT a.*, u.name, u.department,
  u.max_hours_per_week, s.name as shift_name,
  s.start_time, s.end_time, s.break_minutes,
  s.color_code
  FROM assignments a
  JOIN users u ON a.user_id = u.id
  JOIN shifts s ON a.shift_id = s.id
  WHERE EXTRACT(WEEK FROM a.date) = $1
  AND EXTRACT(YEAR FROM a.date) = $2
  ORDER BY u.name, a.date`;

const getDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getDateString = (value) => {
  if (value instanceof Date) {
    return getDateKey(value);
  }

  return String(value).slice(0, 10);
};

const getTodayDateString = () => getDateKey(new Date());

const buildDateTime = (dateValue, timeValue) => {
  const dateString = getDateString(dateValue);
  const [hours, minutes, secondsWithFraction = "0"] = String(timeValue).split(":");
  const seconds = secondsWithFraction.split(".")[0];
  const date = new Date(`${dateString}T00:00:00`);

  date.setHours(Number(hours), Number(minutes), Number(seconds), 0);

  return date;
};

const buildShiftWindow = (dateValue, shift) => {
  const startDate = buildDateTime(dateValue, shift.start_time);
  const endDate = buildDateTime(dateValue, shift.end_time);

  if (endDate < startDate) {
    endDate.setTime(endDate.getTime() + millisecondsInOneDay);
  }

  return { startDate, endDate };
};

const calculateDecimalHours = (startDate, endDate, breakMinutes) => {
  return (endDate.getTime() - startDate.getTime()) / millisecondsInOneHour - Number(breakMinutes) / 60;
};

const formatHours = (hours) => {
  return Number(hours).toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
};

const getErrorMessage = (error) => {
  if (error.code === "23505") {
    return "Employee already has a shift assigned on this date";
  }

  if (error.code === "23503") {
    return "Invalid employee or shift selected";
  }

  if (error.code) {
    return "Something went wrong. Please try again.";
  }

  return error.message || "Something went wrong. Please try again.";
};

const serializeAssignment = (assignment) => ({
  ...assignment,
  date: getDateString(assignment.date),
});

const rollbackTransaction = async (client) => {
  if (client) {
    try {
      await client.query("ROLLBACK");
    } catch {
      return;
    }
  }
};

const fetchShift = async (client, shiftId) => {
  const result = await client.query(
    `SELECT id, name, start_time, end_time, break_minutes, color_code
    FROM shifts
    WHERE id = $1`,
    [shiftId]
  );

  return result.rows[0] || null;
};

const fetchUser = async (client, userId) => {
  const result = await client.query(
    `SELECT id, name, department, max_hours_per_week
    FROM users
    WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
};

const getWeeklyHours = async (client, userId, dateValue, excludedAssignmentId = null) => {
  if (excludedAssignmentId === null) {
    const result = await client.query(weeklyHoursQuery, [userId, dateValue]);
    return Number(result.rows[0].total_hours);
  }

  const result = await client.query(
    `${weeklyHoursQuery}
AND a.id <> $3`,
    [userId, dateValue, excludedAssignmentId]
  );

  return Number(result.rows[0].total_hours);
};

const assertWeeklyHoursCap = async (client, userId, dateValue, decimalHours, excludedAssignmentId = null) => {
  const user = await fetchUser(client, userId);

  if (!user) {
    throw new Error("User not found");
  }

  const totalHours = await getWeeklyHours(client, userId, dateValue, excludedAssignmentId);

  if (totalHours + decimalHours > Number(user.max_hours_per_week)) {
    throw new Error(`Weekly hours cap exceeded. Employee has ${formatHours(totalHours)} hours scheduled this week.`);
  }
};

const assertNoOverlap = async (client, userId, dateValue, shift, excludedAssignmentId = null) => {
  const assignmentQueryValues = [userId, dateValue];
  let exclusionSql = "";

  if (excludedAssignmentId !== null) {
    assignmentQueryValues.push(excludedAssignmentId);
    exclusionSql = "AND a.id <> $3";
  }

  const existingAssignmentsResult = await client.query(
    `SELECT a.id, a.date, a.shift_id, s.start_time, s.end_time, s.break_minutes
    FROM assignments a
    JOIN shifts s ON a.shift_id = s.id
    WHERE a.user_id = $1
    AND a.date IN ($2::date, $2::date - INTERVAL '1 day')
    ${exclusionSql}
    ORDER BY a.date`,
    assignmentQueryValues
  );

  const newWindow = buildShiftWindow(dateValue, shift);

  for (const existingAssignment of existingAssignmentsResult.rows) {
    const existingWindow = buildShiftWindow(existingAssignment.date, existingAssignment);
    const overlaps =
      Math.max(newWindow.startDate.getTime(), existingWindow.startDate.getTime()) <
      Math.min(newWindow.endDate.getTime(), existingWindow.endDate.getTime());

    if (overlaps) {
      throw new Error(`Shift overlap detected with existing assignment on ${getDateString(existingAssignment.date)}`);
    }
  }
};

const getIsoWeekDates = (year, weekNumber) => {
  const simpleDate = new Date(year, 0, 1 + (weekNumber - 1) * 7);
  const simpleDayOfWeek = simpleDate.getDay();
  const isoWeekStart = new Date(simpleDate);

  if (simpleDayOfWeek <= 4) {
    isoWeekStart.setDate(simpleDate.getDate() - simpleDayOfWeek + 1);
  } else {
    isoWeekStart.setDate(simpleDate.getDate() + 8 - simpleDayOfWeek);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(isoWeekStart);
    date.setDate(isoWeekStart.getDate() + index);
    return getDateKey(date);
  });
};

export const assignShift = async (req, res) => {
  let client;
  let transactionCompleted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const { user_id, shift_id, date } = req.body;

    if (!user_id || !shift_id || !date) {
      throw new Error("user_id, shift_id, and date are required");
    }

    const shift = await fetchShift(client, shift_id);

    if (!shift) {
      throw new Error("Shift not found");
    }

    const { startDate, endDate } = buildShiftWindow(date, shift);
    const decimalHours = calculateDecimalHours(startDate, endDate, shift.break_minutes);

    await assertWeeklyHoursCap(client, user_id, date, decimalHours);
    await assertNoOverlap(client, user_id, date, shift);

    const assignmentResult = await client.query(
      `INSERT INTO assignments
      (user_id, shift_id, date, status, created_by)
      VALUES ($1, $2, $3, 'Scheduled', $4)
      RETURNING *`,
      [user_id, shift_id, date, req.user.id]
    );

    const assignment = assignmentResult.rows[0];

    await client.query(
      `INSERT INTO shift_history
      (user_id, shift_id, date, actual_start, actual_end,
      action, notes, changed_by)
      VALUES ($1, $2, $3, $4, $5, 'CREATED',
      'Shift assigned', $6)`,
      [user_id, shift_id, date, shift.start_time, shift.end_time, req.user.id]
    );

    await client.query("COMMIT");
    transactionCompleted = true;

    return res.status(201).json(serializeAssignment(assignment));
  } catch (error) {
    if (!transactionCompleted) {
      await rollbackTransaction(client);
    }

    return res.status(400).json({ error: getErrorMessage(error) });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const getWeeklyRoster = async (req, res) => {
  const { week } = req.query;

  if (!week || !/^\d{4}-\d{2}$/.test(week)) {
    return res.status(400).json({ error: "week query parameter must be in YYYY-WW format" });
  }

  const [yearString, weekString] = week.split("-");
  const year = Number(yearString);
  const weekNumber = Number(weekString);

  if (weekNumber < 1 || weekNumber > 53) {
    return res.status(400).json({ error: "week number must be between 01 and 53" });
  }

  try {
    const result = await pool.query(rosterQuery, [weekNumber, year]);
    const days = getIsoWeekDates(year, weekNumber);
    const employeesById = new Map();

    for (const row of result.rows) {
      if (!employeesById.has(row.user_id)) {
        employeesById.set(row.user_id, {
          id: row.user_id,
          name: row.name,
          department: row.department,
          max_hours_per_week: row.max_hours_per_week,
          assignments: days.map((date) => ({ date, assignment: null })),
        });
      }

      const employee = employeesById.get(row.user_id);
      const assignmentDate = getDateString(row.date);
      const dayAssignment = employee.assignments.find((item) => item.date === assignmentDate);

      if (dayAssignment) {
        dayAssignment.assignment = {
          id: row.id,
          user_id: row.user_id,
          shift_id: row.shift_id,
          date: assignmentDate,
          status: row.status,
          created_by: row.created_by,
          created_at: row.created_at,
          shift_name: row.shift_name,
          start_time: row.start_time,
          end_time: row.end_time,
          break_minutes: row.break_minutes,
          color_code: row.color_code,
        };
      }
    }

    return res.status(200).json({
      week,
      year,
      week_number: weekNumber,
      days,
      employees: Array.from(employeesById.values()),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch weekly roster" });
  }
};

export const updateAssignment = async (req, res) => {
  let client;
  let transactionCompleted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const assignmentId = req.params.id;
    const existingAssignmentResult = await client.query(
      `SELECT *
      FROM assignments
      WHERE id = $1`,
      [assignmentId]
    );

    if (existingAssignmentResult.rows.length === 0) {
      throw new Error("Assignment not found");
    }

    const existingAssignment = existingAssignmentResult.rows[0];

    if (getDateString(existingAssignment.date) < getTodayDateString()) {
      await client.query("ROLLBACK");
      transactionCompleted = true;
      return res.status(403).json({ error: "Cannot modify past assignments" });
    }

    const userId = req.body.user_id || existingAssignment.user_id;
    const shiftId = req.body.shift_id || existingAssignment.shift_id;
    const date = req.body.date || getDateString(existingAssignment.date);
    const status = req.body.status || existingAssignment.status;

    const shift = await fetchShift(client, shiftId);

    if (!shift) {
      throw new Error("Shift not found");
    }

    const { startDate, endDate } = buildShiftWindow(date, shift);
    const decimalHours = calculateDecimalHours(startDate, endDate, shift.break_minutes);

    await assertWeeklyHoursCap(client, userId, date, decimalHours, assignmentId);
    await assertNoOverlap(client, userId, date, shift, assignmentId);

    const updatedAssignmentResult = await client.query(
      `UPDATE assignments
      SET user_id = $1,
        shift_id = $2,
        date = $3,
        status = $4
      WHERE id = $5
      RETURNING *`,
      [userId, shiftId, date, status, assignmentId]
    );

    const updatedAssignment = updatedAssignmentResult.rows[0];

    await client.query(
      `INSERT INTO shift_history
      (user_id, shift_id, date, actual_start, actual_end,
      action, notes, changed_by)
      VALUES ($1, $2, $3, $4, $5, 'UPDATED',
      'Shift updated', $6)`,
      [userId, shiftId, date, shift.start_time, shift.end_time, req.user.id]
    );

    await client.query("COMMIT");
    transactionCompleted = true;

    return res.status(200).json(serializeAssignment(updatedAssignment));
  } catch (error) {
    if (!transactionCompleted) {
      await rollbackTransaction(client);
    }

    return res.status(400).json({ error: getErrorMessage(error) });
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const deleteAssignment = async (req, res) => {
  let client;
  let transactionCompleted = false;

  try {
    client = await pool.connect();
    await client.query("BEGIN");

    const assignmentId = req.params.id;
    const existingAssignmentResult = await client.query(
      `SELECT a.*, s.start_time, s.end_time
      FROM assignments a
      JOIN shifts s ON a.shift_id = s.id
      WHERE a.id = $1`,
      [assignmentId]
    );

    if (existingAssignmentResult.rows.length === 0) {
      throw new Error("Assignment not found");
    }

    const existingAssignment = existingAssignmentResult.rows[0];

    if (getDateString(existingAssignment.date) < getTodayDateString()) {
      await client.query("ROLLBACK");
      transactionCompleted = true;
      return res.status(403).json({ error: "Cannot delete past assignments" });
    }

    await client.query(
      `DELETE FROM assignments
      WHERE id = $1`,
      [assignmentId]
    );

    await client.query(
      `INSERT INTO shift_history
      (user_id, shift_id, date, actual_start, actual_end,
      action, notes, changed_by)
      VALUES ($1, $2, $3, $4, $5, 'DELETED',
      'Shift deleted', $6)`,
      [
        existingAssignment.user_id,
        existingAssignment.shift_id,
        getDateString(existingAssignment.date),
        existingAssignment.start_time,
        existingAssignment.end_time,
        req.user.id,
      ]
    );

    await client.query("COMMIT");
    transactionCompleted = true;

    return res.status(200).json({ message: "Assignment deleted" });
  } catch (error) {
    if (!transactionCompleted) {
      await rollbackTransaction(client);
    }

    return res.status(400).json({ error: getErrorMessage(error) });
  } finally {
    if (client) {
      client.release();
    }
  }
};

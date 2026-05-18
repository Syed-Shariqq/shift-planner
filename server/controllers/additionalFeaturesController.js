import pool from "../config/db.js";

const colorCodeRegex = /^#[0-9A-Fa-f]{6}$/;

const isMissing = (value) => {
  return value === undefined || value === null || String(value).trim() === "";
};

const getIsoWeekAndYear = (date) => {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((utcDate - yearStart) / 86400000 + 1) / 7);

  return {
    year: utcDate.getUTCFullYear(),
    weekNumber,
  };
};

const parseWeekQuery = (week) => {
  if (week === undefined || week === null || week === "") {
    return getIsoWeekAndYear(new Date());
  }

  if (!/^\d{4}-\d{2}$/.test(week)) {
    throw new Error("week query parameter must be in YYYY-WW format");
  }

  const [yearString, weekString] = week.split("-");
  const year = Number(yearString);
  const weekNumber = Number(weekString);

  if (weekNumber < 1 || weekNumber > 53) {
    throw new Error("week number must be between 01 and 53");
  }

  return { year, weekNumber };
};

export const createShiftTemplate = async (req, res) => {
  const { name, start_time, end_time, break_minutes, color_code } = req.body;

  if (
    isMissing(name) ||
    isMissing(start_time) ||
    isMissing(end_time) ||
    isMissing(break_minutes) ||
    isMissing(color_code)
  ) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (!colorCodeRegex.test(color_code)) {
    return res.status(400).json({ error: "Invalid color code format" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO shifts
      (name, start_time, end_time, break_minutes, color_code)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, start_time, end_time, break_minutes, color_code]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to create shift template" });
  }
};

export const getManagerAnalytics = async (req, res) => {
  try {
    const { year, weekNumber } = parseWeekQuery(req.query.week);
    const result = await pool.query(
      `SELECT
  u.id,
  u.name,
  u.department,
  u.max_hours_per_week,
  COALESCE(SUM(
    (EXTRACT(EPOCH FROM (
      CASE WHEN s.end_time < s.start_time
        THEN (s.end_time + INTERVAL '1 day')
        ELSE s.end_time END
    ) - s.start_time) / 3600)
    - (s.break_minutes / 60.0)
  ), 0) AS total_hours_scheduled
FROM users u
LEFT JOIN assignments a ON u.id = a.user_id
  AND EXTRACT(WEEK FROM a.date) = $1
  AND EXTRACT(YEAR FROM a.date) = $2
LEFT JOIN shifts s ON a.shift_id = s.id
WHERE u.role = 'Employee'
GROUP BY u.id, u.name, u.department, u.max_hours_per_week
ORDER BY u.department, u.name;`,
      [weekNumber, year]
    );

    const analytics = result.rows.map((row) => {
      const totalHoursScheduled = Number(row.total_hours_scheduled);
      const maxHoursPerWeek = Number(row.max_hours_per_week);

      return {
        id: row.id,
        name: row.name,
        department: row.department,
        max_hours_per_week: row.max_hours_per_week,
        total_hours_scheduled: totalHoursScheduled,
        approaching_cap: totalHoursScheduled >= maxHoursPerWeek - 2,
      };
    });

    return res.status(200).json(analytics);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to fetch manager analytics" });
  }
};

export const getShiftHistory = async (req, res) => {
  const { userId, from, to, action } = req.query;
  const values = [];
  let parameterIndex = 1;
  let query = `SELECT sh.id, sh.date, sh.action, sh.notes,
  sh.logged_at, sh.actual_start, sh.actual_end,
  u.name AS employee_name, u.department,
  s.name AS shift_name, s.start_time, s.end_time,
  s.color_code, cb.name AS changed_by_name
  FROM shift_history sh
  JOIN users u ON sh.user_id = u.id
  LEFT JOIN shifts s ON sh.shift_id = s.id
  JOIN users cb ON sh.changed_by = cb.id
  WHERE 1=1`;

  if (userId) {
    query += ` AND sh.user_id = $${parameterIndex}`;
    values.push(userId);
    parameterIndex += 1;
  }

  if (from) {
    query += ` AND sh.date >= $${parameterIndex}`;
    values.push(from);
    parameterIndex += 1;
  }

  if (to) {
    query += ` AND sh.date <= $${parameterIndex}`;
    values.push(to);
    parameterIndex += 1;
  }

  if (action) {
    query += ` AND sh.action = $${parameterIndex}`;
    values.push(action);
    parameterIndex += 1;
  }

  query += " ORDER BY sh.logged_at DESC";

  try {
    const result = await pool.query(query, values);

    return res.status(200).json({
      history: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch shift history" });
  }
};

export const getShiftTemplates = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM shifts ORDER BY name ASC`
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to fetch shift templates" });
  }
};

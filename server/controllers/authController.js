import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const saltRounds = 10;

export const register = async (req, res) => {
  const { name, email, password, role, department, max_hours_per_week } = req.body;

  if (!name || !email || !password || !role || !department || !max_hours_per_week) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      `INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        department,
        max_hours_per_week
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, email, role, department, max_hours_per_week, created_at`,
      [name, email, passwordHash, role, department, max_hours_per_week]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Email already registered" });
    }

    return res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, password_hash, role, department
      FROM users
      WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        department: user.department,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch {
    return res.status(500).json({ message: "Login failed" });
  }
};

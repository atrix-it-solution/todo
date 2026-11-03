import { Router } from "express";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

// All routes here are admin-only (see server.js)
const router = Router();

// GET /api/users -> everyone, admins first
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.role, u.created_at,
              COUNT(t.id) FILTER (WHERE NOT t.completed)::int AS open_tasks
         FROM users u
         LEFT JOIN todos t ON t.assigned_to = u.id
        GROUP BY u.id
        ORDER BY (u.role = 'admin') DESC, u.username`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/users { username, password, role } -> new user
router.post("/", async (req, res, next) => {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const role = req.body?.role === "admin" ? "admin" : "employee";

  if (!/^[a-z0-9_.]{3,30}$/.test(username)) {
    return res.status(400).json({ error: "Username must be 3–30 characters: letters, numbers, _ or ." });
  }
  if (password.length < 6 || password.length > 72) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, role, created_at`,
      [username, hash, role]
    );
    if (!rows.length) return res.status(409).json({ error: "That username is already taken" });
    res.status(201).json({ ...rows[0], open_tasks: 0 });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id -> remove a user (their tasks become unassigned)
router.delete("/:id", async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Invalid id" });
  if (id === req.user.id) return res.status(400).json({ error: "You can't delete your own account" });
  try {
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ error: "User not found" });
    res.json({ deleted: id });
  } catch (err) {
    next(err);
  }
});

export default router;

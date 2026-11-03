import { Router } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const router = Router();
const SECRET = () => process.env.JWT_SECRET || "dev-secret";

export const publicUser = (u) => ({ id: u.id, username: u.username, role: u.role });

// POST /api/auth/login  { username, password } -> { token, user }
router.post("/login", async (req, res, next) => {
  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!username || !password) {
    return res.status(400).json({ error: "Please enter your username and password" });
  }
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid username or password" });
    }
    // 30 days, so people using the phone app don't have to log in every day
    const token = jwt.sign({ id: user.id }, SECRET(), { expiresIn: "30d" });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// Checks the token AND that the account still exists (deleted users are locked out at once)
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Please log in" });

  let payload;
  try {
    payload = jwt.verify(token, SECRET());
  } catch {
    return res.status(401).json({ error: "Your session expired. Please log in again." });
  }
  if (!payload.id) return res.status(401).json({ error: "Please log in again" });

  try {
    const { rows } = await pool.query("SELECT id, username, role FROM users WHERE id = $1", [payload.id]);
    if (!rows[0]) return res.status(401).json({ error: "This account no longer exists" });
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role === "admin") return next();
  res.status(403).json({ error: "Only an admin can do this" });
}

// GET /api/auth/me -> current user
router.get("/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

export default router;

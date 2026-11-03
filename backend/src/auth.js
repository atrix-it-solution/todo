import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const JWT_SECRET = () => process.env.JWT_SECRET || "dev-secret";

// POST /api/auth/login  { username, password } -> { token, username }
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  const validUser = process.env.LOGIN_USERNAME || "aslogin";
  const validPass = process.env.LOGIN_PASSWORD || "Epic@123";

  if (username !== validUser || password !== validPass) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ username }, JWT_SECRET(), { expiresIn: "8h" });
  res.json({ token, username });
});

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET());
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export default router;

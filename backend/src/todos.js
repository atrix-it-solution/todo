import { Router } from "express";
import { pool } from "./db.js";
import { notifyAll } from "./push.js";

const router = Router();

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// GET /api/todos -> list all todos
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM todos ORDER BY created_at DESC, id DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/todos/:id -> single todo
router.get("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const { rows } = await pool.query("SELECT * FROM todos WHERE id = $1", [id]);
    if (!rows.length) return res.status(404).json({ error: "Todo not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/todos  { title } -> created todo
router.post("/", async (req, res, next) => {
  const title = (req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "Title is required" });
  try {
    const { rows } = await pool.query(
      "INSERT INTO todos (title) VALUES ($1) RETURNING *",
      [title]
    );
    res.status(201).json(rows[0]);

    // Notify other devices in the background (doesn't slow down the response)
    notifyAll(
      { title: "New task added", body: rows[0].title, url: "/" },
      { exceptEndpoint: req.get("X-Push-Endpoint") }
    ).catch((err) => console.error("Notify failed:", err.message));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/todos  { ids: [1,2,3] } -> multiple delete
// Defined before "/:id" routes for clarity (different path, so no conflict).
router.delete("/", async (req, res, next) => {
  const ids = Array.isArray(req.body?.ids)
    ? req.body.ids.map(parseId).filter(Boolean)
    : [];
  if (!ids.length) {
    return res.status(400).json({ error: "Provide a non-empty array of ids" });
  }
  try {
    const { rows } = await pool.query(
      "DELETE FROM todos WHERE id = ANY($1::int[]) RETURNING id",
      [ids]
    );
    res.json({ deleted: rows.map((r) => r.id), count: rows.length });
  } catch (err) {
    next(err);
  }
});

// PUT /api/todos/:id  { title?, completed? } -> updated todo
router.put("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { title, completed } = req.body || {};
  if (title === undefined && completed === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }
  if (title !== undefined && !String(title).trim()) {
    return res.status(400).json({ error: "Title cannot be empty" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE todos
          SET title      = COALESCE($1, title),
              completed  = COALESCE($2, completed),
              updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [
        title !== undefined ? String(title).trim() : null,
        completed !== undefined ? Boolean(completed) : null,
        id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: "Todo not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/todos/:id -> single delete
router.delete("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const { rowCount } = await pool.query("DELETE FROM todos WHERE id = $1", [id]);
    if (!rowCount) return res.status(404).json({ error: "Todo not found" });
    res.json({ deleted: id });
  } catch (err) {
    next(err);
  }
});

export default router;

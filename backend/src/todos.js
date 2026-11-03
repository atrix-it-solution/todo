import { Router } from "express";
import { pool } from "./db.js";
import { notifyUsers } from "./push.js";

const router = Router();

/*
 * Rules
 *  - admin:    sees every task, can create/edit/delete/assign anything
 *  - employee: sees tasks assigned to them + tasks they created;
 *              full control over their own tasks, but on tasks given to them
 *              by someone else they can only mark done / not done
 */
const isAdmin = (u) => u.role === "admin";
const canSee = (u, t) => isAdmin(u) || t.assigned_to === u.id || t.created_by === u.id;
const canManage = (u, t) => isAdmin(u) || t.created_by === u.id;

const parseId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const SELECT = `
  SELECT t.id, t.title, t.completed, t.created_at, t.updated_at,
         t.assigned_to, a.username AS assignee_name,
         t.created_by,  c.username AS creator_name
    FROM todos t
    LEFT JOIN users a ON a.id = t.assigned_to
    LEFT JOIN users c ON c.id = t.created_by`;

const findTodo = async (id) => (await pool.query(`${SELECT} WHERE t.id = $1`, [id])).rows[0];
const userExists = async (id) => (await pool.query("SELECT 1 FROM users WHERE id = $1", [id])).rowCount > 0;
const logNotifyError = (err) => console.error("Notify failed:", err.message);

// Reads assigned_to from the body: undefined = not given, null = unassigned, number = user id
async function readAssignee(body) {
  if (!Object.prototype.hasOwnProperty.call(body || {}, "assigned_to")) return { given: false };
  if (body.assigned_to === null || body.assigned_to === "") return { given: true, value: null };
  const id = parseId(body.assigned_to);
  if (!id || !(await userExists(id))) return { given: true, error: "That user doesn't exist" };
  return { given: true, value: id };
}

// GET /api/todos -> tasks this user can see
router.get("/", async (req, res, next) => {
  try {
    const me = req.user;
    const { rows } = isAdmin(me)
      ? await pool.query(`${SELECT} ORDER BY t.created_at DESC, t.id DESC`)
      : await pool.query(
          `${SELECT} WHERE t.assigned_to = $1 OR t.created_by = $1 ORDER BY t.created_at DESC, t.id DESC`,
          [me.id]
        );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/todos/:id
router.get("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const todo = await findTodo(id);
    if (!todo || !canSee(req.user, todo)) return res.status(404).json({ error: "Todo not found" });
    res.json(todo);
  } catch (err) {
    next(err);
  }
});

// POST /api/todos { title, assigned_to? } -> created todo (+ notify the assignee)
router.post("/", async (req, res, next) => {
  const me = req.user;
  const title = String(req.body?.title || "").trim();
  if (!title) return res.status(400).json({ error: "Title is required" });

  try {
    let assignedTo = me.id; // employees always create tasks for themselves
    if (isAdmin(me)) {
      const a = await readAssignee(req.body);
      if (a.error) return res.status(400).json({ error: a.error });
      if (a.given) assignedTo = a.value;
    }

    const { rows } = await pool.query(
      "INSERT INTO todos (title, assigned_to, created_by) VALUES ($1, $2, $3) RETURNING id",
      [title, assignedTo, me.id]
    );
    const todo = await findTodo(rows[0].id);
    res.status(201).json(todo);

    if (todo.assigned_to && todo.assigned_to !== me.id) {
      notifyUsers([todo.assigned_to], {
        title: `New task from ${me.username}`,
        body: todo.title,
        tag: `todo-${todo.id}`,
      }).catch(logNotifyError);
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/todos { ids: [...] } -> multiple delete (only tasks this user may delete)
router.delete("/", async (req, res, next) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(parseId).filter(Boolean) : [];
  if (!ids.length) return res.status(400).json({ error: "Provide a non-empty array of ids" });
  try {
    const { rows } = await pool.query(
      "DELETE FROM todos WHERE id = ANY($1::int[]) AND ($2::boolean OR created_by = $3) RETURNING id",
      [ids, isAdmin(req.user), req.user.id]
    );
    res.json({ deleted: rows.map((r) => r.id), count: rows.length });
  } catch (err) {
    next(err);
  }
});

// PUT /api/todos/:id { title?, completed?, assigned_to? }
router.put("/:id", async (req, res, next) => {
  const me = req.user;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const { title, completed } = req.body || {};
  try {
    const todo = await findTodo(id);
    if (!todo || !canSee(me, todo)) return res.status(404).json({ error: "Todo not found" });

    const assignee = await readAssignee(req.body);
    if (title === undefined && completed === undefined && !assignee.given) {
      return res.status(400).json({ error: "Nothing to update" });
    }
    if (title !== undefined && !canManage(me, todo)) {
      return res.status(403).json({ error: "You can only mark this task as done" });
    }
    if (assignee.given && !isAdmin(me)) {
      return res.status(403).json({ error: "Only an admin can assign tasks" });
    }
    if (assignee.error) return res.status(400).json({ error: assignee.error });
    if (title !== undefined && !String(title).trim()) {
      return res.status(400).json({ error: "Title cannot be empty" });
    }

    await pool.query(
      `UPDATE todos
          SET title       = COALESCE($1, title),
              completed   = COALESCE($2, completed),
              assigned_to = $3,
              updated_at  = NOW()
        WHERE id = $4`,
      [
        title !== undefined ? String(title).trim() : null,
        completed !== undefined ? Boolean(completed) : null,
        assignee.given ? assignee.value : todo.assigned_to,
        id,
      ]
    );
    const updated = await findTodo(id);
    res.json(updated);

    // Newly assigned to someone else -> tell them
    if (updated.assigned_to && updated.assigned_to !== todo.assigned_to && updated.assigned_to !== me.id) {
      notifyUsers([updated.assigned_to], {
        title: `New task from ${me.username}`,
        body: updated.title,
        tag: `todo-${updated.id}`,
      }).catch(logNotifyError);
    }
    // Someone finished a task another person gave them -> tell the creator
    if (updated.completed && !todo.completed && updated.created_by && updated.created_by !== me.id) {
      notifyUsers([updated.created_by], {
        title: `${me.username} completed a task`,
        body: updated.title,
        tag: `todo-${updated.id}-done`,
      }).catch(logNotifyError);
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/todos/:id
router.delete("/:id", async (req, res, next) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  try {
    const todo = await findTodo(id);
    if (!todo || !canSee(req.user, todo)) return res.status(404).json({ error: "Todo not found" });
    if (!canManage(req.user, todo)) {
      return res.status(403).json({ error: "Only the person who created this task can delete it" });
    }
    await pool.query("DELETE FROM todos WHERE id = $1", [id]);
    res.json({ deleted: id });
  } catch (err) {
    next(err);
  }
});

export default router;

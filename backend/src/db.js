import pg from "pg";
import bcrypt from "bcryptjs";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to backend/.env");
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Default accounts, created only if they don't exist yet
// (so passwords changed later are never overwritten).
const DEFAULT_USERS = [
  {
    username: (process.env.LOGIN_USERNAME || "aslogin").toLowerCase(),
    password: process.env.LOGIN_PASSWORD || "Epic@123",
    role: "admin",
  },
  { username: "manjot", password: "manjot123", role: "employee" },
  { username: "chandan", password: "chandan123", role: "employee" },
];

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             SERIAL PRIMARY KEY,
      username       TEXT NOT NULL UNIQUE,
      password_hash  TEXT NOT NULL,
      role           TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id          SERIAL PRIMARY KEY,
      title       TEXT NOT NULL,
      completed   BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Who the task is for, and who created it
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS assigned_to INT REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE todos ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL`);

  // One row per device that turned on notifications, linked to the logged-in user
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id          SERIAL PRIMARY KEY,
      endpoint    TEXT NOT NULL UNIQUE,
      p256dh      TEXT NOT NULL,
      auth        TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id) ON DELETE CASCADE`);
  // Devices saved before accounts existed don't belong to anyone — they re-register automatically
  await pool.query(`DELETE FROM push_subscriptions WHERE user_id IS NULL`);

  for (const u of DEFAULT_USERS) {
    const { rowCount } = await pool.query("SELECT 1 FROM users WHERE username = $1", [u.username]);
    if (rowCount) continue;
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING",
      [u.username, hash, u.role]
    );
    console.log(`Created default ${u.role} account: ${u.username}`);
  }

  // Tasks from before accounts existed belong to the admin
  await pool.query(`
    UPDATE todos SET created_by = (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
    WHERE created_by IS NULL AND assigned_to IS NULL
  `);
}

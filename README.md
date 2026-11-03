# Todo App

- **Backend:** Node.js + Express (`backend/`)
- **Frontend:** React + Vite (`frontend/`)
- **Database:** PostgreSQL (Neon)

## Setup

```bash
npm run install:all          # install backend + frontend deps
cp backend/.env.example backend/.env   # then fill in DATABASE_URL etc.
npm run build                # build React into frontend/dist
npm start                    # http://localhost:5050  (API + frontend)
```

The `todos` table is created automatically on first start.

Login: `aslogin` / `Epic@123` (configurable via `LOGIN_USERNAME` / `LOGIN_PASSWORD` in `.env`).

### Development (hot reload)

```bash
npm run dev:backend    # terminal 1 -> http://localhost:5050
npm run dev:frontend   # terminal 2 -> http://localhost:5173 (proxies /api to 5050)
```

## API

All `/api/todos` routes require `Authorization: Bearer <token>`.

| Method | Route              | Body                          | Description           |
|--------|--------------------|-------------------------------|-----------------------|
| POST   | `/api/auth/login`  | `{ username, password }`      | Returns `{ token }`   |
| GET    | `/api/todos`       |                               | List todos            |
| GET    | `/api/todos/:id`   |                               | Get one todo          |
| POST   | `/api/todos`       | `{ title }`                   | Create todo           |
| PUT    | `/api/todos/:id`   | `{ title?, completed? }`      | Update todo           |
| DELETE | `/api/todos/:id`   |                               | Delete one todo       |
| DELETE | `/api/todos`       | `{ ids: [1, 2, 3] }`          | Delete multiple todos |

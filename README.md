# solvesnap — Todo List

A simple todo list app:

- **Backend:** Python + [FastAPI](https://fastapi.tiangolo.com/) (`backend/`) — saves todos in a small SQLite file (`backend/todos.db`).
- **Frontend:** React + [Vite](https://vite.dev/) (`frontend/`).

## Features

- Add todos
- Check them off (and uncheck)
- Reorder them by dragging, or with the ▲ ▼ buttons
- Double-click a todo to rename it (Enter saves, Esc cancels)
- Delete a todo, or clear all finished ones at once
- Filter by All / Active / Done
- Your list is saved, so it's still there after a restart

## What you need installed

- [Python](https://www.python.org/downloads/) 3.10 or newer
- [Node.js](https://nodejs.org/) 20 or newer (this also installs `npm`)

## Running it on your computer

You need **two terminal windows** — one for the backend and one for the frontend.

**Terminal 1 — backend**

```bash
cd backend
python -m venv .venv                # create an isolated Python environment (first time only)
source .venv/bin/activate           # on Windows: .venv\Scripts\activate
pip install -r requirements.txt     # first time only
uvicorn main:app --reload
```

**Terminal 2 — frontend**

```bash
cd frontend
npm install                         # first time only
npm run dev
```

Then open **http://localhost:5173** in your browser.

Bonus: open **http://localhost:8000/docs** to see and try the backend API directly.

To stop either server, press `Ctrl + C` in its terminal.

## How it fits together

```
Browser  ──>  React app (localhost:5173)  ──/api/...──>  FastAPI (localhost:8000)  ──>  todos.db
```

The React dev server forwards any request starting with `/api` to FastAPI
(see `frontend/vite.config.js`).

| Method | URL                | What it does                              |
| ------ | ------------------ | ----------------------------------------- |
| GET    | `/api/todos`       | List all todos, in order                  |
| POST   | `/api/todos`       | Add a todo: `{"title": "..."}`            |
| PATCH  | `/api/todos/{id}`  | Change `title` and/or `completed`         |
| DELETE | `/api/todos/{id}`  | Delete a todo                             |
| PUT    | `/api/todos/order` | Save a new order: `{"ids": [3, 1, 2]}`    |

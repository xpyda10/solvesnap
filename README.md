# solvesnap — Todo List

A simple todo list app:

- **Backend:** Python + [FastAPI](https://fastapi.tiangolo.com/) (`backend/`) — saves todos in a small SQLite file (`backend/todos.db`).
- **Frontend:** React + [Vite](https://vite.dev/) (`frontend/`).

## Features

- Add todos, with an optional **priority** (High / Medium / Low) and **due date**
- Due dates read naturally: "Today", "Tomorrow", "Friday", "3 days overdue"
- Check todos off (and uncheck them)
- Reorder by dragging, or with the up/down arrows (shown when you hover a todo)
- Edit a todo's text, priority or date (pencil button, or double-click it)
- Delete a todo or clear all finished ones, with **Undo** for 5 seconds
- Filter by All / Active / Done, and **search** by text
- A progress ring shows how much of your list is done
- Keyboard shortcuts: `N` jumps to "Add a todo", `/` jumps to search
- Light and dark mode (follows your computer's setting) and a layout that works on phones
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

## Running the tests

The backend has automated tests that check every API route. With the backend's
Python environment active:

```bash
cd backend
pytest
```

## How it fits together

```
Browser  ──>  React app (localhost:5173)  ──/api/...──>  FastAPI (localhost:8000)  ──>  todos.db
```

The React dev server forwards any request starting with `/api` to FastAPI
(see `frontend/vite.config.js`).

| Method | URL                | What it does                              |
| ------ | ------------------ | ----------------------------------------- |
| GET    | `/api/todos`       | List all todos, in order                  |
| POST   | `/api/todos`       | Add a todo: `{"title": "...", "priority": "high", "due_date": "2026-10-01"}` (only `title` is required) |
| PATCH  | `/api/todos/{id}`  | Change any of `title`, `completed`, `priority`, `due_date` (send `null` to clear the last two) |
| DELETE | `/api/todos/{id}`  | Delete a todo                             |
| PUT    | `/api/todos/order` | Save a new order: `{"ids": [3, 1, 2]}`    |

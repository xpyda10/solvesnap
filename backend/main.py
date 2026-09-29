"""Todo list API built with FastAPI.

On your computer, todos are stored in a small SQLite database file (todos.db)
next to this file, so they are still there after you restart the server.
When the DATABASE_URL setting is present (as on Vercel), todos are stored in
that Postgres database instead.

Run it with:  uvicorn main:app --reload
Then open http://localhost:8000/docs to try the API in your browser.
"""

import os
import sqlite3
from contextlib import contextmanager
from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# The tests point this at a temporary file so they never touch your real todos.
DB_PATH = Path(os.environ.get("TODO_DB_PATH", Path(__file__).parent / "todos.db"))
if os.environ.get("VERCEL") and "TODO_DB_PATH" not in os.environ:
    # Vercel can only write to /tmp, and it gets wiped often. This keeps the
    # app working until a real database is connected (see README).
    DB_PATH = Path("/tmp/todos.db")

# Set automatically on Vercel when you connect a Neon Postgres database.
DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")

app = FastAPI(title="Todo API")

# The React dev server forwards every /api request here (see
# frontend/vite.config.js), so the browser only ever talks to one address.

Priority = Literal["low", "medium", "high"]


# ---------- Data shapes ----------

class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    priority: Priority | None = None
    due_date: date | None = None


class TodoUpdate(BaseModel):
    # Every field is optional: send only what you want to change.
    # Sending "priority": null or "due_date": null clears that field.
    title: str | None = Field(default=None, min_length=1, max_length=200)
    completed: bool | None = None
    priority: Priority | None = None
    due_date: date | None = None


class TodoReorder(BaseModel):
    # The todo ids in the new order, top to bottom.
    ids: list[int]


class Todo(BaseModel):
    id: int
    title: str
    completed: bool
    position: int
    priority: Priority | None
    due_date: date | None


# ---------- Database helpers ----------

class Postgres:
    """Makes a Postgres connection accept the same "?" placeholders as SQLite,
    so the rest of this file doesn't need to care which database it uses."""

    def __init__(self, conn):
        self.conn = conn

    def execute(self, sql, params=()):
        return self.conn.execute(sql.replace("?", "%s"), params)


@contextmanager
def get_db():
    if DATABASE_URL:
        import psycopg  # only needed when using Postgres
        from psycopg.rows import dict_row

        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
            yield Postgres(conn)  # commits when the block ends without an error
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    id_column = "SERIAL PRIMARY KEY" if DATABASE_URL else "INTEGER PRIMARY KEY AUTOINCREMENT"
    with get_db() as db:
        db.execute(
            f"""
            CREATE TABLE IF NOT EXISTS todos (
                id        {id_column},
                title     TEXT    NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position  INTEGER NOT NULL,
                priority  TEXT,
                due_date  TEXT
            )
            """
        )
        if DATABASE_URL:
            return
        # Databases created by the first version of the app lack the newer
        # columns, so add them if they're missing (your old todos are kept).
        columns = {r["name"] for r in db.execute("PRAGMA table_info(todos)")}
        for name in ("priority", "due_date"):
            if name not in columns:
                db.execute(f"ALTER TABLE todos ADD COLUMN {name} TEXT")


def row_to_todo(row) -> Todo:
    return Todo(
        id=row["id"],
        title=row["title"],
        completed=bool(row["completed"]),
        position=row["position"],
        priority=row["priority"],
        due_date=row["due_date"],
    )


def fetch_todo(db, todo_id: int) -> Todo:
    row = db.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return row_to_todo(row)


def clean_title(title: str) -> str:
    title = title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")
    return title


init_db()


# ---------- API routes ----------

@app.get("/api/todos", response_model=list[Todo])
def list_todos():
    with get_db() as db:
        rows = db.execute("SELECT * FROM todos ORDER BY position").fetchall()
        return [row_to_todo(r) for r in rows]


@app.post("/api/todos", response_model=Todo, status_code=201)
def create_todo(payload: TodoCreate):
    title = clean_title(payload.title)
    with get_db() as db:
        # New todos go at the bottom of the list.
        next_pos = db.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM todos"
        ).fetchone()["next_pos"]
        new_id = db.execute(
            """
            INSERT INTO todos (title, completed, position, priority, due_date)
            VALUES (?, 0, ?, ?, ?)
            RETURNING id
            """,
            (
                title,
                next_pos,
                payload.priority,
                payload.due_date.isoformat() if payload.due_date else None,
            ),
        ).fetchone()["id"]
        return fetch_todo(db, new_id)


@app.patch("/api/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, payload: TodoUpdate):
    # model_fields_set holds only the fields the request actually sent, so we
    # can tell "leave the due date alone" apart from "clear the due date".
    sent = payload.model_fields_set
    changes = {}
    if "title" in sent and payload.title is not None:
        changes["title"] = clean_title(payload.title)
    if "completed" in sent and payload.completed is not None:
        changes["completed"] = int(payload.completed)
    if "priority" in sent:
        changes["priority"] = payload.priority
    if "due_date" in sent:
        changes["due_date"] = payload.due_date.isoformat() if payload.due_date else None

    with get_db() as db:
        fetch_todo(db, todo_id)  # 404 if it doesn't exist
        for column, value in changes.items():
            # column names come from the fixed list above, never from the user
            db.execute(f"UPDATE todos SET {column} = ? WHERE id = ?", (value, todo_id))
        return fetch_todo(db, todo_id)


@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int):
    with get_db() as db:
        fetch_todo(db, todo_id)
        db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))


@app.put("/api/todos/order", response_model=list[Todo])
def reorder_todos(payload: TodoReorder):
    with get_db() as db:
        existing = {r["id"] for r in db.execute("SELECT id FROM todos").fetchall()}
        if set(payload.ids) != existing or len(payload.ids) != len(existing):
            raise HTTPException(
                status_code=400, detail="ids must list every todo exactly once"
            )
        for position, todo_id in enumerate(payload.ids):
            db.execute(
                "UPDATE todos SET position = ? WHERE id = ?", (position, todo_id)
            )
        rows = db.execute("SELECT * FROM todos ORDER BY position").fetchall()
        return [row_to_todo(r) for r in rows]

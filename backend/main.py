"""Todo list API built with FastAPI.

Todos are stored in a small SQLite database file (todos.db) next to this file,
so they are still there after you restart the server.

Run it with:  uvicorn main:app --reload
Then open http://localhost:8000/docs to try the API in your browser.
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

DB_PATH = Path(__file__).parent / "todos.db"

app = FastAPI(title="Todo API")

# The React dev server forwards every /api request here (see
# frontend/vite.config.js), so the browser only ever talks to one address.


# ---------- Data shapes ----------

class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class TodoUpdate(BaseModel):
    # Both fields are optional: send only what you want to change.
    title: str | None = Field(default=None, min_length=1, max_length=200)
    completed: bool | None = None


class TodoReorder(BaseModel):
    # The todo ids in the new order, top to bottom.
    ids: list[int]


class Todo(BaseModel):
    id: int
    title: str
    completed: bool
    position: int


# ---------- Database helpers ----------

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with get_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS todos (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                title     TEXT    NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                position  INTEGER NOT NULL
            )
            """
        )


def row_to_todo(row: sqlite3.Row) -> Todo:
    return Todo(
        id=row["id"],
        title=row["title"],
        completed=bool(row["completed"]),
        position=row["position"],
    )


def fetch_todo(db: sqlite3.Connection, todo_id: int) -> Todo:
    row = db.execute("SELECT * FROM todos WHERE id = ?", (todo_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Todo not found")
    return row_to_todo(row)


init_db()


# ---------- API routes ----------

@app.get("/api/todos", response_model=list[Todo])
def list_todos():
    with get_db() as db:
        rows = db.execute("SELECT * FROM todos ORDER BY position").fetchall()
        return [row_to_todo(r) for r in rows]


@app.post("/api/todos", response_model=Todo, status_code=201)
def create_todo(payload: TodoCreate):
    title = payload.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")
    with get_db() as db:
        # New todos go at the bottom of the list.
        next_pos = db.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM todos"
        ).fetchone()[0]
        cur = db.execute(
            "INSERT INTO todos (title, completed, position) VALUES (?, 0, ?)",
            (title, next_pos),
        )
        return fetch_todo(db, cur.lastrowid)


@app.patch("/api/todos/{todo_id}", response_model=Todo)
def update_todo(todo_id: int, payload: TodoUpdate):
    with get_db() as db:
        fetch_todo(db, todo_id)  # 404 if it doesn't exist
        if payload.title is not None:
            title = payload.title.strip()
            if not title:
                raise HTTPException(status_code=422, detail="Title cannot be empty")
            db.execute("UPDATE todos SET title = ? WHERE id = ?", (title, todo_id))
        if payload.completed is not None:
            db.execute(
                "UPDATE todos SET completed = ? WHERE id = ?",
                (int(payload.completed), todo_id),
            )
        return fetch_todo(db, todo_id)


@app.delete("/api/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int):
    with get_db() as db:
        fetch_todo(db, todo_id)
        db.execute("DELETE FROM todos WHERE id = ?", (todo_id,))


@app.put("/api/todos/order", response_model=list[Todo])
def reorder_todos(payload: TodoReorder):
    with get_db() as db:
        existing = {r[0] for r in db.execute("SELECT id FROM todos").fetchall()}
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

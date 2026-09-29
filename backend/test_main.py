"""Automated tests for the todo API.

Run them from the backend folder with:  pytest
"""

import os
import tempfile

# Use a throwaway database so the tests never touch your real todos.
os.environ["TODO_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def empty_db():
    with main.get_db() as db:
        db.execute("DELETE FROM todos")


def add(title, **extra):
    res = client.post("/api/todos", json={"title": title, **extra})
    assert res.status_code == 201
    return res.json()


def test_add_and_list():
    add("Buy milk")
    add("Walk dog", priority="high", due_date="2026-10-01")
    todos = client.get("/api/todos").json()
    assert [t["title"] for t in todos] == ["Buy milk", "Walk dog"]
    assert todos[0]["priority"] is None
    assert todos[1]["priority"] == "high"
    assert todos[1]["due_date"] == "2026-10-01"


def test_rejects_blank_title_and_bad_priority():
    assert client.post("/api/todos", json={"title": "   "}).status_code == 422
    assert client.post("/api/todos", json={"title": "x", "priority": "urgent"}).status_code == 422


def test_check_off_and_rename():
    todo = add("Buy milk")
    res = client.patch(f"/api/todos/{todo['id']}", json={"completed": True})
    assert res.json()["completed"] is True
    res = client.patch(f"/api/todos/{todo['id']}", json={"title": "Buy oat milk"})
    assert res.json()["title"] == "Buy oat milk"
    assert res.json()["completed"] is True  # untouched fields stay the same


def test_clear_due_date_only_when_sent():
    todo = add("Pay rent", due_date="2026-10-01", priority="medium")
    res = client.patch(f"/api/todos/{todo['id']}", json={"priority": "low"})
    assert res.json()["due_date"] == "2026-10-01"
    res = client.patch(f"/api/todos/{todo['id']}", json={"due_date": None})
    assert res.json()["due_date"] is None
    assert res.json()["priority"] == "low"


def test_reorder():
    a, b, c = add("a"), add("b"), add("c")
    res = client.put("/api/todos/order", json={"ids": [c["id"], a["id"], b["id"]]})
    assert [t["title"] for t in res.json()] == ["c", "a", "b"]
    # Missing or unknown ids are refused.
    assert client.put("/api/todos/order", json={"ids": [a["id"]]}).status_code == 400


def test_delete():
    todo = add("Temp")
    assert client.delete(f"/api/todos/{todo['id']}").status_code == 204
    assert client.get("/api/todos").json() == []
    assert client.delete(f"/api/todos/{todo['id']}").status_code == 404

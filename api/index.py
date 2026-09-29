# Entry point Vercel runs for every /api/... request (see vercel.json).
# It simply loads the FastAPI app from the backend folder.
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from main import app  # noqa: E402,F401

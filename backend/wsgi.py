import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env relative to this file, not the caller's working directory — otherwise
# running `python backend/wsgi.py` from the repo root silently fails to find it.
load_dotenv(Path(__file__).resolve().parent / ".env")

from app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_ENV") != "production")

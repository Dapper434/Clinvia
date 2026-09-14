import os


def _normalize_database_url(raw_url: str) -> str:
    """Upgrade legacy postgres:// URLs and auto-enable SSL for hosted providers."""
    if not raw_url:
        return raw_url

    url = raw_url
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://") :]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://") :]

    needs_ssl = (
        os.environ.get("FLASK_ENV") == "production"
        or "supabase.co" in url
        or "render.com" in url
        or "neon.tech" in url
    )
    if needs_ssl and "sslmode=" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}sslmode=require"

    return url


class Config:
    JWT_SECRET = os.environ.get("JWT_SECRET", "clinvia_default_secret_development_key_32chars")
    JWT_EXPIRES_IN = os.environ.get("JWT_EXPIRES_IN", "7d")

    SQLALCHEMY_DATABASE_URI = _normalize_database_url(
        os.environ.get("DATABASE_URL", "postgresql://localhost:5432/tbtrack")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173,http://localhost:3000")
    DEBUG_SQL = os.environ.get("DEBUG_SQL", "false").lower() == "true"

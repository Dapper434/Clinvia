"""Tests run against a throwaway database that is migrated from scratch and seeded.

Point TEST_DATABASE_URL at a local Postgres you don't mind wiping; the default is the
local dev cluster described in the README. The database named there is dropped and
recreated on every run.
"""
import os
from urllib.parse import urlsplit, urlunsplit

import psycopg
import pytest

TEST_URL = os.environ.get("TEST_DATABASE_URL", "postgresql://clinvia@localhost:5433/clinvia_test")
PASSWORDS = {
    "NETWORK": "Network-test-1", "KNH": "Knh-test-1", "KIAMBU": "Kiambu-test-1", "NAKURU": "Nakuru-test-1",
    "MACHAKOS": "Machakos-test-1", "THIKA": "Thika-test-1", "PATIENTS": "Patient-test-1",
}

os.environ["DATABASE_URL"] = TEST_URL
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-clinvia-tests-only-32")
for key, value in PASSWORDS.items():
    os.environ[f"SEED_PASSWORD_{key}"] = value


def _recreate_database():
    parts = urlsplit(TEST_URL)
    name = parts.path.lstrip("/")
    host = (parts.hostname or "").lower()
    if host not in ("localhost", "127.0.0.1") or "test" not in name:
        raise RuntimeError("Refusing to wipe a database that isn't a local *test* database.")
    admin_url = urlunsplit(parts._replace(path="/postgres"))
    with psycopg.connect(admin_url, autocommit=True) as conn:
        conn.execute(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)')
        conn.execute(f'CREATE DATABASE "{name}"')


@pytest.fixture(scope="session")
def app():
    _recreate_database()
    from flask_migrate import upgrade

    from app import create_app
    from seed.generate import run

    application = create_app()
    application.config["TESTING"] = True
    with application.app_context():
        upgrade(directory=os.path.join(os.path.dirname(__file__), "..", "migrations"))
        run(log=lambda *_: None)
    yield application


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def login(client):
    def _login(email, password=None, kind="hospital"):
        if password is None:
            domain = email.split("@")[1]
            key = "NETWORK" if domain == "clinvia.health" else domain.split(".")[0].upper()
            password = PASSWORDS[key]
        r = client.post(f"/api/auth/login/{kind}", json={"email": email, "password": password})
        assert r.status_code == 200, r.get_json()
        return {"Authorization": "Bearer " + r.get_json()["token"]}

    return _login

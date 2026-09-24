import logging
from datetime import datetime, timezone

from flask import Flask, jsonify, request
from flask_cors import CORS

from .config import Config
from .extensions import db, migrate


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)

    # Mirrors the previous Node/Express CORS setup: any origin is reflected back
    # (flask-cors handles the Origin echo required when supports_credentials=True).
    CORS(
        app,
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Hospital"],
        origins="*",
    )

    if app.config["DEBUG_SQL"]:
        logging.basicConfig()
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

    from .routes import (
        admissions,
        appointments,
        auth_routes,
        dashboard,
        doses,
        facilities,
        hospitals,
        patients,
        portal,
        push,
        reminders,
        reports,
        staff,
    )

    for module in (auth_routes, hospitals, dashboard, patients, appointments, admissions, doses,
                   reports, staff, facilities, portal, push, reminders):
        app.register_blueprint(module.bp)

    from .auth import ScopeError

    @app.errorhandler(ScopeError)
    def scope_error(err):
        return jsonify({"error": str(err)}), 400

    @app.cli.command("send-reminders")
    def send_reminders_command():
        """Send any due dose reminders now (same logic as POST /api/reminders/run)."""
        from .reminders import send_due_reminders

        print(send_due_reminders())

    @app.cli.command("seed-network")
    def seed_network_command():
        """Load (or reset) the five seeded hospitals. Hospitals registered in the app are untouched."""
        from seed.generate import SeedError, run

        print("Seeding the hospital network…")
        try:
            run()
        except SeedError as err:
            raise SystemExit(f"Seed stopped: {err}")

    @app.get("/health")
    def health():
        return jsonify(
            {
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "service": "clinvia-backend",
                "environment": app.config.get("ENV", "development"),
            }
        )

    @app.get("/")
    def index():
        return jsonify(
            {
                "name": "Clinvia REST API",
                "version": "2.0.0",
                "status": "running",
                "docs": "/api/docs",
                "health": "/health",
            }
        )

    @app.errorhandler(404)
    def not_found(err):
        from werkzeug.exceptions import NotFound

        if err.description and err.description != NotFound.description:
            return jsonify({"error": err.description}), 404
        return jsonify({"error": f"Endpoint not found: {request.method} {request.path}"}), 404

    @app.errorhandler(Exception)
    def handle_error(err):
        from werkzeug.exceptions import HTTPException

        if isinstance(err, HTTPException):
            return jsonify({"error": err.description}), err.code

        app.logger.exception("Unhandled Server Error")
        return jsonify({"error": "Internal server error"}), 500

    return app

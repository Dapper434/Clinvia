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
        allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
        origins="*",
    )

    if app.config["DEBUG_SQL"]:
        logging.basicConfig()
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)

    from .routes import (
        admin,
        auth_routes,
        contacts,
        dashboard,
        dose_logs,
        facilities,
        labs,
        patients,
        portal,
        reports,
    )

    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(admin.bp)
    app.register_blueprint(patients.bp)
    app.register_blueprint(dose_logs.bp)
    app.register_blueprint(labs.bp)
    app.register_blueprint(contacts.bp)
    app.register_blueprint(facilities.bp)
    app.register_blueprint(dashboard.bp)
    app.register_blueprint(reports.bp)
    app.register_blueprint(portal.bp)

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
                "version": "1.0.0",
                "status": "running",
                "docs": "/api/docs",
                "health": "/health",
            }
        )

    @app.errorhandler(404)
    def not_found(err):
        return jsonify({"error": f"Endpoint not found: {request.method} {request.path}"}), 404

    @app.errorhandler(Exception)
    def handle_error(err):
        from werkzeug.exceptions import HTTPException

        if isinstance(err, HTTPException):
            return jsonify({"error": err.description}), err.code

        app.logger.exception("Unhandled Server Error")
        return jsonify({"error": "Internal server error"}), 500

    return app

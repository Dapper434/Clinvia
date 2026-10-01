import logging
from datetime import datetime, timezone

import click
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

    @app.cli.command("add-tb-representative")
    @click.option("--email", prompt=True, help="Must be at the network domain, e.g. name@clinvia.health")
    @click.option("--name", prompt="Full name", help="Full name shown in the app")
    @click.option("--organisation", prompt=True, help="e.g. Ministry of Health, National TB Programme")
    @click.option("--county", default="", prompt="County (leave empty for every hospital)", help="Limit to one county")
    @click.option("--title", default="TB programme", prompt=True, help="Job title")
    @click.password_option()
    def add_tb_representative(email, name, organisation, county, title, password):
        """Create a TB representative (Ministry of Health, county or NGO). They see numbers only."""
        from .auth import hash_password, password_problem
        from .models import Profile, User

        email = email.strip().lower()
        domain = app.config["NETWORK_EMAIL_DOMAIN"]
        if not email.endswith("@" + domain):
            raise SystemExit(f"The email must end in @{domain}.")
        if User.query.filter_by(email=email).first():
            raise SystemExit("An account with that email already exists.")
        problem = password_problem(password)
        if problem:
            raise SystemExit(problem)
        u = User(email=email, password_hash=hash_password(password), role="network_admin", full_name=name.strip(),
                 organisation=organisation.strip() or None, county=county.strip() or None, specialty=title.strip() or None)
        db.session.add(u)
        db.session.flush()
        u.staff_code = db.session.execute(db.text("SELECT next_staff_code()")).scalar()
        db.session.merge(Profile(id=u.id, full_name=u.full_name, role="network_admin"))
        db.session.commit()
        scope = f"hospitals in {u.county} County" if u.county else "every hospital"
        print(f"Created {u.full_name} ({u.staff_code}), {u.organisation}: sees numbers for {scope}.")

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

from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import HTTPException
from flask_cors import CORS

from .config import get_config
from .extensions import db, bcrypt, jwt
from .scheduling import start_scheduler
from .routes import auth, user, contacts, campaigns, templates, logs


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config())

    # CORS for browser-based frontend (Render static site, GitHub Pages, etc.)
    frontend_origin = app.config.get("FRONTEND_ORIGIN", "*")
    CORS(
        app,
        resources={r"/*": {"origins": frontend_origin}},
        supports_credentials=False,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    with app.app_context():
        db.create_all()

    # register blueprints
    app.register_blueprint(auth.bp)
    app.register_blueprint(user.bp)
    app.register_blueprint(contacts.bp)
    app.register_blueprint(campaigns.bp)
    app.register_blueprint(templates.bp)
    app.register_blueprint(logs.bp)

    start_scheduler(app)

    @app.errorhandler(HTTPException)
    def handle_http_error(exc: HTTPException):
        return jsonify({"message": exc.description}), exc.code

    @app.errorhandler(Exception)
    def handle_unexpected_error(exc: Exception):  # noqa: D401
        """Catch-all error handler for unhandled exceptions."""
        app.logger.exception("Unhandled error: %s", exc)
        return jsonify({"message": "Internal server error"}), 500

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    return app


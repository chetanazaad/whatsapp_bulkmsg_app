from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import User

bp = Blueprint("user", __name__, url_prefix="/user")


@bp.get("/profile")
@jwt_required()
def profile():
    user = User.query.get_or_404(get_jwt_identity())
    return jsonify(
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "whatsapp_api_key_set": bool(user.whatsapp_api_key),
        }
    )


@bp.put("/profile")
@jwt_required()
def update_profile():
    user = User.query.get_or_404(get_jwt_identity())
    data = request.get_json() or {}
    full_name = (data.get("full_name") or "").strip()
    if full_name:
        user.full_name = full_name

    if "whatsapp_api_key" in data:
        user.whatsapp_api_key = data.get("whatsapp_api_key") or None

    db.session.commit()
    return jsonify({"message": "Profile updated"}), 200


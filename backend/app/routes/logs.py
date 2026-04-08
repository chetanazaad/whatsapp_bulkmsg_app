from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import MessageLog

bp = Blueprint("logs", __name__, url_prefix="/logs")


@bp.get("")
@jwt_required()
def list_logs():
    user_id = get_jwt_identity()
    status = request.args.get("status")
    q = MessageLog.query.filter_by(user_id=user_id)
    if status:
        q = q.filter_by(status=status)
    items = q.order_by(MessageLog.created_at.desc()).limit(500).all()
    return jsonify(
        [
            {
                "id": m.id,
                "campaign_id": m.campaign_id,
                "contact_id": m.contact_id,
                "to_phone": m.to_phone,
                "status": m.status,
                "whatsapp_message_id": m.whatsapp_message_id,
                "error_message": m.error_message,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
            }
            for m in items
        ]
    )


from __future__ import annotations

from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Campaign, Contact, Template
from ..services.campaign_service import create_campaign, enqueue_messages_for_campaign

bp = Blueprint("campaigns", __name__, url_prefix="/campaigns")


@bp.post("")
@jwt_required()
def create_campaign_route():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    description = (data.get("description") or "").strip() or None
    template_id = data.get("template_id")
    contact_ids = data.get("contact_ids") or []
    variables = data.get("variables") or {}
    scheduled_at_str = data.get("scheduled_at")

    if not name or not template_id or not isinstance(contact_ids, list) or not contact_ids:
        return jsonify({"message": "name, template_id and contact_ids are required"}), 400

    # basic ownership checks
    if not Template.query.filter_by(id=template_id, user_id=user_id).first():
        return jsonify({"message": "Template not found"}), 404

    existing_ids = {
        c.id
        for c in Contact.query.filter(
            Contact.user_id == user_id, Contact.id.in_(contact_ids)
        ).all()
    }
    if not existing_ids:
        return jsonify({"message": "No valid contacts found"}), 400

    scheduled_at = None
    if scheduled_at_str:
        scheduled_at = datetime.fromisoformat(scheduled_at_str)

    campaign = create_campaign(
        user_id=user_id,
        name=name,
        description=description,
        template_id=template_id,
        contact_ids=existing_ids,
        scheduled_at=scheduled_at,
    )
    if not scheduled_at:
        enqueue_messages_for_campaign(campaign, variables=variables)

    return jsonify({"id": campaign.id, "status": campaign.status}), 201


@bp.post("/send")
@jwt_required()
def trigger_send_now():
    """
    Optional endpoint to switch a campaign to running and enqueue messages again.
    """
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    campaign_id = data.get("campaign_id")
    variables = data.get("variables") or {}
    if not campaign_id:
        return jsonify({"message": "campaign_id is required"}), 400

    campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first()
    if not campaign:
        return jsonify({"message": "Campaign not found"}), 404

    campaign.status = Campaign.STATUS_RUNNING
    db.session.commit()
    enqueue_messages_for_campaign(campaign, variables=variables)
    return jsonify({"message": "Send triggered"}), 200


@bp.get("")
@jwt_required()
def list_campaigns():
    user_id = get_jwt_identity()
    items = (
        Campaign.query.filter_by(user_id=user_id)
        .order_by(Campaign.created_at.desc())
        .limit(100)
        .all()
    )
    return jsonify(
        [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "status": c.status,
                "scheduled_at": c.scheduled_at.isoformat() if c.scheduled_at else None,
                "template_id": c.template_id,
            }
            for c in items
        ]
    )


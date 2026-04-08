from __future__ import annotations

from datetime import datetime
from typing import Iterable, Dict, Any

from flask import current_app

from ..extensions import db
from ..models import Campaign, CampaignContact, Contact, MessageLog, Template
from .whatsapp_client import WhatsAppClient


def create_campaign(
    *,
    user_id: int,
    name: str,
    description: str | None,
    template_id: int,
    contact_ids: Iterable[int],
    scheduled_at: datetime | None,
) -> Campaign:
    campaign = Campaign(
        user_id=user_id,
        name=name,
        description=description,
        template_id=template_id,
        scheduled_at=scheduled_at,
        status=Campaign.STATUS_SCHEDULED if scheduled_at else Campaign.STATUS_RUNNING,
    )
    db.session.add(campaign)
    db.session.flush()

    for cid in contact_ids:
        db.session.add(CampaignContact(campaign_id=campaign.id, contact_id=cid))

    db.session.commit()
    return campaign


def enqueue_messages_for_campaign(campaign: Campaign, variables: Dict[str, Any]) -> None:
    """
    Create MessageLog entries for each contact for later processing by the scheduler.
    """
    contacts = (
        Contact.query.join(CampaignContact, CampaignContact.contact_id == Contact.id)
        .filter(CampaignContact.campaign_id == campaign.id, Contact.is_opt_in.is_(True))
        .all()
    )
    for contact in contacts:
        to_phone = contact.phone_number
        db.session.add(
            MessageLog(
                campaign_id=campaign.id,
                contact_id=contact.id,
                user_id=campaign.user_id,
                template_id=campaign.template_id,
                to_phone=to_phone,
                status=MessageLog.STATUS_PENDING,
                payload={"variables": variables},
            )
        )
    db.session.commit()


def process_pending_messages(batch_size: int = 100) -> int:
    """
    Background job: send pending messages in small batches.
    Returns number of processed messages.
    """
    pending = (
        MessageLog.query.filter_by(status=MessageLog.STATUS_PENDING)
        .order_by(MessageLog.created_at.asc())
        .limit(batch_size)
        .all()
    )
    if not pending:
        return 0

    client = WhatsAppClient()
    for log in pending:
        try:
            template = Template.query.get(log.template_id)
            if not template:
                raise RuntimeError("Template not found.")
            variables = (log.payload or {}).get("variables") or {}
            result = client.send_template_message(
                to_phone=log.to_phone,
                template_name=template.name,
                language_code=template.language_code,
                variables=variables,
            )
            log.status = MessageLog.STATUS_SENT
            log.sent_at = datetime.utcnow()
            # WhatsApp Cloud API returns "messages": [{"id": "..."}]
            messages = result.get("messages") or []
            if messages:
                log.whatsapp_message_id = messages[0].get("id")
        except Exception as exc:  # noqa: BLE001
            current_app.logger.exception("Failed to send WhatsApp message")
            log.status = MessageLog.STATUS_FAILED
            log.error_message = str(exc)

    db.session.commit()
    return len(pending)


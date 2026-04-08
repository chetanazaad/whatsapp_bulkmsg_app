from datetime import datetime

from .extensions import db, bcrypt


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    whatsapp_api_key = db.Column(db.String(512), nullable=True)

    campaigns = db.relationship("Campaign", back_populates="owner", lazy="dynamic")
    contacts = db.relationship("Contact", back_populates="owner", lazy="dynamic")

    def set_password(self, raw_password: str) -> None:
        self.password_hash = bcrypt.generate_password_hash(raw_password).decode("utf-8")

    def check_password(self, raw_password: str) -> bool:
        return bcrypt.check_password_hash(self.password_hash, raw_password)


class Contact(TimestampMixin, db.Model):
    __tablename__ = "contacts"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    phone_number = db.Column(db.String(32), nullable=False, index=True)
    country_code = db.Column(db.String(8), nullable=False)
    is_opt_in = db.Column(db.Boolean, default=True, nullable=False)

    owner = db.relationship("User", back_populates="contacts")
    campaign_links = db.relationship("CampaignContact", back_populates="contact")


class Template(TimestampMixin, db.Model):
    __tablename__ = "templates"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(64), nullable=True)
    language_code = db.Column(db.String(10), default="en_US", nullable=False)
    body = db.Column(db.Text, nullable=False)
    variable_schema = db.Column(db.JSON, nullable=True)  # e.g. {"name": "string"}


class Campaign(TimestampMixin, db.Model):
    __tablename__ = "campaigns"

    STATUS_DRAFT = "draft"
    STATUS_SCHEDULED = "scheduled"
    STATUS_RUNNING = "running"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    template_id = db.Column(db.Integer, db.ForeignKey("templates.id"), nullable=False)
    status = db.Column(db.String(32), default=STATUS_DRAFT, nullable=False, index=True)
    scheduled_at = db.Column(db.DateTime, nullable=True, index=True)

    owner = db.relationship("User", back_populates="campaigns")
    template = db.relationship("Template")
    contacts = db.relationship("CampaignContact", back_populates="campaign")
    messages = db.relationship("MessageLog", back_populates="campaign")


class CampaignContact(TimestampMixin, db.Model):
    __tablename__ = "campaign_contacts"

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(
        db.Integer, db.ForeignKey("campaigns.id"), nullable=False, index=True
    )
    contact_id = db.Column(
        db.Integer, db.ForeignKey("contacts.id"), nullable=False, index=True
    )

    campaign = db.relationship("Campaign", back_populates="contacts")
    contact = db.relationship("Contact", back_populates="campaign_links")


class MessageLog(TimestampMixin, db.Model):
    __tablename__ = "message_logs"

    STATUS_PENDING = "pending"
    STATUS_SENT = "sent"
    STATUS_FAILED = "failed"

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(
        db.Integer, db.ForeignKey("campaigns.id"), nullable=True, index=True
    )
    contact_id = db.Column(
        db.Integer, db.ForeignKey("contacts.id"), nullable=True, index=True
    )
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    template_id = db.Column(
        db.Integer, db.ForeignKey("templates.id"), nullable=True, index=True
    )

    to_phone = db.Column(db.String(32), nullable=False, index=True)
    status = db.Column(db.String(32), default=STATUS_PENDING, nullable=False, index=True)
    whatsapp_message_id = db.Column(db.String(255), nullable=True)
    error_message = db.Column(db.Text, nullable=True)

    payload = db.Column(db.JSON, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)

    campaign = db.relationship("Campaign", back_populates="messages")


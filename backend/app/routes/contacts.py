from __future__ import annotations

import csv
import io
from typing import List

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Contact

bp = Blueprint("contacts", __name__, url_prefix="/contacts")


@bp.post("")
@jwt_required()
def add_contact():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    phone = (data.get("phone_number") or "").strip()
    country_code = (data.get("country_code") or "").strip() or "+91"
    is_opt_in = bool(data.get("is_opt_in", True))

    if not name or not phone:
        return jsonify({"message": "name and phone_number are required"}), 400

    contact = Contact(
        user_id=user_id,
        name=name,
        phone_number=phone,
        country_code=country_code,
        is_opt_in=is_opt_in,
    )
    db.session.add(contact)
    db.session.commit()
    return jsonify({"id": contact.id, "message": "Contact created"}), 201


@bp.post("/upload")
@jwt_required()
def upload_contacts():
    """
    Accepts CSV file upload with columns: name, phone_number, country_code, is_opt_in
    """
    user_id = get_jwt_identity()
    file = request.files.get("file")
    if not file:
        return jsonify({"message": "CSV file is required as 'file'"}), 400

    stream = io.StringIO(file.stream.read().decode("utf-8"))
    reader = csv.DictReader(stream)
    created: List[int] = []
    for row in reader:
        name = (row.get("name") or "").strip()
        phone = (row.get("phone_number") or "").strip()
        if not name or not phone:
            continue
        contact = Contact(
            user_id=user_id,
            name=name,
            phone_number=phone,
            country_code=(row.get("country_code") or "+91").strip(),
            is_opt_in=str(row.get("is_opt_in", "true")).lower() in {"1", "true", "yes"},
        )
        db.session.add(contact)
        db.session.flush()
        created.append(contact.id)

    db.session.commit()
    return jsonify({"created_count": len(created), "ids": created}), 201


@bp.get("")
@jwt_required()
def list_contacts():
    user_id = get_jwt_identity()
    q = Contact.query.filter_by(user_id=user_id)
    only_opt_in = request.args.get("only_opt_in")
    if only_opt_in and only_opt_in.lower() == "true":
        q = q.filter(Contact.is_opt_in.is_(True))
    items = q.order_by(Contact.created_at.desc()).limit(1000).all()
    return jsonify(
        [
            {
                "id": c.id,
                "name": c.name,
                "phone_number": c.phone_number,
                "country_code": c.country_code,
                "is_opt_in": c.is_opt_in,
            }
            for c in items
        ]
    )


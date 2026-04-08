from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Template

bp = Blueprint("templates", __name__, url_prefix="/templates")


@bp.post("")
@jwt_required()
def create_template():
  user_id = get_jwt_identity()
  data = request.get_json() or {}
  name = (data.get("name") or "").strip()
  body = (data.get("body") or "").strip()
  category = (data.get("category") or "").strip() or None
  language_code = (data.get("language_code") or "en_US").strip()
  variable_schema = data.get("variable_schema") or None

  if not name or not body:
      return jsonify({"message": "name and body are required"}), 400

  template = Template(
      user_id=user_id,
      name=name,
      body=body,
      category=category,
      language_code=language_code,
      variable_schema=variable_schema,
  )
  db.session.add(template)
  db.session.commit()
  return jsonify({"id": template.id, "message": "Template created"}), 201


@bp.get("")
@jwt_required()
def list_templates():
  user_id = get_jwt_identity()
  templates = Template.query.filter_by(user_id=user_id).order_by(Template.created_at.desc()).all()
  return jsonify(
      [
          {
              "id": t.id,
              "name": t.name,
              "category": t.category,
              "language_code": t.language_code,
              "variable_schema": t.variable_schema,
          }
          for t in templates
      ]
  )


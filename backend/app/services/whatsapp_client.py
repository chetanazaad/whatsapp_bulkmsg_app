from __future__ import annotations

from typing import Dict, Any

import requests
from flask import current_app


class WhatsAppClient:
    """
    Thin wrapper around the official WhatsApp Cloud API.
    This can be mocked or extended for testing / retries / metrics.
    """

    def __init__(self, access_token: str | None = None, phone_number_id: str | None = None):
        cfg = current_app.config
        self.access_token = access_token or cfg.get("WHATSAPP_ACCESS_TOKEN")
        self.phone_number_id = phone_number_id or cfg.get("WHATSAPP_PHONE_NUMBER_ID")
        self.base_url = cfg.get("WHATSAPP_API_BASE_URL").rstrip("/")

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def send_template_message(
        self,
        to_phone: str,
        template_name: str,
        language_code: str,
        variables: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """
        Sends a template message using the WhatsApp Cloud API.
        Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
        """
        if not self.access_token or not self.phone_number_id:
            raise RuntimeError("WhatsApp credentials are not configured.")

        url = f"{self.base_url}/{self.phone_number_id}/messages"
        components = []
        if variables:
            components.append(
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": str(value)} for value in variables.values()
                    ],
                }
            )

        payload: Dict[str, Any] = {
            "messaging_product": "whatsapp",
            "to": to_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }
        if components:
            payload["template"]["components"] = components

        resp = requests.post(url, headers=self._headers(), json=payload, timeout=15)
        data = resp.json() if resp.content else {}
        if not resp.ok:
            raise RuntimeError(f"WhatsApp API error: {resp.status_code} {data}")
        return data


"""Small, synchronous client for the Quiet Progress bot API.

The bot saves people who register through /start (phone, name, surname,
address, age) with ``POST /api/bot/contacts``, authenticated by the shared
secret in the ``X-Bot-Token`` header (``QP_BOT_TOKEN`` here, ``BOT_API_TOKEN``
on the server). Callers from aiogram should run these methods with
``asyncio.to_thread`` so slow API responses do not block Telegram polling.
"""

from __future__ import annotations

import json
import re
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


DEFAULT_QP_API = "https://quiet-progress-720242842790.europe-west1.run.app/api"
MAX_RESPONSE_BYTES = 1_048_576
ERROR_CODE_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,80}$")
CONTACT_FIELDS = ("username", "phone", "first_name", "last_name", "address", "age")


class QuietProgressError(Exception):
    """Base error with no credentials or response body in its message."""


class QuietProgressConfigurationError(QuietProgressError):
    """Required API configuration is missing or invalid."""


class QuietProgressAuthenticationError(QuietProgressError):
    """The API rejected the bot token."""


class QuietProgressTransportError(QuietProgressError):
    """The API could not be reached or returned an invalid response."""


class QuietProgressAPIError(QuietProgressError):
    def __init__(self, status: int, code: str) -> None:
        self.status = status
        self.code = code
        super().__init__(f"Quiet Progress API returned HTTP {status} ({code}).")


def is_complete(contact: dict[str, Any] | None) -> bool:
    """True when every registration field has been filled."""
    if not contact:
        return False
    return all(contact.get(field) not in (None, "") for field in CONTACT_FIELDS if field != "username")


class QuietProgressClient:
    def __init__(self, api_base: str = DEFAULT_QP_API, bot_token: str | None = None, timeout: float = 15) -> None:
        self.api_base = (api_base or "").strip().rstrip("/")
        self.bot_token = (bot_token or "").strip()
        self.timeout = timeout

        parsed = urlsplit(self.api_base)
        is_loopback = parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        if not self.api_base or (parsed.scheme != "https" and not is_loopback):
            raise QuietProgressConfigurationError("QP_API must be an HTTPS URL.")
        if not self.bot_token:
            raise QuietProgressConfigurationError("Set QP_BOT_TOKEN in the service environment.")

    @staticmethod
    def _error_code(payload: Any) -> str:
        candidate: Any = None
        if isinstance(payload, dict):
            error = payload.get("error")
            if isinstance(error, dict):
                candidate = error.get("code")
            elif isinstance(error, str):
                candidate = error
        if isinstance(candidate, str) and ERROR_CODE_PATTERN.fullmatch(candidate):
            return candidate
        return "api_error"

    def _send(self, method: str, path: str, payload: dict[str, Any] | None = None) -> tuple[int, Any]:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        headers = {"Accept": "application/json", "X-Bot-Token": self.bot_token}
        if data is not None:
            headers["Content-Type"] = "application/json"
        request = Request(f"{self.api_base}{path}", data=data, headers=headers, method=method.upper())

        try:
            with urlopen(request, timeout=self.timeout) as response:
                status = response.status
                raw = response.read(MAX_RESPONSE_BYTES + 1)
        except HTTPError as error:
            status = error.code
            raw = error.read(MAX_RESPONSE_BYTES + 1)
            error.close()
        except (URLError, TimeoutError, OSError):
            raise QuietProgressTransportError("Could not reach the Quiet Progress API.") from None

        if len(raw) > MAX_RESPONSE_BYTES:
            raise QuietProgressTransportError("Quiet Progress API response was too large.")
        if not raw:
            return status, None
        try:
            return status, json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise QuietProgressTransportError("Quiet Progress API returned invalid JSON.") from None

    def _check(self, status: int, response: Any) -> dict[str, Any]:
        if status == 401:
            raise QuietProgressAuthenticationError("Quiet Progress rejected the bot token (check QP_BOT_TOKEN).")
        if not 200 <= status < 300:
            raise QuietProgressAPIError(status, self._error_code(response))
        if not isinstance(response, dict):
            raise QuietProgressTransportError("Quiet Progress returned an invalid contact.")
        return response

    def get_contact(self, telegram_id: int) -> dict[str, Any] | None:
        """The saved registration for this Telegram user, or None if there is none yet."""
        if telegram_id <= 0:
            raise ValueError("Telegram ID must be positive.")
        status, response = self._send("GET", f"/bot/contacts/{telegram_id}")
        if status == 404:
            return None
        return self._check(status, response)

    def save_contact(self, telegram_id: int, **fields: Any) -> dict[str, Any]:
        """Create or update a registration; fields left out (or None) keep their saved value."""
        if telegram_id <= 0:
            raise ValueError("Telegram ID must be positive.")
        unknown = set(fields) - set(CONTACT_FIELDS)
        if unknown:
            raise ValueError(f"Unknown contact fields: {sorted(unknown)}")
        payload = {"telegram_id": telegram_id, **{k: v for k, v in fields.items() if v is not None}}
        status, response = self._send("POST", "/bot/contacts", payload)
        return self._check(status, response)

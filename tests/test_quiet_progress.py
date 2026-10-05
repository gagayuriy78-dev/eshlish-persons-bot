import json
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from quiet_progress import (
    QuietProgressAPIError,
    QuietProgressAuthenticationError,
    QuietProgressClient,
    QuietProgressConfigurationError,
    QuietProgressTransportError,
    is_complete,
)

BOT_TOKEN = "test-bot-token"


class FakeQuietProgressHandler(BaseHTTPRequestHandler):
    """Mimics POST/GET /api/bot/contacts of the Quiet Progress backend."""

    def log_message(self, _format, *_args):
        return

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self):
        if self.headers.get("X-Bot-Token") != BOT_TOKEN:
            self._send_json(401, {"error": {"code": "bad_bot_token", "message": "private"}})
            return False
        return True

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        payload = json.loads(self.rfile.read(length)) if length else None
        self.server.seen.append(("POST", self.path, payload))
        if not self._authorized():
            return
        if self.path != "/api/bot/contacts":
            self._send_json(404, {"error": {"code": "not_found"}})
            return
        if payload.get("age") is not None and not 1 <= payload["age"] <= 120:
            self._send_json(422, {"error": {"code": "validation_error"}})
            return
        contact = self.server.contacts.setdefault(payload["telegram_id"], {"telegram_id": payload["telegram_id"]})
        contact.update({k: v for k, v in payload.items() if v is not None})
        self._send_json(200, contact)

    def do_GET(self):
        self.server.seen.append(("GET", self.path, None))
        if not self._authorized():
            return
        if self.path.startswith("/api/bot/contacts/"):
            contact = self.server.contacts.get(int(self.path.rsplit("/", 1)[1]))
            if contact is None:
                self._send_json(404, {"error": {"code": "not_found"}})
            else:
                self._send_json(200, contact)
            return
        self._send_json(404, {"error": {"code": "not_found"}})


class QuietProgressClientTests(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeQuietProgressHandler)
        self.server.daemon_threads = True
        self.server.contacts = {}
        self.server.seen = []
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}/api"
        self.client = QuietProgressClient(api_base=self.base, bot_token=BOT_TOKEN)

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def test_unknown_user_is_none(self):
        self.assertIsNone(self.client.get_contact(555))

    def test_step_by_step_registration(self):
        self.client.save_contact(555, username="temur", phone="+998901112233")
        self.assertFalse(is_complete(self.client.get_contact(555)))
        self.client.save_contact(555, first_name="Temur", last_name="Aliyev", username=None)
        contact = self.client.save_contact(555, address="Toshkent", age=27)
        self.assertTrue(is_complete(contact))
        self.assertEqual(contact["username"], "temur")  # None fields are not sent, so nothing is erased
        self.assertEqual(self.server.seen[0], ("POST", "/api/bot/contacts",
                                               {"telegram_id": 555, "username": "temur", "phone": "+998901112233"}))

    def test_wrong_token_is_an_authentication_error(self):
        client = QuietProgressClient(api_base=self.base, bot_token="wrong")
        with self.assertRaises(QuietProgressAuthenticationError):
            client.get_contact(555)

    def test_validation_error_keeps_its_code(self):
        with self.assertRaises(QuietProgressAPIError) as ctx:
            self.client.save_contact(555, age=500)
        self.assertEqual((ctx.exception.status, ctx.exception.code), (422, "validation_error"))

    def test_unknown_fields_and_bad_ids_are_rejected_locally(self):
        with self.assertRaises(ValueError):
            self.client.save_contact(555, password="x")
        with self.assertRaises(ValueError):
            self.client.get_contact(0)
        self.assertEqual(self.server.seen, [])

    def test_configuration_is_checked(self):
        with self.assertRaises(QuietProgressConfigurationError):
            QuietProgressClient(api_base="http://example.com/api", bot_token=BOT_TOKEN)
        with self.assertRaises(QuietProgressConfigurationError):
            QuietProgressClient(api_base=self.base, bot_token="  ")

    def test_unreachable_api_is_a_transport_error(self):
        client = QuietProgressClient(api_base="http://127.0.0.1:9/api", bot_token=BOT_TOKEN, timeout=2)
        with self.assertRaises(QuietProgressTransportError):
            client.get_contact(555)


class IsCompleteTests(unittest.TestCase):
    def test_username_is_optional_everything_else_required(self):
        full = {"phone": "+1", "first_name": "A", "last_name": "B", "address": "C", "age": 20}
        self.assertTrue(is_complete(full))
        self.assertFalse(is_complete({**full, "age": None}))
        self.assertFalse(is_complete({**full, "address": ""}))
        self.assertFalse(is_complete(None))


if __name__ == "__main__":
    unittest.main()

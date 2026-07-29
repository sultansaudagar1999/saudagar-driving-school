"""
Local admin server for Saudagar Motor Driving School.

Serves the whole project as static files (so you can preview the public
site too) and adds a small JSON API under /api/ for the admin dashboard:

  POST /api/login             -> { username, password }            (public)
  POST /api/logout             -> clears the session                (public)
  POST /api/admin/save/<name>  -> overwrites data/<name>.json        (auth required)
  POST /api/admin/upload       -> saves a base64 image to images/gallery/  (auth required)

No third-party packages are used — only the Python standard library.
See README_ADMIN.md for setup instructions.
"""

import base64
import hashlib
import http.server
import json
import os
import secrets
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
GALLERY_DIR = ROOT / "images" / "gallery"
AUTH_FILE = Path(__file__).resolve().parent / "auth.json"

SESSION_COOKIE = "sms_admin_session"
SESSION_TTL_SECONDS = 8 * 60 * 60  # 8 hours
PBKDF2_ITERATIONS = 100_000

ALLOWED_DATA_FILES = {
    "hero", "about", "gallery", "testimonials", "faq", "fees", "contact",
}

# token -> expiry unix timestamp. In-memory only: restarting the server
# logs everyone out, which is fine for a single local admin tool.
sessions = {}


def hash_password(password, salt_hex):
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), PBKDF2_ITERATIONS
    ).hex()


def load_auth():
    if not AUTH_FILE.exists():
        return None
    return json.loads(AUTH_FILE.read_text(encoding="utf-8"))


def get_session_token(handler):
    cookie_header = handler.headers.get("Cookie", "")
    for part in cookie_header.split(";"):
        part = part.strip()
        if part.startswith(SESSION_COOKIE + "="):
            return part.split("=", 1)[1]
    return None


def is_authenticated(handler):
    token = get_session_token(handler)
    if not token:
        return False
    expiry = sessions.get(token)
    if not expiry or expiry < time.time():
        sessions.pop(token, None)
        return False
    return True


class AdminRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, obj, status=200, extra_headers=None):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(length) if length else b""
        if not raw:
            return {}
        return json.loads(raw)

    # ---- routing ----

    def do_GET(self):
        if urlparse(self.path).path == "/api/admin/ping":
            if is_authenticated(self):
                return self._send_json({"ok": True})
            return self._send_json({"error": "Not authenticated"}, 401)
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path

        if path == "/api/login":
            return self._handle_login()
        if path == "/api/logout":
            return self._handle_logout()
        if path.startswith("/api/admin/save/"):
            return self._handle_save(path[len("/api/admin/save/"):])
        if path == "/api/admin/upload":
            return self._handle_upload()

        self._send_json({"error": "Not found"}, 404)

    # ---- handlers ----

    def _handle_login(self):
        try:
            data = self._read_json_body()
        except (json.JSONDecodeError, ValueError):
            return self._send_json({"error": "Malformed request"}, 400)

        auth = load_auth()
        if not auth:
            return self._send_json(
                {"error": "No admin account exists yet. Run: python server/setup_admin.py"},
                500,
            )

        username = data.get("username", "")
        password = data.get("password", "")
        valid = username == auth["username"] and hash_password(password, auth["salt"]) == auth["hash"]

        if not valid:
            return self._send_json({"error": "Invalid username or password"}, 401)

        token = secrets.token_hex(32)
        sessions[token] = time.time() + SESSION_TTL_SECONDS
        cookie = f"{SESSION_COOKIE}={token}; HttpOnly; SameSite=Strict; Path=/"
        self._send_json({"ok": True}, extra_headers={"Set-Cookie": cookie})

    def _handle_logout(self):
        token = get_session_token(self)
        if token:
            sessions.pop(token, None)
        cookie = f"{SESSION_COOKIE}=; Path=/; Max-Age=0"
        self._send_json({"ok": True}, extra_headers={"Set-Cookie": cookie})

    def _handle_save(self, name):
        if not is_authenticated(self):
            return self._send_json({"error": "Not authenticated"}, 401)
        if name not in ALLOWED_DATA_FILES:
            return self._send_json({"error": "Unknown content file"}, 400)

        try:
            data = self._read_json_body()
        except (json.JSONDecodeError, ValueError):
            return self._send_json({"error": "Malformed JSON"}, 400)

        DATA_DIR.mkdir(parents=True, exist_ok=True)
        target = DATA_DIR / f"{name}.json"
        target.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        self._send_json({"ok": True})

    def _handle_upload(self):
        if not is_authenticated(self):
            return self._send_json({"error": "Not authenticated"}, 401)

        try:
            data = self._read_json_body()
        except (json.JSONDecodeError, ValueError):
            return self._send_json({"error": "Malformed request"}, 400)

        filename = data.get("filename") or "upload.jpg"
        raw_data_url = data.get("data") or ""
        if "," in raw_data_url:
            raw_data_url = raw_data_url.split(",", 1)[1]

        try:
            image_bytes = base64.b64decode(raw_data_url, validate=True)
        except (ValueError, base64.binascii.Error):
            return self._send_json({"error": "Invalid image data"}, 400)

        if len(image_bytes) > 8 * 1024 * 1024:
            return self._send_json({"error": "Image too large (max 8MB)"}, 400)

        safe_name = "".join(c for c in filename if c.isalnum() or c in "._-") or "upload.jpg"
        base, ext = os.path.splitext(safe_name)
        if ext.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            return self._send_json({"error": "Unsupported image type"}, 400)

        GALLERY_DIR.mkdir(parents=True, exist_ok=True)
        candidate = safe_name
        counter = 1
        while (GALLERY_DIR / candidate).exists():
            candidate = f"{base}-{counter}{ext}"
            counter += 1

        (GALLERY_DIR / candidate).write_bytes(image_bytes)
        self._send_json({"ok": True, "path": f"images/gallery/{candidate}"})


def main():
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Ignoring invalid port '{sys.argv[1]}', using {port}")

    if not AUTH_FILE.exists():
        print("No admin account found yet.")
        print("Run this first:  python server/setup_admin.py")
        sys.exit(1)

    address = ("127.0.0.1", port)
    httpd = http.server.ThreadingHTTPServer(address, AdminRequestHandler)
    print(f"Admin login:      http://127.0.0.1:{port}/admin/login.html")
    print(f"Public site:      http://127.0.0.1:{port}/index.html")
    print("Press Ctrl+C to stop.")
    print("This server is for local editing only — do not expose it to the internet.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()

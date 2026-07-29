"""
Run this once (or whenever you want to reset admin credentials):

    python server/setup_admin.py

It writes server/auth.json with your chosen username and a salted,
hashed password. The plain password is never stored or logged.
"""

import getpass
import hashlib
import json
import secrets
from pathlib import Path

AUTH_FILE = Path(__file__).resolve().parent / "auth.json"
PBKDF2_ITERATIONS = 100_000


def hash_password(password, salt_hex):
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), PBKDF2_ITERATIONS
    ).hex()


def prompt_username():
    username = input("Choose an admin username: ").strip()
    while not username:
        username = input("Username cannot be empty. Choose an admin username: ").strip()
    return username


def prompt_password():
    while True:
        password = getpass.getpass("Choose an admin password (min 6 characters): ")
        if len(password) < 6:
            print("Password must be at least 6 characters.\n")
            continue
        confirm = getpass.getpass("Confirm password: ")
        if password != confirm:
            print("Passwords do not match.\n")
            continue
        return password


def main():
    print("Saudagar Motor Driving School — admin account setup\n")

    if AUTH_FILE.exists():
        answer = input("An admin account already exists. Overwrite it? [y/N]: ").strip().lower()
        if answer != "y":
            print("Cancelled. Existing admin account unchanged.")
            return

    username = prompt_username()
    password = prompt_password()

    salt = secrets.token_hex(16)
    auth = {"username": username, "salt": salt, "hash": hash_password(password, salt)}

    AUTH_FILE.write_text(json.dumps(auth, indent=2), encoding="utf-8")
    print(f"\nSaved admin account to {AUTH_FILE}")
    print("Start the server with:  python server/server.py")


if __name__ == "__main__":
    main()

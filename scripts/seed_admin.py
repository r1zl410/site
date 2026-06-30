"""Idempotent seed script: ensures a test admin exists and prints a valid JWT.

Used for automated backend testing of admin-protected endpoints (which are
otherwise gated behind 2FA email verification).
"""
import os
import asyncio
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import jwt

ROOT_DIR = Path(__file__).resolve().parent.parent / "backend"
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ.get("JWT_SECRET", "r1zl410-beats-secret-key-2024")
JWT_ALGORITHM = "HS256"

ADMIN_ID = "test-admin-0000-0000-000000000001"
ADMIN_EMAIL = "test.admin@r1zl410.dev"
ADMIN_PASSWORD = "TestAdmin#2025"


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    await db.admins.update_one(
        {"id": ADMIN_ID},
        {"$set": {
            "id": ADMIN_ID,
            "email": ADMIN_EMAIL,
            "password": hashed,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    token = jwt.encode(
        {"admin_id": ADMIN_ID, "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )

    print("ADMIN_EMAIL:", ADMIN_EMAIL)
    print("ADMIN_PASSWORD:", ADMIN_PASSWORD)
    print("ADMIN_ID:", ADMIN_ID)
    print("JWT_TOKEN:", token)
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

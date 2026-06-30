from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import asyncio
import random
import string
from pathlib import Path
from pydantic import BaseModel, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import jwt
import bcrypt
import requests
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'r1zl410-beats-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# Object Storage Configuration
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = "r1zl410-beats"
storage_key = None

# PayPal Configuration
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')
PAYPAL_ME_USERNAME = os.environ.get('PAYPAL_ME_USERNAME', '')

# Email Configuration
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
resend.api_key = RESEND_API_KEY

# Public frontend base URL (used to build download links in emails).
# Derived from the first configured CORS origin.
FRONTEND_BASE = next(
    (o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',')
     if o.strip() and o.strip() != '*'),
    ''
)

# Secure download configuration
DOWNLOAD_EXPIRY_DAYS = 3
MAX_DOWNLOADS = 2
# Storage prefix for the untagged (paid) audio files. These must NEVER be
# served through the public /api/files endpoint.
PROTECTED_PREFIX = f"{APP_NAME}/full/"

# Rate limiting storage
login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# Verification codes storage (in production use Redis with TTL)
verification_codes = {}

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== SECURITY HELPERS ==============
def validate_password_strength(password: str) -> tuple:
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    return True, "Password is strong"

def check_rate_limit(identifier: str) -> tuple:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=LOCKOUT_MINUTES)
    login_attempts[identifier] = [t for t in login_attempts[identifier] if t > cutoff]
    if len(login_attempts[identifier]) >= MAX_LOGIN_ATTEMPTS:
        oldest = min(login_attempts[identifier])
        unlock_time = oldest + timedelta(minutes=LOCKOUT_MINUTES)
        seconds_left = int((unlock_time - now).total_seconds())
        return False, max(0, seconds_left)
    return True, 0

def record_login_attempt(identifier: str):
    login_attempts[identifier].append(datetime.now(timezone.utc))

def clear_login_attempts(identifier: str):
    login_attempts[identifier] = []

def generate_verification_code() -> str:
    return ''.join(random.choices(string.digits, k=6))

async def send_verification_email(email: str, code: str) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set")
        return False
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #000; text-align: center;">r1zl410</h2>
        <p style="color: #666; text-align: center;">Il tuo codice di verifica:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 10px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #000;">{code}</span>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
            Questo codice scade tra 10 minuti.<br>
            Se non hai richiesto questo codice, ignora questa email.
        </p>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [email],
        "subject": f"r1zl410 - Codice di verifica: {code}",
        "html": html_content
    }
    
    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Verification email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False

async def send_download_email(email: str, beat_title: str, license_label: str, download_url: str) -> bool:
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set")
        return False

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #000; text-align: center;">r1zl410</h2>
        <p style="color: #333;">Grazie per il tuo acquisto! Il tuo pagamento e' stato confermato.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0; color: #000; font-weight: bold;">{beat_title}</p>
            <p style="margin: 0; color: #666;">Licenza: {license_label}</p>
        </div>
        <div style="text-align: center; margin: 28px 0;">
            <a href="{download_url}" style="background: #000; color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">Scarica il tuo file</a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
            Il link scade tra {DOWNLOAD_EXPIRY_DAYS} giorni e consente fino a {MAX_DOWNLOADS} download.<br>
            Non condividere questo link con altri.
        </p>
    </div>
    """

    params = {
        "from": SENDER_EMAIL,
        "to": [email],
        "subject": f"r1zl410 - Il tuo download: {beat_title}",
        "html": html_content
    }

    try:
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Download email sent to {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send download email: {e}")
        return False

# ============== OBJECT STORAGE ==============
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set")
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ============== MODELS ==============
class AdminCreate(BaseModel):
    email: str
    password: str
    
    @validator('email')
    def validate_email(cls, v):
        if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', v):
            raise ValueError('Invalid email format')
        return v.lower()

class AdminLogin(BaseModel):
    email: str
    password: str

class VerifyCode(BaseModel):
    email: str
    code: str

class BeatResponse(BaseModel):
    id: str
    title: str
    bpm: Optional[str] = "140"
    key: Optional[str] = "C Minor"
    cover_path: str = ""
    audio_path: str = ""
    cover_url: Optional[str] = None
    audio_url: Optional[str] = None
    price_mp3: float
    price_wav: float
    price_stems: float
    is_sold: bool
    created_at: str

class PackResponse(BaseModel):
    id: str
    title: str
    description: str = ""
    cover_path: str = ""
    cover_url: Optional[str] = None
    price: float
    created_at: str

class PaymentCreate(BaseModel):
    beat_id: str
    price_type: str
    paypal_order_id: str

# ============== AUTH HELPERS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(admin_id: str) -> str:
    payload = {
        'admin_id': admin_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    admin = await db.admins.find_one({"id": payload['admin_id']}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

# ============== AUTH ROUTES ==============
@api_router.post("/admin/register")
async def register_admin(data: AdminCreate):
    existing = await db.admins.find_one({})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists. Only one admin allowed.")
    
    is_valid, message = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": data.email,
        "password": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    
    # Send verification code
    code = generate_verification_code()
    verification_codes[data.email] = {
        "code": code,
        "admin_id": admin_id,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    
    email_sent = await send_verification_email(data.email, code)
    
    return {
        "message": "Account created. Check your email for verification code.",
        "email_sent": email_sent,
        "requires_verification": True
    }

@api_router.post("/admin/login")
async def login_admin(data: AdminLogin, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{data.email}:{client_ip}"
    
    is_allowed, seconds_left = check_rate_limit(identifier)
    if not is_allowed:
        raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {seconds_left} seconds.")
    
    admin = await db.admins.find_one({"email": data.email.lower()}, {"_id": 0})
    
    if not admin or not verify_password(data.password, admin["password"]):
        record_login_attempt(identifier)
        attempts_left = MAX_LOGIN_ATTEMPTS - len(login_attempts[identifier])
        raise HTTPException(status_code=401, detail=f"Invalid credentials. {attempts_left} attempts remaining.")
    
    # Send verification code
    code = generate_verification_code()
    verification_codes[data.email.lower()] = {
        "code": code,
        "admin_id": admin["id"],
        "expires": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    
    email_sent = await send_verification_email(data.email, code)
    
    return {
        "message": "Verification code sent to your email",
        "email_sent": email_sent,
        "requires_verification": True
    }

@api_router.post("/admin/verify")
async def verify_admin_code(data: VerifyCode, request: Request):
    email = data.email.lower()
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{email}:{client_ip}"
    
    stored = verification_codes.get(email)
    if not stored:
        raise HTTPException(status_code=400, detail="No verification code found. Please login again.")
    
    if datetime.now(timezone.utc) > stored["expires"]:
        del verification_codes[email]
        raise HTTPException(status_code=400, detail="Code expired. Please login again.")
    
    if stored["code"] != data.code:
        record_login_attempt(identifier)
        raise HTTPException(status_code=401, detail="Invalid verification code")
    
    # Clear everything on success
    del verification_codes[email]
    clear_login_attempts(identifier)
    
    # Update last login
    await db.admins.update_one(
        {"id": stored["admin_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    token = create_token(stored["admin_id"])
    return {"token": token, "message": "Login successful"}

@api_router.get("/admin/check")
async def check_admin_exists():
    existing = await db.admins.find_one({})
    return {"exists": existing is not None}

@api_router.get("/admin/me")
async def get_admin_profile(admin: dict = Depends(get_current_admin)):
    return {"email": admin["email"], "id": admin["id"]}

# ============== BEAT ROUTES ==============
@api_router.get("/beats", response_model=List[BeatResponse])
async def get_beats():
    beats = await db.beats.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return beats

@api_router.get("/beats/{beat_id}", response_model=BeatResponse)
async def get_beat(beat_id: str):
    beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    return beat

@api_router.post("/beats", response_model=BeatResponse)
async def create_beat(
    title: str = Form(...),
    bpm: str = Form("140"),
    key: str = Form("C Minor"),
    price_mp3: float = Form(24.99),
    price_wav: float = Form(39.99),
    price_stems: float = Form(99.99),
    cover: UploadFile = File(...),
    audio: UploadFile = File(...),
    audio_untagged: UploadFile = File(None),
    admin: dict = Depends(get_current_admin)
):
    beat_id = str(uuid.uuid4())
    
    cover_ext = cover.filename.split(".")[-1] if "." in cover.filename else "jpg"
    cover_path = f"{APP_NAME}/covers/{beat_id}.{cover_ext}"
    cover_data = await cover.read()
    put_object(cover_path, cover_data, cover.content_type or "image/jpeg")
    
    # Tagged (public preview) audio
    audio_ext = audio.filename.split(".")[-1] if "." in audio.filename else "mp3"
    audio_path = f"{APP_NAME}/audio/{beat_id}.{audio_ext}"
    audio_data = await audio.read()
    put_object(audio_path, audio_data, audio.content_type or "audio/mpeg")
    
    # Untagged (paid / full) audio - stored under protected prefix, never public
    full_audio_path = ""
    if audio_untagged:
        full_ext = audio_untagged.filename.split(".")[-1] if "." in audio_untagged.filename else "mp3"
        full_audio_path = f"{APP_NAME}/full/{beat_id}.{full_ext}"
        full_data = await audio_untagged.read()
        put_object(full_audio_path, full_data, audio_untagged.content_type or "audio/mpeg")
    
    beat_doc = {
        "id": beat_id,
        "title": title,
        "bpm": bpm,
        "key": key,
        "cover_path": cover_path,
        "audio_path": audio_path,
        "full_audio_path": full_audio_path,
        "price_mp3": float(price_mp3),
        "price_wav": float(price_wav),
        "price_stems": float(price_stems),
        "is_sold": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.beats.insert_one(beat_doc)
    return beat_doc

@api_router.put("/beats/{beat_id}")
async def update_beat(
    beat_id: str,
    title: str = Form(None),
    bpm: str = Form(None),
    key: str = Form(None),
    price_mp3: float = Form(None),
    price_wav: float = Form(None),
    price_stems: float = Form(None),
    cover: UploadFile = File(None),
    audio: UploadFile = File(None),
    audio_untagged: UploadFile = File(None),
    admin: dict = Depends(get_current_admin)
):
    beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    update_data = {}
    if title: update_data["title"] = title
    if bpm: update_data["bpm"] = bpm
    if key: update_data["key"] = key
    if price_mp3 is not None: update_data["price_mp3"] = float(price_mp3)
    if price_wav is not None: update_data["price_wav"] = float(price_wav)
    if price_stems is not None: update_data["price_stems"] = float(price_stems)
    
    if cover:
        cover_ext = cover.filename.split(".")[-1] if "." in cover.filename else "jpg"
        cover_path = f"{APP_NAME}/covers/{beat_id}.{cover_ext}"
        cover_data = await cover.read()
        put_object(cover_path, cover_data, cover.content_type or "image/jpeg")
        update_data["cover_path"] = cover_path
    
    if audio:
        audio_ext = audio.filename.split(".")[-1] if "." in audio.filename else "mp3"
        audio_path = f"{APP_NAME}/audio/{beat_id}.{audio_ext}"
        audio_data = await audio.read()
        put_object(audio_path, audio_data, audio.content_type or "audio/mpeg")
        update_data["audio_path"] = audio_path

    if audio_untagged:
        full_ext = audio_untagged.filename.split(".")[-1] if "." in audio_untagged.filename else "mp3"
        full_audio_path = f"{APP_NAME}/full/{beat_id}.{full_ext}"
        full_data = await audio_untagged.read()
        put_object(full_audio_path, full_data, audio_untagged.content_type or "audio/mpeg")
        update_data["full_audio_path"] = full_audio_path
    
    if update_data:
        await db.beats.update_one({"id": beat_id}, {"$set": update_data})
    
    updated = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    return updated

@api_router.delete("/beats/{beat_id}")
async def delete_beat(beat_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.beats.delete_one({"id": beat_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Beat not found")
    return {"message": "Beat deleted"}

# ============== PACKS ROUTES ==============
@api_router.get("/packs", response_model=List[PackResponse])
async def get_packs():
    packs = await db.packs.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return packs

@api_router.get("/packs/{pack_id}", response_model=PackResponse)
async def get_pack(pack_id: str):
    pack = await db.packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    return pack

@api_router.post("/packs", response_model=PackResponse)
async def create_pack(
    title: str = Form(...),
    description: str = Form(""),
    price: float = Form(29.99),
    cover: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    pack_id = str(uuid.uuid4())
    
    cover_ext = cover.filename.split(".")[-1] if "." in cover.filename else "jpg"
    cover_path = f"{APP_NAME}/packs/{pack_id}.{cover_ext}"
    cover_data = await cover.read()
    put_object(cover_path, cover_data, cover.content_type or "image/jpeg")
    
    pack_doc = {
        "id": pack_id,
        "title": title,
        "description": description,
        "cover_path": cover_path,
        "price": float(price),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.packs.insert_one(pack_doc)
    return pack_doc

@api_router.put("/packs/{pack_id}")
async def update_pack(
    pack_id: str,
    title: str = Form(None),
    description: str = Form(None),
    price: float = Form(None),
    cover: UploadFile = File(None),
    admin: dict = Depends(get_current_admin)
):
    pack = await db.packs.find_one({"id": pack_id}, {"_id": 0})
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    
    update_data = {}
    if title: update_data["title"] = title
    if description is not None: update_data["description"] = description
    if price is not None: update_data["price"] = float(price)
    
    if cover:
        cover_ext = cover.filename.split(".")[-1] if "." in cover.filename else "jpg"
        cover_path = f"{APP_NAME}/packs/{pack_id}.{cover_ext}"
        cover_data = await cover.read()
        put_object(cover_path, cover_data, cover.content_type or "image/jpeg")
        update_data["cover_path"] = cover_path
    
    if update_data:
        await db.packs.update_one({"id": pack_id}, {"$set": update_data})
    
    updated = await db.packs.find_one({"id": pack_id}, {"_id": 0})
    return updated

@api_router.delete("/packs/{pack_id}")
async def delete_pack(pack_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.packs.delete_one({"id": pack_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pack not found")
    return {"message": "Pack deleted"}

# ============== FILE SERVING ==============
@api_router.get("/files/{file_path:path}")
async def serve_file(file_path: str):
    # Never serve the untagged/paid files through the public endpoint.
    normalized = file_path.lstrip("/")
    if normalized.startswith(PROTECTED_PREFIX) or "/full/" in f"/{normalized}":
        raise HTTPException(status_code=403, detail="Forbidden")
    # Basic path-traversal guard
    if ".." in normalized:
        raise HTTPException(status_code=400, detail="Invalid path")
    try:
        data, content_type = get_object(normalized)
        from fastapi import Response
        return Response(content=data, media_type=content_type)
    except Exception as e:
        logger.error(f"File serve error: {e}")
        raise HTTPException(status_code=404, detail="File not found")

# ============== PAYPAL ROUTES ==============
@api_router.get("/paypal/client-id")
async def get_paypal_client_id():
    return {"client_id": PAYPAL_CLIENT_ID}

@api_router.get("/paypal/config")
async def get_paypal_config():
    return {
        "client_id": PAYPAL_CLIENT_ID,
        "paypal_me_username": PAYPAL_ME_USERNAME,
        "use_paypal_me": bool(PAYPAL_ME_USERNAME and not PAYPAL_CLIENT_ID)
    }

LICENSE_LABELS = {"mp3": "MP3 Lease", "wav": "WAV Lease", "stems": "Stems (Trackout)"}

@api_router.post("/payments/record-manual")
async def record_manual_payment(beat_id: str, price_type: str, buyer_email: str):
    if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', buyer_email or ""):
        raise HTTPException(status_code=400, detail="Valid email required")

    beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    price_map = {"mp3": beat["price_mp3"], "wav": beat["price_wav"], "stems": beat["price_stems"]}
    price = price_map.get(price_type, beat["price_mp3"])
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "beat_id": beat_id,
        "beat_title": beat.get("title", ""),
        "price_type": price_type,
        "license_label": LICENSE_LABELS.get(price_type, price_type),
        "amount": price,
        "payment_method": "paypal_me",
        "buyer_email": buyer_email.lower(),
        "status": "pending_confirmation",
        "download_token": None,
        "download_count": 0,
        "token_expires": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    return {"payment_id": payment_id, "status": "pending_confirmation"}

@api_router.post("/payments/{payment_id}/confirm")
async def confirm_payment(payment_id: str, admin: dict = Depends(get_current_admin)):
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if not payment.get("buyer_email"):
        raise HTTPException(status_code=400, detail="Payment has no buyer email")

    beat = await db.beats.find_one({"id": payment["beat_id"]}, {"_id": 0})
    if not beat or not beat.get("full_audio_path"):
        raise HTTPException(status_code=400, detail="Untagged file not available for this beat")

    token = str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + timedelta(days=DOWNLOAD_EXPIRY_DAYS)
    await db.payments.update_one(
        {"id": payment_id},
        {"$set": {
            "status": "confirmed",
            "download_token": token,
            "download_count": 0,
            "token_expires": expires.isoformat(),
            "confirmed_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    download_url = f"{FRONTEND_BASE}/download/{token}"
    email_sent = await send_download_email(
        payment["buyer_email"],
        payment.get("beat_title", "Beat"),
        payment.get("license_label", payment.get("price_type", "")),
        download_url
    )
    return {"status": "confirmed", "email_sent": email_sent, "download_token": token}

@api_router.get("/download/{token}/info")
async def download_info(token: str):
    payment = await db.payments.find_one({"download_token": token}, {"_id": 0})
    if not payment or payment.get("status") != "confirmed":
        return {"valid": False, "reason": "not_found"}

    expires = payment.get("token_expires")
    if expires and datetime.now(timezone.utc) > datetime.fromisoformat(expires):
        return {"valid": False, "reason": "expired"}

    downloads_left = MAX_DOWNLOADS - payment.get("download_count", 0)
    if downloads_left <= 0:
        return {"valid": False, "reason": "limit_reached"}

    return {
        "valid": True,
        "beat_title": payment.get("beat_title", ""),
        "license_label": payment.get("license_label", payment.get("price_type", "")),
        "expires_at": expires,
        "downloads_left": downloads_left
    }

@api_router.get("/download/{token}")
async def download_file(token: str):
    payment = await db.payments.find_one({"download_token": token}, {"_id": 0})
    if not payment or payment.get("status") != "confirmed":
        raise HTTPException(status_code=404, detail="Invalid download link")

    expires = payment.get("token_expires")
    if expires and datetime.now(timezone.utc) > datetime.fromisoformat(expires):
        raise HTTPException(status_code=410, detail="Download link expired")

    if payment.get("download_count", 0) >= MAX_DOWNLOADS:
        raise HTTPException(status_code=410, detail="Download limit reached")

    beat = await db.beats.find_one({"id": payment["beat_id"]}, {"_id": 0})
    if not beat or not beat.get("full_audio_path"):
        raise HTTPException(status_code=404, detail="File not available")

    try:
        data, content_type = get_object(beat["full_audio_path"])
    except Exception as e:
        logger.error(f"Download serve error: {e}")
        raise HTTPException(status_code=404, detail="File not found")

    # Count this download
    await db.payments.update_one({"id": payment["id"]}, {"$inc": {"download_count": 1}})

    from fastapi import Response
    ext = beat["full_audio_path"].split(".")[-1]
    safe_title = re.sub(r'[^A-Za-z0-9_-]+', '_', beat.get("title", "beat")) or "beat"
    filename = f"{safe_title}.{ext}"
    return Response(
        content=data,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@api_router.get("/payments")
async def get_payments(admin: dict = Depends(get_current_admin)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

# ============== STATS ==============
@api_router.get("/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    total_beats = await db.beats.count_documents({})
    total_packs = await db.packs.count_documents({})
    total_payments = await db.payments.count_documents({})
    
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    result = await db.payments.aggregate(pipeline).to_list(1)
    total_revenue = result[0]["total"] if result else 0
    
    return {
        "total_beats": total_beats,
        "total_packs": total_packs,
        "total_payments": total_payments,
        "total_revenue": total_revenue
    }

# ============== HEALTH CHECK ==============
@api_router.get("/")
async def root():
    return {"message": "r1zl410 Beats API", "version": "3.0"}

app.include_router(api_router)

# Restrict CORS to explicitly configured origins.
# Note: combining a wildcard ("*") with allow_credentials=True is insecure/invalid,
# so we only enable credentials when specific origins are configured.
_cors_origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()]
_allow_credentials = True
if not _cors_origins or "*" in _cors_origins:
    _cors_origins = ["*"]
    _allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_credentials=_allow_credentials,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init on startup failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

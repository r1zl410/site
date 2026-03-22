from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Header, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import io
import base64
from pathlib import Path
from pydantic import BaseModel, Field, validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import jwt
import bcrypt
import requests
import pyotp
import qrcode

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

# PayPal Configuration (supports PayPal.me for personal accounts)
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', '')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', '')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')
PAYPAL_ME_USERNAME = os.environ.get('PAYPAL_ME_USERNAME', '')  # Your PayPal.me username

# Rate limiting storage (in production use Redis)
login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== SECURITY HELPERS ==============
def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character (!@#$%^&*)"
    return True, "Password is strong"

def check_rate_limit(identifier: str) -> tuple[bool, int]:
    """Check if identifier is rate limited. Returns (is_allowed, seconds_until_unlock)"""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=LOCKOUT_MINUTES)
    
    # Clean old attempts
    login_attempts[identifier] = [t for t in login_attempts[identifier] if t > cutoff]
    
    if len(login_attempts[identifier]) >= MAX_LOGIN_ATTEMPTS:
        oldest = min(login_attempts[identifier])
        unlock_time = oldest + timedelta(minutes=LOCKOUT_MINUTES)
        seconds_left = int((unlock_time - now).total_seconds())
        return False, max(0, seconds_left)
    
    return True, 0

def record_login_attempt(identifier: str):
    """Record a failed login attempt"""
    login_attempts[identifier].append(datetime.now(timezone.utc))

def clear_login_attempts(identifier: str):
    """Clear login attempts after successful login"""
    login_attempts[identifier] = []

def generate_2fa_secret() -> str:
    """Generate a new 2FA secret"""
    return pyotp.random_base32()

def generate_2fa_qr(secret: str, email: str) -> str:
    """Generate QR code for 2FA setup, returns base64 image"""
    totp = pyotp.TOTP(secret)
    uri = totp.provisioning_uri(name=email, issuer_name="r1zl410 Beats")
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode('utf-8')

def verify_2fa_code(secret: str, code: str) -> bool:
    """Verify a 2FA code"""
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)  # Allow 30 second window

# ============== OBJECT STORAGE ==============
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set, file uploads will fail")
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
    totp_code: Optional[str] = None

class TwoFactorSetup(BaseModel):
    totp_code: str

class TwoFactorVerify(BaseModel):
    email: str
    password: str
    totp_code: str

class BeatCreate(BaseModel):
    title: str
    price_mp3: float = 29.99
    price_wav: float = 49.99
    price_stems: float = 99.99

class BeatResponse(BaseModel):
    id: str
    title: str
    cover_path: str = ""
    audio_path: str = ""
    cover_url: Optional[str] = None
    audio_url: Optional[str] = None
    price_mp3: float
    price_wav: float
    price_stems: float
    is_sold: bool
    created_at: str

class PaymentCreate(BaseModel):
    beat_id: str
    price_type: str  # mp3, wav, stems
    paypal_order_id: str

# ============== AUTH HELPERS ==============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(admin_id: str, is_2fa_verified: bool = True) -> str:
    payload = {
        'admin_id': admin_id,
        '2fa_verified': is_2fa_verified,
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
    if not payload.get('2fa_verified', False):
        raise HTTPException(status_code=401, detail="2FA verification required")
    admin = await db.admins.find_one({"id": payload['admin_id']}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

# ============== AUTH ROUTES ==============
@api_router.post("/admin/register")
async def register_admin(data: AdminCreate, request: Request):
    """Register admin with strong password - returns 2FA setup QR code"""
    # Check if any admin exists
    existing = await db.admins.find_one({})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists. Only one admin allowed.")
    
    # Validate password strength
    is_valid, message = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Generate 2FA secret
    totp_secret = generate_2fa_secret()
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": data.email,
        "password": hash_password(data.password),
        "totp_secret": totp_secret,
        "totp_enabled": False,  # Will be enabled after first verification
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None,
        "login_ip": request.client.host if request.client else None
    }
    await db.admins.insert_one(admin_doc)
    
    # Generate QR code for 2FA setup
    qr_code = generate_2fa_qr(totp_secret, data.email)
    
    # Create temporary token (not fully authenticated until 2FA setup)
    temp_token = create_token(admin_id, is_2fa_verified=False)
    
    return {
        "message": "Account created. Please set up 2FA using the QR code.",
        "temp_token": temp_token,
        "qr_code": qr_code,
        "manual_code": totp_secret,
        "requires_2fa_setup": True
    }

@api_router.post("/admin/verify-2fa-setup")
async def verify_2fa_setup(data: TwoFactorSetup, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify 2FA setup with initial code"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    admin = await db.admins.find_one({"id": payload['admin_id']}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    
    if admin.get('totp_enabled'):
        raise HTTPException(status_code=400, detail="2FA already enabled")
    
    # Verify the code
    if not verify_2fa_code(admin['totp_secret'], data.totp_code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code. Please try again.")
    
    # Enable 2FA
    await db.admins.update_one(
        {"id": admin['id']},
        {"$set": {"totp_enabled": True}}
    )
    
    # Create fully authenticated token
    token = create_token(admin['id'], is_2fa_verified=True)
    
    return {
        "message": "2FA setup complete! Your account is now secure.",
        "token": token
    }

@api_router.post("/admin/login")
async def login_admin(data: AdminLogin, request: Request):
    """Login with email, password, and 2FA code"""
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{data.email}:{client_ip}"
    
    # Check rate limit
    is_allowed, seconds_left = check_rate_limit(identifier)
    if not is_allowed:
        raise HTTPException(
            status_code=429, 
            detail=f"Too many login attempts. Please try again in {seconds_left} seconds."
        )
    
    admin = await db.admins.find_one({"email": data.email.lower()}, {"_id": 0})
    
    if not admin or not verify_password(data.password, admin["password"]):
        record_login_attempt(identifier)
        attempts_left = MAX_LOGIN_ATTEMPTS - len(login_attempts[identifier])
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid credentials. {attempts_left} attempts remaining."
        )
    
    # Check if 2FA is enabled
    if admin.get('totp_enabled'):
        if not data.totp_code:
            raise HTTPException(status_code=400, detail="2FA code required")
        
        if not verify_2fa_code(admin['totp_secret'], data.totp_code):
            record_login_attempt(identifier)
            raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    # Clear rate limit on successful login
    clear_login_attempts(identifier)
    
    # Update last login
    await db.admins.update_one(
        {"id": admin['id']},
        {"$set": {
            "last_login": datetime.now(timezone.utc).isoformat(),
            "login_ip": client_ip
        }}
    )
    
    token = create_token(admin["id"], is_2fa_verified=True)
    
    return {
        "token": token, 
        "admin_id": admin["id"],
        "message": "Login successful"
    }

@api_router.get("/admin/check")
async def check_admin_exists():
    existing = await db.admins.find_one({})
    return {"exists": existing is not None}

@api_router.get("/admin/me")
async def get_admin_profile(admin: dict = Depends(get_current_admin)):
    return {
        "email": admin["email"], 
        "id": admin["id"],
        "totp_enabled": admin.get("totp_enabled", False),
        "last_login": admin.get("last_login"),
        "created_at": admin.get("created_at")
    }

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
    title: str = File(...),
    price_mp3: float = File(29.99),
    price_wav: float = File(49.99),
    price_stems: float = File(99.99),
    cover: UploadFile = File(...),
    audio: UploadFile = File(...),
    admin: dict = Depends(get_current_admin)
):
    beat_id = str(uuid.uuid4())
    
    # Upload cover image
    cover_ext = cover.filename.split(".")[-1] if "." in cover.filename else "jpg"
    cover_path = f"{APP_NAME}/covers/{beat_id}.{cover_ext}"
    cover_data = await cover.read()
    put_object(cover_path, cover_data, cover.content_type or "image/jpeg")
    
    # Upload audio file
    audio_ext = audio.filename.split(".")[-1] if "." in audio.filename else "mp3"
    audio_path = f"{APP_NAME}/audio/{beat_id}.{audio_ext}"
    audio_data = await audio.read()
    put_object(audio_path, audio_data, audio.content_type or "audio/mpeg")
    
    beat_doc = {
        "id": beat_id,
        "title": title,
        "cover_path": cover_path,
        "audio_path": audio_path,
        "price_mp3": float(price_mp3),
        "price_wav": float(price_wav),
        "price_stems": float(price_stems),
        "is_sold": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.beats.insert_one(beat_doc)
    return beat_doc

@api_router.delete("/beats/{beat_id}")
async def delete_beat(beat_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.beats.delete_one({"id": beat_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Beat not found")
    return {"message": "Beat deleted"}

# ============== FILE SERVING ==============
@api_router.get("/files/{file_path:path}")
async def serve_file(file_path: str):
    try:
        data, content_type = get_object(file_path)
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
    """Get PayPal configuration - supports both API and PayPal.me"""
    return {
        "client_id": PAYPAL_CLIENT_ID,
        "paypal_me_username": PAYPAL_ME_USERNAME,
        "use_paypal_me": bool(PAYPAL_ME_USERNAME and not PAYPAL_CLIENT_ID)
    }

@api_router.post("/payments/create")
async def create_payment(data: PaymentCreate):
    beat = await db.beats.find_one({"id": data.beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    # Get price based on type
    price_map = {
        "mp3": beat["price_mp3"],
        "wav": beat["price_wav"],
        "stems": beat["price_stems"]
    }
    price = price_map.get(data.price_type, beat["price_mp3"])
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "beat_id": data.beat_id,
        "beat_title": beat.get("title", ""),
        "price_type": data.price_type,
        "amount": price,
        "paypal_order_id": data.paypal_order_id,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    return {"payment_id": payment_id, "status": "completed"}

@api_router.post("/payments/record-manual")
async def record_manual_payment(
    beat_id: str,
    price_type: str,
    buyer_email: Optional[str] = None
):
    """Record a payment made via PayPal.me (manual confirmation)"""
    beat = await db.beats.find_one({"id": beat_id}, {"_id": 0})
    if not beat:
        raise HTTPException(status_code=404, detail="Beat not found")
    
    price_map = {
        "mp3": beat["price_mp3"],
        "wav": beat["price_wav"],
        "stems": beat["price_stems"]
    }
    price = price_map.get(price_type, beat["price_mp3"])
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "beat_id": beat_id,
        "beat_title": beat.get("title", ""),
        "price_type": price_type,
        "amount": price,
        "payment_method": "paypal_me",
        "buyer_email": buyer_email,
        "status": "pending_confirmation",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    return {"payment_id": payment_id, "status": "pending_confirmation"}

@api_router.get("/payments", response_model=List[dict])
async def get_payments(admin: dict = Depends(get_current_admin)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

# ============== STATS ==============
@api_router.get("/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    total_beats = await db.beats.count_documents({})
    total_payments = await db.payments.count_documents({})
    
    # Use aggregation for better performance
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]
    result = await db.payments.aggregate(pipeline).to_list(1)
    total_revenue = result[0]["total"] if result else 0
    
    return {
        "total_beats": total_beats,
        "total_payments": total_payments,
        "total_revenue": total_revenue
    }

# ============== HEALTH CHECK ==============
@api_router.get("/")
async def root():
    return {"message": "r1zl410 Beats API", "version": "2.0", "security": "2FA enabled"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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

from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Header, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import requests

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

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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

class AdminLogin(BaseModel):
    email: str
    password: str

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

def create_token(admin_id: str) -> str:
    payload = {
        'admin_id': admin_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get('admin_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    admin_id = verify_token(credentials.credentials)
    if not admin_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    admin = await db.admins.find_one({"id": admin_id}, {"_id": 0})
    if not admin:
        raise HTTPException(status_code=401, detail="Admin not found")
    return admin

# ============== AUTH ROUTES ==============
@api_router.post("/admin/register")
async def register_admin(data: AdminCreate):
    # Check if any admin exists
    existing = await db.admins.find_one({})
    if existing:
        raise HTTPException(status_code=400, detail="Admin already exists. Only one admin allowed.")
    
    admin_id = str(uuid.uuid4())
    admin_doc = {
        "id": admin_id,
        "email": data.email,
        "password": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admins.insert_one(admin_doc)
    token = create_token(admin_id)
    return {"token": token, "admin_id": admin_id}

@api_router.post("/admin/login")
async def login_admin(data: AdminLogin):
    admin = await db.admins.find_one({"email": data.email}, {"_id": 0})
    if not admin or not verify_password(data.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(admin["id"])
    return {"token": token, "admin_id": admin["id"]}

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
        "price_type": data.price_type,
        "amount": price,
        "paypal_order_id": data.paypal_order_id,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    # Mark beat as sold (optional - you might want to allow multiple sales)
    # await db.beats.update_one({"id": data.beat_id}, {"$set": {"is_sold": True}})
    
    return {"payment_id": payment_id, "status": "completed"}

@api_router.get("/payments", response_model=List[dict])
async def get_payments(admin: dict = Depends(get_current_admin)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return payments

# ============== STATS ==============
@api_router.get("/stats")
async def get_stats(admin: dict = Depends(get_current_admin)):
    total_beats = await db.beats.count_documents({})
    total_payments = await db.payments.count_documents({})
    total_revenue = 0
    payments = await db.payments.find({}, {"_id": 0, "amount": 1}).to_list(1000)
    for p in payments:
        total_revenue += p.get("amount", 0)
    return {
        "total_beats": total_beats,
        "total_payments": total_payments,
        "total_revenue": total_revenue
    }

# ============== HEALTH CHECK ==============
@api_router.get("/")
async def root():
    return {"message": "r1zl410 Beats API"}

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

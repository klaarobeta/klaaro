import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from contextlib import asynccontextmanager

load_dotenv()

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "aiml_platform")

db_client = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client, db
    db_client = AsyncIOMotorClient(MONGO_URL)
    db = db_client[DB_NAME]
    print(f"Connected to MongoDB: {DB_NAME}")
    yield
    db_client.close()
    print("Disconnected from MongoDB")

app = FastAPI(
    title="AI/ML Platform API",
    description="Backend API for AI/ML Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers
from routes.dataset import router as dataset_router
app.include_router(dataset_router, prefix="/api/datasets", tags=["datasets"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "AI/ML Platform API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

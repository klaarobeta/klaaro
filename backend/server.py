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
    
    # Pass db to dataset router
    from routes import dataset as dataset_module
    from routes import preprocessing as preprocessing_module
    from routes import project as project_module
    from routes import analysis as analysis_module
    from routes import preprocessing_pipeline as pipeline_module
    dataset_module.db = db
    preprocessing_module.db = db
    project_module.db = db
    analysis_module.db = db
    pipeline_module.db = db
    
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
from routes.preprocessing import router as preprocessing_router
from routes.project import router as project_router
from routes.analysis import router as analysis_router
from routes.preprocessing_pipeline import router as pipeline_router

app.include_router(dataset_router, prefix="/api/datasets", tags=["datasets"])
app.include_router(preprocessing_router, prefix="/api/datasets", tags=["preprocessing"])
app.include_router(project_router, prefix="/api/projects", tags=["projects"])
app.include_router(analysis_router, prefix="/api/analysis", tags=["analysis"])
app.include_router(pipeline_router, prefix="/api/preprocessing", tags=["preprocessing-pipeline"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "AI/ML Platform API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

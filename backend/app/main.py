import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

from app.core.config import settings
from app.core.database import init_db
from app.api.chat import router as chat_router
from app.api.leads import router as leads_router
from app.api.hitl import router as hitl_router
from app.api.feedback import router as feedback_router

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s - [%(levelname)s] - %(name)s: %(message)s"
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Initializing database schemas...")
    init_db()
    logger.info(f"{settings.APP_NAME} v{settings.APP_VERSION} started successfully.")
    yield
    logger.info("Shutting down application...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Asesor Automotriz Virtual (Luis) - Migración Agéntica con Google Gen AI SDK y OpenTelemetry",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instrument FastAPI with OpenTelemetry
FastAPIInstrumentor.instrument_app(app)

# Ensure DB tables are created
init_db()

# Include API Routers
app.include_router(chat_router, prefix="/api/v1")
app.include_router(leads_router, prefix="/api/v1")
app.include_router(hitl_router, prefix="/api/v1")
app.include_router(feedback_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
def healthcheck():
    """Service health verification endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "default_model": settings.DEFAULT_MODEL
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

from fastapi import APIRouter

from ear2finger.demo_access import demo_try_enabled

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Ear2Finger API",
        "demo_try_enabled": demo_try_enabled(),
    }

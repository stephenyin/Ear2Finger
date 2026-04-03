"""User-scoped configuration (e.g. AI provider + API keys, app preferences)."""
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, User, UserConfig
from auth import get_current_user

router = APIRouter()


AI_PROVIDER_KEYS = {"openai", "gemini", "anthropic"}
SECRET_CONFIG_KEYS = {
    "api_key",  # legacy
    "openai_api_key",
    "gemini_api_key",
    "anthropic_api_key",
}


class AIConfigResponse(BaseModel):
    """Shape returned to the frontend for AI provider + key status.

    NOTE: We intentionally never expose raw API key values here.
    """

    ai_provider: Optional[str] = None
    has_openai_api_key: bool = False
    has_gemini_api_key: bool = False
    has_anthropic_api_key: bool = False


def _get_user_configs(db: Session, user_id: int) -> Dict[str, Optional[str]]:
    rows = db.query(UserConfig).filter(UserConfig.user_id == user_id).all()
    return {r.key: r.value for r in rows}


@router.get("/user/config", response_model=AIConfigResponse)
async def get_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get AI provider + key status for the current user.

    Raw API keys are never returned; instead we expose boolean "has_*_api_key" flags.
    Legacy keys (ai_vendor/api_key) are mapped into the canonical shape.
    """
    configs = _get_user_configs(db, current_user.id)

    # Canonical provider (preferred) or legacy ai_vendor mapping
    ai_provider = configs.get("ai_provider")
    legacy_vendor = configs.get("ai_vendor")
    if not ai_provider and legacy_vendor:
        legacy_vendor_norm = legacy_vendor.strip().lower()
        if legacy_vendor_norm in AI_PROVIDER_KEYS:
            ai_provider = legacy_vendor_norm
        else:
            # Map common title-cased values
            title_map = {
                "gemini": "gemini",
                "openai": "openai",
                "anthropic": "anthropic",
            }
            ai_provider = title_map.get(legacy_vendor_norm)

    # Per-provider key presence: canonical row (e.g. openai_api_key) or any managed key (e.g. openai_api_key:uuid)
    def _has_provider_key(prefix: str) -> bool:
        if configs.get(prefix):
            return True
        return any(k.startswith(prefix + ":") and configs.get(k) for k in configs)

    has_openai = _has_provider_key("openai_api_key")
    has_gemini = _has_provider_key("gemini_api_key")
    has_anthropic = _has_provider_key("anthropic_api_key")

    legacy_api_key = configs.get("api_key")
    if legacy_api_key and ai_provider in AI_PROVIDER_KEYS:
        if ai_provider == "openai":
            has_openai = True
        elif ai_provider == "gemini":
            has_gemini = True
        elif ai_provider == "anthropic":
            has_anthropic = True

    return AIConfigResponse(
        ai_provider=ai_provider,
        has_openai_api_key=has_openai,
        has_gemini_api_key=has_gemini,
        has_anthropic_api_key=has_anthropic,
    )


@router.put("/user/config")
async def set_config(
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Set config entries.

    For AI settings, prefer JSON like:
      {
        "ai_provider": "gemini",
        "gemini_api_key": "GEMINI-...",
      }

    Raw API keys are accepted in the request body but never returned from GET /user/config.
    """
    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail="Invalid request body")

    configs = _get_user_configs(db, current_user.id)

    # Normalise provider if present
    ai_provider = body.get("ai_provider")
    if ai_provider is not None:
        if not isinstance(ai_provider, str):
            raise HTTPException(status_code=400, detail="ai_provider must be a string")
        ai_provider_norm = ai_provider.strip().lower()
        if ai_provider_norm not in AI_PROVIDER_KEYS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid ai_provider '{ai_provider}'. Must be one of: {sorted(AI_PROVIDER_KEYS)}.",
            )
        ai_provider = ai_provider_norm

    # Helper to upsert a single key
    def upsert_key(key: str, value: Optional[str]) -> None:
        existing = (
            db.query(UserConfig)
            .filter(UserConfig.user_id == current_user.id, UserConfig.key == key)
            .first()
        )
        if value is None or (isinstance(value, str) and not value.strip()):
            # Treat null/empty as clearing the value without deleting the row
            if existing:
                existing.value = None
        else:
            val_str = str(value)
            if existing:
                existing.value = val_str
            else:
                db.add(UserConfig(user_id=current_user.id, key=key, value=val_str))

    # Update canonical AI provider, if supplied
    if ai_provider is not None:
        upsert_key("ai_provider", ai_provider)

    # Update per-provider API keys if included in the payload
    for provider_key in ("openai_api_key", "gemini_api_key", "anthropic_api_key"):
        if provider_key in body:
            raw_val = body.get(provider_key)
            # Avoid accidentally logging raw keys; just upsert
            upsert_key(provider_key, raw_val if raw_val is not None else None)

    # Allow non-AI config keys to pass through as generic entries,
    # but prevent direct writes to known secret keys via legacy names.
    for key, value in body.items():
        if key in {"ai_provider", "ai_vendor"} or key in SECRET_CONFIG_KEYS:
            # Already handled above or intentionally ignored
            continue
        if not isinstance(key, str) or not key.strip():
            continue
        upsert_key(key, str(value) if value is not None else None)

    db.commit()
    return {"message": "Config updated"}

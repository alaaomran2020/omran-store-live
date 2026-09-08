from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

REQUIRED_KEYS = {
    "source_url",
    "product_title",
    "brand",
    "model_sku",
    "dimensions",
    "components",
    "age_guidance",
    "materials",
    "variants",
    "image_urls",
    "uncertainty",
}


def new_intake(payload: dict[str, Any]) -> dict[str, Any]:
    missing = sorted(REQUIRED_KEYS - payload.keys())
    if missing:
        raise ValueError(f"structured result missing keys: {', '.join(missing)}")

    dimensions = payload.get("dimensions") or {}
    if not isinstance(dimensions, dict):
        raise ValueError("dimensions must be an object")

    return {
        "schema_version": "1.0",
        "catalog": "OMRAN_TOYS",
        "workflow_status": "NEEDS_REVIEW",
        "qa_status": "PENDING",
        "active": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": {
            "url": payload["source_url"],
            "research_method": "browser-use-public-read-only",
        },
        "product": {
            "title": payload.get("product_title"),
            "brand": payload.get("brand"),
            "model_sku": payload.get("model_sku"),
            "dimensions": {
                "length": dimensions.get("length"),
                "width": dimensions.get("width"),
                "height": dimensions.get("height"),
                "unit": dimensions.get("unit"),
            },
            "components": payload.get("components") or [],
            "age_guidance": payload.get("age_guidance"),
            "materials": payload.get("materials") or [],
            "variants": payload.get("variants") or [],
            "image_urls": payload.get("image_urls") or [],
        },
        "review": {
            "uncertainty": payload.get("uncertainty") or [],
            "reason": "Browser research output requires human approval before catalog publication.",
        },
    }

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from worker import build_draft, clean_text, is_approved, load_products


def enrich_factory_draft(product: dict[str, Any]) -> dict[str, Any]:
    draft = build_draft(product)
    image = draft.get("source", {}).get("image")
    components = product.get("components") or product.get("contents") or []
    dimensions = product.get("dimensions") or {}

    draft["factory"] = {
        "name": "OMRAN_CONTENT_FACTORY",
        "version": "1.0",
        "input_type": "APPROVED_PRODUCT",
        "requires_product_approval": True,
        "requires_content_approval": True,
        "render_mode": "HUMAN_APPROVAL_REQUIRED",
        "social_publish_allowed": False,
    }
    draft["creative"]["storyboard"] = [
        {"scene": 1, "purpose": "HOOK", "text": f"شوف {clean_text(product.get('name'))} من عمران تويز"},
        {"scene": 2, "purpose": "PRODUCT_VIEW", "image": image, "text": clean_text(product.get("description"))},
        {"scene": 3, "purpose": "DETAILS", "components": components, "dimensions": dimensions},
        {"scene": 4, "purpose": "CTA", "text": draft["creative"]["cta"]},
    ]
    draft["creative"]["source_image"] = image
    draft["creative"]["review_checklist"] = [
        "اسم المنتج مطابق للمصدر المعتمد",
        "الصورة تخص نفس المنتج",
        "لا توجد مواصفات أو مقاسات مخترعة",
        "النص باللهجة المصرية واضح ومناسب للعلامة",
        "لا يوجد سعر أو كمية غير موثقة",
        "الفيديو لا يخلط POP UP مع Omran Toys",
    ]
    return draft


def generate(products: list[dict[str, Any]], output_dir: Path, product_id: str | None = None) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for product in products:
        current_id = clean_text(product.get("id"))
        if product_id and current_id != product_id:
            continue
        if not is_approved(product):
            continue
        draft = enrich_factory_draft(product)
        path = output_dir / f"{draft['product_id']}.json"
        path.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written.append(path)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Omran Content Factory drafts from approved products")
    parser.add_argument("--input", default="automation/product-metadata.json")
    parser.add_argument("--output", default="automation/moneyprinter/out/drafts")
    parser.add_argument("--product-id")
    args = parser.parse_args()

    written = generate(load_products(Path(args.input)), Path(args.output), args.product_id)
    print(json.dumps({"drafts_written": [str(path) for path in written], "count": len(written)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

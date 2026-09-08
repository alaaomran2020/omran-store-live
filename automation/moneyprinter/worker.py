from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


def is_approved(product: dict[str, Any]) -> bool:
    if product.get("active") is not True:
        return False
    if product.get("workflow_status") != "PUBLISHED":
        return False
    qa_status = product.get("qa_status")
    if qa_status is not None and qa_status != "PASS":
        return False
    return True


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def build_script(product: dict[str, Any]) -> str:
    name = clean_text(product.get("name"))
    description = clean_text(product.get("description"))
    category = clean_text(product.get("category"))
    parts = [f"شوف {name} من عمران تويز."]
    if description:
        parts.append(description)
    if category:
        parts.append(f"مناسب لعشاق {category}.")
    parts.append("للاستفسار والكميات تواصل مع عمران تويز على واتساب.")
    return " ".join(parts)


def build_terms(product: dict[str, Any]) -> list[str]:
    values = [product.get("name"), product.get("category")]
    terms: list[str] = []
    for value in values:
        text = clean_text(value)
        if text and text not in terms:
            terms.append(text)
    return terms


def build_draft(product: dict[str, Any]) -> dict[str, Any]:
    if not is_approved(product):
        raise ValueError("product is not approved for content generation")

    product_id = clean_text(product.get("id"))
    name = clean_text(product.get("name"))
    if not product_id or not name:
        raise ValueError("approved product must have id and name")

    script = build_script(product)
    terms = build_terms(product)

    return {
        "schema_version": "1.0",
        "status": "DRAFT_REVIEW_REQUIRED",
        "brand": "Omran Toys",
        "catalog": "OMRAN_TOYS",
        "product_id": product_id,
        "source": {
            "workflow_status": product.get("workflow_status"),
            "qa_status": product.get("qa_status"),
            "active": product.get("active"),
            "name_source": product.get("name_source"),
            "description_source": product.get("description_source"),
            "image": product.get("processed_image") or product.get("image"),
        },
        "creative": {
            "format": "REEL_SHORT",
            "language": "ar-EG",
            "aspect_ratio": "9:16",
            "script": script,
            "terms": terms,
            "cta": "للاستفسار والكميات تواصل مع عمران تويز على واتساب.",
        },
        "moneyprinter_payload": {
            "video_subject": name,
            "video_script": script,
            "video_terms": terms,
            "video_aspect": "9:16",
        },
        "publishing": {
            "auto_publish": False,
            "requires_human_approval": True,
        },
    }


def load_products(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    products = data.get("products") if isinstance(data, dict) else data
    if not isinstance(products, list):
        raise ValueError("input must contain a products array")
    return [item for item in products if isinstance(item, dict)]


def write_drafts(products: list[dict[str, Any]], output_dir: Path, product_id: str | None) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for product in products:
        if product_id and clean_text(product.get("id")) != product_id:
            continue
        if not is_approved(product):
            continue
        draft = build_draft(product)
        path = output_dir / f"{draft['product_id']}.json"
        path.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written.append(path)
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate review-only MoneyPrinterTurbo drafts for Omran Toys")
    parser.add_argument("--input", default="automation/product-metadata.json")
    parser.add_argument("--output", default="automation/moneyprinter/out")
    parser.add_argument("--product-id")
    args = parser.parse_args()

    written = write_drafts(load_products(Path(args.input)), Path(args.output), args.product_id)
    print(json.dumps({"drafts_written": [str(path) for path in written], "count": len(written)}, ensure_ascii=False))


if __name__ == "__main__":
    main()

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .schema import new_intake


def parse_json_result(raw: str) -> dict[str, Any]:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("browser result must be a JSON object")
    return data


def write_intake(raw: str, output_path: str) -> dict[str, Any]:
    intake = new_intake(parse_json_result(raw))
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(intake, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return intake

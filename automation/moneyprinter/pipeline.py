from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


STATE_DRAFT = "CONTENT_DRAFT"
STATE_APPROVED = "HUMAN_APPROVED"
STATE_RENDERING = "RENDERING"
STATE_MP4_DRAFT = "MP4_DRAFT"
STATE_REJECTED = "REJECTED"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected object in {path}")
    return value


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def approval_path(root: Path, product_id: str) -> Path:
    return root / "approvals" / f"{product_id}.json"


def render_state_path(root: Path, product_id: str) -> Path:
    return root / "renders" / f"{product_id}.json"


def approve(draft_path: Path, root: Path, approved_by: str, note: str = "") -> dict[str, Any]:
    draft = read_json(draft_path)
    if draft.get("status") != "DRAFT_REVIEW_REQUIRED":
        raise ValueError("only review-required content drafts can be approved")
    if draft.get("publishing", {}).get("auto_publish") is not False:
        raise ValueError("draft must explicitly disable auto publishing")
    product_id = str(draft.get("product_id") or "").strip()
    if not product_id:
        raise ValueError("draft is missing product_id")

    record = {
        "schema_version": "1.0",
        "product_id": product_id,
        "state": STATE_APPROVED,
        "approved_by": approved_by.strip() or "human-reviewer",
        "approved_at": now_iso(),
        "note": note.strip(),
        "draft_file": str(draft_path),
        "render_allowed": True,
        "social_publish_allowed": False,
    }
    write_json(approval_path(root, product_id), record)
    return record


def reject(draft_path: Path, root: Path, rejected_by: str, reason: str) -> dict[str, Any]:
    draft = read_json(draft_path)
    product_id = str(draft.get("product_id") or "").strip()
    if not product_id:
        raise ValueError("draft is missing product_id")
    record = {
        "schema_version": "1.0",
        "product_id": product_id,
        "state": STATE_REJECTED,
        "rejected_by": rejected_by.strip() or "human-reviewer",
        "rejected_at": now_iso(),
        "reason": reason.strip() or "rejected by reviewer",
        "draft_file": str(draft_path),
        "render_allowed": False,
        "social_publish_allowed": False,
    }
    write_json(approval_path(root, product_id), record)
    return record


def _api_base() -> str:
    return os.getenv("MONEYPRINTER_API_BASE", "http://127.0.0.1:8080/api/v1").rstrip("/")


def _api_key() -> str:
    return os.getenv("MONEYPRINTER_API_KEY", "").strip()


def _request_json(method: str, url: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if _api_key():
        headers["Authorization"] = f"Bearer {_api_key()}"
        headers["X-API-Key"] = _api_key()
    request = Request(url, data=data, method=method, headers=headers)
    try:
        with urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
    except (HTTPError, URLError) as exc:
        raise RuntimeError(f"MoneyPrinterTurbo API request failed: {exc}") from exc
    parsed = json.loads(body)
    if not isinstance(parsed, dict):
        raise RuntimeError("MoneyPrinterTurbo API returned a non-object response")
    return parsed


def _extract_task_id(response: dict[str, Any]) -> str:
    candidates = [
        response.get("task_id"),
        (response.get("data") or {}).get("task_id") if isinstance(response.get("data"), dict) else None,
    ]
    for value in candidates:
        if value:
            return str(value)
    raise RuntimeError("MoneyPrinterTurbo response did not contain task_id")


def _extract_task_data(response: dict[str, Any]) -> dict[str, Any]:
    data = response.get("data")
    return data if isinstance(data, dict) else response


def _task_done(data: dict[str, Any]) -> bool:
    state = str(data.get("state") or data.get("status") or "").lower()
    if state in {"success", "completed", "done", "finished"}:
        return True
    videos = data.get("videos")
    return isinstance(videos, list) and len(videos) > 0


def _task_failed(data: dict[str, Any]) -> bool:
    state = str(data.get("state") or data.get("status") or "").lower()
    return state in {"failed", "error", "cancelled", "canceled"}


def _first_video(data: dict[str, Any]) -> str:
    videos = data.get("videos")
    if not isinstance(videos, list) or not videos:
        raise RuntimeError("render completed without a video output")
    first = videos[0]
    if isinstance(first, dict):
        for key in ("url", "file", "path"):
            if first.get(key):
                return str(first[key])
    return str(first)


def _download_video(video_ref: str, output_path: Path) -> None:
    if not video_ref.startswith(("http://", "https://")):
        raise RuntimeError("MoneyPrinterTurbo did not return a downloadable HTTP video URL")
    request = Request(video_ref, headers={"Accept": "video/mp4,*/*"})
    with urlopen(request, timeout=120) as response:
        content_type = response.headers.get("Content-Type", "")
        blob = response.read()
    if len(blob) < 1024:
        raise RuntimeError("downloaded video draft is unexpectedly small")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(blob)


def render(draft_path: Path, root: Path, poll_seconds: float = 3.0, timeout_seconds: int = 900) -> dict[str, Any]:
    draft = read_json(draft_path)
    product_id = str(draft.get("product_id") or "").strip()
    approval = read_json(approval_path(root, product_id))
    if approval.get("state") != STATE_APPROVED or approval.get("render_allowed") is not True:
        raise PermissionError("human approval is required before rendering")
    if approval.get("social_publish_allowed") is not False:
        raise PermissionError("approval artifact must explicitly prohibit social publishing")

    payload = draft.get("moneyprinter_payload")
    if not isinstance(payload, dict):
        raise ValueError("draft is missing moneyprinter_payload")

    state = {
        "schema_version": "1.0",
        "product_id": product_id,
        "state": STATE_RENDERING,
        "started_at": now_iso(),
        "social_publish_allowed": False,
        "draft_file": str(draft_path),
    }
    write_json(render_state_path(root, product_id), state)

    created = _request_json("POST", f"{_api_base()}/videos", payload)
    task_id = _extract_task_id(created)
    state["moneyprinter_task_id"] = task_id
    write_json(render_state_path(root, product_id), state)

    deadline = time.monotonic() + timeout_seconds
    final_data: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        response = _request_json("GET", f"{_api_base()}/tasks/{task_id}")
        data = _extract_task_data(response)
        if _task_failed(data):
            raise RuntimeError(f"MoneyPrinterTurbo render failed: {data}")
        if _task_done(data):
            final_data = data
            break
        time.sleep(max(poll_seconds, 0.2))
    if final_data is None:
        raise TimeoutError("MoneyPrinterTurbo render timed out")

    video_ref = _first_video(final_data)
    output_path = root / "mp4-drafts" / f"{product_id}.mp4"
    _download_video(video_ref, output_path)

    state.update({
        "state": STATE_MP4_DRAFT,
        "completed_at": now_iso(),
        "video_source": video_ref,
        "mp4_draft": str(output_path),
        "social_publish_allowed": False,
    })
    write_json(render_state_path(root, product_id), state)
    return state


def main() -> None:
    parser = argparse.ArgumentParser(description="Omran human approval + MoneyPrinterTurbo render pipeline")
    sub = parser.add_subparsers(dest="command", required=True)

    approve_parser = sub.add_parser("approve")
    approve_parser.add_argument("draft")
    approve_parser.add_argument("--by", required=True)
    approve_parser.add_argument("--note", default="")

    reject_parser = sub.add_parser("reject")
    reject_parser.add_argument("draft")
    reject_parser.add_argument("--by", required=True)
    reject_parser.add_argument("--reason", required=True)

    render_parser = sub.add_parser("render")
    render_parser.add_argument("draft")
    render_parser.add_argument("--poll-seconds", type=float, default=3.0)
    render_parser.add_argument("--timeout-seconds", type=int, default=900)

    parser.add_argument("--root", default="automation/moneyprinter/out")
    args = parser.parse_args()
    root = Path(args.root)

    if args.command == "approve":
        result = approve(Path(args.draft), root, args.by, args.note)
    elif args.command == "reject":
        result = reject(Path(args.draft), root, args.by, args.reason)
    else:
        result = render(Path(args.draft), root, args.poll_seconds, args.timeout_seconds)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

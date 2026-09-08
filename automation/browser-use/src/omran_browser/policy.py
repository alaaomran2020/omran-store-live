from __future__ import annotations

import os
from urllib.parse import urlparse

DEFAULT_ALLOWED_DOMAINS = {
    "omrantoys.store",
    "www.omrantoys.store",
}


def allowed_domains() -> set[str]:
    raw = os.getenv("OMRAN_BROWSER_ALLOWED_DOMAINS", "")
    extra = {item.strip().lower() for item in raw.split(",") if item.strip()}
    return DEFAULT_ALLOWED_DOMAINS | extra


def normalize_host(url: str) -> str:
    host = (urlparse(url).hostname or "").lower().rstrip(".")
    if not host:
        raise ValueError(f"invalid URL: {url}")
    return host


def assert_allowed_url(url: str) -> None:
    host = normalize_host(url)
    allowed = allowed_domains()
    if host in allowed:
        return
    if any(host.endswith(f".{domain}") for domain in allowed):
        return
    raise ValueError(
        f"domain '{host}' is not allowlisted; add it explicitly via OMRAN_BROWSER_ALLOWED_DOMAINS"
    )

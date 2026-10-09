#!/usr/bin/env python3
"""Read-only Sheets vs repository catalog audit. Never writes products or stock."""
import csv
import io
import json
import os
from pathlib import Path

import google.auth.transport.requests
from google.oauth2 import service_account
import requests

REPORT = Path("catalog-audit-report.md")
CATALOG = Path("public/catalog/products.csv")
SCOPE = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
RANGE = "'كتالوج النشر الآلي'!A1:O1500"


def normalize(s):
    return str(s or "").strip().lower().replace(" ", "_")


def find_column(headers, names):
    for index, header in enumerate(headers):
        if normalize(header) in names:
            return index
    raise ValueError(f"Required header missing: {sorted(names)}; available={headers!r}")


def run():
    raw = os.environ.get("GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON", "")
    if not raw:
        raise ValueError("Configure GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON secret; no public sheet fallback")
    info = json.loads(raw)
    creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPE)
    creds.refresh(google.auth.transport.requests.Request())
    sheet_id = os.environ["SHEET_ID"]
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{sheet_id}/values/{requests.utils.quote(RANGE, safe='')}"
    response = requests.get(url, headers={"Authorization": f"Bearer {creds.token}"}, params={"valueRenderOption": "UNFORMATTED_VALUE"}, timeout=25)
    response.raise_for_status()
    values = response.json().get("values", [])
    if len(values) < 2:
        raise ValueError("No Sheet data; refusing empty comparison")
    headers, rows = values[0], values[1:]
    id_idx = find_column(headers, {"id", "product_id", "معرف_المنتج", "كود_المنتج"})
    price_idx = find_column(headers, {"price", "sale_price", "selling_price", "السعر", "سعر_البيع"})
    with CATALOG.open(encoding="utf-8-sig", newline="") as stream:
        catalog = list(csv.DictReader(stream))
    by_id = {}
    for row in catalog:
        key = (row.get("id") or "").strip()
        if not key or key in by_id:
            raise ValueError(f"Missing/duplicate repository ID: {key!r}")
        by_id[key] = row
    sheet = {}
    for row in rows:
        key = str(row[id_idx]).strip() if len(row) > id_idx else ""
        if not key:
            continue
        if key in sheet:
            raise ValueError(f"Duplicate Sheet ID: {key}")
        sheet[key] = str(row[price_idx]).strip() if len(row) > price_idx and row[price_idx] is not None else ""
    if not sheet:
        raise ValueError("No product IDs in Sheet")
    only_sheet = sorted(set(sheet) - set(by_id))
    only_repo = sorted(set(by_id) - set(sheet))
    prices = []
    for key in sorted(set(sheet) & set(by_id)):
        a, b = sheet[key], (by_id[key].get("price") or "").strip()
        if a and b:
            try:
                equal = float(a) == float(b)
            except ValueError:
                equal = False
            if not equal:
                prices.append((key, a, b))
        elif a != b:
            prices.append((key, a or "(blank)", b or "(blank)"))
    lines = [
        "# Omran catalog audit (read only)", "",
        f"- Google Sheets IDs: {len(sheet)}",
        f"- GitHub CSV IDs: {len(by_id)}",
        f"- Only in Google Sheets: {len(only_sheet)}",
        f"- Only in GitHub: {len(only_repo)}",
        f"- Price differences: {len(prices)}", "",
        "## Only in Google Sheets", *(f"- \`{x}\`" for x in only_sheet),
        "", "## Only in GitHub", *(f"- \`{x}\`" for x in only_repo),
        "", "## Price differences", "| Product | Sheets | GitHub |", "|---|---:|---:|",
        *(f"| \`{key}\` | {a} | {b} |" for key, a, b in prices),
        "", "No data was changed. Stock UNKNOWN is not treated as available.",
    ]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Audit complete: Sheets={len(sheet)} GitHub={len(by_id)} mismatches={len(only_sheet)+len(only_repo)+len(prices)}")


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:
        REPORT.write_text("# Omran catalog audit failed closed\n\nNo changes were made.\n\n" + str(exc).replace("\n", " ") + "\n", encoding="utf-8")
        raise

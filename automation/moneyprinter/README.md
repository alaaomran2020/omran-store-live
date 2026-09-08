# Omran Toys MoneyPrinterTurbo Worker

This worker is intentionally **draft-only**. It reads catalog records and accepts only products that are active and already approved for publication (`workflow_status=PUBLISHED`; if `qa_status` exists it must be `PASS`). It never publishes to social media.

## Input

Default source: `automation/product-metadata.json`.

## Output

One JSON draft per approved product under `automation/moneyprinter/out/`. Each draft contains:

- Omran product identity and source evidence
- Egyptian Arabic Reel/Short script
- 9:16 portrait video defaults
- search terms derived only from documented product fields
- a MoneyPrinterTurbo-compatible payload shell
- `status=DRAFT_REVIEW_REQUIRED`

## Run

```bash
python automation/moneyprinter/worker.py --input automation/product-metadata.json --output automation/moneyprinter/out
```

Use `--product-id <id>` to generate one product only.

No API request is made by this worker. Rendering/submission is deliberately a separate reviewed step so a generated script cannot auto-publish or spend provider credits without approval.

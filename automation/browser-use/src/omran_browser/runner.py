import argparse
import asyncio
import json
import os
from textwrap import dedent

from browser_use import Agent, ChatBrowserUse
from dotenv import load_dotenv

from .intake import write_intake
from .policy import assert_allowed_url


def _store_url() -> str:
    return os.getenv("OMRAN_STORE_URL", "https://omrantoys.store").rstrip("/")


def _model() -> str:
    return os.getenv("OMRAN_BROWSER_MODEL", "openai/gpt-5.5")


def _max_steps() -> int:
    return int(os.getenv("OMRAN_BROWSER_MAX_STEPS", "20"))


def build_task(mode: str, target: str | None) -> str:
    store = _store_url()

    if mode == "qa":
        assert_allowed_url(store)
        return dedent(
            f"""
            Perform a read-only storefront QA audit for Omran Toys at {store}.
            Stay on allowlisted Omran Toys domains only. Do not log in, submit forms, place orders,
            send WhatsApp messages, or change any data. Check the home page, search/catalog navigation,
            at least one product page, image loading, visible broken links, mobile-relevant layout issues,
            and WhatsApp CTA presence. Treat POP UP – Gifts & Balloons as a separate catalog/brand area.
            Return a concise report with tested URLs, PASS/FAIL checks, observed evidence, severity,
            and recommended next action. Never claim an action succeeded unless the resulting state was verified.
            """
        ).strip()

    if mode == "research":
        if not target:
            raise ValueError("research mode requires --target")
        assert_allowed_url(target)
        return dedent(
            f"""
            Research the public product/source at: {target}
            This is read-only research for Omran Toys product intake. Stay on the supplied allowlisted domain.
            Do not log in, purchase, submit forms, bypass access controls, or copy private data.
            Extract only publicly visible facts. Never infer or invent missing dimensions, codes, materials,
            age guidance, variants, or image URLs.

            Return ONLY one valid JSON object with exactly these top-level keys:
            source_url, product_title, brand, model_sku, dimensions, components, age_guidance,
            materials, variants, image_urls, uncertainty.

            dimensions must be an object with length, width, height, unit; use null for unknown values.
            components/materials/variants/image_urls/uncertainty must be arrays. Preserve codes and numbers
            exactly as shown by the source. Arabic explanatory text is preferred.
            """
        ).strip()

    raise ValueError(f"unsupported mode: {mode}")


async def run(mode: str, target: str | None, output: str | None) -> int:
    task = build_task(mode, target)
    llm = ChatBrowserUse(model=_model())
    agent = Agent(task=task, llm=llm)
    history = await agent.run(max_steps=_max_steps())

    result = history.final_result() if hasattr(history, "final_result") else str(history)
    if not result:
        raise RuntimeError("Browser agent finished without a textual final result")

    if mode == "research":
        if not output:
            raise ValueError("research mode requires --output")
        intake = write_intake(result, output)
        print(json.dumps(intake, ensure_ascii=False, indent=2))
    else:
        print(result)
    return 0


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Omran Toys Browser Use worker")
    parser.add_argument("mode", choices=("qa", "research"))
    parser.add_argument("--target", help="Allowlisted public product/source URL for research mode")
    parser.add_argument("--output", help="JSON output path; required for research mode")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(args.mode, args.target, args.output)))


if __name__ == "__main__":
    main()

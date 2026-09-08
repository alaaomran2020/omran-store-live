import argparse
import asyncio
import os
from textwrap import dedent

from browser_use import Agent, ChatBrowserUse
from dotenv import load_dotenv


def _store_url() -> str:
    return os.getenv("OMRAN_STORE_URL", "https://omrantoys.store").rstrip("/")


def _model() -> str:
    return os.getenv("OMRAN_BROWSER_MODEL", "openai/gpt-5.5")


def _max_steps() -> int:
    return int(os.getenv("OMRAN_BROWSER_MAX_STEPS", "20"))


def build_task(mode: str, target: str | None) -> str:
    store = _store_url()

    if mode == "qa":
        return dedent(
            f"""
            Perform a read-only storefront QA audit for Omran Toys at {store}.
            Do not log in, submit forms, place orders, send WhatsApp messages, or change any data.
            Check the home page, search/catalog navigation, at least one product page, image loading,
            visible broken links, mobile-relevant layout issues you can observe, and WhatsApp CTA presence.
            Treat POP UP – Gifts & Balloons as a separate catalog/brand area and do not mix its findings
            with the Omran Toys catalog.
            Return a concise report with: tested URLs, PASS/FAIL checks, observed evidence, severity,
            and recommended next action. Do not claim a click succeeded unless you verified the resulting state.
            """
        ).strip()

    if mode == "research":
        if not target:
            raise ValueError("research mode requires --target")
        return dedent(
            f"""
            Research the product or source at: {target}
            This is read-only research for Omran Toys product intake. Do not log in, purchase, submit forms,
            bypass access controls, or copy private data. Extract only publicly visible product information.
            Return: source URL, product title, brand if visible, model/SKU if visible, dimensions (length, width,
            height) only when explicitly shown, components/contents, age guidance, materials, variants, public
            image URLs where directly available, and any uncertainty. Preserve source wording for codes/numbers
            but write the explanatory output in Arabic. Never invent missing specifications.
            """
        ).strip()

    raise ValueError(f"unsupported mode: {mode}")


async def run(mode: str, target: str | None) -> int:
    task = build_task(mode, target)
    llm = ChatBrowserUse(model=_model())
    agent = Agent(task=task, llm=llm)
    history = await agent.run(max_steps=_max_steps())

    result = history.final_result() if hasattr(history, "final_result") else str(history)
    print(result or "Browser agent finished without a textual final result.")
    return 0


def main() -> None:
    load_dotenv()
    parser = argparse.ArgumentParser(description="Omran Toys Browser Use worker")
    parser.add_argument("mode", choices=("qa", "research"))
    parser.add_argument("--target", help="Public product/source URL for research mode")
    args = parser.parse_args()
    raise SystemExit(asyncio.run(run(args.mode, args.target)))


if __name__ == "__main__":
    main()

"""
knowledge_query.py — Interactive query interface for the California regulations wiki.

Ask plain-language questions and get cited answers drawn from the local knowledge base.
Answers cite actual code sections (SDMC §, CBC, Gov Code, etc.) — never invented.

Usage:
  # Single question
  py src/agents/knowledge_query.py --q "What is the ADU rear setback in San Diego?"

  # Specific jurisdiction
  py src/agents/knowledge_query.py --jurisdiction chula-vista --q "What permits are needed for a detached ADU?"

  # Force specific topics (skip auto-detection)
  py src/agents/knowledge_query.py --topics adu,zoning --q "Can I build a 2-story ADU?"

  # Interactive mode (REPL — ask multiple questions in one session)
  py src/agents/knowledge_query.py --interactive

  # Show which knowledge files were loaded for a question
  py src/agents/knowledge_query.py --q "What is the WMF diversion rate?" --verbose
"""
from __future__ import annotations

import argparse
import sys
import textwrap
import time
from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(AGENTS_DIR))

from claude_auth import make_client
from knowledge_loader import detect_topics, load_knowledge, JURISDICTIONS

MODEL_DEFAULT = "claude-opus-4-6"
MODEL_FAST = "claude-haiku-4-5-20251001"  # lower rate limits, good for sweeps

_SYSTEM_PROMPT = """\
You are a California building permit and plan check specialist with deep knowledge
of local jurisdictional requirements.

You will be given:
1. A KNOWLEDGE CONTEXT block — excerpts from a curated regulations wiki
2. A QUESTION from a permit applicant, designer, or plan checker

Your job:
- Answer the question accurately and concisely
- Cite the specific code section, ordinance, or bulletin that governs the answer
  (e.g. SDMC §141.0302(b)(9), CALGreen §4.408, IB-400, Gov Code §65852.2)
- If the knowledge context does not cover the question, say so clearly —
  do NOT invent code sections or requirements
- Flag any nuances that require the user to verify with the jurisdiction directly
  (e.g. pending amendments, discretionary approvals, overlay zones)
- Keep answers tight: lead with the direct answer, then the citation, then any caveats
"""

_USER_TEMPLATE = """\
KNOWLEDGE CONTEXT:
{knowledge_context}

QUESTION:
{question}
"""


def query(
    question: str,
    jurisdiction: str = "san-diego-city",
    topics: list[str] | None = None,
    model: str = MODEL_DEFAULT,
    *,
    verbose: bool = False,
) -> str:
    """
    Answer a plain-language question using the local knowledge wiki.
    Retries up to 3 times on rate-limit errors with exponential backoff.
    Returns the answer string.
    """
    resolved_topics = topics or detect_topics([{"text": question}])
    knowledge_context = load_knowledge(jurisdiction, resolved_topics)

    if verbose:
        print(f"[query] Jurisdiction : {jurisdiction}")
        print(f"[query] Model        : {model}")
        print(f"[query] Topics       : {', '.join(resolved_topics)}")
        print(f"[query] Context size : {len(knowledge_context):,} chars")
        print()

    if not knowledge_context:
        return (
            "No knowledge files found for the requested jurisdiction and topics. "
            "Check that the knowledge/ directory is populated."
        )

    client = make_client()
    import anthropic

    for attempt in range(3):
        try:
            response = client.messages.create(
                model=model,
                max_tokens=1024,
                system=_SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": _USER_TEMPLATE.format(
                        knowledge_context=knowledge_context,
                        question=question,
                    ),
                }],
            )
            return response.content[0].text.strip()
        except anthropic.RateLimitError:
            if attempt == 2:
                raise
            wait = 15 * (2 ** attempt)  # 15s, 30s
            print(f"[query] Rate limited — retrying in {wait}s...")
            time.sleep(wait)


def _print_answer(answer: str) -> None:
    width = 80
    print()
    print("─" * width)
    for line in answer.splitlines():
        print(line if len(line) <= width else textwrap.fill(line, width=width))
    print("─" * width)
    print()


def _interactive(
    jurisdiction: str,
    topics: list[str] | None,
    model: str,
    verbose: bool,
) -> None:
    print(f"\nKnowledge Query — {jurisdiction} [{model}]")
    print("Type your question and press Enter. 'quit' or Ctrl-C to exit.\n")

    while True:
        try:
            question = input("Q: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nBye.")
            break

        if not question:
            continue
        if question.lower() in {"quit", "exit", "q"}:
            print("Bye.")
            break

        answer = query(
            question, jurisdiction=jurisdiction,
            topics=topics, model=model, verbose=verbose,
        )
        _print_answer(answer)


def main() -> None:
    # Reconfigure stdout to UTF-8 so verbose prints and answers use the same stream
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(
        description="Query the California regulations knowledge wiki",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--q", "--question", dest="question", default=None,
        help="Question to ask (omit for --interactive mode)",
    )
    parser.add_argument(
        "--jurisdiction", default="san-diego-city",
        help=(
            "Jurisdiction to query. Options: "
            + " | ".join(sorted(set(JURISDICTIONS.values())))
        ),
    )
    parser.add_argument(
        "--topics", default=None,
        help="Comma-separated topic slugs to force (adu, zoning, calgreen, stormwater, "
             "fire, energy, permits, accessibility). Default: auto-detect from question.",
    )
    parser.add_argument(
        "--interactive", "-i", action="store_true",
        help="Start an interactive REPL session",
    )
    parser.add_argument(
        "--model", default=MODEL_DEFAULT,
        help=f"Claude model to use (default: {MODEL_DEFAULT}; fast: {MODEL_FAST})",
    )
    parser.add_argument("--verbose", "-v", action="store_true")
    args = parser.parse_args()

    topics: list[str] | None = None
    if args.topics:
        topics = [t.strip() for t in args.topics.split(",") if t.strip()]

    if args.interactive or not args.question:
        _interactive(args.jurisdiction, topics, args.model, args.verbose)
    else:
        answer = query(
            args.question,
            jurisdiction=args.jurisdiction,
            topics=topics,
            model=args.model,
            verbose=args.verbose,
        )
        _print_answer(answer)


if __name__ == "__main__":
    main()

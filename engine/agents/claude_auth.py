"""
claude_auth.py — Resolve Anthropic API key for agent use.

Priority:
  1. ANTHROPIC_API_KEY env var (explicit override)
  2. Claude Code OAuth token (~/.claude/.credentials.json)
  3. Raise RuntimeError with clear instructions
"""
from __future__ import annotations

import json
import os
from pathlib import Path


def get_api_key() -> str:
    """Return a usable Anthropic API key, or raise RuntimeError."""
    # 1. Explicit env var
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if key:
        return key

    # 2. Claude Code OAuth token
    creds_path = Path.home() / ".claude" / ".credentials.json"
    if creds_path.exists():
        try:
            creds = json.loads(creds_path.read_text(encoding="utf-8"))
            token = creds.get("claudeAiOauth", {}).get("accessToken", "").strip()
            if token:
                return token
        except Exception:
            pass

    raise RuntimeError(
        "No Anthropic API key found.\n"
        "Set ANTHROPIC_API_KEY env var, or ensure Claude Code is authenticated\n"
        "(~/.claude/.credentials.json must exist with a valid accessToken)."
    )


def make_client() -> object:
    """Return an authenticated anthropic.Anthropic client.
    Bypasses SSL verification for corporate networks with SSL inspection."""
    import anthropic
    import httpx
    http_client = httpx.Client(verify=False)
    return anthropic.Anthropic(api_key=get_api_key(), http_client=http_client)

"""ether_sync_trigger.py — PostToolUse hook: enqueue Ether sync on site JSON write.

When any Edit or Write touches a file matching data/sites/*.json, this hook:
  1. Extracts the site_id from the filename stem
  2. Resolves Ether repo path via NP_ClaudeAgent/config/local_repos.json (GLOBAL-004)
  3. Writes a trigger JSON to Ether/data/trigger_queue/

The Ether watcher (py -m ether watch) picks it up and runs tool_sync_repos.
"""
from __future__ import annotations

import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


_SITE_PATTERN = re.compile(
    r"data[/\\]sites[/\\]([^/\\]+)\.json$", re.IGNORECASE
)

# Default catalog key — all site writes trigger plancheck_sync unless overridden
_DEFAULT_CATALOG_KEY = "plancheck_sync"


def _find_ether_root() -> Path | None:
    """Resolve Ether repo path via NP_ClaudeAgent/config/local_repos.json."""
    # This hook lives in: ProjectBook-Planner/.claude/hooks/
    # Parents: hooks/ → .claude/ → ProjectBook-Planner/ → DevOps/
    devops_root = Path(__file__).resolve().parents[3]
    lrepos = devops_root / "NP_ClaudeAgent" / "config" / "local_repos.json"
    if not lrepos.exists():
        return None
    try:
        data = json.loads(lrepos.read_text(encoding="utf-8"))
        repos = data.get("repos", {})
        ether_path = repos.get("Ether")
        if ether_path:
            p = Path(ether_path)
            return p if p.exists() else None
    except Exception:
        return None
    return None


def _enqueue(site_id: str, source_path: str, ether_root: Path) -> str:
    """Write trigger JSON to Ether's trigger_queue/."""
    queue_dir = ether_root / "data" / "trigger_queue"
    queue_dir.mkdir(parents=True, exist_ok=True)

    ts_epoch_ms = int(time.time() * 1000)
    ts_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    safe_site = site_id.replace("/", "_").replace("\\", "_")
    trigger_file = queue_dir / f"{ts_epoch_ms}_{safe_site}_{_DEFAULT_CATALOG_KEY}.json"

    trigger_file.write_text(
        json.dumps({
            "catalog_key": _DEFAULT_CATALOG_KEY,
            "site_id": site_id,
            "source_path": source_path,
            "enqueued_at": ts_iso,
        }, indent=2),
        encoding="utf-8",
    )
    return str(trigger_file)


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return 0

    # Only act on Edit or Write tool calls
    tool_name = hook_input.get("tool_name", "")
    if tool_name not in ("Edit", "Write"):
        return 0

    # Only act on successful tool calls
    tool_output = hook_input.get("tool_output", "")
    if "error" in str(tool_output).lower()[:200]:
        return 0

    tool_input = hook_input.get("tool_input", {})
    file_path: str = tool_input.get("file_path", "")
    if not file_path:
        return 0

    m = _SITE_PATTERN.search(file_path)
    if not m:
        return 0

    site_id = m.group(1)

    ether_root = _find_ether_root()
    if ether_root is None:
        # Ether not found — skip silently (don't block ProjectBook agent)
        return 0

    try:
        trigger_path = _enqueue(site_id, file_path, ether_root)
        result = {"message": f"ETHER-SYNC: trigger enqueued for {site_id} → {trigger_path}"}
        json.dump(result, sys.stdout)
    except Exception as e:
        # Hook errors must never block ProjectBook agent — fail silently
        result = {"message": f"ETHER-SYNC: enqueue failed for {site_id} ({e}) — continuing"}
        json.dump(result, sys.stdout)

    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Pre-session guard for PlanCheck-Planner.

Runs at session start to enforce critical rules programmatically:
    a) Check core rule files are present (BLOCKING — exit 1)
    b) Check unread pings in controller-note/ (WARNING)
    c) Warn about uncommitted work (git status)
    d) Warn about unpushed commits (git log @{u}..HEAD)
    e) Warn if not on main branch
    f) Kill OneDrive.exe if running (GLOBAL-025)
    g) Stale artifacts scan and auto-clean
    h) Check if branch is behind remote — ACTION REQUIRED: pull first

Derives all paths from cwd at runtime — no hardcoded paths (GLOBAL-004).
Exit 0 = OK (warnings allowed), Exit 1 = blocking prerequisite missing.

Uses content-based ISO timestamp comparison (not mtime) so that
git checkout/merge cannot cause false positives.
"""
from __future__ import annotations

import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

_ISO_RE = re.compile(
    r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"
    r"(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?)"
)


def _parse_ts(path: Path) -> datetime | None:
    """Parse ISO timestamp from .ping or .last-read file content."""
    if not path.exists():
        return None
    try:
        text = path.read_text(encoding="utf-8").strip()
    except OSError:
        try:
            return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        except OSError:
            return None
    if not text:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    m = _ISO_RE.search(text)
    if m:
        raw = m.group(1)
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(raw)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)


def _run(cmd: list[str], cwd: Path | None = None) -> str:
    """Run a command, return stdout. Empty string on failure."""
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, cwd=cwd, timeout=10,
        )
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return ""


def check_pings(repo_root: Path) -> bool:
    """Check controller-note/ pings. Return True if unread."""
    note_dir = repo_root / "controller-note"
    ping_ts = _parse_ts(note_dir / ".ping")
    if ping_ts is None:
        return False
    read_ts = _parse_ts(note_dir / ".last-read")
    if read_ts is not None and ping_ts <= read_ts:
        return False
    print("UNREAD PING -- read controller-note/controller-upnote.md before proceeding")
    return True


def check_rules(repo_root: Path) -> bool:
    """Check required rule files exist. Return True if any are missing."""
    required = [
        repo_root / "CLAUDE.md",
        repo_root / ".claude" / "CLAUDE.md",
    ]
    missing = [p for p in required if not p.exists()]
    if missing:
        print("RULE CHECK FAILED -- missing required rule file(s):")
        for p in missing:
            print(f"  - {p.relative_to(repo_root)}")
        return True
    print("Rule check passed.")
    return False


def check_uncommitted(repo_root: Path) -> None:
    """Warn about dirty working tree."""
    output = _run(["git", "status", "--porcelain"], cwd=repo_root)
    if output:
        count = len(output.splitlines())
        print(f"WARNING: {count} uncommitted file(s) in working tree")


def check_unpushed(repo_root: Path) -> None:
    """Warn about commits not pushed to remote."""
    output = _run(["git", "log", "--oneline", "@{u}..HEAD"], cwd=repo_root)
    if output:
        count = len(output.splitlines())
        print(f"WARNING: {count} unpushed commit(s)")


def check_branch(repo_root: Path) -> None:
    """Warn if current branch is not main."""
    branch = _run(["git", "branch", "--show-current"], cwd=repo_root)
    if branch and branch != "main":
        print(f"WARNING: On branch '{branch}', not main")


def check_behind_remote(repo_root: Path) -> bool:
    """Fetch and check if branch is behind remote. Return True if behind."""
    branch = _run(["git", "branch", "--show-current"], cwd=repo_root)
    if not branch:
        return False
    _run(["git", "fetch", "origin", branch], cwd=repo_root)
    behind = _run(
        ["git", "rev-list", "--count", f"HEAD..origin/{branch}"], cwd=repo_root,
    )
    if behind and behind.isdigit() and int(behind) > 0:
        print(
            f"ACTION REQUIRED: Branch '{branch}' is {behind} commit(s) behind "
            f"origin/{branch}. Run: git pull origin {branch}"
        )
        return True
    return False


def check_stale_artifacts(repo_root: Path) -> int:
    """Auto-clean stale artifacts at session start. Return count removed."""
    import shutil

    stale_patterns = ("*.bak", "*.old", "*.orig", "*.tmp", "*~", "*.copy", "*.rej", "*.pyc")
    stale_dirs = ("__pycache__", ".pytest_cache")
    skip_dirs = {".venv", ".git", "node_modules", "report/archive"}
    removed = 0

    for pattern in stale_patterns:
        for hit in repo_root.rglob(pattern):
            if any(part in hit.parts for part in skip_dirs):
                continue
            try:
                hit.unlink()
                removed += 1
            except OSError:
                pass

    for dirname in stale_dirs:
        for hit in repo_root.rglob(dirname):
            if any(part in hit.parts for part in skip_dirs):
                continue
            if hit.is_dir():
                try:
                    shutil.rmtree(hit)
                    removed += 1
                except OSError:
                    pass

    if removed:
        print(f"AUTO-CLEAN: removed {removed} stale artifact(s)")
    return removed


def kill_onedrive() -> None:
    """Kill OneDrive.exe if running (GLOBAL-025)."""
    tasklist = _run(["tasklist", "/FI", "IMAGENAME eq OneDrive.exe"])
    if "OneDrive.exe" in tasklist:
        _run(["taskkill", "/F", "/IM", "OneDrive.exe"])
        print("OneDrive.exe killed (GLOBAL-025)")


def main(*, skip_ping: bool = False) -> int:
    repo_root = Path.cwd().resolve()
    git_dir = _run(["git", "rev-parse", "--show-toplevel"], cwd=repo_root)
    if git_dir:
        repo_root = Path(git_dir)

    print(f"session_guard: {repo_root.name}")
    print("-" * 40)

    kill_onedrive()
    rules_missing = check_rules(repo_root)

    has_unread = False
    if skip_ping:
        print("Ping check skipped (--no-ping).")
    else:
        has_unread = check_pings(repo_root)

    check_uncommitted(repo_root)
    check_unpushed(repo_root)
    check_branch(repo_root)
    check_behind_remote(repo_root)
    stale_count = check_stale_artifacts(repo_root)

    print("-" * 40)
    if rules_missing:
        print("BLOCKED: Fix rule files before proceeding.")
        return 1

    if has_unread:
        print("ACTION REQUIRED: Unread ping(s). Read controller-note/ as first action.")

    if stale_count > 0:
        print(f"Cleaned {stale_count} stale artifact(s) at session start.")

    print("Session guard passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main(skip_ping="--no-ping" in sys.argv))

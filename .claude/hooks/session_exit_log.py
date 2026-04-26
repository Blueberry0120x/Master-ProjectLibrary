#!/usr/bin/env python3
"""GLOBAL-030: Block session exit if upnote not updated this session."""
import sys, os, json
from datetime import datetime, timezone
from pathlib import Path

def main():
    project_dir = Path(os.environ.get("PROJECT_DIR", ".")).resolve()
    note_dir = project_dir / "controller-note"

    # Find the repo upnote file
    upnote = None
    for f in note_dir.glob("*-upnote.md"):
        if f.name != "controller-upnote.md":
            upnote = f
            break

    if not upnote or not upnote.exists():
        return

    # Check if upnote was modified today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    content = upnote.read_text(encoding="utf-8")
    first_line = content.strip().split("\n")[0] if content.strip() else ""

    if today not in first_line:
        result = {
            "decision": "block",
            "reason": f"GLOBAL-030: Session exit blocked. Upnote not updated today ({today}). "
                      f"Append a session summary to {upnote.name} and update CLAUDE.md handoff notes before exiting."
        }
        print(json.dumps(result))
        sys.exit(0)

    # Check .ping was touched
    ping = note_dir / ".ping"
    if ping.exists():
        ping_content = ping.read_text().strip()
        if today not in ping_content:
            result = {
                "decision": "block",
                "reason": "GLOBAL-030: .ping not touched today. Run: touch controller-note/.ping"
            }
            print(json.dumps(result))
            sys.exit(0)

if __name__ == "__main__":
    main()

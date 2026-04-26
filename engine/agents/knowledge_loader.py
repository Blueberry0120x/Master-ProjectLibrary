"""
Knowledge loader for PlanCheck-Planner.

Purpose:
    Loads jurisdiction-specific and shared knowledge markdown files and
    concatenates them into a single string for prompt injection into
    plan-check and query agents.

Inputs:
    - ``jurisdiction``: string slug (e.g. "san-diego-city", "chula-vista").
      Resolved through JURISDICTIONS alias map so short names like "city"
      and "cv" work alongside canonical slugs.
    - ``topics``: optional list of topic slugs (e.g. ["adu", "zoning"]).
      Pass None to load all known topics.

Outputs:
    A single UTF-8 string of concatenated markdown, each section preceded
    by an HTML comment indicating its source file path, suitable for
    direct insertion into a Claude system prompt.

Auto-detect logic (detect_topics):
    Scans a list of correction-dict values for keyword matches defined in
    ``_KEYWORDS``. Returns all topic slugs with at least one keyword hit;
    falls back to ["overview"] when nothing matches.
"""
from __future__ import annotations

from pathlib import Path

AGENTS_DIR = Path(__file__).resolve().parent
REPO_ROOT = AGENTS_DIR.parent.parent
KNOWLEDGE_ROOT = REPO_ROOT / "knowledge"

JURISDICTIONS: dict[str, str] = {
    "san-diego-city": "san-diego-city",
    "san-diego":      "san-diego-city",
    "city":           "san-diego-city",
    "san-diego-county": "san-diego-county",
    "county":         "san-diego-county",
    "chula-vista":    "chula-vista",
    "cv":             "chula-vista",
    "orange-county":  "orange-county",
    "oc":             "orange-county",
}

# topic slug → candidate filenames in the jurisdiction folder (first match wins)
_TOPIC_FILES: dict[str, list[str]] = {
    "adu":           ["adu-and-sb9.md"],
    "zoning":        ["zoning-development-standards.md", "zoning-and-land-use.md",
                      "zoning-unincorporated.md"],
    "calgreen":      ["waste-and-calgreen.md", "calgreen-and-energy.md",
                      "calgreen-energy.md"],
    "stormwater":    ["stormwater-and-grading.md", "grading-drainage-stormwater.md",
                      "stormwater-grading.md", "stormwater-wqmp.md"],
    "fire":          ["fire-code-local-amendments.md", "fire-and-wildfire.md",
                      "fire-cvfd.md", "fire-ocfa.md"],
    "energy":        ["energy-and-title24.md", "calgreen-and-energy.md",
                      "calgreen-energy.md"],
    "permits":       ["permits-and-submittals.md"],
    "accessibility": [],
    "overview":      ["README.md"],
}

# topic slug → filenames always pulled from _shared/ alongside jurisdiction file
_SHARED_FILES: dict[str, list[str]] = {
    "adu":           ["statewide-adu-law.md"],
    "zoning":        [],
    "calgreen":      ["calgreen.md"],
    "stormwater":    ["stormwater-construction.md"],
    "fire":          ["cbc-fire-and-materials.md"],
    "energy":        ["title24-energy.md"],
    "permits":       ["california-codes-overview.md"],
    "accessibility": ["accessibility-cbc-11a-11b.md"],
    "overview":      ["california-codes-overview.md"],
}

# keyword → topic for auto-detection from correction text
_KEYWORDS: dict[str, list[str]] = {
    "adu":           ["adu", "jadu", "accessory dwelling", "secondary unit",
                      "companion unit", "bonus adu"],
    "zoning":        ["zoning", "setback", "floor area ratio", " far ", "height limit",
                      "parking", "lot coverage", "rear yard", "side yard", "front yard",
                      "density", "use permit", "land use"],
    "calgreen":      ["calgreen", "waste management", "debris", "diversion", "wmf",
                      "recycl", "c&d", "construction waste", "landfill", "hauler",
                      "65%", "divert"],
    "stormwater":    ["stormwater", "grading", "drainage", "bmp", "wpcp", "swppp",
                      "erosion", "npdes", "runoff", "impervious"],
    "fire":          ["fire", "sprinkler", "alarm", "egress", "exit", "emergency",
                      "wui", "defensible space", "fire-resistance", "fire wall"],
    "energy":        ["energy", "title 24", "solar", "photovoltaic", " pv ", "ess ",
                      "battery", "heat pump", "hers", "t-24", "reach code",
                      "electrification", "whole house fan"],
    "permits":       ["permit", "submittal", "plan check", "approval", "intake",
                      "accela", "opendsd", "fee schedule"],
    "accessibility": ["accessibility", "ada", "11a", "11b", "disabled", "wheelchair",
                      "accessible route", "barrier"],
}


def resolve_jurisdiction(name: str) -> str:
    return JURISDICTIONS.get(name.lower().strip(), name.lower().strip())


def detect_topics(corrections: list[dict]) -> list[str]:
    """Return topic slugs whose keywords appear anywhere in the corrections."""
    combined = " ".join(
        " ".join(str(v) for v in c.values()) for c in corrections
    ).lower()
    matched = [t for t, kws in _KEYWORDS.items() if any(kw in combined for kw in kws)]
    return matched if matched else ["overview"]


def load_knowledge(
    jurisdiction: str,
    topics: list[str] | None = None,
) -> str:
    """
    Concatenate knowledge markdown for the given jurisdiction + topics.
    Falls back to _shared/ when no jurisdiction-specific file exists for a topic.
    Returns a single string suitable for prompt injection.
    """
    jur_key = resolve_jurisdiction(jurisdiction)
    jur_dir = KNOWLEDGE_ROOT / jur_key
    shared_dir = KNOWLEDGE_ROOT / "_shared"

    if topics is None:
        topics = list(_TOPIC_FILES.keys())

    sections: list[str] = []
    loaded: set[str] = set()

    for topic in topics:
        # jurisdiction-specific file (first candidate that exists)
        for fname in _TOPIC_FILES.get(topic, []):
            path = jur_dir / fname
            if path.exists() and str(path) not in loaded:
                sections.append(f"\n\n<!-- {jur_key}/{fname} -->\n")
                sections.append(path.read_text(encoding="utf-8"))
                loaded.add(str(path))
                break

        # shared supplement
        for fname in _SHARED_FILES.get(topic, []):
            path = shared_dir / fname
            if path.exists() and str(path) not in loaded:
                sections.append(f"\n\n<!-- _shared/{fname} -->\n")
                sections.append(path.read_text(encoding="utf-8"))
                loaded.add(str(path))

    return "".join(sections).strip()

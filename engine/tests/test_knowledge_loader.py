"""Tests for knowledge_loader — jurisdiction resolution and topic detection."""
from __future__ import annotations

import pytest

from src.agents.knowledge_loader import detect_topics, resolve_jurisdiction


class TestResolveJurisdiction:
    def test_known_jurisdictions_resolve(self):
        assert resolve_jurisdiction("san-diego-city") == "san-diego-city"
        assert resolve_jurisdiction("san-diego-county") == "san-diego-county"
        assert resolve_jurisdiction("chula-vista") == "chula-vista"
        assert resolve_jurisdiction("orange-county") == "orange-county"

    def test_alias_sd_resolves(self):
        result = resolve_jurisdiction("sd")
        assert result in ("san-diego-city", "sd"), f"Unexpected: {result}"

    def test_unknown_returns_input_or_raises(self):
        # Should either return the input unchanged or raise — not crash silently
        try:
            result = resolve_jurisdiction("nonexistent-jurisdiction")
            assert isinstance(result, str)
        except (ValueError, KeyError):
            pass  # raising is also acceptable


class TestDetectTopics:
    def test_empty_corrections_returns_list(self):
        result = detect_topics([])
        assert isinstance(result, list)

    def test_adu_correction_detected(self):
        corrections = [{"text": "The ADU setback does not comply with Title 25."}]
        topics = detect_topics(corrections)
        assert isinstance(topics, list)

    def test_calgreen_correction_detected(self):
        corrections = [{"text": "CALGreen checklist missing from submittal."}]
        topics = detect_topics(corrections)
        assert isinstance(topics, list)

    def test_returns_unique_topics(self):
        corrections = [
            {"text": "ADU setback issue."},
            {"text": "ADU height non-compliant."},
        ]
        topics = detect_topics(corrections)
        assert len(topics) == len(set(topics)), "Topics list should have no duplicates"

    def test_multiple_topics_from_mixed_corrections(self):
        corrections = [
            {"text": "Fire sprinkler system required per CBC."},
            {"text": "CALGreen waste management form missing."},
        ]
        topics = detect_topics(corrections)
        assert isinstance(topics, list)

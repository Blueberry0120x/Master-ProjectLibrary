"""Levi retrieval stub — interface contract for future Leviathan integration.

When Levi is live, replace this module with a real LeviClient that calls
the Leviathan API using site_id as the universal lookup key.
Until then, all methods return None and the fill engine falls back to
the site_data.json values directly.
"""
from __future__ import annotations

from typing import Any


class LeviClient:
    """Stub client. All methods return None (no-op fallback)."""

    def lookup_ib(self, bulletin_id: str) -> dict[str, Any] | None:
        """Retrieve a parsed DSD Information Bulletin by ID (e.g. 'IB-513').

        Returns a dict with keys: title, version, date, sections, notes.
        Returns None until Levi is wired in.
        """
        return None

    def lookup_zoning(self, site_id: str) -> dict[str, Any] | None:
        """Retrieve zoning data for a site by its universal site_id.

        Returns a dict with keys: zone, cchs_tier, tpa, far, density_per_sf,
        height_limit, setbacks, overlays.
        Returns None until Levi is wired in.
        """
        return None

    def lookup_form_field(
        self,
        form_id: str,
        field_name: str,
        site_id: str,
    ) -> str | None:
        """Retrieve a pre-computed form field value from Levi's form library.

        Args:
            form_id: Form identifier, e.g. "ds375", "ds3032", "ds420".
            field_name: PDF field name as it appears in the AcroForm.
            site_id: Universal project key, e.g. "4335-euclid".

        Returns the computed field value string, or None to fall back to
        site_data.json derivation logic.
        """
        return None


# Singleton — import this instead of instantiating directly
levi = LeviClient()

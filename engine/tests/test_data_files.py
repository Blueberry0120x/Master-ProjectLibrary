"""Tests for data file integrity — project_info.json, debris_factors.json, haulers.json."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"


class TestProjectInfo:
    def setup_method(self):
        self.data = json.loads((DATA_DIR / "project_info.json").read_text(encoding="utf-8"))

    def test_required_top_level_keys(self):
        for key in ("project", "building", "applicant", "hauler"):
            assert key in self.data, f"Missing top-level key: {key}"

    def test_project_has_address_and_prj(self):
        proj = self.data["project"]
        assert proj.get("address"), "project.address is empty"
        assert proj.get("prj_number"), "project.prj_number is empty"

    def test_building_sf_positive(self):
        sf = self.data["building"]["sf"]
        assert isinstance(sf, (int, float)) and sf > 0

    def test_building_stories_positive(self):
        stories = self.data["building"]["stories"]
        assert isinstance(stories, int) and stories > 0

    def test_applicant_has_name_and_email(self):
        applicant = self.data["applicant"]
        assert applicant.get("name"), "applicant.name is empty"
        assert applicant.get("email"), "applicant.email is empty"

    def test_hauler_present(self):
        assert self.data["hauler"].get("name"), "hauler.name is empty"


class TestDebrisFactors:
    def setup_method(self):
        self.data = json.loads((DATA_DIR / "debris_factors.json").read_text(encoding="utf-8"))

    def test_new_construction_key_present(self):
        assert "new_construction_wood_frame" in self.data

    def test_factors_pct_sum_to_1(self):
        # pct_of_total is stored as a decimal fraction (0.0–1.0), not a percentage
        factors = self.data["new_construction_wood_frame"]
        total = sum(v["pct_of_total"] for v in factors.values())
        assert abs(total - 1.0) < 0.01, f"pct_of_total sums to {total}, expected 1.0"

    def test_no_negative_fractions(self):
        factors = self.data["new_construction_wood_frame"]
        for name, props in factors.items():
            assert props["recycle_fraction"] >= 0, f"Negative recycle_fraction in {name}"
            assert props["pct_of_total"] >= 0, f"Negative pct_of_total in {name}"


class TestHaulersJson:
    def setup_method(self):
        self.data = json.loads((DATA_DIR / "haulers.json").read_text(encoding="utf-8"))

    def test_haulers_list_present(self):
        assert "haulers" in self.data
        assert len(self.data["haulers"]) > 0

    def test_each_hauler_has_name_and_zips(self):
        for hauler in self.data["haulers"]:
            assert hauler.get("name"), "Hauler missing name"
            assert hauler.get("zips"), "Hauler missing zips"

    def test_active_project_zip_covered(self):
        active_zip = self.data.get("active_project", {}).get("zip")
        if not active_zip:
            pytest.skip("No active_project.zip defined")
        haulers_covering_zip = [
            h for h in self.data["haulers"]
            if active_zip in h.get("zips", []) or "all" in h.get("zips", [])
        ]
        assert haulers_covering_zip, f"No hauler covers active project ZIP {active_zip}"

    def test_active_project_hauler_assigned(self):
        active = self.data.get("active_project", {})
        assert active.get("assigned_hauler"), "active_project.assigned_hauler is empty"
        assert active.get("recycling_facility"), "active_project.recycling_facility is empty"
        assert active.get("disposal_facility"), "active_project.disposal_facility is empty"


class TestFormFiles:
    """Smoke-test that form HTML files exist and are non-empty.

    Folder convention (per CLAUDE.md):
      ProjectBook/{project}/     — filled project-specific forms
      Reference/Form/            — blank reference forms
    """

    PROJECT_BOOK = (
        Path(__file__).resolve().parent.parent.parent
        / "knowledge" / "san-diego-city" / "ProjectBook"
    )
    REF_FORM = (
        Path(__file__).resolve().parent.parent.parent
        / "knowledge" / "san-diego-city" / "Reference" / "Form"
    )

    @pytest.mark.parametrize("project,form", [
        ("4335-euclid", "ds3032-building-permit-app.html"),
        ("4335-euclid", "ds420-owner-authorization.html"),
        ("4335-euclid", "ds375-preliminary-review.html"),
        ("4335-euclid", "sb330-preliminary-app.html"),
        ("2921-el-cajon", "ds3032-building-permit-app.html"),
        ("2921-el-cajon", "ds420-owner-authorization.html"),
        ("2921-el-cajon", "ds375-preliminary-review.html"),
        ("2921-el-cajon", "sb330-preliminary-app.html"),
        ("5552-redwood-adu", "ds3032-building-permit-app.html"),
        ("5552-redwood-adu", "ds420-owner-authorization.html"),
    ])
    def test_form_file_exists_and_nonempty(self, project, form):
        path = self.PROJECT_BOOK / project / form
        assert path.exists(), f"Missing: {path.relative_to(self.PROJECT_BOOK.parent.parent.parent)}"
        assert path.stat().st_size > 500, f"Suspiciously small: {form} ({path.stat().st_size} bytes)"

    @pytest.mark.parametrize("blank_form", [
        "ds375-blank.html",
        "sb330-blank.html",
        "ds3032-blank.html",
        "ds420-blank.html",
    ])
    def test_blank_reference_form_exists(self, blank_form):
        path = self.REF_FORM / blank_form
        assert path.exists(), f"Missing blank reference form: {blank_form}"
        assert path.stat().st_size > 500, f"Suspiciously small blank form: {blank_form}"

    @pytest.mark.parametrize("project,form", [
        ("4335-euclid", "ds375-preliminary-review.html"),
        ("2921-el-cajon", "ds375-preliminary-review.html"),
    ])
    def test_ds375_contains_10_questions(self, project, form):
        path = self.PROJECT_BOOK / project / form
        content = path.read_text(encoding="utf-8")
        # Each question is marked with Q1 through Q10
        for i in range(1, 11):
            assert f"Q{i}" in content, f"Missing Q{i} in {project}/{form}"

    @pytest.mark.parametrize("project,form", [
        ("4335-euclid", "sb330-preliminary-app.html"),
        ("2921-el-cajon", "sb330-preliminary-app.html"),
    ])
    def test_sb330_contains_required_parts(self, project, form):
        path = self.PROJECT_BOOK / project / form
        content = path.read_text(encoding="utf-8")
        for part in ("PART A", "PART B", "PART C", "PART E", "65941.1"):
            assert part in content, f"Missing '{part}' in {project}/{form}"

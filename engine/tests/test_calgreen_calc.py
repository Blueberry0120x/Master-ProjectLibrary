"""Tests for calgreen_calc — debris estimation and diversion logic."""
from __future__ import annotations

import pytest

from engine.agents.calgreen_calc import (
    CALGREEN_DIVERSION_PCT,
    build_debris_table,
    calc_diversion,
    estimate_total_tons,
    load_factors,
)


class TestEstimateTotalTons:
    def test_base_calculation(self):
        tons, modifier = estimate_total_tons(sf=1000, stories=1, finish="wood")
        assert modifier == 1.0
        assert tons == pytest.approx(2.0, abs=0.01)

    def test_two_story_stucco_modifier(self):
        tons, modifier = estimate_total_tons(sf=1200, stories=2, finish="stucco")
        assert modifier == 1.04
        # 1200 * 4.0 * 1.04 / 2000 = 2.496
        assert tons == pytest.approx(2.50, abs=0.01)

    def test_two_story_non_stucco_modifier(self):
        _, modifier = estimate_total_tons(sf=1000, stories=2, finish="vinyl")
        assert modifier == 1.02

    def test_single_story_stucco_no_modifier(self):
        _, modifier = estimate_total_tons(sf=1000, stories=1, finish="stucco")
        assert modifier == 1.0

    def test_active_project_values(self):
        # 5552 Redwood: 1200 SF, 2 stories, stucco
        tons, _ = estimate_total_tons(sf=1200, stories=2, finish="stucco")
        assert tons == pytest.approx(2.50, abs=0.01)

    def test_finish_case_insensitive(self):
        _, m1 = estimate_total_tons(1200, 2, "Stucco")
        _, m2 = estimate_total_tons(1200, 2, "STUCCO")
        assert m1 == m2 == 1.04

    def test_output_in_tons_not_lbs(self):
        tons, _ = estimate_total_tons(sf=2000, stories=1, finish="wood")
        assert tons < 10, "Should be in tons (< 10), not lbs (would be ~8000)"


class TestBuildDebrisTable:
    def setup_method(self):
        self.factors, _ = load_factors()

    def test_returns_list(self):
        rows = build_debris_table(total_tons=2.5, factors=self.factors)
        assert isinstance(rows, list)
        assert len(rows) > 0

    def test_row_has_required_keys(self):
        rows = build_debris_table(total_tons=2.5, factors=self.factors)
        for row in rows:
            assert "material" in row
            assert "A" in row  # recycled tons
            assert "B" in row  # landfill tons
            assert "C" in row  # total tons

    def test_column_c_equals_a_plus_b(self):
        rows = build_debris_table(total_tons=2.5, factors=self.factors)
        for row in rows:
            assert row["C"] == pytest.approx(row["A"] + row["B"], abs=0.001)

    def test_total_c_matches_input_tons(self):
        input_tons = 3.75
        rows = build_debris_table(total_tons=input_tons, factors=self.factors)
        total_c = sum(r["C"] for r in rows)
        assert total_c == pytest.approx(input_tons, abs=0.05)


class TestCalcDiversion:
    def test_diversion_meets_calgreen(self):
        # Build a table for the active project and verify PASS
        factors, _ = load_factors()
        tons, _ = estimate_total_tons(sf=1200, stories=2, finish="stucco")
        rows = build_debris_table(total_tons=tons, factors=factors)
        total_a, total_b, total_c, diversion = calc_diversion(rows)
        assert diversion >= CALGREEN_DIVERSION_PCT, (
            f"Diversion {diversion}% is below CALGreen minimum {CALGREEN_DIVERSION_PCT}%"
        )

    def test_diversion_threshold_is_65_percent(self):
        assert CALGREEN_DIVERSION_PCT == 65.0

    def test_totals_are_consistent(self):
        factors, _ = load_factors()
        rows = build_debris_table(total_tons=5.0, factors=factors)
        total_a, total_b, total_c, diversion = calc_diversion(rows)
        assert total_a + total_b == pytest.approx(total_c, abs=0.01)
        assert 0 < diversion <= 100

    def test_empty_rows_returns_zero_diversion(self):
        _, _, _, diversion = calc_diversion([])
        assert diversion == 0


class TestLoadFactors:
    def test_loads_without_error(self):
        factors, notes = load_factors()
        assert isinstance(factors, dict)
        assert len(factors) > 0

    def test_each_factor_has_pct_and_recycle_fraction(self):
        factors, _ = load_factors()
        for material, props in factors.items():
            assert "pct_of_total" in props, f"Missing pct_of_total in {material}"
            assert "recycle_fraction" in props, f"Missing recycle_fraction in {material}"

    def test_pct_of_total_sums_to_1(self):
        # pct_of_total is stored as a decimal fraction (0.0–1.0), not a percentage
        factors, _ = load_factors()
        total = sum(props["pct_of_total"] for props in factors.values())
        assert total == pytest.approx(1.0, abs=0.01)

    def test_recycle_fractions_between_0_and_1(self):
        factors, _ = load_factors()
        for material, props in factors.items():
            frac = props["recycle_fraction"]
            assert 0.0 <= frac <= 1.0, f"Invalid recycle_fraction {frac} in {material}"

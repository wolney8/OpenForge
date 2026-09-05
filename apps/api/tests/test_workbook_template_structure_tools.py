from __future__ import annotations

import json
import subprocess
import sys
from hashlib import sha256
from pathlib import Path
from xml.etree import ElementTree as ET

import pytest

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from probe_workbook_template_growth import (  # noqa: E402
    MAIN_NS,
    _extend_table_owned_sqref,
    _materialise_cloned_formula,
    _translate_formula_rows,
    allocate_workbook_record_ids,
    parse_iteration,
    run_probe,
)
from workbook_template_structure import (  # noqa: E402
    inspect_workbook,
    normalise_header,
    validate_structure,
)

MANIFEST_PATH = ROOT / "docs/contracts/workbook-template-export-v1-ledger-structure.json"
PRIVATE_WORKBOOK = ROOT / "_input/WO_MB_Tracker_3Sept2026_1013AM.xlsx"
PRIVATE_HELPER = ROOT / "_input/MB Helpers.gs"


def test_header_normalization_handles_formatting_without_colliding_manifest_headers() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())

    assert normalise_header("Offer Group ID") == "offergroupid"
    assert normalise_header("offer_group-id") == "offergroupid"
    assert normalise_header("  OFFER   GROUP.ID  ") == "offergroupid"

    for ledger in manifest["ledgers"].values():
        keys = [normalise_header(header) for header in ledger["required_headers"]]
        assert len(keys) == len(set(keys))


def test_manifest_has_one_complete_protected_and_formula_authority() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())

    assert "EP Catchers" not in manifest["ledgers"]
    for ledger in manifest["ledgers"].values():
        formulas = set(ledger["formula_helper_headers"])
        script_owned = set(ledger["script_owned_headers"])
        protected = set(ledger["protected_headers"])
        inputs = set(ledger["authoritative_input_headers"])
        system = set(ledger["id_system_headers"])

        assert protected == formulas | script_owned
        assert not formulas & inputs
        assert not formulas & system
        assert formulas | inputs | system == set(ledger["required_headers"])
        assert ledger["template_strategy"] == ("nearest-structurally-complete-formula-row")
        identities = [
            (item["name"], item["local_sheet_id"]) for item in ledger["growth_defined_names"]
        ]
        assert len(identities) == len(set(identities))


@pytest.mark.parametrize(
    ("formula", "expected"),
    [
        ("A2+B2", "A3+B3"),
        ("$A2+A$2+$A$2", "$A3+A$2+$A$2"),
        ('IF(A2="A1",B2,0)', 'IF(A3="A1",B3,0)'),
        ('IF(A2="He said ""A1""",B2,0)', 'IF(A3="He said ""A1""",B3,0)'),
        ("'A1'!B2+'Input Sheet'!C2", "'A1'!B3+'Input Sheet'!C3"),
        ("SUM('Owner''s A1'!B2)", "SUM('Owner''s A1'!B3)"),
        ("SUM(A2:B2,$C2:D$2)", "SUM(A3:B3,$C3:D$2)"),
        ("Table1[[#This Row],[A1]]+B2", "Table1[[#This Row],[A1]]+B3"),
        ("A1_name+B2", "A1_name+B3"),
        ("ZZZ1+A2", "ZZZ1+A3"),
    ],
)
def test_formula_translation_is_token_aware(formula: str, expected: str) -> None:
    assert _translate_formula_rows(formula, 1) == expected


@pytest.mark.parametrize("formula", ['IF(A2="A1,B2,0)', "'Input Sheet!A2", "Table1[[A1]"])
def test_formula_translation_rejects_unterminated_protected_tokens(formula: str) -> None:
    with pytest.raises(ValueError, match="unterminated"):
        _translate_formula_rows(formula, 1)


def test_shared_formula_is_materialised_and_array_formula_is_rejected() -> None:
    shared = ET.Element(f"{{{MAIN_NS}}}f", {"t": "shared", "si": "7"})
    _materialise_cloned_formula(
        shared,
        template_reference="B5",
        target_reference="B8",
        shared_masters={"7": ("B2", 'IF(A2="A1",B2,0)')},
    )
    assert shared.attrib == {}
    assert shared.text == 'IF(A8="A1",B8,0)'

    array = ET.Element(f"{{{MAIN_NS}}}f", {"t": "array", "ref": "B2:B5"})
    array.text = "A2:A5*2"
    with pytest.raises(ValueError, match="Unsupported cloned formula type: array"):
        _materialise_cloned_formula(
            array,
            template_reference="B2",
            target_reference="B6",
            shared_masters={},
        )


def test_range_growth_only_extends_table_owned_bounds() -> None:
    assert (
        _extend_table_owned_sqref(
            "$B$2:$B$125 $Q$2:$Q$125 $Z$2:$Z$125 $C$2:$C$50",
            table_start_column=1,
            table_end_column=17,
            old_end=125,
            new_end=128,
        )
        == "$B$2:$B$128 $Q$2:$Q$128 $Z$2:$Z$125 $C$2:$C$50"
    )


def test_iteration_and_id_allocation_scan_all_rows_and_fail_closed() -> None:
    assert parse_iteration("2.0") == 2
    with pytest.raises(ValueError, match="positive whole number"):
        parse_iteration("Iteration 2")

    assert allocate_workbook_record_ids(
        iteration=2,
        prefix="QB",
        source_ids=["IT1-QB-0099", "IT2-QB-0009", "IT2-QB-0002", None, "", None],
    ) == [
        "IT1-QB-0099",
        "IT2-QB-0009",
        "IT2-QB-0002",
        "IT2-QB-0010",
        "IT2-QB-0011",
        "IT2-QB-0012",
    ]
    assert allocate_workbook_record_ids(iteration=3, prefix="FB", source_ids=[]) == []
    assert allocate_workbook_record_ids(iteration=3, prefix="FB", source_ids=[None]) == [
        "IT3-FB-0001"
    ]
    with pytest.raises(ValueError, match="Duplicate"):
        allocate_workbook_record_ids(
            iteration=2,
            prefix="QB",
            source_ids=["IT2-QB-0001", "IT2-QB-0001"],
        )
    for malformed in ("IT2-FB-0001", "QB-0001", "IT2-QB-X"):
        with pytest.raises(ValueError, match="Incompatible"):
            allocate_workbook_record_ids(iteration=2, prefix="QB", source_ids=[malformed])


@pytest.mark.skipif(
    not PRIVATE_WORKBOOK.exists() or not PRIVATE_HELPER.exists(),
    reason="Private structural sources are available only in the local validation workspace.",
)
def test_authoritative_workbook_and_hardened_helper_are_structurally_compatible(
    tmp_path: Path,
    request: pytest.FixtureRequest,
) -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())
    source_workbook_hash = sha256(PRIVATE_WORKBOOK.read_bytes()).hexdigest()
    source_helper_hash = sha256(PRIVATE_HELPER.read_bytes()).hexdigest()

    validation = validate_structure(inspect_workbook(PRIVATE_WORKBOOK), manifest)
    assert validation["passed"] is True
    assert validation["header_cells_audited"] == 205

    growth = run_probe(PRIVATE_WORKBOOK, manifest, 3)
    assert growth["source_unchanged"] is True
    assert growth["disposable_removed"] is True
    assert growth["source_parts"] == growth["output_parts"] == 74
    assert growth["unchanged_parts"] == 63
    assert len(growth["changed_parts"]) == 11
    assert growth["formulas_before"] == 20_056
    assert growth["formulas_after"] == 20_221
    assert growth["unchanged_defined_names"] == 27
    assert growth["defined_name_targets"] == {
        "Z_61A693B0_24CC_4BA8_8C2E_3A2E24A5AB80_.wvu.FilterData|10": ("'Free Bets'!$A$1:$AL$174"),
        "Z_CDCB28B3_BC6B_441A_A81B_7CB94D17E405_.wvu.FilterData|9": (
            "'Sportsbook Bets'!$A$1:$BC$533"
        ),
        "Z_ED738785_E81B_4DF3_973A_0B4EB5925F38_.wvu.FilterData|10": ("'Free Bets'!$A$1:$AL$174"),
        "Z_FF6E07D2_D981_42E8_AB46_8FA8E5669783_.wvu.FilterData|7": ("Accounts!$A$1:$Q$128"),
        "_xlnm._FilterDatabase|10": "'Free Bets'!$A$1:$AL$174",
        "_xlnm._FilterDatabase|11": "'Casino Offers'!$A$1:$AB$28",
        "_xlnm._FilterDatabase|7": "Accounts!$A$1:$Q$128",
        "_xlnm._FilterDatabase|8": "'Cash Adjustments'!$A$1:$L$28",
        "_xlnm._FilterDatabase|9": "'Sportsbook Bets'!$A$1:$BC$533",
    }
    assert {
        sheet: (result["table_reference"], result["auto_filter_reference"])
        for sheet, result in growth["growth"].items()
    } == {
        "Accounts": ("A1:Q128", "A1:Q128"),
        "Cash Adjustments": ("A1:L28", "A1:L28"),
        "Sportsbook Bets": ("A1:BC533", "A1:BC533"),
        "Free Bets": ("A1:AL174", "A1:AL174"),
        "Casino Offers": ("A1:AB28", "A1:AB28"),
    }
    assert {
        sheet: result["next_manual_sequence"] for sheet, result in growth["growth"].items()
    } == {
        "Accounts": 130,
        "Cash Adjustments": 29,
        "Sportsbook Bets": 684,
        "Free Bets": 195,
        "Casino Offers": 33,
    }

    output = tmp_path / "workbook-template-export-v1-helper.gs"
    request.addfinalizer(lambda: output.unlink(missing_ok=True))
    subprocess.run(
        [
            sys.executable,
            str(SCRIPTS / "build_workbook_template_helper.py"),
            str(PRIVATE_HELPER),
            str(MANIFEST_PATH),
            str(output),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    hardened = output.read_text()
    coverage = json.loads(
        (ROOT / "docs/contracts/workbook-template-export-v1-field-coverage.json").read_text()
    )

    assert "'EP Catchers'" not in hardened
    assert "freeBetStatusRange" not in hardened
    assert "MB_PROTECTED_FORMAT" not in hardened
    assert "ensureFormulaTemplateForRow_(sheet, row);" in hardened
    assert ".setFormulaR1C1(formula);" in hardened
    assert sha256(output.read_bytes()).hexdigest() == (
        "c9b17ac0be73a771912cfcc31df544575a32f89176ddec9ed339143d2237c14d"
    )
    assert sha256(output.read_bytes()).hexdigest() == coverage["generated_hardened_helper_sha256"]
    assert sha256(PRIVATE_WORKBOOK.read_bytes()).hexdigest() == source_workbook_hash
    assert sha256(PRIVATE_HELPER.read_bytes()).hexdigest() == source_helper_hash

    subprocess.run(
        ["node", "--check"],
        input=hardened,
        check=True,
        capture_output=True,
        text=True,
    )

    runtime_assertions = r"""
const fs = require('fs');
eval(
  fs.readFileSync(process.argv[1], 'utf8') +
  '\n;globalThis.TEST_WORKBOOK_STRUCTURE = WORKBOOK_TEMPLATE_EXPORT_V1_STRUCTURE;'
);

function check(value, message) {
  if (!value) throw new Error(message);
}

check(normaliseHeader_('Offer Group ID') === 'offergroupid', 'spaced header');
check(normaliseHeader_('offer_group-id') === 'offergroupid', 'punctuated header');

const accountHeaders = TEST_WORKBOOK_STRUCTURE
  .ledgers['Accounts'].requiredHeaders;
const formulas = {
  '124:12': '=RC[-1]',
  '125:12': '=RC[-1]'
};
const writes = {};
const accountSheet = {
  getName: () => 'Accounts',
  getLastColumn: () => accountHeaders.length,
  getLastRow: () => 125,
  getRange: (row, column) => ({
    getValues: () => row === 1 ? [accountHeaders] : [[]],
    getFormulaR1C1: () => formulas[row + ':' + column] || null,
    setFormulaR1C1: formula => { writes[row + ':' + column] = formula; }
  })
};
ensureFormulaTemplateForRow_(accountSheet, 126);
check(writes['126:12'] === '=RC[-1]', 'formula copied from complete row');

const sportsbookHeaders = TEST_WORKBOOK_STRUCTURE
  .ledgers['Sportsbook Bets'].requiredHeaders;
const sportsbookSheet = {
  getName: () => 'Sportsbook Bets',
  getLastColumn: () => sportsbookHeaders.length,
  getRange: () => ({getValues: () => [sportsbookHeaders]})
};
const sportsbookMap = getHeaderMap_(sportsbookSheet);
check(
  sportsbookMap[normaliseHeader_('OfferGroupID')] === 54,
  'Offer Group ID linkage resolves'
);

const collisionSheet = {
  getName: () => 'Collision',
  getLastColumn: () => 2,
  getRange: () => ({getValues: () => [['Offer Group ID', 'OfferGroupID']]})
};
let collisionRejected = false;
try { getHeaderMap_(collisionSheet); } catch (_error) { collisionRejected = true; }
check(collisionRejected, 'normalization collision must fail closed');
"""
    subprocess.run(
        ["node", "-e", runtime_assertions, str(output)],
        check=True,
        capture_output=True,
        text=True,
    )

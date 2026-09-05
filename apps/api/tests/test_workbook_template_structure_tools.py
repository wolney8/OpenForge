from __future__ import annotations

import json
import subprocess
import sys
from hashlib import sha256
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from probe_workbook_template_growth import run_probe  # noqa: E402
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


@pytest.mark.skipif(
    not PRIVATE_WORKBOOK.exists() or not PRIVATE_HELPER.exists(),
    reason="Private structural sources are available only in the local validation workspace.",
)
def test_authoritative_workbook_and_hardened_helper_are_structurally_compatible(
    tmp_path: Path,
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

    assert "'EP Catchers'" not in hardened
    assert "freeBetStatusRange" not in hardened
    assert "MB_PROTECTED_FORMAT" not in hardened
    assert "ensureFormulaTemplateForRow_(sheet, row);" in hardened
    assert ".setFormulaR1C1(formula);" in hardened
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

#!/usr/bin/env python3
"""Build a hardened, private Apps Script copy for workbook-template-export-v1."""

from __future__ import annotations

import argparse
from hashlib import sha256
import json
from pathlib import Path
import re
import tempfile


def _replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise ValueError(f"{label}: expected one source match, found {count}")
    return source.replace(old, new, 1)


def _replace_pattern_once(
    source: str, pattern: str, replacement: str, label: str
) -> str:
    result, count = re.subn(
        pattern, lambda _match: replacement, source, count=1, flags=re.DOTALL
    )
    if count != 1:
        raise ValueError(f"{label}: expected one source match, found {count}")
    return result


def _runtime_manifest(manifest: dict[str, object]) -> dict[str, object]:
    ledgers = {}
    for sheet_name, ledger in manifest["ledgers"].items():
        ledgers[sheet_name] = {
            "formulaHeaders": ledger["formula_helper_headers"],
            "protectedHeaders": ledger["protected_headers"],
            "requiredHeaders": ledger["required_headers"],
            "templateStrategy": ledger["template_strategy"],
        }
    return {
        "contract": manifest["contract"],
        "manifestVersion": manifest["manifest_version"],
        "ledgers": ledgers,
    }


def harden(source: str, manifest: dict[str, object], manifest_hash: str) -> str:
    source = _replace_once(
        source,
        "  freeBetStatusRange: 'Y3:Y999',\n",
        "",
        "remove unused Free Bet status range",
    )
    source = _replace_once(
        source,
        """    'EP Catchers': {
      prefix: 'EP',
      idCol: 1,
      applyTemplate: true
    },

""",
        "",
        "remove obsolete EP Catchers configuration",
    )

    runtime_json = json.dumps(_runtime_manifest(manifest), indent=2, ensure_ascii=True)
    structure_block = f"""// Generated from workbook-template-export-v1-ledger-structure.json.
// Manifest SHA-256: {manifest_hash}
const WORKBOOK_TEMPLATE_EXPORT_V1_STRUCTURE = {runtime_json};
const WORKBOOK_TEMPLATE_EXPORT_V1_PROTECTED_GREY = '#cdcdcd';

"""
    source = _replace_pattern_once(
        source,
        r"const MB_PROTECTED_FORMAT = \{.*?\n\};\n\n(?=/\*{39}\n \* MENU)",
        structure_block,
        "replace protected-format configuration",
    )

    source = _replace_once(
        source,
        "  const hasContent = rowValues.some(v => String(v).trim() !== '');\n"
        "  if (!hasContent) return;\n\n"
        "  enforceRowFormatting_(sheet, row);",
        "  const hasContent = rowValues.some(v => String(v).trim() !== '');\n"
        "  if (!hasContent) return;\n\n"
        "  ensureFormulaTemplateForRow_(sheet, row);\n"
        "  enforceRowFormatting_(sheet, row);",
        "apply formula template during onEdit",
    )

    protected_helpers = """function applyProtectedCellColour_(sheet, row) {
  const structure = getWorkbookTemplateLedgerStructure_(sheet.getName());
  if (!structure || row < 2) return;

  const headers = getHeaderMap_(sheet);
  assertWorkbookTemplateHeaders_(sheet.getName(), headers, structure.requiredHeaders);

  structure.protectedHeaders.forEach(header => {
    const column = headers[normaliseHeader_(header)];
    sheet
      .getRange(row, column)
      .setBackground(WORKBOOK_TEMPLATE_EXPORT_V1_PROTECTED_GREY);
  });
}

"""
    source = _replace_pattern_once(
        source,
        r"function applyProtectedCellColour_\(sheet, row\) \{.*?\n\}\n\n"
        r"function columnSpecToRange_\(spec\) \{.*?\n\}\n\n"
        r"function columnLetterToNumber_\(letter\) \{.*?\n\}\n\n",
        protected_helpers,
        "replace protected formatting helpers",
    )

    row_template_helpers = """function getWorkbookTemplateLedgerStructure_(sheetName) {
  return WORKBOOK_TEMPLATE_EXPORT_V1_STRUCTURE.ledgers[sheetName] || null;
}

function assertWorkbookTemplateHeaders_(sheetName, headerMap, requiredHeaders) {
  const missing = requiredHeaders.filter(header => !headerMap[normaliseHeader_(header)]);
  if (missing.length) {
    throw new Error(
      sheetName + ' is missing required workbook-template headers: ' + missing.join(', ')
    );
  }
}

function findNearestCompleteFormulaRow_(sheet, targetRow, headerMap, formulaHeaders) {
  const lastRow = sheet.getLastRow();
  const formulaColumns = formulaHeaders.map(header => headerMap[normaliseHeader_(header)]);

  for (let distance = 1; distance <= Math.max(lastRow, targetRow); distance++) {
    const candidates = [targetRow - distance, targetRow + distance];

    for (const candidate of candidates) {
      if (candidate < 2 || candidate > lastRow || candidate === targetRow) continue;

      const complete = formulaColumns.every(column =>
        Boolean(sheet.getRange(candidate, column).getFormulaR1C1())
      );

      if (complete) return candidate;
    }
  }

  throw new Error(
    sheet.getName() + ' has no structurally complete formula template row.'
  );
}

function ensureTargetRowExists_(sheet, row) {
  const missingRows = row - sheet.getMaxRows();
  if (missingRows > 0) {
    sheet.insertRowsAfter(sheet.getMaxRows(), missingRows);
  }
}

function ensureFormulaTemplateForRow_(sheet, row) {
  const structure = getWorkbookTemplateLedgerStructure_(sheet.getName());
  if (!structure || !structure.formulaHeaders.length || row < 2) return;

  const headers = getHeaderMap_(sheet);
  assertWorkbookTemplateHeaders_(sheet.getName(), headers, structure.requiredHeaders);

  const missingHeaders = structure.formulaHeaders.filter(header => {
    const column = headers[normaliseHeader_(header)];
    return !sheet.getRange(row, column).getFormulaR1C1();
  });
  if (!missingHeaders.length) return;

  const templateRow = findNearestCompleteFormulaRow_(
    sheet,
    row,
    headers,
    structure.formulaHeaders
  );

  missingHeaders.forEach(header => {
    const column = headers[normaliseHeader_(header)];
    const formula = sheet.getRange(templateRow, column).getFormulaR1C1();
    if (!formula) {
      throw new Error(sheet.getName() + ' formula template is incomplete for ' + header + '.');
    }
    sheet.getRange(row, column).setFormulaR1C1(formula);
  });
}

function applyRowTemplateFromAbove_(sheet, row) {
  if (row <= 2) return;

  ensureTargetRowExists_(sheet, row);

  const structure = getWorkbookTemplateLedgerStructure_(sheet.getName());
  let templateRow = row - 1;

  if (structure) {
    const headers = getHeaderMap_(sheet);
    assertWorkbookTemplateHeaders_(sheet.getName(), headers, structure.requiredHeaders);
    templateRow = findNearestCompleteFormulaRow_(
      sheet,
      row,
      headers,
      structure.formulaHeaders
    );
  }

  const lastCol = sheet.getLastColumn();
  const source = sheet.getRange(templateRow, 1, 1, lastCol);
  const target = sheet.getRange(row, 1, 1, lastCol);

  source.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
  source.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);
  sheet.setRowHeight(row, sheet.getRowHeight(templateRow));

  ensureFormulaTemplateForRow_(sheet, row);
}

"""
    source = _replace_pattern_once(
        source,
        r"function applyRowTemplateFromAbove_\(sheet, row\) \{.*?\n\}\n\n"
        r"(?=/\*{39}\n \* SET FOOTBALL FINISH TIME)",
        row_template_helpers,
        "replace row-template strategy",
    )

    header_helpers = """function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  const originals = {};

  headers.forEach((header, i) => {
    if (!header) return;

    const key = normaliseHeader_(header);
    if (!key) {
      throw new Error(
        sheet.getName() + ' contains a header that cannot be normalized: ' + header
      );
    }

    if (map[key]) {
      throw new Error(
        sheet.getName() + ' contains colliding headers after normalization: ' +
        originals[key] + ' and ' + header
      );
    }

    map[key] = i + 1;
    originals[key] = String(header);
  });

  return map;
}

function normaliseHeader_(header) {
  const raw = String(header || '').trim();
  const decomposed = typeof raw.normalize === 'function' ? raw.normalize('NFKD') : raw;
  return decomposed
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

"""
    source = _replace_pattern_once(
        source,
        r"function getHeaderMap_\(sheet\) \{.*?\n\}\n\n"
        r"function normaliseHeader_\(header\) \{.*?\n\}\n\n",
        header_helpers,
        "replace header normalization",
    )
    return source


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--force", action="store_true")
    arguments = parser.parse_args()

    if arguments.source.resolve() == arguments.output.resolve():
        raise SystemExit("Refusing to overwrite the source helper script.")
    if arguments.output.exists() and not arguments.force:
        raise SystemExit("Output exists; pass --force to replace the disposable copy.")

    source_bytes = arguments.source.read_bytes()
    manifest_bytes = arguments.manifest.read_bytes()
    manifest = json.loads(manifest_bytes)
    source_hash = sha256(source_bytes).hexdigest()
    if source_hash != manifest["source_helper_sha256"]:
        raise SystemExit(
            "Source helper fingerprint does not match the signed manifest."
        )

    result = harden(
        source_bytes.decode("utf-8"),
        manifest,
        sha256(manifest_bytes).hexdigest(),
    )
    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=arguments.output.parent, delete=False
    ) as temporary:
        temporary.write(result)
        temporary_path = Path(temporary.name)
    temporary_path.replace(arguments.output)

    print(
        json.dumps(
            {
                "contract": manifest["contract"],
                "output": str(arguments.output),
                "output_sha256": sha256(arguments.output.read_bytes()).hexdigest(),
                "source_sha256": source_hash,
                "source_unchanged": sha256(arguments.source.read_bytes()).hexdigest()
                == source_hash,
            },
            indent=2,
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    main()

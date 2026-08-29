from __future__ import annotations

import argparse
import json
from pathlib import Path

from openforge_api.founder_workbook_dry_run import (
    build_founder_workbook_dry_run,
    write_private_artifacts,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the read-only founder workbook analysis")
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--effective-at", required=True)
    parser.add_argument("--catalogue", type=Path, default=None)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    result = build_founder_workbook_dry_run(
        args.workbook,
        effective_at=args.effective_at,
        catalogue_path=args.catalogue,
    )
    paths = write_private_artifacts(result, args.output)
    print(json.dumps({"readiness": result["readiness"], "artifacts": [str(path) for path in paths]}))


if __name__ == "__main__":
    main()

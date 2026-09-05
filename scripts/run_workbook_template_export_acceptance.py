#!/usr/bin/env python3
"""Run the isolated browser-to-API workbook export acceptance gate."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    with tempfile.TemporaryDirectory(
        prefix="workbook-template-export-acceptance-"
    ) as runtime:
        environment = {
            **os.environ,
            "WORKBOOK_TEMPLATE_ACCEPTANCE_RUNTIME_DIR": runtime,
        }
        result = subprocess.run(
            [
                "pnpm",
                "exec",
                "playwright",
                "test",
                "--config=playwright.workbook-template-acceptance.config.ts",
            ],
            cwd=ROOT,
            env=environment,
            check=False,
        )
        raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()

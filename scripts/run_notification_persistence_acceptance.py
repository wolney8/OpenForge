#!/usr/bin/env python3
"""Run the isolated browser-to-API notification persistence gate."""

from __future__ import annotations

import os
from pathlib import Path
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="notification-persistence-acceptance-") as runtime:
        result = subprocess.run(
            [
                "pnpm",
                "exec",
                "playwright",
                "test",
                "--config=playwright.notification-persistence.config.ts",
            ],
            cwd=ROOT,
            env={**os.environ, "NOTIFICATION_ACCEPTANCE_RUNTIME_DIR": runtime},
            check=False,
        )
        raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()

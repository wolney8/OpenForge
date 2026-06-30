# Tracker Workflow Review

## Purpose

Use this skill when checking whether a proposed or implemented OpenForge web workflow preserves the spreadsheet workflow.

## Review steps

1. Identify the workbook-equivalent process.
2. Identify the intended route and screen flow.
3. Confirm profile context is explicit throughout the workflow.
4. Confirm required statuses and transitions are preserved.
5. Confirm calculations and reports touched by the workflow are named.
6. Confirm audit notes or change history are not lost.
7. Confirm the web flow improves UX without changing core financial meaning.

## Output format

Report:

- preserved workflow elements
- changed workflow elements
- risks introduced by the web flow
- missing spreadsheet behaviours
- recommended follow-up tasks

## Stop conditions

Stop and escalate if the workflow removes workbook steps that materially affect balances, profit, exposure, or auditability.

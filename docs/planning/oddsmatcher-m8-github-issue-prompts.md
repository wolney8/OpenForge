# GitHub Prompts for Creating M8 Oddsmatcher Issues

_Last updated: 2026-07-08_

Use these prompts in GitHub Copilot Chat (in your repository) to create issues from the prepared draft file.

Source draft file:

- `docs/planning/oddsmatcher-m8-issue-drafts.md`

## Prompt 1: Create all issues from draft file

```text
Read docs/planning/oddsmatcher-m8-issue-drafts.md and create one GitHub issue per section.

Requirements:
- Keep the issue titles exactly as written.
- Use each markdown body exactly as written.
- Add labels: m8, oddsforge, planning.
- Keep issue order exactly as in the file.
- After creating them, output a numbered list with issue numbers and URLs.
```

## Prompt 2: Create only architecture + math issues

```text
Read docs/planning/oddsmatcher-m8-issue-drafts.md and create only these issues:
- M8 - Build Oddsmatcher component architecture (shell, drawers, table, bet summary modal)
- M8 - Implement modal calculator math module with conservative headline total
- M8 - Implement advanced underlay/standard/overlay controls with bounded stake range

Requirements:
- Copy title and body exactly.
- Add labels: m8, oddsforge, architecture.
- Return issue numbers and URLs.
```

## Prompt 3: Create only test-hardening issue

```text
Create this issue from docs/planning/oddsmatcher-m8-issue-drafts.md:
- M8 - Add E2E coverage for modal layering, close controls, and row-action flows

Requirements:
- Keep title/body exact.
- Add labels: m8, oddsforge, qa.
- Assign to @me.
- Return created issue URL.
```

## Prompt 4: Dry-run validation before creation

```text
Read docs/planning/oddsmatcher-m8-issue-drafts.md and perform a dry-run validation.

Check:
- every issue has Goal, Scope, Acceptance criteria, Non-goals
- no issue requests live scraping or bet automation
- no issue introduces tracker settlement coupling

Then output:
- pass/fail per issue
- any exact lines that need editing
Do not create issues in this step.
```

## Prompt 5: Create issues with milestone and project fields

```text
Read docs/planning/oddsmatcher-m8-issue-drafts.md and create all issues.

For each issue:
- set milestone: M8
- add labels: m8, oddsforge
- add project field Phase = M8 Oddsmatcher Boundary

Finally output a checklist:
- issue title
- issue number
- issue URL
- milestone and labels applied (yes/no)
```

## Notes

- If your repo has a different milestone name, replace `M8` in the prompt.
- If your repo uses different labels, replace label values in the prompt.
- If GitHub Copilot cannot create issues directly in your environment, run Prompt 4 and then copy/paste from `docs/planning/oddsmatcher-m8-issue-drafts.md` manually.

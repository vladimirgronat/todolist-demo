# Implementation Progress Ledger

Use this document as the persistent execution ledger for spec/plan implementation. Keep it updated after every delegated task.

## Source SPEC

- Spec: [link or file path]
- Plan: [link or file path]
- Planner handoff version/date: [value]

## Current Wave

- Active wave: [Wave N]
- Wave goal: [short description]
- Wave entry criteria met: [yes/no]

## Task Status Table

Allowed status values:

- `not-started`
- `in-progress`
- `blocked`
- `implemented`
- `failed`

| Task ID | Task | Agent | Depends On | Status | Last Update | Evidence | Notes |
|---------|------|-------|------------|--------|-------------|----------|-------|
| T1 | [task title] | [agent] | none | not-started | YYYY-MM-DD | [link/test/doc] | [notes] |
| T2 | [task title] | [agent] | T1 | not-started | YYYY-MM-DD | [link/test/doc] | [notes] |

## Completed Log

| Date | Task ID | Result | Verification Evidence |
|------|---------|--------|-----------------------|
| YYYY-MM-DD | T1 | implemented | [lint/test/contract check details] |

## Blockers

| Task ID | Blocker Type | Description | Owner | Next Action | Updated |
|---------|--------------|-------------|-------|-------------|---------|
| T2 | dependency | Waiting for T1 contract finalization | manager | Re-dispatch after T1 implemented | YYYY-MM-DD |

## Verification Checklist

- [ ] Task-level acceptance criteria validated for each `implemented` task
- [ ] Interface contracts validated between dependent tasks
- [ ] Wave gate passed before advancing to next wave
- [ ] Final lint/test/build checks passed (as required by scope)
- [ ] Remaining non-implemented tasks are explicitly `blocked` or `failed` with owner and next step

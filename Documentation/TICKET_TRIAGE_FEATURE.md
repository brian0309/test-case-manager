# Ticket Triage & Divergence Tracking

End-to-end triage analytics for bug tickets: **time-to-reproduce**, **% returned for missing context**, **snapshot divergence**, all segmented by **failure type** and **team**.

## Feature Overview

Three capabilities were added on top of the existing ticket system:

1. **Immutable run-snapshot divergence diff** — when a bug is filed from a failed run item, the ticket stores a copy of the test case at that moment. If the live test case later changes, the ticket shows exactly what drifted (title, priority, area, expected result, description, steps).
2. **Lifecycle tracking** — tickets record when they were first reproduced (`firstReproducedAt`) and a "returned for missing info" counter/reason (`returnedCount`, `lastReturnReason`).
3. **Triage analytics** — a new **Triage** tab in Analytics computes time-to-reproduce and returned-for-context rates, segmented by failure type and team, with deep links back to the filtered ticket list.

---

## How It Works (End to End)

### 1. Create a test run with context metadata
In the **Test Runs** page → **Create Test Run**, you can now set (all optional):

- **Team** — free text (suggestions shown from previous runs), e.g. `Payments`
- **Environment** — e.g. `staging`
- **Build Version** — e.g. `v1.4.2`

These are copied to every ticket created from a failed item in that run.

### 2. Fail a case → file a bug
Execute a run; when a case fails, the **Fail Bug** prompt appears. It now includes:

- A **Failure Type** picker (pre-selected via auto-suggestion from the description/tags — e.g. `Functional`, `Data/API`, `Flaky/Intermittent`), overridable at any time
- Read-only run context chips: environment, team, build version

The ticket is created with:
- `failureType`, `team`, `environment`, `buildVersion`
- `failureAt` — the time the run item failed (used as the TTR start point)
- The run-item **case snapshot** (used for the divergence diff)

> Note: the failure type can also be set/edited manually on a ticket via **Tickets → Edit**.

### 3. Manage lifecycle on a ticket
Open any ticket (from Tickets list, kanban, or the run report). In the **Triage** section:

- **Mark reproduced** → sets `firstReproducedAt` (idempotent; first timestamp is kept). A green **Reproduced** chip appears on the ticket.
- **Return for missing info** → pick a reason (`Missing steps`, `Missing expected vs actual`, `Missing environment/build`, `Missing attachment`, `Not reproducible`, `Other`). Reopens the ticket and increments the return counter. An amber **Returned ×N** chip appears.

Lifecycle status chips (`Reproduced`, `Returned ×N`) and the failure-type chip show on list rows, mobile cards, and kanban cards.

### 4. See the divergence diff
If the ticket was filed from a run item and the source test case has changed since, the ticket detail shows an amber **"Snapshot differs from live test case"** banner listing each changed field with the **run snapshot** versus the **live value**. Fields compared: `title`, `priority`, `area`, `expectedResult`, `testDescription`, `stepsContent`. If the source test case was deleted, the banner reports that instead. If everything matches, a green **"Snapshot up to date"** chip is shown.

### 5. Analyze in Analytics → **Triage** tab
Metrics honour the global date-range and tag/group filters (group-by day/week/month comes from the Trends grouping):

- **KPI cards** — tickets created, reproduction rate (%), median time-to-reproduce (with average), % returned for info
- **Triage trend chart** — created vs reproduced vs returned per period
- **By Failure Type** and **By Team** tables — created, reproduced, reproduction rate, median TTR, returned count/rate for each segment
- **Return Reasons** — share of returns by reason with bars

Clicking any segment row deep-links to the ticket list pre-filtered to that failure type or team.

## API Reference (Backend)

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/projects/:projectId/tickets/:id/reproduced` | Mark ticket reproduced (idempotent) |
| `POST` | `/api/projects/:projectId/tickets/:id/return-for-info` | Body `{ reason: ReturnReason }` — reopen + increment counter |
| `GET` | `/api/reports/project/:projectId/ticket-metrics` | Query params: `startDate`, `endDate`, `failureType`, `team`, `status`, `severity`, `priority`, `groupBy=day\|week\|month` |

**Definitions**
- **Time-to-reproduce (TTR)** = `firstReproducedAt − failureAt` (falls back to `createdAt − failureAt` if not reproduced), reported in hours as median / avg / p75 across reproduced tickets.
- **Returned %** = tickets with `returnedCount >= 1` ÷ tickets created in the period.

## Frontend Deep-Links

- Ticket list filters by URL: `/test-manager/tickets?failureType=Data%2FAPI` or `?team=Payments` (both can be combined).
- Ticket detail from a run report already deep-links to the ticket; divergence is computed on the ticket detail endpoint.

To reset filters, use **Clear** (or select “All types”/“All teams” in the dropdown).

## Configuration

No new environment variables are required. Backend uses existing `MONGO_URI` schema (new indexed ticket fields are applied automatically via Mongoose).

## Notes

- `firstReproducedAt` and subsequent lifecycle fields are optional; older tickets simply show “Reproduced / Returned” only once the lifecycle actions are used.
- Failure-type auto-suggestion is a best-effort heuristic — QAs should confirm/override it before saving.

## Tests

New unit coverage in `backend/__tests__/unit/services/ticket.service.test.ts`:
creator failure-type suggestion, snapshot divergence computation (deleted case, changed fields, HTML-formatting-insensitive HTML fields), reproduce idempotency, and returned-for-info counter/reopen behavior. Full suite: `npm test` (275 passing).
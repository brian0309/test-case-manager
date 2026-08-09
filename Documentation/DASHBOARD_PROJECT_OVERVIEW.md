# Project Dashboard Overview

A project-scoped overview on the main Dashboard. When a project is selected, the dashboard shows **ticket counts by status**, **test run status counts (completed / running)**, **suite and test case counts** — every count deep-links to the corresponding page with the right filter pre-applied.

## Feature Overview

1. **Project overview section** — appears below the existing global stats cards (`Total Projects / Suites / Test Cases`) only when a project is active (`activeProject` in `testManagerStore`).
2. **Tickets by status** — count per ticket status (`Open`, `In Progress`, `Resolved`, `Closed`, `Reopened`) shown as a stacked status bar inside the Tickets card plus a clickable status breakdown list.
3. **Test runs** — `Completed` and `In Progress` counts (plus `Draft`/`Abandoned`), deep-linking to a status-filtered Test Runs list.
4. **Suites & Test Cases** — counts that navigate to `/test-manager/suites` and `/test-manager/cases`.
5. **Project switcher** — the existing `ProjectSelector` component is reused on the dashboard so users can switch projects without leaving the page.

---

## How It Works (End to End)

### 1. Select a project
The dashboard reads `activeProject` from `useTestManagerStore` (persisted to `localStorage`). If no project is selected, the dashboard renders exactly as before. Once a project is selected, the overview section loads.

### 2. Project stats endpoint
The frontend calls `getProjectDashboardStats(projectId)` → `GET /api/statistics/project/:projectId`:

- **Authorization** — the requesting user must be the project owner or a member (`Project.find({ _id, $or: [{ ownerId }, { members }] })`); otherwise `404`.
- **Counts** — one `Promise.all` of:
  - `Ticket.aggregate` grouping by `status`
  - `TestRun.aggregate` grouping by `status`
  - `TestSuite.countDocuments({ projectId })`
  - `TestCase.countDocuments({ projectId })`
- **Response** — every enum value is present with `0` as default so the UI never renders gaps:

```json
{
  "projectId": "…",
  "projectName": "…",
  "ticketsByStatus": [
    { "status": "Open", "count": 12 },
    { "status": "In Progress", "count": 3 },
    { "status": "Resolved", "count": 5 },
    { "status": "Closed", "count": 20 },
    { "status": "Reopened", "count": 1 }
  ],
  "runsByStatus": [
    { "status": "Draft", "count": 2 },
    { "status": "In Progress", "count": 1 },
    { "status": "Completed", "count": 8 },
    { "status": "Abandoned", "count": 0 }
  ],
  "suitesCount": 6,
  "casesCount": 150
}
```

### 3. Click-through navigation
Every metric is a link:

| Dashboard element | Navigates to | Resulting filter |
| --- | --- | --- |
| Ticket status row / bar segment | `/test-manager/tickets?status=Open` | Status filter applied to the ticket list |
| Multiple statuses (bar segments) | `/test-manager/tickets?status=Open,Resolved` | Comma-separated multi-status filter |
| Test Runs card — Completed | `/test-manager/runs?runStatus=Completed` | Runs list filtered to `Completed` |
| Test Runs card — In Progress | `/test-manager/runs?runStatus=In%20Progress` | Runs list filtered to `In Progress` |
| Suites tile | `/test-manager/suites` | — |
| Test Cases tile | `/test-manager/cases` | — |

The Tickets page already had URL-param support (`ticketId`, `failureType`, `team`); the `status` param follows the same pattern — it is read, applied to local filter state, then removed from the URL with `{ replace: true }` so refreshes don't re-apply it.

The Test Runs page previously had **no status filter**; a new status filter dropdown was added to the runs header (next to the existing group filter) and a `runStatus` URL param was added, so deep links land on a filtered list. Filtering is client-side over the paginated list, matching the tickets page pattern.

---

## API Reference (Backend)

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/statistics/project/:projectId` | Project-scoped dashboard counts (tickets by status, runs by status, suites, cases) |

Auth: cookie-based JWT via `verifyToken` (same router-level middleware as `/api/statistics`).

## Files Changed

**Backend**
- `backend/services/statistics/controllers/statistics.controller.ts` — new `getProjectDashboardStats` handler
- `backend/services/statistics/routes/statistics.route.ts` — new route

**Frontend**
- `frontend/src/services/statisticsApi.ts` — `getProjectDashboardStats()` + `ProjectDashboardStats` type
- `frontend/src/pages/DashboardPage.tsx` — project overview section (header + switcher, 4 stat tiles, ticket status breakdown)
- `frontend/src/pages/testManager/TicketsPage.tsx` — `status` URL param support
- `frontend/src/pages/testManager/TestRunsPage.tsx` — status filter dropdown + `runStatus` URL param

## Edge Cases

- **No active project** — overview section hidden; dashboard unchanged.
- **Project not accessible** — endpoint returns `404`; the dashboard shows a toast and keeps the section in a neutral state.
- **Zero counts** — all statuses render with `0`, the stacked bar is empty, and clicking still navigates to the (empty) filtered list.
- **Stale persisted project** — if `activeProject` no longer resolves to a project in the store list, the section hides gracefully.

## Testing

- Backend integration test (`backend/__tests__/`) uses the in-memory DB helpers (`setup/testDb.ts`) and verifies: authorized counts, all statuses present with `0` defaults, and `404` for a project the user doesn't own/isn't a member of.
- Verification commands: `npm run lint:backend`, `cd frontend && npm run lint`, `npm run type-check`, `cd frontend && npm run type-check`, `npm test`.

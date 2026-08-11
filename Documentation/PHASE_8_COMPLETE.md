# Phase 8 Implementation Summary — Google Drive Video Evidence

## Date: August 11, 2026

## Overview
Implemented the Google Drive Video Evidence feature for Tickets and Test Runs as outlined in
`Feature Plan_ Google Drive Video Evidence for Tickets and Test Runs.md`. The backend authorizes
resumable uploads, the browser uploads video bytes **directly to Google Drive** (no proxy), and the
app stores only metadata. Playback streams through an authenticated backend proxy with Range support.

## Status: 100% Complete ✅

- Backend type-check: 0 errors
- Backend lint: 0 errors
- Frontend type-check: 0 errors
- Frontend lint: 0 errors
- New backend tests: 19/19 passing

---

## 1. Architecture (Plan Phase 1)

Adopted **Approach 3** from the plan (upload architecture section):

```
Browser  ── PUT resumable session (Authorization: Bearer <Drive access token>) ──►  Google Drive
    ▲                                                                                     │
    │ POST /upload-session (media metadata, no bytes)                                    │ stores file
    │ POST / (register with driveFileId)                                                  │
Backend / MongoDB  ▲───────────────────────────────────────────────────────────────────────┘
    │ streams via proxy: GET /:evidenceId/stream (Range requests)
```

- Backend: `backend/services/drive/` (feature-module layout per repo conventions).
- Evidence attaches **per run item** (`testRunId` + `testRunItemId`) or **per ticket** (`ticketId`).
- Videos are stored in the **uploader's own Google Drive** (user-owned, `drive.file` scope).
- Files are **private by default**; the project setting `publicLinks` opts into
  anyone-with-link sharing with `allowFileDiscovery: false`.

## 2. Database (Plan Phase 2)

- `backend/models/user.model.ts` — added `googleDrive` subdocument:
  - `refreshToken` (selected: false, encrypted with AES-256-CBC), `googleEmail`, `googleId`,
    `connectedAt`, `folders` (Map of projectId → Drive folder id, cached).
- `backend/models/videoEvidence.model.ts` — new standalone model:
  - `projectId`, `ticketId?`, `testRunId?`, `testRunItemId?`, `uploadedBy`, `provider`
    (`google_drive`), `driveFileId` (unique index), `fileName`, `mimeType`, `fileSize`,
    `webViewLink?`, timestamps. Indexed on `projectId+ticketId` and `projectId+testRunId+testRunItemId`.
- `backend/models/project.model.ts` — project settings gained `videoEvidence { enabled, publicLinks }`
  (both default `false`). Types updated in `backend/types/user.types.ts`,
  `backend/services/testCase/types/testCase.types.ts`, `backend/types/api.types.ts`.

## 3. Backend (Plan Phase 3)

New module `backend/services/drive/`:

| File | Purpose |
|---|---|
| `routes/drive.route.ts` | `GET /api/drive/auth/url`, `GET /api/drive/auth/callback` (public), `GET/DELETE /api/drive/connection` |
| `routes/videoEvidence.route.ts` | mounted at `/api/projects/:projectId/video-evidence` (all `verifyToken`): `POST /upload-session`, `POST /`, `GET /`, `DELETE /:evidenceId`, `GET /:evidenceId/stream` |
| `services/driveOAuth.service.ts` | Auth URL (state cookie `drive_oauth_state`, `access_type=offline`, `prompt=consent`), code exchange (requires refresh token + userinfo email), in-memory access-token cache, revoke |
| `services/driveApi.service.ts` | REST wrapper: resumable session creation, metadata, media streaming (Range), delete, permission creation, `ensureRootFolder`/`ensureProjectFolder` |
| `services/driveConnection.service.ts` | connection read/save/disconnect on the User doc; disconnect revokes the token but never deletes files |
| `services/tokenCrypto.ts` | `encryptDriveToken`/`decryptDriveToken`, AES-256-CBC, key `GOOGLE_TOKEN_ENCRYPTION_KEY || ENCRYPTION_KEY` (must be 32 chars) |
| `services/videoEvidence.service.ts` | guards (member + enabled + connected), scope validation against Ticket/TestRun, **Drive-side verification** (`appProperties.app === 'test-case-manager'` + `owners[0].me`) to block arbitrary `driveFileId` injection, registration, listing, delete (uploader deletes the Drive file; owner removes metadata only), Range streaming |
| `controllers/driveAuth.controller.ts`, `controllers/videoEvidence.controller.ts` | HTTP handlers; stream controller forwards Range + pipes `Readable.fromWeb` |

Project settings gate: `project.service.ts` — `updateProjectSettings` returns 403
for non-owners when the payload touches `videoEvidence`.
Routes mounted in `backend/index.ts` (`/api/drive`, `/api/projects/:projectId/video-evidence`).

## 4. Frontend (Plan Phase 4)

- `types/testManager.ts` — `VideoEvidenceSettings`, `DriveConnection`, `VideoEvidence`,
  `DriveUploadSession`, `ProjectSettings.videoEvidence`.
- `services/googleDriveApi.ts` — connection, session creation, register, list, delete, stream URL
  (always uses `API_URL` + `withCredentials`).
- `utils/videoEvidence.ts` — client-side MIME/size validation + size formatting.
- `components/testManager/drive/`:
  - `DriveConnectPanel` — connect prompt with OAuth redirect.
  - `VideoEvidenceUploader` — drag/drop, XHR `upload.onprogress`, cancel (abort) and retry.
  - `VideoEvidencePlayer` — proxy `<video>` stream, "Video unavailable" fallback, Open in Drive,
    Delete (uploader only); iframe preview when `publicLinks` is on.
  - `VideoEvidenceSection` — orchestrator: hidden when disabled, connect → list → upload; `readOnly` mode.
- Wiring: `TicketDetailView` (ticket scope), `ExecuteRunModal` (per run item scope),
  `RunDetailView` rows open `ExecuteRunModal` where evidence is shown.
- `ProjectSettingsModal` — new **Integrations** tab (owner can toggle enable/public links; members
  see an owner-only notice).
- `SettingsPage` — new **Integrations** tab: Connect / Disconnect with connected email.
- `pages/DriveOAuthRedirect.tsx` + route `/drive-oauth-redirect` in `App.tsx`
  (protected; backend redirects here after the callback).

## 5. Google Cloud Configuration (Plan Phase 5)

1. In the OAuth 2.0 Client already used for login, add the Drive callback redirect URI, e.g.
   `http://localhost:5000/api/drive/auth/callback` (dev) and the deployed domain (prod).
2. Add the same URI to `GOOGLE_ALLOWED_REDIRECT_URIS`.
3. Enable the **Google Drive API** for the project.
4. Scopes used: `https://www.googleapis.com/auth/drive.file` + `https://www.googleapis.com/auth/userinfo.email`.

## 6. Security (Plan Phase 6)

- `drive.file` scope limits access to files created by this app inside created folders.
- Drive refresh token is encrypted at rest (`GOOGLE_TOKEN_ENCRYPTION_KEY || ENCRYPTION_KEY`);
  never returned to the client; access tokens cached in memory.
- `verifyToken` on every evidence endpoint; `hasProjectAccess`/`isProjectOwner` for authorization.
- Registration verifies the file was created through this app (app property + owner check)
  **before** metadata is stored.
- Stream endpoint only proxies the uploader's own file to project members; 409 when the
  uploader disconnected, 404 when Drive reports 403/404 on the media.
- Non-owners cannot change `videoEvidence` project settings (403).

## 7. Testing (Plan Phase 7)

- `backend/services/drive/__tests__/videoEvidence.service.test.ts` — 19 tests with mocked models +
  drive API wrapper: session creation (happy path, disabled, bad mime, not connected, invalid ticket,
  missing scope), registration (verification, app property/owner rejection, public-links permission,
  duplicate), delete (permissions, uploader vs owner Drive deletion, 404), streaming (403/404/409),
  listing.
- Manual flows: project owner toggles setting; user connects Drive (Settings → Integrations);
  upload from a ticket and from the execute-run modal with progress bar; playback via proxy;
  delete; disconnect review; disabled-project invisibility.

## 8. Implementation Notes (Plan Phase 8)

- `.env.example` documents the new variables:
  `GOOGLE_DRIVE_REDIRECT_URI`, `GOOGLE_TOKEN_ENCRYPTION_KEY`, `GOOGLE_DRIVE_ROOT_FOLDER_NAME`,
  `VIDEO_EVIDENCE_MAX_SIZE_MB` (defaults: `Test Case Manager`, `1024`).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are shared with the existing login OAuth.
- Known pre-existing unrelated issue (not introduced by this feature): duplicate
  `app.use("/api/upload", …)` in `backend/index.ts:64-65`.

## Success Criteria Check

1. ✅ Admin can enable/disable video evidence (Integrations tab, owner-only).
2. ✅ Completely hidden when disabled.
3. ✅ Google Drive OAuth connection flow.
4. ✅ Tokens encrypted at rest; access tokens never stored plaintext.
5. ✅ No large video bytes pass through the backend (direct browser → Drive).
6. ✅ Videos stored in the uploader's Google Drive.
7. ✅ App stores Drive file ID + metadata.
8. ✅ Playback from Tickets.
9. ✅ Playback from Test Runs (per run item via execute modal).
10. ✅ Multiple videos per scope.
11. ✅ Project/per-user permissions enforced.
12. ✅ Files private by default; public links opt-in with `allowFileDiscovery: false`.
13. ✅ Missing/removed Drive files handled gracefully ("Video unavailable").
14. ✅ Users can disconnect Drive (revokes token; files remain).
15. ✅ Existing functionality unchanged when disabled.
16. ✅ Automated tests cover critical paths and security boundaries.

---

## Files Changed / Added

**Backend**
- `backend/types/user.types.ts`, `backend/models/user.model.ts`
- `backend/models/videoEvidence.model.ts` (new)
- `backend/models/project.model.ts`
- `backend/services/testCase/types/testCase.types.ts`, `backend/services/testCase/services/project.service.ts`
- `backend/services/testCase/controllers/project.controller.ts`
- `backend/types/api.types.ts`
- `backend/services/drive/**` (new: routes, controllers, services, types)
- `backend/services/drive/__tests__/videoEvidence.service.test.ts` (new)
- `backend/index.ts`

**Frontend**
- `frontend/src/types/testManager.ts`
- `frontend/src/services/googleDriveApi.ts` (new)
- `frontend/src/utils/videoEvidence.ts` (new)
- `frontend/src/components/testManager/drive/*` (new: 4 components)
- `frontend/src/components/testManager/ProjectSettingsModal.tsx`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/pages/DriveOAuthRedirect.tsx` (new)
- `frontend/src/App.tsx`
- `frontend/src/pages/testManager/components/TicketDetailView.tsx`
- `frontend/src/pages/testManager/components/ExecuteRunModal.tsx`

**Docs/Env**
- `.env.example`
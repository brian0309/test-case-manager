# Feature Plan: Google Drive Video Evidence for Tickets and Test Runs

We want to add an optional **video evidence upload feature** to the Test Case Management System.

The goal is to allow users to attach screen-recording/video evidence to:

1. **Tickets**
2. **Test Runs / Test Run evidence**

Videos should be uploaded directly to the user's **Google Drive** and then embedded/viewable inside the application.

Before implementing anything, analyze the existing application architecture and create an implementation plan that fits the current stack and conventions.

---

## 1. Project-Level Configuration

Add a project-level setting:

**Enable Video Evidence**

Example:

```text
Project Settings
Integrations
      └── Google Drive Video Evidence
            [ ] Enable video evidence
```

The feature should be **disabled by default** unless explicitly enabled for the project.

When disabled:

- Do not show video upload controls.
- Do not show Google Drive connection prompts.
- Existing ticket/test-run functionality should remain unchanged.
- Existing attachments should continue working normally.

When enabled:

- Tickets should have the ability to add video evidence.
- Test Runs should have the ability to add video evidence.
- The application should verify that the current user has connected Google Drive before allowing uploads.

---

# 2. Google Drive Integration

The video storage provider should be **Google Drive**.

Do NOT upload large videos through our backend if this can reasonably be avoided.

Prefer:

```text
Browser
   │
   │ Google OAuth
   ▼
Google Drive
   ▲
   │
Application stores metadata/reference
   │
   ▼
Our Backend / Database
```

The backend should manage authorization and security, while the actual large file upload should preferably go directly from the browser to Google Drive where technically possible.

Investigate the best Google Drive API upload mechanism for large video files, such as:

- Resumable uploads
- Browser/client-side upload
- Backend-generated upload authorization
- Google Drive API resumable upload sessions

Choose the approach that minimizes server bandwidth and storage usage while maintaining security.

---

# 3. First-Time Google Connection

When the feature is enabled for a project, a user who has not connected Google Drive should see something similar to:

```text
Google Drive Required

Video evidence for this project is stored in your Google Drive.

Connect your Google account to upload video evidence.

[ Connect Google Drive ]
```

This should happen when the user first attempts to use video evidence, rather than forcing every project user to connect Google immediately.

Example flow:

```text
User opens Ticket
        │
        ▼
Video Evidence enabled?
        │
       YES
        │
        ▼
Google Drive connected?
      /       \
    NO         YES
    │           │
    ▼           ▼
Connect      Upload Video
Google
```

The same behavior should apply to Test Runs.

---

# 4. OAuth Security

Use **Google OAuth 2.0**.

Do NOT store:

- Google password
- Google login credentials
- OAuth client secrets in the frontend
- Access tokens in localStorage if avoidable

Investigate whether the application can securely store the user's OAuth refresh token.

Recommended architecture:

```text
Google Account
      │
      │ OAuth 2.0
      ▼
Our Backend
      │
      ├── encrypted refresh token
      ├── Google account ID
      └── connection metadata
```

The refresh token should be:

- Encrypted at rest
- Never returned to the frontend
- Never exposed through API responses
- Never logged
- Never included in client-side application state
- Revocable by the user

Access tokens should preferably be short-lived and generated/refreshed server-side when needed.

Investigate the appropriate Google OAuth scopes.

Prefer the minimum required scope, ideally a Drive scope that allows the application to manage only files it creates rather than requesting unrestricted access to the user's entire Google Drive.

For example, investigate whether:

```text
https://www.googleapis.com/auth/drive.file
```

is sufficient.

Do not request broader Drive permissions unless technically necessary.

---

# 5. Google Drive Folder Organization

Do not simply dump videos into the user's Drive root.

Design a predictable folder structure.

For example:

```text
Test Case Manager/
    Project A/
        Tickets/
            TICKET-123/
                recording.mp4

        Test Runs/
            Run-456/
                recording.mp4
```

However, before implementing this structure, determine whether folder creation is actually necessary or whether Drive file metadata and application references would be sufficient.

Consider:

- Project ID
- Ticket ID
- Test Run ID
- User ID
- Video filename
- Upload timestamp

The application should store metadata such as:

```text
videoEvidence
├── provider: "google_drive"
├── driveFileId
├── fileName
├── mimeType
├── size
├── webViewLink / embed information
├── uploadedBy
├── uploadedAt
└── projectId
```

Do NOT treat the Google Drive URL as the primary identifier. Store the Google Drive `fileId`.

---

# 6. Video Upload UX

When video evidence is enabled, add an upload component.

Example:

```text
Video Evidence

[ + Upload Video ]

or drag and drop a video here

Supported formats:
MP4, WebM, MOV

Maximum size: TBD
```

Consider supporting:

- Drag and drop
- File picker
- Upload progress
- Upload cancellation
- Retry failed uploads
- Resumable uploads
- Upload status
- Error messages
- File size validation
- MIME type validation

Example states:

```text
Preparing upload...
Uploading... 42%
Processing...
Uploaded
```

The UI should not freeze during large uploads.

---

# 7. Embedded Video

Once uploaded successfully, the video should be displayed/embedded inside the Ticket or Test Run.

Example:

```text
Video Evidence

┌──────────────────────────────────────┐
│                                      │
│              VIDEO PLAYER             │
│                                      │
│                                      │
└──────────────────────────────────────┘

Recording.mp4
Uploaded by Brian
Aug 11, 2026

[Open in Google Drive]
[Delete]
```

Investigate the correct Google Drive embedding/player approach.

Important:

Do not assume that simply putting the Google Drive URL inside an iframe will always work.

Determine:

- How Drive permissions affect playback
- Whether the video can be embedded
- Whether the user must be authenticated
- Whether other project users can view the video
- Whether the Drive file permissions need to be modified
- Whether we should use Drive's preview/embed functionality
- Whether files should remain private to the connected Google account

The implementation must avoid accidentally making private evidence videos publicly accessible.

---

# 8. Permissions and Sharing

This is an important architectural consideration.

A user may upload a video using their Google account, but another user viewing the Ticket/Test Run may not have access to that Google Drive file.

Design a permission model.

Investigate possible approaches:

### Option A — Private Drive Files

The video remains private to the uploader.

Pros:
- Strong privacy
- No public links

Cons:
- Other team members may not be able to view it.

### Option B — Share With Project Members

When uploaded, the application shares the Drive file with authorized project members.

Investigate whether this is practical and what Google API permissions/scopes are required.

### Option C — Public/Anyone With Link (prefered)

Avoid this by default because test evidence may contain sensitive information.

If considered, it should require an explicit project-level setting and warning.

The preferred design should be **private by default**.

---

# 9. Ticket Integration

Add video evidence to tickets.

For example:

```text
Ticket
────────────────────────────

Title
Description
Steps to Reproduce
Expected Result
Actual Result
Environment

Attachments

Video Evidence
[ Upload Video ]

Existing videos:
[Video Player]
```

A ticket can potentially have multiple videos.

Consider whether we need:

- Multiple videos
- Delete video
- Rename video
- Download/open in Drive
- Upload timestamp
- Uploaded by
- Video description

Avoid unnecessarily expanding the initial scope.

---

# 10. Test Run Integration

Add video evidence to Test Runs.

The evidence should be associated with the specific Test Run rather than only the underlying Test Case.

This is important because the same test case may pass in one run and fail in another.

Example:

```text
Test Run #1024

Test Case:
Login with invalid password

Status:
FAILED

Evidence:

[ Upload Video ]

┌──────────────────────────┐
│       VIDEO PLAYER       │
└──────────────────────────┘

recording.mp4
```

The video must remain associated with that specific run/snapshot.

Do not accidentally attach evidence to the generic Test Case when the intent is to document a specific execution.

---

# 11. Data Model

Before implementation, inspect the existing database schema.

Design the smallest schema change possible.

Potential approach:

```text
VideoEvidence
{
    _id,
    projectId,
    ticketId?,
    testRunId?,
    uploadedBy,
    provider: "google_drive",
    driveFileId,
    fileName,
    mimeType,
    fileSize,
    createdAt,
    updatedAt
}
```

Alternatively, embed evidence references into existing Ticket/TestRun documents if that better matches the application's architecture.

Do not duplicate Google Drive files unnecessarily.

Consider database indexes for:

```text
projectId
ticketId
testRunId
uploadedBy
```

---

# 12. Google Connection Model

Determine whether the Google connection should belong to:

### User

```text
User
 └── Google Drive connection
```

This is likely preferable because users own their Google accounts.

The project merely determines whether Google Drive video evidence is enabled.

Example:

```text
Project
 └── videoEvidenceEnabled = true

User
 └── googleDriveConnected = true
```

Do not store a Google connection directly on every project unless there is a strong architectural reason.

---

# 13. Security Requirements

Pay particular attention to:

### OAuth

- Use Authorization Code flow / appropriate OAuth flow for the application architecture.
- Validate OAuth state to prevent CSRF.
- Validate redirect URI.
- Never expose client secrets.
- Store refresh tokens encrypted.

### API

Backend endpoints must verify:

```text
Authenticated user
        +
Project membership
        +
Ticket/Test Run access
        +
Video evidence enabled
```

before allowing operations.

Users must not be able to manipulate another user's Google Drive files by simply changing:

```text
driveFileId
```

in an API request.

Always verify ownership/association using our database.

---

# 14. Upload Security

Do not trust the client-provided:

- MIME type
- File extension
- File size
- Filename

Validate these server-side where applicable.

Consider:

- Maximum video size
- Allowed MIME types
- Filename sanitization
- Malicious file handling
- Upload timeout
- Resumable upload
- Rate limiting
- Quotas

Do not execute or process uploaded video files on our server unless necessary.

---

# 15. Disconnect Google Drive

Add a user-level setting:

```text
Settings
  → Integrations
      → Google Drive

Connected as:
user@gmail.com

[ Disconnect Google Drive ]
```

When disconnecting:

- Revoke authorization if appropriate.
- Remove encrypted refresh token.
- Remove connection metadata.
- Do NOT automatically delete existing Drive videos unless explicitly requested.
- Existing evidence should fail gracefully if the Google file is no longer accessible.

---

# 16. Handling Deleted/Missing Drive Files

Consider this scenario:

```text
Application DB
    ↓
driveFileId = ABC123

Google Drive
    ↓
File deleted
```

The application should detect this and show:

```text
Video unavailable

This video was deleted or is no longer accessible
from the connected Google Drive account.
```

Do not crash the Ticket/Test Run page.

---

# 17. Upload Architecture

Before coding, compare these approaches:

### Approach 1

```text
Browser
   ↓
Our Backend
   ↓
Google Drive
```

### Approach 2

```text
Browser
   ↓
Google Drive
```

with the backend handling authorization and metadata.

### Approach 3

```text
Browser
   ↓
Backend creates authorized resumable upload session
   ↓
Browser uploads directly to Google Drive
```

Prefer the architecture that:

- Minimizes our server bandwidth
- Handles large files
- Is secure
- Supports resumable uploads
- Does not expose Google credentials
- Works reliably in browsers

Explain the chosen architecture before implementation.

---

# 18. Configuration / Environment Variables

Identify required environment variables.

Potential examples:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_TOKEN_ENCRYPTION_KEY=
```

Do not hardcode credentials.

Document how to configure the Google Cloud project:

1. Create Google Cloud project
2. Enable Google Drive API
3. Configure OAuth consent screen
4. Configure OAuth credentials
5. Configure authorized redirect URI
6. Configure required scopes
7. Add production domain
8. Configure test users if applicable

---

# 19. Feature Flag / Project Setting

The feature must be project-specific.

Example:

```javascript
project.settings.videoEvidence.enabled
```

or whatever structure best fits the existing project settings architecture.

Do not introduce a global feature flag unless necessary.

The UI should dynamically respond to the project setting.

---

# 20. Backward Compatibility

Existing projects must continue working without changes.

Existing:

- Tickets
- Test Cases
- Test Runs
- Attachments
- Users

must continue working when video evidence is disabled.

Database migrations should provide safe defaults.

---

# 21. Testing Requirements

Add tests for at least:

### Project settings

- Video evidence disabled by default
- Enable video evidence
- Disable video evidence
- Unauthorized user cannot modify setting

### Google OAuth

- Connect Google
- OAuth callback
- Invalid OAuth state
- Expired access token
- Refresh token flow
- Disconnect Google
- Missing Google connection

### Ticket videos

- Upload video
- Upload multiple videos
- View video
- Delete video
- Unauthorized access
- Video evidence disabled

### Test Run videos

- Upload evidence
- View evidence
- Delete evidence
- Ensure evidence belongs to the correct Test Run
- Ensure evidence isn't accidentally attached to the Test Case

### Security

- User cannot access another project's evidence
- User cannot access another user's Drive file through manipulated IDs
- User cannot bypass project membership checks
- OAuth credentials are never returned in API responses

### Upload failures

Test:

- Large file
- Unsupported format
- Network interruption
- Google API failure
- Expired authorization
- Deleted Drive file

---

# 22. UX Considerations

Avoid repeatedly showing:

> Connect Google Drive

after the user has already connected.

Once connected, the UI should simply show:

```text
[ Upload Video ]
```

If Google authentication expires:

```text
Google Drive authorization needs attention.

[Reconnect Google Drive]
```

Do not force the user through OAuth on every upload.

---

# 23. Important Product Decision

Before implementation, answer this question:

**Who should own the Google Drive file?**

The likely design is:

```text
Each user connects their own Google Drive.

User uploads evidence.

Google Drive owns the actual file.

Our application stores only metadata + Drive file ID.
```

However, evaluate whether a **shared service Google Drive account** would be more appropriate for a team/SaaS environment.

Compare:

### User-owned Drive

Pros:
- No application-wide storage responsibility
- User controls files
- Better privacy ownership

Cons:
- Files may disappear when users leave
- Other team members may not have access
- More complicated sharing

### Application-owned Drive

Pros:
- Centralized evidence
- Easier team access
- Consistent lifecycle

Cons:
- Application must manage storage
- More OAuth complexity
- Potential Google Workspace/storage costs
- More responsibility for data retention

Recommend the better architecture based on the current application model.

---

# 24. Implementation Process

Do NOT immediately start coding.

First:

1. Inspect the existing repository.
2. Identify frontend architecture.
3. Identify backend architecture.
4. Identify authentication system.
5. Identify Project model.
6. Identify Ticket model.
7. Identify Test Run model.
8. Identify current attachment/file-upload implementation.
9. Identify existing project settings architecture.
10. Identify current authorization/permissions.
11. Determine where OAuth integrations should live.
12. Determine whether the backend already has encryption/secrets infrastructure.

Then produce:

### Phase 1 — Architecture

Explain the proposed architecture.

### Phase 2 — Database

List schema/model changes.

### Phase 3 — Backend

List API endpoints and OAuth flow.

### Phase 4 — Frontend

List UI changes and components.

### Phase 5 — Google Cloud

List required Google Cloud configuration.

### Phase 6 — Security

Explain credential/token storage and authorization.

### Phase 7 — Testing

List automated and manual test cases.

### Phase 8 — Implementation

Only after the plan is reviewed, implement the feature.

---

# Success Criteria

The feature is complete when:

1. A project administrator can enable/disable video evidence.
2. Video evidence is completely hidden when disabled.
3. A user can connect Google Drive through OAuth.
4. Google credentials/tokens are securely handled.
5. Videos can be uploaded without unnecessarily passing large files through our server.
6. Videos are stored in Google Drive.
7. The application stores the Drive file ID and metadata.
8. Videos can be viewed/embedded from Tickets.
9. Videos can be viewed/embedded from specific Test Runs.
10. Multiple videos can be attached where appropriate.
11. Project/user permissions are enforced.
12. Private Drive files are not accidentally exposed publicly.
13. Failed/missing Drive files are handled gracefully.
14. Users can disconnect Google Drive.
15. Existing functionality continues working when the feature is disabled.
16. Automated tests cover the critical paths and security boundaries.

## Final instruction

Before writing code, inspect the existing codebase and propose the architecture.

Do not make assumptions about the current models, authentication, attachment system, or project settings.

If an existing implementation pattern can be reused, prefer extending it rather than introducing a parallel architecture.

Prioritize:

**Security → reliability → minimal server bandwidth/storage → maintainability → UX.**
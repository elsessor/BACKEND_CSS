# Course Shifting Subsystem Backend

Backend scaffold for the Course Shifting Subsystem (CSS) based on the attached design documents. It exposes REST endpoints for shifting applications, eligibility checks, subject equivalency generation, review workflows, audit logging, and subsystem integration hooks.

## Stack

- Node.js
- TypeScript
- Express
- Firebase Auth / Firestore ready
- In-memory repository fallback for local development

## Run

```bash
npm install
npm run dev
```

The API starts on `http://localhost:4000` by default.

## Auth Modes

- `AUTH_MODE=dev`: accepts `Authorization: Bearer dev:<role>:<userId>`
- `AUTH_MODE=firebase`: verifies Firebase bearer tokens with `firebase-admin`
- `ALLOW_DEV_TOKEN_FALLBACK=true`: when `AUTH_MODE=firebase`, still accepts `dev:<role>:<userId>` tokens for local development

Example dev tokens:

- Student: `Bearer dev:student:STU-2021-08831`
- Department head: `Bearer dev:department_head:dept_head_01`
- Registrar: `Bearer dev:registrar:registrar_admin`

## Storage Providers

- `STORAGE_PROVIDER=memory`: stores data in process memory
- `STORAGE_PROVIDER=firestore`: uses Firestore collections

## Main Endpoints

- `POST /api/css/apply`
- `POST /api/css/eligibility-check`
- `GET /api/css/applications/:applicationId`
- `GET /api/css/applications/:applicationId/equivalency`
- `GET /api/css/applications/:applicationId/audits`
- `GET /api/css/audit-logs`
- `GET /api/css/applications`
- `POST /api/css/applications/:applicationId/review`
- `POST /api/css/webhooks/srm/slot-opened`
- `POST /api/css/jobs/check-sla`

## Request Example

```json
{
  "student_id": "STU-2021-08831",
  "student_name": "Juan Dela Cruz",
  "current_program": "BSIT",
  "target_program": "BSCS",
  "reason_for_shifting": "I want to align my studies with my long-term interests in computer science."
}
```

## Notes

- The business rules follow the PDF design: duplicate application blocking, minimum GWA check, failing major rejection, financial hold blocking, waitlisting, dependency retry state, CMS missing-map pause, approval audit trail, and subsystem notifications.
- External subsystem clients are stubbed in `src/integrations` and can be replaced with real HTTP calls once the other groups publish their endpoints.

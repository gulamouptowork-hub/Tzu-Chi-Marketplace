# Campus Marketplace implementation

Approved stack: Next.js App Router, strict TypeScript, Google Workspace SSO,
PostgreSQL/Prisma, Cloudflare R2, next-intl, Tailwind and shadcn/ui.
Allowed school domain: gms.tcu.edu.tw. No payments are processed.

Safe Exchange extends the original contact flow. Sellers select supported campuses.
Buyers propose a predefined public point and time. Sellers accept the proposal.
Each participant can record arrival and completion; completion requires both users.
Personal emails are exposed only by an authorized, rate-limited contact action.
Initial points are provisional landmarks, not verified campus coordinates.
Department options use the verified official university teaching-unit directory, checked on 2026-10-02.

## Phases

1. Setup, auth, onboarding and responsive layout.
2. Listing CRUD and validated direct uploads with thumbnails.
3. Browse, full-text search, filters and pagination.
4. Contact and Safe Exchange proposals, acceptance and mutual completion.
5. Saved items, profiles, dashboards and settings.
6. Reports and admin moderation.
7. Accessibility, translations, integration tests and deployment documentation.

At each phase run app, lint, type-check and relevant tests. Record actual results,
including checks blocked by missing external credentials. Never treat mocks as
verification of live SSO, storage, email or database behavior.


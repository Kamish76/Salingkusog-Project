# Salingkusog

> A real-time campus memory board and gamified 3×3 intramurals bingo platform.

[![CI](https://github.com/Kamish76/Salingkusog-Project/actions/workflows/ci.yml/badge.svg)](https://github.com/Kamish76/Salingkusog-Project/actions/workflows/ci.yml)
[![CodeQL](https://github.com/Kamish76/Salingkusog-Project/actions/workflows/codeql.yml/badge.svg)](https://github.com/Kamish76/Salingkusog-Project/actions/workflows/codeql.yml)

Salingkusog gives students and campus visitors a shared place to post event memories, complete photo-based challenges, and participate in verifiable raffle draws. The application combines a public live feed with authenticated student features, day-based bingo constraints, image moderation, administrative tooling, and audit-friendly raffle workflows.

## What the project does

- **Public memory board** — displays approved campus photos and event activity.
- **Authenticated student experience** — supports Google OAuth through Neon Managed Better Auth, personal galleries, consent handling, and user-owned bingo progress.
- **3×3 bingo challenge** — provides nine configurable tasks with event-day unlock rules and optional selfie requirements.
- **Raffle engine** — detects completed rows, columns, and diagonals, then issues unique raffle codes with idempotent claim protection.
- **Realtime updates** — streams published posts through Neon Realtime.
- **Media pipeline** — validates image magic bytes, supports common image formats including HEIC, and stores media in Neon Object Storage through its S3-compatible API.
- **Moderation and administration** — provides role-aware `/dev` tools for users, moderation, activity logs, health checks, storage, bingo, and raffle operations.
- **Legal and safety controls** — includes privacy and terms pages, consent records, reporting, moderation states, and server-side authorization checks.

## Technology stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4 |
| Runtime | Node.js 22 (CI baseline) |
| Database | Neon Serverless PostgreSQL |
| Authentication | Neon Managed Better Auth with Google OAuth |
| Realtime | Neon Realtime |
| Object storage | Neon Object Storage, S3-compatible |
| Testing | TypeScript verification suites run directly with Node |
| Quality | ESLint, TypeScript, GitHub Actions, CodeQL |

## Repository layout

```text
src/
  app/                 Pages, server actions, and API route handlers
  components/          Reusable UI and feature components
  lib/                 Authentication, database, storage, moderation, and domain logic
  proxy.ts             Authentication/session request handling
migrations/            Ordered, idempotent PostgreSQL migrations
scripts/               Integration, security, and domain verification suites
docs/                  Product scope, roadmap, brainstorming, and project summary
public/                Static assets and export templates
.github/workflows/     CI and CodeQL automation
```

Important application surfaces include:

- `/` — public memory board and authenticated bingo experience
- `/gallery` — authenticated user's personal gallery
- `/privacy`, `/terms`, `/rally-rules` — legal and event policy pages
- `/dev` — protected operations dashboard
- `/dev/users`, `/dev/moderation`, `/dev/logs` — administrative operations
- `/dev/tools/bingo`, `/dev/tools/raffle`, `/dev/tools/storage` — feature and infrastructure tools
- `/api/health` — health probe endpoint
- `/api/realtime/posts` — realtime posts endpoint

## Prerequisites

- Node.js 22 or a compatible current Node.js release
- npm
- A Neon PostgreSQL database
- Neon Managed Better Auth configuration
- Neon Object Storage credentials for media uploads
- Neon Realtime credentials for live post updates

## Getting started

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Replace the example values in `.env.local` with real development credentials. Do not commit `.env.local` or any credential-bearing file.

4. Apply the migrations in numeric order using the Neon SQL editor or `psql`:

   ```bash
   for migration in migrations/*.sql; do
     psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
   done
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000).

The application can render its public shell without an authenticated session, but database-backed features require the corresponding environment variables and schema.

## Environment variables

Copy `.env.example` as the source of truth for local configuration. The main variables are:

| Variable group | Variables | Purpose |
| --- | --- | --- |
| Database | `DATABASE_URL` | Neon PostgreSQL connection |
| Authentication | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | Managed Better Auth sessions |
| Storage | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `NEON_STORAGE_BUCKET` | Neon Object Storage access |
| Realtime | `NEON_REALTIME_URL`, `NEON_REALTIME_SECRET`, `NEXT_PUBLIC_NEON_REALTIME_URL` | Live posts |
| Moderation | `OPENAI_API_KEY` | Content moderation integration |
| Admin fallback | `ADMIN_EMAILS` | Optional comma-separated emergency admin allowlist |

Use a randomly generated cookie secret of at least 32 characters. Keep all secrets server-side and configure production values through the hosting provider's secret manager.

## Database migrations

Migrations are ordered and intended to be idempotent. Apply every file in `migrations/` in filename order. The schema covers:

- bingo task definitions and user progress
- photo posts and moderation status
- raffle entries and reactions
- event configuration
- activity logs
- consent and report records
- indexes and supporting constraints

See [`migrations/README.md`](migrations/README.md) for the migration ledger and conventions. Review migrations in a disposable Neon branch before applying them to a shared or production database.

## Development commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server after building |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run the complete integration and verification suite |
| `npm run test:integration` | Alias for the complete integration suite |
| `npm run test:bingo` | Verify bingo matrix and raffle-code behavior |
| `npm run test:schema` | Verify migrations and database schema expectations |
| `npm run test:storage` | Verify media validation and storage helpers |
| `npm run test:auth` | Verify authentication, roles, and moderation boundaries |
| `npm run test:raffle` | Verify raffle concurrency and idempotent re-claims |
| `npm run setup:cors` | Configure the object-storage bucket CORS policy |

The integration runner also covers image-proxy SSRF guards, export generation, moderation, health probes, consent/DPA behavior, upload-day constraints, pagination, and legal UI behavior.

## Testing and CI

GitHub Actions runs on pushes and pull requests:

1. installs dependencies with `npm ci` (falling back to `npm install` if necessary)
2. runs `npm test`
3. runs `npm run lint`
4. runs `npm run typecheck`
5. runs `npm run build`

CodeQL analyzes the repository's JavaScript/TypeScript and GitHub Actions code. Run the same checks locally before opening a pull request.

## Deployment

The application is a standard Next.js production deployment:

```bash
npm ci
npm run build
npm run start
```

For Vercel or another Node-compatible host:

1. provision the Neon database, Managed Better Auth, Object Storage, and Realtime resources;
2. configure all required environment variables for the target environment;
3. apply migrations before exposing the application;
4. configure the authentication provider's callback and trusted domains;
5. configure Object Storage CORS with `npm run setup:cors` or the provider's equivalent;
6. verify `/api/health`, authentication, uploads, realtime updates, moderation, and protected `/dev` routes.

## Security and privacy

The application is designed around authenticated ownership and operational accountability:

- server actions enforce authentication and role checks;
- uploads are validated by file signature rather than filename alone;
- image proxy requests include SSRF protections;
- posts have moderation states and can be reported;
- raffle claims are protected against duplicate submissions;
- consent and activity records are persisted for auditability;
- public display names can be separated from backend user identity.

Never place API keys, storage credentials, cookie secrets, or database URLs in source control, client-side code, screenshots, or issue reports. Report security issues privately to the repository maintainers rather than opening a public issue with exploit details.

## Documentation

- [`docs/PROJECT_SCOPE.md`](docs/PROJECT_SCOPE.md) — detailed product scope and data model
- [`docs/SUMMARY.md`](docs/SUMMARY.md) — executive overview and user journey
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — implementation roadmap
- [`docs/BRAINSTORMING.md`](docs/BRAINSTORMING.md) — feature and event ideas
- [`migrations/README.md`](migrations/README.md) — migration conventions and ledger

## Contributing

1. Create a focused branch from the default branch.
2. Make the smallest complete change that addresses the issue.
3. Update directly related documentation and migrations when behavior or schema changes.
4. Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.
5. Open a pull request describing the behavior change, configuration impact, and validation performed.

## License

No license file is currently included in this repository. Treat the code as all rights reserved unless the project maintainers provide separate written terms.

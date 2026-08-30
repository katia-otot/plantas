<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

Anthos is a Next.js 16 app with Prisma + SQLite, Firebase Auth (optional), and Spanish UI copy.

### Environment bootstrap

Cloud agents use `.cursor/environment.json`. The `install` script:

1. Copies `.env.example` to `.env` when missing
2. Creates `data/` and `data/uploads/`
3. Runs `npm ci` and `npx prisma db push`

No Firebase credentials are required for most agent work. With the default `.env`, auth stays open (`FIREBASE_AUTH_REQUIRED` unset and no service account).

### Dev server

- `npm run dev` → http://localhost:3000
- Production VPS uses `NEXT_PUBLIC_BASE_PATH=/plantas`; leave it unset locally unless testing basePath behavior.

### Verify changes

Run these before opening a PR:

```bash
npm run lint
npm run build
```

Optional data seed for patio owners (does not delete plants):

```bash
npx tsx scripts/bootstrap-patio-owners.ts
```

### Secrets (Cursor dashboard → Cloud Agents → Secrets)

Add only when the task needs them:

| Secret | When needed |
| --- | --- |
| `DATABASE_URL` | Override SQLite path (default: `file:./data/app.db`) |
| `AUTH_SECRET` | Session/crypto tests |
| `FIREBASE_AUTH_REQUIRED=0` | Force open routes even if a service account secret exists |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Login flow, Firebase Admin, FCM push |
| `NEXT_PUBLIC_BASE_PATH=/plantas` | Match VPS URL layout |

Never commit `.env`, Firebase JSON keys, or `data/app.db`.

### Repo and deploy context

- GitHub: `katia-otot/plantas`
- README documents VPS deploy, Firebase bridge login, and FCM notifications under `notify-web/`
- Next.js agent rules: read `node_modules/next/dist/docs/` before changing framework APIs

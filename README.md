This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Questions CRUD

- `/questions`: title search, category/difficulty filters, summary counts, and public/hidden test counts.
- `/questions/[id]`: Markdown, complexity, starter code, hints, and public cases. Only admins receive hidden test-case data in page props.
- `/questions/create` and `/questions/edit/[id]`: server-guarded admin editor with Markdown preview, reorderable test cases, JSONB preview, starter code, and hints.
- `/login`: recruiter demo sign-in. Configure `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, `DEMO_INTERVIEWEE_EMAIL`, and `DEMO_INTERVIEWEE_PASSWORD` from `.env.example` in `.env.local`. Use the actual Supabase Auth email for the admin account. Credentials stay on the server; this application does not create demo accounts or change their roles.
- `/profile`: edit the current user's display name and target level; the access role is read-only.

The editor's AI helper is admin-only. `OPENAI_API_KEY` and optionally `OPENAI_MODEL` enable generation. Without a key, it supplies five labeled draft cases (two public, three hidden). Unknown problems require manual completion of TODO outputs before saving. All generated cases need review against the problem's constraints.

All database access uses the cookie-aware Supabase clients and the existing user's session, subject to the configured cloud RLS policies. The navbar's RLS badge describes this architecture; it is not a live policy audit. Filtering hidden cases in server-rendered page props does not restrict direct Supabase REST access to the JSONB column: that boundary depends on the existing cloud permissions. No migrations or dashboard changes are included.

Validation commands:

```sh
npx tsc --noEmit
npm run lint
node --test tests/questions.test.mjs
npm run build
```

The server-boundary tests mock Supabase and the LLM transport and never write cloud data. For browser acceptance, check guest/candidate/admin navigation, filters, create/edit/delete confirmation, Markdown preview, JSONB ordering, generated drafts, and role guards. Live admin/candidate checks require the configured demo credentials. Tailwind uses `@tailwindcss/postcss` with Turbopack; the previous custom CSS loader caused a production worker panic on Windows.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

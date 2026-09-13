# FrameProof

Good work. Clear feedback. One final version.

Visual image review for designers and small creative teams. React, TypeScript, Vite and Supabase, with an independently stored fictional demo.

## Included

Private projects and roles; PNG/JPEG/WebP uploads up to 10 MB; immutable revisions; pinned comments and replies; thread resolution; before/after and side-by-side comparison; exact-version decisions; expiring and revocable asset links; JSON review record export; responsive layouts and keyboard controls.

## Run and verify

Use Node.js 24 LTS or a version compatible with the locked Vite release. Run `npm ci`, copy `.env.example` to `.env.local`, then `npm run dev`.

For a buyer installation, replace both public client values with a NEW Supabase project URL and anon/publishable key. Do not reuse the studio preview database. Never put a service-role key in a Vite variable.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` and `npm audit`.

## Deploy

1. Create a Supabase or compatible Bolt Database project and apply `supabase/migrations` in filename order.
2. Configure email/password auth, email verification, reliable SMTP, the site URL and `/workspace` and `/reset` redirect URLs.
3. Deploy `supabase/functions/public-review` with the per-function settings in `supabase/config.toml`. Standard server credentials stay only in the edge environment.
4. Set `ALLOWED_ORIGINS` to your exact frontend origin or intentional comma-separated list. CORS is not authorization. Every guest request validates the review token.
5. Set the two public Vite variables, build and deploy `dist` with an SPA fallback to `index.html`.

Guest links use `/review#<token>`. The fragment avoids including the token in the initial page request. Treat the full link as a credential.

## Verification and limits

`scripts/verify-backend.mjs` creates synthetic accounts and QA-only projects against the configured backend. Run it only against a named test installation. It expects confirmation-disabled test authentication; do not disable production verification just to run it. See `docs/QA.md`.

Guest names are self-reported. Links include all revisions of one asset, including new revisions while active. Signed guest image URLs remain valid for up to two minutes after issue. Downloaded files cannot be recalled.

Approval means the latest recorded decision for one revision, not unanimous sign-off or a legal signature. Video review, Figma sync, live-site annotation, AI critique and billing are excluded.

Enterprise retention, malware scanning, backup automation, abuse CAPTCHA, storage billing and automated account erasure are not included. Configure operational controls before a broader commercial SaaS launch. Browser file decoding is a usability check, not a server security boundary.

## Provenance

Original Noerong product. Bolt created the initial canvas and database foundation. Local engineering added the product interface, connected workflows, tests, accessibility refinements and security corrections. Bolt handles focused backend deployment and hosting. Do not claim that every line was generated solely in Bolt or that badge approval is guaranteed.

Aster Studio artwork and demo people are fictional. No invented customer testimonials or metrics. Dependencies retain their licenses; commercial source rights are supplied separately by Noerong.

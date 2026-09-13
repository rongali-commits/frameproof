# Studio deployment

Public frontend: https://frameproof-visual-re-o866.bolt.host/

The fictional demo is at `/demo`. Private projects require sign-in. Review links are opt-in, asset-scoped bearer credentials, not public portfolio URLs.

The production edge allowlist is `https://frameproof-visual-re-o866.bolt.host`. For a different deployment, change that setting, the auth site/redirect URLs and the social metadata in `index.html`. Never expose the server service-role key to the browser.

Email confirmation and secure password changes were enabled before final verification. The owner confirmed receipt of the signup email and successful entry into the signed-in production workspace on 13 September 2026. Password-reset delivery remains a separate, untested recovery check. No private client data was used during verification.

## Recovery

Keep the GitHub repository and a database backup. Rebuild the frontend with `npm ci && npm run build`; configure SPA route fallback. Apply the numbered SQL migrations in order to a new backend, then deploy the guest edge function. Redeploying only the frontend does not recreate the database or private files.

For a commercial hosted service, add operational ownership: tested mail delivery, backup/restore, retention and account-erasure procedures, upload abuse controls, service limits, monitoring and the relevant legal documents. The source template does not claim to include these enterprise operations.

## Budget and provenance

Started with 10M visible Bolt tokens. After the initial canvas, backend, guest endpoint and focused fixes, the interface showed 7.5M remaining. This display is rounded, not an exact usage meter. Most integration, visual refinement and test work was performed locally, then synced through GitHub. Describe this as a hybrid Bolt build, not exclusively Bolt-generated work.

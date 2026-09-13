# Verification log

13 September 2026. Browser verification uses the inbuilt browser, not Chrome.

## Automated observations

- TypeScript compilation and production build passed.
- 33 unit tests passed for pin geometry, decision history, version selection and immutable revision append behavior.
- Dependency audit reported zero known vulnerabilities, including development packages.
- 25 backend assertions passed with synthetic accounts and QA-only projects.

Backend checks cover server-stamped ownership and identity, cross-account isolation, anonymous denial, immutable ownership, private upload/download, replies and resolution, concurrent sequential revisions, no inherited approval, immutable revisions, reviewer permissions, expiry bounds, signed image loading, guest asset scope, privileged RPC denial, revocation, invalid tokens and membership removal.

Expiry bounds and the server expiry predicate were checked. Waiting for a real one-day link to expire is not included.

## Browser observations

Landing/demo navigation, keyboard-created persistent demo comments, keyboard comparison, synthetic-account sign-in, project creation, 1200×1600 PNG upload and persisted first-version approval all worked through the UI. Mobile comments are accessible; layout geometry is checked independently of screenshot scaling.

Final production and responsive observations are added after deployment. This is evidence, not a guarantee that every device or attack scenario has been tested.

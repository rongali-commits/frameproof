# Verification log

13 September 2026. Browser verification uses the inbuilt browser, not Chrome.

## Automated observations

- TypeScript compilation and production build passed.
- 36 unit tests passed for pin geometry, decision history, version selection, immutable revision append behavior and safe review-record export.
- Dependency audit reported zero known vulnerabilities, including development packages.
- 25 backend assertions passed with synthetic accounts and QA-only projects.

Backend checks cover server-stamped ownership and identity, cross-account isolation, anonymous denial, immutable ownership, private upload/download, replies and resolution, concurrent sequential revisions, no inherited approval, immutable revisions, reviewer permissions, expiry bounds, signed image loading, guest asset scope, privileged RPC denial, revocation, invalid tokens and membership removal.

Expiry bounds and the server expiry predicate were checked. Waiting for a real one-day link to expire is not included.

## Browser observations

Landing/demo navigation, keyboard-created persistent demo comments, keyboard comparison, synthetic-account sign-in, project creation, 1200×1600 PNG upload and persisted first-version approval all worked through the UI. Mobile comments are accessible; layout geometry is checked independently of screenshot scaling.

The second uploaded revision remained pending while v1 retained approval. A one-day guest link opened only its asset, saved a pinned comment and a changes-requested decision on v2, and showed an unavailable screen after owner revocation. The link was revoked at the end of this test.

Responsive layout measurements passed at 320, 390, 768, 1366 and 1440 CSS-pixel widths across the landing page, authentication and review workspace. A narrow-header overflow was found and corrected. On phone, selecting an existing pin opens the comment drawer; Escape closes it and restores focus. Screenshots in the inbuilt browser sometimes scaled incorrectly under emulation, so DOM geometry was checked separately rather than treating scaled captures as proof of a layout defect.

The clean demo was restored after testing. Production email confirmation and secure password changes were enabled in Bolt settings. The owner received the confirmation email, followed its link and reached the signed-in production workspace, confirmed with screenshots on 13 September. Password-reset email delivery remains untested.

The deployed guest view loaded the full 1200×1600 private artwork and saved a reply. Revoking the final temporary QA link produced the unavailable screen on reload. Production CORS accepted the configured site origin and rejected an unrelated origin.

The export dialog exposes a readable JSON record with exact revision IDs, comments and decisions, excluding temporary image-access URLs. The copy action displayed its success state. The inbuilt browser automation did not deliver a download event, so saving the downloaded file was not independently confirmed. The preview supports manual copy if clipboard or downloads are blocked.

Bolt's optional built-in security audit stalled and was cancelled without a result. It is not counted as a passed audit. The backend assertions above are the independently executed checks.

This is evidence, not a guarantee that every device or attack scenario has been tested.

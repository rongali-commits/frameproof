# FrameProof: feedback that stays with the work

## Context and problem

An independent Noerong studio product, not a commissioned engagement. The fictional Aster Studio demonstration explores a common problem: feedback scattered through messages can point to the wrong revision and obscure what was actually approved.

## Design

Artwork takes center stage, with a quiet asset rail, adjacent comments and persistent revision strip. On smaller screens, side panels become focused drawers. Normalized pins retain their position as the artwork resizes. Actual image revisions can be compared with a keyboard-accessible slider or side by side, without cropping.

## Workflow

Create a project, upload an image, share an expiring asset link, collect pinned feedback, upload a revision, compare changes and record a decision. Earlier files remain intact. A new revision never inherits approval. Export the activity record without temporary file-access URLs.

## Engineering and access

React and TypeScript power the interface. Supabase provides authentication, PostgreSQL row-level security, private storage and a scoped guest endpoint. Random review tokens are stored as hashes and checked for scope, expiry and revocation on every request. Guest names are self-reported, not verified identities. The public demo remains independent of private data.

## Verification and outcome

Executable tests uncovered and corrected nullable authorization, version-allocation locking, INSERT/RETURNING policy behavior and a shadowed storage path. The result is a functioning visual review loop, supported by recorded tests rather than unmeasured revenue or satisfaction claims. See QA.md.

Video annotation, AI critique, billing, Figma sync and legal signatures are deliberately outside scope.

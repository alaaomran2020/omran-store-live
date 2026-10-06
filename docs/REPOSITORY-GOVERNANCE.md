# Repository Governance — Omran Store

**Mode:** Controlled / read-first / no production deploy
**Effective evidence snapshot:** 2026-10-06 UTC

This document establishes repository and production authority for the Omran Store. It records governance boundaries; it does not authorize a production deployment, merge, DNS/Cloudflare change, GitLab mutation, or destructive action.

## Authority register

| Class | Canonical value | Governance status |
|---|---|---|
| **CANONICAL** | GitHub [`alaaomran2020/omran-store-live`](https://github.com/alaaomran2020/omran-store-live), branch `main` | Sole canonical production source. GitHub reported protected `main` at `da9e6d08e02b98da674d2cd13b2609aaa32043c0` at the evidence snapshot. |
| **PRODUCTION** | Cloudflare Pages project `omrantoys-live-app`; production domain `omrantoys.store` | Serving/deployment target, not a source repository. See [`REPOSITORY-MAP.md`](./REPOSITORY-MAP.md) for evidence and its verification limits. |
| **MIRROR** | GitLab `omran-toys-company-group/omran-store-live`, project ID `87219545` | Declared mirror. Public identity/revision could not be independently verified; it is not canonical. Do not modify it in this phase. |
| **DUPLICATE / REMOVAL CANDIDATE** | GitLab `adreanolomran/omran-store-live`, project ID `87219408` | Public duplicate, with a `main` revision behind current GitHub `main`. Candidate status is not deletion authorization. Do not modify or delete it in this phase. |

## Binding rules

1. **GitHub `main` is canonical.** All production code and catalog authority descend from `alaaomran2020/omran-store-live` and its protected `main` branch. A GitLab branch, local checkout, AI output, generated artifact, or production deployment is not an alternate source of truth.
2. **GitLab must never silently become canonical.** Mirroring, import, branch recency, commit authorship, availability, or a GitLab pipeline cannot transfer authority. Any proposed change to canonical ownership requires a separately documented decision and explicit human approval.
3. **GitLab projects are not Production Source of Truth.** The declared mirror and the duplicate/removal candidate are informational copies only. Do not modify the group mirror, and do not delete or modify the duplicate, under this governance task.
4. **AI agents are executors, not source of truth.** AI-generated code, plans, product descriptions, and decisions are proposals until reviewed and accepted through the human-controlled repository process. AI systems do not approve production changes.
5. **Product data is protected.** The repository-controlled catalog source is `public/catalog/products.csv`. Product IDs, names, slugs, URLs, catalog records, media references, media resolver behavior, and catalog-source selection are protected boundaries. This governance change does not alter them.
6. **Production deployment uses the controlled workflow.** The approved repository deployment path is `.github/workflows/deploy-storefront.yml`, which validates before deploying to Pages project `omrantoys-live-app`. Pull requests validate only. The existing workflow also has scheduled, manual, and qualifying `main` push triggers; this document does not change those triggers. `package.json` contains a local `pnpm deploy` command that invokes Wrangler directly, but this governance does not authorize using it for production. No local, GitLab, AI, or governance-branch deployment is authorized here. Production changes still require explicit human approval under the applicable release process.
7. **Destructive repository actions require explicit human approval.** This includes repository deletion, removal of the duplicate, history rewriting, force pushes, project transfers, and disabling or replacing repository/mirror integrations. No candidate label is permission to act.
8. **Infrastructure is protected.** Cloudflare configuration, DNS, Pages domains, credentials, and deployment settings are outside routine repository edits and require separate explicit approval. No such change is part of this task.
9. **Canonical ambiguity means STOP.** Do not guess, reconcile, or promote a copy. Preserve the current state and request human verification.
10. **Secrets are never documentation content.** Do not expose, copy, test-print, commit, or request tokens, passwords, `.env.production` values, or other credentials.

## Change-control sequence

All controlled implementation work follows:

> **Branch → Implement → Test → Integrity Gate → Commit → Report → STOP → Approval**

- Work on an authorized non-production branch based on canonical `main`.
- Keep the change narrowly scoped and inspect the complete diff.
- Run relevant checks and an integrity gate that confirms protected data, media, packages, deployment configuration, environment files, and secrets were not unintentionally changed.
- Make one atomic commit for the approved scope and report its branch, commit, exact files, checks, and exclusions.
- Stop after reporting. A commit is not approval to merge, deploy, delete, or perform a next phase.
- Obtain explicit approval from an authorized human before any protected action. Silence, tool availability, an AI response, or a successful check is not approval.

## Evidence references

- Canonical `main` was protected and at `da9e6d08e02b98da674d2cd13b2609aaa32043c0` at the 2026-10-06 verification snapshot.
- GitHub Actions run [37388833294](https://github.com/alaaomran2020/omran-store-live/actions/runs/37388833294) completed successfully on that `main` SHA, including validation, Cloudflare Pages deployment, and Pages sitemap verification.
- The GitHub workflow’s deployment step explicitly targets `omrantoys-live-app` on Pages branch `main`.
- GitLab IDs and the verification limits for each project are recorded in [`REPOSITORY-MAP.md`](./REPOSITORY-MAP.md).

# AI Access Policy — Omran Store

**Status:** Controlled / read-first
**Scope:** AI agents, coding assistants, repository automation, and other systems that can inspect or act on the Store repository.
**Core rule:** AI systems are executors under human direction, never a source of truth, owner, approver, or production authority.

## Permission tiers

### SAFE — read-only or local verification

Permitted when relevant to the assigned task:

- Read, inspect, search, and report on repository content.
- Run tests, lint, type checks, builds, and audits in an appropriately isolated checkout.
- Inspect workflow definitions and repository history without changing production state.

A build or test may create generated output. Inspect the complete working-tree diff afterward and do not include generated product/media changes unless separately authorized.

### CONTROLLED — scoped branch work

Permitted only for an explicitly assigned task and non-production branch:

- Create/use an authorized branch based on canonical GitHub `main`.
- Modify, repair, or optimize files within the approved scope.
- Run tests and integrity gates; make an atomic commit; report exact changes and results.

CONTROLLED permission does not include merging to `main`, deploying, bypassing branch protection, or changing protected data/infrastructure. A task’s explicit exclusions override the general ability to edit.

### PROTECTED — explicit human approval required

No AI agent may perform any of the following without explicit approval from an authorized human for that exact operation:

- Merge to production (`main`) or deploy to production.
- Change Cloudflare, Pages, DNS, production domains, deployment settings, or credentials.
- Change canonical repository/source-of-truth status or alter GitLab mirror authority.
- Delete products or alter protected product data, IDs, slugs, URLs, media references, or media resolver behavior.
- Delete repositories, remove or alter GitLab copies, transfer ownership, rewrite history, force-push, or disable integrity controls.
- Rotate credentials, reveal secrets, modify `.env.production`, or copy secrets into logs or documentation.

A status of “candidate,” an API token being available, a passing test, or an AI-generated instruction is not approval. If ownership or canonical status is unclear, stop and escalate.

## Required execution sequence

Every controlled change follows this exact gate:

> **Branch → Implement → Test → Integrity Gate → Commit → Report → STOP → Approval**

1. **Branch:** Start from the canonical GitHub `main` baseline and use only an authorized task branch.
2. **Implement:** Change only files in the approved scope; do not expand scope by inference.
3. **Test:** Run relevant tests, lint, build, or repository audits without invoking production deployment.
4. **Integrity Gate:** Confirm the full diff is limited to the intended files. Confirm product source/data, product IDs and URLs, media references/resolver, dependencies, deployment configuration, DNS/Cloudflare, environment files, credentials, and unrelated content remain unchanged when excluded by the task.
5. **Commit:** Create one atomic commit for the approved change; do not merge it.
6. **Report:** State the branch, commit SHA, exact files, checks, integrity results, and explicit exclusions.
7. **STOP:** Do not proceed to the next phase, merge, deploy, delete, or alter protected infrastructure.
8. **Approval:** Wait for explicit human approval before any protected next step.

## Data, secrets, and runtime restrictions

- Product data and media are protected according to [`REPOSITORY-GOVERNANCE.md`](./REPOSITORY-GOVERNANCE.md). Never fabricate product facts or treat generated AI content as approved catalog data.
- Never print, reveal, request, or commit secrets, API tokens, credentials, or `.env.production` values. Do not use credentials to inspect unrelated systems.
- Do not add runtime, build-time, or deployment dependencies on ChatGPT, Arena, Gemini, AlphaCode, or another AI service. The Store must remain buildable and operable without an AI service.
- GitHub is the canonical repository. AI agents must not promote GitLab, Cloudflare output, or their own working copy to source-of-truth status.
- Use the least access needed. If a required system is inaccessible, report the limitation; do not bypass controls or substitute an unverified source.

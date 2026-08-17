---
status: accepted
date: 2026-08-17
decision-makers: [RafaelAugustScherer]
authored-by: agent
---

# Keep one versioned changelog, cut per PR

## Context and Problem Statement

The book carried two changelog layers: a versioned root changelog
(`domainbook/changelog.md`, tracking `package.json` releases) and a changelog per
domain (`domainbook/domains/*/changelog.md`). The per-domain files only ever
accumulated a `## [Unreleased]` bucket — they were never versioned or dated — so a
reader could not tell when a domain change shipped, in which release, or relative
to changes in other domains. The buckets also grew verbose, restating detail that
already lived (or belonged) in a feature, decision, or debt record. The result was
confusing and did not serve the changelog's purpose.

## Decision Drivers

- A reader should be able to place any change on one timeline, with a version and a date.
- One obvious place to write a change, and one to read it.
- The changelog states *what* changed; the *why* and the depth live in the docs that own them.
- Stay within the existing `domainbook check` enforcement and the `Skip-Docs` waiver.

## Considered Options

- **One versioned root changelog**, per-domain changelogs retired.
- **Keep per-domain changelogs**, but stamp each with the app version on every PR.
- **Independent per-domain versions**, each bumped when that domain changes.

## Decision Outcome

Chosen: **one versioned root changelog, retire the per-domain changelogs.**

`domainbook/changelog.md` is the single timeline. Every pull request that changes
the product or its architecture cuts a version — one dated `## [x.y.z]` H2 in
Keep a Changelog categories — with a matching `package.json` bump in the same PR.
Entries are terse (one line) and link to the feature, decision (`ADR-*`), or debt
record (`TDR-*`) that carries the detail. A purely-internal PR that touches no
product or architecture may waive its version with a `Skip-Docs: <reason>` trailer.

The two rejected options keep a "which version" ambiguity across domains and split
reading/writing across files; per-domain versions add the most bookkeeping and
diverge from `package.json` for no reader benefit at this project's size.

### Consequences

- Good: one place to write and read; every change is dated and versioned; detail
  stays in the feature/decision/debt that owns it, so the changelog stays scannable.
- Bad: a change spanning several domains lands in one file rather than next to each
  domain's page — acceptable, since a domain's own features, decisions, and debt
  records still document it. `domainbook check` accepts any of those as the update
  for a touched domain, so retiring the per-domain changelogs does not weaken the gate.

### Confirmation

`domainbook validate` passes with the per-domain changelogs removed, and
`domainbook check` still requires a touched domain to update its page, a feature, a
decision, or a debt record. This decision was applied in the same change: the
per-domain buckets were folded into dated versions (`0.1.4`, `0.1.5`) in the root
changelog.

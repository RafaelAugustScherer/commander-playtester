---
status: open
date: 2026-08-21
severity: low
quadrant: deliberate-prudent
decisions: [ADR-0006]
---

# Creatures with defender granted the ability to attack cannot be declared

## Debt

The engine lists every creature with the Defender keyword in a `DeclareAttackers`
decision's `valid_attacker_ids`, regardless of the keyword and regardless of any
effect — so it cannot be trusted to say when a defender may attack (`TDR-0001`, the
churning alpha ABI, is the wider version of this). We work around it by dropping
every creature whose effective keywords include `Defender` when building the
declare-attackers prompt (`src/sim/decisions/attackers.ts`,
`domains/simulation/features/step-through-a-turn.md`). That is correct for the
overwhelmingly common case, but it also removes the rare *legal* one: a defender
granted "can attack as though it didn't have defender" (Assault Formation,
Wakestone Gargoyle, High Alert, …) — the grant does not clear the keyword, so our
filter still hides it. This is the one combat scenario the app does not cover.

## Impact

Low. It only bites a defenders-matter deck that has actually activated such a grant
(the bundled Abzan Armor deck can), and even then only costs the ability to swing
with a wall that turn — the board state stays correct. No wrong life totals, no
silent mis-scoring. The far more common bug — defenders attacking when they never
should — is what the filter fixes.

## Remedy

Prefer an upstream fix: the engine should exclude defenders from
`valid_attacker_ids` unless a grant is active (filed as
[phase-rs/phase#7587](https://github.com/phase-rs/phase/issues/7587)). We expect a
future engine version to eventually honor the keyword; when it does, delete the
client-side filter and this debt in the same pass — the prompt can then trust
`valid_attacker_ids` directly. Until then, a grant-aware filter is possible locally
(scan `transient_continuous_effects` for an active `CanAttackWithDefender` on the
object), but it adds real complexity for a niche case and is not worth carrying
ahead of the upstream fix.

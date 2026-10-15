---
name: game-mechanics-validation
description: "Validate game rules — five missions, physical+digital completion, either-order, UNDISCOVERED/ACTIVE/REPAIRED, 2 tokens once (max 10), 15-minute timer behaviour, failure states and balance — for consistency across all docs and, once code exists, against implementation. Use when rules are edited, questioned or implemented."
---

# Game Mechanics Validation

## When to use
A rule, mission, token or timer behaviour is changed, questioned or implemented.

## Required inputs
`docs/02`, `docs/11` (D1–D20, Q3/Q5/Q7/Q13/Q14), and the docs or code to check.

## Procedure
1. List the canonical rules: R1–R12 (`docs/02` §5.2), the time system (§8), the reward economy (§9), the state model (§7).
2. Grep each rule across `docs/01, 02, 04, 05, 06, 08, README.md` (and code, if any). Build a **rule × document matrix**: cell = section ref + "match" / "differs: quote" / "absent".
3. Check the **invariants:**
   - Tokens = 2 × count(REPAIRED), at most 10. No partial tokens. No double award (double tap, resubmit, back, reload).
   - REPAIRED requires both components. Order is free. REPAIRED is terminal.
   - Timer: starts only on Start; pause stops time; navigation never resets it; restart resets missions and tokens (with confirmation).
   - GPS never required; never proof of Missing Connection.
4. Check every mission has: fiction, habit, physical, digital, completion condition, accessible alternative, reward, and (if decided) candidate area.
5. **Balance:** estimate each mission's minutes **as an assumption**. Flag if the total for five exceeds 15. Recommend a playtest (A6), and never claim balance is proven.
6. Map each rule to a test ID in `docs/08`. List rules with no test.
7. Code (if present): read the state reducer, timer and token code, and run the tests. A rule counts as implemented only with a passing test.

## Validation checklist
- [ ] Matrix covers every rule × every doc
- [ ] Every rule mapped to a test or flagged
- [ ] Proposed items not presented as Confirmed

## Failure cases
Conflicting rule statements (log both in OPEN-QUESTIONS, don't choose); a rule depends on an open question (mark it BLOCKED).

## Ask for clarification when
A fix would change mission content, rewards, timer length or the concept.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.

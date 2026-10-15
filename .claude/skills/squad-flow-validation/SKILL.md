---
name: squad-flow-validation
description: "Validate squad and social designs or code: squad model honesty (shared device / unsynced devices / real sync), invitations, consent-based sharing, presence including stale and unavailable states, network failure handling, solo fallback, and Missing Connection consent and privacy. Use whenever squads, presence or the social mission are touched."
---

# Squad Flow Validation

## When to use
Squad, presence, invitation, sharing or Missing Connection design or code changes.

## Required inputs
`docs/02` §6.3 and §12, `docs/07` §7, Q4, Q13, SRC-08 list in `docs/project-state/PROJECT_AUDIT.md`.

## Procedure
1. **Model:** identify which squad model the design assumes. Without a backend, nothing may show cross-device presence or sync (D14, doc 06 §13).
2. **State table:** no squad, invite pending, joined, member present, member stale (with last-update time), member unavailable, network failure, consent withdrawn. Give behaviour and copy for each.
3. **Fabrication scan:** search designs and code for "online", "joined", "synced", "sent" and the like. Each must be backed by a real confirmation path or labelled "Sample"/"Simulated".
4. **Consent:** every sharing action needs an explicit opt-in that is reversible, with play continuing if declined.
5. **Solo fallback:** every mission is completable solo. Missing Connection is skippable or has an alternative (pending Q13).
6. **Missing Connection privacy:** no name, contact or private-info fields; reminder copy present; no proximity, photo or contact-exchange proof.
7. **Results:** squad contributions appear only if real. Completed, incomplete and unverified activities are distinguished (SRC-09).

## Validation checklist
- [ ] No unbacked success or presence state
- [ ] Consent explicit and reversible
- [ ] Solo play always possible

## Failure cases
Design needs a backend (escalate; don't fake it); Q4 undecided (validate all options or mark BLOCKED).

## Ask for clarification when
Accounts, a backend, invite codes over a network, or new personal data would be needed.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.

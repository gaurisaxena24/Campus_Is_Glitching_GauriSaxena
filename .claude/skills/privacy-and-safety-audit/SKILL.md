---
name: privacy-and-safety-audit
description: "Audit designs, copy and code against privacy rules P1–P9, consent, data minimisation, the data-handling statement, photo rules, Missing Connection safety, physical-safety language and responsible-use rules. Use before any data, location, photo, social or copy change and before a playtest or submission."
---

# Privacy and Safety Audit

## When to use
Before shipping anything that collects, stores or shows data; any change to copy for physical or social tasks; before playtests and the jury demo.

## Required inputs
`docs/07` (P1–P9, §2–12), the artefact under review (doc, copy or code).

## Procedure
1. **Data inventory:** list every piece of data the artefact collects or stores (grep code for `localStorage`, `sessionStorage`, `indexedDB`, `fetch`, `navigator.geolocation`, file inputs and analytics). Compare with the `docs/07` §4 minimisation table.
2. **Rule matrix:** for each of P1–P9, record where it is satisfied (file:line or screen), where it is violated, or "N/A (feature absent)".
3. **Data-handling statement (§5):** every "To be confirmed" must be filled truthfully once a feature exists. Never write a protection that isn't implemented (P9).
4. **Copy scan:** `grep -rniE "\brun\b|running|race|as fast as|hurry|lazy|addicted|wasting time" <targets>` returns no unsafe or shaming hits. Check that "walk", "comfortable pace", "stop if uncomfortable" and the safety reminders are present on physical tasks.
5. **Photos:** optional; reminder about people, IDs and restricted areas; no auto-posting; EXIF location not read or stored (Proposed).
6. **Missing Connection:** voluntary, ask first, accept no, no private details, no proof, skippable.
7. **Secrets:** `grep -rniE "api[_-]?key|secret|token=|password" .` excluding `.git` must not show real secrets.
8. **Playtest readiness:** consent explanation for real players exists (§12).

## Validation checklist
- [ ] P1–P9 matrix complete
- [ ] Copy scan output attached
- [ ] No claimed but unimplemented protection

## Failure cases
Feature undocumented in `docs/07` (flag the gap); third-party service found (escalate and list what it receives).

## Ask for clarification when
Any change to data collection, storage location, sharing or retention is needed.

## Completion report
Return: what was checked, results with citations, files changed (or none), commands run with their actual output, items `NOT RUN` and why, open questions raised.

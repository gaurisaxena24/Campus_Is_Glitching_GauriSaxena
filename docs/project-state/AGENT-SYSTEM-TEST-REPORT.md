# Agent System Test Report

**Date:** 9–10 October 2026 (23:50–00:15 IST)
**Environment:** Claude Code 2.1.295, macOS (Darwin 25.2.0), Node v22.19.0
**Tester:** super-agent (main session)
**Result key:** PASS · FAIL · PARTIAL · NOT RUN

---

## 1. Summary

| # | Test | Result |
| --- | --- | --- |
| 1 | Super Agent summarises status from the shared source of truth | **PASS** |
| 2 | Super Agent delegates a documentation audit | **PASS** (native agents) |
| 3 | Two independent specialists review different aspects | **PASS** (9 parallel workstreams) |
| 4 | Dependencies respected | **PASS**, with noted register defects that were then fixed |
| 5 | Agents do not silently overwrite each other's work | **PASS** for this system's files; **PARTIAL** attribution for peer-locked files |
| 6 | Unsupported claims are flagged | **PASS** |
| 7 | Independent reviewer rejects a weak deliverable | **PASS** (twice: synthetic and real) |
| 8 | Project state and task records updated correctly | **PASS after 2 revision cycles** (T-902 REJECT → T-903 REJECT → T-904 APPROVE_WITH_NOTES) |
| 9 | Agent and skill configuration valid | **PASS** |
| 10 | Existing tests run | **PASS** (unit tests); UI tests **NOT RUN** |

## 2. Configuration validation (test 9)

| Check | Command / method | Result |
| --- | --- | --- |
| Agents and skills load | Fresh headless session: `claude -p "…list every subagent_type… every skill…" --max-turns 1` (10 Oct about 00:03) | All **11 agents** (`super-agent` plus 10 specialists) and all **16 skills** listed |
| Validator | `claude plugin validate --strict --json .claude/agents`, `.claude/skills`, `.claude` | `success: true`, but `contents: []`: the validator enumerated **nothing**, so it is **not counted as evidence** |
| Frontmatter rules | Checked against code.claude.com sub-agents and skills docs (fetched 9 Oct by a `claude-code-guide` subagent) | `name` + `description` present on all; `tools` as a comma string; `skills` as a YAML list; no `synced` folder name |
| Live availability in this session | `Agent` tool with `subagent_type: documentation-agent` at about 00:05 | **Failed** ("Agent type … not found"). Types created mid-session were not yet registered. They became available about 00:08 without a restart. |
| Bundled scripts | `check_links.py`, `contrast.py`, `extract_docx.py` run against real inputs | All three produce correct output (e.g. contrast 11.81:1 for ink on parchment; docx extraction of the original nav list) |

## 3. Test details

### Test 1: status summary (T-901 Part 1)
Native `super-agent` (as a subagent) summarised status using only the state files, cited file and section for each fact, ranked the next five tasks and marked which were blocked by owner decisions or locks. It also **found three defects in the shared state**: PROJECT-STATE §6/§12 was stale against the register; OPEN-QUESTIONS cited non-existent tasks T-104/105/107; T-002 was VERIFIED while T-001 was IN_REVIEW. **PASS** (all three since fixed).

### Test 2: delegation (T-901 Part 2–3)
`super-agent` called the `Agent` tool with `subagent_type: documentation-agent` (native type, task T-901a, read-only). Before dispatch it checked dependencies and locks and took SHA-256 hashes of 21 files. The specialist returned in the §5 format: 137 links / 0 broken; 12 of 13 docs indexed (`Description.md` missing, already OQ-A3). `super-agent` re-ran the checker (identical output) and confirmed the hashes were unchanged. **PASS.** This also shows that nested delegation (main → super-agent → documentation-agent) works.

### Test 3: independent specialists in parallel
T-010…T-018: nine workstreams were dispatched in one message, all read-only and so free of file conflicts. Each returned findings in its own domain with citations (`reviews/PHASE-7-FINDINGS.md`). They ran as `general-purpose` agents **emulating** each role (labelled "Role emulated: …"), per manual §6, because native types were not yet loaded. **PASS** (with the emulation caveat).

### Test 4: dependencies
- The read-only reviews ran in parallel because they had no dependencies. Edit tasks were not dispatched while files were locked by the peer session.
- The reviewer was dispatched only after T-004's files existed. Moving `agents/` was **deliberately delayed** until the T-901 and T-902 readers finished.
- Defects found and fixed: several backlog rows were `READY (after peer lock release)` and T-112 was READY while its dependency was IN_PROGRESS. Both violate manual §4a and are now `BLOCKED`. T-102 proceeds in the peer session before owner decisions (T-100). That is flagged, not hidden.
- **PASS.**

### Test 5: no silent overwrites
- *Historical record (hash lists kept in the session scratchpad, not in the repo):* SHA-256 of all 37 files in `CLAUDE.md`, `.claude/**` and `agents/**` was taken at 00:06:06 and again at 00:09. Only `OPEN-QUESTIONS.md` and `TASK-REGISTER.md` changed, both by super-agent's own integration edits (mtimes 00:08:08 and 00:08:43). All agent, skill and script files were byte-identical.
- T-901: identical hashes of 21 files before and after the delegated audit.
- Limitation: `docs/00`–`11` and code are edited by the peer session, so hash changes there cannot be attributed. For those files the system relies on every subagent reporting "Files modified: none". **PASS / PARTIAL.**

### Test 6: unsupported claims flagged
- T-900: the reviewer flagged invented coordinates, "Verified" without a record, "Pass" without evidence and a false "calibrated" claim.
- The workstreams flagged unapproved rule decisions in code (OQ-09, 10, 12) and the unsourced `MAX_SQUAD`.
- The map agent refused to call the map "official" until provenance was shown. Super-agent then proved it by hash.
- The academic agent refused to invent rubric criteria and stated "no playtest conducted".
- **PASS.**

### Test 7: reviewer rejects weak work
- **T-900 (synthetic):** REJECT with 8 blocking issues, covering all 7 planted flaws plus a false modification claim.
- **T-902 (real):** the native `independent-reviewer` **rejected super-agent's own T-004 deliverable** with 7 blocking issues: stale `CLAUDE.md` status line; stale PROJECT-STATE §6/§12; PROJECT-STATE §7 contradicting OQ-07; OQ-01 misdescribing the current nav; T-003 VERIFIED citing this report before it existed; missing register columns; no task-field definition in the manual.
- **PASS.**

### Test 8: state and records updated correctly
The first version failed review (test 7). Fixes applied at 00:12–00:15: PROJECT-STATE rewritten from a fresh snapshot; `CLAUDE.md` status line made dated and pointer-based; OQ-01 restated; task-ID references corrected; P3/P4 columns added; statuses corrected to BLOCKED; manual §4a task fields and the P0–P4 scale added (also in the `task-planning-and-delegation` skill); findings persisted in `reviews/PHASE-7-FINDINGS.md`. T-903 re-review: all 7 fixed, but **REJECT** on 2 new defects (a wrong path/date line in `CLAUDE.md`; a stale T-113). Both fixed, plus quoted YAML descriptions. Final re-review **T-904: APPROVE_WITH_NOTES** (27/27 frontmatter blocks strictly parse; 137 links, 0 broken; a fresh headless session loads 11 agents and 16 skills). **PASS.**

### Test 10: existing tests
- `node --test tests/*.test.js`: 30/30 pass at 00:06 and 00:07:45; **31/31 pass at 00:12:04**. These are unit tests of the peer's logic layer.
- UI, viewport (D18) and accessibility tests: **NOT RUN**. The UI was mid-build, and no rendered app was reviewed by this system.

## 4. Known limitations of the system

1. **Agent registration timing:** agents or skills created during a session may not be callable until Claude Code registers them (observed about 3 minutes here). Use the manual §6 fallback meanwhile.
2. **Specialists with Edit/Write rely on the prompt for read-only mode.** Mitigation: hash snapshots before and after, plus the reviewer's ownership check.
3. **Peer sessions:** coordination is by `SendMessage` agreement, with no enforcement. Owner instructions relayed by a peer are not treated as owner approval.
4. **`claude plugin validate` gave no real validation** for project `.claude/` folders here. Use a headless listing instead.
5. **Memory:** only files in `docs/project-state/` persist between sessions.

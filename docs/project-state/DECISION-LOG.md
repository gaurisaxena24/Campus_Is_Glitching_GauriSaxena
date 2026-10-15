# Decision Log (agent system)

**Owner of this file:** super-agent
**Relationship to `docs/11`:** `docs/11-DECISIONS-AND-OPEN-QUESTIONS.md` is the canonical log of **product** decisions (D1–D20). This file records decisions about the **agent system and process**, and mirrors product decisions only when the owner confirmed them directly to this session. A suggestion from an agent or a peer session is never a decision until the owner confirms it.

| ID | Date | Decision | Confirmed by | Evidence | Rationale |
| --- | --- | --- | --- | --- | --- |
| AD-01 | 9 Oct 2026 | Agent definitions and skills live in the repo-root `.claude/`; shared state lived in a repo-root `agents/` folder (superseded by AD-07). | Owner (answer to this session's question) | Session transcript, 9 Oct 2026 about 23:55 | Claude Code only loads `.claude/` from the project root; owner had already moved `docs/agents/` → `agents/`. |
| AD-02 | 9 Oct 2026 | D17–D20 (no Figma Make; phone viewport centred in a MacBook browser; coded web app with Claude Code; spec/implement/verify role split with real-render evidence) are encoded into all agents and skills. | Owner (answer to this session's question) | Same; `docs/11` D17–D20 | Owner confirmed the peer-relayed change. |
| AD-03 | 9 Oct 2026 | The main session acts as Super Agent via `CLAUDE.md`. `claude --agent super-agent` is optional. No `agent` key is set in settings. | super-agent (routine, reversible) | `CLAUDE.md` | Setting `agent` replaces the default system prompt for every session; that is left to the owner. |
| AD-04 | 9 Oct 2026 | Only `super-agent` has the `Agent` tool. Specialists list explicit tools without `Agent`. | super-agent (routine) | `.claude/agents/*.md` frontmatter | Prevents uncontrolled nested delegation and keeps one coordinator. |
| AD-05 | 9 Oct 2026 | Independent review is mandatory for high-impact changes (manual §3). | Setup request from owner | Owner's setup prompt | Quality gate. |
| AD-06 | 9 Oct 2026 | The `.docx` originals in `~/Downloads` are read-only sources; Markdown divergences are open questions, not overrides. | super-agent (process) | `docs/project-state/PROJECT_AUDIT.md` §5 | Owner rule: preserve detail, never silently drop requirements. |
| AD-07 | 10 Oct 2026 | Keep only one agent folder: `.claude/agents/` (definitions). Shared state moved from root `agents/` to `docs/project-state/` at about 00:11 IST; all references in `CLAUDE.md`, `.claude/**` and the state files were updated. | Owner ("keep only one agent folder", then chose `docs/project-state/`) | Session transcript, 10 Oct 2026 | Two folders named "agents" were confusing. `.claude/agents/` cannot move. |

## Pending (not decisions)

| Item | Status |
| --- | --- |
| Framework = plain HTML/CSS/ES modules + `node --test` | Reported by peer session as in use; **owner approval not confirmed to this session** (OQ-02) |
| "APJ Abdul Kalam Library" conflation | Reported by peer; not verified by this session (OQ-07) |

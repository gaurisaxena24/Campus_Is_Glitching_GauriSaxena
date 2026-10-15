# File Ownership

**Owner of this file:** super-agent
**Rule:** one active editor per file. Take a lock (task ID plus agent) before dispatching an edit task, and release it on VERIFIED or CANCELLED. Agents not listed as the active lock holder treat the file as read-only.

## 1. Default owners

| Path | Default owner | Notes |
| --- | --- | --- |
| `CLAUDE.md`, `.claude/agents/*`, `.claude/skills/*` | super-agent | Config changes need owner approval for anything beyond routine edits |
| `docs/project-state/*` | super-agent | Shared state |
| `README.md`, `docs/00`, `docs/01`, `docs/10`, `docs/11`, `docs/Description.md` | documentation-agent | `docs/11` changes require an owner decision |
| `docs/02` | game-design-agent | |
| `docs/03` | campus-map-agent | Location sections (§8–11) co-reviewed by gps-movement-agent |
| `docs/04`, `docs/05` | ui-ux-agent | |
| `docs/06` | engineering-agent | §11 co-reviewed by gps-movement-agent |
| `docs/07`, `docs/08` | qa-safety-agent | |
| `docs/09` | documentation-agent | **Superseded (D17)**; historical only, no content edits |
| `docs/academic/*` (future) | academic-presentation-agent | |
| `~/Downloads/*.docx` originals | **nobody** | Read-only, always |

## 2. Active locks

| Path(s) | Holder | Task | Since | Notes |
| --- | --- | --- | --- | --- |
| `index.html`, `src/**`, `scripts/**`, `tests/**`, `assets/**`, `README.md`, `docs/00`–`docs/11` | **Peer session** `campus-is-glitching-gaurisaxena-e3` | Gameplay overhaul (owner direction relayed by the peer): minigames, XP/badges/streak/daily, local squad mode, animated map, sound, squad banner removal | 10 Oct 2026 about 07:15 | Agents here are read-only on these paths until the peer releases them |
| `CLAUDE.md`, `.claude/**`, `docs/project-state/**` | super-agent (this session) | Agent-system build | 9 Oct 2026 23:50 | Peer agreed not to edit (path `docs/project-state/` notified to the peer 10 Oct 00:10) |

## 3. Lock history

| Date | Path | Holder | Task | Released |
| --- | --- | --- | --- | --- |
| 10 Oct 2026 00:00 | `index.html`, `package.json`, `scripts/`, `src/`, `tests/`, `assets/`, `build-log.md`, `README.md`, `docs/00`–`11` | Peer session `campus-is-glitching-gaurisaxena-e3` | Game build, doc updates, T-160 | **Released about 07:10** by peer message. Default owners (§1) now apply. |
| 9 Oct 2026 | `docs/agents/*` → moved to `agents/*` | super-agent | Phase 1–5 build | Path changed per AD-01 |
| 10 Oct 2026 | `agents/*` → moved to `docs/project-state/*` | super-agent | Owner request | Per AD-07 |

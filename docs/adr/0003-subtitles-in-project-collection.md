# ADR 0003: Subtitles live inside a single project collection

**Status:** accepted

The app moved from one global subtitle list to **projects** — each project is a
named bundle of one video plus its subtitles. We persist all of them in a single
versioned localStorage key (`subtitle-editor.projects.v1`) holding
`Project[]`, where `Project = { id, name, videoName, createdAt, subtitles }`.
Reading-speed settings stay global (unchanged). Each project's video handle is
stored in IndexedDB keyed by the project id. On first load, the pre-project
data (`subtitle-editor.subtitles.v1` and the legacy `video` handle) is wrapped
into one project by an idempotent migration whose commit point is clearing the
legacy keys.

**Considered options:** (1) Per-project localStorage keys
(`subtitle-editor.project.<id>.subtitles.v1`) — rejected: listing, deleting and
migrating projects would juggle many keys and risk orphaned state. (2) Store
subtitle bodies in IndexedDB — rejected: subtitle payloads are small and the
collection fits localStorage's quota. (3) No migration of existing data —
rejected: it would silently discard the user's existing work.

**Consequences:** A single `useProjects()` hook is the source of truth; the
editor derives its project's subtitles from it. Subtitles persist with their
project, so deleting a project removes its subtitles atomically. The one-time
migration is safe to re-run if interrupted (a crash before the commit is swept
on the next load). Export base names now follow the project name, fixing the
former `clip.mp4.srt` quirk. Subtitle payloads are the practical bound on
localStorage usage.

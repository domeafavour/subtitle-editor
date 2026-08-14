# Subtitle Editor

A browser app for writing subtitles by hand. A local video plays in the
browser and each subtitle is typed at the moment the video pauses — or added
manually at the current playhead. Projects group a video with its own subtitle
list, and every line's end time is derived automatically (reading speed or the
line's measured speech duration) with per-line overrides.

Everything runs locally: no server, no uploads, no accounts. Data lives in
your browser (`localStorage` for projects and settings, IndexedDB for video
file handles).

> The domain terminology used across the codebase and docs is defined in
> [CONTEXT.md](./CONTEXT.md) (subtitle, line, draft, commit, nudge, jump,
> default end mode, speech duration, …). Architecture decisions live in
> [docs/adr](./docs/adr).

## Features

- **Projects** — create one by picking a video (drag & drop or browse). The
  File System Access API persists the file handle, so a reload can re-open the
  project's video with a one-click reconnect.
- **Capturing lines** — pause the video and type, or add a line at the current
  playhead anytime with the **+ Add line** button / `n` shortcut (the video
  pauses if playing). The floating composer commits with Enter (Shift+Enter
  for a new line) and cancels with Esc or ✕. A setting controls whether
  pausing opens the draft — turn it off to pause freely and add lines manually.
- **Per-line controls** — play the line's range, jump to its start/end, edit
  text, set or reset a manual end time, nudge by ±0.1s, read the line aloud
  via the browser TTS, and delete.
- **Timeline** — a horizontal track showing each line's range as a clickable
  block with a live playhead. On wide screens the header, video, and timeline
  stay pinned while the subtitle list scrolls in a second column.
- **Derived end times** — the **default end mode** setting chooses between the
  reading-speed estimate (chars/sec, clamped between min/max seconds) and the
  line's **measured speech duration** (the browser TTS speaks it silently at
  volume 0 when the line is added or edited; rows and the timeline show a
  measuring indicator until it lands). A manual end override always wins.
- **Export** — the header's **Export** menu downloads `.srt` or `.vtt` with
  the effective end times baked in.
- **Keyboard shortcuts** — `Space` play/pause, `[` / `]` jump to the previous
  line's start / current line's end, `←` / `→` step by one frame (~33 ms),
  `n` add a line.

## Getting started

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

## Scripts

| Command                | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| `pnpm dev`             | Start the Vite dev server on port 3000                    |
| `pnpm build`           | Production build to `dist/`                               |
| `pnpm preview`         | Preview the production build                              |
| `pnpm test`            | Run the Vitest suite (`vitest run`)                       |
| `pnpm check`           | Biome check (lint + format)                               |
| `pnpm format:fix`      | Biome format — write                                     |
| `pnpm lint:fix`        | Biome lint — write                                       |
| `pnpm generate-routes` | Regenerate `src/routeTree.gen.ts` (TanStack Router)       |

## Project structure

```
src/
  routes/            File-based routes: project list (/) and the project editor (/project/$projectId)
  components/        UI components (video stage, timeline, rows, popovers, settings panel, …)
  hooks/             React bindings: playback-machine context, store-backed project data, shortcuts
  lib/               Pure domain logic: timing derivation, subtitle mutators, SRT/VTT, storage, TTS
  store/             XState pieces: projects/settings stores, speech-measure store, playback machine, migration
  styles.css         Global styles + Tailwind v4 theme (custom animations)
```

- **State** — `projectsStore` and `settingsStore` are global `@xstate/store`
  singletons persisted to `localStorage`; `speechMeasureStore` tracks
  in-flight speech measurements. Video/draft lifecycle is an XState machine
  (`playbackMachine`) scoped per project and exposed to the editor through a
  React context, so components read global state instead of prop-drilling.
- **Data** — projects and settings persist under versioned `localStorage`
  keys; video handles live in IndexedDB keyed by project id. A one-time
  migration (run from the root route) wraps the legacy pre-project subtitle
  data into a project.

## Stack

- React 19 + TypeScript
- [TanStack Router](https://tanstack.com/router) (file-based routing, generated route tree)
- [XState](https://stately.ai/docs) — `@xstate/store` for persisted stores, `xstate` for the playback machine
- [Tailwind CSS](https://tailwindcss.com) v4 (via the Vite plugin)
- [Vite](https://vitejs.dev) 8
- [Vitest](https://vitest.dev) for tests
- [Biome](https://biomejs.dev) for linting/formatting

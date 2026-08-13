# ADR 0002: End times may be manually overridden per line

**Status:** accepted · supersedes ADR 0001

The user wanted per-line control of a subtitle's end time without hand-setting
every line. We keep the reading-speed derivation as the default but add an
optional stored override: a `Subtitle` carries `manualEndMs` (absolute video
time, integer milliseconds) when the user has set one. The effective end
(`SubtitleWithEnd.endMs`) is `manualEndMs` when present, otherwise the reading
estimate, and in both cases it is clamped to the next line's start and floored
to `start + 1` — so the no-overlap invariant and SRT/VTT validity from ADR 0001
are preserved, and an override is never allowed to overlap the following line.

**Considered options:** (1) Keep ends purely derived (ADR 0001) — rejected:
the user wants to fix specific lines by hand. (2) Store a duration instead of an
absolute end — rejected: exports need exact absolute timecodes, and clamping to
a neighbouring start is simpler with an absolute value. (3) Allow manual ends to
overlap the next line in exports — rejected: the user chose to clamp to the
next start instead, keeping exports valid.

**Consequences:** Overrides persist in the same versioned localStorage key
(`subtitle-editor.subtitles.v1`), so existing data is unaffected (an entry
without the key stays automatic; no migration). `parseSubtitles` keeps only
finite overrides later than the line's start; `setManualEnd` rejects `<= startMs`
and `nudgeStart` clears an override its start would cross. Reading speed remains
the default surface: auto ends still reflow with the settings, while overrides
are fixed plain data. An override can still be silently shortened by a later
line's start (the clamp) — the row displays the effective end so this is visible.

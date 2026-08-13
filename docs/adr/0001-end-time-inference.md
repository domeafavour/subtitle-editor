# ADR 0001: End times are derived from reading speed, never stored

**Status:** accepted

A manual subtitle editor captures each line's start time at the moment the
video is paused, but the end time is never set by hand: it is inferred from how
long the line is. We derive the end at render time from `(start, text, reading
speed settings, next line's start)` — `end = min(start + clamp(chars / rate,
min, max), nextStart)` — and we never persist end times. This keeps clamping
and overlap prevention live: adding, editing, deleting, or nudging a line (or
changing the reading speed) instantly reflows every affected neighbour, and the
exported SRT/VTT is always overlap-free.

**Considered options:** (1) Store a user-entered end and allow manual
adjustment — rejected: the user explicitly didn't want to set end times, and
stored ends go stale when a neighbour moves or a line is deleted. (2) Store the
computed reading estimate per line — rejected: it silently diverges from what's
displayed when the reading-speed settings change. (3) Compute ends from the
live inputs — chosen. The one degenerate case is two lines sharing an identical
start time, where the earlier line is given a 1 ms duration so SRT stays valid.

**Consequences:** SRT/VTT exports always contain valid, non-overlapping timing.
The reading-speed settings are a first-class product surface, not an
implementation detail. See `CONTEXT.md` for the derived terms (`end time`,
`reading estimate`, `line order`).

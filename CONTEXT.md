# Subtitle Editor

A browser app for writing subtitles by hand: a local video plays, and each
subtitle is typed at the moment the video is paused. Projects group a video
with its own subtitle list. The end time is inferred from how long the line is
by default, and can be overridden per line.

## Language

**Subtitle**:
A line of text with a start time, a derived end time, and an optional end
override. Text is trimmed and `-->`-free, and may contain internal newlines for
multi-line blocks.
_Avoid_: caption, cue

**Start time**:
The moment, in milliseconds, at which the video was paused when the line was
captured. A non-negative integer. Captured, never inferred.
_Avoid_: timestamp, timecode

**End time**:
The moment a subtitle stops being displayed. Derived from the default end mode
(reading estimate or measured speech duration) and clamped to the next
subtitle's start; per-line overridable (see end override). Always floored to
`start + 1` ms so SRT/VTT stay valid. Never stored — recomputed at render time.
_Avoid_: duration

**Default end mode**:
The user setting that chooses how a new line's default end is derived:
`reading` (the reading estimate) or `speech` (the line's measured speech
duration). Switching it reflows every line that has no end override or
measurement.
_Avoid_: end strategy, timing mode

**Speech duration**:
A line's measured speaking time — how long the browser TTS takes to say its
text, measured silently (volume 0) when the line is added or edited and stored
per line as `speechDurationMs`. In speech mode it replaces the reading estimate
for that line's default end; unmeasured lines (and measurement failures) fall
back to the reading estimate. Machine/voice-specific; re-edit a line to
re-measure.
_Avoid_: spoken duration, TTS estimate

**Measuring**:
A line whose speech duration is being measured — its row's end time shows a
spinner (and the reading fallback underneath) until the measurement lands or
fails, at which point the marker clears.
_Avoid_: pending, loading duration

**End override**:
An optional user-entered end time stored on a line, in absolute video
milliseconds. When present it replaces the reading estimate for that line's
effective end; the effective end is still clamped to the next subtitle's start
and floored to `start + 1` ms. Absent means the end is derived from reading
speed.
_Avoid_: manual end, hard end, custom end

**Reading estimate**:
How long a line stays on screen so a viewer can read it: characters divided by
the reading speed, clamped between minimum and maximum seconds. The default end
in `reading` mode, and the fallback for unmeasured lines in `speech` mode.
_Avoid_: duration, hold time

**Reading speed settings**:
The three user-adjustable values that drive the reading estimate: characters
per second, minimum seconds, and maximum seconds.
_Avoid_: timing config, reading params

**Draft**:
The in-progress line opened when the video pauses — or manually via the Add
line button, which captures the current playhead and pauses if playing —
before it is committed.
A draft has a start time (the pause or capture moment) and no text until typed.
_Avoid_: pending subtitle, new line

**Commit**:
The act of promoting a draft into a Subtitle. Rejects empty text.
_Avoid_: save, add

**Nudge**:
Adjusting a subtitle's start time by a fixed ±0.1s step.
_Avoid_: shift, retime

**Jump**:
Moving the paused playhead without starting playback. `[` seeks to the previous
line's start (like vim `b`); `]` seeks to the current line's end (like vim `e`).
The per-row `⟪` / `⟫` buttons jump to that line's own start / end.
_Avoid_: seek, scrub-to-line

**Frame step**:
Moving the paused playhead by one frame (~33 ms, one 30 fps frame) with `←` /
`→`, without starting playback. Unlike a jump it does not move to a line
boundary.
_Avoid_: nudge-playhead, micro-seek

**Active line**:
The subtitle line whose time range contains the video's current time —
`startMs <= currentTime < endMs`. When the playhead sits in a gap between lines,
no line is active. The active line is highlighted in the list at all times and
shown over the video by the playback overlay while it plays.
_Avoid_: current line, selected line, highlighted line

**Line order**:
The chronological ordering of subtitles. Always derived from start times;
never stored.
_Avoid_: sequence, index

**Read aloud**:
The per-row `🔊` button reads a line's text aloud via browser text-to-speech —
text only, nothing else — so a line can be heard without touching the video. A
click cancels any prior utterance so rapid clicks don't queue.
_Avoid_: speak, listen, voice preview

**Project**:
A named bundle of one video's subtitles: a stable id, a display name (defaults
to the video's base name, renamable), the original video file name, a creation
time, and the subtitle list. Stored in the project collection.
_Avoid_: video, session, job

**Project list**:
The app's home route; create a project by picking a video, and open or delete
existing projects.
_Avoid_: dashboard, home

**Project editor**:
The per-project route; the editor, scoped to one project's video and subtitles.
_Avoid_: workspace, session

**Timeline**:
The horizontal track in the project editor showing each line's time range as a
block, scaled against the video's duration (or the last line's end when no video
is loaded). Clicking a block plays that line's range; a vertical playhead tracks
the current video time.
_Avoid_: scrubber, waveform, track

**Migration**:
The one-time move of pre-project data (the retired `subtitle-editor.subtitles.v1`
list and the legacy IndexedDB `video` handle) into a project on first load.
Idempotent; the legacy keys are cleared as the commit point.
_Avoid_: upgrade, import

**Blob video**:
The local video file played through an in-memory object URL. A reference to the
picked file (a File System Access API handle) is persisted in IndexedDB keyed
by the project id, so a reload can re-open that project's video; a one-click
reconnect may be needed to re-grant access after a reload. Drag-dropped files
and browsers without that API fall back to re-picking.
_Avoid_: upload, asset

**Export**:
Producing SRT or VTT files with the effective end times (derived or overridden)
baked in.
_Avoid_: download, render

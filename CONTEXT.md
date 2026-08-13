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
The moment a subtitle stops being displayed. Derived from the reading estimate
by default and clamped to the next subtitle's start; per-line overridable (see
end override). Always floored to `start + 1` ms so SRT/VTT stay valid. Never
stored — recomputed at render time.
_Avoid_: duration

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
when no end override is set.
_Avoid_: duration, hold time

**Reading speed settings**:
The three user-adjustable values that drive the reading estimate: characters
per second, minimum seconds, and maximum seconds.
_Avoid_: timing config, reading params

**Draft**:
The in-progress line opened when the video pauses, before it is committed.
A draft has a start time (the pause moment) and no text until typed.
_Avoid_: pending subtitle, new line

**Commit**:
The act of promoting a draft into a Subtitle. Rejects empty text.
_Avoid_: save, add

**Nudge**:
Adjusting a subtitle's start time by a fixed ±0.1s step.
_Avoid_: shift, retime

**Line order**:
The chronological ordering of subtitles. Always derived from start times;
never stored.
_Avoid_: sequence, index

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

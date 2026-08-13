# Subtitle Editor

A browser app for writing subtitles by hand: a local video plays, and each
subtitle is typed at the moment the video is paused. The end time is never set
by hand — it is inferred from how long the line is.

## Language

**Subtitle**:
A line of text with a start time and a derived end time. Text is trimmed and
`-->`-free, and may contain internal newlines for multi-line blocks.
_Avoid_: caption, cue

**Start time**:
The moment, in milliseconds, at which the video was paused when the line was
captured. A non-negative integer. Captured, never inferred.
_Avoid_: timestamp, timecode

**End time**:
The moment a subtitle stops being displayed. Always derived — clamped to the
next subtitle's start when the reading estimate would overlap it. Never entered
by the user and never stored.
_Avoid_: duration

**Reading estimate**:
How long a line stays on screen so a viewer can read it: characters divided by
the reading speed, clamped between minimum and maximum seconds.
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

**Blob video**:
The local video file played through an in-memory object URL. It exists only for
the current session and must be re-picked after a reload.
_Avoid_: upload, asset

**Export**:
Producing SRT or VTT files with the derived end times baked in.
_Avoid_: download, render

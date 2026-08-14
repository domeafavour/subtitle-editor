import { createFileRoute, Link } from "@tanstack/react-router";
import { useSelector } from "@xstate/react";
import { useCallback } from "react";

import { ProjectHeader } from "#/components/ProjectHeader";
import { SubtitleInput } from "#/components/SubtitleInput";
import { SubtitleRow } from "#/components/SubtitleRow";
import { Timeline } from "#/components/Timeline";
import { VideoStage } from "#/components/VideoStage";
import { EditorProvider, usePlayback } from "#/hooks/editorContext";
import { useActiveLine } from "#/hooks/useActiveLine";
import { useGlobalShortcuts } from "#/hooks/useGlobalShortcuts";
import { useLines } from "#/hooks/useProjectData";
import { lineAtPosition, previousLineStartMs } from "#/lib/timing";
import { projectsStore } from "#/store/projectsStore";

export const Route = createFileRoute("/project/$projectId")({
  component: ProjectRoute,
});

function ProjectRoute() {
  const { projectId } = Route.useParams();
  // key remount resets the playback machine's video/draft state when switching projects.
  return <ProjectEditor key={projectId} projectId={projectId} />;
}

interface ProjectEditorProps {
  projectId: string;
}

function ProjectEditor({ projectId }: ProjectEditorProps) {
  const isMigrating = useSelector(
    projectsStore,
    (snapshot) => snapshot.context.isMigrating,
  );
  const projects = useSelector(
    projectsStore,
    (snapshot) => snapshot.context.projects,
  );
  const project = projects.find((item) => item.id === projectId);

  if (isMigrating) {
    return <div className="p-6 text-neutral-400">Loading…</div>;
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <p className="text-neutral-100">Project not found.</p>
        <Link
          to="/"
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          ← Back to projects
        </Link>
      </div>
    );
  }

  return (
    <EditorProvider projectId={projectId}>
      <EditorShell />
    </EditorProvider>
  );
}

/**
 * The editor layout. Runs inside the `EditorProvider` so every child pulls the
 * playback machine and the global stores from context instead of props.
 */
function EditorShell() {
  const playback = usePlayback();
  const lines = useLines();
  // The line containing the video's current time (highlighted in the list).
  const activeLine = useActiveLine(lines, playback.videoRef);

  // `[` seeks to the previous line's start (vim `b`), `]` to the current
  // line's end (vim `e`). Both end paused (no auto-play).
  const jumpToStart = useCallback(() => {
    const video = playback.videoRef.current;
    if (!video) return;
    const target = previousLineStartMs(
      lines,
      Math.round(video.currentTime * 1000),
    );
    if (target != null) playback.seekTo(target);
  }, [lines, playback.seekTo, playback.videoRef]);

  const jumpToEnd = useCallback(() => {
    const video = playback.videoRef.current;
    if (!video) return;
    const line = lineAtPosition(lines, Math.round(video.currentTime * 1000));
    if (line) playback.seekTo(line.endMs);
  }, [lines, playback.seekTo, playback.videoRef]);

  useGlobalShortcuts({
    togglePlayPause: playback.togglePlayPause,
    jumpToStart,
    jumpToEnd,
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <ProjectHeader />

      <VideoStage />
      <Timeline />

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-300">Subtitles</h2>
        <button
          type="button"
          onClick={() => playback.openDraftAtCurrentTime()}
          disabled={playback.videoUrl == null}
          title={
            playback.videoUrl == null
              ? "Load the video first"
              : "New line at the current playhead"
          }
          className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add line
        </button>
      </div>
      {lines.length === 0 ? (
        <p className="py-6 text-center text-sm text-neutral-500">
          No subtitles yet — pause the video and type the first line, or use “+
          Add line”.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lines.map((line) => (
            <SubtitleRow
              key={line.id}
              line={line}
              active={line.id === (activeLine?.id ?? null)}
            />
          ))}
        </ul>
      )}
      {/* Floating draft composer — fixed to the viewport, never in flow. */}
      <SubtitleInput />
    </div>
  );
}

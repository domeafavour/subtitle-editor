import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@xstate/react";
import { useCallback, useMemo } from "react";

import { ProjectHeader } from "#/components/ProjectHeader";
import { SettingsPanel } from "#/components/SettingsPanel";
import { SubtitleInput } from "#/components/SubtitleInput";
import { SubtitleRow } from "#/components/SubtitleRow";
import { Timeline } from "#/components/Timeline";
import { Toolbar } from "#/components/Toolbar";
import { VideoStage } from "#/components/VideoStage";
import { useActiveLine } from "#/hooks/useActiveLine";
import { useGlobalShortcuts } from "#/hooks/useGlobalShortcuts";
import { usePlaybackMachine } from "#/hooks/usePlaybackMachine";
import {
  nudgeSubtitleStart,
  removeSubtitle,
  setSubtitleManualEnd,
  updateSubtitleText,
} from "#/lib/subtitles";
import {
  lineAtPosition,
  previousLineStartMs,
  sortedWithEnds,
} from "#/lib/timing";
import type { Settings } from "#/lib/types";
import { deleteHandle } from "#/lib/videoHandleStore";
import { projectsStore } from "#/store/projectsStore";
import { settingsStore } from "#/store/settingsStore";

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
  const settings = useSelector(
    settingsStore,
    (snapshot) => snapshot.context.settings,
  );
  const projects = useSelector(
    projectsStore,
    (snapshot) => snapshot.context.projects,
  );
  const isMigrating = useSelector(
    projectsStore,
    (snapshot) => snapshot.context.isMigrating,
  );
  const playback = usePlaybackMachine(projectId);
  const navigate = useNavigate();

  const project = projects.find((item) => item.id === projectId);
  const subtitles = project?.subtitles ?? [];

  const updateSettings = (patch: Partial<Settings>) => {
    settingsStore.trigger.update({ patch });
  };

  const updateText = (id: string, text: string) => {
    projectsStore.trigger.updateSubtitles({
      id: projectId,
      updater: (prev) => updateSubtitleText(prev, id, text),
    });
  };
  const setManualEnd = (id: string, endMs: number | null) => {
    projectsStore.trigger.updateSubtitles({
      id: projectId,
      updater: (prev) => setSubtitleManualEnd(prev, id, endMs),
    });
  };
  const nudgeStart = (id: string, deltaMs: number) => {
    projectsStore.trigger.updateSubtitles({
      id: projectId,
      updater: (prev) => nudgeSubtitleStart(prev, id, deltaMs),
    });
  };
  const removeLine = (id: string) => {
    projectsStore.trigger.updateSubtitles({
      id: projectId,
      updater: (prev) => removeSubtitle(prev, id),
    });
  };

  const lines = useMemo(
    () => sortedWithEnds(subtitles, settings),
    [subtitles, settings],
  );
  // Timeline scale: the real video duration when loaded, else the last line's end.
  const durationMs = useMemo(
    () =>
      playback.videoDuration != null
        ? playback.videoDuration
        : (lines[lines.length - 1]?.endMs ?? 0),
    [playback.videoDuration, lines],
  );
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

  const handleDelete = () => {
    if (!project) return;
    if (
      !window.confirm(
        `Delete project “${project.name}”? Its subtitles and stored video reference will be removed.`,
      )
    ) {
      return;
    }
    void deleteHandle(project.id);
    projectsStore.trigger.deleteProject({ id: project.id });
    navigate({ to: "/" });
  };

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
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <ProjectHeader
        project={project}
        onRename={(name) =>
          projectsStore.trigger.renameProject({ id: project.id, name })
        }
        onDelete={handleDelete}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          <VideoStage
            videoUrl={playback.videoUrl}
            videoRef={playback.videoRef}
            onFile={playback.loadVideo}
            onFileHandle={playback.loadVideoHandle}
            restoringVideo={playback.restoringVideo}
            videoReconnect={playback.videoReconnect}
            onReconnectVideo={playback.reconnectVideo}
            onCancelReconnect={playback.cancelReconnect}
            lines={lines}
            isPlaying={playback.isPlaying}
            onLoadedMetadata={playback.handleVideoMetadata}
            onVideoPlay={playback.handleVideoPlay}
            onVideoPause={playback.handleVideoPause}
          />
          <Timeline
            lines={lines}
            durationMs={durationMs}
            isPlaying={playback.isPlaying}
            videoRef={playback.videoRef}
            onPlayRange={playback.playRange}
          />
          {playback.draft && (
            <SubtitleInput
              draftStartMs={playback.draft.startMs}
              onCommit={playback.commitDraft}
              onCancel={playback.cancelDraft}
            />
          )}
          <Toolbar lines={lines} baseName={project.name} />
        </div>

        <div className="flex flex-col gap-3">
          <SettingsPanel settings={settings} onChange={updateSettings} />
          {lines.length === 0 ? (
            <p className="py-6 text-center text-sm text-neutral-500">
              No subtitles yet — pause the video and type the first line.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lines.map((line) => (
                <SubtitleRow
                  key={line.id}
                  line={line}
                  videoLoaded={playback.videoUrl != null}
                  active={line.id === (activeLine?.id ?? null)}
                  onPlayRange={playback.playRange}
                  onJumpTo={playback.seekTo}
                  onUpdateText={updateText}
                  onSetManualEnd={setManualEnd}
                  onNudge={nudgeStart}
                  onDelete={removeLine}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

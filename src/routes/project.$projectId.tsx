import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

import { ProjectHeader } from "#/components/ProjectHeader";
import { SettingsPanel } from "#/components/SettingsPanel";
import { SubtitleInput } from "#/components/SubtitleInput";
import { SubtitleList } from "#/components/SubtitleList";
import { Toolbar } from "#/components/Toolbar";
import { VideoStage } from "#/components/VideoStage";
import { useGlobalShortcuts } from "#/hooks/useGlobalShortcuts";
import { usePlayback } from "#/hooks/usePlayback";
import { useProjectSubtitles } from "#/hooks/useProjectSubtitles";
import { useProjects } from "#/hooks/useProjects";
import { useSettings } from "#/hooks/useSettings";
import { sortedWithEnds } from "#/lib/timing";

export const Route = createFileRoute("/project/$projectId")({
  component: ProjectRoute,
});

function ProjectRoute() {
  const { projectId } = Route.useParams();
  // key remount resets usePlayback's video/draft state when switching projects.
  return <ProjectEditor key={projectId} projectId={projectId} />;
}

interface ProjectEditorProps {
  projectId: string;
}

function ProjectEditor({ projectId }: ProjectEditorProps) {
  const { settings, update } = useSettings();
  const {
    projects,
    updateSubtitles,
    renameProject,
    deleteProject,
    isMigrating,
  } = useProjects();
  const subs = useProjectSubtitles({ projects, updateSubtitles, projectId });
  const playback = usePlayback({ add: subs.add, projectId });
  useGlobalShortcuts(playback);
  const navigate = useNavigate();

  const project = projects.find((item) => item.id === projectId);
  const lines = useMemo(
    () => sortedWithEnds(subs.subtitles, settings),
    [subs.subtitles, settings],
  );

  const handleDelete = () => {
    if (!project) return;
    if (
      !window.confirm(
        `Delete project “${project.name}”? Its subtitles and stored video reference will be removed.`,
      )
    ) {
      return;
    }
    deleteProject(project.id);
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
        onRename={(name) => renameProject(project.id, name)}
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
            onVideoPlay={playback.handleVideoPlay}
            onVideoPause={playback.handleVideoPause}
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
          <SettingsPanel settings={settings} onChange={update} />
          <SubtitleList
            lines={lines}
            videoLoaded={playback.videoUrl != null}
            onPlayRange={playback.playRange}
            onUpdateText={subs.updateText}
            onSetManualEnd={subs.setManualEnd}
            onNudge={subs.nudgeStart}
            onDelete={subs.remove}
          />
        </div>
      </div>
    </div>
  );
}

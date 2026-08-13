import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { SettingsPanel } from "#/components/SettingsPanel";
import { SubtitleInput } from "#/components/SubtitleInput";
import { SubtitleList } from "#/components/SubtitleList";
import { Toolbar } from "#/components/Toolbar";
import { VideoStage } from "#/components/VideoStage";
import { useGlobalShortcuts } from "#/hooks/useGlobalShortcuts";
import { usePlayback } from "#/hooks/usePlayback";
import { useSettings } from "#/hooks/useSettings";
import { useSubtitles } from "#/hooks/useSubtitles";
import { sortedWithEnds } from "#/lib/timing";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { settings, update } = useSettings();
  const { subtitles, add, updateText, nudgeStart, remove } = useSubtitles();
  const playback = usePlayback({ add });
  useGlobalShortcuts(playback);

  const lines = useMemo(
    () => sortedWithEnds(subtitles, settings),
    [subtitles, settings],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-100">Subtitle Editor</h1>
        <p className="text-sm text-neutral-400">
          Space to play/pause · Enter commits a line
        </p>
      </header>

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
            hasRestoredSubtitles={subtitles.length > 0}
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
          <Toolbar lines={lines} baseName={playback.videoName ?? "subtitles"} />
        </div>

        <div className="flex flex-col gap-3">
          <SettingsPanel settings={settings} onChange={update} />
          <SubtitleList
            lines={lines}
            videoLoaded={playback.videoUrl != null}
            onPlayRange={playback.playRange}
            onUpdateText={updateText}
            onNudge={nudgeStart}
            onDelete={remove}
          />
        </div>
      </div>
    </div>
  );
}

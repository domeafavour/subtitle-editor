import type { ReactNode } from "react";
import { createContext, useContext } from "react";

import { type PlaybackApi, usePlaybackMachine } from "./usePlaybackMachine";

interface EditorContextValue {
  projectId: string;
  playback: PlaybackApi;
}

const EditorContext = createContext<EditorContextValue | null>(null);

/**
 * Scopes one project editor: the route's per-project playback machine and the
 * project id, available to every component below without prop drilling.
 * Lives inside the keyed `ProjectEditor`, so switching projects remounts it
 * and resets the playback machine (video, draft, ranges).
 */
export function EditorProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const playback = usePlaybackMachine(projectId);
  return (
    <EditorContext.Provider value={{ projectId, playback }}>
      {children}
    </EditorContext.Provider>
  );
}

/** The editor context — throws when used outside an `EditorProvider`. */
export function useEditor(): EditorContextValue {
  const value = useContext(EditorContext);
  if (!value) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return value;
}

/** The project id of the current editor. */
export function useProjectId(): string {
  return useEditor().projectId;
}

/** The current project's playback machine API. */
export function usePlayback(): PlaybackApi {
  return useEditor().playback;
}

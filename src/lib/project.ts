import type { Project, Subtitle } from "./types";

/**
 * Strip one trailing extension: `"clip.mp4" → "clip"`, `"a.b.mp4" → "a.b"`,
 * `"noext" → "noext"`, `".hidden" → ".hidden"`.
 */
export function baseNameOf(filename: string): string {
  const slash = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"));
  const lastSegment = slash >= 0 ? filename.slice(slash + 1) : filename;
  const dot = lastSegment.lastIndexOf(".");
  return dot > 0 ? lastSegment.slice(0, dot) : lastSegment;
}

/** Pure project factory — `id` via crypto.randomUUID(), name derived unless given. */
export function createProjectRecord(input: {
  name?: string;
  videoName: string;
  createdAt?: number;
  subtitles?: Subtitle[];
}): Project {
  return {
    id: crypto.randomUUID(),
    name: input.name ?? baseNameOf(input.videoName),
    videoName: input.videoName,
    createdAt: input.createdAt ?? Date.now(),
    subtitles: input.subtitles ?? [],
  };
}

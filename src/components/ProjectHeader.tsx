import { Link, useNavigate } from "@tanstack/react-router";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { useProject } from "#/hooks/useProjectData";
import { deleteHandle } from "#/lib/videoHandleStore";
import { projectsStore } from "#/store/projectsStore";

/**
 * Editor header: back link, click-to-edit project name, video name, delete.
 * Reads the current project from the global store and fires store triggers
 * directly — no props.
 */
export function ProjectHeader() {
  const project = useProject();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project?.name ?? "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!project) return null;

  const commit = () => {
    setEditing(false);
    if (value.trim().length > 0) {
      projectsStore.trigger.renameProject({ id: project.id, name: value });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
    }
  };

  const handleDelete = () => {
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

  return (
    <header className="flex items-center gap-3">
      <Link
        to="/"
        className="shrink-0 text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Projects
      </Link>
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="rounded border border-blue-500 bg-neutral-800 px-2 py-1 text-xl font-bold text-neutral-100 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setValue(project.name);
            setEditing(true);
          }}
          title="Rename project"
          className="text-xl font-bold text-neutral-100 hover:underline"
        >
          {project.name}
        </button>
      )}
      {project.videoName && (
        <span className="min-w-0 truncate text-sm text-neutral-500">
          {project.videoName}
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        className="ml-auto shrink-0 rounded bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-red-950 hover:text-red-300"
      >
        Delete project
      </button>
    </header>
  );
}

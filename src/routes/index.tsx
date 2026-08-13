import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { DropZone } from "#/components/DropZone";
import { useProjects } from "#/hooks/useProjects";
import type { Project } from "#/lib/types";

export const Route = createFileRoute("/")({ component: ProjectList });

function ProjectList() {
  const { projects, createProject, deleteProject, isMigrating } = useProjects();
  const navigate = useNavigate();

  const openProject = (project: Project) => {
    navigate({ to: "/project/$projectId", params: { projectId: project.id } });
  };

  const handleFile = (file: File) => {
    void createProject({ videoName: file.name }).then(openProject);
  };

  const handleFileHandle = (handle: FileSystemFileHandle) => {
    void handle
      .getFile()
      .then((file) => createProject({ videoName: file.name, handle }))
      .then(openProject)
      .catch(() => {});
  };

  const handleDelete = (project: Project) => {
    if (
      !window.confirm(
        `Delete project “${project.name}”? Its subtitles and stored video reference will be removed.`,
      )
    ) {
      return;
    }
    deleteProject(project.id);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-100">Subtitle Editor</h1>
        <p className="text-sm text-neutral-400">
          Projects group a video with its subtitles.
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-300">
          New project
        </h2>
        <DropZone
          onFile={handleFile}
          onFileHandle={handleFileHandle}
          title="Create a project from a video"
          subtitle="Drop a video file here, or click to browse"
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-300">
          Projects
        </h2>
        {isMigrating ? (
          <p className="text-sm text-neutral-500">
            Checking for existing data…
          </p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No projects yet — pick a video above to create one.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex items-center gap-3 rounded border border-neutral-800 bg-neutral-900 px-3 py-2"
              >
                <Link
                  to="/project/$projectId"
                  params={{ projectId: project.id }}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block font-medium text-neutral-100">
                    {project.name}
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {project.videoName}
                    {project.subtitles.length > 0 &&
                      ` · ${project.subtitles.length} line${
                        project.subtitles.length === 1 ? "" : "s"
                      }`}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(project)}
                  className="shrink-0 rounded px-2 py-1 text-sm text-neutral-500 hover:bg-red-950 hover:text-red-300"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Ambient types for the File System Access API, which lib.dom does not yet
 * ship (TS 6.0.2 has `FileSystemFileHandle` but not the picker entry points).
 * Mirrors the spec; only the surface used by the app is declared.
 */
interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[]>;
}

interface FilePickerOptions {
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  id?: string;
  multiple?: boolean;
}

interface Window {
  showOpenFilePicker(
    options?: FilePickerOptions,
  ): Promise<FileSystemFileHandle[]>;
}

/** Drag-and-drop handle retrieval (Chromium-only, like the picker). */
interface DataTransferItem {
  getAsFileSystemHandle(): Promise<
    FileSystemFileHandle | FileSystemDirectoryHandle | null
  >;
}

interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>;
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>;
}

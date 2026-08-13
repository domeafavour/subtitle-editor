const DB_NAME = "subtitle-editor";
const STORE_NAME = "media";
/** The pre-project key; only migration reads/clears it. */
const LEGACY_HANDLE_KEY = "video";

/**
 * Persist a FileSystemFileHandle (File System Access API) in IndexedDB so a
 * reload can re-open a project's picked video without storing its bytes. Keys
 * are project ids; the legacy `"video"` key is moved into a project by the
 * one-time migration. Only a small reference is kept; the file stays where the
 * user picked it. When storage is unavailable or the handle is no longer
 * valid, these functions fall back silently and the editor re-prompts.
 */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function isFileHandle(value: unknown): value is FileSystemFileHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { getFile?: unknown }).getFile === "function"
  );
}

async function putHandle(
  key: string,
  handle: FileSystemFileHandle,
): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(handle, key);
      // Await the transaction's commit, not just the put request, so the write
      // is durable before we return.
      await transactionDone(tx);
    } finally {
      db.close();
    }
  } catch {
    // Storage unavailable — the handle simply won't survive a reload.
  }
}

async function getHandle(key: string): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDb();
    try {
      const value = await requestResult(
        db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key),
      );
      return isFileHandle(value) ? value : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function deleteKey(key: string): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      await transactionDone(tx);
    } finally {
      db.close();
    }
  } catch {
    // Storage unavailable — non-fatal.
  }
}

export async function storeHandle(
  projectId: string,
  handle: FileSystemFileHandle,
): Promise<void> {
  return putHandle(projectId, handle);
}

export async function readStoredHandle(
  projectId: string,
): Promise<FileSystemFileHandle | null> {
  return getHandle(projectId);
}

export async function deleteHandle(projectId: string): Promise<void> {
  return deleteKey(projectId);
}

/** Migration-only: read the pre-project handle under the `"video"` key. */
export async function readLegacyHandle(): Promise<FileSystemFileHandle | null> {
  return getHandle(LEGACY_HANDLE_KEY);
}

/** Migration-only: clear the pre-project `"video"` key. */
export async function deleteLegacyHandle(): Promise<void> {
  return deleteKey(LEGACY_HANDLE_KEY);
}

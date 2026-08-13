const DB_NAME = "subtitle-editor";
const STORE_NAME = "media";
const HANDLE_KEY = "video";

/**
 * Persist a FileSystemFileHandle (File System Access API) in IndexedDB so a
 * reload can re-open the picked video without storing its bytes. Only a small
 * reference is kept; the file stays where the user picked it. When storage is
 * unavailable or the handle is no longer valid, both functions fall back
 * silently and the next reload simply re-prompts for the file.
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

export async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
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

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function readStoredHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDb();
    try {
      const value = await requestResult(
        db
          .transaction(STORE_NAME, "readonly")
          .objectStore(STORE_NAME)
          .get(HANDLE_KEY),
      );
      return isFileHandle(value) ? value : null;
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

function isFileHandle(value: unknown): value is FileSystemFileHandle {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { getFile?: unknown }).getFile === "function"
  );
}

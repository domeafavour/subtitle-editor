/**
 * Trigger a client-side file download from a string.
 */
export function downloadBlob(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Deferred revoke — Safari needs the URL alive for a tick after click().
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

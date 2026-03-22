export const defaultMaxUploadFileBytes = 15 * 1024 * 1024;

export function formatUploadSizeLabel(sizeBytes: number): string {
  const sizeInMegabytes = sizeBytes / (1024 * 1024);

  if (Number.isInteger(sizeInMegabytes)) {
    return `${sizeInMegabytes} MB`;
  }

  return `${sizeInMegabytes.toFixed(1)} MB`;
}

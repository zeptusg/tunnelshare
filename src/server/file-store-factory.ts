import { config } from "@/lib/config";
import type { FileStore } from "@/server/file-store";
import { createLocalFileStore } from "@/server/file-store-local";
import { createSupabaseFileStore } from "@/server/file-store-supabase";

// Centralize provider selection here so routes depend on the FileStore contract,
// not on a specific vendor or local adapter.
export function createFileStore(): FileStore {
  switch (config.fileStorageDriver) {
    case "local":
      return createLocalFileStore();
    case "supabase":
      return createSupabaseFileStore();
    default: {
      const _exhaustiveCheck: never = config.fileStorageDriver;
      throw new Error(`Unsupported file storage driver: ${_exhaustiveCheck}`);
    }
  }
}

import { getJson, setJson } from "@/lib/redis";
import type { Transfer } from "@/lib/types";

const TRANSFER_KEY_PREFIX = "transfer:";
const TRANSFER_FILE_KEY_PREFIX = "transfer-file:";

export function getTransferKey(code: string): string {
  return `${TRANSFER_KEY_PREFIX}${code}`;
}

export function getTransferFileKey(assetId: string): string {
  return `${TRANSFER_FILE_KEY_PREFIX}${assetId}`;
}

export async function saveTransfer(
  transfer: Transfer,
  ttlSeconds: number
): Promise<void> {
  await setJson(getTransferKey(transfer.code), transfer, ttlSeconds);
}

export async function getStoredTransfer(code: string): Promise<Transfer | null> {
  return getJson<Transfer>(getTransferKey(code));
}

export async function saveTransferFileReference(
  assetId: string,
  transferCode: string,
  ttlSeconds: number
): Promise<void> {
  await setJson(getTransferFileKey(assetId), { transferCode }, ttlSeconds);
}

export async function getTransferCodeByAssetId(
  assetId: string
): Promise<string | null> {
  const record = await getJson<{ transferCode: string }>(getTransferFileKey(assetId));
  return record?.transferCode ?? null;
}

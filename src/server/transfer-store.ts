import { getJson, setJson } from "@/lib/redis";
import type { Transfer } from "@/lib/types";

const TRANSFER_KEY_PREFIX = "transfer:";

export function getTransferKey(code: string): string {
  return `${TRANSFER_KEY_PREFIX}${code}`;
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

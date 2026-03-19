import { z } from "zod";
import {
  PublicTransfer,
  Transfer,
  TransferPayload,
  publicTransferSchema,
  transferPayloadSchema,
  transferSchema,
} from "@/lib/types";

const transferTimingParamsSchema = z.object({
  code: z.string().min(1, "Code cannot be empty"),
  ttlSeconds: z.number().int().positive("ttlSeconds must be a positive integer"),
  receiveUrl: z.string().url(),
  now: z.date().optional(),
});

const createAwaitingTransferParamsSchema = transferTimingParamsSchema.extend({
  sendUrl: z.string().url(),
});
type CreateAwaitingTransferParams = z.input<
  typeof createAwaitingTransferParamsSchema
>;

const createReadyTransferParamsSchema = transferTimingParamsSchema.extend({
  payload: transferPayloadSchema,
});
type CreateReadyTransferParams = z.input<
  typeof createReadyTransferParamsSchema
>;

const fulfillTransferWithPayloadParamsSchema = z.object({
  transfer: transferSchema,
  payload: transferPayloadSchema,
});
type FulfillTransferWithPayloadParams = z.input<
  typeof fulfillTransferWithPayloadParamsSchema
>;

type ReadyTransferBase = Omit<Transfer, "status" | "payload">;

function getExpiresAtIso(
  ttlSeconds: number,
  now: Date = new Date()
): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString();
}

function createReadyTransferRecord(
  base: ReadyTransferBase,
  payload: TransferPayload
): Transfer {
  return transferSchema.parse({
    ...base,
    status: "ready",
    payload,
  });
}

export function createAwaitingTransfer(
  params: CreateAwaitingTransferParams
): Transfer {
  const { code, ttlSeconds, receiveUrl, sendUrl, now = new Date() } =
    createAwaitingTransferParamsSchema.parse(params);

  return transferSchema.parse({
    code,
    status: "awaiting_payload",
    initiatedBy: "receiver",
    receiveUrl,
    sendUrl,
    expiresAt: getExpiresAtIso(ttlSeconds, now),
  });
}

export function createReadyTransfer(
  params: CreateReadyTransferParams
): Transfer {
  const { code, ttlSeconds, receiveUrl, payload, now = new Date() } =
    createReadyTransferParamsSchema.parse(params);

  return createReadyTransferRecord({
    code,
    initiatedBy: "sender",
    receiveUrl,
    expiresAt: getExpiresAtIso(ttlSeconds, now),
  }, payload);
}

export function fulfillTransferWithPayload(
  params: FulfillTransferWithPayloadParams
): Transfer {
  const { transfer, payload } = fulfillTransferWithPayloadParamsSchema.parse(
    params
  );

  if (transfer.status !== "awaiting_payload") {
    throw new Error("Only awaiting payload transfers can be fulfilled");
  }

  return createReadyTransferRecord(
    {
      code: transfer.code,
      initiatedBy: transfer.initiatedBy,
      receiveUrl: transfer.receiveUrl,
      sendUrl: transfer.sendUrl,
      expiresAt: transfer.expiresAt,
    },
    payload
  );
}

export function isTransferExpired(
  transfer: Transfer,
  now: Date = new Date()
): boolean {
  const expiresAtMs = Date.parse(transfer.expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return true;
  }

  return now.getTime() >= expiresAtMs;
}

export function toPublicTransfer(transfer: Transfer): PublicTransfer {
  const { code, status, payload, expiresAt } = transfer;
  return publicTransferSchema.parse({
    code,
    status,
    payload,
    expiresAt,
  });
}

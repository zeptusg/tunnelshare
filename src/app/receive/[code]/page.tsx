"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

type FileReference = {
  id: string;
  name: string;
  sizeBytes: number;
  contentType: string;
  storageKey: string;
};

type TransferPayload =
  | {
      type: "text";
      content: string;
      metadata?: Record<string, unknown>;
    }
  | {
      type: "files";
      content: FileReference[];
      metadata?: Record<string, unknown>;
    };

type TransferResponse = {
  code: string;
  status: "awaiting_payload" | "ready" | "consumed" | "expired";
  payload?: TransferPayload;
  sendUrl?: string;
  expiresAt: string;
};

type PageState =
  | { status: "loading" }
  | { status: "waiting"; transfer: TransferResponse }
  | { status: "error"; message: string }
  | { status: "ready"; transfer: TransferResponse };

function isFileReference(value: unknown): value is FileReference {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<FileReference>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.sizeBytes === "number" &&
    typeof candidate.contentType === "string" &&
    typeof candidate.storageKey === "string"
  );
}

function isTransferPayload(value: unknown): value is TransferPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<TransferPayload>;
  if (candidate.type === "text") {
    return typeof candidate.content === "string";
  }

  if (candidate.type === "files") {
    return Array.isArray(candidate.content) && candidate.content.every(isFileReference);
  }

  return false;
}

function isTransferResponse(value: unknown): value is TransferResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<TransferResponse>;
  if (
    typeof candidate.code !== "string" ||
    typeof candidate.expiresAt !== "string" ||
    (candidate.sendUrl !== undefined && typeof candidate.sendUrl !== "string") ||
    !(
      candidate.status === "awaiting_payload" ||
      candidate.status === "ready" ||
      candidate.status === "consumed" ||
      candidate.status === "expired"
    )
  ) {
    return false;
  }

  return candidate.payload === undefined || isTransferPayload(candidate.payload);
}

export default function ReceiveCodePage() {
  const params = useParams<{ code?: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [copied, setCopied] = useState(false);
  const normalizedCode = useMemo(() => {
    const rawCode = params.code;
    if (typeof rawCode !== "string") {
      return "";
    }
    return decodeURIComponent(rawCode).trim().toUpperCase();
  }, [params.code]);
  const readyTextPayload =
    state.status === "ready" && state.transfer.payload?.type === "text"
      ? state.transfer.payload
      : null;
  const readyFilesPayload =
    state.status === "ready" && state.transfer.payload?.type === "files"
      ? state.transfer.payload
      : null;

  useEffect(() => {
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;

    async function loadTransfer(): Promise<void> {
      if (!normalizedCode) {
        setState({ status: "error", message: "Transfer not found or expired." });
        return;
      }

      try {
        const response = await fetch(`/api/transfers/${normalizedCode}`, {
          cache: "no-store",
        });

        if (response.status === 404) {
          if (!cancelled) {
            setState({
              status: "error",
              message: "This transfer was not found or has expired. Create a new one and try again.",
            });
          }
          return;
        }

        const data: unknown = await response.json();
        if (!isTransferResponse(data)) {
          if (!cancelled) {
            setState({ status: "error", message: "Invalid transfer response." });
          }
          return;
        }

        if (cancelled) {
          return;
        }

        if (data.status === "awaiting_payload") {
          setState({ status: "waiting", transfer: data });
          pollTimeout = setTimeout(() => {
            void loadTransfer();
          }, 1500);
          return;
        }

        if (data.status === "ready") {
          setState({ status: "ready", transfer: data });
          setCopied(false);
          return;
        }

        setState({
          status: "error",
          message: "This transfer is no longer available.",
        });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Failed to load transfer." });
        }
      }
    }

    void loadTransfer();

    return () => {
      cancelled = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [normalizedCode]);

  async function copyText(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900">Receive Transfer</h1>
        <p className="mt-2 text-sm text-zinc-500">Code: {normalizedCode || "—"}</p>

        <div className="mt-6">
          {state.status === "loading" ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-zinc-400" />
                <p className="text-sm font-medium text-zinc-700">Loading transfer…</p>
              </div>
            </div>
          ) : null}

          {state.status === "waiting" ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Waiting for sender</p>
              <p className="mt-1 text-sm text-amber-800">
                This page is polling automatically until the payload arrives.
              </p>
              {state.transfer.sendUrl ? (
                <>
                  <div className="mt-4 flex justify-center rounded-xl border border-amber-200 bg-white p-4">
                    <QRCodeSVG value={state.transfer.sendUrl} size={176} includeMargin />
                  </div>
                  <a
                    href={state.transfer.sendUrl}
                    className="mt-3 block break-all text-center text-sm font-medium text-blue-700 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {state.transfer.sendUrl}
                  </a>
                </>
              ) : null}
            </div>
          ) : null}

          {state.status === "error" ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Transfer unavailable</p>
              <p className="mt-1 text-sm text-red-700">{state.message}</p>
              <Link
                href="/receive"
                className="mt-3 inline-flex rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                Try another code
              </Link>
            </div>
          ) : null}

          {readyTextPayload ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
              <p className="whitespace-pre-wrap break-words text-base leading-7 text-zinc-900 sm:text-lg">
                {readyTextPayload.content}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => copyText(readyTextPayload.content)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                >
                  Copy text
                </button>
                {copied ? <span className="text-xs text-emerald-700">Copied</span> : null}
              </div>
            </div>
          ) : null}

          {readyFilesPayload ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
              <p className="text-sm font-semibold text-zinc-900">Files received</p>
              <ul className="mt-3 space-y-2">
                {readyFilesPayload.content.map((file) => (
                  <li key={file.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                    {file.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

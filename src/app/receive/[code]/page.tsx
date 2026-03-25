"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  publicTransferResponseSchema,
  type PublicTransferResponse,
} from "@/lib/transfer-client";

type PageState =
  | { status: "loading" }
  | { status: "waiting"; transfer: PublicTransferResponse }
  | { status: "error"; message: string }
  | { status: "ready"; transfer: PublicTransferResponse };

export default function ReceiveCodePage() {
  const params = useParams<{ code?: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [copied, setCopied] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadStartingByFileId, setDownloadStartingByFileId] = useState<
    Record<string, boolean>
  >({});
  const downloadResetTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {}
  );
  const normalizedCode = useMemo(() => {
    const rawCode = params.code;
    if (typeof rawCode !== "string") {
      return "";
    }
    return decodeURIComponent(rawCode).trim().toUpperCase();
  }, [params.code]);
  const readyTextPayload =
    state.status === "ready" && typeof state.transfer.payload?.text === "string"
      ? state.transfer.payload.text
      : null;
  const readyFilesPayload =
    state.status === "ready" && Array.isArray(state.transfer.payload?.files)
      ? state.transfer.payload.files
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
        const parsedResponse = publicTransferResponseSchema.safeParse(data);
        if (!parsedResponse.success) {
          if (!cancelled) {
            setState({ status: "error", message: "Invalid transfer response." });
          }
          return;
        }
        const transfer = parsedResponse.data;

        if (cancelled) {
          return;
        }

        if (transfer.status === "awaiting_payload") {
          setState({ status: "waiting", transfer });
          pollTimeout = setTimeout(() => {
            void loadTransfer();
          }, 1500);
          return;
        }

        if (transfer.status === "ready") {
          setState({ status: "ready", transfer });
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

  useEffect(() => {
    const downloadResetTimeouts = downloadResetTimeoutsRef.current;

    return () => {
      for (const timeoutId of Object.values(downloadResetTimeouts)) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  async function copyText(content: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function getFileHref(assetId: string): string {
    return `/api/files/${assetId}`;
  }

  function getFilePreviewHref(assetId: string): string {
    return `/api/files/${assetId}?disposition=inline`;
  }

  function markDownloadStarting(fileId: string): void {
    const existingTimeout = downloadResetTimeoutsRef.current[fileId];
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    setDownloadStartingByFileId((currentState) => ({
      ...currentState,
      [fileId]: true,
    }));

    downloadResetTimeoutsRef.current[fileId] = window.setTimeout(() => {
      setDownloadStartingByFileId((currentState) => ({
        ...currentState,
        [fileId]: false,
      }));
      delete downloadResetTimeoutsRef.current[fileId];
    }, 1500);
  }

  function triggerFileDownload(file: { id: string; name: string }): void {
    markDownloadStarting(file.id);

    const downloadLink = document.createElement("a");
    downloadLink.href = getFileHref(file.id);
    downloadLink.download = file.name;
    downloadLink.rel = "noopener";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  }

  async function downloadAllFiles(): Promise<void> {
    if (!readyFilesPayload || readyFilesPayload.length < 2 || downloadingAll) {
      return;
    }

    setDownloadingAll(true);

    try {
      for (const file of readyFilesPayload) {
        triggerFileDownload(file);

        await new Promise((resolve) => {
          window.setTimeout(resolve, 250);
        });
      }
    } finally {
      setDownloadingAll(false);
    }
  }

  function PreviewIcon() {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
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
                {readyTextPayload}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => copyText(readyTextPayload)}
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900">Files received</p>
                {readyFilesPayload.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      void downloadAllFiles();
                    }}
                    disabled={downloadingAll}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-70"
                  >
                    {downloadingAll ? "Downloading..." : "Download all"}
                  </button>
                ) : null}
              </div>
              <ul className="mt-3 space-y-2">
                {readyFilesPayload.map((file) => (
                  <li
                    key={file.id}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{file.contentType}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={getFilePreviewHref(file.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Preview ${file.name}`}
                          title={`Preview ${file.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700 transition hover:bg-zinc-100 active:scale-95 active:bg-zinc-200"
                        >
                          <PreviewIcon />
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            triggerFileDownload(file);
                          }}
                          className={`inline-flex h-9 min-w-24 items-center justify-center rounded-lg border px-3 text-sm font-medium transition active:scale-[0.98] ${
                            downloadStartingByFileId[file.id]
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
                          }`}
                        >
                          {downloadStartingByFileId[file.id] ? "Starting..." : "Download"}
                        </button>
                      </div>
                    </div>
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

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

type TransferActionResponse = {
  code: string;
  status: "awaiting_payload" | "ready";
  receiveUrl: string;
  expiresAt: string;
};

function isTransferActionResponse(value: unknown): value is TransferActionResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<TransferActionResponse>;
  return (
    typeof candidate.code === "string" &&
    (candidate.status === "awaiting_payload" || candidate.status === "ready") &&
    typeof candidate.receiveUrl === "string" &&
    typeof candidate.expiresAt === "string"
  );
}

function SendPageContent() {
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transfer, setTransfer] = useState<TransferActionResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const requestedCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const isFulfillingTransfer = requestedCode.length > 0;

  useEffect(() => {
    setTransfer(null);
    setCopied(false);
    setErrorMessage(null);
  }, [requestedCode]);

  async function submitTransfer(): Promise<void> {
    const normalizedText = text.trim();
    if (!normalizedText) {
      return;
    }

    try {
      setPending(true);
      setErrorMessage(null);
      const response = isFulfillingTransfer
        ? await fetch(`/api/transfers/${requestedCode}/payload`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              payload: {
                type: "text",
                content: normalizedText,
              },
            }),
          })
        : await fetch("/api/transfers", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              payload: {
                type: "text",
                content: normalizedText,
              },
            }),
          });

      const data: unknown = await response.json();
      console.log("Transfer action response:", data);

      if (!response.ok) {
        setErrorMessage("Could not send the transfer.");
        return;
      }

      if (isTransferActionResponse(data)) {
        setTransfer(data);
        setCopied(false);
        return;
      }

      setErrorMessage("Received an invalid transfer response.");
    } catch (error) {
      console.error("Transfer request failed:", error);
      setErrorMessage("Could not send the transfer.");
    } finally {
      setPending(false);
    }
  }

  async function copyCode(): Promise<void> {
    if (!transfer) {
      return;
    }

    try {
      await navigator.clipboard.writeText(transfer.code);
      setCopied(true);
    } catch (error) {
      console.error("Copy code failed:", error);
      setCopied(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900">
          {isFulfillingTransfer ? "Send to This Device" : "Send Transfer"}
        </h1>
        {isFulfillingTransfer ? (
          <p className="mt-2 text-sm text-zinc-500">Transfer code: {requestedCode}</p>
        ) : (
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Send text now. File transfer UI will plug into this same flow next.
          </p>
        )}

        <div className="mt-6 space-y-4">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="min-h-40 w-full rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            placeholder="Type or paste your text here..."
            aria-label="Text to send"
          />

          <div>
            <input
              type="file"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setSelectedFile(nextFile);
              }}
              className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
              aria-label="Select file"
            />
            {selectedFile ? <p className="mt-2 text-sm text-zinc-600">Selected file: {selectedFile.name}</p> : null}
          </div>

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition hover:bg-zinc-800"
            onClick={submitTransfer}
            disabled={!text.trim() || pending}
          >
            {pending ? "Sending..." : "Send"}
          </button>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Transfer failed</p>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            </div>
          ) : null}

          {transfer ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p
                aria-label="Created transfer code"
                className="text-center text-3xl font-bold tracking-wide text-zinc-900"
              >
                {transfer.code}
              </p>

              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={copyCode}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
                >
                  Copy code
                </button>
                {copied ? <span className="text-xs text-emerald-700">Copied</span> : null}
              </div>

              <div className="mt-4 flex justify-center rounded-xl border border-zinc-200 bg-white p-4">
                <QRCodeSVG value={transfer.receiveUrl} size={176} includeMargin />
              </div>
              <a
                href={transfer.receiveUrl}
                className="mt-2 block break-all text-center text-sm font-medium text-blue-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {transfer.receiveUrl}
              </a>
              <p className="mt-2 text-center text-xs text-zinc-500">Expires at: {transfer.expiresAt}</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function SendPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8" />}>
      <SendPageContent />
    </Suspense>
  );
}

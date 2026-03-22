"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  storedFileAssetSchema,
  uploadTargetSchema,
} from "@/lib/file-assets";
import {
  type TransferActionResponse,
  transferActionResponseSchema,
} from "@/lib/transfer-client";

function getFileIdentity(file: File): string {
  return [file.name, file.size, file.lastModified].join(":");
}

function SendPageContent() {
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

  function addSelectedFiles(nextFiles: File[]): void {
    setSelectedFiles((currentFiles) => {
      const mergedFiles = [...currentFiles];
      const seenFiles = new Set(currentFiles.map(getFileIdentity));

      for (const nextFile of nextFiles) {
        const fileIdentity = getFileIdentity(nextFile);
        if (seenFiles.has(fileIdentity)) {
          continue;
        }

        seenFiles.add(fileIdentity);
        mergedFiles.push(nextFile);
      }

      return mergedFiles;
    });
  }

  function removeSelectedFile(fileToRemove: File): void {
    const fileIdentityToRemove = getFileIdentity(fileToRemove);
    setSelectedFiles((currentFiles) =>
      currentFiles.filter(
        (currentFile) => getFileIdentity(currentFile) !== fileIdentityToRemove
      )
    );
  }

  async function uploadSelectedFiles(): Promise<string[]> {
    const uploadedAssetIds: string[] = [];

    for (const selectedFile of selectedFiles) {
      const createUploadResponse = await fetch("/api/uploads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          file: {
            name: selectedFile.name,
            sizeBytes: selectedFile.size,
            contentType: selectedFile.type || "application/octet-stream",
          },
        }),
      });

      const uploadTargetPayload: unknown = await createUploadResponse.json();
      if (!createUploadResponse.ok) {
        throw new Error("Failed to create upload target.");
      }

      const uploadTargetResult = uploadTargetSchema.safeParse(uploadTargetPayload);
      if (!uploadTargetResult.success) {
        throw new Error("Received an invalid upload target.");
      }

      const uploadResponse = await fetch(uploadTargetResult.data.uploadUrl, {
        method: uploadTargetResult.data.uploadMethod,
        headers: uploadTargetResult.data.headers,
        body: selectedFile,
      });

      const storedAssetPayload: unknown = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file bytes.");
      }

      const storedAssetResult = storedFileAssetSchema.safeParse(storedAssetPayload);
      if (!storedAssetResult.success) {
        throw new Error("Received an invalid stored file asset.");
      }

      uploadedAssetIds.push(storedAssetResult.data.id);
    }

    return uploadedAssetIds;
  }

  async function submitTransfer(): Promise<void> {
    const normalizedText = text.trim();
    if (!normalizedText && selectedFiles.length === 0) {
      return;
    }

    try {
      setPending(true);
      setErrorMessage(null);
      const uploadedAssetIds =
        selectedFiles.length > 0 ? await uploadSelectedFiles() : undefined;
      const response = isFulfillingTransfer
        ? await fetch(`/api/transfers/${requestedCode}/payload`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              payload: {
                text: normalizedText || undefined,
                uploadedAssetIds,
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
                text: normalizedText || undefined,
                uploadedAssetIds,
              },
            }),
          });

      const data: unknown = await response.json();
      console.log("Transfer action response:", data);

      if (!response.ok) {
        setErrorMessage("Could not send the transfer.");
        return;
      }

      const parsedResponse = transferActionResponseSchema.safeParse(data);
      if (parsedResponse.success) {
        setTransfer(parsedResponse.data);
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
              multiple
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files ?? []);
                addSelectedFiles(nextFiles);
                event.target.value = "";
              }}
              className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
              aria-label="Select file"
            />
            {selectedFiles.length > 0 ? (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((selectedFile) => (
                  <div
                    key={getFileIdentity(selectedFile)}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                  >
                    <p className="pr-3 text-sm text-zinc-700">
                      {selectedFile.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeSelectedFile(selectedFile)}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                      aria-label={`Remove ${selectedFile.name}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition hover:bg-zinc-800"
            onClick={submitTransfer}
            disabled={(!text.trim() && selectedFiles.length === 0) || pending}
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

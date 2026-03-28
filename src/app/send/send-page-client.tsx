"use client";

import { Suspense, useEffect, useEffectEvent, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import {
  selectedFileSchema,
  storedFileAssetSchema,
  uploadTargetSchema,
  validateSelectedFileForUpload,
} from "@/lib/file-assets";
import { formatUploadSizeLabel } from "@/lib/upload-policy";
import {
  type TransferActionResponse,
  transferActionResponseSchema,
} from "@/lib/transfer-client";

type DraftAttachmentStatus =
  | "queued"
  | "preparing"
  | "uploading"
  | "finalizing"
  | "ready"
  | "failed"
  | "canceled"
  | "removed";

type DraftAttachment = {
  localId: string;
  file: File;
  fileIdentity: string;
  status: DraftAttachmentStatus;
  progressPercent: number;
  storedAssetId?: string;
  errorMessage?: string;
};

type DraftAttachmentUploadControls = {
  createUploadController?: AbortController;
  finalizeUploadController?: AbortController;
  uploadRequest?: XMLHttpRequest;
};

function getFileIdentity(file: File): string {
  return [file.name, file.size, file.lastModified].join(":");
}

function createDraftAttachment(file: File): DraftAttachment {
  return {
    localId: crypto.randomUUID(),
    file,
    fileIdentity: getFileIdentity(file),
    status: "queued",
    progressPercent: 0,
  };
}

function getDraftAttachmentStatusLabel(attachment: DraftAttachment): string {
  switch (attachment.status) {
    case "queued":
      return "Queued";
    case "preparing":
      return "Preparing upload...";
    case "uploading":
      return `Uploading ${attachment.progressPercent}%`;
    case "finalizing":
      return "Finishing upload...";
    case "ready":
      return "Uploaded";
    case "failed":
      return attachment.errorMessage ?? "Upload failed";
    case "canceled":
      return "Canceled";
    case "removed":
      return "Removed";
  }
}

function isDraftAttachmentPending(attachment: DraftAttachment): boolean {
  return (
    attachment.status === "preparing" ||
    attachment.status === "uploading" ||
    attachment.status === "finalizing"
  );
}

function uploadFileBytesWithProgress(params: {
  url: string;
  method: string;
  headers: Record<string, string>;
  file: File;
  onProgress: (progressPercent: number) => void;
  onRequestReady?: (request: XMLHttpRequest) => void;
}): Promise<unknown> {
  const { url, method, headers, file, onProgress, onRequestReady } = params;

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    // Fetch does not expose upload progress events in the browser, so the
    // composer uses XHR only for the byte-transfer step.
    request.open(method, url);

    for (const [headerName, headerValue] of Object.entries(headers)) {
      request.setRequestHeader(headerName, headerValue);
    }

    onRequestReady?.(request);

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    request.onerror = () => {
      reject(new Error(`Could not upload ${file.name}. Please try again.`));
    };

    request.onabort = () => {
      reject(new Error("upload_aborted"));
    };

    request.onload = () => {
      let responseData: unknown = null;

      try {
        responseData = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        reject(new Error("Received an invalid stored file asset."));
        return;
      }

      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`Could not upload ${file.name}. Please try again.`));
        return;
      }

      resolve(responseData);
    };

    request.send(file);
  });
}

function normalizeAppRouteUrlForBrowser(rawUrl: string): string {
  const parsedUrl = new URL(rawUrl);

  if (typeof window === "undefined") {
    return parsedUrl.toString();
  }

  if (!parsedUrl.pathname.startsWith("/api/")) {
    return parsedUrl.toString();
  }

  return new URL(
    `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`,
    window.location.origin
  ).toString();
}

function getUploadErrorMessage(
  uploadResponse: unknown,
  fileName: string,
  fallbackMaxUploadFileBytes: number
): string {
  if (
    typeof uploadResponse === "object" &&
    uploadResponse !== null &&
    "error" in uploadResponse &&
    uploadResponse.error === "file_too_large"
  ) {
    const maxUploadFileBytes =
      "maxUploadFileBytes" in uploadResponse &&
      typeof uploadResponse.maxUploadFileBytes === "number"
        ? uploadResponse.maxUploadFileBytes
        : fallbackMaxUploadFileBytes;

    return `${fileName} is too large. Keep each file under ${formatUploadSizeLabel(maxUploadFileBytes)}.`;
  }

  return `Could not prepare ${fileName} for upload. Please try again.`;
}

function SendPageContent({
  maxUploadFileBytes,
  maxUploadFiles,
}: {
  maxUploadFileBytes: number;
  maxUploadFiles: number;
}) {
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<DraftAttachment[]>([]);
  const [transfer, setTransfer] = useState<TransferActionResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pickerOpenedAtRef = useRef<number | null>(null);
  const inFlightUploadIdsRef = useRef(new Set<string>());
  const uploadControlsByIdRef = useRef<Record<string, DraftAttachmentUploadControls>>({});
  const requestedCode = searchParams.get("code")?.trim().toUpperCase() ?? "";
  const isFulfillingTransfer = requestedCode.length > 0;
  const hasBlockingDraftAttachment = draftAttachments.some(
    (attachment) => attachment.status !== "ready"
  );

  useEffect(() => {
    setTransfer(null);
    setCopied(false);
    setErrorMessage(null);
  }, [requestedCode]);

  useEffect(() => {
    function handleWindowFocus(): void {
      if (pickerOpenedAtRef.current === null) {
        return;
      }

      window.setTimeout(() => {
        if (pickerOpenedAtRef.current === null) {
          return;
        }

        pickerOpenedAtRef.current = null;
        setPickerBusy(false);
      }, 0);
    }

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  function updateDraftAttachment(
    localId: string,
    nextState: Partial<DraftAttachment>
  ): void {
    setDraftAttachments((currentAttachments) =>
      currentAttachments.map((attachment) =>
        attachment.localId === localId
          ? {
              ...attachment,
              ...nextState,
            }
          : attachment
      )
    );
  }

  function addSelectedFiles(nextFiles: File[]): void {
    setDraftAttachments((currentAttachments) => {
      const mergedAttachments = [...currentAttachments];
      const seenFiles = new Set(
        currentAttachments.map((attachment) => attachment.fileIdentity)
      );
      let nextErrorMessage: string | null = null;

      for (const nextFile of nextFiles) {
        const fileIdentity = getFileIdentity(nextFile);
        if (seenFiles.has(fileIdentity)) {
          continue;
        }

        seenFiles.add(fileIdentity);
        const normalizedSelectedFile = {
          name: nextFile.name,
          sizeBytes: nextFile.size,
          contentType: nextFile.type || "application/octet-stream",
        };
        const selectedFileResult = selectedFileSchema.safeParse(normalizedSelectedFile);

        if (!selectedFileResult.success) {
          nextErrorMessage = `Could not use ${nextFile.name || "that file"}. Choose a valid file and try again.`;
          continue;
        }

        const fileValidation = validateSelectedFileForUpload(normalizedSelectedFile, {
          maxUploadFileBytes,
        });

        if (!fileValidation.ok) {
          nextErrorMessage = `${nextFile.name} is too large. Keep each file under ${formatUploadSizeLabel(maxUploadFileBytes)}.`;
          continue;
        }

        mergedAttachments.push(createDraftAttachment(nextFile));
      }

      if (mergedAttachments.length > maxUploadFiles) {
        setErrorMessage(`Add up to ${maxUploadFiles} files per transfer.`);
        return mergedAttachments.slice(0, maxUploadFiles);
      }

      setErrorMessage(nextErrorMessage);

      return mergedAttachments;
    });
  }

  function removeDraftAttachment(localId: string): void {
    const uploadControls = uploadControlsByIdRef.current[localId];
    uploadControls?.createUploadController?.abort();
    uploadControls?.uploadRequest?.abort();
    uploadControls?.finalizeUploadController?.abort();
    delete uploadControlsByIdRef.current[localId];
    inFlightUploadIdsRef.current.delete(localId);

    setDraftAttachments((currentAttachments) =>
      currentAttachments.filter((attachment) => attachment.localId !== localId)
    );
  }

  function retryDraftAttachment(localId: string): void {
    setDraftAttachments((currentAttachments) =>
      currentAttachments.map((attachment) =>
        attachment.localId === localId
          ? {
              ...attachment,
              status: "queued",
              progressPercent: 0,
              storedAssetId: undefined,
              errorMessage: undefined,
            }
          : attachment
      )
    );
  }

  const uploadDraftAttachment = useEffectEvent(
    async (attachment: DraftAttachment): Promise<void> => {
    if (inFlightUploadIdsRef.current.has(attachment.localId)) {
      return;
    }

    inFlightUploadIdsRef.current.add(attachment.localId);
    const selectedFile = attachment.file;

    try {
      updateDraftAttachment(attachment.localId, {
        progressPercent: 0,
        status: "preparing",
        errorMessage: undefined,
        storedAssetId: undefined,
      });

      const createUploadController = new AbortController();
      uploadControlsByIdRef.current[attachment.localId] = {
        createUploadController,
      };

      let createUploadResponse: Response;
      try {
        createUploadResponse = await fetch("/api/uploads", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          signal: createUploadController.signal,
          body: JSON.stringify({
            file: {
              name: selectedFile.name,
              sizeBytes: selectedFile.size,
              contentType: selectedFile.type || "application/octet-stream",
            },
          }),
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        updateDraftAttachment(attachment.localId, {
          status: "failed",
          errorMessage: `Could not prepare ${selectedFile.name} for upload. Please try again.`,
        });
        return;
      }

      const uploadTargetPayload: unknown = await createUploadResponse.json();
      if (!createUploadResponse.ok) {
        updateDraftAttachment(attachment.localId, {
          status: "failed",
          errorMessage: getUploadErrorMessage(
            uploadTargetPayload,
            selectedFile.name,
            maxUploadFileBytes
          ),
        });
        return;
      }

      uploadControlsByIdRef.current[attachment.localId] = {};

      const uploadTargetResult = uploadTargetSchema.safeParse(uploadTargetPayload);
      if (!uploadTargetResult.success) {
        updateDraftAttachment(attachment.localId, {
          status: "failed",
          errorMessage: "Received an invalid upload target.",
        });
        return;
      }

      updateDraftAttachment(attachment.localId, {
        progressPercent: 0,
        status: "uploading",
      });

      try {
        await uploadFileBytesWithProgress({
          url: normalizeAppRouteUrlForBrowser(uploadTargetResult.data.uploadUrl),
          method: uploadTargetResult.data.uploadMethod,
          headers: uploadTargetResult.data.headers,
          file: selectedFile,
          onProgress: (progressPercent) => {
            updateDraftAttachment(attachment.localId, {
              progressPercent,
              status: "uploading",
            });
          },
          onRequestReady: (request) => {
            uploadControlsByIdRef.current[attachment.localId] = {
              ...uploadControlsByIdRef.current[attachment.localId],
              uploadRequest: request,
            };
          },
        });
      } catch (error) {
        if (error instanceof Error && error.message === "upload_aborted") {
          return;
        }

        updateDraftAttachment(attachment.localId, {
          status: "failed",
          errorMessage:
            error instanceof Error
              ? error.message
              : `Could not upload ${selectedFile.name}. Please try again.`,
        });
        return;
      }

      // Uploading bytes and finalizing the stored asset are separate steps so
      // the same client flow works for local storage and signed cloud uploads.
      updateDraftAttachment(attachment.localId, {
        status: "finalizing",
      });
      const finalizeUploadController = new AbortController();
      uploadControlsByIdRef.current[attachment.localId] = {
        finalizeUploadController,
      };
      let finalizeUploadResponse: Response;
      try {
        finalizeUploadResponse = await fetch(
          normalizeAppRouteUrlForBrowser(uploadTargetResult.data.completeUrl),
          {
            method: "POST",
            signal: finalizeUploadController.signal,
          }
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        updateDraftAttachment(attachment.localId, {
          status: "failed",
          errorMessage: `Could not finalize ${selectedFile.name}. Please try again.`,
        });
        return;
      }

      const storedAssetPayload: unknown = await finalizeUploadResponse.json();
      if (!finalizeUploadResponse.ok) {
        updateDraftAttachment(attachment.localId, {
          status: "failed",
          errorMessage: `Could not finalize ${selectedFile.name}. Please try again.`,
        });
        return;
      }

      const storedAssetResult = storedFileAssetSchema.safeParse(storedAssetPayload);
      if (!storedAssetResult.success) {
        updateDraftAttachment(attachment.localId, {
          status: "failed",
          errorMessage: "Received an invalid stored file asset.",
        });
        return;
      }

      updateDraftAttachment(attachment.localId, {
        progressPercent: 100,
        status: "ready",
        storedAssetId: storedAssetResult.data.id,
      });
    } finally {
      inFlightUploadIdsRef.current.delete(attachment.localId);
      delete uploadControlsByIdRef.current[attachment.localId];
    }
  });

  useEffect(() => {
    const nextQueuedAttachment = draftAttachments.find(
      (attachment) =>
        attachment.status === "queued" &&
        !inFlightUploadIdsRef.current.has(attachment.localId)
    );

    if (!nextQueuedAttachment) {
      return;
    }

    if (draftAttachments.some(isDraftAttachmentPending)) {
      return;
    }

    void uploadDraftAttachment(nextQueuedAttachment);
  }, [draftAttachments]);

  async function submitTransfer(): Promise<void> {
    const normalizedText = text.trim();
    if (!normalizedText && draftAttachments.length === 0) {
      return;
    }

    try {
      setPending(true);
      setErrorMessage(null);
      const uploadedAssetIds = draftAttachments
        .map((attachment) => attachment.storedAssetId)
        .filter((assetId): assetId is string => typeof assetId === "string");
      const payload = {
        text: normalizedText || undefined,
        uploadedAssetIds: uploadedAssetIds.length > 0 ? uploadedAssetIds : undefined,
      };
      const response = isFulfillingTransfer
        ? await fetch(`/api/transfers/${requestedCode}/payload`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              payload,
            }),
          })
        : await fetch("/api/transfers", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              payload,
            }),
          });

      const data: unknown = await response.json();

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
      setErrorMessage(
        error instanceof Error ? error.message : "Could not send the transfer."
      );
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

  function openFilePicker(): void {
    const fileInput = fileInputRef.current;
    if (!fileInput) {
      return;
    }

    pickerOpenedAtRef.current = performance.now();
    setPickerBusy(true);
    fileInput.value = "";
    fileInput.click();
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
            Send text, files, or both in the same transfer.
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
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(event) => {
                const nextFiles = Array.from(event.target.files ?? []);
                pickerOpenedAtRef.current = null;
                setPickerBusy(false);
                addSelectedFiles(nextFiles);
                event.target.value = "";
              }}
              className="sr-only"
              aria-label="Select file"
            />
            <button
              type="button"
              onClick={openFilePicker}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
              disabled={pending || pickerBusy}
            >
              {pickerBusy ? "Opening file picker..." : "Choose files"}
            </button>
            <p className="mt-2 text-xs text-zinc-500">
              Add up to {maxUploadFiles} files, with{" "}
              {formatUploadSizeLabel(maxUploadFileBytes)} per file.
            </p>
            {pickerBusy ? (
              <p className="mt-2 text-xs text-zinc-500">
                Big files take time to get rejected.
              </p>
            ) : null}
            {draftAttachments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {draftAttachments.map((attachment) => (
                  <div
                    key={attachment.localId}
                    className={`rounded-lg border px-3 py-2 transition-colors ${
                      isDraftAttachmentPending(attachment)
                        ? "border-zinc-300 bg-white"
                        : attachment.status === "ready"
                          ? "border-emerald-200 bg-emerald-50/60"
                          : attachment.status === "failed"
                            ? "border-red-200 bg-red-50/60"
                            : "border-zinc-200 bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2 w-2 flex-none rounded-full ${
                              isDraftAttachmentPending(attachment)
                                ? "animate-pulse bg-zinc-500"
                                : attachment.status === "ready"
                                  ? "bg-emerald-500"
                                  : attachment.status === "failed"
                                    ? "bg-red-500"
                                    : "bg-zinc-300"
                            }`}
                          />
                          <p className="truncate pr-3 text-sm text-zinc-700">
                            {attachment.file.name}
                          </p>
                        </div>
                        <p
                          className={`mt-1 text-xs ${
                            attachment.status === "failed"
                              ? "text-red-600"
                              : attachment.status === "ready"
                                ? "text-emerald-700"
                                : "text-zinc-500"
                          }`}
                        >
                          {getDraftAttachmentStatusLabel(attachment)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {attachment.status === "failed" ? (
                          <button
                            type="button"
                            onClick={() => retryDraftAttachment(attachment.localId)}
                            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                            aria-label={`Retry ${attachment.file.name}`}
                            disabled={pending}
                          >
                            Retry
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => removeDraftAttachment(attachment.localId)}
                          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                          aria-label={`Remove ${attachment.file.name}`}
                          disabled={pending}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {attachment.status !== "removed" ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className={`h-full rounded-full transition-all ${
                            attachment.status === "failed"
                              ? "bg-red-500"
                              : attachment.status === "ready"
                                ? "bg-emerald-500"
                                : "bg-zinc-900"
                          }`}
                          style={{
                            width: `${
                              attachment.status === "failed" ||
                              attachment.status === "ready"
                                ? 100
                                : attachment.progressPercent
                            }%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition hover:bg-zinc-800"
            onClick={submitTransfer}
            disabled={
              (!text.trim() && draftAttachments.length === 0) ||
              pending ||
              hasBlockingDraftAttachment
            }
          >
            {pending
              ? "Sending..."
              : hasBlockingDraftAttachment
                ? "Preparing files..."
                : "Send"}
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
              <p className="mt-2 text-center text-xs text-zinc-500">
                Expires at: {transfer.expiresAt}
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function SendPageClient({
  maxUploadFileBytes,
  maxUploadFiles,
}: {
  maxUploadFileBytes: number;
  maxUploadFiles: number;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8" />
      }
    >
      <SendPageContent
        maxUploadFileBytes={maxUploadFileBytes}
        maxUploadFiles={maxUploadFiles}
      />
    </Suspense>
  );
}

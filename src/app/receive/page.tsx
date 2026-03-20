"use client";

import { Suspense, useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type CreateTransferResponse = {
  code: string;
};

function isCreateTransferResponse(value: unknown): value is CreateTransferResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<CreateTransferResponse>).code === "string"
  );
}

function ReceivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [codeInput, setCodeInput] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startRequestHandledRef = useRef(false);
  const shouldStartRequest = searchParams.get("start") === "1";

  useEffect(() => {
    const queryCode = searchParams.get("code");
    if (!queryCode) {
      return;
    }

    const normalizedCode = queryCode.trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }

    router.replace(`/receive/${normalizedCode}`);
  }, [router, searchParams]);

  function handleReceiveClick(): void {
    const normalizedCode = codeInput.trim().toUpperCase();
    if (!normalizedCode) {
      return;
    }

    router.push(`/receive/${normalizedCode}`);
  }

  async function startReceiveTransfer(
    navigationMode: "push" | "replace" = "push"
  ): Promise<void> {
    try {
      setPending(true);
      setErrorMessage(null);
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ intent: "receive" }),
      });

      const data: unknown = await response.json();
      if (!response.ok) {
        setErrorMessage("Failed to create receive request.");
        return;
      }

      if (isCreateTransferResponse(data)) {
        if (navigationMode === "replace") {
          router.replace(`/receive/${data.code}`);
        } else {
          router.push(`/receive/${data.code}`);
        }
        return;
      }

      setErrorMessage("Invalid transfer response.");
    } catch (error) {
      console.error("Create receive transfer request failed:", error);
      setErrorMessage("Create receive transfer request failed.");
    } finally {
      setPending(false);
    }
  }

  const startReceiveTransferFromEffect = useEffectEvent(() => {
    void startReceiveTransfer("replace");
  });

  useEffect(() => {
    if (!shouldStartRequest || startRequestHandledRef.current || pending) {
      return;
    }

    startRequestHandledRef.current = true;
    startReceiveTransferFromEffect();
  }, [pending, shouldStartRequest]);

  if (shouldStartRequest) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
        <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-zinc-900">Starting Receive Request</h1>
          <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-3 w-3 animate-pulse rounded-full bg-emerald-500" />
              <p className="text-sm font-medium text-zinc-700">
                Preparing this device to receive a transfer...
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Transfer failed</p>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900">Receive Transfer</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          Use an existing code if someone already shared one with you, or start a receive request to let another device send here.
        </p>

        <div className="mt-6 space-y-4">
          <input
            type="text"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="ABCD-EFGH"
            className="h-12 w-full rounded-xl border border-zinc-300 px-4 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            aria-label="Transfer code"
          />

          <button
            type="button"
            onClick={handleReceiveClick}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition hover:bg-zinc-800"
          >
            Use existing code
          </button>

          <button
            type="button"
            onClick={() => {
              void startReceiveTransfer();
            }}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-base font-semibold text-emerald-900 transition hover:bg-emerald-100"
            disabled={pending}
          >
            {pending ? "Creating..." : "Start receive request"}
          </button>

          {errorMessage ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Transfer failed</p>
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            </div>
          ) : null}

        </div>
      </section>
    </main>
  );
}

export default function ReceivePage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8" />}>
      <ReceivePageContent />
    </Suspense>
  );
}

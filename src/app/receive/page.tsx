"use client";

import { Suspense, useEffect, useState } from "react";
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

  async function startReceiveTransfer(): Promise<void> {
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
        router.push(`/receive/${data.code}`);
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900">Receive Transfer</h1>

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
            Open Transfer
          </button>

          <button
            type="button"
            onClick={startReceiveTransfer}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white text-base font-semibold text-zinc-900 transition hover:bg-zinc-50"
            disabled={pending}
          >
            {pending ? "Creating..." : "Create Receive Request"}
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

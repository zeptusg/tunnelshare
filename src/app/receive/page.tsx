"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ReceivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [codeInput, setCodeInput] = useState("");

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900">Receive Text</h1>

        <div className="mt-6 space-y-4">
          <input
            type="text"
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value)}
            placeholder="ABCD-EFGH"
            className="h-12 w-full rounded-xl border border-zinc-300 px-4 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            aria-label="Session code"
          />

          <button
            type="button"
            onClick={handleReceiveClick}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition hover:bg-zinc-800"
          >
            Receive Text
          </button>
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

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTransferResponseSchema } from "@/lib/transfer-client";

export function HomeStartReceiveButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function startReceiveTransfer(): Promise<void> {
    try {
      setPending(true);
      const response = await fetch("/api/transfers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ intent: "receive" }),
      });

      const data: unknown = await response.json();
      const parsedResponse = createTransferResponseSchema.safeParse(data);
      if (!response.ok || !parsedResponse.success) {
        setPending(false);
        return;
      }

      router.push(`/receive/${parsedResponse.data.code}`);
    } catch {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void startReceiveTransfer();
      }}
      disabled={pending}
      className="group rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-6 text-left text-emerald-950 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-80"
    >
      <span className="block text-2xl font-extrabold tracking-[0.03em] leading-none">
        {pending ? "STARTING..." : "RECEIVE"}
      </span>
      <span className="mt-2 block text-sm font-medium leading-5 text-emerald-700 transition group-hover:text-emerald-800">
        {pending ? "preparing this device" : "on this device"}
      </span>
    </button>
  );
}

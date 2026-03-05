"use client";

import { useState } from "react";

type CreateSessionResponse = {
  code: string;
  receiveUrl: string;
  expiresAt: string;
};

function isCreateSessionResponse(value: unknown): value is CreateSessionResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<CreateSessionResponse>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.receiveUrl === "string" &&
    typeof candidate.expiresAt === "string"
  );
}

export default function SendPage() {
  const [session, setSession] = useState<CreateSessionResponse | null>(null);

  async function createSession(): Promise<void> {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
      });
      const data: unknown = await response.json();
      console.log("Create session response:", data);

      if (isCreateSessionResponse(data)) {
        setSession(data);
      }
    } catch (error) {
      console.error("Create session request failed:", error);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900">Send Text</h1>

        <div className="mt-6 space-y-4">
          <textarea
            className="min-h-40 w-full rounded-xl border border-zinc-300 px-4 py-3 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
            placeholder="Type or paste your text here..."
            aria-label="Text to send"
          />

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-xl bg-zinc-900 text-base font-semibold text-white transition hover:bg-zinc-800"
            onClick={createSession}
          >
            Create Session
          </button>

          {session ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-center text-3xl font-bold tracking-wide text-zinc-900">{session.code}</p>
              <a
                href={session.receiveUrl}
                className="mt-3 block break-all text-center text-sm font-medium text-blue-700 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {session.receiveUrl}
              </a>
              <p className="mt-2 text-center text-xs text-zinc-500">Expires at: {session.expiresAt}</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

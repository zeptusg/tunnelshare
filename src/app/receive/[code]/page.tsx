"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type SessionPayload = {
  type: "text" | "file";
  content: string;
  metadata?: Record<string, unknown>;
};

type SessionResponse = {
  code: string;
  payload: SessionPayload;
  expiresAt: string;
};

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; session: SessionResponse };

function isSessionResponse(value: unknown): value is SessionResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<SessionResponse>;
  if (typeof candidate.code !== "string" || typeof candidate.expiresAt !== "string") {
    return false;
  }

  if (typeof candidate.payload !== "object" || candidate.payload === null) {
    return false;
  }

  const payload = candidate.payload as Partial<SessionPayload>;
  return (
    (payload.type === "text" || payload.type === "file") &&
    typeof payload.content === "string"
  );
}

export default function ReceiveCodePage() {
  const params = useParams<{ code?: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const normalizedCode = useMemo(() => {
    const rawCode = params.code;
    if (typeof rawCode !== "string") {
      return "";
    }
    return decodeURIComponent(rawCode).trim().toUpperCase();
  }, [params.code]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession(): Promise<void> {
      if (!normalizedCode) {
        setState({ status: "error", message: "Session not found or expired." });
        return;
      }

      setState({ status: "loading" });

      try {
        const response = await fetch(`/api/sessions/${normalizedCode}`);

        if (response.status === 404) {
          if (!cancelled) {
            setState({ status: "error", message: "Session not found or expired." });
          }
          return;
        }

        const data: unknown = await response.json();
        if (!isSessionResponse(data)) {
          if (!cancelled) {
            setState({ status: "error", message: "Invalid session response." });
          }
          return;
        }

        if (!cancelled) {
          setState({ status: "ready", session: data });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Failed to load session." });
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [normalizedCode]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-8">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-zinc-900">Receive Text</h1>

        <div className="mt-6">
          {state.status === "loading" ? <p className="text-zinc-600">Loading session...</p> : null}

          {state.status === "error" ? <p className="text-red-700">{state.message}</p> : null}

          {state.status === "ready" && state.session.payload.type === "text" ? (
            <p className="whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900">
              {state.session.payload.content}
            </p>
          ) : null}

          {state.status === "ready" && state.session.payload.type !== "text" ? (
            <p className="text-zinc-700">Unsupported payload type.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-3xl font-bold text-zinc-900">TunnelShare</h1>

        <div className="mt-8 grid gap-4">
          <Link
            href="/send"
            className="flex h-14 items-center justify-center rounded-xl bg-zinc-900 text-lg font-semibold text-white transition hover:bg-zinc-800"
          >
            Send
          </Link>

          <Link
            href="/receive"
            className="flex h-14 items-center justify-center rounded-xl border border-zinc-300 bg-white text-lg font-semibold text-zinc-900 transition hover:bg-zinc-50"
          >
            Receive
          </Link>
        </div>
      </section>
    </main>
  );
}

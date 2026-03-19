import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <section className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-center text-3xl font-bold text-zinc-900">TunnelShare</h1>
        <p className="mt-3 text-center text-sm leading-6 text-zinc-600">
          Start a transfer in the direction you want, or enter a code you already have.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/send"
            className="group rounded-2xl bg-zinc-900 px-6 py-6 text-white transition hover:bg-zinc-800"
          >
            <span className="block text-2xl font-extrabold tracking-[0.08em] leading-none">SEND</span>
            <span className="mt-2 block text-sm font-medium leading-5 text-zinc-300 transition group-hover:text-zinc-200">
              to another device
            </span>
          </Link>

          <Link
            href="/receive?start=1"
            className="group rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-6 text-emerald-950 transition hover:bg-emerald-100"
          >
            <span className="block text-2xl font-extrabold tracking-[0.03em] leading-none">RECEIVE</span>
            <span className="mt-2 block text-sm font-medium leading-5 text-emerald-700 transition group-hover:text-emerald-800">
              on this device
            </span>
          </Link>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Manual entry
          </p>
          <p className="mt-2 text-base font-semibold text-zinc-900">Enter existing code</p>

          <form action="/receive" method="get" className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-700">Transfer code</span>
              <input
                type="text"
                name="code"
                placeholder="ABCD-EFGH"
                className="h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
                aria-label="Existing transfer code"
              />
            </label>
            <button
              type="submit"
              className="flex h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white text-base font-semibold text-zinc-900 transition hover:bg-zinc-100"
            >
              Receive
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

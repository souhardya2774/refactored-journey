import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-4xl rounded-lg bg-white p-12 shadow-lg dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <Image src="/next.svg" alt="logo" width={80} height={20} className="dark:invert" />
          <h1 className="text-2xl font-semibold">Mini Lead Distribution System</h1>
        </div>

        <p className="mt-4 text-slate-600 dark:text-slate-300">
          Lightweight demo for assigning leads to providers with monthly quotas, fair rotation, and webhook-driven
          resets. The app uses MongoDB transactions and atomic updates to maintain consistency under concurrent
          requests.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/dashboard" className="rounded-md bg-sky-600 px-4 py-2 text-white hover:bg-sky-700">
            View Dashboard
          </Link>
          <Link href="/test-tools" className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700">
            Open Test Tools
          </Link>
          <a
            href="https://github.com/souhardya2774/refactored-journey/blob/main/README.md"
            className="rounded-md border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-slate-200"
          >
            Project Docs
          </a>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-medium">Allocation</h3>
            <p className="text-xs text-slate-500 mt-2">Mandatory first, then fair optional assignment.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-medium">Idempotency</h3>
            <p className="text-xs text-slate-500 mt-2">Webhook events are deduplicated using a unique key.</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-medium">Requirements</h3>
            <p className="text-xs text-slate-500 mt-2">MongoDB replica-set or Atlas for transactions.</p>
          </div>
        </section>
      </main>
    </div>
  )
}

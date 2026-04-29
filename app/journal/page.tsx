'use client';

import Link from 'next/link';

export default function JournalPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <main className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Journal</p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900 dark:text-white">Reflection space</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Use this page for Tadabbur notes, mood tags, and short reflections on what you memorized today.
          </p>
          <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Coming soon: journal cards, reflection prompts, and progress memory notes.
            </p>
          </div>
          <div className="mt-8">
            <Link href="/dashboard" className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

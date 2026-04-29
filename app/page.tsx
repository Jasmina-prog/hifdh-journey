'use client';

import { LoginButton } from '@/components/LoginButton';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <main className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10">
        <section className="grid gap-10 lg:grid-cols-[1.4fr_0.9fr] lg:items-start">
          <div className="space-y-8">
            <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div
                style={{ fontFamily: 'var(--font-display), serif' }}
                className="text-center text-4xl font-semibold text-slate-950 dark:text-white md:text-5xl"
              >
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </div>
              <h1 className="mt-8 text-5xl font-semibold leading-tight tracking-tight text-slate-900 dark:text-white md:text-6xl">
                Memorize. Reflect. Grow.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                A personal dashboard for your Quran memory journey — built to help you stay consistent with Sabaq,
                Tafakkur, Tafsir, and a calm Friday reset.
              </p>
              <div className="mt-8">
                <LoginButton />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  title: 'Sabaq',
                  description: 'New memorization with a clear daily target.',
                },
                {
                  title: 'Tafakkur',
                  description: 'Reflect on your new verses and internalize the meaning.',
                },
                {
                  title: 'Tafsir',
                  description: 'Review the translation and context of today’s Ayah.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Your Journey</p>
              <h2 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">Start your first day</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Sign in to begin logging your progress. The dashboard will help you keep the habit strong with a simple daily checklist.
              </p>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Why this app matters</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <li>• Keep your goal visible every day.</li>
                <li>• Balance new memorization with reflection.</li>
                <li>• Pause new learning on Friday for review.</li>
              </ul>
            </div>
          </aside>
        </section>

        <section className="mt-14 rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">What you get</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 p-6 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Daily Trio</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Sabaq, Tafakkur and Tafsir support a complete Qur’an learning cycle, not just memorization.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-6 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Friday Reset</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Take one day to review weaker Surahs and strengthen your foundation before continuing.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 p-6 dark:border-slate-800">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Progress view</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Visualize your monthly streak, weekly goal, and the Surahs you need to review most.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

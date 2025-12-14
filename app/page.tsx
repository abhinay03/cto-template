import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            VocabFlow
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-gray-700 md:flex">
            <a href="#features" className="hover:text-gray-900">
              Features
            </a>
            <a href="#pricing" className="hover:text-gray-900">
              Pricing
            </a>
            <a href="#faq" className="hover:text-gray-900">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                Personalized vocabulary learning that adapts daily.
              </h1>
              <p className="mt-4 text-lg text-gray-700">
                Assess your level, build a personal word universe, and retain vocabulary with spaced repetition and
                intelligent revision.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Start free
                </Link>
                <Link
                  href="/dashboard"
                  className="rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                >
                  Go to app
                </Link>
              </div>
              <p className="mt-3 text-sm text-gray-600">
                Built for learners of any age—driven by language maturity, not birthdays.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-white p-8">
              <div className="space-y-6">
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold text-blue-700">Daily session</div>
                  <div className="mt-1 text-sm text-gray-700">30% new · 40% weak · 20% review · 10% challenge</div>
                  <div className="mt-3 h-2 w-full rounded bg-gray-100">
                    <div className="h-2 w-2/3 rounded bg-blue-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold text-gray-700">Adaptive level</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">CEFR</div>
                    <div className="text-sm text-gray-600">A1 → C2</div>
                  </div>
                  <div className="rounded-lg bg-white p-5 shadow-sm">
                    <div className="text-xs font-semibold text-gray-700">Retention</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">SRS</div>
                    <div className="text-sm text-gray-600">Science-based reviews</div>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-5 shadow-sm">
                  <div className="text-xs font-semibold text-gray-700">Expansion</div>
                  <div className="mt-1 text-sm text-gray-700">
                    Master a word → learn synonyms, roots, and contextual variants.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-14 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold">Adaptive assessment</h3>
              <p className="mt-2 text-sm text-gray-700">
                CAT-style onboarding quickly estimates level, confidence, and weak areas.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold">Spaced repetition engine</h3>
              <p className="mt-2 text-sm text-gray-700">
                Modified SM-2 scheduling that reacts to errors and hesitation.
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold">Real-time progress</h3>
              <p className="mt-2 text-sm text-gray-700">
                Live dashboard updates for streaks, accuracy, and upcoming reviews.
              </p>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold tracking-tight">Pricing</h2>
          <p className="mt-2 text-gray-700">Start free. Upgrade when you want deeper analytics and domain packs.</p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold">Free</h3>
              <p className="mt-1 text-sm text-gray-700">Daily sessions + core SRS</p>
              <div className="mt-6 text-3xl font-bold">$0</div>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li>• Onboarding assessment</li>
                <li>• 15-minute daily sessions</li>
                <li>• Spaced repetition</li>
              </ul>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
              <h3 className="text-lg font-semibold">Pro</h3>
              <p className="mt-1 text-sm text-gray-700">Analytics + advanced practice</p>
              <div className="mt-6 text-3xl font-bold">$8</div>
              <p className="text-sm text-gray-600">/month</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li>• Error pattern insights</li>
                <li>• Challenge activities</li>
                <li>• Smart expansion suggestions</li>
              </ul>
            </div>
            <div className="rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold">Team</h3>
              <p className="mt-1 text-sm text-gray-700">For schools and companies</p>
              <div className="mt-6 text-3xl font-bold">Custom</div>
              <ul className="mt-4 space-y-2 text-sm text-gray-700">
                <li>• Admin dashboard</li>
                <li>• Domain packs</li>
                <li>• Reporting & exports</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-gray-200 bg-gray-50">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <h2 className="text-2xl font-bold tracking-tight">FAQ</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="font-semibold">Is this for kids or adults?</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Both. We adapt by language maturity and show age-appropriate examples.
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <h3 className="font-semibold">How is retention improved?</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Words move through states (new → learning → known → mastered). Failures reset or shorten intervals.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} VocabFlow</div>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-gray-900">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-gray-900">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

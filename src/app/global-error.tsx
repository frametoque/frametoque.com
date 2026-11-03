"use client";

import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-tight">Something went wrong</h2>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            An unexpected error occurred. Our engineering team has been notified.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors text-sm"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 transition-colors text-sm"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}

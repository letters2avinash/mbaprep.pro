"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-zinc-600">
        We have logged the problem. Please try again. If it keeps happening,
        come back in a few minutes.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Try again
        </button>
        <Link href="/" className="rounded border px-4 py-2">
          Go to home
        </Link>
      </div>
    </main>
  );
}

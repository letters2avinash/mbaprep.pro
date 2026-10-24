import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-zinc-600">
        The page you are looking for does not exist or has moved.
      </p>
      <Link href="/" className="rounded border px-4 py-2">
        Go to home
      </Link>
    </main>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/app/auth/auth-form";
import { signIn } from "@/app/auth/actions";

export default function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <Suspense fallback={null}>
        <SignInForm searchParams={searchParams} />
      </Suspense>
      <p className="text-sm text-zinc-600">
        New here?{" "}
        <Link href="/sign-up" className="underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}

async function SignInForm({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm action={signIn} submitLabel="Sign in" pendingLabel="Signing in..." next={next} />;
}

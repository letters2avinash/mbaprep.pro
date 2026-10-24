import Link from "next/link";
import { AuthForm } from "@/app/auth/auth-form";
import { signUp } from "@/app/auth/actions";

export default function SignUpPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <AuthForm
        action={signUp}
        submitLabel="Create account"
        pendingLabel="Creating account..."
        showName
      />
      <p className="text-sm text-zinc-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}

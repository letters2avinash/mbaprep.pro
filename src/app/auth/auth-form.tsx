"use client";

import { useActionState } from "react";
import type { AuthState } from "./actions";

type Props = {
  action: (previous: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  pendingLabel: string;
  next?: string;
  showName?: boolean;
};

export function AuthForm({ action, submitLabel, pendingLabel, next, showName = false }: Props) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {showName && (
        <label className="flex flex-col gap-1">
          <span className="font-medium">Full name</span>
          <input name="full_name" autoComplete="name" className="rounded border px-3 py-2" />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span className="font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete={showName ? "new-password" : "current-password"}
          className="rounded border px-3 py-2"
        />
      </label>

      {state?.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={
            state.ok
              ? "rounded border border-green-300 bg-green-50 p-3 text-green-800"
              : "rounded border border-red-300 bg-red-50 p-3 text-red-800"
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}

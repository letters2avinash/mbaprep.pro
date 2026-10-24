"use server";

import * as Sentry from "@sentry/nextjs";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type AuthState = { message: string; ok?: boolean } | null;

const MIN_PASSWORD_LENGTH = 8;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const next = safeNextPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { message: "Enter your email and password." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Same message for unknown email and wrong password, so the form
      // does not reveal which accounts exist.
      if (error.code === "email_not_confirmed") {
        return { message: "Confirm your email first. Check your inbox for the link." };
      }
      return { message: "Email or password is incorrect." };
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "auth" } });
    return { message: "Sign-in failed. Please try again." };
  }

  redirect(next);
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!email || !password) {
    return { message: "Enter your email and password." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { message: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || null } },
    });
    if (error) {
      if (error.code === "user_already_exists" || error.code === "email_exists") {
        return { message: "An account with this email already exists. Sign in instead." };
      }
      if (error.code === "weak_password") {
        return { message: "That password is too weak. Choose a less common one." };
      }
      Sentry.captureException(error, { tags: { area: "auth" } });
      return { message: "Sign-up failed. Please try again." };
    }
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "auth" } });
    return { message: "Sign-up failed. Please try again." };
  }

  return { message: "Account created. Check your email for a confirmation link, then sign in.", ok: true };
}

export async function signOut() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "auth" } });
  }
  redirect("/sign-in");
}

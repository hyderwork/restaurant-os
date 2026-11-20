import { randomBytes } from "node:crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Invitation links must always use the canonical production origin. Never derive this from
// request headers or localhost, because these emails are opened on the recipient's device.
const APP_URL = "https://restaurant-os-custom.vercel.app";
const SET_PASSWORD_REDIRECT = `${APP_URL}/auth/callback?next=%2Fauth%2Fset-password`;

type ProvisionInput = { email: string; fullName?: string | null };

export async function ensureAccountForInvitation({ email, fullName }: ProvisionInput) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Account invitation service is not configured.");
  const authClient = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const sendPasswordSetup = async () => {
    const { error: resetError } = await authClient.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: SET_PASSWORD_REDIRECT },
    );
    if (resetError) {
      throw new Error(`The account exists, but its password setup email could not be sent: ${resetError.message}`);
    }
    return true;
  };

  const { data, error } = await authClient.auth.signUp({
    email: email.trim().toLowerCase(),
    password: randomBytes(32).toString("base64url"),
    options: {
      data: fullName?.trim() ? { full_name: fullName.trim() } : {},
      emailRedirectTo: SET_PASSWORD_REDIRECT,
    },
  });

  if (error) {
    if (/already registered|already exists|user already/i.test(error.message)) {
      return { created: false, emailSent: await sendPasswordSetup() };
    }
    throw new Error(`Could not create the account invitation: ${error.message}`);
  }

  if (!data.user) throw new Error("Supabase did not return the invited account. Please try again.");

  const isExistingAccount = (data.user.identities?.length ?? 1) === 0;
  if (isExistingAccount) return { created: false, emailSent: await sendPasswordSetup() };

  return { created: true, emailSent: true };
}

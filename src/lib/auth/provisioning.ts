"import { randomBytes } from \"node:crypto\";
import { createClient as createSupabaseClient } from \"@supabase/supabase-js\";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || \"https://restaurant-os-custom.vercel.app\").replace(/\\/$/, \"\");
const SET_PASSWORD_REDIRECT = `${APP_URL}/auth/callback?next=%2Fauth%2Fset-password`;

type ProvisionInput = { email: string; fullName?: string | null };

export async function ensureAccountForInvitation({ email, fullName }: ProvisionInput) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error(\"Account invitation service is not configured.\");
  const authClient = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await authClient.auth.signUp({
    email: email.trim().toLowerCase(),
    password: randomBytes(32).toString(\"base64url\"),
    options: {
      data: fullName?.trim() ? { full_name: fullName.trim() } : {},
      emailRedirectTo: SET_PASSWORD_REDIRECT,
    },
  });

  if (error) {
    if (/already registered|already exists|user already/i.test(error.message)) {
      return { created: false, emailSent: false };
    }
    throw new Error(`Could not create the account invitation: ${error.message}`);
  }

  if (!data.user) throw new Error(\"Supabase did not return the invited account. Please try again.\");

  const isExistingAccount = (data.user.identities?.length ?? 1) === 0;
  if (isExistingAccount) {
    const { error: resendError } = await authClient.auth.resend({
      type: \"signup\",
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: SET_PASSWORD_REDIRECT },
    });
    if (resendError && !/already confirmed/i.test(resendError.message)) {
      throw new Error(`The account exists, but its verification email could not be resent: ${resendError.message}`);
    }
    return { created: false, emailSent: !resendError };
  }

  return { created: true, emailSent: true };
}

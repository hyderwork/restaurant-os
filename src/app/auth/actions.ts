"use server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://restaurant-os-custom.vercel.app").replace(/\/$/, "");
const EMAIL_REDIRECT = `${APP_URL}/auth/callback`;

export async function signIn(f:FormData) {
  const email=String(f.get("email")||"").trim(), password=String(f.get("password")||"");
  const s=await createClient();
  const {error}=await s.auth.signInWithPassword({email,password});
  if(error) redirect("/login?error="+encodeURIComponent(error.message));
  const {data:{user}}=await s.auth.getUser();
  if(user) {
    const {data:pa}=await s.from("platform_admins").select("user_id").eq("user_id",user.id).eq("is_active",true).maybeSingle();
    if(pa) redirect("/superadmin");
    const {data:m}=await s.from("memberships").select("role").eq("user_id",user.id).eq("status","ACTIVE").limit(1).maybeSingle();
    if(m&&["MANAGER","CASHIER","CHEF","WAITER"].includes(m.role)) redirect("/staff");
    if(m) redirect("/admin");
  }
  redirect("/admin/setup");
}

export async function signUp(f:FormData) {
  const email=String(f.get("email")||"").trim().toLowerCase(), password=String(f.get("password")||"");
  if(password.length<8) redirect("/signup?error="+encodeURIComponent("Password must be at least 8 characters."));
  const s=await createClient();
  const {data,error}=await s.auth.signUp({email,password,options:{emailRedirectTo:EMAIL_REDIRECT}});
  if(error) redirect("/signup?error="+encodeURIComponent(error.message));
  if(data.user&&data.user.identities?.length===0) redirect("/login?message="+encodeURIComponent("This email already has an account. Please sign in."));
  redirect("/signup?message="+encodeURIComponent("Account created. Check your inbox and click the verification link. If it expires, you can request a fresh link from the verification page."));
}

export async function resendSignupConfirmation(f:FormData) {
  const email=String(f.get("email")||"").trim().toLowerCase();
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect("/auth/verify?error="+encodeURIComponent("Please enter a valid email address."));
  const s=await createClient();
  const {error}=await s.auth.resend({type:"signup",email,options:{emailRedirectTo:EMAIL_REDIRECT}});
  if(error) redirect("/auth/verify?error="+encodeURIComponent(error.message));
  redirect("/auth/verify?status=resent");
}

export async function requestPasswordReset(f:FormData) {
  const email=String(f.get("email")||"").trim().toLowerCase();
  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/forgot-password?error="+encodeURIComponent("Please enter a valid email address."));
  }
  const s=await createClient();
  const redirectTo=`${APP_URL}/auth/callback?next=%2Fauth%2Fset-password`;
  const {error}=await s.auth.resetPasswordForEmail(email,{redirectTo});
  if(error) redirect("/forgot-password?error="+encodeURIComponent(error.message));
  // Do not disclose whether an account exists for this email.
  redirect("/forgot-password?status=sent");
}

export async function signOut() {
  const s=await createClient();
  await s.auth.signOut();
  redirect("/");
}

import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {setInitialPassword} from "./actions";
import PasswordInput from "@/components/password-input";

export default async function SetPasswordPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const params=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login?error="+encodeURIComponent("Open the verification or invitation link from your email first."));
  return <main className="grid min-h-screen place-items-center px-5">
    <form action={setInitialPassword} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8">
      <p className="text-xs font-bold tracking-widest text-orange-300">ACCOUNT ACTIVATION</p>
      <h1 className="mt-4 text-3xl font-black">Set your password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">Your email has been verified. Create a password to access your RestaurantOS workspace.</p>
      <p className="mt-4 break-all text-xs text-slate-500">{user.email}</p>
      {params.error&&<p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{params.error}</p>}
      <label className="mt-6 block text-sm">New password<PasswordInput required minLength={8} name="password" autoComplete="new-password" /></label>
      <label className="mt-4 block text-sm">Confirm password<PasswordInput required minLength={8} name="confirm_password" autoComplete="new-password" /></label>
      <button className="mt-6 w-full rounded-xl bg-orange-400 p-3 font-bold text-slate-950">Save password & continue</button>
    </form>
  </main>;
}

import Link from "next/link";
import {signIn} from "@/app/auth/actions";
import PasswordInput from "@/components/password-input";
import AuthSubmitButton from "@/components/auth-submit-button";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  const q = await searchParams;
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 grid place-items-center bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,115,22,.12),transparent_45%),var(--canvas)]">
      <form action={signIn} className="box-border w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-8 shadow-2xl shadow-black/20">
        <Link href="/" className="inline-flex text-sm font-semibold text-orange-300 hover:text-orange-200">← RestaurantOS</Link>
        <h1 className="mt-6 text-2xl sm:text-3xl font-black tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Sign in to your restaurant workspace.</p>
        {q.error && <p role="alert" className="mt-4 break-words rounded-xl bg-red-400/10 p-3 text-sm leading-5 text-red-300">{q.error}</p>}
        {q.message && <p role="status" className="mt-4 break-words rounded-xl bg-emerald-400/10 p-3 text-sm leading-5 text-emerald-300">{q.message}</p>}
        <label className="mt-6 block text-sm font-medium">Email
          <input required name="email" type="email" autoComplete="email" className="mt-2 block w-full min-w-0 rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-orange-300" />
        </label>
        <label className="mt-4 block text-sm font-medium">Password
          <PasswordInput required name="password" autoComplete="current-password" />
        </label>
        <div className="mt-3 text-right"><Link className="inline-block py-1 text-sm text-orange-300 hover:text-orange-200" href="/forgot-password">Forgot password?</Link></div>
        <AuthSubmitButton idle="Sign in" pending="Signing in…" className="mt-5 min-h-12 w-full rounded-xl bg-orange-400 p-3 font-bold text-slate-950 hover:bg-orange-300 disabled:opacity-70"/>
        <p className="mt-5 text-center text-sm leading-6 text-slate-400">New here? <Link className="text-orange-300 hover:text-orange-200" href="/signup">Create account</Link></p>
      </form>
    </main>
  );
}

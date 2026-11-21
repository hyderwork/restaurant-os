import Link from "next/link";
import {requestPasswordReset} from "@/app/auth/actions";

export default async function ForgotPasswordPage({searchParams}:{searchParams:Promise<{error?:string;status?:string}>}) {
  const q=await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8">
        <Link href="/login" className="text-sm text-orange-300">← Back to sign in</Link>
        <div className="mt-7 text-xs font-bold tracking-[.2em] text-orange-300">ACCOUNT RECOVERY</div>
        <h1 className="mt-3 text-3xl font-black">Forgot password?</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">Enter the email address connected to your RestaurantOS account. We’ll send you a secure link to create a new password.</p>
        {q.error&&<p role="alert" className="mt-5 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{q.error}</p>}
        {q.status==="sent"&&<p role="status" className="mt-5 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200">If an account exists for that email, a password reset link has been sent. Please check your inbox and spam folder.</p>}
        <form action={requestPasswordReset} className="mt-6">
          <label className="block text-sm font-medium text-slate-200">Email address
            <input required type="email" name="email" autoComplete="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-orange-300"/>
          </label>
          <button className="mt-5 w-full rounded-xl bg-orange-400 p-3 font-bold text-slate-950 hover:bg-orange-300">Send reset link</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">Remember your password? <Link href="/login" className="text-orange-300">Sign in</Link></p>
      </section>
    </main>
  );
}

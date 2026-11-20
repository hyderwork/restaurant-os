import Link from "next/link";
import {signUp} from "@/app/auth/actions";
import PasswordInput from "@/components/password-input";

export default async function Signup({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  const q = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form action={signUp} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8">
        <Link href="/" className="text-sm text-orange-300">← RestaurantOS</Link>
        <h1 className="mt-7 text-3xl font-black">Create your account</h1>
        <p className="mt-2 text-sm text-slate-400">Create your RestaurantOS login. Your platform administrator will assign your restaurant or staff access after verification.</p>
        {q.error && <p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{q.error}</p>}
        {q.message && <div role="status" className="mt-4 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-200"><p>{q.message}</p><Link href="/auth/verify" className="mt-3 inline-block font-bold text-orange-200 underline">Open email verification help / resend link</Link></div>}
        <label className="mt-6 block text-sm">
          Email
          <input required name="email" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-orange-300" />
        </label>
        <label className="mt-4 block text-sm">
          Password
          <PasswordInput required minLength={8} name="password" autoComplete="new-password" />
        </label>
        <button className="mt-6 w-full rounded-xl bg-orange-400 p-3 font-bold text-slate-950">Create account</button>
        <p className="mt-5 text-center text-sm text-slate-400">Already registered? <Link className="text-orange-300" href="/login">Sign in</Link></p>
      </form>
    </main>
  );
}

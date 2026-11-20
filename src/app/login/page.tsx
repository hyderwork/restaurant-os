import Link from "next/link";
import {signIn} from "@/app/auth/actions";
import PasswordInput from "@/components/password-input";

export default async function Login({searchParams}:{searchParams:Promise<{error?:string;message?:string}>}) {
  const q = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form action={signIn} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[.03] p-8">
        <Link href="/" className="text-sm text-orange-300">← RestaurantOS</Link>
        <h1 className="mt-7 text-3xl font-black">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to your restaurant workspace.</p>
        {q.error && <p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-300">{q.error}</p>}
        {q.message && <p role="status" className="mt-4 rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-300">{q.message}</p>}
        <label className="mt-6 block text-sm">
          Email
          <input required name="email" type="email" autoComplete="email" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-orange-300" />
        </label>
        <label className="mt-4 block text-sm">
          Password
          <PasswordInput required name="password" autoComplete="current-password" />
        </label>
        <button className="mt-6 w-full rounded-xl bg-orange-400 p-3 font-bold text-slate-950">Sign in</button>
        <p className="mt-5 text-center text-sm text-slate-400">New here? <Link className="text-orange-300" href="/signup">Create account</Link></p>
      </form>
    </main>
  );
}
import Link from "next/link";
import {resendSignupConfirmation} from "@/app/auth/actions";

export default async function VerifyPage({searchParams}:{searchParams:Promise<{status?:string;error?:string;code?:string}>}) {
  const q=await searchParams;
  const success=q.status==="success";
  const resent=q.status==="resent";
  const expired=q.code==="otp_expired" || (q.error||"").toLowerCase().includes("expired");
  return (
    <main className="grid min-h-screen place-items-center px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[.03] p-8 text-center">
        <div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl text-3xl ${success?"bg-emerald-400/10 text-emerald-300":"bg-orange-400/10 text-orange-300"}`}>{success?"✓":resent?"✉":"✉"}</div>
        <h1 className="mt-6 text-3xl font-black">{success?"Email verified successfully":resent?"New verification email sent":expired?"Verification link expired":"Verify your email"}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          {success
            ?"Your email address is confirmed. You can now sign in to RestaurantOS. Your restaurant or staff permissions will appear once an administrator assigns them."
            :resent
              ?"If this address has a pending signup, a fresh confirmation link has been sent. Check your inbox and spam folder."
              :expired
                ?"This confirmation link has expired or has already been used. Enter your signup email below to request a fresh link."
                :q.error
                  ?q.error
                  :"Check your inbox for the confirmation email. Open the link on this website to complete registration."}
        </p>
        {!success && <form action={resendSignupConfirmation} className="mt-7 text-left">
          <label className="block text-sm font-medium text-slate-200">Signup email address
            <input required type="email" name="email" autoComplete="email" placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3 outline-none focus:border-orange-300"/>
          </label>
          <button className="mt-4 w-full rounded-xl bg-orange-400 p-3 font-bold text-slate-950 hover:bg-orange-300">Resend verification email</button>
        </form>}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
          <Link className="text-orange-300 hover:text-orange-200" href="/login">Go to sign in</Link>
          <Link className="text-slate-400 hover:text-white" href="/signup">Back to signup</Link>
        </div>
      </section>
    </main>
  );
}

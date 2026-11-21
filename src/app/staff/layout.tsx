import Link from "next/link";
import {requireStaff} from "@/lib/auth/tenant";
import {signOut} from "@/app/auth/actions";
import RealtimeSync from "@/components/realtime-sync";

export default async function StaffLayout({children}:{children:React.ReactNode}) {
  const m=await requireStaff();
  const role=String(m.role);
  const restaurant=(m.restaurants as any)?.name||"Restaurant workspace";
  const title=role==="CHEF"?"Kitchen display":role==="WAITER"?"Service workspace":role==="CASHIER"?"Cashier desk":"Restaurant operations";
  return <div className="min-h-screen">
    <header className="staff-topbar sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#090d17]/95 px-4 py-3 backdrop-blur-xl md:px-8 md:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="brand-mark">R</span>
        <div className="min-w-0">
          <Link href="/staff" className="block truncate text-base font-black md:text-lg">Restaurant<span className="text-orange-400">OS</span><span className="ml-2 text-[10px] font-bold tracking-widest text-slate-400">STAFF</span></Link>
          <p className="mt-1 truncate text-[11px] text-slate-500">{restaurant} · {role}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300 sm:inline-flex">● On duty</span>
        <form action={signOut}><button className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:border-orange-300/40 hover:text-white">Sign out</button></form>
      </div>
    </header>
    <main className="mx-auto max-w-[1440px] p-4 sm:p-5 md:p-8">
      <div className="mb-6"><p className="eyebrow">TEAM WORKSPACE</p><h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{title}</h1><p className="mt-2 text-sm text-slate-400">Your role-based tools and live service activity.</p></div>
      <RealtimeSync scope="restaurant" restaurantId={m.restaurant_id}>{children}</RealtimeSync>
    </main>
  </div>;
}

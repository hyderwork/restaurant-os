import Link from "next/link";
import {requirePlatformAdmin} from "@/lib/auth/tenant";
import {platformLogout} from "./actions";
import RealtimeSync from "@/components/realtime-sync";
import ThemeToggle from "@/components/theme-toggle";

export default async function Layout({children}:{children:React.ReactNode}) {
  await requirePlatformAdmin();
  return <div className="dashboard-shell min-h-screen md:flex md:h-dvh md:min-h-0 md:overflow-hidden">
    <aside className="admin-sidebar superadmin-sidebar w-full shrink-0 border-b border-white/10 bg-[#090d17] p-5 md:sticky md:top-0 md:h-dvh md:w-[260px] md:overflow-y-auto md:overscroll-contain md:border-b-0 md:border-r">
      <Link href="/superadmin" className="flex items-center gap-3 text-xl font-black"><span className="brand-mark">R</span><span>Restaurant<span className="text-orange-400">OS</span></span></Link>
      <p className="mt-2 text-[10px] font-bold tracking-[.2em] text-orange-300">PLATFORM CONTROL CENTER</p>
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.04] p-3">
        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-500">Access level</p>
        <p className="mt-1 text-sm font-bold">Super Administrator</p>
        <p className="mt-1 text-[11px] text-slate-500">Global platform management</p>
      </div>
      <p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Platform</p>
      <nav className="flex gap-2 overflow-x-auto md:flex-col">
        <Link href="/superadmin" className="nav-link"><span className="w-5 text-center">▦</span><span>Overview & restaurants</span></Link>
        <a href="/superadmin#restaurant-accounts" className="nav-link"><span className="w-5 text-center">⌂</span><span>Restaurant accounts</span></a>
        <a href="/superadmin#package-management" className="nav-link"><span className="w-5 text-center">◇</span><span>Package management</span></a>
      </nav>
      <form action={platformLogout} className="mt-6"><button className="nav-link w-full text-left text-slate-400">↪ Sign out</button></form>
    </aside>
    <section className="dashboard-content min-w-0 flex-1 md:flex md:h-dvh md:min-h-0 md:flex-col md:overflow-hidden">
      <header className="admin-topbar flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
        <div><p className="text-[10px] font-bold tracking-[.2em] text-slate-500">PLATFORM WORKSPACE</p><p className="mt-1 text-sm font-semibold text-slate-200">Global operations</p></div>
        <div className="flex items-center gap-3"><span className="status-pill">● Platform secure</span><ThemeToggle /></div>
      </header>
      <main className="dashboard-main mx-auto w-full max-w-[1440px] flex-1 p-5 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:p-8"><RealtimeSync scope="platform">{children}</RealtimeSync></main>
    </section>
  </div>;
}

import Link from "next/link";
import {requirePlatformAdmin} from "@/lib/auth/tenant";
import {platformLogout} from "./actions";
import RealtimeSync from "@/components/realtime-sync";
import ThemeToggle from "@/components/theme-toggle";
import {Activity,Building2,LayoutDashboard,LogOut,Store,Command,CreditCard} from "lucide-react";

export default async function Layout({children}:{children:React.ReactNode}) {
  await requirePlatformAdmin();
  return <div className="dashboard-shell min-h-screen md:flex md:h-dvh md:min-h-0 md:overflow-hidden">
    <aside className="admin-sidebar superadmin-sidebar w-full shrink-0 border-b border-white/10 bg-[#090d17] p-5 md:sticky md:top-0 md:h-dvh md:w-[260px] md:overflow-y-auto md:overscroll-contain md:border-b-0 md:border-r">
      <Link href="/superadmin" className="flex items-center gap-3 text-xl font-black"><span className="brand-mark">R</span><span>Restaurant<span className="text-orange-400">OS</span></span></Link>
      <p className="mt-2 text-[10px] font-bold tracking-[.2em] text-orange-300">PLATFORM CONTROL CENTER</p>
      <div className="sa-sidebar-workspace mt-7 flex items-center gap-3 rounded-2xl px-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-400/15 text-orange-300"><Command size={17}/></span>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-tight text-slate-100">RestaurantOS Platform</p>
          <p className="mt-0.5 text-[10px] leading-4 text-slate-400">Workspaces · access · plans</p>
        </div>
      </div>
      <p className="mb-2 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600">Platform</p>
      <nav className="sa-sidebar-nav flex gap-2 overflow-x-auto md:flex-col">
        <Link href="/superadmin" className="sa-nav-link is-current"><span className="sa-nav-icon"><LayoutDashboard size={18}/></span><span className="sa-nav-copy"><strong>Overview</strong><small>Platform summary</small></span><span className="sa-nav-arrow">↗</span></Link>
        <a href="/superadmin#restaurant-accounts" className="sa-nav-link"><span className="sa-nav-icon"><Store size={18}/></span><span className="sa-nav-copy"><strong>Restaurant accounts</strong><small>Manage workspaces</small></span><span className="sa-nav-arrow">↗</span></a>
        <a href="/superadmin#package-management" className="sa-nav-link"><span className="sa-nav-icon"><CreditCard size={18}/></span><span className="sa-nav-copy"><strong>Package management</strong><small>Plans & subscriptions</small></span><span className="sa-nav-arrow">↗</span></a>
      </nav>
      <form action={platformLogout} className="sa-signout-wrap mt-6"><button className="sa-signout w-full"><span className="sa-signout-icon"><LogOut size={16}/></span><span>Sign out</span><span className="sa-signout-arrow">↗</span></button></form>
    </aside>
    <section className="dashboard-content min-w-0 flex-1 md:flex md:h-dvh md:min-h-0 md:flex-col md:overflow-hidden">
      <header className="admin-topbar flex items-center justify-between border-b border-white/10 px-5 py-4 md:px-8">
        <div><p className="text-[9px] font-extrabold tracking-[.2em] text-slate-500">RESTAURANTOS / ADMIN</p><p className="mt-1 text-sm font-bold text-slate-200">Platform overview</p></div>
        <div className="flex items-center gap-3"><span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[.07] px-3 py-2 text-[9px] font-bold text-emerald-400 sm:inline-flex"><Activity size={12}/> All systems operational</span><ThemeToggle /></div>
      </header>
      <main className="dashboard-main mx-auto w-full max-w-[1440px] flex-1 p-5 md:min-h-0 md:overflow-y-auto md:overscroll-contain md:p-8"><RealtimeSync scope="platform">{children}</RealtimeSync></main>
    </section>
  </div>;
}

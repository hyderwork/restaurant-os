"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, Monitor, ChefHat, Utensils,
  Armchair, QrCode, Truck, ChartNoAxesCombined, Users, Settings2,
  UserRoundCog, ChevronLeft, ChevronRight, LogOut, Sparkles
} from "lucide-react";
import { logout } from "@/app/admin/actions";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/pos", label: "POS / New order", icon: Monitor },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/kitchen", label: "Kitchen display", icon: ChefHat },
  { href: "/admin/menu", label: "Menu & products", icon: Utensils },
  { href: "/admin/tables", label: "Floors & tables", icon: Armchair },
  { href: "/admin/qr", label: "QR ordering", icon: QrCode },
  { href: "/admin/takeaway", label: "Takeaway", icon: Truck },
  { href: "/admin/reports", label: "Analytics", icon: ChartNoAxesCombined },
  { href: "/admin/visitors", label: "Visitors & feedback", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
  { href: "/admin/staff", label: "Staff accounts", icon: UserRoundCog }
];

export default function AdminSidebar({ restaurant, role, logoUrl }: { restaurant: string; role: string; logoUrl: string | null }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <>
    <aside className={`admin-sidebar group/sidebar relative flex h-auto w-full shrink-0 flex-col border-b border-white/10 p-4 transition-[width,padding] duration-300 ease-out md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r ${collapsed ? "md:w-[84px] md:px-3" : "md:w-[272px] md:px-4"}`}>
      <div className={`flex min-h-11 items-center ${collapsed ? "justify-center" : "justify-between gap-2"}`}>
        <Link href="/admin" title="RestaurantOS" className={`flex min-w-0 items-center gap-3 text-lg font-extrabold tracking-[-.055em] ${collapsed ? "md:justify-center" : ""}`}>
          <span className="brand-mark shrink-0">R</span>
          <span className={collapsed ? "md:hidden" : ""}>Restaurant<span className="text-orange-400">OS</span></span>
        </Link>
        <button type="button" onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className={`sidebar-collapse-btn hidden md:grid ${collapsed ? "absolute -right-3 top-7" : ""}`}>
          {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
        </button>
      </div>

      <div className={`workspace-switcher mt-7 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.045] p-3.5 ${collapsed ? "md:mx-auto md:w-12 md:justify-center md:p-2" : ""}`}>
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white/5 text-sm font-black text-orange-300">
          {logoUrl ? <img src={logoUrl} alt={restaurant+" logo"} className="h-full w-full object-contain p-1"/> : restaurant.slice(0,1).toUpperCase()}
        </span>
        <div className={`min-w-0 flex-1 ${collapsed ? "md:hidden" : ""}`}>
          <p className="text-[9px] font-extrabold uppercase tracking-[.19em] text-slate-500">Workspace</p>
          <p className="mt-1 truncate text-[13px] font-bold">{restaurant}</p>
          <p className="mt-1 text-[10px] font-medium text-slate-500">{role} account</p>
        </div>
      </div>

      <div className={`sidebar-section-label mb-2 mt-8 px-3 text-[9px] font-extrabold uppercase tracking-[.2em] text-slate-600 ${collapsed ? "md:hidden" : ""}`}>Workspace menu</div>
      <nav aria-label="Main navigation" className={`admin-sidebar-nav flex min-h-0 gap-1.5 overflow-x-auto pb-2 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:overscroll-contain ${collapsed ? "md:items-center" : ""}`}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined} aria-current={active ? "page" : undefined} className={`nav-link shrink-0 ${active ? "nav-link-active" : ""} ${collapsed ? "md:w-12 md:justify-center md:gap-0 md:px-0" : ""}`}>
              <Icon className="nav-icon h-[17px] w-[17px] shrink-0" strokeWidth={1.9}/>
              <span className={collapsed ? "md:hidden" : ""}>{label}</span>
              {active && !collapsed && <i aria-hidden="true" className="nav-active-dot ml-auto h-1.5 w-1.5 rounded-full bg-orange-400 md:block"/>}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="admin-sidebar-logout mt-3 shrink-0">
        <button title={collapsed ? "Sign out" : undefined} className={`nav-link w-full text-left text-slate-400 ${collapsed ? "md:justify-center md:px-0" : ""}`}>
          <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.9}/><span className={collapsed ? "md:hidden" : ""}>Sign out</span>
        </button>
      </form>

      <div className={`sidebar-live-note mt-2 flex items-center gap-2 px-3 py-2 ${collapsed ? "md:justify-center md:px-0" : ""}`} title="Orders, tables and kitchen updates are live">
        <span className="sidebar-live-spark"><Sparkles size={12}/></span>
        <span className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
          <span className="block text-[10px] font-bold leading-4 text-slate-300">In sync</span>
          <span className="block truncate text-[9px] leading-3 text-slate-500">Orders · tables · kitchen live</span>
        </span>
      </div>
    </aside>

    <div className="admin-mobile-dock" role="navigation" aria-label="Mobile navigation">
      <nav className="admin-mobile-tabs">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`admin-mobile-tab ${active ? "is-active" : ""}`}>
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.9}/>
              <span>{label === "POS / New order" ? "POS" : label === "Kitchen display" ? "Kitchen" : label === "Menu & products" ? "Menu" : label === "Floors & tables" ? "Tables" : label === "QR ordering" ? "QR" : label === "Visitors & feedback" ? "Visitors" : label === "Staff accounts" ? "Staff" : label}</span>
            </Link>
          );
        })}
      </nav>
      <form action={logout} className="admin-mobile-logout">
        <button type="submit" aria-label="Sign out" title="Sign out"><LogOut size={19}/></button>
      </form>
    </div>
    </>
  );
}

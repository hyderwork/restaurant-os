"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ClipboardList, ShoppingBag, ChefHat, Utensils,
  Armchair, QrCode, Truck, ChartNoAxesCombined, Users, Settings2,
  UserRoundCog, ChevronLeft, ChevronRight, LogOut, Sparkles
} from "lucide-react";
import { logout } from "@/app/admin/actions";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/pos", label: "POS / New order", icon: ShoppingBag },
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

export default function AdminSidebar({ restaurant, role }: { restaurant: string; role: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
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

      <div className={`workspace-switcher mt-7 rounded-2xl border border-white/10 bg-white/[.045] p-3.5 ${collapsed ? "md:mx-auto md:w-12 md:p-2 md:text-center" : ""}`}>
        <p className={`text-[9px] font-extrabold uppercase tracking-[.19em] text-slate-500 ${collapsed ? "md:hidden" : ""}`}>Workspace</p>
        <p className={`mt-1.5 truncate text-[13px] font-bold ${collapsed ? "md:hidden" : ""}`}>{restaurant}</p>
        <p className={`mt-1 text-[10px] font-medium text-slate-500 ${collapsed ? "md:hidden" : ""}`}>{role} account</p>
        {collapsed && <span className="hidden text-xs font-black text-orange-300 md:inline" title={restaurant}>{restaurant.slice(0,1).toUpperCase()}</span>}
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

      <div className={`sidebar-upgrade mt-3 hidden rounded-2xl border border-orange-400/15 bg-gradient-to-br from-orange-400/[.10] to-transparent p-4 md:block ${collapsed ? "md:hidden" : ""}`}>
        <div className="mb-2 flex items-center gap-2 text-orange-300"><Sparkles size={14}/><span className="text-[10px] font-extrabold uppercase tracking-[.13em]">In sync</span></div>
        <p className="text-xs font-bold">Your restaurant, in rhythm.</p>
        <p className="mt-1 text-[10px] leading-5 text-slate-500">Orders, tables and kitchen updates in one live workspace.</p>
      </div>

      <form action={logout} className="mt-3 shrink-0">
        <button title={collapsed ? "Sign out" : undefined} className={`nav-link w-full text-left text-slate-400 ${collapsed ? "md:justify-center md:px-0" : ""}`}>
          <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.9}/><span className={collapsed ? "md:hidden" : ""}>Sign out</span>
        </button>
      </form>
    </aside>
  );
}

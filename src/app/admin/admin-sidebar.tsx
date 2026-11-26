"use client";

import Link from "next/link";
import {useState} from "react";
import {logout} from "@/app/admin/actions";

const nav=[
 ["/admin","Overview","⌂"],
 ["/admin/orders","Orders","▤"],
 ["/admin/pos","POS / New order","＋"],
 ["/admin/kitchen","Kitchen display","◫"],
 ["/admin/menu","Menu & products","☷"],
 ["/admin/tables","Floors & tables","▦"],
 ["/admin/qr","QR ordering","▧"],
 ["/admin/takeaway","Takeaway","↗"],
 ["/admin/reports","Analytics","▥"],
 ["/admin/visitors","Visitors & feedback","♧"],
 ["/admin/settings","Settings","⚙"],
 ["/admin/staff","Staff accounts","♙"]
];

export default function AdminSidebar({restaurant,role}:{restaurant:string;role:string}){
 const [collapsed,setCollapsed]=useState(false);
 return <aside className={"admin-sidebar group/sidebar relative flex h-auto w-full shrink-0 flex-col border-b border-white/10 p-4 transition-[width,padding] duration-300 ease-out md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r "+(collapsed?"md:w-[82px] md:px-3":"md:w-[260px] md:px-4")}>
  <div className={"flex min-h-10 items-center "+(collapsed?"justify-center":"justify-between gap-2")}>
   <Link href="/admin" title="RestaurantOS" className={"flex min-w-0 items-center gap-3 text-xl font-black "+(collapsed?"md:justify-center":"")}>
    <span className="brand-mark shrink-0">R</span>
    <span className={collapsed?"md:hidden":""}>Restaurant<span className="text-orange-400">OS</span></span>
   </Link>
   <button type="button" onClick={()=>setCollapsed(v=>!v)} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} title={collapsed?"Expand sidebar":"Collapse sidebar"} className={"sidebar-collapse-btn hidden md:grid "+(collapsed?"absolute -right-3 top-7":"")}>
    <span aria-hidden="true">{collapsed?"›":"‹"}</span>
   </button>
  </div>

  <div className={"workspace-switcher mt-7 rounded-2xl border border-white/10 bg-white/[.045] p-3 "+(collapsed?"md:mx-auto md:w-12 md:p-2 md:text-center":"")}>
   <p className={"text-[10px] font-bold uppercase tracking-[.18em] text-slate-500 "+(collapsed?"md:hidden":"")}>Workspace</p>
   <p className={"mt-1 truncate text-sm font-semibold "+(collapsed?"md:hidden":"")}>{restaurant}</p>
   <p className={"mt-1 text-[11px] text-slate-500 "+(collapsed?"md:hidden":"")}>{role} account</p>
   {collapsed&&<span className="hidden text-xs font-black text-orange-300 md:inline" title={restaurant}>{restaurant.slice(0,1).toUpperCase()}</span>}
  </div>

  <p className={"mb-2 mt-7 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-600 "+(collapsed?"md:hidden":"")}>Manage</p>
  <nav aria-label="Main navigation" className={"admin-sidebar-nav flex min-h-0 gap-2 overflow-x-auto pb-2 md:flex-1 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:overscroll-contain "+(collapsed?"md:items-center":"")}>
   {nav.map(([href,label,glyph])=><Link key={href} href={href} title={collapsed?label:undefined} className={"nav-link shrink-0 "+(collapsed?"md:w-12 md:justify-center md:gap-0 md:px-0":"")}>
    <span className="w-5 shrink-0 text-center text-base text-slate-400">{glyph}</span>
    <span className={collapsed?"md:hidden":""}>{label}</span>
   </Link>)}
  </nav>

  <div className={"mt-3 hidden rounded-2xl border border-orange-400/15 bg-orange-400/[.06] p-4 md:block "+(collapsed?"md:hidden":"")}>
   <p className="text-xs font-bold text-orange-200">RestaurantOS</p>
   <p className="mt-1 text-[11px] leading-5 text-slate-500">Your restaurant, in sync.</p>
  </div>
  <form action={logout} className="mt-3 shrink-0">
   <button title={collapsed?"Sign out":undefined} className={"nav-link w-full text-left text-slate-400 "+(collapsed?"md:justify-center md:px-0":"")}>
    <span className="w-5 shrink-0 text-center">↪</span><span className={collapsed?"md:hidden":""}>Sign out</span>
   </button>
  </form>
 </aside>;
}

"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPosOrder } from "@/app/admin/actions";
import { Monitor, Maximize2, Minimize2, ArrowUpRight, UtensilsCrossed, ShoppingBag, Bike, Search, Plus, Utensils } from "lucide-react";

type Category = { id: string; name: string };
type Product = { id: string; name: string; description: string | null; image_url: string | null; base_price: number; category_id: string; vegetarian: boolean; prep_minutes: number };
type Table = { id: string; number: string; name: string | null; status: string };

export default function POSClient({ categories, products, tables, restaurantId, role, taxRate, serviceRate, taxInclusive }: {
  categories: Category[]; products: Product[]; tables: Table[]; restaurantId: string; role: string;
  taxRate: number; serviceRate: number; taxInclusive: boolean;
}) {
  const router = useRouter();
  const posRootRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === posRootRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === posRootRef.current) await document.exitFullscreen();
      else if (posRootRef.current?.requestFullscreen) await posRootRef.current.requestFullscreen();
    } catch { setError("Fullscreen mode is not available in this browser."); }
  }
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tableId, setTableId] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [paid, setPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, startTransition] = useTransition();
  const canTakePayment = ["OWNER", "ADMIN", "MANAGER", "CASHIER"].includes(role);

  const visibleProducts = useMemo(() => products.filter((p) =>
    (activeCategory === "all" || p.category_id === activeCategory) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.description || "").toLowerCase().includes(search.toLowerCase()))
  ), [products, activeCategory, search]);
  const selected = products.filter((p) => (cart[p.id] || 0) > 0);
  const subtotal = selected.reduce((sum, p) => sum + Number(p.base_price) * cart[p.id], 0);
  const tax = taxInclusive ? 0 : subtotal * taxRate / 100;
  const service = subtotal * serviceRate / 100;
  const delivery = orderType === "DELIVERY" ? Math.max(0, Number(deliveryFee) || 0) : 0;
  const discountValue = Math.min(Math.max(0, Number(discount) || 0), subtotal + tax + service + delivery);
  const total = subtotal + tax + service + delivery - discountValue;

  function changeQty(id: string, delta: number) {
    setCart((current) => {
      const next = { ...current };
      const qty = (next[id] || 0) + delta;
      if (qty <= 0) delete next[id]; else next[id] = Math.min(20, qty);
      return next;
    });
  }

  function submitOrder() {
    setError(""); setSuccess("");
    if (!selected.length) { setError("Cart mein kam az kam aik product add karein."); return; }
    if (customerName.trim().length < 2) { setError("Customer ka naam enter karein."); return; }
    if (customerPhone.replace(/[^0-9]/g, "").length < 7) { setError("Valid phone number enter karein."); return; }
    if (orderType === "DINE_IN" && !tableId) { setError("Dine-in order ke liye table select karein."); return; }
    if (orderType === "DELIVERY" && deliveryAddress.trim().length < 6) { setError("Complete delivery address enter karein."); return; }
    if (paid && !canTakePayment) { setError("Aapke account ko payment confirm karne ki permission nahi."); return; }
    startTransition(async () => {
      const result = await createPosOrder({
        restaurantId, orderType, tableId: orderType === "DINE_IN" ? tableId : null,
        customerName, customerPhone, notes, deliveryAddress, deliveryArea,
        deliveryFee: delivery, discount: discountValue,
        items: selected.map((p) => ({ productId: p.id, quantity: cart[p.id] })),
        paid, paymentMethod,
      });
      if (!result.success) { setError(result.error || "Order create nahi ho saka."); return; }
      setSuccess("Order #" + result.orderNumber + " successfully create ho gaya.");
      setCart({}); setCustomerName(""); setCustomerPhone(""); setNotes("");
      setDeliveryAddress(""); setDeliveryArea(""); setDeliveryFee("0"); setDiscount("0");
      setTableId(""); setPaid(false);
      router.refresh();
    });
  }

  const inputClass = "pos-field mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  const labelClass = "pos-field-label text-[11px] font-bold uppercase tracking-wider text-slate-500";

  return <div ref={posRootRef} className="pos-workspace flex min-w-0 flex-col gap-4 md:h-full md:min-h-0 sm:gap-6">
    <div className="pos-header flex flex-col gap-4 rounded-[22px] border border-slate-200/80 bg-white p-4 shadow-[0_10px_32px_rgba(15,23,42,.055)] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
      <div className="flex min-w-0 items-center gap-3.5"><div className="pos-brand-icon relative grid h-12 w-12 shrink-0 place-items-center rounded-[17px] bg-[#17263d] text-white shadow-[0_7px_16px_rgba(23,38,61,.18)]"><Monitor size={23} strokeWidth={1.8}/><span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"/></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-slate-500">Restaurant workspace</p><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[.12em] text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Live</span></div><h1 className="mt-0.5 text-[21px] font-extrabold tracking-[-.04em] text-slate-900 sm:text-[25px]">Point of sale</h1><p className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">A faster way to manage dine-in, takeaway and delivery orders.</p></div></div>
      <div className="flex flex-wrap items-center gap-2"><a href="/admin/orders" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:flex-none sm:text-sm">Order history <ArrowUpRight size={15} className="text-slate-400"/></a><button type="button" onClick={toggleFullscreen} className="pos-fullscreen-button inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#17263d] px-4 py-2 text-xs font-bold text-white shadow-[0_5px_14px_rgba(23,38,61,.16)] transition hover:bg-[#223754] sm:flex-none sm:text-sm">{isFullscreen ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}{isFullscreen ? "Exit fullscreen" : "Full screen"}</button></div>
    </div>

    <div className="pos-columns grid min-w-0 gap-4 lg:gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="pos-menu-column order-1 min-w-0 space-y-3.5 sm:space-y-4 xl:order-1">
        <div className="pos-menu-toolbar sticky top-0 z-30 -mx-2 mb-1 space-y-2.5 border-b border-slate-200/80 bg-slate-50/95 px-2 pb-3 pt-2 backdrop-blur-xl sm:space-y-3 sm:pb-3.5">
        <div className="pos-order-type-switch flex w-full max-w-[520px] gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:gap-1.5">
          {([["DINE_IN","Dine in",UtensilsCrossed],["TAKEAWAY","Takeaway",ShoppingBag],["DELIVERY","Delivery",Bike]] as const).map(([value,label,Icon]) =>
            <button key={value} onClick={() => setOrderType(value)} aria-pressed={orderType === value} className={"pos-order-type-button inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[10px] px-2 py-2.5 text-[11px] font-bold transition sm:gap-2 sm:px-4 sm:py-2.5 sm:text-xs " + (orderType === value ? "is-active bg-[#17263d] text-white shadow-[0_3px_9px_rgba(23,38,61,.16)]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900")}>
              <Icon size={15} strokeWidth={2}/>{label}
            </button>
          )}
        </div>

        <div className="pos-search-row flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-[13px] font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100" /></div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-500 shadow-sm sm:self-center sm:text-[11px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>{visibleProducts.length} items available</span>
        </div>
        <div className="pos-category-strip flex items-center gap-1.5 overflow-x-auto py-0.5">
          <button onClick={() => setActiveCategory("all")} data-active={activeCategory === "all"} className={"pos-category-button shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition sm:text-[11px] " + (activeCategory === "all" ? "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200" : "text-slate-500 hover:bg-white hover:text-slate-900")}>All items</button>
          {categories.map((c) => <button key={c.id} onClick={() => setActiveCategory(c.id)} data-active={activeCategory === c.id} className={"pos-category-button shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition sm:text-[11px] " + (activeCategory === c.id ? "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200" : "text-slate-500 hover:bg-white hover:text-slate-900")}>{c.name}</button>)}
        </div>
        </div>

        {visibleProducts.length ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 2xl:grid-cols-3">
          {visibleProducts.map((p) => <article key={p.id} className="pos-product-card group flex min-w-0 items-stretch overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg hover:shadow-slate-900/[.06] sm:block">
            <div className="pos-product-image relative h-auto min-h-[112px] w-[104px] shrink-0 overflow-hidden bg-slate-100 sm:h-32 sm:min-h-0 sm:w-auto">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-slate-400"><Utensils size={25} strokeWidth={1.5}/></div>}
              {p.vegetarian && <span className="pos-veg-badge absolute left-3 top-3 rounded-full bg-emerald-500/90 px-2 py-1 text-[9px] font-black text-white">VEG</span>}
              <span className="pos-prep-time absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-1 text-[10px] text-white">{p.prep_minutes} min</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:block sm:p-3.5">
              <div className="flex min-w-0 flex-col items-start justify-between gap-1 sm:min-h-10 sm:flex-row sm:gap-2"><h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">{p.name}</h3><span className="shrink-0 text-xs font-extrabold text-slate-900 sm:text-sm">Rs. {Number(p.base_price).toLocaleString("en-PK")}</span></div>
              {p.description && <p className="mt-1 hidden min-h-8 line-clamp-2 text-[11px] leading-4 text-slate-500 sm:block">{p.description}</p>}
              <button onClick={() => changeQty(p.id, 1)} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 py-2 text-[10px] font-extrabold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 sm:mt-3 sm:text-xs"><Plus size={13}/> Add to order</button>
            </div>
          </article>)}
        </div> : <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No matching products found.</div>}
      </section>

      <aside className="pos-order-column order-2 h-fit min-w-0 space-y-3.5 xl:order-2 xl:space-y-4">
        <section className="pos-order-summary rounded-2xl border border-orange-100 bg-gradient-to-br from-white via-white to-orange-50/60 p-3.5 shadow-[0_8px_24px_rgba(15,23,42,.055)] sm:p-5">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Current order</h2><span className="rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700">{selected.reduce((n,p)=>n+cart[p.id],0)} items</span></div>
          {selected.length ? <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
            {selected.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{p.name}</p><p className="mt-0.5 text-xs text-slate-500">Rs. {Number(p.base_price).toLocaleString("en-PK")} each</p></div>
              <div className="flex shrink-0 items-center gap-2"><button onClick={() => changeQty(p.id,-1)} className="pos-qty-button grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50">−</button><span className="w-4 text-center text-xs font-bold">{cart[p.id]}</span><button onClick={() => changeQty(p.id,1)} className="pos-qty-button grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50">+</button></div>
            </div>)}
          </div> : <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">Menu se items add karein.</div>}

          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString("en-PK",{maximumFractionDigits:2})}</span></div>
            {!taxInclusive && taxRate > 0 && <div className="flex justify-between text-slate-500"><span>Tax ({taxRate}%)</span><span>Rs. {tax.toFixed(2)}</span></div>}
            {serviceRate > 0 && <div className="flex justify-between text-slate-500"><span>Service ({serviceRate}%)</span><span>Rs. {service.toFixed(2)}</span></div>}
            {orderType === "DELIVERY" && <div className="flex justify-between text-slate-500"><span>Delivery fee</span><span>Rs. {delivery.toFixed(2)}</span></div>}
            <div className="flex justify-between text-slate-500"><span>Discount</span><span>− Rs. {discountValue.toFixed(2)}</span></div>
            <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-black text-slate-900"><span>Total</span><span className="text-orange-700">Rs. {total.toLocaleString("en-PK",{maximumFractionDigits:2})}</span></div>
          </div>
        </section>

        <section className="pos-order-details space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_8px_24px_rgba(15,23,42,.045)] sm:p-5">
          <h2 className="font-bold">Order details</h2>
          {orderType === "DINE_IN" && <div><label className={labelClass}>Dining table *</label><select value={tableId} onChange={(e)=>setTableId(e.target.value)} className={inputClass}><option value="">Select available table</option>{tables.map((t)=><option key={t.id} value={t.id}>{t.name || "Table "+t.number} · {t.status}</option>)}</select>{!tables.length&&<p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium text-amber-800">No available tables right now.</p>}</div>}
          <div><label className={labelClass}>Customer name *</label><input value={customerName} onChange={(e)=>setCustomerName(e.target.value)} maxLength={120} placeholder="Customer name" className={inputClass}/></div>
          <div><label className={labelClass}>Phone number *</label><input value={customerPhone} onChange={(e)=>setCustomerPhone(e.target.value)} maxLength={40} placeholder="03XX XXXXXXX" className={inputClass}/></div>
          {orderType === "DELIVERY" && <>
            <div><label className={labelClass}>Delivery address *</label><textarea value={deliveryAddress} onChange={(e)=>setDeliveryAddress(e.target.value)} maxLength={500} rows={2} placeholder="House, street, building, landmark..." className={inputClass}/></div>
            <div><label className={labelClass}>Area / zone</label><input value={deliveryArea} onChange={(e)=>setDeliveryArea(e.target.value)} maxLength={120} placeholder="e.g. Gulshan, DHA" className={inputClass}/></div>
            <div><label className={labelClass}>Delivery fee (PKR)</label><input type="number" min="0" step="1" value={deliveryFee} onChange={(e)=>setDeliveryFee(e.target.value)} className={inputClass}/></div>
          </>}
          <div><label className={labelClass}>Discount (PKR)</label><input type="number" min="0" step="1" value={discount} onChange={(e)=>setDiscount(e.target.value)} className={inputClass}/></div>
          <div><label className={labelClass}>Kitchen note</label><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} maxLength={1000} rows={2} placeholder="Special instructions..." className={inputClass}/></div>
          {canTakePayment && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold"><span>Payment received now?</span><input type="checkbox" checked={paid} onChange={(e)=>setPaid(e.target.checked)} className="h-4 w-4 accent-orange-400"/></label>
            {paid && <select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} className={inputClass}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="EASYPAISA">Easypaisa</option><option value="JAZZCASH">JazzCash</option><option value="OTHER">Other</option></select>}
          </div>}
          {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">{error}</p>}
          {success && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">{success}</p>}
          <button onClick={submitOrder} disabled={pending || !selected.length} className="pos-submit-button w-full rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-md shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Creating order..." : "Create order · Rs. "+total.toLocaleString("en-PK",{maximumFractionDigits:2})}</button>
          <p className="text-center text-[10px] leading-4 text-slate-500">Prices and taxes are recalculated securely by the server before the order is saved.</p>
        </section>
      </aside>
    </div>
  </div>;
}

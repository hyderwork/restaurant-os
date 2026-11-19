import Link from "next/link";
import { requireRestaurant } from "@/lib/auth/tenant";

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(value("year")), month: Number(value("month")), day: Number(value("day")) };
}

function startOfDayInTimeZone(date: Date, timeZone: string) {
  const { year, month, day } = localDateParts(date, timeZone);
  const targetUtc = Date.UTC(year, month - 1, day);
  const offsetParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(targetUtc));
  const get = (type: string) => Number(offsetParts.find((part) => part.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(targetUtc - (localAsUtc - targetUtc));
}

export default async function Dashboard() {
  const m = await requireRestaurant();
  const rid = m.restaurant_id;

  const [orders, products, tables, restaurant] = await Promise.all([
    m.supabase.from("orders").select("id,total,status,created_at").eq("restaurant_id", rid).order("created_at", { ascending: false }).limit(8),
    m.supabase.from("menu_products").select("id", { count: "exact", head: true }).eq("restaurant_id", rid),
    m.supabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("restaurant_id", rid),
    m.supabase.from("restaurants").select("timezone").eq("id", rid).maybeSingle(),
  ]);

  if (restaurant.error) throw new Error("Unable to load restaurant timezone: " + restaurant.error.message);
  const timeZone = restaurant.data?.timezone || "Asia/Karachi";
  let dayStart: Date;
  let nextDayStart: Date;
  try {
    dayStart = startOfDayInTimeZone(new Date(), timeZone);
    const { year, month, day } = localDateParts(new Date(), timeZone);
    const nextCalendarDay = new Date(Date.UTC(year, month - 1, day + 1));
    const nextDate = new Date(nextCalendarDay);
    const nextParts = { year: nextDate.getUTCFullYear(), month: nextDate.getUTCMonth() + 1, day: nextDate.getUTCDate() };
    const nextUtc = Date.UTC(nextParts.year, nextParts.month - 1, nextParts.day);
    const offsetParts = new Intl.DateTimeFormat("en-US", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(nextUtc));
    const get = (type: string) => Number(offsetParts.find((part) => part.type === type)?.value ?? 0);
    const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    nextDayStart = new Date(nextUtc - (localAsUtc - nextUtc));
  } catch {
    throw new Error("Invalid restaurant timezone. Update it in Settings.");
  }

  const { data: todayOrders, error: todayOrdersError } = await m.supabase
    .from("orders")
    .select("total,status")
    .eq("restaurant_id", rid)
    .gte("created_at", dayStart.toISOString())
    .lt("created_at", nextDayStart.toISOString());

  if (todayOrdersError) throw new Error("Unable to load today's orders: " + todayOrdersError.message);

  const validTodayOrders = (todayOrders || []).filter((order: any) => String(order.status).toUpperCase() !== "CANCELLED");
  const revenue = validTodayOrders.reduce((sum: number, order: any) => sum + Number(order.total || 0), 0);
  const stats = [
    ["Today's revenue", `Rs. ${revenue.toLocaleString("en-PK")}`],
    ["Today's orders", String(validTodayOrders.length)],
    ["Menu products", String(products.count || 0)],
    ["Tables", String(tables.count || 0)],
  ];

  return <>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm text-orange-300">OVERVIEW</p>
        <h1 className="mt-2 text-3xl font-black">Restaurant dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Live operational data from your workspace.</p>
      </div>
      <Link href="/admin/setup" className="rounded-xl border border-white/10 px-4 py-2 text-sm">Workspace setup</Link>
    </div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-3 text-2xl font-bold">{value}</p>
      </div>)}
    </div>
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">Recent orders</h2>
        <Link href="/admin/orders" className="text-sm text-orange-300">View all →</Link>
      </div>
      {orders.data?.length ? orders.data.map((order: any) => <div key={order.id} className="flex flex-wrap justify-between gap-2 border-t border-white/5 py-4 text-sm">
        <span className="font-semibold">#{String(order.id).slice(0, 8)}</span>
        <span className="text-slate-400">{new Date(order.created_at).toLocaleString("en-PK", { timeZone })}</span>
        <span>{order.status}</span>
        <span>Rs. {Number(order.total || 0).toLocaleString("en-PK")}</span>
      </div>) : <p className="py-10 text-center text-sm text-slate-500">No orders yet. Add menu items and connect table QR codes to start receiving orders.</p>}
    </div>
  </>;
}

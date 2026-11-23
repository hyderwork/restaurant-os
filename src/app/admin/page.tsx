import Link from "next/link";
import { requireRestaurant } from "@/lib/auth/tenant";

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(value("year")), month: Number(value("month")), day: Number(value("day")) };
}
function startOfDayInTimeZone(date: Date, timeZone: string) {
  const { year, month, day } = localDateParts(date, timeZone);
  const targetUtc = Date.UTC(year, month - 1, day);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(targetUtc));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(targetUtc - (localAsUtc - targetUtc));
}
function nextDayStartInTimeZone(date: Date, timeZone: string) {
  const { year, month, day } = localDateParts(date, timeZone);
  const nextUtc = Date.UTC(year, month - 1, day + 1);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(nextUtc));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return new Date(nextUtc - (localAsUtc - nextUtc));
}
function statusStyle(status: string) {
  switch(String(status).toUpperCase()) {
    case "AVAILABLE": return "dash-table dash-table-available";
    case "RESERVED": return "dash-table dash-table-reserved";
    case "CLEANING": return "dash-table dash-table-cleaning";
    default: return "dash-table dash-table-occupied";
  }
}
function orderStyle(status: string) {
  switch(String(status).toUpperCase()) {
    case "READY": return "dash-order-badge dash-badge-ready";
    case "COOKING": return "dash-order-badge dash-badge-cooking";
    case "ACCEPTED": return "dash-order-badge dash-badge-accepted";
    case "NEW": return "dash-order-badge dash-badge-new";
    default: return "dash-order-badge dash-badge-neutral";
  }
}
export default async function Dashboard() {
  const m = await requireRestaurant();
  const rid = m.restaurant_id;
  const [orders, products, tables, restaurant] = await Promise.all([
    m.supabase.from("orders").select("id,order_number,total,status,created_at,order_type,customer_name,restaurant_tables(number,name)").eq("restaurant_id", rid).order("created_at", { ascending: false }).limit(8),
    m.supabase.from("menu_products").select("id", { count: "exact", head: true }).eq("restaurant_id", rid),
    m.supabase.from("restaurant_tables").select("id,number,name,status,floor_id,capacity").eq("restaurant_id", rid).order("number"),
    m.supabase.from("restaurants").select("timezone,name").eq("id", rid).maybeSingle(),
  ]);
  if (orders.error) throw new Error("Unable to load recent orders: " + orders.error.message);
  if (products.error) throw new Error("Unable to count menu products: " + products.error.message);
  if (tables.error) throw new Error("Unable to count restaurant tables: " + tables.error.message);
  if (restaurant.error) throw new Error("Unable to load restaurant timezone: " + restaurant.error.message);
  const timeZone = restaurant.data?.timezone || "Asia/Karachi";
  const now = new Date();
  const dayStart = startOfDayInTimeZone(now, timeZone);
  const nextDayStart = nextDayStartInTimeZone(now, timeZone);
  const { data: todayOrders, error: todayOrdersError } = await m.supabase.from("orders").select("total,status,payments(status)").eq("restaurant_id", rid).gte("created_at",dayStart.toISOString()).lt("created_at",nextDayStart.toISOString());
  if(todayOrdersError) throw new Error("Unable to load today's orders: " + todayOrdersError.message);
  const validToday=(todayOrders||[]).filter((o:any)=>String(o.status).toUpperCase()!=="CANCELLED");
  const revenue=validToday.reduce((sum:number,o:any)=>sum+((o.payments||[]).some((p:any)=>p.status==="SUCCEEDED")?Number(o.total||0):0),0);
  const tableRows=tables.data||[];
  const orderRows=(orders.data||[]).filter((o:any)=>o.status!=="CANCELLED").slice(0,5);
  const statusCounts=tableRows.reduce((acc:any,t:any)=>{const s=String(t.status||"OCCUPIED").toUpperCase();acc[s]=(acc[s]||0)+1;return acc;},{});
  const tableCount=tableRows.length;
  const available=statusCounts.AVAILABLE||0, occupied=statusCounts.OCCUPIED||0, reserved=statusCounts.RESERVED||0, cleaning=statusCounts.CLEANING||0;
  const dateLabel=now.toLocaleDateString("en-PK",{weekday:"long",day:"2-digit",month:"long",timeZone});
  const hour=Number(new Intl.DateTimeFormat("en-US",{hour:"2-digit",hourCycle:"h23",timeZone}).format(now));
  const greeting=hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const restaurantName=restaurant.data?.name||"your restaurant";
  const metrics=[
    {label:"Today's orders",value:validToday.length.toLocaleString("en-PK"),note:"Orders received today",tone:"orange",symbol:"▤"},
    {label:"Today's revenue",value:"Rs. "+revenue.toLocaleString("en-PK"),note:"Confirmed payments only",tone:"green",symbol:"₨"},
  ];
  return <div className="restaurant-dashboard">
    <div className="dash-date-label">{dateLabel.toUpperCase()}</div>
    <div className="dash-welcome-row"><div><h1>{greeting}, <span>{restaurantName}</span> <i>✦</i></h1><p>Here’s what’s happening in your restaurant today.</p></div><span className="dash-today-chip">Today <span>⌄</span></span></div>
    <div className="dash-metrics-grid">{metrics.map((metric)=><article key={metric.label} className="dash-metric-card"><div className="dash-metric-top"><span>{metric.label}</span><span className={"dash-metric-icon "+metric.tone}>{metric.symbol}</span></div><strong>{metric.value}</strong><p>{metric.note}</p><div className={"dash-spark "+metric.tone} aria-hidden="true">{[3,5,4,7,6,8,10].map((v,i)=><span key={i} style={{height:(v*3+5)+"px"}}/>)}</div></article>)}</div>
    <div className="dash-main-grid"><section className="dash-card dash-queue-card"><div className="dash-section-head"><div><h2>Live order queue</h2><p>Latest orders across your tables</p></div><Link href="/admin/orders">View all ↗</Link></div><div className="dash-order-list">{orderRows.map((order:any)=><div key={order.id} className="dash-order-row"><span className="dash-order-icon">▤</span><div className="dash-order-info"><strong>#{order.order_number||String(order.id).slice(0,8)} · {order.restaurant_tables?.name||("Table "+(order.restaurant_tables?.number||"—"))}</strong><p>{(order.order_type||"Dine-in").replaceAll("_"," ")} · {new Date(order.created_at).toLocaleTimeString("en-PK",{hour:"2-digit",minute:"2-digit",timeZone})}</p></div><span className={orderStyle(order.status)}>{String(order.status).replaceAll("_"," ").toLowerCase().replace(/\b\w/g,(c:string)=>c.toUpperCase())}</span></div>)}{!orderRows.length&&<div className="dash-empty">No active orders yet. QR orders will appear here in real time.</div>}</div></section>
    <section className="dash-card dash-floor-card"><div className="dash-section-head"><div><h2>Floor status</h2><p>Live table availability</p></div><Link href="/admin/tables">{tableCount} tables</Link></div><div className="dash-table-grid">{tableRows.slice(0,28).map((t:any)=><Link key={t.id} href="/admin/tables" title={(t.name||"Table "+t.number)+" · "+t.status} className={statusStyle(t.status)}>{t.number}</Link>)}</div><div className="dash-floor-legend"><span><i className="occupied"/>Occupied <b>{occupied}</b></span><span><i className="available"/>Available <b>{available}</b></span><span><i className="reserved"/>Reserved <b>{reserved}</b></span><span><i className="cleaning"/>Cleaning <b>{cleaning}</b></span></div></section></div>
    <div className="dash-foot-stats"><Link href="/admin/menu"><span>Menu items</span><strong>{products.count||0}</strong><em>Manage menu ↗</em></Link><Link href="/admin/tables"><span>Table capacity</span><strong>{tableCount}</strong><em>Manage floors ↗</em></Link><Link href="/admin/reports"><span>Analytics</span><strong>30 days</strong><em>View reports ↗</em></Link></div>
  </div>;
}

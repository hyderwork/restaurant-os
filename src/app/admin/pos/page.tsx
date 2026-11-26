import { requireRestaurant } from "@/lib/auth/tenant";
import POSClient from "./pos-client";

export default async function POSPage() {
  const m = await requireRestaurant();
  const [{ data: categories, error: categoryError }, { data: products, error: productError }, { data: tables, error: tableError }, { data: settings }] = await Promise.all([
    m.supabase.from("menu_categories").select("id,name").eq("restaurant_id", m.restaurant_id).eq("active", true).order("sort_order"),
    m.supabase.from("menu_products").select("id,name,description,image_url,base_price,category_id,vegetarian,prep_minutes").eq("restaurant_id", m.restaurant_id).eq("status", "ACTIVE").order("name"),
    m.supabase.from("restaurant_tables").select("id,number,name,status").eq("restaurant_id", m.restaurant_id).in("status", ["AVAILABLE", "RESERVED"]).order("number"),
    m.supabase.from("restaurant_settings").select("tax_rate,service_charge_rate,tax_inclusive").eq("restaurant_id", m.restaurant_id).maybeSingle(),
  ]);
  if (categoryError) throw new Error(categoryError.message);
  if (productError) throw new Error(productError.message);
  if (tableError) throw new Error(tableError.message);
  return <POSClient
    categories={categories || []}
    products={(products || []).map((p: any) => ({ ...p, base_price: Number(p.base_price) }))}
    tables={tables || []}
    restaurantId={m.restaurant_id}
    role={String(m.role)}
    taxRate={Number(settings?.tax_rate || 0)}
    serviceRate={Number(settings?.service_charge_rate || 0)}
    taxInclusive={Boolean(settings?.tax_inclusive)}
  />;
}

import {requireRestaurant} from "@/lib/auth/tenant";
import {updateOrderStatus} from "@/app/admin/actions";
import KitchenRealtime from "./kitchen-realtime";

export default async function Kitchen(){
 const m=await requireRestaurant();
 const {data,error}=await m.supabase.from("orders")
  .select("id,order_number,status,created_at,customer_name,notes,restaurant_tables(number,name),order_items(product_name,quantity,special_instructions,is_addon)")
  .eq("restaurant_id",m.restaurant_id)
  .in("status",["NEW","ACCEPTED","COOKING","READY"])
  .order("created_at",{ascending:true}).limit(100);
 if(error)throw new Error(error.message);
 return <>
  <div className="page-heading"><div><p className="eyebrow">KITCHEN OPERATIONS</p><h1>Kitchen display</h1><p>New customer orders trigger an instant popup and audible ring.</p></div><span className="status-pill">● {data?.length||0} active tickets</span></div>
  <div className="mt-6"><KitchenRealtime restaurantId={m.restaurant_id} initialOrders={data||[]} updateOrderStatus={updateOrderStatus}/></div>
 </>;
}

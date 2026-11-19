"use server";
import {createHash,randomBytes} from "node:crypto";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireRestaurant,requireUser} from "@/lib/auth/tenant";

function slugify(value:string){return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"item";}

export async function createCategory(fd:FormData){
 const m=await requireRestaurant();const name=String(fd.get("name")||"").trim();
 if(!name)throw new Error("Category name is required");
 const slug=slugify(name)+"-"+randomBytes(2).toString("hex");
 const {error}=await m.supabase.from("menu_categories").insert({restaurant_id:m.restaurant_id,name,slug,sort_order:0,active:true});
 if(error)throw new Error(error.message);revalidatePath("/admin/menu");revalidatePath("/admin/qr");
}
export async function createProduct(fd:FormData){
 const m=await requireRestaurant();const name=String(fd.get("name")||"").trim(),price=Number(fd.get("price")),category=String(fd.get("category")||"");
 const description=String(fd.get("description")||"").trim(),imageUrl=String(fd.get("image_url")||"").trim();
 if(!name||!category||!Number.isFinite(price)||price<0)throw new Error("Enter a valid product, category and price");
 const {data:cat}=await m.supabase.from("menu_categories").select("id").eq("id",category).eq("restaurant_id",m.restaurant_id).maybeSingle();
 if(!cat)throw new Error("Select a valid category");
 const {error}=await m.supabase.from("menu_products").insert({restaurant_id:m.restaurant_id,category_id:category,name,slug:slugify(name)+"-"+randomBytes(2).toString("hex"),description:description||null,image_url:imageUrl||null,base_price:price,status:"ACTIVE"});
 if(error)throw new Error(error.message);revalidatePath("/admin/menu");revalidatePath("/admin/qr");
}
export async function createFloor(fd:FormData){
 const m=await requireRestaurant();const name=String(fd.get("name")||"Main Floor").trim();
 if(!name)throw new Error("Floor name is required");
 const {error}=await m.supabase.from("floors").insert({restaurant_id:m.restaurant_id,name});
 if(error)throw new Error(error.message);revalidatePath("/admin/tables");
}
export async function createTable(fd:FormData){
 const m=await requireRestaurant();const number=String(fd.get("label")||"").trim(),floor=String(fd.get("floor")||"");
 if(!number||!floor)throw new Error("Table number and floor are required");
 const {data:f}=await m.supabase.from("floors").select("id").eq("id",floor).eq("restaurant_id",m.restaurant_id).maybeSingle();
 if(!f)throw new Error("Select a valid floor");
 const {error}=await m.supabase.from("restaurant_tables").insert({restaurant_id:m.restaurant_id,floor_id:floor,number,name:"Table "+number,capacity:2,status:"AVAILABLE"});
 if(error)throw new Error(error.message);revalidatePath("/admin/tables");revalidatePath("/admin/qr");
}
export async function generateTableQR(fd:FormData){
 const m=await requireRestaurant();const tableId=String(fd.get("table_id")||"");
 const {data:table}=await m.supabase.from("restaurant_tables").select("id").eq("id",tableId).eq("restaurant_id",m.restaurant_id).maybeSingle();
 if(!table)throw new Error("Table not found");
 const token=randomBytes(32).toString("hex");
 const tokenHash=createHash("sha256").update(token).digest("hex");
 const {error}=await m.supabase.from("qr_codes").upsert({restaurant_id:m.restaurant_id,table_id:tableId,token_hash:tokenHash,token_value:token,active:true,rotated_at:new Date().toISOString()},{onConflict:"table_id"});
 if(error)throw new Error(error.message);
 revalidatePath("/admin/qr");
}
export async function updateOrderStatus(fd:FormData){
 const m=await requireRestaurant();const id=String(fd.get("id")||""),status=String(fd.get("status")||"");
 const allowed=["ACCEPTED","COOKING","READY","SERVED","CANCELLED"];
 if(!allowed.includes(status))throw new Error("Invalid order status");
 const {error}=await m.supabase.from("orders").update({status}).eq("id",id).eq("restaurant_id",m.restaurant_id);
 if(error)throw new Error(error.message);revalidatePath("/admin/orders");revalidatePath("/admin");
}
export async function logout(){const {supabase}=await requireUser();await supabase.auth.signOut();redirect("/");}

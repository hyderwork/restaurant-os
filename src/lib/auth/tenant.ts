import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
export async function requireUser(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login");
 return {supabase,user};
}
export async function getMemberships(){
 const {supabase,user}=await requireUser();
 const {data,error}=await supabase.from("memberships").select("id,restaurant_id,role,status,restaurants(id,name,slug)").eq("user_id",user.id).eq("status","active");
 if(error)throw new Error(error.message);
 return data||[];
}
export async function requireRestaurant(){
 const {supabase,user}=await requireUser();
 const {data,error}=await supabase.from("memberships").select("id,restaurant_id,role,status,restaurants(id,name,slug)").eq("user_id",user.id).eq("status","active").limit(1).maybeSingle();
 if(error)throw new Error(error.message);
 if(!data)redirect("/admin/setup");
 return {...data,supabase,user};
}
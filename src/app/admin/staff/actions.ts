"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireRestaurant} from "@/lib/auth/tenant";
import {ensureAccountForInvitation} from "@/lib/auth/provisioning";
const v=(f:FormData,k:string)=>String(f.get(k)||"").trim();

export async function addStaff(f:FormData){
 const m=await requireRestaurant();
 const email=v(f,"email").toLowerCase(),role=v(f,"role"),fullName=v(f,"full_name");
 if(!email||!email.includes("@")||!["MANAGER","CASHIER","CHEF","WAITER"].includes(role))throw new Error("Select a valid staff email and role.");
 const [staffCount,subscription]=await Promise.all([
  m.supabase.from("memberships").select("id",{count:"exact",head:true}).eq("restaurant_id",m.restaurant_id).in("status",["ACTIVE","INVITED"]).in("role",["MANAGER","CASHIER","CHEF","WAITER"]),
  m.supabase.from("subscriptions").select("subscription_plans(max_staff)").eq("restaurant_id",m.restaurant_id).in("status",["ACTIVE","TRIALING"]).maybeSingle()
 ]);
 if(staffCount.error)throw new Error(staffCount.error.message);
 if(subscription.error)throw new Error(subscription.error.message);
 const maxStaff=(subscription.data?.subscription_plans as any)?.max_staff ?? (subscription.data?.subscription_plans as any)?.[0]?.max_staff ?? 0;
 if(!maxStaff)throw new Error("This restaurant does not have an active staff package.");
 if((staffCount.count||0)>=maxStaff)throw new Error("Your package staff limit has been reached. Upgrade the package to add more staff.");
 const invitation=await ensureAccountForInvitation({email,fullName});
 const {error}=await m.supabase.rpc("restaurant_add_existing_staff",{p_restaurant_id:m.restaurant_id,p_email:email,p_role:role});
 if(error)throw new Error(error.message);
 revalidatePath("/admin/staff");
 const message=invitation.created
  ? `Staff account created. Verification and password setup email sent to ${email}.`
  : invitation.emailSent
   ? `Staff member verification email resent to ${email}.`
   : "Existing account successfully added to your staff team.";
 redirect("/admin/staff?success="+encodeURIComponent(message));
}

export async function removeStaff(f:FormData){
 const m=await requireRestaurant();
 const {error}=await m.supabase.rpc("restaurant_remove_staff",{p_restaurant_id:m.restaurant_id,p_membership_id:v(f,"membership_id")});
 if(error)throw new Error(error.message);
 revalidatePath("/admin/staff");
}

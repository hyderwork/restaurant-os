"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {requireRestaurant} from "@/lib/auth/tenant";
import {ensureAccountForInvitation} from "@/lib/auth/provisioning";
const v=(f:FormData,k:string)=>String(f.get(k)||"").trim();

export async function addStaff(f:FormData){
 const m=await requireRestaurant();
 const email=v(f,"email").toLowerCase(),role=v(f,"role"),fullName=v(f,"full_name");
 if(!email||!["MANAGER","CASHIER","CHEF","WAITER"].includes(role))throw new Error("Select a valid staff email and role.");
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

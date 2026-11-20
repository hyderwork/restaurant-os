"use server";
import {revalidatePath} from \"next/cache\";
import {redirect} from \"next/navigation\";
import {requirePlatformAdmin} from \"@/lib/auth/tenant\";
import {ensureAccountForInvitation} from \"@/lib/auth/provisioning\";
const v=(f:FormData,k:string)=>String(f.get(k)||\"\").trim();

export async function createRestaurant(f:FormData){
 const {supabase}=await requirePlatformAdmin();
 const name=v(f,\"name\"),slug=v(f,\"slug\").toLowerCase().replace(/[^a-z0-9]+/g,\"-\").replace(/^-|-$/g,\"\")||name.toLowerCase().replace(/[^a-z0-9]+/g,\"-\");
 const email=v(f,\"owner_email\").toLowerCase(),plan=v(f,\"plan_id\"),ownerName=v(f,\"owner_name\");
 const trialDays=Number(v(f,\"trial_days\")||14);
 if(!name||!email||!plan) redirect(\"/superadmin?error=\"+encodeURIComponent(\"Restaurant name, owner email and package are required.\"));
 if(!Number.isInteger(trialDays)||trialDays<0||trialDays>90) redirect(\"/superadmin?error=\"+encodeURIComponent(\"Trial days must be between 0 and 90.\"));
 const {data:existingRestaurant,error:slugError}=await supabase.from(\"restaurants\").select(\"id\").eq(\"slug\",slug).maybeSingle();
 if(slugError) redirect(\"/superadmin?error=\"+encodeURIComponent(slugError.message));
 if(existingRestaurant) redirect(\"/superadmin?error=\"+encodeURIComponent(\"This restaurant URL slug is already in use.\"));
 const {data:packageRow,error:planError}=await supabase.from(\"subscription_plans\").select(\"id\").eq(\"id\",plan).eq(\"active\",true).maybeSingle();
 if(planError||!packageRow) redirect(\"/superadmin?error=\"+encodeURIComponent(planError?.message||\"Selected package is unavailable.\"));
 try {
  const invitation=await ensureAccountForInvitation({email,fullName:ownerName});
  const {error}=await supabase.rpc(\"platform_create_restaurant\",{p_name:name,p_slug:slug,p_owner_email:email,p_owner_name:ownerName,p_plan_id:plan,p_phone:v(f,\"phone\")||null,p_address:v(f,\"address\")||null,p_trial_days:trialDays});
  if(error) redirect(\"/superadmin?error=\"+encodeURIComponent(error.message));
  revalidatePath(\"/superadmin\");
  const message=invitation.created
   ? \"Restaurant created. Client account invitation and password setup email sent to \"+email+\".\"
   : invitation.emailSent
    ? \"Restaurant created. A fresh account verification email was sent to \"+email+\".\"
    : \"Restaurant created and existing client account assigned as OWNER.\";
  redirect(\"/superadmin?success=\"+encodeURIComponent(message));
 } catch(error) {
  const message=error instanceof Error?error.message:\"Unable to provision the client account.\";
  redirect(\"/superadmin?error=\"+encodeURIComponent(message));
 }
}
export async function updateRestaurantAccess(f:FormData){const {supabase}=await requirePlatformAdmin();const {error}=await supabase.rpc(\"platform_update_restaurant\",{p_restaurant_id:v(f,\"restaurant_id\"),p_status:v(f,\"status\"),p_plan_id:v(f,\"plan_id\")||null,p_subscription_status:v(f,\"subscription_status\")});if(error)throw new Error(error.message);revalidatePath(\"/superadmin\");}
export async function platformLogout(){const {supabase}=await requirePlatformAdmin();await supabase.auth.signOut();redirect(\"/\");}

export async function savePackage(f:FormData){const {supabase}=await requirePlatformAdmin();const id=v(f,\"plan_id\"),name=v(f,\"plan_name\");const price=Number(v(f,\"monthly_price\")),tables=Number(v(f,\"max_tables\")),staff=Number(v(f,\"max_staff\"));if(!name||!Number.isFinite(price)||price<0||!Number.isInteger(tables)||tables<1||!Number.isInteger(staff)||staff<1)throw new Error(\"Enter valid package limits and price.\");const payload={name,monthly_price:price,max_tables:tables,max_staff:staff,active:v(f,\"active\")!==\"false\",features:{qr_ordering:true,menu_management:true,staff_roles:true,advanced_reports:name!==\"Starter\",priority_support:name===\"Enterprise\"}};const q=id?supabase.from(\"subscription_plans\").update(payload).eq(\"id\",id):supabase.from(\"subscription_plans\").insert(payload);const {error}=await q;if(error)throw new Error(error.message);revalidatePath(\"/superadmin\");}

export async function deleteRestaurant(f:FormData){
 const {supabase}=await requirePlatformAdmin();
 const id=v(f,\"restaurant_id\");
 if(!id) throw new Error(\"Restaurant ID is required.\");
 const {error}=await supabase.rpc(\"platform_delete_restaurant\",{p_restaurant_id:id});
 if(error) throw new Error(error.message);
 revalidatePath(\"/superadmin\");
}

"use client";

import {useState,useTransition} from "react";
import {ImagePlus,Link2,LoaderCircle,Save,UploadCloud} from "lucide-react";
import {createClient} from "@/lib/supabase/client";
import {updateRestaurantSettings} from "@/app/admin/actions";

export default function RestaurantLogoSettings({restaurantId,taxRate,serviceRate,taxInclusive,logoUrl}:{restaurantId:string;taxRate:number;serviceRate:number;taxInclusive:boolean;logoUrl:string}){
 const [url,setUrl]=useState(logoUrl);
 const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState(logoUrl);
 const [message,setMessage]=useState("");
 const [busy,startTransition]=useTransition();
 function chooseFile(next:File|null){
  setFile(next);
  setMessage("");
  if(next){if(!next.type.startsWith("image/")){setMessage("Please select an image file.");setFile(null);return;}if(next.size>3*1024*1024){setMessage("Logo must be 3 MB or smaller.");setFile(null);return;}setPreview(URL.createObjectURL(next));}
 }
 function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage("");
  const form=e.currentTarget;
  startTransition(async()=>{
   try{
    let finalUrl=url.trim();
    if(file){
     const ext=(file.name.split(".").pop()||"png").toLowerCase().replace(/[^a-z0-9]/g,"")||"png";
     const path=restaurantId+"/"+crypto.randomUUID()+"."+ext;
     const supabase=createClient();
     const {error}=await supabase.storage.from("restaurant-logos").upload(path,file,{contentType:file.type,cacheControl:"31536000",upsert:false});
     if(error)throw error;
     finalUrl=supabase.storage.from("restaurant-logos").getPublicUrl(path).data.publicUrl;
    }
    const data=new FormData(form);
    data.set("logo_url",finalUrl);
    await updateRestaurantSettings(data);
    setUrl(finalUrl);setPreview(finalUrl);setFile(null);setMessage("Logo and settings saved successfully.");
   }catch(err){setMessage(err instanceof Error?err.message:"Unable to save logo. Please try again.");}
  });
 }
 return <form onSubmit={save} className="mt-5 grid gap-3">
  <div className="rounded-2xl border border-white/10 bg-white/[.025] p-4">
   <div className="flex flex-wrap items-center gap-4">
    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
     {preview?<img src={preview} alt="Restaurant logo preview" className="h-full w-full object-contain p-1"/>:<ImagePlus size={25} className="text-slate-500"/>}
    </div>
    <div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-200">Restaurant logo</p><p className="mt-1 text-xs leading-5 text-slate-500">Upload PNG, JPG, WEBP or SVG. Maximum file size 3 MB.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-400/25 bg-orange-400/10 px-3 py-2 text-xs font-bold text-orange-300 hover:bg-orange-400/15"><UploadCloud size={14}/> Choose logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon" className="sr-only" onChange={e=>chooseFile(e.target.files?.[0]||null)} disabled={busy}/></label>{file&&<p className="mt-2 truncate text-[10px] text-slate-400">{file.name}</p>}</div>
   </div>
   <label className="field-label mt-4 block"><span className="inline-flex items-center gap-1.5"><Link2 size={12}/> Or use logo URL</span><input name="logo_url" type="url" value={url} onChange={e=>{setUrl(e.target.value);setPreview(e.target.value);setFile(null);}} placeholder="https://example.com/restaurant-logo.png" className="field mt-1"/></label>
  </div>
  <label className="field-label">Tax rate (%)<input name="tax_rate" type="number" min="0" max="100" step=".01" defaultValue={taxRate} className="field mt-1"/></label>
  <label className="field-label">Service charge (%)<input name="service_charge_rate" type="number" min="0" max="100" step=".01" defaultValue={serviceRate} className="field mt-1"/></label>
  <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="tax_inclusive" defaultChecked={taxInclusive}/> Prices already include tax</label>
  {message&&<p role="status" className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-300">{message}</p>}
  <button disabled={busy} className="btn-primary inline-flex items-center justify-center gap-2">{busy?<LoaderCircle size={15} className="animate-spin"/>:<Save size={15}/>} {busy?"Saving…":"Save charges & logo"}</button>
 </form>;
}

"use client";
import {useFormStatus} from "react-dom";
import {LoaderCircle} from "lucide-react";

export default function AuthSubmitButton({idle,pending,className}:{idle:string;pending:string;className?:string}){
 const {pending:isPending}=useFormStatus();
 return <button type="submit" disabled={isPending} aria-busy={isPending} className={className} style={{opacity:isPending?0.75:1,cursor:isPending?"wait":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:9}}>
  {isPending&&<LoaderCircle size={17} className="auth-submit-spinner"/>}{isPending?pending:idle}
 </button>;
}

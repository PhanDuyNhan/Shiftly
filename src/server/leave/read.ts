import { type Principal } from "./access";
import { HttpError } from "./errors";
import { findScopedRequest,publicRequest,listOwn,listForStore } from "./repository";
import { canManageStore } from "@/server/auth/access";

export async function getLeave(principal:Principal,id:string){
  const row=await findScopedRequest(principal,id);
  return publicRequest(row);
}

export async function listLeave(principal:Principal,storeId:string|null,filters:{status?:string;from?:string;to?:string}){
  if(!storeId) return listOwn(principal.id);
  if(!await canManageStore(principal,storeId)) throw new HttpError(403,"forbidden","Store manager role required");
  return listForStore(storeId,filters,principal.systemRole==="admin"?null:principal.id);
}

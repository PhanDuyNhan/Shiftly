import { HttpError } from "./errors";
import { readPrivate } from "@/server/storage/private-attachment";
import { canReadRequest,type Principal } from "./access";
import type { LeaveRow } from "./repository";

export const MAX_ATTACHMENT_BYTES=4*1024*1024;
export async function validateAttachment(file:File):Promise<{bytes:Buffer;extension:"pdf"|"jpg"|"png";mime:string}>{
  if(file.size>MAX_ATTACHMENT_BYTES) throw new HttpError(413,"too_large","Attachment exceeds 4 MB");
  if(file.size<4) throw new HttpError(422,"invalid","Attachment is empty or invalid");
  const bytes=Buffer.from(await file.arrayBuffer());
  const ext=file.name.toLowerCase().split(".").pop();
  if(ext==="pdf" && bytes.subarray(0,5).toString()==="%PDF-") return {bytes,extension:"pdf",mime:"application/pdf"};
  if((ext==="jpg"||ext==="jpeg") && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return {bytes,extension:"jpg",mime:"image/jpeg"};
  if(ext==="png" && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {bytes,extension:"png",mime:"image/png"};
  throw new HttpError(422,"invalid","Only valid PDF, JPEG or PNG files are allowed");
}
export async function authorizedAttachment(principal:Principal,row:LeaveRow):Promise<{bytes:Buffer;mime:string}>{
  if(!await canReadRequest(principal,row)) throw new HttpError(404,"not_found","Leave request not found");
  if(!row.attachment_url) throw new HttpError(404,"not_found","Attachment not found");
  const key=row.attachment_url;
  const mime=key.endsWith(".pdf")?"application/pdf":key.endsWith(".jpg")?"image/jpeg":"image/png";
  return {bytes:await readPrivate(key),mime};
}

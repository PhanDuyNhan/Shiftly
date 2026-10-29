import { readdir,stat } from "node:fs/promises";
import { resolve } from "node:path";
import { getPool } from "@/db/client";
import { removePrivate } from "@/server/storage/private-attachment";

export async function cleanupOrphanAttachments():Promise<{checked:number;deleted:number}>{
  const root=process.env.PRIVATE_ATTACHMENT_DIR;
  if(!root) throw new Error("PRIVATE_ATTACHMENT_DIR is required");
  const keys=(await readdir(resolve(root))).filter((key)=>/^[a-f0-9-]{36}\.(pdf|jpg|png)$/.test(key));
  let deleted=0;
  for(const key of keys){
    // Leave in-flight uploads alone; reconciliation only handles old orphan keys.
    const ageMs=Date.now()-(await stat(resolve(root,key))).mtimeMs;
    if(ageMs<60*60*1000)continue;
    const referenced=await getPool().query("SELECT 1 FROM leave_requests WHERE attachment_url=$1",[key]);
    if(referenced.rowCount) continue;
    await removePrivate(key);
    deleted++;
  }
  return {checked:keys.length,deleted};
}

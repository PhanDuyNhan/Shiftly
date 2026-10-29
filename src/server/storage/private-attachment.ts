import { randomUUID } from "node:crypto";
import { mkdir,readFile,writeFile,unlink } from "node:fs/promises";
import { join,resolve } from "node:path";

function root():string {
  const directory=process.env.PRIVATE_ATTACHMENT_DIR;
  if(!directory) throw new Error("PRIVATE_ATTACHMENT_DIR is required");
  return resolve(directory);
}
function pathFor(key:string):string {
  if(!/^[a-f0-9-]{36}\.(pdf|jpg|png)$/.test(key)) throw new Error("Invalid attachment key");
  return join(root(),key);
}
export async function storePrivate(bytes:Buffer,extension:"pdf"|"jpg"|"png"):Promise<string>{
  const key=`${randomUUID()}.${extension}`;
  await mkdir(root(),{recursive:true,mode:0o700});
  await writeFile(pathFor(key),bytes,{flag:"wx",mode:0o600});
  return key;
}
export async function readPrivate(key:string):Promise<Buffer>{return readFile(pathFor(key));}
export async function removePrivate(key:string):Promise<void>{await unlink(pathFor(key));}

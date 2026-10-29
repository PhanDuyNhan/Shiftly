import { loadEnvConfig } from "@next/env";
import { getPool } from "../src/db/client";
import { cleanupOrphanAttachments } from "../src/server/leave/attachment-cleanup";

loadEnvConfig(process.cwd());
cleanupOrphanAttachments().then((result)=>{
  console.info(result);
}).catch((error:unknown)=>{console.error(error);process.exitCode=1;}).finally(()=>getPool().end());

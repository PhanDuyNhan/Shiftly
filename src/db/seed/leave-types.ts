import { getPool } from "../client";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main(){
  await getPool().query(`INSERT INTO leave_types (name,is_paid,requires_attachment) VALUES
    ('Nghỉ phép năm',true,false),('Nghỉ ốm',false,true) ON CONFLICT (name) DO NOTHING`);
  console.info("Leave types available");
  await getPool().end();
}
main().catch((error:unknown)=>{console.error(error);process.exitCode=1;});

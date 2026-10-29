import { z } from "zod";
import { HttpError } from "./errors";
import { assertDateRange } from "./date-range";

const schema=z.object({store_id:z.uuid(),leave_type_id:z.uuid(),start_date:z.string(),end_date:z.string(),reason:z.string().trim().min(1).max(3000)}).strict();
export type LeaveInput=z.infer<typeof schema>;

export function parseLeaveForm(form:FormData):{input:LeaveInput;file:File|null}{
  const allowed=new Set(["store_id","leave_type_id","start_date","end_date","reason","attachment"]);
  for(const key of form.keys()) if(!allowed.has(key)) throw new HttpError(422,"invalid",`Unexpected field: ${key}`);
  if(form.getAll("attachment").length>1) throw new HttpError(422,"invalid","Only one attachment is allowed");
  const parsed=schema.safeParse(Object.fromEntries(["store_id","leave_type_id","start_date","end_date","reason"].map((key)=>[key,form.get(key)])));
  if(!parsed.success) throw new HttpError(422,"invalid","Invalid leave request",{issues:parsed.error.issues});
  assertDateRange(parsed.data.start_date,parsed.data.end_date);
  const file=form.get("attachment");
  if(file!==null && !(file instanceof File)) throw new HttpError(422,"invalid","Invalid attachment");
  return {input:parsed.data,file:file?.size?file as File:null};
}

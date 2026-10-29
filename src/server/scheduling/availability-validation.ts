import { z } from "zod";
import { validDate } from "@/server/leave/date-range";

const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const date=z.string().refine(validDate);
export const ruleSchema=z.object({weekday:z.number().int().min(1).max(7),start_time:time,end_time:time,kind:z.enum(["busy","available"]),valid_from:date,valid_to:date.nullish(),reason:z.string().trim().max(500).nullish()}).strict().refine((v)=>v.end_time>v.start_time&&(!v.valid_to||v.valid_to>=v.valid_from));
export const rulesSchema=z.object({rules:z.array(ruleSchema).max(100)}).strict();
export const exceptionSchema=z.object({on_date:date,start_time:time.nullish(),end_time:time.nullish(),kind:z.enum(["busy","available"]),reason:z.string().trim().max(500).nullish()}).strict().refine((v)=>(v.start_time==null&&v.end_time==null)||(v.start_time!=null&&v.end_time!=null&&v.end_time>v.start_time));

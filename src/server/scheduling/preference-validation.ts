import { z } from "zod";
import { validDate } from "@/server/leave/date-range";
import { inWeek } from "./time";

export const preferenceSchema=z.object({work_date:z.string().refine(validDate),shift_template_id:z.uuid(),preference:z.union([z.literal(-1),z.literal(1),z.literal(2)])}).strict();
export const preferencesSchema=z.object({preferences:z.array(preferenceSchema).max(300)}).strict();
export function validatePreferenceDates(week:string,items:{work_date:string;shift_template_id:string}[]):boolean{
  const keys=new Set<string>();
  return items.every((item)=>{const key=`${item.work_date}:${item.shift_template_id}`;if(keys.has(key)||!inWeek(item.work_date,week))return false;keys.add(key);return true;});
}

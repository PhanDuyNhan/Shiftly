import type { Violation } from "./hard-constraints";
export type SlotWarning={slot_id:string;missing_count:number;code:string;rejected:Record<string,number>};
export function explainMissing(slotId:string,missing:number,rejections:Violation[][]):SlotWarning{
  const rejected:Record<string,number>={};
  for(const group of rejections)for(const issue of group)rejected[issue.code]=(rejected[issue.code]??0)+1;
  return {slot_id:slotId,missing_count:missing,code:"insufficient_staff",rejected};
}

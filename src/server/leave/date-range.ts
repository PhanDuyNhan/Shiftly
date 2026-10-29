import { HttpError } from "@/server/auth/errors";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validDate(value:string):boolean {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value;
}

export function assertDateRange(start:string,end:string):void {
  if (!validDate(start)||!validDate(end)||end<start) throw new HttpError(422,"invalid","Invalid date range");
}

export function localDate(now:Date,timezone:string):string {
  try {
    return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
  } catch { throw new HttpError(422,"invalid","Invalid store timezone"); }
}

export function mayCancel(status:string,startDate:string,timezone:string,now=new Date()):boolean {
  return status==="pending" || (status==="approved" && localDate(now,timezone)<startDate);
}

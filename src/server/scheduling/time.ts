import { localDateTimeUtc } from "@/server/leave/date-interval";
import { assertDateRange,validDate } from "@/server/leave/date-range";
import { HttpError } from "@/server/auth/errors";

export function addDays(date:string,days:number):string{
  if(!validDate(date)) throw new HttpError(422,"invalid","Invalid date");
  const result=new Date(`${date}T00:00:00Z`);result.setUTCDate(result.getUTCDate()+days);
  return result.toISOString().slice(0,10);
}
export function weekday(date:string):number{
  if(!validDate(date)) throw new HttpError(422,"invalid","Invalid date");
  return ((new Date(`${date}T00:00:00Z`).getUTCDay()+6)%7)+1;
}
export function assertMonday(date:string):void{
  if(weekday(date)!==1) throw new HttpError(422,"invalid","Week must start on Monday");
}
export function weekEnd(weekStart:string):string{assertMonday(weekStart);return addDays(weekStart,6);}
export function inWeek(date:string,weekStart:string):boolean{assertDateRange(weekStart,weekEnd(weekStart));return date>=weekStart&&date<=weekEnd(weekStart);}
export function shiftInterval(date:string,startTime:string,endTime:string,timezone:string){
  const start=localDateTimeUtc(date,startTime,timezone);
  const end=localDateTimeUtc(endTime<=startTime?addDays(date,1):date,endTime,timezone);
  if(end<=start) throw new HttpError(422,"invalid","Invalid shift interval");
  return {start,end};
}
export function registrationDeadline(weekStart:string,weekdayNumber:number,time:string,timezone:string):Date{
  assertMonday(weekStart);
  if(weekdayNumber<1||weekdayNumber>7) throw new HttpError(422,"invalid","Invalid deadline weekday");
  return localDateTimeUtc(addDays(weekStart,-7+weekdayNumber-1),time,timezone);
}

import type { PoolClient } from "pg";
import { localDate } from "@/server/leave/date-range";
import { localDateTimeUtc,overlaps } from "@/server/leave/date-interval";
import { addDays,weekday } from "./time";

type Interval={start:Date;end:Date};
type Availability={kind:string;start_time:string|null;end_time:string|null};

function timeInterval(date:string,start:string|null,end:string|null,timezone:string):Interval{
  return {start:localDateTimeUtc(date,start?.slice(0,5)??"00:00",timezone),
    end:localDateTimeUtc(end?date:addDays(date,1),end?.slice(0,5)??"00:00",timezone)};
}

function fullyCovered(interval:Interval,covers:Interval[]):boolean{
  let remaining=[interval];
  for(const cover of covers){
    remaining=remaining.flatMap((part)=>{
      if(!overlaps(part,cover))return [part];
      const output:Interval[]=[];
      if(part.start<cover.start)output.push({start:part.start,end:cover.start});
      if(part.end>cover.end)output.push({start:cover.end,end:part.end});
      return output;
    });
    if(!remaining.length)return true;
  }
  return false;
}

export async function isBusy(client:PoolClient,userId:string,shift:Interval,timezone:string):Promise<boolean>{
  let date=localDate(shift.start,timezone);
  const last=localDate(new Date(shift.end.getTime()-1),timezone);
  while(date<=last){
    const [rules,exceptions]=await Promise.all([
      client.query<Availability>(`SELECT kind,start_time,end_time FROM availability_rules
        WHERE user_id=$1 AND weekday=$2 AND valid_from<=$3 AND (valid_to IS NULL OR valid_to>=$3)`,[userId,weekday(date),date]),
      client.query<Availability>("SELECT kind,start_time,end_time FROM availability_exceptions WHERE user_id=$1 AND on_date=$2",[userId,date]),
    ]);
    const busyExceptions=exceptions.rows.filter((row)=>row.kind==="busy").map((row)=>timeInterval(date,row.start_time,row.end_time,timezone));
    if(busyExceptions.some((part)=>overlaps(part,shift)))return true;
    const availableExceptions=exceptions.rows.filter((row)=>row.kind==="available").map((row)=>timeInterval(date,row.start_time,row.end_time,timezone));
    for(const rule of rules.rows.filter((row)=>row.kind==="busy")){
      const interval=timeInterval(date,rule.start_time,rule.end_time,timezone);
      const intersection={start:new Date(Math.max(interval.start.getTime(),shift.start.getTime())),end:new Date(Math.min(interval.end.getTime(),shift.end.getTime()))};
      if(intersection.start<intersection.end&&!fullyCovered(intersection,availableExceptions))return true;
    }
    date=addDays(date,1);
  }
  return false;
}
